import express from 'express';
import multer from 'multer';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import Feedback from '../models/Feedback.js';
import SalaryAdjustment from '../models/SalaryAdjustment.js';
import auth from '../middleware/auth.js';
import { getGrokInsights } from '../utils/groq.js';
import { processAttendanceExcel, processAttendanceCSV, generateExcelReport } from '../utils/excelProcessor.js';
import { getMonthStatistics, getWorkingDaysInMonth, getSundaysInMonth, calculateSalaryWithDailyWage } from '../utils/workingDays.js';
import { deduplicateAttendanceRecords, getDuplicateUsersSummary } from '../utils/deduplicateUsers.js';
import { Parser } from 'json2csv';
import path from 'path';
import fs from 'fs';

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
      console.log('Multer destination called, upload path:', uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const filename = `${Date.now()}-${file.originalname}`;
      console.log('Multer filename called, filename:', filename);
      cb(null, filename);
    }
  }),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 },
  fileFilter: (req, file, cb) => {
    console.log('Multer fileFilter called, file:', file);
    cb(null, true);
  }
});

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    console.log('Upload route called');
    console.log('Request file:', req.file);
    console.log('Request body:', req.body);

    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    console.log('Processing file:', req.file.path);
    console.log('File type:', req.file.mimetype);
    console.log('File extension:', req.file.originalname.split('.').pop());
    console.log('File size:', req.file.size, 'bytes');
    console.log('Original filename:', req.file.originalname);

    // Check if file exists and has content
    try {
      const fileStats = fs.statSync(req.file.path);
      console.log('File stats:', fileStats);
      console.log('File exists:', fs.existsSync(req.file.path));

      if (fileStats.size === 0) {
        console.log('File is empty after upload!');
        return res.status(400).json({ message: 'Uploaded file is empty' });
      }

      // Try to read first few bytes
      const buffer = fs.readFileSync(req.file.path);
      console.log('File buffer length:', buffer.length);
      console.log('First 100 bytes:', buffer.toString('utf8', 0, Math.min(100, buffer.length)));
    } catch (fileError) {
      console.error('Error checking uploaded file:', fileError);
      return res.status(400).json({ message: 'Error reading uploaded file' });
    }

    // Determine file type and process accordingly
    let processedData;
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    const mimeType = req.file.mimetype;

    if (fileExtension === 'csv' || mimeType === 'text/csv' || mimeType === 'application/csv') {
      console.log('Processing as CSV file');
      processedData = await processAttendanceCSV(req.file.path);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls' ||
               mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
               mimeType === 'application/vnd.ms-excel') {
      console.log('Processing as Excel file');
      processedData = processAttendanceExcel(req.file.path);
    } else {
      return res.status(400).json({
        message: 'Unsupported file format. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.'
      });
    }

    if (!processedData || processedData.length === 0) {
      return res.status(400).json({ message: 'No valid attendance data found in the uploaded file' });
    }

    // Clear existing attendance data for the current month
    const currentMonthYear = processedData[0].monthYear;
    console.log('Deleting existing attendance data for month:', currentMonthYear);
    const deleteResult = await Attendance.deleteMany({ monthYear: currentMonthYear });
    console.log('Deleted', deleteResult.deletedCount, 'existing attendance records');

    // Map employee IDs to user IDs from the Users collection
    const attendanceRecords = [];
    for (const empData of processedData) {
      try {
        // Try to find user by employee ID or name
        let user = await User.findOne({
          $or: [
            { employeeId: empData.employeeId },
            { name: { $regex: new RegExp(empData.name, 'i') } }
          ]
        });

        // If user not found, create a basic record with employeeId as userId
        const userId = user ? user._id.toString() : empData.employeeId;

        attendanceRecords.push({
          ...empData,
          userId
        });
      } catch (error) {
        console.error('Error processing employee:', empData.name, error);
        // Continue with other employees
        attendanceRecords.push({
          ...empData,
          userId: empData.employeeId
        });
      }
    }

    // Insert new attendance records with error handling
    let savedRecords;
    try {
      savedRecords = await Attendance.insertMany(attendanceRecords);
    } catch (insertError) {
      if (insertError.code === 11000) {
        // Handle duplicate key error by trying individual inserts
        console.log('Bulk insert failed due to duplicates, trying individual inserts...');
        savedRecords = [];
        for (const record of attendanceRecords) {
          try {
            // Try to update existing record or insert new one
            const existingRecord = await Attendance.findOneAndUpdate(
              { userId: record.userId, monthYear: record.monthYear },
              record,
              { upsert: true, new: true }
            );
            savedRecords.push(existingRecord);
          } catch (individualError) {
            console.error('Error inserting individual record:', individualError);
          }
        }
      } else {
        throw insertError;
      }
    }

    // Generate AI insights
    const insights = await getGrokInsights(attendanceRecords);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    console.log(`Successfully processed ${savedRecords.length} attendance records`);

    res.json({
      success: true,
      message: `Successfully processed ${savedRecords.length} employee records`,
      data: savedRecords,
      insights,
      monthYear: currentMonthYear
    });
  } catch (err) {
    console.error('Excel upload error:', err);

    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      message: 'Error processing Excel file',
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { monthYear, exposed } = req.query;
    let query = {};

    if (monthYear) {
      query.monthYear = monthYear;
    }

    // If user is not admin, only show exposed data for their own records
    if (req.user.role !== 'admin') {
      query.userId = req.user.id;
      query.exposed = true;
    } else if (exposed !== undefined) {
      query.exposed = exposed === 'true';
    }

    const data = await Attendance.find(query).sort({ name: 1 });

    // Merge duplicate users with same name
    const uniqueUsers = new Map();

    data.forEach(record => {
      const nameKey = record.name.toLowerCase().trim();

      if (!uniqueUsers.has(nameKey)) {
        uniqueUsers.set(nameKey, record);
      } else {
        // Merge with existing record (take the one with more hours or better data)
        const existing = uniqueUsers.get(nameKey);
        if (record.hoursWorked > existing.hoursWorked ||
            record.daysPresent > existing.daysPresent ||
            record.attendanceDetails.length > existing.attendanceDetails.length) {
          uniqueUsers.set(nameKey, record);
        }
      }
    });

    const mergedData = Array.from(uniqueUsers.values());
    res.json(mergedData);
  } catch (err) {
    console.error('Get attendance error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/expose/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;
    let result;

    // Try to find by attendance record _id first
    result = await Attendance.findByIdAndUpdate(id, { exposed: true, updatedAt: new Date() });

    // If not found by _id, try by userId
    if (!result) {
      result = await Attendance.findOneAndUpdate(
        { userId: id },
        { exposed: true, updatedAt: new Date() }
      );
    }

    if (!result) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    console.log(`Exposed attendance data for: ${result.name} (${result.userId})`);
    res.json({ message: 'Data exposed successfully', attendance: result });
  } catch (err) {
    console.error('Expose attendance error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/adjust/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { adjustedSalary, reason } = req.body;

    if (!adjustedSalary || adjustedSalary < 0) {
      return res.status(400).json({ message: 'Valid adjusted salary is required' });
    }

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    // Create salary adjustment record
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

    // Update attendance record
    attendance.adjustedSalary = parseFloat(adjustedSalary);
    attendance.updatedAt = new Date();
    await attendance.save();

    res.json({
      message: 'Salary adjusted successfully',
      attendance,
      adjustment
    });
  } catch (err) {
    console.error('Salary adjustment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk expose to users
router.put('/expose-all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { monthYear, userIds } = req.body;
    let query = {};

    if (monthYear) {
      query.monthYear = monthYear;
    }

    if (userIds && userIds.length > 0) {
      query.userId = { $in: userIds };
    }

    const result = await Attendance.updateMany(query, {
      exposed: true,
      updatedAt: new Date()
    });

    res.json({
      message: `Exposed ${result.modifiedCount} attendance records to users`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('Bulk expose error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/user/:userId', auth, async (req, res) => {
  try {
    console.log('Fetching attendance for userId:', req.params.userId);

    // Try to find attendance record by userId
    let data = await Attendance.findOne({ userId: req.params.userId });

    if (!data) {
      // If not found by userId, try to find by user's name or employeeId
      const user = await User.findById(req.params.userId);
      if (user) {
        console.log('User found:', user.name, 'employeeId:', user.employeeId);
        data = await Attendance.findOne({
          $or: [
            { name: { $regex: new RegExp(user.name, 'i') } },
            { employeeId: user.employeeId }
          ]
        });
        console.log('Attendance found by name/employeeId:', data ? 'Yes' : 'No');
      }
    }

    if (data) {
      console.log('Attendance data found:', {
        name: data.name,
        exposed: data.exposed,
        monthYear: data.monthYear,
        adjustedSalary: data.adjustedSalary,
        dataUserId: data.userId,
        requestUserId: req.user.id,
        userRole: req.user.role
      });

      // Check if user is admin or if data is exposed
      if (req.user.role !== 'admin') {
        // For non-admin users, only return data if it's exposed
        if (!data.exposed) {
          // Auto-expose data for the user if it's their own data
          if (data.userId === req.user.id) {
            console.log('Auto-exposing data for user:', data.name);
            await Attendance.findByIdAndUpdate(data._id, {
              exposed: true,
              updatedAt: new Date()
            });
            data.exposed = true; // Update the local object
          } else {
            console.log('Data not exposed to user, returning null');
            return res.json(null);
          }
        }

        // Additional check: if data was found by userId, ensure it matches
        // If data was found by name/employeeId, we allow it since user lookup succeeded
        if (data.userId && data.userId !== req.user.id && req.params.userId === data.userId) {
          console.log('UserId mismatch, returning null');
          return res.json(null);
        }
      }
    } else {
      console.log('No attendance data found for user');
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching user attendance:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/download', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { monthYear, format = 'csv' } = req.query;
    let query = {};

    if (monthYear) {
      query.monthYear = monthYear;
    }

    const data = await Attendance.find(query).sort({ name: 1 });

    if (format === 'excel' || format === 'xlsx') {
      // Generate Excel file
      const excelBuffer = generateExcelReport(data, monthYear);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=salary_report_${monthYear || 'all'}.xlsx`);
      res.send(excelBuffer);
    } else {
      // Generate CSV file (default)
      const fields = [
        'employeeId', 'name', 'dept', 'daysPresent', 'totalWorkingDays',
        'hoursWorked', 'salaryPercentage', 'baseSalary', 'calculatedSalary',
        'adjustedSalary', 'monthYear', 'exposed'
      ];
      const json2csv = new Parser({ fields });
      const csv = json2csv.parse(data);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=salary_report_${monthYear || 'all'}.csv`);
      res.send(csv);
    }
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ message: 'Error generating report' });
  }
});

// Get working days information for a month
router.get('/working-days/:monthYear', auth, async (req, res) => {
  try {
    const { monthYear } = req.params;

    // Validate monthYear format
    if (!/^\d{4}-\d{2}$/.test(monthYear)) {
      return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });
    }

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

// Get unexposed users for admin
router.get('/unexposed', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { monthYear } = req.query;
    let query = { exposed: false };

    if (monthYear) {
      query.monthYear = monthYear;
    }

    const unexposedUsers = await Attendance.find(query)
      .select('userId name dept monthYear adjustedSalary daysPresent')
      .sort({ name: 1 });

    res.json({
      count: unexposedUsers.length,
      users: unexposedUsers
    });
  } catch (err) {
    console.error('Get unexposed users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Expose all users for current month (admin only)
router.put('/expose-all-current', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    const result = await Attendance.updateMany(
      { monthYear: currentMonth, exposed: false },
      { exposed: true, updatedAt: new Date() }
    );

    console.log(`Exposed ${result.modifiedCount} attendance records for month ${currentMonth}`);
    res.json({
      message: `Exposed ${result.modifiedCount} attendance records for current month`,
      monthYear: currentMonth,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('Expose all current month error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current month working days info
router.get('/working-days', auth, async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

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

// Get daily wage statistics
router.get('/daily-stats/:monthYear?', auth, async (req, res) => {
  try {
    const { monthYear } = req.params;
    const currentMonthYear = monthYear || new Date().toISOString().slice(0, 7);

    // Get all attendance records for the month
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

    // Calculate statistics
    const totalDays = attendanceRecords.reduce((sum, record) => sum + record.daysPresent, 0);
    const totalSalary = attendanceRecords.reduce((sum, record) => sum + record.adjustedSalary, 0);
    const avgDaysPerEmployee = totalDays / attendanceRecords.length;
    const avgSalaryPerEmployee = totalSalary / attendanceRecords.length;

    // Get month statistics
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

// Get duplicate users summary
router.get('/duplicates/summary', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const summary = await getDuplicateUsersSummary();
    res.json(summary);
  } catch (err) {
    console.error('Duplicates summary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove duplicate users
router.post('/duplicates/remove', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const result = await deduplicateAttendanceRecords();
    res.json({
      message: 'Deduplication completed successfully',
      ...result
    });
  } catch (err) {
    console.error('Deduplication error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;