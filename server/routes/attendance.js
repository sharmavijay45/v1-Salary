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
import { getMonthStatistics, getWorkingDaysInMonth, getSundaysInMonth, calculateSalaryWithDailyWage } from '../utils/workingDays.js';
import { deduplicateAttendanceRecords, getDuplicateUsersSummary } from '../utils/deduplicateUsers.js';
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
    // Allow Excel, CSV, and PDF files
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/pdf'
    ];

    const allowedExtensions = ['.xlsx', '.xls', '.csv', '.pdf'];

    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: Excel (.xlsx, .xls), CSV (.csv), PDF (.pdf). Got: ${file.mimetype}`), false);
    }
  }
});

router.post('/upload', auth, upload.fields([{ name: 'excelFile', maxCount: 1 }, { name: 'attendanceFile', maxCount: 1 }]), async (req, res) => {
  try {
    console.log('Upload route called');
    if (!req.files || !req.files.excelFile || !req.files.attendanceFile) {
      return res.status(400).json({ message: 'Both excel and attendance files are required' });
    }

    const excelFile = req.files.excelFile[0];
    const attendanceFile = req.files.attendanceFile[0];

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { monthYear, totalHolidays } = req.body;

    // Use provided totalHolidays or fetch from database
    let numberOfHolidays = totalHolidays || 0;
    if (!totalHolidays) {
      // Fallback to database holidays if not provided
      const holidaysFromDb = await Holiday.find({ monthYear: monthYear, isActive: true });
      numberOfHolidays = holidaysFromDb.length;
      console.log(`Found ${numberOfHolidays} active holidays for ${monthYear} from database`);
    } else {
      console.log(`Using provided total holidays: ${numberOfHolidays} for ${monthYear}`);
    }

    // Process excel file for detailed attendance and hours worked
    console.log('Processing Excel file...');
    const excelData = await processAttendanceExcel(excelFile.path, numberOfHolidays);
    console.log('Excel data processed:', excelData?.length || 0, 'employees');
    console.log('Excel data type:', typeof excelData);
    console.log('Excel data sample:', excelData?.slice(0, 2));

    // Process attendance file for present days (manual override/supplement)
    console.log('Processing attendance file:', attendanceFile.path);
    const attendanceData = await processManualAttendance(attendanceFile.path);
    console.log('Attendance file processed. Found employees:', Object.keys(attendanceData).length);
    console.log('All PDF employee names:', Object.keys(attendanceData));
    console.log('Sample PDF data for first employee:', attendanceData[Object.keys(attendanceData)[0]]);

    // Clear existing attendance data for the current month
    console.log('Deleting existing attendance data for month:', monthYear);
    await Attendance.deleteMany({ monthYear: monthYear });

    const attendanceRecords = [];
    // Ensure excelData is an array
    const excelDataArray = Array.isArray(excelData) ? excelData : [];
    console.log('Excel data type:', typeof excelData, 'Is array:', Array.isArray(excelData), 'Length:', excelDataArray.length);

    for (const empData of excelDataArray) {
        const employeeId = empData.employeeId;
        const employeeName = empData.name?.toLowerCase().trim();
        console.log(`Processing Excel employee: "${empData.name}" (ID: ${employeeId}) -> normalized: "${employeeName}"`);

        // Try to find manual attendance by employeeId first, then by name
        let manualAttendance = attendanceData[employeeId];
        if (!manualAttendance && employeeName) {
            // Look for attendance data by employee name (for PDF files)
            manualAttendance = attendanceData[employeeName];

            // If not found, try normalized name matching
            if (!manualAttendance) {
                const normalizedExcelName = employeeName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                console.log(`Looking for PDF match for Excel name: "${employeeName}" (normalized: "${normalizedExcelName}")`);

                for (const [pdfKey, pdfData] of Object.entries(attendanceData)) {
                    const normalizedPdfName = pdfKey.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                    console.log(`  Comparing with PDF name: "${pdfKey}" (normalized: "${normalizedPdfName}")`);

                    // Check various matching criteria
                    const exactMatch = normalizedPdfName === normalizedExcelName;
                    const containsMatch = normalizedPdfName.includes(normalizedExcelName) || normalizedExcelName.includes(normalizedPdfName);
                    const levenshteinDistance = getLevenshteinDistance(normalizedExcelName, normalizedPdfName);
                    const similarMatch = levenshteinDistance <= 2 && Math.min(normalizedExcelName.length, normalizedPdfName.length) > 3;

                    if (exactMatch || containsMatch || similarMatch) {
                        manualAttendance = pdfData;
                        console.log(`✅ Found PDF match for ${employeeName} -> ${pdfKey} (${exactMatch ? 'exact' : containsMatch ? 'contains' : 'similar'})`);
                        break;
                    }
                }

                if (!manualAttendance) {
                    console.log(`❌ No PDF match found for ${employeeName}`);
                }
            }
        }

        // PRIORITY: Use PDF for present days and attendance details, Excel for hours/salary
        let presentDays = empData.daysPresent; // Default from Excel
        let attendanceDetails = empData.attendanceDetails || [];
        let hoursWorked = empData.hoursWorked || 0;
        let dataSource = 'excel';

        if (manualAttendance) {
            // PDF takes priority for present days and attendance details
            presentDays = manualAttendance.presentDays; // Use PDF present days
            attendanceDetails = manualAttendance.attendanceDetails || attendanceDetails; // Use PDF attendance details
            dataSource = 'pdf';
            console.log(`Using PDF data for ${employeeName}: ${presentDays} present days`);
        } else {
            console.log(`Using Excel data for ${employeeName}: ${presentDays} present days`);
        }

        // Add holidays to the present days for salary calculation
        let payableDays = presentDays + numberOfHolidays;

        const user = await User.findOne({ employeeId: employeeId });
        const userDailyWage = user ? (user.dailyWage || 258) : 258;
        const calculatedSalary = payableDays * userDailyWage;

        // Ensure we have a valid userId - use employeeId as fallback if user not found
        const finalUserId = user ? user._id.toString() : employeeId;

        attendanceRecords.push({
            ...empData, // Keep all detailed attendance from excelData
            userId: finalUserId, // Always provide a valid userId
            employeeId: employeeId, // Keep employeeId for reference
            userName: user ? user.name : empData.name, // Store user name for matching
            daysPresent: presentDays, // Present days from PDF (priority) or Excel
            totalWorkingDays: payableDays, // Days used for salary calculation (base + holidays)
            calculatedSalary: calculatedSalary,
            adjustedSalary: calculatedSalary, // Initially adjusted salary is same as calculated
            monthYear: monthYear,
            baseSalary: user ? (user.baseSalary || 8000) : 8000,
            dailyWage: userDailyWage,
            hoursWorked: hoursWorked, // Hours from Excel (for salary calculations)
            attendanceDetails: attendanceDetails, // Attendance details from PDF (priority) or Excel
            dataSource: dataSource, // Track which file provided the present days
            manualAttendanceSource: manualAttendance ? 'pdf' : 'excel'
        });
    }

    let savedRecords = await Attendance.insertMany(attendanceRecords);

    // Generate AI insights
    const insights = await getGrokInsights(savedRecords);

    // Clean up uploaded files
    fs.unlinkSync(excelFile.path);
    fs.unlinkSync(attendanceFile.path);

    console.log(`Successfully processed ${savedRecords.length} attendance records`);

    res.json({
      success: true,
      message: `Successfully processed ${savedRecords.length} employee records`,
      data: savedRecords,
      insights,
      monthYear: monthYear
    });
  } catch (err) {
    console.error('File upload error:', err);

    if (req.files) {
        if (req.files.excelFile && fs.existsSync(req.files.excelFile[0].path)) {
            fs.unlinkSync(req.files.excelFile[0].path);
        }
        if (req.files.attendanceFile && fs.existsSync(req.files.attendanceFile[0].path)) {
            fs.unlinkSync(req.files.attendanceFile[0].path);
        }
    }

    res.status(500).json({
      message: 'Error processing files',
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
    console.log('Exposing attendance record with ID:', id);

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

    // If still not found, try by employeeId
    if (!result) {
      result = await Attendance.findOneAndUpdate(
        { employeeId: id },
        { exposed: true, updatedAt: new Date() }
      );
    }

    if (!result) {
      console.log('Attendance record not found for ID:', id);
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    console.log(`Successfully exposed attendance data for: ${result.name} (${result.userId || result.employeeId})`);
    res.json({
      message: 'Data exposed successfully',
      attendance: result,
      exposed: true
    });
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

    // Get the current user from the JWT token
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Current user:', {
      id: currentUser._id,
      name: currentUser.name,
      employeeId: currentUser.employeeId,
      role: req.user.role
    });

    let data = null;

    // For admin users, allow fetching any user's data
    if (req.user.role === 'admin') {
      // Try multiple ways to find the attendance record
      data = await Attendance.findOne({
        $or: [
          { userId: req.params.userId },
          { userId: currentUser._id.toString() },
          { employeeId: currentUser.employeeId },
          { name: { $regex: new RegExp(currentUser.name, 'i') } },
          { userName: { $regex: new RegExp(currentUser.name, 'i') } }
        ]
      }).sort({ createdAt: -1 }); // Get the most recent record
    } else {
      // For regular users, only allow their own data
      data = await Attendance.findOne({
        $or: [
          { userId: req.user.id },
          { userId: currentUser._id.toString() },
          { employeeId: currentUser.employeeId },
          { name: { $regex: new RegExp(currentUser.name, 'i') } },
          { userName: { $regex: new RegExp(currentUser.name, 'i') } }
        ]
      }).sort({ createdAt: -1 }); // Get the most recent record
    }

    if (data) {
      console.log('Attendance data found:', {
        name: data.name,
        exposed: data.exposed,
        monthYear: data.monthYear,
        adjustedSalary: data.adjustedSalary,
        dataUserId: data.userId,
        requestUserId: req.user.id,
        userRole: req.user.role,
        dataSource: data.dataSource
      });

      // For non-admin users, check exposure status
      if (req.user.role !== 'admin') {
        if (!data.exposed) {
          // Auto-expose data for the user's own records
          console.log('Auto-exposing data for user:', data.name);
          await Attendance.findByIdAndUpdate(data._id, {
            exposed: true,
            updatedAt: new Date()
          });
          data.exposed = true; // Update the local object
        }
      }

      // Add working days information to the response
      try {
        const workingDaysInfo = await calendarService.getWorkingDaysInMonth(data.monthYear, false);
        data.workingDaysInfo = workingDaysInfo;
      } catch (calendarError) {
        console.warn('Could not fetch calendar info:', calendarError);
      }

      // Ensure the response includes all necessary data for the frontend
      const responseData = {
        ...data.toObject(),
        exposed: data.exposed,
        dataSource: data.dataSource || 'unknown'
      };

      res.json(responseData);
    } else {
      console.log('No attendance data found for user');
      res.json(null);
    }
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

// Holiday Management Routes

// Add holidays for a month (admin only)
router.post('/holidays', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { holidays, monthYear } = req.body;

    if (!holidays || !Array.isArray(holidays) || holidays.length === 0) {
      return res.status(400).json({ message: 'Holidays array is required' });
    }

    if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
      return res.status(400).json({ message: 'Valid monthYear (YYYY-MM) is required' });
    }

    // Clear existing holidays for the month
    await Holiday.deleteMany({ monthYear });

    // Create new holiday records
    const holidayRecords = holidays.map(holiday => ({
      date: holiday.date,
      name: holiday.name,
      description: holiday.description || '',
      type: holiday.type || 'company',
      monthYear,
      createdBy: req.user.id
    }));

    const savedHolidays = await Holiday.insertMany(holidayRecords);

    res.json({
      success: true,
      message: `Added ${savedHolidays.length} holidays for ${monthYear}`,
      holidays: savedHolidays
    });
  } catch (err) {
    console.error('Add holidays error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get holidays for a month
router.get('/holidays/:monthYear', auth, async (req, res) => {
  try {
    const { monthYear } = req.params;

    if (!/^\d{4}-\d{2}$/.test(monthYear)) {
      return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });
    }

    const holidays = await Holiday.find({ 
      monthYear, 
      isActive: true 
    }).sort({ date: 1 });

    res.json({
      monthYear,
      count: holidays.length,
      holidays
    });
  } catch (err) {
    console.error('Get holidays error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update holiday (admin only)
router.put('/holidays/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;
    const { name, description, type, isActive } = req.body;

    const holiday = await Holiday.findByIdAndUpdate(
      id,
      {
        name,
        description,
        type,
        isActive,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    res.json({
      success: true,
      message: 'Holiday updated successfully',
      holiday
    });
  } catch (err) {
    console.error('Update holiday error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete holiday (admin only)
router.delete('/holidays/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;
    const holiday = await Holiday.findByIdAndDelete(id);

    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    res.json({
      success: true,
      message: 'Holiday deleted successfully'
    });
  } catch (err) {
    console.error('Delete holiday error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;