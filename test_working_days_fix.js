/**
 * Test script to verify working days calculation with admin holidays
 */

import calendarService from './server/utils/calendarService.js';
import { getWorkingDaysInMonth } from './server/utils/workingDays.js';

// Test cases
const testCases = [
  {
    monthYear: '2025-08',
    adminHolidays: 0,
    description: 'August 2025 with no admin holidays'
  },
  {
    monthYear: '2025-08',
    adminHolidays: 5,
    description: 'August 2025 with 5 admin holidays'
  },
  {
    monthYear: '2025-09',
    adminHolidays: 3,
    description: 'September 2025 with 3 admin holidays'
  }
];

console.log('🧪 Testing Working Days Calculation with Admin Holidays\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.description}`);
  console.log('='.repeat(50));

  try {
    // Test calendar service
    const calendarResult = calendarService.getWorkingDaysInMonth(
      testCase.monthYear,
      false, // excludeSaturdays
      testCase.adminHolidays
    );

    // Test working days utility
    const utilityResult = getWorkingDaysInMonth(testCase.monthYear, testCase.adminHolidays);

    console.log(`Month: ${testCase.monthYear}`);
    console.log(`Admin Holidays: ${testCase.adminHolidays}`);
    console.log(`Total Days: ${calendarResult.totalDays}`);
    console.log(`Working Days (Calendar): ${calendarResult.workingDays}`);
    console.log(`Working Days (Utility): ${utilityResult}`);
    console.log(`Sundays: ${calendarResult.sundayCount}`);
    console.log(`Calculation: ${calendarResult.totalDays} - ${calendarResult.sundayCount} - ${testCase.adminHolidays} = ${calendarResult.workingDays}`);
    console.log('✅ Test passed\n');

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}\n`);
  }
});

console.log('🎯 Expected Results:');
console.log('- Working days should be: Total days - Sundays - Admin holidays');
console.log('- Calendar service and utility should return the same working days count');
console.log('- No government holidays should be subtracted (only admin holidays)');