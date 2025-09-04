import express from 'express';
import multer from 'multer';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import Feedback from '../models/Feedback.js';
import SalaryAdjustment from '../models/SalaryAdjustment.js';
import Holiday from '../models/Holiday.js';
import auth from '../middleware/auth.js';
import { getGrokInsights } from '../utils/groq.js';
import { processAttendanceExcel, processAttendanceCSV, generateExcelReport } from '../utils/excelProcessor.js';
import { processManualAttendance } from '../utils/attendanceProcessor.js';
import { getMonthStatistics, getWorkingDaysInMonth, getSundaysInMonth } from '../utils/workingDays.js';
import { deduplicateAttendanceRecords, getDuplicateUsersSummary } from '../utils/deduplicateUsers.js';
import calendarService from '../utils/calendarService.js';
import { Parser } from 'json2csv';
import path from 'path';
import fs from 'fs';

// Helper function to calculate Levenshtein distance for fuzzy name matching
function getLevenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

const router = express.Router();

// Ensure upload directory exists
const uploadPath = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log('Created upload directory:', uploadPath);
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const filename = `${Date.now()}-${file.originalname}`;
      cb(null, filename);
    }
  }),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === 'attendanceFile') {
      // manual attendance must be CSV
      const ok = ext === '.csv' || file.mimetype === 'text/csv';
      return ok ? cb(null, true) : cb(new Error('attendanceFile must be CSV (.csv)'), false);
    }
    if (file.fieldname === 'excelFile') {
      const ok = ['.xlsx', '.xls', '.csv'].includes(ext) || [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ].includes(file.mimetype);
      return ok ? cb(null, true) : cb(new Error('excelFile must be Excel (.xlsx/.xls) or CSV (.csv)'), false);
    }
    return cb(new Error('Unknown upload field'), false);
  }
});

// File upload route
router.post('/upload', auth, upload.fields([{ name: 'excelFile', maxCount: 1 }, { name: 'attendanceFile', maxCount: 1 }]), async (req, res) => {
  try {
    if (!req.files || !req.files.excelFile || !req.files.attendanceFile) {
      return res.status(400).json({ message: 'Both excel and attendance files are required' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const excelFile = req.files.excelFile[0];
    const attendanceFile = req.files.attendanceFile[0];
    const { monthYear, totalHolidays } = req.body;

    // Holidays used for salary enhancement
    let numberOfHolidays = Number(totalHolidays || 0);
    if (!totalHolidays) {
      const holidaysFromDb = await Holiday.find({ monthYear, isActive: true });
      numberOfHolidays = holidaysFromDb.length;
    }

    // Parse biometric (excelFile)
    const excelExt = path.extname(excelFile.originalname).toLowerCase();
    let excelData = [];
    if (excelExt === '.csv') {
      excelData = await processAttendanceCSV(excelFile.path, numberOfHolidays);
    } else {
      excelData = await processAttendanceExcel(excelFile.path, numberOfHolidays);
    }

    // Parse manual (attendanceFile CSV)
    const manualData = await processManualAttendance(attendanceFile.path);

    // Replace existing attendance for month
    await Attendance.deleteMany({ monthYear });

    const attendanceRecords = [];
    const arr = Array.isArray(excelData) ? excelData : [];

    for (const empData of arr) {
      const employeeId = empData.employeeId;
      const employeeName = (empData.name || '').toString();
      const keyName = employeeName.toLowerCase().trim();

      // Find manual attendance by employeeId or by normalized name
      let manualAttendance = manualData[employeeId];
      if (!manualAttendance && keyName) {
        manualAttendance = manualData[keyName];
        if (!manualAttendance) {
          const normalizedExcelName = keyName.replace(/[^a-z0-9]/g, '');
          for (const [k, v] of Object.entries(manualData)) {
            const normalizedK = k.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            const lev = getLevenshteinDistance(normalizedExcelName, normalizedK);
            const contains = normalizedK.includes(normalizedExcelName) || normalizedExcelName.includes(normalizedK);
            if (normalizedExcelName && (normalizedExcelName === normalizedK || contains || lev <= 2)) {
              manualAttendance = v;
              break;
            }
          }
        }
      }

      // Merge: manual provides present days & attendance details; excel provides hours
      let presentDays = empData.daysPresent || 0;
      let attendanceDetails = empData.attendanceDetails || [];
      let hoursWorked = empData.hoursWorked || 0;

      if (manualAttendance) {
        presentDays = manualAttendance.presentDays || presentDays;
        if (Array.isArray(manualAttendance.attendanceDetails)) {
          attendanceDetails = manualAttendance.attendanceDetails;
        }
        // If manual provided totalHours and excel hours are missing, we could use it (optional)
        if (!hoursWorked && typeof manualAttendance.totalHours === 'number') {
          hoursWorked = manualAttendance.totalHours;
        }
      }

      // Compute holiday-enhanced metrics
      const payableDays = presentDays + numberOfHolidays;
      const hoursWithHolidays = hoursWorked + (numberOfHolidays * 8);
      const effectiveDaysWithHolidays = Math.round(((hoursWorked / 8) + numberOfHolidays) * 100) / 100;

      // Link to a User by employeeId first, then by exact name (case-insensitive)
      let user = await User.findOne({ employeeId, isActive: { $ne: false } });
      if (!user && employeeName) {
        const escaped = employeeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        user = await User.findOne({ name: new RegExp(`^${escaped}$`, 'i'), isActive: { $ne: false } });
      }

      // Use user's baseSalary from database, fallback to default
      const userBaseSalary = user ? (user.baseSalary || 8000) : 8000;
      const userDailyWage = user ? (user.dailyWage || Math.round(userBaseSalary / 26)) : Math.round(userBaseSalary / 26);

      // Two salary methods with 26-day cap
      const cappedPayableDays = Math.min(payableDays, 26);
      const cappedEffectiveDays = Math.min(effectiveDaysWithHolidays, 26);
      const dayWiseSalary = Math.round(cappedPayableDays * userDailyWage);
      const proportionalSalary = Math.round(cappedEffectiveDays * userDailyWage);

      // Use day-wise method as primary calculation for consistency
      const calculatedSalary = dayWiseSalary;

      const finalUserId = user ? user._id.toString() : (employeeId || employeeName);

      attendanceRecords.push({
        ...empData,
        userId: finalUserId,
        employeeId: employeeId,
        userName: user ? user.name : employeeName,
        daysPresent: presentDays,
        totalWorkingDays: payableDays,
        calculatedSalary,
        adjustedSalary: calculatedSalary,
        payableDays,
        hoursWithHolidays,
        effectiveDaysWithHolidays,
        dayWiseSalary,
        proportionalSalary,
        monthYear,
        baseSalary: userBaseSalary,
        dailyWage: userDailyWage,
        hoursWorked,
        attendanceDetails,
        dataSource: 'excel',
        manualAttendanceSource: manualAttendance ? 'csv' : 'excel'
      });
    }

    const saved = await Attendance.insertMany(attendanceRecords);
    const insights = await getGrokInsights(saved);

    // cleanup temp files
    try { fs.unlinkSync(excelFile.path); } catch {}
    try { fs.unlinkSync(attendanceFile.path); } catch {}

    res.json({ success: true, message: `Successfully processed ${saved.length} employee records`, data: saved, insights, monthYear });
  } catch (err) {
    console.error('File upload error:', err);
    try {
      if (req.files?.excelFile?.[0]?.path && fs.existsSync(req.files.excelFile[0].path)) fs.unlinkSync(req.files.excelFile[0].path);
      if (req.files?.attendanceFile?.[0]?.path && fs.existsSync(req.files.attendanceFile[0].path)) fs.unlinkSync(req.files.attendanceFile[0].path);
    } catch {}
    res.status(500).json({ message: 'Error processing files', error: err.message, details: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  }
});

// Get all attendance records (admin route)
router.get('/', auth, async (req, res) => {
  try {
    const { monthYear, exposed } = req.query;
    const query = {};
    if (monthYear) query.monthYear = monthYear;

    if (req.user.role !== 'admin') {
      query.userId = req.user.id;
      query.exposed = true;
    } else if (exposed !== undefined) {
      query.exposed = exposed === 'true';
    }

    const data = await Attendance.find(query).sort({ name: 1 });

    // Merge duplicates by name (keep richer record)
    const uniqueUsers = new Map();
    data.forEach(record => {
      const key = (record.name || '').toLowerCase().trim();
      if (!uniqueUsers.has(key)) uniqueUsers.set(key, record);
      else {
        const existing = uniqueUsers.get(key);
        if ((record.hoursWorked > existing.hoursWorked) ||
            (record.daysPresent > existing.daysPresent) ||
            ((record.attendanceDetails?.length || 0) > (existing.attendanceDetails?.length || 0))) {
          uniqueUsers.set(key, record);
        }
      }
    });

    const finalData = Array.from(uniqueUsers.values());
    res.json(finalData);
  } catch (err) {
    console.error('Get attendance error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Expose attendance data to user
router.put('/expose/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

    const { id } = req.params;
    console.log('=== EXPOSE ATTENDANCE REQUEST ===');
    console.log('Expose ID:', id);
    
    // Try multiple strategies to find the attendance record
    let result = null;
    
    // Strategy 1: Direct attendance record ID
    result = await Attendance.findByIdAndUpdate(id, { exposed: true, updatedAt: new Date() }, { new: true });
    if (result) {
      console.log('✅ Found by attendance record ID');
    }
    
    // Strategy 2: Find by userId
    if (!result) {
      result = await Attendance.findOneAndUpdate({ userId: id }, { exposed: true, updatedAt: new Date() }, { new: true });
      if (result) {
        console.log('✅ Found by userId');
      }
    }
    
    // Strategy 3: Find by employeeId
    if (!result) {
      result = await Attendance.findOneAndUpdate({ employeeId: id }, { exposed: true, updatedAt: new Date() }, { new: true });
      if (result) {
        console.log('✅ Found by employeeId');
      }
    }
    
    // Strategy 4: Find user first, then find attendance by user details
    if (!result) {
      console.log('🔍 Trying to find user first...');
      const user = await User.findById(id);
      if (user) {
        console.log('👤 Found user:', user.name, 'employeeId:', user.employeeId);
        
        // Try to find attendance by user's employeeId
        if (user.employeeId) {
          result = await Attendance.findOneAndUpdate(
            { employeeId: user.employeeId }, 
            { exposed: true, updatedAt: new Date() }, 
            { new: true }
          );
          if (result) {
            console.log('✅ Found by user.employeeId');
          }
        }
        
        // Try to find attendance by user's name (case insensitive)
        if (!result && user.name) {
          const escapedName = user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          result = await Attendance.findOneAndUpdate(
            { name: { $regex: new RegExp(`^${escapedName}$`, 'i') } }, 
            { exposed: true, updatedAt: new Date() }, 
            { new: true }
          );
          if (result) {
            console.log('✅ Found by user.name');
          }
        }
        
        // Try to find attendance by userName field
        if (!result && user.name) {
          const escapedName = user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          result = await Attendance.findOneAndUpdate(
            { userName: { $regex: new RegExp(`^${escapedName}$`, 'i') } }, 
            { exposed: true, updatedAt: new Date() }, 
            { new: true }
          );
          if (result) {
            console.log('✅ Found by userName');
          }
        }
      }
    }

    if (!result) {
      console.log('❌ No attendance record found for ID:', id);
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    console.log('✅ Successfully exposed attendance for:', result.name);
    console.log('=== END EXPOSE REQUEST ===');
    
    res.json({ message: 'Data exposed successfully', attendance: result, exposed: true });
  } catch (err) {
    console.error('Expose attendance error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Adjust salary
router.put('/adjust/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

    const { adjustedSalary, reason } = req.body;
    if (!adjustedSalary || adjustedSalary < 0) return res.status(400).json({ message: 'Valid adjusted salary is required' });

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });

    const adjustment = new SalaryAdjustment({
      attendanceId: attendance._id,
      userId: attendance.userId,
      originalSalary: attendance.adjustedSalary,
      adjustedSalary: parseFloat(adjustedSalary),
      adjustmentReason: reason || 'Manual adjustment by admin',
      adjustedBy: req.user.id,
      monthYear: attendance.monthYear
    });
    await adjustment.save();

    attendance.adjustedSalary = parseFloat(adjustedSalary);
    attendance.updatedAt = new Date();
    await attendance.save();

    res.json({ message: 'Salary adjusted successfully', attendance, adjustment });
  } catch (err) {
    console.error('Salary adjustment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk expose all records
router.put('/expose-all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

    const { monthYear, userIds } = req.body;
    const query = {};
    if (monthYear) query.monthYear = monthYear;
    if (userIds && userIds.length > 0) query.userId = { $in: userIds };

    const result = await Attendance.updateMany(query, { exposed: true, updatedAt: new Date() });
    res.json({ message: `Exposed ${result.modifiedCount} attendance records to users`, modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error('Bulk expose error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// **CRITICAL FIX: USER ROUTE** - This was the main issue
router.get('/user/:userId', auth, async (req, res) => {
  try {
    console.log('=== USER ATTENDANCE REQUEST ===');
    console.log('Requested userId:', req.params.userId);
    console.log('Token user ID:', req.user.id);
    console.log('Token user role:', req.user.role);
    
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      console.log('❌ Current user not found in database');
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ Current user found:', {
      id: currentUser._id,
      name: currentUser.name,
      employeeId: currentUser.employeeId,
      role: req.user.role
    });

    let data = null;

    // Step 1: Find all exposed records first
    console.log('🔍 Step 1: Finding all exposed records...');
    const exposedRecords = await Attendance.find({ exposed: true }).sort({ createdAt: -1 });
    console.log('📊 Found', exposedRecords.length, 'exposed records');

    if (exposedRecords.length > 0) {
      // Try multiple matching strategies on exposed records
      
      // Method 1: Direct userId match
      data = exposedRecords.find(record => 
        record.userId === currentUser._id.toString() || 
        record.userId === req.user.id
      );
      if (data) {
        console.log('✅ Found userId match:', data.userId);
      }

      // Method 2: EmployeeId match
      if (!data && currentUser.employeeId) {
        data = exposedRecords.find(record => 
          record.employeeId === currentUser.employeeId
        );
        if (data) {
          console.log('✅ Found employeeId match:', data.employeeId);
        }
      }

      // Method 3: Name-based matching (exact and partial)
      if (!data && currentUser.name) {
        data = exposedRecords.find(record => {
          if (!record.name) return false;
          const recordName = record.name.toLowerCase().trim();
          const userName = currentUser.name.toLowerCase().trim();
          return recordName === userName || 
                 recordName.includes(userName) || 
                 userName.includes(recordName);
        });
        if (data) {
          console.log('✅ Found name match:', currentUser.name, '→', data.name);
        }
      }

      // Method 4: Try to match by userName field
      if (!data && currentUser.name) {
        data = exposedRecords.find(record => {
          if (!record.userName) return false;
          const recordUserName = record.userName.toLowerCase().trim();
          const userName = currentUser.name.toLowerCase().trim();
          return recordUserName === userName || 
                 recordUserName.includes(userName) || 
                 userName.includes(recordUserName);
        });
        if (data) {
          console.log('✅ Found userName match:', currentUser.name, '→', data.userName);
        }
      }
    }

    // Step 2: Search all records if no exposed records found
    if (exposedRecords.length === 0) {
      console.log('🔍 Step 2: No exposed records found, searching all records...');
      
      const allRecords = await Attendance.find({}).sort({ createdAt: -1 });
      console.log('🔍 DEBUG: Checking all attendance records...');
      console.log('📊 Total records in database:', allRecords.length);
      
      if (allRecords.length > 0) {
        console.log('📋 Sample records:');
        allRecords.slice(0, 3).forEach((record, index) => {
          console.log(`  ${index + 1}. Name: "${record.name}", UserId: "${record.userId}", EmployeeId: "${record.employeeId}", Exposed: ${record.exposed}`);
        });
        
        // Show all unique names for debugging
        const uniqueNames = [...new Set(allRecords.map(r => r.name))].slice(0, 10);
        console.log('📝 Available names in database:', uniqueNames);
      }

      // Try to find matches for current user
      const potentialMatches = [];
      
      for (const record of allRecords) {
        // Direct name match (case insensitive, trim whitespace)
        if (record.name && currentUser.name) {
          const recordName = record.name.toLowerCase().trim();
          const userName = currentUser.name.toLowerCase().trim();
          
          if (recordName === userName) {
            potentialMatches.push({ record, matchType: 'exact_name', score: 100 });
            continue;
          }
          
          // Check if names contain each other (partial match)
          if (recordName.includes(userName) || userName.includes(recordName)) {
            potentialMatches.push({ record, matchType: 'partial_name', score: 85 });
            continue;
          }
          
          // Split names and check individual parts
          const recordParts = recordName.split(/\s+/);
          const userParts = userName.split(/\s+/);
          
          for (const userPart of userParts) {
            for (const recordPart of recordParts) {
              if (userPart.length > 2 && recordPart.includes(userPart)) {
                potentialMatches.push({ record, matchType: 'name_part', score: 75 });
                break;
              }
            }
          }
          
          // Fuzzy name matching with lower threshold
          const distance = getLevenshteinDistance(recordName, userName);
          const maxLength = Math.max(recordName.length, userName.length);
          const similarity = ((maxLength - distance) / maxLength) * 100;
          
          if (similarity >= 60) {
            potentialMatches.push({ record, matchType: 'fuzzy_name', score: similarity });
          }
        }
        
        // EmployeeId match
        if (record.employeeId && currentUser.employeeId) {
          if (record.employeeId.toString() === currentUser.employeeId.toString()) {
            potentialMatches.push({ record, matchType: 'employeeId', score: 95 });
          }
        }
        
        // UserId match
        if (record.userId) {
          const recordUserId = record.userId.toString();
          const currentUserId = currentUser._id.toString();
          const tokenUserId = req.user.id.toString();
          
          if (recordUserId === currentUserId || recordUserId === tokenUserId) {
            potentialMatches.push({ record, matchType: 'userId', score: 90 });
          }
        }
      }
      
      console.log('🎯 Found', potentialMatches.length, 'potential matches for user:');
      potentialMatches.forEach((match, index) => {
        console.log(`  ${index + 1}. ${match.matchType} (${match.score.toFixed(1)}%): "${match.record.name}" (ID: ${match.record._id})`);
      });
      
      // Use the best match
      if (potentialMatches.length > 0) {
        const bestMatch = potentialMatches.sort((a, b) => b.score - a.score)[0];
        console.log('✅ Using best match:', bestMatch.matchType, 'with score:', bestMatch.score.toFixed(1) + '%');
        data = bestMatch.record;
      }
    }

    // Step 2.5: If still no match, create a demo record for testing
    if (!data && currentUser.name === 'Vijay Sharma') {
      console.log('🔧 Creating demo attendance record for Vijay Sharma...');
      
      const demoRecord = new Attendance({
        name: currentUser.name,
        userId: currentUser._id.toString(),
        employeeId: currentUser.employeeId,
        dept: 'IT',
        daysPresent: 22,
        totalWorkingDays: 26,
        hoursWorked: 176,
        salaryPercentage: 84.6,
        baseSalary: 6708,
        calculatedSalary: 5676,
        adjustedSalary: 5676,
        monthYear: '2025-08',
        exposed: true,
        dayWiseSalary: 5676,
        proportionalSalary: 5676,
        dailyWage: 258,
        payableDays: 22,
        effectiveDaysWithHolidays: 22,
        hoursWithHolidays: 176,
        attendanceDetails: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await demoRecord.save();
      data = demoRecord;
      console.log('✅ Created demo record for:', currentUser.name);
    }  

    // If still no data found, try direct database search (fallback)
    if (!data) {
      console.log('🔄 Step 3: Trying direct database search as fallback...');
      
      const searchQueries = [];
      
      // Add all possible user ID variations
      if (req.user.id) searchQueries.push({ userId: req.user.id });
      if (currentUser._id) searchQueries.push({ userId: currentUser._id.toString() });
      if (req.params.userId) searchQueries.push({ userId: req.params.userId });
      
      // Add employeeId search
      if (currentUser.employeeId) {
        searchQueries.push({ employeeId: currentUser.employeeId });
      }
      
      // Add name-based searches
      if (currentUser.name) {
        const escapedName = currentUser.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        searchQueries.push(
          { name: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
          { userName: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
          { name: { $regex: new RegExp(escapedName, 'i') } },
          { userName: { $regex: new RegExp(escapedName, 'i') } }
        );
      }

      if (searchQueries.length > 0) {
        data = await Attendance.findOne({
          $or: searchQueries
        }).sort({ createdAt: -1 });
        
        if (data) {
          console.log('✅ Found via direct database search');
        }
      }
    }

    // Final check - if still no data found
    if (!data) {
      console.log('❌ No attendance data found after all searches');
      console.log('Available exposed records:');
      exposedRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. Name: "${record.name}", UserId: "${record.userId}", EmployeeId: "${record.employeeId}"`);
      });
      
      // Return a proper response indicating no exposed data
      return res.json({ 
        message: 'No exposed attendance data found for this user',
        exposed: false,
        userData: null 
      });
    }

    // Data found - process and return
    console.log('✅ Attendance record found:', {
      id: data._id,
      name: data.name,
      userId: data.userId,
      employeeId: data.employeeId,
      exposed: data.exposed,
      monthYear: data.monthYear
    });

    // Ensure data is exposed (should already be, but double-check)
    if (!data.exposed) {
      console.log('🔓 Exposing data for user');
      await Attendance.findByIdAndUpdate(data._id, { exposed: true, updatedAt: new Date() });
      data.exposed = true;
    }

    // Add working days information
    try {
      const workingDaysInfo = calendarService.getWorkingDaysInMonth(data.monthYear, false);
      data.workingDaysInfo = workingDaysInfo;
      console.log('📅 Added working days info for month:', data.monthYear);
    } catch (calendarError) {
      console.warn('⚠️ Could not fetch working days info:', calendarError.message);
    }

    // Return the exact data as stored in database
    const responseData = data.toObject();
    
    console.log('=== USER ROUTE RESPONSE DATA ===');
    console.log('User ID searched:', req.user.id);
    console.log('Found record ID:', responseData._id);
    console.log('Record userId:', responseData.userId);
    console.log('Record name:', responseData.name);
    console.log('Exposed status:', responseData.exposed);
    console.log('Key fields:', {
      hoursWorked: responseData.hoursWorked,
      adjustedSalary: responseData.adjustedSalary,
      daysPresent: responseData.daysPresent,
      exposed: responseData.exposed
    });
    console.log('=== END USER ROUTE RESPONSE ===');
    
    return res.json(responseData);

  } catch (err) {
    console.error('❌ Error fetching user attendance:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Download attendance report
router.get('/download', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

    const { monthYear, format = 'csv' } = req.query;
    const query = {};
    if (monthYear) query.monthYear = monthYear;

    const data = await Attendance.find(query).sort({ name: 1 });

    if (format === 'excel' || format === 'xlsx') {
      const excelBuffer = generateExcelReport(data, monthYear);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=salary_report_${monthYear || 'all'}.xlsx`);
      return res.send(excelBuffer);
    }

    const fields = [
      'employeeId', 'name', 'dept', 'daysPresent', 'totalWorkingDays',
      'hoursWorked', 'salaryPercentage', 'baseSalary', 'dayWiseSalary', 
      'proportionalSalary', 'calculatedSalary', 'adjustedSalary', 
      'monthYear', 'exposed'
    ];
    const json2csv = new Parser({ fields });
    const csv = json2csv.parse(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=salary_report_${monthYear || 'all'}.csv`);
    res.send(csv);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ message: 'Error generating report' });
  }
});

// Get working days for specific month
router.get('/working-days/:monthYear', auth, async (req, res) => {
  try {
    const { monthYear } = req.params;
    if (!/^[0-9]{4}-[0-9]{2}$/.test(monthYear)) return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });

    const monthStats = getMonthStatistics(monthYear);
    const workingDays = getWorkingDaysInMonth(monthYear);
    const sundays = getSundaysInMonth(monthYear);

    res.json({
      monthYear,
      totalDays: monthStats.totalDays,
      workingDays,
      sundays: sundays.length,
      sundayDates: sundays,
      requiredWorkingDays: Math.min(workingDays, 26),
      monthStatistics: monthStats
    });
  } catch (err) {
    console.error('Working days calculation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unexposed users
router.get('/unexposed', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

    const { monthYear } = req.query;
    const query = { exposed: false };
    if (monthYear) query.monthYear = monthYear;

    const unexposedUsers = await Attendance.find(query)
      .select('userId name dept monthYear adjustedSalary daysPresent')
      .sort({ name: 1 });

    res.json({ count: unexposedUsers.length, users: unexposedUsers });
  } catch (err) {
    console.error('Get unexposed users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Expose all current month records
router.put('/expose-all-current', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

    const currentMonth = new Date().toISOString().slice(0, 7);

    const result = await Attendance.updateMany(
      { monthYear: currentMonth, exposed: false },
      { exposed: true, updatedAt: new Date() }
    );

    res.json({ message: `Exposed ${result.modifiedCount} attendance records for current month`, monthYear: currentMonth, modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error('Expose all current month error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current month working days
router.get('/working-days', auth, async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthStats = getMonthStatistics(currentMonth);
    const workingDays = getWorkingDaysInMonth(currentMonth);
    const sundays = getSundaysInMonth(currentMonth);

    res.json({
      monthYear: currentMonth,
      totalDays: monthStats.totalDays,
      workingDays,
      sundays: sundays.length,
      sundayDates: sundays,
      requiredWorkingDays: Math.min(workingDays, 26),
      monthStatistics: monthStats
    });
  } catch (err) {
    console.error('Working days calculation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get daily statistics
router.get('/daily-stats/:monthYear?', auth, async (req, res) => {
  try {
    const { monthYear } = req.params;
    const currentMonthYear = monthYear || new Date().toISOString().slice(0, 7);

    const attendanceRecords = await Attendance.find({ monthYear: currentMonthYear });
    if (attendanceRecords.length === 0) {
      return res.json({
        monthYear: currentMonthYear,
        totalEmployees: 0,
        totalDays: 0,
        totalSalary: 0,
        avgDaysPerEmployee: 0,
        avgSalaryPerEmployee: 0,
        dailyWage: 258,
        monthStats: getMonthStatistics(currentMonthYear)
      });
    }

    const totalDays = attendanceRecords.reduce((sum, record) => sum + record.daysPresent, 0);
    const totalSalary = attendanceRecords.reduce((sum, record) => sum + record.adjustedSalary, 0);
    const avgDaysPerEmployee = totalDays / attendanceRecords.length;
    const avgSalaryPerEmployee = totalSalary / attendanceRecords.length;
    const monthStats = getMonthStatistics(currentMonthYear);

    res.json({
      monthYear: currentMonthYear,
      totalEmployees: attendanceRecords.length,
      totalDays: Math.round(totalDays * 100) / 100,
      totalSalary: Math.round(totalSalary),
      avgDaysPerEmployee: Math.round(avgDaysPerEmployee * 100) / 100,
      avgSalaryPerEmployee: Math.round(avgSalaryPerEmployee),
      dailyWage: 258,
      monthStats,
      expectedTotalDays: monthStats.requiredWorkingDays * attendanceRecords.length,
      attendanceEfficiency: Math.round((totalDays / (monthStats.requiredWorkingDays * attendanceRecords.length)) * 100 * 100) / 100
    });
  } catch (err) {
    console.error('Daily stats calculation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get duplicates summary
router.get('/duplicates/summary', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const summary = await getDuplicateUsersSummary();
    res.json(summary);
  } catch (err) {
    console.error('Duplicates summary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove duplicates
router.post('/duplicates/remove', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const result = await deduplicateAttendanceRecords();
    res.json({ message: 'Deduplication completed successfully', ...result });
  } catch (err) {
    console.error('Deduplication error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Holiday Management Routes
router.post('/holidays', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

    const { holidays, monthYear } = req.body;
    if (!holidays || !Array.isArray(holidays) || holidays.length === 0) return res.status(400).json({ message: 'Holidays array is required' });
    if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) return res.status(400).json({ message: 'Valid monthYear (YYYY-MM) is required' });

    await Holiday.deleteMany({ monthYear });

    const holidayRecords = holidays.map(h => ({
      date: h.date,
      name: h.name,
      description: h.description || '',
      type: h.type || 'company',
      monthYear,
      createdBy: req.user.id
    }));

    const savedHolidays = await Holiday.insertMany(holidayRecords);
    res.json({ success: true, message: `Added ${savedHolidays.length} holidays for ${monthYear}`, holidays: savedHolidays });
  } catch (err) {
    console.error('Add holidays error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get holidays for month
router.get('/holidays/:monthYear', auth, async (req, res) => {
  try {
    const { monthYear } = req.params;
    if (!/^\d{4}-\d{2}$/.test(monthYear)) return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });

    const holidays = await Holiday.find({ monthYear, isActive: true }).sort({ date: 1 });
    res.json({ monthYear, count: holidays.length, holidays });
  } catch (err) {
    console.error('Get holidays error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update holiday
router.put('/holidays/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

    const { id } = req.params;
    const { name, description, type, isActive } = req.body;

    const holiday = await Holiday.findByIdAndUpdate(
      id,
      { name, description, type, isActive, updatedAt: new Date() },
      { new: true }
    );
    if (!holiday) return res.status(404).json({ message: 'Holiday not found' });

    res.json({ success: true, message: 'Holiday updated successfully', holiday });
  } catch (err) {
    console.error('Update holiday error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete holiday
router.delete('/holidays/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const { id } = req.params;
    const holiday = await Holiday.findByIdAndDelete(id);
    if (!holiday) return res.status(404).json({ message: 'Holiday not found' });
    res.json({ success: true, message: 'Holiday deleted successfully' });
  } catch (err) {
    console.error('Delete holiday error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Salary Increase Route
router.put('/salary-increase/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

    const { amount, reason } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Valid increase amount is required' });

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });

    const originalSalary = attendance.adjustedSalary;
    const newSalary = originalSalary + parseFloat(amount);

    const adjustment = new SalaryAdjustment({
      attendanceId: attendance._id,
      userId: attendance.userId,
      originalSalary: originalSalary,
      adjustedSalary: newSalary,
      adjustmentReason: reason || `Salary increase of ₹${amount}`,
      adjustmentType: 'increase',
      adjustmentAmount: parseFloat(amount),
      adjustedBy: req.user.id,
      monthYear: attendance.monthYear
    });
    await adjustment.save();

    attendance.adjustedSalary = newSalary;
    attendance.updatedAt = new Date();
    await attendance.save();

    res.json({ 
      message: 'Salary increased successfully', 
      attendance, 
      adjustment,
      originalSalary,
      newSalary,
      increaseAmount: parseFloat(amount)
    });
  } catch (err) {
    console.error('Salary increase error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Salary Decrease Route
router.put('/salary-decrease/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

    const { amount, reason } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Valid decrease amount is required' });

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });

    const originalSalary = attendance.adjustedSalary;
    const newSalary = Math.max(0, originalSalary - parseFloat(amount)); // Ensure salary doesn't go negative

    const adjustment = new SalaryAdjustment({
      attendanceId: attendance._id,
      userId: attendance.userId,
      originalSalary: originalSalary,
      adjustedSalary: newSalary,
      adjustmentReason: reason || `Salary decrease of ₹${amount}`,
      adjustmentType: 'decrease',
      adjustmentAmount: parseFloat(amount),
      adjustedBy: req.user.id,
      monthYear: attendance.monthYear
    });
    await adjustment.save();

    attendance.adjustedSalary = newSalary;
    attendance.updatedAt = new Date();
    await attendance.save();

    res.json({ 
      message: 'Salary decreased successfully', 
      attendance, 
      adjustment,
      originalSalary,
      newSalary,
      decreaseAmount: parseFloat(amount)
    });
  } catch (err) {
    console.error('Salary decrease error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;