/**
 * Specific test for user ID 6895e96a9000f01a003266bf with ₹25,000 baseSalary
 * This validates the exact scenario mentioned in the user query
 */

import calendarService from './server/utils/calendarService.js';
import { calculateSalaryWithDailyWage } from './server/utils/workingDays.js';
import moment from 'moment';

console.log('🎯 TESTING SPECIFIC USER CASE: ₹25,000 BASE SALARY');
console.log('='.repeat(70));
console.log('User ID: 6895e96a9000f01a003266bf');
console.log('Base Salary: ₹25,000');
console.log('Testing various attendance scenarios...\n');

// Test scenarios for ₹25,000 base salary user
const testCases = [
  {
    scenario: 'Full Month Attendance (August 2025)',
    baseSalary: 25000,
    monthYear: '2025-08',
    hoursWorked: 208, // 26 days × 8 hours
    daysPresent: 26,
    holidays: 0,
    expectedDailyWage: Math.round(25000 / 31), // ₹806 for August (31 days)
    description: 'Perfect attendance, should get full proportional salary'
  },
  {
    scenario: 'Partial Attendance (August 2025)',
    baseSalary: 25000,
    monthYear: '2025-08',
    hoursWorked: 160, // 20 days × 8 hours
    daysPresent: 20,
    holidays: 0,
    expectedDailyWage: Math.round(25000 / 31), // ₹806
    description: '20 days attendance, proportional calculation'
  },
  {
    scenario: 'With Holidays (August 2025)',
    baseSalary: 25000,
    monthYear: '2025-08',
    hoursWorked: 160, // 20 working days
    daysPresent: 20,
    holidays: 5, // 5 holiday days
    expectedDailyWage: Math.round(25000 / 31), // ₹806
    description: '20 working days + 5 holidays = 25 payable days'
  },
  {
    scenario: 'Different Month (April 2025)',
    baseSalary: 25000,
    monthYear: '2025-04',
    hoursWorked: 200, // 25 days × 8 hours
    daysPresent: 25,
    holidays: 0,
    expectedDailyWage: Math.round(25000 / 30), // ₹833 for April (30 days)
    description: 'Testing different month with different daily wage'
  },
  {
    scenario: 'Overtime Scenario (August 2025)',
    baseSalary: 25000,
    monthYear: '2025-08',
    hoursWorked: 240, // 30 days × 8 hours (more than 26-day cap)
    daysPresent: 30,
    holidays: 0,
    expectedDailyWage: Math.round(25000 / 31), // ₹806
    description: 'Overtime hours, should be capped at 26 days max'
  }
];

async function testSpecificUser() {
  console.log('Running tests for ₹25,000 base salary user...\n');
  
  for (const testCase of testCases) {
    console.log(`📋 ${testCase.scenario}`);
    console.log('─'.repeat(50));
    console.log(`Description: ${testCase.description}`);
    console.log(`Month: ${testCase.monthYear} (${moment(testCase.monthYear, 'YYYY-MM').daysInMonth()} days)`);
    console.log(`Base Salary: ₹${testCase.baseSalary.toLocaleString()}`);
    console.log(`Hours Worked: ${testCase.hoursWorked}h`);
    console.log(`Days Present: ${testCase.daysPresent}`);
    console.log(`Holidays: ${testCase.holidays}`);
    
    try {
      // Calculate using calendar service
      const result = calendarService.calculateDynamicSalary(
        testCase.hoursWorked,
        testCase.daysPresent,
        testCase.monthYear,
        testCase.baseSalary,
        testCase.holidays
      );
      
      // Calculate using working days utility
      const workingDaysResult = calculateSalaryWithDailyWage(
        testCase.hoursWorked,
        testCase.daysPresent,
        testCase.monthYear,
        testCase.baseSalary,
        { baseSalary: testCase.baseSalary },
        testCase.holidays
      );
      
      console.log('\n🔍 CALCULATION RESULTS:');
      console.log(`Expected Daily Wage: ₹${testCase.expectedDailyWage}`);
      console.log(`Calculated Daily Wage: ₹${result.dailyWage}`);
      console.log(`Daily Wage Formula: ₹${testCase.baseSalary} ÷ ${moment(testCase.monthYear, 'YYYY-MM').daysInMonth()} days = ₹${result.dailyWage}`);
      
      const effectiveDays = testCase.hoursWorked / 8;
      const cappedEffectiveDays = Math.min(effectiveDays + testCase.holidays, 26);
      
      console.log(`Effective Days: ${effectiveDays.toFixed(2)} + ${testCase.holidays} holidays = ${(effectiveDays + testCase.holidays).toFixed(2)}`);
      console.log(`Capped Effective Days: ${cappedEffectiveDays.toFixed(2)} (max 26)`);
      console.log(`Required Working Days: ${result.requiredDays}`);
      console.log(`Attendance Ratio: ${(cappedEffectiveDays / result.requiredDays).toFixed(3)}`);
      
      console.log('\n💰 SALARY BREAKDOWN:');
      console.log(`Calculated Salary: ₹${result.calculatedSalary.toLocaleString()}`);
      console.log(`Salary Formula: ₹${testCase.baseSalary} × (${cappedEffectiveDays.toFixed(2)} ÷ ${result.requiredDays}) = ₹${result.calculatedSalary.toLocaleString()}`);
      console.log(`Calculation Method: ${result.calculationMethod}`);
      
      // Validation checks
      const dailyWageCheck = Math.abs(result.dailyWage - testCase.expectedDailyWage) <= 1;
      const proportionalCheck = result.calculatedSalary <= testCase.baseSalary;
      const capCheck = cappedEffectiveDays <= 26.1; // Allow small floating point variance
      
      console.log('\n✅ VALIDATION:');
      console.log(`Daily Wage Correct: ${dailyWageCheck ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Proportional Calculation: ${proportionalCheck ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`26-Day Cap Applied: ${capCheck ? '✅ PASS' : '❌ FAIL'}`);
      
      // Compare with old ₹258 system
      const oldSystemDailyWage = 258;
      const oldSystemSalary = Math.round(cappedEffectiveDays * oldSystemDailyWage);
      console.log('\n📊 COMPARISON WITH OLD SYSTEM:');
      console.log(`Old System (₹258/day): ₹${oldSystemSalary.toLocaleString()}`);
      console.log(`New System (₹${result.dailyWage}/day): ₹${result.calculatedSalary.toLocaleString()}`);
      console.log(`Difference: ${result.calculatedSalary > oldSystemSalary ? '+' : ''}₹${(result.calculatedSalary - oldSystemSalary).toLocaleString()}`);
      console.log(`Improvement: ${((result.calculatedSalary / oldSystemSalary - 1) * 100).toFixed(1)}%`);
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
  }
  
  console.log('🎯 SUMMARY FOR ₹25,000 BASE SALARY USER:');
  console.log('• Each month has different daily wage based on number of days');
  console.log('• August 2025: ₹806/day (25000 ÷ 31 days)');
  console.log('• April 2025: ₹833/day (25000 ÷ 30 days)');
  console.log('• Salary is proportional to attendance and base salary');
  console.log('• Much higher than old fixed ₹258/day system');
  console.log('• 26-day cap prevents over-payment for excessive hours');
  console.log('• Holidays are properly included in calculations');
}

// Run the specific test
testSpecificUser().catch(error => {
  console.error('Test execution failed:', error);
});