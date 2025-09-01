import XLSX from 'xlsx';
import moment from 'moment';
import fs from 'fs';
import csv from 'csv-parser';
import {
  getWorkingDaysInMonth,
  calculateSalaryWithWorkingDays,
  calculateSalaryWithDailyWage,
  validateAttendanceAgainstWorkingDays,
  getMonthStatistics
} from './workingDays.js';
import calendarService from './calendarService.js';
import User from '../models/User.js';

export const processAttendanceExcel = async (filePath, holidays) => {
  try {
    console.log('Processing Excel file:', filePath);

    // Try different reading options
    let workbook;
    try {
      workbook = XLSX.readFile(filePath, {
        cellText: false,
        cellDates: true,
        raw: false,
        dateNF: 'dd/mm/yyyy',
        cellStyles: true
      });
    } catch (e) {
      console.log('Failed with advanced options, trying basic read:', e.message);
      workbook = XLSX.readFile(filePath);
    }

    console.log('Available sheets:', workbook.SheetNames);

    // Try all sheets to find data
    let rawData = [];
    let sheetName = '';
    let bestSheet = null;

    for (const sheet of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheet];
      console.log(`\n--- Analyzing Sheet: ${sheet} ---`);

      // Get sheet range
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      console.log(`Sheet range: ${worksheet['!ref']}, Rows: ${range.e.r + 1}, Cols: ${range.e.c + 1}`);

      // Try multiple parsing methods
      let sheetData = [];

      // Method 1: Array of arrays
      try {
        sheetData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: false,
          dateNF: 'dd/mm/yyyy',
          blankrows: false
        });
        console.log(`Method 1 (array): ${sheetData.length} rows`);
      } catch (e) {
        console.log('Method 1 failed:', e.message);
      }

      // Method 2: If method 1 fails or gives poor results, try object format
      if (sheetData.length === 0) {
        try {
          const objData = XLSX.utils.sheet_to_json(worksheet, {
            defval: '',
            raw: false,
            blankrows: false
          });
          if (objData.length > 0) {
            const headers = Object.keys(objData[0]);
            sheetData = [headers, ...objData.map(row => headers.map(h => row[h] || ''))];
            console.log(`Method 2 (object): ${sheetData.length} rows`);
          }
        } catch (e) {
          console.log('Method 2 failed:', e.message);
        }
      }

      // Method 3: Manual cell reading if other methods fail
      if (sheetData.length === 0) {
        console.log('Trying manual cell reading...');
        const manualData = [];
        for (let r = range.s.r; r <= range.e.r; r++) {
          const row = [];
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cellAddress = XLSX.utils.encode_cell({ r, c });
            const cell = worksheet[cellAddress];
            row.push(cell ? (cell.v || cell.w || '') : '');
          }
          manualData.push(row);
        }
        sheetData = manualData;
        console.log(`Method 3 (manual): ${sheetData.length} rows`);
      }

      // Debug: Show raw data
      console.log('Raw sheet data sample:', sheetData.slice(0, 3));

      // Filter out completely empty rows with better logic
      const nonEmptyRows = sheetData.filter((row, index) => {
        if (!row || !Array.isArray(row)) return false;

        const hasContent = row.some(cell => {
          if (cell === null || cell === undefined) return false;
          const cellStr = String(cell).trim();
          return cellStr !== '' && cellStr !== '0' && cellStr !== 'undefined' && cellStr !== 'null';
        });

        if (hasContent) {
          console.log(`Row ${index} has content:`, row.slice(0, 5));
        }
        return hasContent;
      });

      console.log(`Sheet "${sheet}": ${sheetData.length} total rows, ${nonEmptyRows.length} non-empty rows`);

      if (nonEmptyRows.length > 0 && nonEmptyRows.length > (rawData.length || 0)) {
        rawData = nonEmptyRows;
        sheetName = sheet;
        bestSheet = { name: sheet, data: nonEmptyRows };
      }
    }

    if (!rawData || rawData.length === 0) {
      throw new Error(`No valid data found in any sheet. Please ensure the Excel file contains employee attendance data. Sheets analyzed: ${workbook.SheetNames.join(', ')}`);
    }

    console.log(`\n=== Using sheet "${sheetName}" with ${rawData.length} non-empty rows ===`);
    console.log('First few rows:', rawData.slice(0, 5));

    // Find header row more flexibly
    let headerRowIndex = -1;
    const headerKeywords = ['id', 'name', 'employee', 'emp', 'dept', 'department', 'date', 'attendance', 'status'];

    for (let i = 0; i < Math.min(rawData.length, 10); i++) { // Check first 10 rows
      const row = rawData[i];
      if (row && Array.isArray(row) && row.length > 0) {
        const matchCount = row.filter(cell => {
          if (typeof cell === 'string') {
            const cellLower = cell.toLowerCase().trim();
            return headerKeywords.some(keyword => cellLower.includes(keyword));
          }
          return false;
        }).length;

        // If we find at least 2 header keywords, consider this the header row
        if (matchCount >= 2) {
          headerRowIndex = i;
          break;
        }
      }
    }

    // If no header found, assume first non-empty row is header
    if (headerRowIndex === -1) {
      for (let i = 0; i < rawData.length; i++) {
        if (rawData[i] && rawData[i].length > 2) { // At least 3 columns
          headerRowIndex = i;
          console.log('Using first non-empty row as header:', rawData[i]);
          break;
        }
      }
    }

    if (headerRowIndex === -1 || rawData.length < 2) {
      console.log('Available data:', rawData);
      throw new Error(`No valid data found in Excel file. Found ${rawData.length} rows. Please ensure the file contains attendance data with at least ID, Name, and date columns.`);
    }
    
    const headerRow = rawData[headerRowIndex];
    const dataRows = rawData.slice(headerRowIndex + 1);
    
    // Find column indices with more flexible matching
    const idColIndex = findColumnIndex(headerRow, ['id', 'emp id', 'employee id', 'empid', 'emp_id', 'employee_id']);
    const nameColIndex = findColumnIndex(headerRow, ['name', 'employee name', 'emp name', 'full name', 'employee_name']);
    const deptColIndex = findColumnIndex(headerRow, ['dept', 'department', 'dept.', 'dep', 'division']);

    console.log('Column indices found:', { idColIndex, nameColIndex, deptColIndex });
    console.log('Header row:', headerRow);

    // Make department optional if not found
    if (idColIndex === -1 || nameColIndex === -1) {
      throw new Error(`Required columns not found. Found: ID=${idColIndex}, Name=${nameColIndex}, Dept=${deptColIndex}`);
    }
    
    // Find date columns (typically start after department column)
    const dateColumns = [];
    const startCol = Math.max(idColIndex, nameColIndex, deptColIndex !== -1 ? deptColIndex : 2) + 1;

    for (let i = startCol; i < headerRow.length; i++) {
      const cell = headerRow[i];
      // Include any column that has data (numbers, dates, or day numbers)
      if (cell !== undefined && cell !== null && cell !== '') {
        const cellStr = String(cell).trim();
        // Check if it looks like a date or day number
        if (cellStr && (
          cellStr.match(/^\d{1,2}$/) || // Day number like "1", "2", "31"
          cellStr.match(/^\d{1,2}\/\d{1,2}/) || // Date like "1/7", "01/07"
          cellStr.match(/^\d{1,2}-\d{1,2}/) || // Date like "1-7", "01-07"
          cellStr.toLowerCase().includes('date') ||
          cellStr.toLowerCase().includes('day') ||
          !isNaN(Date.parse(cellStr)) // Valid date string
        )) {
          dateColumns.push(i);
        }
      }
    }

    console.log('Date columns found:', dateColumns.length, 'starting from column', startCol);
    console.log('Date column headers:', dateColumns.map(i => headerRow[i]));
    
    const employeeMap = new Map(); // Use Map to merge duplicate users by name

    for (const row of dataRows) {
      if (!row || !row[idColIndex] || !row[nameColIndex]) continue;

      const employeeId = String(row[idColIndex]).trim();
      const name = String(row[nameColIndex]).trim();
      const dept = (deptColIndex !== -1 && row[deptColIndex]) ? String(row[deptColIndex]).trim() : 'General';

      if (!employeeId || !name) continue;

      // Check if employee already exists in map (merge by name)
      if (!employeeMap.has(name)) {
        employeeMap.set(name, {
          employeeId,
          name,
          dept,
          attendanceDetails: [],
          totalDaysPresent: 0,
          totalHoursWorked: 0
        });
      }

      const employee = employeeMap.get(name);

      // Process each date column for this employee
      for (let i = 0; i < dateColumns.length; i++) {
        const colIndex = dateColumns[i];
        const dateValue = headerRow[colIndex];
        const attendanceValue = row[colIndex];

        // Skip empty cells
        if (!attendanceValue || attendanceValue === '') continue;

        const date = formatDate(dateValue);
        const { checkIn, checkOut, hoursWorked, status } = parseAttendanceValue(attendanceValue);

        console.log(`Processing ${name} - Date: ${date}, Value: ${attendanceValue}, Status: ${status}, Hours: ${hoursWorked}`);

        // Check if this date already exists for this employee (avoid duplicate dates)
        const existingDateIndex = employee.attendanceDetails.findIndex(detail => detail.date === date);

        if (existingDateIndex === -1) {
          // New date entry
          employee.attendanceDetails.push({
            date,
            checkIn,
            checkOut,
            hoursWorked,
            status
          });

          if (status === 'Present') {
            employee.totalDaysPresent++;
            employee.totalHoursWorked += hoursWorked;
          } else if (status === 'Half Day') {
            employee.totalDaysPresent += 0.5;
            employee.totalHoursWorked += hoursWorked;
          }
        } else {
          // Date already exists, merge the data (take the better attendance)
          const existing = employee.attendanceDetails[existingDateIndex];
          if (status === 'Present' && existing.status !== 'Present') {
            // Update to Present if current is better
            employee.totalDaysPresent -= (existing.status === 'Half Day' ? 0.5 : 0);
            employee.totalHoursWorked -= existing.hoursWorked;

            existing.checkIn = checkIn;
            existing.checkOut = checkOut;
            existing.hoursWorked = hoursWorked;
            existing.status = status;

            employee.totalDaysPresent++;
            employee.totalHoursWorked += hoursWorked;
          } else if (status === 'Half Day' && existing.status === 'Absent') {
            // Update to Half Day if current is better than Absent
            existing.checkIn = checkIn;
            existing.checkOut = checkOut;
            existing.hoursWorked = hoursWorked;
            existing.status = status;

            employee.totalDaysPresent += 0.5;
            employee.totalHoursWorked += hoursWorked;
          }
        }
      }
    }

    // Convert Map to array and process salary calculations
    const processedEmployees = [];

    for (const [name, employee] of employeeMap) {
      
      // Try to fetch user configuration from database
      let userConfig = {};
      let userBaseSalary = parseInt(process.env.DEFAULT_SALARY) || 8000;
      let userDailyWage = parseInt(process.env.DAILY_WAGE) || 258;
      
      try {
        const user = await User.findOne({
          $or: [
            { employeeId: employee.employeeId },
            { name: { $regex: new RegExp(employee.name, 'i') } }
          ]
        });
        
        if (user) {
          // Use individual base salary from database
          userBaseSalary = user.baseSalary || parseInt(process.env.DEFAULT_SALARY) || 8000;
          userDailyWage = user.dailyWage || parseInt(process.env.DAILY_WAGE) || 258;
          
          userConfig = {
            baseSalary: userBaseSalary,
            dailyWage: userDailyWage,
            salaryType: user.salaryType || 'daily_wage',
            salaryCalculationMethod: user.salaryCalculationMethod || 'daily_wage',
            expectedWorkingHours: user.expectedWorkingHours || 8,
            overrideSettings: user.overrideSettings || {}
          };
          console.log(`Found user config for ${employee.name}: Base Salary: ₹${userBaseSalary}, Daily Wage: ₹${userDailyWage}`);
        } else {
          console.log(`No user config found for ${employee.name}, using defaults: Base Salary: ₹${userBaseSalary}`);
        }
      } catch (error) {
        console.error(`Error fetching user config for ${employee.name}:`, error);
      }
      
      // Use enhanced salary calculation with calendar service
      const monthYear = getCurrentMonthYear();
      const dailyWage = userConfig.dailyWage || parseInt(process.env.DAILY_WAGE) || 258;
      const baseSalary = userConfig.baseSalary || parseInt(process.env.DEFAULT_SALARY) || 8000;

      // Get configurable divisors from environment
      const hoursToDaysDivisor = parseInt(process.env.HOURS_TO_DAYS_DIVISOR) || 24;
      const hoursToSalaryDivisor = parseInt(process.env.HOURS_TO_SALARY_DIVISOR) || 8;
      
      // Validate attendance against working days (excluding Sundays and holidays)
      const validation = validateAttendanceAgainstWorkingDays(employee.attendanceDetails, monthYear);

      // Calculate different types of days based on hours worked
      const calculatedCalendarDays = Math.round((employee.totalHoursWorked / hoursToDaysDivisor) * 100) / 100; // Total hours ÷ 24
      const calculatedWorkingDays = Math.round((employee.totalHoursWorked / hoursToSalaryDivisor) * 100) / 100; // Total hours ÷ 8
      
      // Use enhanced daily wage calculation with calendar service
      const salaryCalculation = calculateSalaryWithDailyWage(
        employee.totalHoursWorked, 
        employee.totalDaysPresent, 
        monthYear, 
        dailyWage,
        baseSalary,
        userConfig,
        holidays
      );

      // Get enhanced month statistics
      const monthStats = getMonthStatistics(monthYear);

      processedEmployees.push({
        employeeId: employee.employeeId,
        name: employee.name,
        dept: employee.dept,
        
        // Multiple days present calculations using configurable divisors
        daysPresent: employee.totalDaysPresent, // Actual days from Excel file
        actualDaysPresent: employee.totalDaysPresent, // Explicit actual days from Excel
        calculatedDaysPresent: calculatedWorkingDays, // Hours ÷ 8 (for salary calculation)
        calculatedCalendarDays: calculatedCalendarDays, // Hours ÷ 24 (total calendar days)
        calculatedWorkingDays: calculatedWorkingDays, // Hours ÷ 8 (working days for salary)
        
        // Configuration factors used
        hoursToDaysDivisor: hoursToDaysDivisor,
        hoursToSalaryDivisor: hoursToSalaryDivisor,
        
        hoursWorked: Math.round(employee.totalHoursWorked * 100) / 100,
        totalWorkingDays: salaryCalculation.requiredDays,
        workingDaysInMonth: salaryCalculation.workingDaysInMonth,
        expectedTotalHours: salaryCalculation.expectedTotalHours,
        avgHoursPerDay: salaryCalculation.avgHoursPerDay,
        avgHoursPerMonth: salaryCalculation.avgHoursPerMonth,
        dailyWage: salaryCalculation.dailyWage,
        baseSalary: salaryCalculation.baseSalary,
        calculatedSalary: salaryCalculation.calculatedSalary,
        adjustedSalary: salaryCalculation.adjustedSalary,
        salaryPercentage: salaryCalculation.salaryPercentage,
        attendancePercentage: salaryCalculation.attendancePercentage,
        hoursPercentage: salaryCalculation.hoursPercentage,
        attendanceDetails: employee.attendanceDetails,
        
        // Enhanced attendance breakdown for detailed listing
        attendanceBreakdown: {
          totalDaysInMonth: monthStats.totalDays,
          workingDaysInMonth: monthStats.workingDays,
          actualDaysPresent: employee.totalDaysPresent,
          calculatedDaysPresent: calculatedWorkingDays,
          calculatedCalendarDays: calculatedCalendarDays,
          calculatedWorkingDays: calculatedWorkingDays,
          totalHoursWorked: employee.totalHoursWorked,
          avgHoursPerDay: salaryCalculation.avgHoursPerDay,
          hoursToDaysDivisor: hoursToDaysDivisor,
          hoursToSalaryDivisor: hoursToSalaryDivisor,
          attendanceList: employee.attendanceDetails.map(detail => ({
            date: detail.date,
            dayName: moment(detail.date).format('dddd'),
            checkIn: detail.checkIn,
            checkOut: detail.checkOut,
            hoursWorked: detail.hoursWorked,
            status: detail.status,
            isWeekend: moment(detail.date).day() === 0, // Sunday
            formattedDate: moment(detail.date).format('DD MMM YYYY')
          })).sort((a, b) => moment(a.date).diff(moment(b.date)))
        },
        monthYear,
        exposed: false,
        
        // Enhanced fields from calendar service
        calculationMethod: salaryCalculation.calculationMethod,
        workingDaysInfo: salaryCalculation.workingDaysInfo,
        salaryBreakdown: salaryCalculation.salaryBreakdown,
        
        // Additional working days info
        sundayAttendance: validation.sundayAttendance,
        validWorkingDays: validation.validWorkingDays,
        monthStatistics: monthStats,
        validationWarnings: validation.warnings,
        
        // User configuration info
        userConfig: {
          hasCustomSalary: baseSalary > 8000,
          salaryType: userConfig.salaryType || 'daily_wage',
          calculationMethod: userConfig.salaryCalculationMethod || 'daily_wage'
        }
      });
    }
    
    for (const employee of processedEmployees) {
      if (holidays && typeof holidays === 'number') {
        const monthYear = employee.monthYear;
        const totalDaysInMonth = moment(monthYear, 'YYYY-MM').daysInMonth();
        const newDaysPresent = employee.daysPresent + holidays;
        
        employee.daysPresent = newDaysPresent;
        employee.calculatedSalary = (newDaysPresent / totalDaysInMonth) * employee.baseSalary;
        employee.adjustedSalary = employee.calculatedSalary;
      }
    }

    return processedEmployees;
  } catch (error) {
    console.error('Excel processing error:', error);
    throw new Error(`Failed to process Excel file: ${error.message}`);
  }
};

// Helper functions
function findColumnIndex(headerRow, searchTerms) {
  for (let i = 0; i < headerRow.length; i++) {
    const cell = headerRow[i];
    if (cell && typeof cell === 'string') {
      const cellLower = cell.toLowerCase().trim();
      if (searchTerms.some(term => cellLower.includes(term.toLowerCase()))) {
        return i;
      }
    }
  }
  return -1;
}

function isDateLike(value) {
  if (typeof value === 'number') return true;
  if (typeof value === 'string') {
    return /^\d{1,2}[\/\-]\d{1,2}/.test(value) || /^\d{1,2}$/.test(value);
  }
  return false;
}

function formatDate(dateValue) {
  if (typeof dateValue === 'number') {
    // Excel date number
    const date = XLSX.SSF.parse_date_code(dateValue);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  
  if (typeof dateValue === 'string') {
    // Try to parse various date formats
    const parsed = moment(dateValue, ['DD/MM/YYYY', 'MM/DD/YYYY', 'DD-MM-YYYY', 'MM-DD-YYYY', 'DD', 'D']);
    if (parsed.isValid()) {
      return parsed.format('YYYY-MM-DD');
    }
  }
  
  return String(dateValue);
}

function parseAttendanceValue(value) {
  if (!value) {
    return { checkIn: '', checkOut: '', hoursWorked: 0, status: 'Absent' };
  }

  const valueStr = String(value).trim();

  // Skip empty or meaningless values
  if (valueStr === '' || valueStr === '0' || valueStr === '-' || valueStr === 'undefined') {
    return { checkIn: '', checkOut: '', hoursWorked: 0, status: 'Absent' };
  }

  // Handle timestamp format like "10:30 16:30" or "10:30-16:30" or "10:30 to 16:30"
  const timestampPattern = /(\d{1,2}:\d{2})\s*(?:[-\s]|to)\s*(\d{1,2}:\d{2})/i;
  const timestampMatch = valueStr.match(timestampPattern);

  if (timestampMatch) {
    const checkIn = timestampMatch[1];
    const checkOut = timestampMatch[2];
    const hoursWorked = calculateHours(checkIn, checkOut);

    return {
      checkIn,
      checkOut,
      hoursWorked,
      status: hoursWorked >= 6 ? 'Present' : hoursWorked >= 4 ? 'Half Day' : 'Present'
    };
  }

  // Check for time patterns (HH:MM format) - multiple times in one cell
  const timePattern = /\b(\d{1,2}:\d{2})\b/g;
  const times = valueStr.match(timePattern);

  if (times && times.length >= 2) {
    const checkIn = times[0];
    const checkOut = times[times.length - 1];
    const hoursWorked = calculateHours(checkIn, checkOut);

    return {
      checkIn,
      checkOut,
      hoursWorked,
      status: hoursWorked >= 6 ? 'Present' : hoursWorked >= 4 ? 'Half Day' : 'Present'
    };
  } else if (times && times.length === 1) {
    return {
      checkIn: times[0],
      checkOut: '',
      hoursWorked: 4, // Assume half day
      status: 'Half Day'
    };
  }

  // Handle numeric values (hours worked directly)
  const numericValue = parseFloat(valueStr);
  if (!isNaN(numericValue) && numericValue > 0) {
    return {
      checkIn: '',
      checkOut: '',
      hoursWorked: numericValue,
      status: numericValue >= 6 ? 'Present' : numericValue >= 4 ? 'Half Day' : 'Present'
    };
  }

  // Handle simple status indicators
  const lowerValue = valueStr.toLowerCase();

  // Handle various status indicators
  if (lowerValue.includes('present') || lowerValue === 'p' || lowerValue === '1' || lowerValue === 'yes' || lowerValue === 'y') {
    return {
      checkIn: '09:00',
      checkOut: '18:00',
      hoursWorked: 8,
      status: 'Present'
    };
  } else if (lowerValue.includes('half') || lowerValue === 'h' || lowerValue === '0.5') {
    return {
      checkIn: '09:00',
      checkOut: '13:00',
      hoursWorked: 4,
      status: 'Half Day'
    };
  } else if (lowerValue.includes('absent') || lowerValue === 'a' || lowerValue === '0' || lowerValue === 'no' || lowerValue === 'n') {
    return { checkIn: '', checkOut: '', hoursWorked: 0, status: 'Absent' };
  } else if (lowerValue.includes('leave') || lowerValue === 'l' || lowerValue.includes('holiday')) {
    return { checkIn: '', checkOut: '', hoursWorked: 0, status: 'Absent' };
  }

  // If it contains any time data, try to extract it
  if (/\d{1,2}:\d{2}/.test(valueStr)) {
    const timeMatch = valueStr.match(/(\d{1,2}:\d{2})/);
    if (timeMatch) {
      return {
        checkIn: timeMatch[1],
        checkOut: '',
        hoursWorked: 4, // Assume half day if only one time
        status: 'Half Day'
      };
    }
  }

  // Check if it's a valid date or day number (might be a different format)
  if (/^\d{1,2}$/.test(valueStr) && parseInt(valueStr) <= 31) {
    // This might be a day number, assume present
    return {
      checkIn: '09:00',
      checkOut: '18:00',
      hoursWorked: 8,
      status: 'Present'
    };
  }

  // Default to absent for unrecognized values
  console.log('Unrecognized attendance value:', valueStr);
  return { checkIn: '', checkOut: '', hoursWorked: 0, status: 'Absent' };
}

function calculateHours(checkIn, checkOut) {
  try {
    const checkInTime = moment(checkIn, 'HH:mm');
    const checkOutTime = moment(checkOut, 'HH:mm');
    
    if (checkOutTime.isBefore(checkInTime)) {
      // Handle next day checkout
      checkOutTime.add(1, 'day');
    }
    
    const duration = moment.duration(checkOutTime.diff(checkInTime));
    return Math.max(0, duration.asHours());
  } catch (error) {
    return 0;
  }
}

function getCurrentMonthYear() {
  return moment().format('YYYY-MM');
}

export const generateExcelReport = (attendanceData) => {
  try {
    const workbook = XLSX.utils.book_new();

    // Prepare data for Excel export
    const reportData = attendanceData.map(emp => ({
      'Employee ID': emp.employeeId,
      'Name': emp.name,
      'Department': emp.dept,
      'Days Present': emp.daysPresent,
      'Total Working Days': emp.totalWorkingDays,
      'Hours Worked': emp.hoursWorked,
      'Attendance %': emp.salaryPercentage,
      'Base Salary': emp.baseSalary,
      'Calculated Salary': emp.calculatedSalary,
      'Adjusted Salary': emp.adjustedSalary,
      'Month Year': emp.monthYear,
      'Status': emp.exposed ? 'Exposed' : 'Hidden'
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(reportData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Report');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return buffer;
  } catch (error) {
    console.error('Excel generation error:', error);
    throw new Error(`Failed to generate Excel report: ${error.message}`);
  }
};

// CSV Processing Function
export const processAttendanceCSV = async (filePath, holidays) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Processing CSV file:', filePath);

      // Check if file exists and has content
      const stats = fs.statSync(filePath);
      console.log('File size:', stats.size, 'bytes');

      if (stats.size === 0) {
        throw new Error('CSV file is empty');
      }

      // Try reading with different encodings
      let csvContent;
      try {
        csvContent = fs.readFileSync(filePath, 'utf8');
      } catch (err) {
        console.log('UTF-8 failed, trying latin1');
        csvContent = fs.readFileSync(filePath, 'latin1');
      }

      console.log('CSV file content preview:', csvContent.substring(0, 500));

      if (!csvContent || csvContent.trim() === '') {
        throw new Error('CSV file appears to be empty or unreadable');
      }

      const results = [];
      const stream = fs.createReadStream(filePath)
        .pipe(csv({
          skipEmptyLines: true,
          skipLinesWithError: true
        }))
        .on('data', (data) => {
          console.log('CSV row data:', data);
          results.push(data);
        })
        .on('end', async () => {
          try {
            console.log('CSV parsing completed. Total rows:', results.length);

            if (results.length === 0) {
              throw new Error('No data rows found in CSV file');
            }

            // Get column names from first row
            const firstRow = results[0];
            const columnNames = Object.keys(firstRow);
            console.log('Available columns:', columnNames);

            // Find column indices with flexible matching
            const nameCol = findColumnName(columnNames, ['name', 'employee name', 'emp name', 'full name', 'employee_name']);
            const deptCol = findColumnName(columnNames, ['dept', 'department', 'dept.', 'dep', 'division']);
            const dateCol = findColumnName(columnNames, ['date', 'attendance date', 'work date', 'day']);
            const checkInCol = findColumnName(columnNames, ['check in', 'checkin', 'check_in', 'in time', 'time in', 'check-in', 'checkin time', 'in', 'clock in']);
            const checkOutCol = findColumnName(columnNames, ['check out', 'checkout', 'check_out', 'out time', 'time out', 'check-out', 'checkout time', 'out', 'clock out']);

            console.log('Column names found:', {
              nameCol,
              deptCol,
              dateCol,
              checkInCol,
              checkOutCol
            });

            // Debug: Show first few rows to understand the data structure
            console.log('First 3 data rows:');
            results.slice(0, 3).forEach((row, index) => {
              console.log(`Row ${index + 1}:`, row);
            });

            // Validate required columns
            if (!nameCol) {
              throw new Error(`Name column not found. Available columns: ${columnNames.join(', ')}. Please ensure your CSV has a "Name" column.`);
            }
            if (!dateCol) {
              throw new Error(`Date column not found. Available columns: ${columnNames.join(', ')}. Please ensure your CSV has a "Date" column.`);
            }

            // Process data rows
            const employeeAttendance = {};

            // Group attendance by employee (merge duplicates by name)
            for (const row of results) {
              const name = row[nameCol]?.trim();
              const dept = (deptCol && row[deptCol]) ? row[deptCol].trim() : 'General';
              const dateValue = row[dateCol]?.trim();
              const checkInValue = (checkInCol && row[checkInCol]) ? row[checkInCol].trim() : '';
              const checkOutValue = (checkOutCol && row[checkOutCol]) ? row[checkOutCol].trim() : '';

              // Debug: Log the values being processed
              if (name === 'Kanav' || name === 'John Doe') { // Debug specific employees
                console.log(`Debug ${name}:`, {
                  nameCol, deptCol, dateCol, checkInCol, checkOutCol,
                  name, dept, dateValue, checkInValue, checkOutValue,
                  rowData: row
                });
              }

              if (!name || !dateValue) continue;

              // Use name as key to merge duplicates (instead of generated ID)
              const employeeKey = name.toLowerCase().replace(/\s+/g, '_');

              // Initialize employee if not exists
              if (!employeeAttendance[employeeKey]) {
                employeeAttendance[employeeKey] = {
                  employeeId: generateEmployeeId(name),
                  name,
                  dept,
                  attendanceDetails: [],
                  totalDaysPresent: 0,
                  totalHoursWorked: 0
                };
              }

              // Parse date
              const date = formatDate(dateValue);

              // Parse attendance values
              const { checkIn, checkOut, hoursWorked, status } = parseCSVAttendanceValue(checkInValue, checkOutValue);

              console.log(`Processing ${name} - Date: ${date}, CheckIn: ${checkIn}, CheckOut: ${checkOut}, Status: ${status}, Hours: ${hoursWorked}`);

              // Check if this date already exists for this employee (avoid duplicate dates)
              const existingDateIndex = employeeAttendance[employeeKey].attendanceDetails.findIndex(detail => detail.date === date);

              if (existingDateIndex === -1) {
                // New date entry
                employeeAttendance[employeeKey].attendanceDetails.push({
                  date,
                  checkIn,
                  checkOut,
                  hoursWorked,
                  status
                });

                // Update totals
                if (status === 'Present') {
                  employeeAttendance[employeeKey].totalDaysPresent++;
                  employeeAttendance[employeeKey].totalHoursWorked += hoursWorked;
                } else if (status === 'Half Day') {
                  employeeAttendance[employeeKey].totalDaysPresent += 0.5;
                  employeeAttendance[employeeKey].totalHoursWorked += hoursWorked;
                }
              } else {
                // Date already exists, merge the data (take the better attendance)
                const existing = employeeAttendance[employeeKey].attendanceDetails[existingDateIndex];
                if (status === 'Present' && existing.status !== 'Present') {
                  // Update to Present if current is better
                  employeeAttendance[employeeKey].totalDaysPresent -= (existing.status === 'Half Day' ? 0.5 : 0);
                  employeeAttendance[employeeKey].totalHoursWorked -= existing.hoursWorked;

                  existing.checkIn = checkIn;
                  existing.checkOut = checkOut;
                  existing.hoursWorked = hoursWorked;
                  existing.status = status;

                  employeeAttendance[employeeKey].totalDaysPresent++;
                  employeeAttendance[employeeKey].totalHoursWorked += hoursWorked;
                } else if (status === 'Half Day' && existing.status === 'Absent') {
                  // Update to Half Day if current is better than Absent
                  existing.checkIn = checkIn;
                  existing.checkOut = checkOut;
                  existing.hoursWorked = hoursWorked;
                  existing.status = status;

                  employeeAttendance[employeeKey].totalDaysPresent += 0.5;
                  employeeAttendance[employeeKey].totalHoursWorked += hoursWorked;
                }
              }
            }

            // Convert to final format
            const processedEmployees = [];
            const monthYear = getCurrentMonthYear();

            for (const employeeKey in employeeAttendance) {
              const employee = employeeAttendance[employeeKey];

              // Try to fetch user configuration from database
              let userConfig = {};
              try {
                const user = await User.findOne({
                  $or: [
                    { employeeId: employee.employeeId },
                    { name: { $regex: new RegExp(employee.name, 'i') } }
                  ]
                });
                
                if (user) {
                  userConfig = {
                    baseSalary: user.baseSalary || parseInt(process.env.DEFAULT_SALARY) || 8000,
                    dailyWage: user.dailyWage || parseInt(process.env.DAILY_WAGE) || 258,
                    salaryType: user.salaryType || 'daily_wage',
                    salaryCalculationMethod: user.salaryCalculationMethod || 'daily_wage',
                    expectedWorkingHours: user.expectedWorkingHours || 8,
                    overrideSettings: user.overrideSettings || {}
                  };
                  console.log(`Found user config for ${employee.name}:`, userConfig);
                } else {
                  console.log(`No user config found for ${employee.name}, using defaults`);
                }
              } catch (error) {
                console.error(`Error fetching user config for ${employee.name}:`, error);
              }
              
              // Use enhanced salary calculation with calendar service
              const monthYear = getCurrentMonthYear();
              const dailyWage = userConfig.dailyWage || parseInt(process.env.DAILY_WAGE) || 258;
              const baseSalary = userConfig.baseSalary || parseInt(process.env.DEFAULT_SALARY) || 8000;
              
              // Get configurable divisors from environment
              const hoursToDaysDivisor = parseInt(process.env.HOURS_TO_DAYS_DIVISOR) || 24;
              const hoursToSalaryDivisor = parseInt(process.env.HOURS_TO_SALARY_DIVISOR) || 8;
              
              // Calculate different types of days based on hours worked
              const calculatedCalendarDays = Math.round((employee.totalHoursWorked / hoursToDaysDivisor) * 100) / 100; // Total hours ÷ 24
              const calculatedWorkingDays = Math.round((employee.totalHoursWorked / hoursToSalaryDivisor) * 100) / 100; // Total hours ÷ 8
              
              // Validate attendance against working days (excluding Sundays and holidays)
              const validation = validateAttendanceAgainstWorkingDays(employee.attendanceDetails, monthYear);

              // Use enhanced daily wage calculation with calendar service
              const salaryCalculation = calculateSalaryWithDailyWage(
                employee.totalHoursWorked, 
                employee.totalDaysPresent, 
                monthYear, 
                dailyWage,
                baseSalary,
                userConfig,
                holidays
              );

              // Get enhanced month statistics
              const monthStats = getMonthStatistics(monthYear);

              processedEmployees.push({
                employeeId: employee.employeeId,
                name: employee.name,
                dept: employee.dept,
                
                // Multiple days present calculations using configurable divisors
                daysPresent: employee.totalDaysPresent, // Actual days from CSV file
                actualDaysPresent: employee.totalDaysPresent, // Explicit actual days from CSV
                calculatedDaysPresent: calculatedWorkingDays, // Hours ÷ 8 (for salary calculation)
                calculatedCalendarDays: calculatedCalendarDays, // Hours ÷ 24 (total calendar days)
                calculatedWorkingDays: calculatedWorkingDays, // Hours ÷ 8 (working days for salary)
                
                // Configuration factors used
                hoursToDaysDivisor: hoursToDaysDivisor,
                hoursToSalaryDivisor: hoursToSalaryDivisor,
                
                hoursWorked: Math.round(employee.totalHoursWorked * 100) / 100,
                totalWorkingDays: salaryCalculation.requiredDays,
                workingDaysInMonth: salaryCalculation.workingDaysInMonth,
                expectedTotalHours: salaryCalculation.expectedTotalHours,
                avgHoursPerDay: salaryCalculation.avgHoursPerDay,
                avgHoursPerMonth: salaryCalculation.avgHoursPerMonth,
                dailyWage: salaryCalculation.dailyWage,
                baseSalary: salaryCalculation.baseSalary,
                calculatedSalary: salaryCalculation.calculatedSalary,
                adjustedSalary: salaryCalculation.adjustedSalary,
                salaryPercentage: salaryCalculation.salaryPercentage,
                attendancePercentage: salaryCalculation.attendancePercentage,
                hoursPercentage: salaryCalculation.hoursPercentage,
                attendanceDetails: employee.attendanceDetails,
                
                // Enhanced attendance breakdown for detailed listing
                attendanceBreakdown: {
                  totalDaysInMonth: monthStats.totalDays,
                  workingDaysInMonth: monthStats.workingDays,
                  actualDaysPresent: employee.totalDaysPresent,
                  calculatedDaysPresent: calculatedWorkingDays,
                  calculatedCalendarDays: calculatedCalendarDays,
                  calculatedWorkingDays: calculatedWorkingDays,
                  totalHoursWorked: employee.totalHoursWorked,
                  avgHoursPerDay: salaryCalculation.avgHoursPerDay,
                  hoursToDaysDivisor: hoursToDaysDivisor,
                  hoursToSalaryDivisor: hoursToSalaryDivisor,
                  attendanceList: employee.attendanceDetails.map(detail => ({
                    date: detail.date,
                    dayName: moment(detail.date).format('dddd'),
                    checkIn: detail.checkIn,
                    checkOut: detail.checkOut,
                    hoursWorked: detail.hoursWorked,
                    status: detail.status,
                    isWeekend: moment(detail.date).day() === 0, // Sunday
                    formattedDate: moment(detail.date).format('DD MMM YYYY')
                  })).sort((a, b) => moment(a.date).diff(moment(b.date)))
                },
                monthYear,
                exposed: false,
                
                // Enhanced fields from calendar service
                calculationMethod: salaryCalculation.calculationMethod,
                workingDaysInfo: salaryCalculation.workingDaysInfo,
                salaryBreakdown: salaryCalculation.salaryBreakdown,
                
                // Additional working days info
                sundayAttendance: validation.sundayAttendance,
                validWorkingDays: validation.validWorkingDays,
                monthStatistics: monthStats,
                validationWarnings: validation.warnings,
                
                // User configuration info
                userConfig: {
                  hasCustomSalary: baseSalary > 8000,
                  salaryType: userConfig.salaryType || 'daily_wage',
                  calculationMethod: userConfig.salaryCalculationMethod || 'daily_wage'
                }
              });
            }

            for (const employee of processedEmployees) {
              if (holidays && typeof holidays === 'number') {
                const monthYear = employee.monthYear;
                const totalDaysInMonth = moment(monthYear, 'YYYY-MM').daysInMonth();
                const newDaysPresent = employee.daysPresent + holidays;
                
                employee.daysPresent = newDaysPresent;
                employee.calculatedSalary = (newDaysPresent / totalDaysInMonth) * employee.baseSalary;
                employee.adjustedSalary = employee.calculatedSalary;
              }
            }

            console.log(`Successfully processed ${processedEmployees.length} employees from CSV`);
            resolve(processedEmployees);

          } catch (error) {
            console.error('CSV processing error:', error);
            reject(new Error(`Failed to process CSV file: ${error.message}`));
          }
        })
        .on('error', (error) => {
          console.error('CSV parsing error:', error);
          reject(new Error(`Failed to parse CSV file: ${error.message}`));
        });

    } catch (error) {
      console.error('CSV processing error:', error);
      reject(new Error(`Failed to process CSV file: ${error.message}`));
    }
  });
};

// Helper function to parse CSV line (handles quoted fields)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  // Handle empty lines
  if (!line || line.trim() === '') {
    return [];
  }

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Handle escaped quotes
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, '')); // Remove surrounding quotes
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim().replace(/^"|"$/g, '')); // Remove surrounding quotes
  console.log('Parsed CSV line:', result);
  return result;
}

// Helper function to find column name (for CSV objects)
function findColumnName(columnNames, searchTerms) {
  for (const columnName of columnNames) {
    if (columnName && typeof columnName === 'string') {
      const columnLower = columnName.toLowerCase().trim();
      if (searchTerms.some(term => columnLower.includes(term.toLowerCase()))) {
        return columnName;
      }
    }
  }
  return null;
}

// Helper function to generate employee ID from name
function generateEmployeeId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 10) + Math.random().toString(36).substring(2, 5);
}

// Helper function to parse CSV attendance values
function parseCSVAttendanceValue(checkInValue, checkOutValue) {
  let checkIn = '';
  let checkOut = '';
  let hoursWorked = 0;
  let status = 'Absent';

  // Clean up time values
  checkInValue = checkInValue?.replace(/[^\d:]/g, '') || '';
  checkOutValue = checkOutValue?.replace(/[^\d:]/g, '') || '';

  // Check if times are provided
  if (checkInValue && checkOutValue) {
    checkIn = checkInValue;
    checkOut = checkOutValue;

    // Calculate hours worked
    try {
      const checkInTime = moment(checkInValue, ['HH:mm', 'H:mm', 'HH:mm:ss']);
      const checkOutTime = moment(checkOutValue, ['HH:mm', 'H:mm', 'HH:mm:ss']);

      if (checkInTime.isValid() && checkOutTime.isValid()) {
        let duration = moment.duration(checkOutTime.diff(checkInTime));

        // Handle overnight shifts
        if (duration.asHours() < 0) {
          duration = moment.duration(checkOutTime.add(1, 'day').diff(checkInTime));
        }

        hoursWorked = Math.max(0, duration.asHours());

        // Determine status based on hours worked
        if (hoursWorked >= 8) {
          status = 'Present';
        } else if (hoursWorked >= 4) {
          status = 'Half Day';
        } else if (hoursWorked > 0) {
          status = 'Present'; // Short day but present
        }
      }
    } catch (error) {
      console.log('Error parsing times:', error.message);
    }
  } else if (checkInValue && !checkOutValue) {
    // Only check-in provided
    checkIn = checkInValue;
    status = 'Present';
    hoursWorked = 8; // Assume full day
  }

  return {
    checkIn,
    checkOut,
    hoursWorked: Math.round(hoursWorked * 100) / 100,
    status
  };
}
