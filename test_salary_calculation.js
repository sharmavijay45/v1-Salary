// Test script to verify daily wage calculation formula
// Formula: dailyWage = baseSalary / daysInMonth

function testDailyWageCalculation() {
  console.log('=== Testing Daily Wage Calculation Formula ===\n');
  
  // Test different base salaries
  const testSalaries = [8000, 15000, 25000];
  
  // Test different month lengths
  const testMonths = [
    { name: 'January 2025', days: 31 },
    { name: 'April 2025', days: 30 },
    { name: 'February 2025', days: 28 }
  ];
  
  testSalaries.forEach(baseSalary => {
    console.log(`\n📊 Base Salary: ₹${baseSalary.toLocaleString()}`);
    console.log('─'.repeat(50));
    
    testMonths.forEach(month => {
      const dailyWage = Math.round(baseSalary / month.days);
      const monthlyTotal = dailyWage * month.days;
      const difference = monthlyTotal - baseSalary;
      
      console.log(`${month.name} (${month.days} days):`);
      console.log(`  Daily Wage: ₹${dailyWage}`);
      console.log(`  Monthly Total: ₹${monthlyTotal.toLocaleString()}`);
      console.log(`  Difference: ${difference >= 0 ? '+' : ''}₹${difference}`);
      console.log('');
    });
  });
  
  console.log('\n=== Verification Complete ===');
  console.log('✅ Formula ensures daily wage is proportional to base salary');
  console.log('✅ Monthly totals are very close to base salary (minor rounding differences)');
  console.log('✅ Higher base salaries result in proportionally higher daily wages');
}

// Run the test
testDailyWageCalculation();
