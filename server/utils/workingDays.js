

import moment from 'moment';
import calendarService from './calendarService.js';

/**
 * Calculate working days in a month excluding Sundays and admin holidays
 * Now enhanced with calendar service integration
 * @param {string} monthYear - Format: "YYYY-MM"
 * @param {number} adminHolidays - Number of holidays configured by admin (default: 0)
 * @returns {number} Number of working days (excluding Sundays and admin holidays)
 */
export const getWorkingDaysInMonth = (monthYear, adminHolidays = 0) => {
  try {
    // Use calendar service for enhanced calculation
    // Set excludeSaturdays to false to include Saturdays as working days (only exclude Sundays)
    const workingDaysInfo = calendarService.getWorkingDaysInMonth(monthYear, false, adminHolidays);
    return workingDaysInfo.workingDays;
  } catch (error) {
    console.error('Error calculating working days with calendar service, falling back:', error);
    // Fallback to old logic
    const startOfMonth = moment(monthYear, 'YYYY-MM').startOf('month');
    const endOfMonth = moment(monthYear, 'YYYY-MM').endOf('month');

    let workingDays = 0;
    let currentDate = startOfMonth.clone();

    while (currentDate.isSameOrBefore(endOfMonth)) {
      // Sunday is 0 in moment.js
      if (currentDate.day() !== 0) {
        workingDays++;
      }
      currentDate.add(1, 'day');
    }

    // Subtract admin holidays
    return Math.max(0, workingDays - adminHolidays);
  }
};

/**
 * Get all Sundays in a month - enhanced with calendar service
 * @param {string} monthYear - Format: "YYYY-MM"
 * @returns {Array} Array of Sunday dates
 */
export const getSundaysInMonth = (monthYear) => {
  try {
    // Use calendar service for enhanced functionality
    return calendarService.getSundaysInMonth(monthYear);
  } catch (error) {
    console.error('Error getting Sundays with calendar service, falling back:', error);
    // Fallback to old logic
    const startOfMonth = moment(monthYear, 'YYYY-MM').startOf('month');
    const endOfMonth = moment(monthYear, 'YYYY-MM').endOf('month');
    
    const sundays = [];
    let currentDate = startOfMonth.clone();
    
    while (currentDate.isSameOrBefore(endOfMonth)) {
      if (currentDate.day() === 0) { // Sunday
        sundays.push(currentDate.format('YYYY-MM-DD'));
      }
      currentDate.add(1, 'day');
    }
    
    return sundays;
  }
};

/**
 * Check if a date is a Sunday
 * @param {string} date - Format: "YYYY-MM-DD"
 * @returns {boolean} True if the date is a Sunday
 */
export const isSunday = (date) => {
  try {
    return moment(date, 'YYYY-MM-DD').day() === 0;
  } catch (error) {
    console.error('Error checking if date is Sunday:', error);
    return false;
  }
};

/**
 * Calculate salary based on days worked with daily wage - Enhanced with calendar service
 * @param {number} hoursWorked - Total hours worked by employee
 * @param {number} daysPresent - Number of days employee was present (will be recalculated from hours)
 * @param {string} monthYear - Format: "YYYY-MM"
 * @param {number} dailyWage - Daily wage rate (default: 258)
 * @param {number} baseSalary - Employee's base salary (default: 8000)
 * @param {Object} userConfig - User-specific configuration from User model
 * @returns {Object} Salary calculation details
 */
export const calculateSalaryWithDailyWage = (
  hoursWorked, 
  daysPresent, 
  monthYear, 
  baseSalary = 8000,
  userConfig = {},
  holidays = 0
) => {
  try {
    // Use calendar service for dynamic calculation
    const salaryCalculation = calendarService.calculateDynamicSalary(
      hoursWorked, 
      daysPresent, 
      monthYear, 
      userConfig.baseSalary || baseSalary,
      holidays
    );
    
    // Add backward compatibility fields for existing code
    return {
      workingDaysInMonth: salaryCalculation.workingDaysInfo.workingDays,
      requiredDays: salaryCalculation.requiredDays,
      daysPresent: salaryCalculation.daysPresent,
      hoursWorked: salaryCalculation.hoursWorked,
      expectedTotalHours: salaryCalculation.expectedTotalHours,
      avgHoursPerDay: salaryCalculation.avgHoursPerDay,
      avgHoursPerMonth: salaryCalculation.avgHoursPerMonth,
      dailyWage: salaryCalculation.dailyWage,
      baseSalary: salaryCalculation.baseSalary,
      attendancePercentage: salaryCalculation.attendancePercentage,
      hoursPercentage: salaryCalculation.hoursPercentage,
      salaryPercentage: salaryCalculation.salaryPercentage,
      calculatedSalary: salaryCalculation.calculatedSalary,
      adjustedSalary: salaryCalculation.adjustedSalary,
      
      // Enhanced fields from calendar service
      calculationMethod: salaryCalculation.calculationMethod,
      workingDaysInfo: salaryCalculation.workingDaysInfo,
      salaryBreakdown: salaryCalculation.salaryBreakdown
    };
  } catch (error) {
    console.error('Error calculating salary with calendar service, falling back:', error);
    // Fallback to original calculation logic
    const workingDaysInMonth = getWorkingDaysInMonth(monthYear);
    const requiredDays = Math.min(workingDaysInMonth, 26); // Max 26 working days as per requirement

    // Calculate daily wage from baseSalary
    const daysInMonth = new Date(new Date(monthYear + '-01').getFullYear(), new Date(monthYear + '-01').getMonth() + 1, 0).getDate();
    const dailyWage = (userConfig.baseSalary || baseSalary) / daysInMonth;

    // Calculate expected hours (8 hours per working day)
    const expectedHoursPerDay = 8;
    const expectedTotalHours = requiredDays * expectedHoursPerDay;

    // Calculate effective days present by dividing total hours by 8
    const effectiveDaysPresent = hoursWorked / 8;

    // Calculate salary based on effective days present (daily wage system)
    const calculatedSalary = Math.round(effectiveDaysPresent * dailyWage);

    // Calculate percentages
    const attendancePercentage = (effectiveDaysPresent / requiredDays) * 100;
    const hoursPercentage = (hoursWorked / expectedTotalHours) * 100;

    // Calculate daily and monthly hour averages
    const avgHoursPerDay = effectiveDaysPresent > 0 ? hoursWorked / effectiveDaysPresent : 0;
    const avgHoursPerMonth = hoursWorked;

    return {
      workingDaysInMonth,
      requiredDays,
      daysPresent: Math.round(effectiveDaysPresent * 100) / 100,
      hoursWorked: Math.round(hoursWorked * 100) / 100,
      expectedTotalHours,
      avgHoursPerDay: Math.round(avgHoursPerDay * 100) / 100,
      avgHoursPerMonth: Math.round(avgHoursPerMonth * 100) / 100,
      dailyWage,
      baseSalary,
      attendancePercentage: Math.round(attendancePercentage * 100) / 100,
      hoursPercentage: Math.round(hoursPercentage * 100) / 100,
      salaryPercentage: Math.round(attendancePercentage * 100) / 100,
      calculatedSalary: Math.max(0, calculatedSalary),
      adjustedSalary: Math.max(0, calculatedSalary),
      calculationMethod: 'daily_wage_fallback'
    };
  }
};

/**
 * Calculate salary based on hours worked with hourly wage (legacy function)
 * @param {number} hoursWorked - Total hours worked by employee
 * @param {number} daysPresent - Number of days employee was present
 * @param {string} monthYear - Format: "YYYY-MM"
 * @param {number} hourlyWage - Hourly wage rate (default: 32.25 which is 258/8)
 * @returns {Object} Salary calculation details
 */
export const calculateSalaryWithHourlyWage = (hoursWorked, daysPresent, monthYear, hourlyWage = 32.25) => {
  try {
    const workingDaysInMonth = getWorkingDaysInMonth(monthYear);
    const requiredDays = Math.min(workingDaysInMonth, 27); // Max 27 working days as per requirement

    // Calculate expected hours (8 hours per working day)
    const expectedHoursPerDay = 8;
    const expectedTotalHours = requiredDays * expectedHoursPerDay;

    // Calculate salary based on hours worked
    const calculatedSalary = Math.round(hoursWorked * hourlyWage);

    // Calculate percentages
    const attendancePercentage = (daysPresent / requiredDays) * 100;
    const hoursPercentage = (hoursWorked / expectedTotalHours) * 100;

    // Calculate daily and monthly hour averages
    const avgHoursPerDay = daysPresent > 0 ? hoursWorked / daysPresent : 0;
    const avgHoursPerMonth = hoursWorked;

    return {
      workingDaysInMonth,
      requiredDays,
      daysPresent,
      hoursWorked: Math.round(hoursWorked * 100) / 100,
      expectedTotalHours,
      avgHoursPerDay: Math.round(avgHoursPerDay * 100) / 100,
      avgHoursPerMonth: Math.round(avgHoursPerMonth * 100) / 100,
      hourlyWage,
      attendancePercentage: Math.round(attendancePercentage * 100) / 100,
      hoursPercentage: Math.round(hoursPercentage * 100) / 100,
      salaryPercentage: Math.round(hoursPercentage * 100) / 100, // Based on hours worked
      calculatedSalary: Math.max(0, calculatedSalary), // Ensure non-negative
      adjustedSalary: Math.max(0, calculatedSalary)
    };
  } catch (error) {
    console.error('Error calculating salary with hourly wage:', error);
    // Fallback calculation
    const requiredDays = 27;
    const expectedTotalHours = requiredDays * 8;
    const calculatedSalary = Math.round(hoursWorked * hourlyWage);
    const avgHoursPerDay = daysPresent > 0 ? hoursWorked / daysPresent : 0;

    return {
      workingDaysInMonth: 27,
      requiredDays,
      daysPresent,
      hoursWorked: Math.round(hoursWorked * 100) / 100,
      expectedTotalHours,
      avgHoursPerDay: Math.round(avgHoursPerDay * 100) / 100,
      avgHoursPerMonth: Math.round(hoursWorked * 100) / 100,
      hourlyWage,
      attendancePercentage: (daysPresent / requiredDays) * 100,
      hoursPercentage: (hoursWorked / expectedTotalHours) * 100,
      salaryPercentage: (hoursWorked / expectedTotalHours) * 100,
      calculatedSalary: Math.max(0, calculatedSalary),
      adjustedSalary: Math.max(0, calculatedSalary)
    };
  }
};

/**
 * Calculate salary based on working days attendance (legacy function for backward compatibility)
 * @param {number} daysPresent - Number of days employee was present
 * @param {string} monthYear - Format: "YYYY-MM"
 * @param {number} baseSalary - Base monthly salary (default: 8000)
 * @returns {Object} Salary calculation details
 */
export const calculateSalaryWithWorkingDays = (daysPresent, monthYear, baseSalary = 8000) => {
  try {
    const workingDaysInMonth = getWorkingDaysInMonth(monthYear);
    const requiredDays = Math.min(workingDaysInMonth, 27); // Max 27 working days as per requirement

    // Calculate salary percentage based on attendance
    const attendancePercentage = (daysPresent / requiredDays) * 100;
    const salaryPercentage = Math.min(attendancePercentage, 100); // Cap at 100%

    // Calculate actual salary
    const calculatedSalary = Math.round((daysPresent / requiredDays) * baseSalary);

    return {
      workingDaysInMonth,
      requiredDays,
      daysPresent,
      attendancePercentage: Math.round(attendancePercentage * 100) / 100,
      salaryPercentage: Math.round(salaryPercentage * 100) / 100,
      baseSalary,
      calculatedSalary: Math.max(0, calculatedSalary), // Ensure non-negative
      adjustedSalary: Math.max(0, calculatedSalary)
    };
  } catch (error) {
    console.error('Error calculating salary with working days:', error);
    // Fallback calculation
    const requiredDays = 27;
    const calculatedSalary = Math.round((daysPresent / requiredDays) * baseSalary);
    return {
      workingDaysInMonth: 27,
      requiredDays,
      daysPresent,
      attendancePercentage: (daysPresent / requiredDays) * 100,
      salaryPercentage: Math.min((daysPresent / requiredDays) * 100, 100),
      baseSalary,
      calculatedSalary: Math.max(0, calculatedSalary),
      adjustedSalary: Math.max(0, calculatedSalary)
    };
  }
};

/**
 * Get month statistics including working days, holidays, and Sundays - Enhanced with calendar service
 * @param {string} monthYear - Format: "YYYY-MM"
 * @returns {Object} Month statistics
 */
export const getMonthStatistics = (monthYear) => {
  try {
    // Use calendar service for enhanced statistics
    // Set excludeSaturdays to false to include Saturdays as working days (only exclude Sundays)
    const workingDaysInfo = calendarService.getWorkingDaysInMonth(monthYear, false);
    
    return {
      monthYear,
      totalDays: workingDaysInfo.totalDays,
      workingDays: workingDaysInfo.workingDays,
      requiredWorkingDays: workingDaysInfo.requiredWorkingDays,
      sundays: workingDaysInfo.sundayCount,
      saturdays: workingDaysInfo.saturdayCount,
      weekends: workingDaysInfo.weekends,
      holidays: workingDaysInfo.holidays,
      holidayCount: workingDaysInfo.holidayCount,
      sundayDates: workingDaysInfo.getSundaysInMonth ? workingDaysInfo.getSundaysInMonth(monthYear) : [],
      workingDaysList: workingDaysInfo.workingDaysList,
      nonWorkingDays: workingDaysInfo.nonWorkingDays,
      calculation: workingDaysInfo.calculation
    };
  } catch (error) {
    console.error('Error getting enhanced month statistics, falling back:', error);
    // Fallback to original logic
    const startOfMonth = moment(monthYear, 'YYYY-MM').startOf('month');
    const endOfMonth = moment(monthYear, 'YYYY-MM').endOf('month');
    const totalDays = endOfMonth.date();
    const workingDays = getWorkingDaysInMonth(monthYear);
    const sundays = getSundaysInMonth(monthYear);
    
    return {
      monthYear,
      totalDays,
      workingDays,
      sundays: sundays.length,
      sundayDates: sundays,
      requiredWorkingDays: Math.min(workingDays, 26),
      holidays: [],
      holidayCount: 0
    };
  }
};

/**
 * Validate attendance data against working days
 * @param {Array} attendanceDetails - Array of attendance records
 * @param {string} monthYear - Format: "YYYY-MM"
 * @returns {Object} Validation results
 */
export const validateAttendanceAgainstWorkingDays = (attendanceDetails, monthYear) => {
  try {
    const sundays = getSundaysInMonth(monthYear);
    const sundaySet = new Set(sundays);
    
    let validWorkingDays = 0;
    let sundayAttendance = 0;
    let warnings = [];
    
    attendanceDetails.forEach(record => {
      if (sundaySet.has(record.date)) {
        if (record.status === 'Present' || record.status === 'Half Day') {
          sundayAttendance++;
          warnings.push(`Attendance marked on Sunday: ${record.date}`);
        }
      } else {
        if (record.status === 'Present' || record.status === 'Half Day') {
          validWorkingDays++;
        }
      }
    });
    
    return {
      validWorkingDays,
      sundayAttendance,
      warnings,
      totalAttendanceRecords: attendanceDetails.length
    };
  } catch (error) {
    console.error('Error validating attendance:', error);
    return {
      validWorkingDays: 0,
      sundayAttendance: 0,
      warnings: ['Error validating attendance data'],
      totalAttendanceRecords: attendanceDetails.length
    };
  }
};
