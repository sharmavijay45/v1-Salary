// Test script for PDF attendance processing
import { processManualAttendance } from './server/utils/attendanceProcessor.js';
import fs from 'fs';
import path from 'path';

async function testPDFProcessing() {
  try {
    console.log('Testing PDF attendance processing...');

    // Check if test PDF exists
    const testPdfPath = './test_attendance.pdf'; // You'll need to place a test PDF here

    if (!fs.existsSync(testPdfPath)) {
      console.log('Test PDF not found. Creating sample test data...');

      // Create sample attendance data that matches your PDF format
      const sampleData = {
        month: "AUGUST 2025",
        employees: [
          {
            name: "YASEEN",
            attendance: {
              "1": "PRESENT",
              "2": "PRESENT",
              "3": "PRESENT",
              "4": "PRESENT",
              "5": "PRESENT",
              "6": "PRESENT",
              "7": "PRESENT",
              "8": "HDPRESENT",
              "9": "PRESENT",
              "10": "PRESENT",
              "11": "PRESENT",
              "12": "PRESENT",
              "13": "HDPRESENT",
              "14": "PRESENT",
              "15": "EWFHPRESENT",
              "16": "PRESENT",
              "17": "PRESENT",
              "18": "PRESENT",
              "19": "PRESENT",
              "20": "PRESENT",
              "21": "PRESENT",
              "22": "PRESENT",
              "23": "PRESENT",
              "24": "PRESENT",
              "25": "PRESENT",
              "26": "PRESENT",
              "27": "PRESENT",
              "28": "PRESENT",
              "29": "PRESENT",
              "30": "PRESENT",
              "31": "PRESENT"
            }
          },
          {
            name: "ABHISHEK",
            attendance: {
              "1": "PRESENT",
              "2": "PRESENT",
              "3": "PRESENT",
              "4": "ABPRESENT",
              "5": "PRESENT",
              "6": "PRESENT",
              "7": "PRESENT",
              "8": "HDPRESENT",
              "9": "PRESENT",
              "10": "PRESENT",
              "11": "PRESENT",
              "12": "PRESENT",
              "13": "HDPRESENT",
              "14": "PRESENT",
              "15": "WFHEWFH",
              "16": "ABPRESENT",
              "17": "PRESENT",
              "18": "PRESENT",
              "19": "PRESENT",
              "20": "PRESENT",
              "21": "PRESENT",
              "22": "PRESENT",
              "23": "PRESENT",
              "24": "PRESENT",
              "25": "PRESENT",
              "26": "PRESENT",
              "27": "PRESENT",
              "28": "PRESENT",
              "29": "PRESENT",
              "30": "PRESENT",
              "31": "PRESENT"
            }
          }
        ]
      };

      console.log('Sample PDF data structure:');
      console.log(JSON.stringify(sampleData, null, 2));

      console.log('\nExpected processing results:');
      console.log('- YASEEN: 31 present days (all days present)');
      console.log('- ABHISHEK: 29 present days (2 absent days)');

      return;
    }

    // Test actual PDF processing
    console.log('Processing test PDF file...');
    const results = await processManualAttendance(testPdfPath);

    console.log('PDF Processing Results:');
    console.log('======================');

    Object.entries(results).forEach(([name, data]) => {
      console.log(`${name}:`);
      console.log(`  - Present Days: ${data.presentDays}`);
      console.log(`  - Attendance Details: ${data.attendanceDetails?.length || 0} entries`);
      if (data.attendanceDetails && data.attendanceDetails.length > 0) {
        console.log(`  - Sample entries:`, data.attendanceDetails.slice(0, 5));
      }
      console.log('');
    });

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testPDFProcessing();