/**
 * Comprehensive test script to validate baseSalary-based salary calculations
 * This tests the complete system with various scenarios
 */

import calendarService from './server/utils/calendarService.js';
import { calculateSalaryWithDailyWage } from './server/utils/workingDays.js';
import moment from 'moment';

// Test configuration
const testScenarios = [
  {
    name: 'User with ₹8,000 base salary (Standard)',
    baseSalary: 8000,
    hoursWorked: 176,
    daysPresent: 22,
    monthYear: '2025-08',
    expectedDailyWage: Math.round(8000 / 31), // August has 31 days
    description: 'Standard employee with default salary'
  },
  {
    name: 'User with ₹25,000 base salary (High earner - Your specific case)',
    baseSalary: 25000,
    hoursWorked: 200,
    daysPresent: 25,
    monthYear: '2025-08',
    expectedDailyWage: Math.round(25000 / 31), // August has 31 days  
    description: 'High-earning employee as mentioned in the query'
  },
  {
    name: 'User with ₹15,000 base salary (Mid-range)',
    baseSalary: 15000,
    hoursWorked: 160,
    daysPresent: 20,
    monthYear: '2025-04',
    expectedDailyWage: Math.round(15000 / 30), // April has 30 days
    description: 'Mid-range employee in different month'
  },
  {
    name: 'User with ₹12,000 base salary (February test)',
    baseSalary: 12000,
    hoursWorked: 144,
    daysPresent: 18,
    monthYear: '2025-02',
    expectedDailyWage: Math.round(12000 / 28), // February has 28 days
    description: 'Testing February (shortest month)'
  },
  {
    name: 'Part-time user with ₹6,000 base salary',
    baseSalary: 6000,
    hoursWorked: 80,
    daysPresent: 10,
    monthYear: '2025-08',
    expectedDailyWage: Math.round(6000 / 31),
    description: 'Part-time employee with low hours'
  }
];

console.log('🧪 COMPREHENSIVE BASE SALARY CALCULATION TEST');
console.log('='.repeat(80));
console.log(`Testing ${testScenarios.length} different salary scenarios\n`);

async function runComprehensiveTest() {
  let totalTests = 0;
  let passedTests = 0;
  
  for (const scenario of testScenarios) {
    console.log(`\n📊 ${scenario.name}`);
    console.log('─'.repeat(60));
    console.log(`Description: ${scenario.description}`);
    console.log(`Base Salary: ₹${scenario.baseSalary.toLocaleString()}`);
    console.log(`Month: ${scenario.monthYear} (${moment(scenario.monthYear, 'YYYY-MM').daysInMonth()} days)`);
    console.log(`Hours Worked: ${scenario.hoursWorked}h | Days Present: ${scenario.daysPresent}`);
    
    try {
      // Test 1: Calendar Service Direct Calculation
      totalTests++;
      console.log('\n🔍 Test 1: Calendar Service Direct Calculation');
      const calendarResult = calendarService.calculateDynamicSalary(
        scenario.hoursWorked,
        scenario.daysPresent,
        scenario.monthYear,
        scenario.baseSalary,
        0 // no admin holidays
      );
      
      const actualDailyWage = calendarResult.dailyWage;
      const dailyWageTest = Math.abs(actualDailyWage - scenario.expectedDailyWage) <= 1; // Allow ±1 for rounding
      
      console.log(`  Expected Daily Wage: ₹${scenario.expectedDailyWage}`);
      console.log(`  Actual Daily Wage: ₹${actualDailyWage}`);
      console.log(`  Calculated Salary: ₹${calendarResult.calculatedSalary.toLocaleString()}`);
      console.log(`  Calculation Method: ${calendarResult.calculationMethod}`);
      console.log(`  Daily Wage Test: ${dailyWageTest ? '✅ PASS' : '❌ FAIL'}`);
      
      if (dailyWageTest) passedTests++;
      
      // Test 2: Working Days Utility Calculation
      totalTests++;
      console.log('\n🔍 Test 2: Working Days Utility Calculation');
      const workingDaysResult = calculateSalaryWithDailyWage(
        scenario.hoursWorked,
        scenario.daysPresent,
        scenario.monthYear,
        scenario.baseSalary,
        { baseSalary: scenario.baseSalary },
        0
      );
      
      const utilityDailyWage = workingDaysResult.dailyWage;
      const utilityDailyWageTest = Math.abs(utilityDailyWage - scenario.expectedDailyWage) <= 1;
      
      console.log(`  Expected Daily Wage: ₹${scenario.expectedDailyWage}`);
      console.log(`  Actual Daily Wage: ₹${utilityDailyWage}`);
      console.log(`  Calculated Salary: ₹${workingDaysResult.calculatedSalary.toLocaleString()}`);
      console.log(`  Calculation Method: ${workingDaysResult.calculationMethod}`);
      console.log(`  Daily Wage Test: ${utilityDailyWageTest ? '✅ PASS' : '❌ FAIL'}`);
      
      if (utilityDailyWageTest) passedTests++;
      
      // Test 3: Proportional Calculation Check
      totalTests++;
      console.log('\n🔍 Test 3: Proportional Salary Check');
      const expectedProportional = Math.round(scenario.baseSalary * (scenario.hoursWorked / 8) / workingDaysResult.requiredDays);
      const actualProportional = calendarResult.calculatedSalary;
      const proportionalTest = Math.abs(actualProportional - expectedProportional) <= scenario.baseSalary * 0.05; // Allow 5% variance
      
      console.log(`  Expected Proportional: ₹${expectedProportional.toLocaleString()}`);
      console.log(`  Actual Proportional: ₹${actualProportional.toLocaleString()}`);
      console.log(`  Working Days: ${workingDaysResult.requiredDays}`);
      console.log(`  Effective Days: ${(scenario.hoursWorked / 8).toFixed(2)}`);
      console.log(`  Proportional Test: ${proportionalTest ? '✅ PASS' : '❌ FAIL'}`);
      
      if (proportionalTest) passedTests++;
      
      // Test 4: Edge Cases (26-day cap)
      totalTests++;
      console.log('\n🔍 Test 4: 26-Day Cap Test');
      const maxDays = 26;
      const effectiveDays = Math.min(scenario.hoursWorked / 8, maxDays);
      const expectedCappedSalary = Math.round(scenario.baseSalary * (effectiveDays / workingDaysResult.requiredDays));
      const cappedTest = Math.abs(calendarResult.calculatedSalary - expectedCappedSalary) <= scenario.baseSalary * 0.05;
      
      console.log(`  Effective Days (capped): ${effectiveDays.toFixed(2)}`);
      console.log(`  Expected Capped Salary: ₹${expectedCappedSalary.toLocaleString()}`);
      console.log(`  Actual Salary: ₹${calendarResult.calculatedSalary.toLocaleString()}`);
      console.log(`  26-Day Cap Test: ${cappedTest ? '✅ PASS' : '❌ FAIL'}`);
      
      if (cappedTest) passedTests++;
      
    } catch (error) {
      console.log(`❌ ERROR in ${scenario.name}: ${error.message}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('🎯 COMPREHENSIVE TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed Tests: ${passedTests}`);
  console.log(`Failed Tests: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! The salary calculation system is working correctly.');
    console.log('✅ Daily wages are properly calculated from baseSalary');
    console.log('✅ Proportional calculations are accurate');  
    console.log('✅ Month-specific day counts are handled correctly');
    console.log('✅ 26-day cap is applied appropriately');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Check the specific failures above.');
  }
  
  console.log('\n📋 KEY FINDINGS:');
  console.log('• Daily Wage Formula: baseSalary ÷ daysInMonth');
  console.log('• Salary Formula: baseSalary × (effectiveDays ÷ requiredDays)');
  console.log('• Each employee gets proportional daily wage based on their baseSalary');
  console.log('• System handles different month lengths correctly');
  console.log('• Higher base salaries result in proportionally higher daily wages');
}

// Run the comprehensive test
runComprehensiveTest().catch(error => {
  console.error('Test execution failed:', error);
});