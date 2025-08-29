import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createSampleAttendanceExcel = () => {
  // Sample attendance data
  const sampleData = [
    // Header row
    ['ID', 'Name', 'Department', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31'],
    
    // Employee data rows
    ['EMP001', 'John Doe', 'IT', '09:00-18:00', '09:15-18:30', 'P', '09:00-17:45', 'H', 'A', '09:30-18:15', '09:00-18:00', 'P', '09:15-18:00', '09:00-17:30', 'P', 'A', '09:00-18:00', 'P', '09:30-18:30', '09:00-17:45', 'P', 'H', '09:00-18:00', 'P', '09:15-18:15', '09:00-18:00', 'P', 'A', '09:00-17:30', '09:15-18:00', 'P'],
    
    ['EMP002', 'Jane Smith', 'HR', 'P', '09:00-17:00', '09:30-17:30', 'P', '09:00-13:00', 'A', 'P', '09:15-17:15', 'P', '09:00-17:00', 'H', 'P', 'A', '09:00-17:30', 'P', '09:30-17:45', '09:00-17:00', 'P', '09:15-13:15', '09:00-17:30', 'P', '09:00-17:00', 'P', '09:30-17:30', 'A', '09:00-17:15', '09:00-17:00', 'P'],
    
    ['EMP003', 'Mike Johnson', 'Finance', '1', '1', '0.5', '1', '0', '0', '1', '1', '1', '0.5', '1', '1', '0', '1', '1', '1', '1', '0.5', '1', '1', '0', '1', '1', '1', '1', '0', '1', '1', '1'],
    
    ['EMP004', 'Sarah Wilson', 'Marketing', 'Present', 'Present', 'Half Day', 'Present', 'Absent', 'Leave', 'Present', 'Present', 'Present', 'Half Day', 'Present', 'Present', 'Absent', 'Present', 'Present', 'Present', 'Present', 'Half Day', 'Present', 'Present', 'Absent', 'Present', 'Present', 'Present', 'Present', 'Leave', 'Present', 'Present', 'Present'],
    
    ['EMP005', 'David Brown', 'IT', '8', '7.5', '4', '8', '0', '0', '8.5', '8', '8', '4', '8', '7.5', '0', '8', '8', '8', '8', '4', '8', '8', '0', '8', '8', '8', '8', '0', '8', '7.5', '8']
  ];

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(sampleData);

  // Add some styling (optional)
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  
  // Set column widths
  worksheet['!cols'] = [
    { width: 10 }, // ID
    { width: 20 }, // Name
    { width: 15 }, // Department
    ...Array(31).fill({ width: 8 }) // Date columns
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance_July_2025');

  // Save the file
  const filePath = path.join(__dirname, '..', 'sample_attendance.xlsx');
  XLSX.writeFile(workbook, filePath);
  
  console.log('Sample Excel file created at:', filePath);
  return filePath;
};

// Create sample file if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log('Creating sample Excel file...');
    const filePath = createSampleAttendanceExcel();
    console.log('Sample Excel file created successfully at:', filePath);
  } catch (error) {
    console.error('Error creating sample Excel file:', error);
  }
}
