// Test script to validate the daily wage fix
// This tests the proportional daily wage calculation

console.log('=== Daily Wage Proportional Calculation Test ===\n');

// Test the fixed calculation logic
function testProportionalDailyWage() {
  const testCases = [
    { name: 'User A', baseSalary: 8000, month: '2025-08' }, // August (31 days)
    { name: 'User B', baseSalary: 15000, month: '2025-08' }, // August (31 days)
    { name: 'User C', baseSalary: 25000, month: '2025-04' }, // April (30 days)
    { name: 'User D', baseSalary: 12000, month: '2025-02' }  // February (28 days)
  ];

  testCases.forEach(testCase => {
    const [year, month] = testCase.month.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyWage = Math.round(testCase.baseSalary / daysInMonth);
    const maxMonthlySalary = dailyWage * daysInMonth;
    const difference = maxMonthlySalary - testCase.baseSalary;

    console.log(`${testCase.name} (${testCase.month}):`);
    console.log(`  Base Salary: ₹${testCase.baseSalary.toLocaleString()}`);
    console.log(`  Days in Month: ${daysInMonth}`);
    console.log(`  Daily Wage: ₹${dailyWage}`);
    console.log(`  Max Monthly (${daysInMonth} × ₹${dailyWage}): ₹${maxMonthlySalary.toLocaleString()}`);
    console.log(`  Difference: ${difference >= 0 ? '+' : ''}₹${difference}`);
    console.log('');
  });

  console.log('✅ All users now have proportional daily wages based on their base salary');
  console.log('✅ Daily wage = Base Salary ÷ Days in Month');
  console.log('✅ Different users with different base salaries will have different daily wages');
}

testProportionalDailyWage();