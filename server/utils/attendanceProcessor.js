import fs from 'fs';
import csv from 'csv-parser';
import axios from 'axios';
import path from 'path';

// Function to extract text from PDF using Gemini AI
const extractTextFromPDF = async (filePath) => {
  try {
    // Read the PDF file as base64
    const fileBuffer = fs.readFileSync(filePath);
    const base64File = fileBuffer.toString('base64');

    const prompt = `You are an expert at extracting structured data from PDF attendance sheets. Your task is to analyze this PDF file and extract ALL employee attendance data.

CRITICAL REQUIREMENTS:
1. SCAN THE ENTIRE PDF DOCUMENT and find ALL employee names
2. Extract names EXACTLY as they appear in the PDF - do not modify or invent names
3. Look for employee names in the first column/leftmost column of tables
4. Common names to look for: Kanav, Yashika, Aditya, Gaudhami, Shantanu, Bhavesh, Shashank, Rutuja, Rishabh, Vinayak, Tejaswi, Karthikeya, Nipun, Shivam, Vijay, Vaibhav, Vedang, Anmol, etc.
5. If the PDF has a table format, extract data from each row
6. If the PDF has a different format, adapt and extract all available employee data

ATTENDANCE SHEET STRUCTURE:
- Employee names are typically in the first column
- Days 1-31 are usually in columns across the top
- Each cell contains attendance status for that day

STATUS CODE MAPPING (use these exact values in JSON):
- PRESENT, P, WFH, EWFH, PR, WORK FROM HOME, HOLIDAY, HOL → "Present"
- AB, A, ABSENT, ABS, -, NO ENTRY, BLANK, ABSENT → "Absent"
- HALF DAY, HD, H, HALFDAY, HALF → "Half Day"

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure:
{
  "month": "AUGUST",
  "year": "2025",
  "employees": [
    {
      "name": "Kanav",
      "attendance": {
        "1": "Present",
        "2": "Present",
        "3": "Present",
        "4": "Present",
        "5": "Present",
        "6": "Present",
        "7": "Present",
        "8": "Present",
        "9": "Present",
        "10": "Present",
        "11": "Present",
        "12": "Present",
        "13": "Present",
        "14": "Present",
        "15": "Present",
        "16": "Present",
        "17": "Present",
        "18": "Present",
        "19": "Present",
        "20": "Present",
        "21": "Present",
        "22": "Present",
        "23": "Present",
        "24": "Present",
        "25": "Present",
        "26": "Present",
        "27": "Present",
        "28": "Present",
        "29": "Present",
        "30": "Present",
        "31": "Present"
      }
    },
    {
      "name": "Yashika",
      "attendance": {
        "1": "Present",
        "2": "Present",
        "3": "Present",
        "4": "Present",
        "5": "Present",
        "6": "Present",
        "7": "Present",
        "8": "Present",
        "9": "Present",
        "10": "Present",
        "11": "Present",
        "12": "Present",
        "13": "Present",
        "14": "Present",
        "15": "Present",
        "16": "Present",
        "17": "Present",
        "18": "Present",
        "19": "Present",
        "20": "Present",
        "21": "Present",
        "22": "Present",
        "23": "Present",
        "24": "Present",
        "25": "Present",
        "26": "Present",
        "27": "Present",
        "28": "Present",
        "29": "Present",
        "30": "Present",
        "31": "Present"
      }
    }
  ]
}

IMPORTANT NOTES:
- Extract as many employees as possible from the PDF
- Use the exact names as they appear (case-sensitive)
- If you find names like "Shashank@M", keep it exactly as "Shashank@M"
- Map all attendance codes to the 3 allowed values: "Present", "Absent", "Half Day"
- Ensure the JSON is valid and parseable
- Do not include any text outside the JSON object`;

    const response = await axios.post(
      `${process.env.GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 120 second timeout for PDF processing
      }
    );

    const extractedText = response.data.candidates[0]?.content?.parts[0]?.text;
    if (!extractedText) {
      throw new Error('No response from Gemini API');
    }

    // Try to parse the JSON response
    try {
      console.log('Raw Gemini response:', extractedText);

      // Clean the response to extract JSON
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response');
        throw new Error('No JSON found in response');
      }

      const jsonData = JSON.parse(jsonMatch[0]);
      console.log('Parsed JSON data:', JSON.stringify(jsonData, null, 2));

      // Validate that we have real employee names, not generic ones
      if (jsonData.employees && Array.isArray(jsonData.employees)) {
        console.log(`PDF extracted ${jsonData.employees.length} employees:`);
        jsonData.employees.forEach((emp, index) => {
          console.log(`${index + 1}. "${emp.name}"`);
        });

        const hasRealNames = jsonData.employees.some(emp =>
          emp.name &&
          !emp.name.toLowerCase().includes('john doe') &&
          !emp.name.toLowerCase().includes('jane smith') &&
          !emp.name.toLowerCase().includes('employee') &&
          !emp.name.toLowerCase().includes('employees') &&
          emp.name.length > 2 // Real names should be longer than 2 characters
        );

        if (!hasRealNames) {
          console.warn('PDF processing returned generic or invalid names, this might indicate extraction failure');
          console.warn('PDF might be scanned/image-based or have an unusual format');
        }

        // Check if we have enough employees (should be more than just a few)
        if (jsonData.employees.length < 5) {
          console.warn(`PDF only extracted ${jsonData.employees.length} employees. This seems low for a company attendance sheet.`);
          console.warn('Possible issues:');
          console.warn('1. PDF is scanned/image-based (AI cannot read text)');
          console.warn('2. PDF format is different than expected');
          console.warn('3. PDF contains no text content');
          console.warn('4. PDF is password-protected or corrupted');
        }
      }

      return jsonData;
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw response:', extractedText);
      throw new Error('Failed to parse attendance data from PDF');
    }

  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

// Function to process PDF attendance data
const processPDFAttendance = async (filePath) => {
  try {
    const pdfData = await extractTextFromPDF(filePath);

    const results = {};

    if (pdfData.employees && Array.isArray(pdfData.employees)) {
      console.log(`Found ${pdfData.employees.length} employees in PDF data`);

      pdfData.employees.forEach(employee => {
        const employeeName = employee.name?.toLowerCase().trim();
        console.log(`Processing PDF employee: "${employee.name}" -> normalized: "${employeeName}"`);

        if (employeeName && employee.attendance) {
          // Use employee name as key (will be matched with Excel data later)
          results[employeeName] = {
            presentDays: 0,
            attendanceDetails: [],
            monthlyData: employee.attendance
          };

          // Count present days and create attendance details
        Object.entries(employee.attendance).forEach(([day, status]) => {
          const dayNum = parseInt(day);
          const cleanStatus = status?.toUpperCase().trim();

          // Normalize status to match Mongoose enum values
          let normalizedStatus = 'Absent'; // Default
          if (['PRESENT', 'P', 'WFH', 'EWFH', 'PR', 'WORK FROM HOME', 'HOLIDAY', 'HOL'].includes(cleanStatus)) {
            normalizedStatus = 'Present';
          } else if (['HALF DAY', 'HD', 'H', 'HALFDAY'].includes(cleanStatus)) {
            normalizedStatus = 'Half Day';
          } else if (['A', 'ABSENT', 'AB', 'ABS', 'NO ENTRY', 'BLANK'].includes(cleanStatus)) {
            normalizedStatus = 'Absent';
          } else if (cleanStatus === '-' || cleanStatus === '' || cleanStatus === null) {
            normalizedStatus = 'Absent'; // No entry = Absent
          }

          // Count as present if status is Present or Half Day
          if (['Present', 'Half Day'].includes(normalizedStatus)) {
            results[employeeName].presentDays += 1;
          }

            // Add to attendance details for calendar view
            // Fix date format to match expected format (YYYY-MM-DD)
            const monthName = pdfData.month?.split(' ')[0] || 'AUGUST';
            const year = pdfData.year || pdfData.month?.split(' ')[1] || '2025';

            // Convert month name to number
            const monthNames = {
              'JANUARY': '01', 'FEBRUARY': '02', 'MARCH': '03', 'APRIL': '04',
              'MAY': '05', 'JUNE': '06', 'JULY': '07', 'AUGUST': '08',
              'SEPTEMBER': '09', 'OCTOBER': '10', 'NOVEMBER': '11', 'DECEMBER': '12'
            };
            const month = monthNames[monthName.toUpperCase()] || '08';
            const formattedDate = `${year}-${month}-${String(dayNum).padStart(2, '0')}`;

            results[employeeName].attendanceDetails.push({
              day: dayNum,
              status: normalizedStatus, // Use normalized status that matches Mongoose enum
              date: formattedDate,
              checkIn: normalizedStatus === 'Present' ? '09:00' : '',
              checkOut: normalizedStatus === 'Present' ? '17:00' : '',
              hoursWorked: normalizedStatus === 'Present' ? 8 : normalizedStatus === 'Half Day' ? 4 : 0
            });
          });

          console.log(`Employee ${employeeName}: ${results[employeeName].presentDays} present days`);
        } else {
          console.log(`Skipping employee with invalid data:`, employee);
        }
      });
    } else {
      console.log('No employees array found in PDF data');
    }

    console.log(`Processed PDF attendance for ${Object.keys(results).length} employees`);
    return results;

  } catch (error) {
    console.error('PDF processing error:', error.message);
    console.error('This might be due to:');
    console.error('1. PDF is scanned/image-based (AI cannot extract text from images)');
    console.error('2. PDF format/structure is different than expected');
    console.error('3. PDF contains no readable text content');
    console.error('4. Network/API issues with Gemini');
    console.error('5. PDF is password-protected or corrupted');
    console.error('6. PDF file is too large or complex');

    console.log('SOLUTIONS for scanned PDFs:');
    console.log('1. Use OCR software to convert scanned PDF to text PDF');
    console.log('2. Use online PDF to Excel converters');
    console.log('3. Manually retype the attendance data');
    console.log('4. Use Excel file instead of PDF for attendance data');

    // Return empty result so the system can fall back to Excel-only processing
    console.log('Returning empty result - system will use Excel data only');
    return { employees: [] };
  }
};

export const processManualAttendance = (filePath) => {
  return new Promise(async (resolve, reject) => {
    try {
      const fileExtension = path.extname(filePath).toLowerCase();

      if (fileExtension === '.pdf') {
        // Handle PDF files with Gemini AI
        console.log('Processing PDF attendance file with Gemini AI...');
        const results = await processPDFAttendance(filePath);
        resolve(results);
      } else {
        // Handle CSV files (existing logic)
        console.log('Processing CSV attendance file...');
        const results = {};
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => {
            try {
              const employeeId = data.employeeId || data.EmployeeId || data.EMPLOYEEID || data.name?.toLowerCase().trim();
              if (employeeId) {
                if (!results[employeeId]) {
                  results[employeeId] = {
                    presentDays: 0,
                    dates: new Set(),
                    attendanceDetails: []
                  };
                }
                // Assuming the file has a 'date' column.
                const date = data.date || data.Date || data.DATE;
                if (date) {
                  // Avoid counting duplicate dates for the same employee
                  if (!results[employeeId].dates.has(date)) {
                    results[employeeId].dates.add(date);
                    results[employeeId].presentDays += 1;

                    // Add to attendance details
                    results[employeeId].attendanceDetails.push({
                      day: new Date(date).getDate(),
                      status: data.status || 'PRESENT',
                      date: date
                    });
                  }
                }
              }
            } catch (error) {
              // Log error for a specific row but continue processing
              console.error('Error processing CSV row:', data, error);
            }
          })
          .on('end', () => {
            // Convert sets to arrays for easier use later if needed
            Object.keys(results).forEach(employeeId => {
              results[employeeId].dates = Array.from(results[employeeId].dates);
            });
            resolve(results);
          })
          .on('error', (error) => {
            reject(error);
          });
      }
    } catch (error) {
      reject(error);
    }
  });
};
