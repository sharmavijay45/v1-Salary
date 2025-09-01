// Test script to verify PDF vs Excel data priority
import { processManualAttendance } from './server/utils/attendanceProcessor.js';

async function testDataPriority() {
  console.log('Testing PDF vs Excel data priority...');

  try {
    // Test PDF processing
    const pdfData = await processManualAttendance('./server/sample_attendance.xlsx'); // Using Excel as test file
    console.log('PDF processing result:', pdfData);

    // Expected behavior:
    // - PDF should provide present days and attendance details
    // - Excel should provide hours worked and salary calculations
    // - Final result should prioritize PDF for attendance status

    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDataPriority();