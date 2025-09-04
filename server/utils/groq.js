import axios from 'axios';

export const getGrokInsights = async (data) => {
  try {
    // Prepare attendance summary for AI analysis
    const summary = data.map(emp => ({
      name: emp.name,
      department: emp.dept,
      daysPresent: emp.daysPresent,
      hoursWorked: emp.hoursWorked,
      attendancePercentage: ((emp.daysPresent / emp.totalWorkingDays) * 100).toFixed(1),
      salaryPercentage: emp.salaryPercentage,
      baseSalary: emp.baseSalary,
      adjustedSalary: emp.adjustedSalary
    }));

    // Calculate department-wise statistics
    const deptStats = summary.reduce((acc, emp) => {
      if (!acc[emp.department]) {
        acc[emp.department] = { count: 0, totalDays: 0, totalHours: 0 };
      }
      acc[emp.department].count++;
      acc[emp.department].totalDays += emp.daysPresent;
      acc[emp.department].totalHours += emp.hoursWorked;
      return acc;
    }, {});

    // Create more detailed analysis data
    const overallStats = {
      totalEmployees: summary.length,
      avgAttendanceRate: (summary.reduce((sum, emp) => sum + parseFloat(emp.attendancePercentage), 0) / summary.length).toFixed(1),
      avgHoursWorked: (summary.reduce((sum, emp) => sum + emp.hoursWorked, 0) / summary.length).toFixed(1),
      totalSalaryDisbursement: summary.reduce((sum, emp) => sum + emp.adjustedSalary, 0),
      excellentPerformers: summary.filter(emp => parseFloat(emp.attendancePercentage) >= 90).length,
      goodPerformers: summary.filter(emp => parseFloat(emp.attendancePercentage) >= 75 && parseFloat(emp.attendancePercentage) < 90).length,
      averagePerformers: summary.filter(emp => parseFloat(emp.attendancePercentage) >= 60 && parseFloat(emp.attendancePercentage) < 75).length,
      concerningPerformers: summary.filter(emp => parseFloat(emp.attendancePercentage) < 60).length
    };

    const prompt = `As a Senior HR Analytics Expert, provide a comprehensive analysis of this employee attendance and salary data for management decision-making:

📊 OVERALL STATISTICS:
- Total Employees: ${overallStats.totalEmployees}
- Average Attendance Rate: ${overallStats.avgAttendanceRate}%
- Average Hours Worked: ${overallStats.avgHoursWorked} hours
- Total Salary Disbursement: ₹${overallStats.totalSalaryDisbursement.toLocaleString()}

👥 PERFORMANCE DISTRIBUTION:
- Excellent (90%+): ${overallStats.excellentPerformers} employees
- Good (75-89%): ${overallStats.goodPerformers} employees
- Average (60-74%): ${overallStats.averagePerformers} employees
- Concerning (<60%): ${overallStats.concerningPerformers} employees

🏢 DEPARTMENT BREAKDOWN:
${Object.entries(deptStats).map(([dept, stats]) =>
  `- ${dept}: ${stats.count} employees, Avg Days: ${(stats.totalDays/stats.count).toFixed(1)}, Avg Hours: ${(stats.totalHours/stats.count).toFixed(1)}`
).join('\n')}

📋 DETAILED EMPLOYEE DATA:
${summary.map(emp =>
  `${emp.name} (${emp.department}): ${emp.attendancePercentage}% attendance, ${emp.hoursWorked}h worked, ₹${emp.adjustedSalary} salary`
).join('\n')}

🎯 ANALYSIS REQUIREMENTS:
1. **Performance Insights**: Identify top performers, concerning patterns, and attendance trends
2. **Department Comparison**: Analyze which departments are performing best/worst and why
3. **Financial Impact**: Calculate cost of absenteeism and productivity losses
4. **Risk Assessment**: Flag employees needing immediate attention or intervention
5. **Actionable Recommendations**: Provide specific, implementable strategies to improve attendance
6. **Predictive Insights**: Identify potential future issues based on current patterns
7. **Recognition Opportunities**: Suggest employees deserving recognition or rewards

Please provide a detailed, professional analysis with specific metrics, actionable recommendations, and strategic insights for HR management and leadership decision-making.`;

    const response = await axios.post(
      `${process.env.GROQ_API_URL}/v1/chat/completions`,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a Senior HR Analytics Expert and Workforce Management Consultant with 15+ years of experience in employee performance analysis, attendance optimization, and strategic HR decision-making. You specialize in data-driven insights that help organizations improve productivity, reduce costs, and enhance employee engagement. Provide comprehensive, actionable analysis with specific metrics and strategic recommendations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.2,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    const aiInsights = response.data.choices[0]?.message?.content;
    if (aiInsights) {
      return `🤖 **AI-POWERED ATTENDANCE ANALYSIS**\n\n${aiInsights}`;
    }
    return 'No insights available from AI analysis';
  } catch (err) {
    console.error('Groq API error:', err.response?.data || err.message);

    // Enhanced fallback analysis if API fails
    const totalEmployees = data.length;
    const avgAttendance = data.reduce((sum, emp) => sum + emp.daysPresent, 0) / totalEmployees;
    const avgHours = data.reduce((sum, emp) => sum + emp.hoursWorked, 0) / totalEmployees;
    const totalSalary = data.reduce((sum, emp) => sum + emp.adjustedSalary, 0);
    const avgAttendanceRate = ((avgAttendance / 26) * 100);

    const excellentAttendance = data.filter(emp => (emp.daysPresent / emp.totalWorkingDays) >= 0.9).length;
    const goodAttendance = data.filter(emp => {
      const rate = emp.daysPresent / emp.totalWorkingDays;
      return rate >= 0.75 && rate < 0.9;
    }).length;
    const averageAttendance = data.filter(emp => {
      const rate = emp.daysPresent / emp.totalWorkingDays;
      return rate >= 0.6 && rate < 0.75;
    }).length;
    const poorAttendance = data.filter(emp => (emp.daysPresent / emp.totalWorkingDays) < 0.6).length;

    // Department analysis
    const deptAnalysis = data.reduce((acc, emp) => {
      if (!acc[emp.dept]) {
        acc[emp.dept] = { count: 0, totalDays: 0, totalSalary: 0 };
      }
      acc[emp.dept].count++;
      acc[emp.dept].totalDays += emp.daysPresent;
      acc[emp.dept].totalSalary += emp.adjustedSalary;
      return acc;
    }, {});

    let deptSummary = '';
    Object.entries(deptAnalysis).forEach(([dept, stats]) => {
      const avgDept = (stats.totalDays / stats.count).toFixed(1);
      deptSummary += `• ${dept}: ${stats.count} employees, avg ${avgDept} days\n`;
    });

    return `📊 ATTENDANCE ANALYSIS SUMMARY

🔢 OVERALL STATISTICS:
• Total Employees: ${totalEmployees}
• Average Attendance: ${avgAttendance.toFixed(1)} days
• Average Hours Worked: ${avgHours.toFixed(1)} hours
• Total Salary Disbursement: ₹${totalSalary.toLocaleString()}
• Overall Attendance Rate: ${((avgAttendance / 26) * 100).toFixed(1)}%

👥 PERFORMANCE DISTRIBUTION:
• Excellent (90%+): ${excellentAttendance} employees
• Good (75-89%): ${goodAttendance} employees
• Concerning (<60%): ${poorAttendance} employees

🏢 DEPARTMENT BREAKDOWN:
${deptSummary}

⚠️ KEY INSIGHTS:
${poorAttendance > 0 ? `• ${poorAttendance} employees need immediate attention for low attendance` : '• All employees maintaining acceptable attendance levels'}
${excellentAttendance > totalEmployees * 0.5 ? '• Strong overall attendance culture' : '• Room for improvement in attendance culture'}

📝 Note: Enhanced AI insights temporarily unavailable. This is a comprehensive statistical analysis.`;
  }
};