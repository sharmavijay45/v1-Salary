// Test script to verify PDF processing improvements
import { processManualAttendance } from './server/utils/attendanceProcessor.js';

async function testPDFImprovements() {
  console.log('Testing PDF processing improvements...');

  try {
    // Test with a sample PDF file path
    const testPdfPath = './server/sample_attendance.xlsx'; // This will test the PDF processing logic

    console.log('Testing PDF processing with improved prompts...');
    const pdfData = await processManualAttendance(testPdfPath);

    console.log('PDF processing completed');
    console.log('Result:', pdfData);

    if (pdfData && pdfData.employees) {
      console.log(`Found ${pdfData.employees.length} employees in PDF`);
      pdfData.employees.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.name}: ${emp.presentDays || 0} present days`);
      });
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testPDFImprovements();