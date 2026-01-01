const xlsx = require('xlsx');
const Student = require('../models/Student');
const Test = require('../models/Test');
const StudentTestResult = require('../models/StudentTestResult');

// Extract test information from Excel cells I1 to I6
const extractTestInfo = (worksheet) => {
  const testInfo = {};
  
  // Read cells I1 to I6
  for (let row = 1; row <= 6; row++) {
    const cell = worksheet[`I${row}`];
    if (cell && cell.v !== undefined && cell.v !== null) {
      const value = String(cell.v).trim();
      const label = value.split(':')[0]?.trim().toLowerCase();
      const data = value.split(':').slice(1).join(':').trim();
      
      // Map common labels to test fields
      if (label.includes('name') || label.includes('test')) {
        testInfo.testName = data || value;
      } else if (label.includes('date')) {
        testInfo.testDate = data || value;
      } else if (label.includes('mark') || label.includes('max')) {
        testInfo.maxMarks = parseInt(data || value) || 300;
      } else if (row === 1 && !testInfo.testName) {
        // If I1 doesn't have a label, assume it's the test name
        testInfo.testName = value;
      } else if (row === 2 && !testInfo.testDate) {
        // If I2 doesn't have a label, assume it's the date
        testInfo.testDate = value;
      }
    }
  }
  
  // Also check adjacent cells (H1-H6, J1-J6) for labels
  for (let row = 1; row <= 6; row++) {
    const labelCell = worksheet[`H${row}`];
    const valueCell = worksheet[`I${row}`];
    
    if (labelCell && valueCell) {
      const label = String(labelCell.v || '').trim().toLowerCase();
      const value = String(valueCell.v || '').trim();
      
      if (label.includes('name') || label.includes('test')) {
        testInfo.testName = value;
      } else if (label.includes('date')) {
        testInfo.testDate = value;
      } else if (label.includes('mark') || label.includes('max')) {
        testInfo.maxMarks = parseInt(value) || 300;
      }
    }
  }
  
  return testInfo;
};

const parseExcelFile = async (filePath, testId = null) => {
  try {
    // Read Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Extract test info from Excel if testId not provided
    let test = null;
    if (!testId) {
      const testInfo = extractTestInfo(worksheet);
      console.log('📋 Test info from Excel:', testInfo);
      
      // Parse date if it's a string
      let testDate = new Date();
      if (testInfo.testDate) {
        // Try to parse the date
        const parsedDate = new Date(testInfo.testDate);
        if (!isNaN(parsedDate.getTime())) {
          testDate = parsedDate;
        }
      }
      
      // Create or find test
      if (testInfo.testName) {
        // Check if test with same name and date already exists
        test = await Test.findOne({
          testName: testInfo.testName,
          testDate: testDate
        });
        
        if (!test) {
          test = new Test({
            testName: testInfo.testName,
            testDate: testDate,
            maxMarks: testInfo.maxMarks || 300
          });
          await test.save();
          console.log(`✅ Created new test: ${testInfo.testName} (${testDate.toISOString().split('T')[0]})`);
        } else {
          console.log(`ℹ️  Using existing test: ${testInfo.testName}`);
        }
        testId = test._id;
      } else {
        throw new Error('Test name not found in Excel cells I1-I6. Please ensure test name is in cell I1 or H1/I1 format.');
      }
    } else {
      test = await Test.findById(testId);
      if (!test) {
        throw new Error('Test not found');
      }
    }
    
    // Required columns
    const requiredColumns = [
      'StuID', 'Name', 'Batch',
      'Phy-R', 'Phy-W', 'Phy-U', 'Phy-T',
      'Chem-R', 'Chem-W', 'Chem-U', 'Chem-T',
      'Math-R', 'Math-W', 'Math-U', 'Math-T',
      'Total-R', 'Total-W', 'Total-U', 'Total-S', '%age', 'Rank'
    ];

    // Detect header row by searching for "StuID" in the first 20 rows
    let headerRowNum = 8; // Default to row 8 (common format: A8, B8, etc.)
    
    for (let rowNum = 1; rowNum <= 20; rowNum++) {
      const cellA = worksheet[`A${rowNum}`];
      
      // Check if this row contains "StuID" or similar header indicators
      if (cellA) {
        const cellValue = String(cellA.v || '').trim().toLowerCase();
        if (cellValue === 'stuid' || cellValue === 'student id' || cellValue === 'roll number') {
          headerRowNum = rowNum;
          break;
        }
      }
      
      // Also check if row 8 specifically has headers (common format)
      if (rowNum === 8) {
        // Check multiple cells in row 8 to see if they match our required columns
        let matchingColumns = 0;
        for (let col = 'A'; col <= 'Z'; col++) {
          const cell = worksheet[`${col}${rowNum}`];
          if (cell) {
            const cellVal = String(cell.v || '').trim();
            if (requiredColumns.some(req => req.toLowerCase() === cellVal.toLowerCase())) {
              matchingColumns++;
            }
          }
        }
        if (matchingColumns >= 5) { // If at least 5 columns match, assume this is header row
          headerRowNum = rowNum;
        }
      }
    }
    
    // Read the header row to get column names
    const headerRow = {};
    const columnLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    
    // Read headers from the detected header row
    for (let col = 0; col < columnLetters.length; col++) {
      const cellRef = `${columnLetters[col]}${headerRowNum}`;
      const cell = worksheet[cellRef];
      if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
        headerRow[columnLetters[col]] = String(cell.v).trim();
      }
    }
    
    // Find the last row with data
    const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1:Z1');
    const lastRow = range.e.r + 1; // Convert to 1-indexed
    
    // Read data rows starting from headerRowNum + 1
    const rows = [];
    for (let rowNum = headerRowNum + 1; rowNum <= lastRow; rowNum++) {
      const row = {};
      let hasData = false;
      
      for (let col = 0; col < columnLetters.length; col++) {
        const cellRef = `${columnLetters[col]}${rowNum}`;
        const cell = worksheet[cellRef];
        const headerName = headerRow[columnLetters[col]];
        
        if (headerName && cell && cell.v !== undefined && cell.v !== null) {
          row[headerName] = cell.v;
          hasData = true;
        }
      }
      
      if (hasData) {
        rows.push(row);
      }
    }
    
    if (rows.length === 0) {
      throw new Error('Excel file is empty or no data rows found after header');
    }

    // Get actual column names from first data row (keys come from header row)
    const firstRow = rows[0];
    const actualColumns = Object.keys(firstRow);
    
    console.log(`📊 Detected header row: ${headerRowNum}`);
    console.log(`📋 Found ${actualColumns.length} columns: ${actualColumns.join(', ')}`);
    console.log(`📝 Processing ${rows.length} data rows`);
    
    // Identify additional columns that might contain student info
    const studentInfoColumns = actualColumns.filter(col => {
      const colLower = col.trim().toLowerCase();
      return !colLower.includes('phy') && !colLower.includes('chem') && 
             !colLower.includes('math') && !colLower.includes('total') && 
             colLower !== '%age' && colLower !== 'rank' && 
             colLower !== 'stuid' && colLower !== 'name' && colLower !== 'batch';
    });
    if (studentInfoColumns.length > 0) {
      console.log(`ℹ️  Additional columns found (will be mapped if they match student fields): ${studentInfoColumns.join(', ')}`);
    }
    
    // Normalize column names (trim, remove extra spaces)
    const normalizedActual = actualColumns.map(col => col.trim());
    const normalizedRequired = requiredColumns.map(col => col.trim());
    
    // Check for missing columns
    const missingColumns = normalizedRequired.filter(reqCol => {
      // Check exact match
      if (normalizedActual.includes(reqCol)) return false;
      // Check case-insensitive match
      const found = normalizedActual.find(act => act.toLowerCase() === reqCol.toLowerCase());
      return !found;
    });
    
    if (missingColumns.length > 0) {
      // Show what columns were found
      const foundColumns = actualColumns.slice(0, 10).join(', ');
      throw new Error(
        `Missing required columns: ${missingColumns.join(', ')}\n` +
        `Found columns in Excel: ${foundColumns}${actualColumns.length > 10 ? '...' : ''}\n` +
        `Please ensure your Excel file has the exact column names as specified.`
      );
    }
    
    // Create column mapping (handle case variations)
    const columnMap = {};
    requiredColumns.forEach(reqCol => {
      const found = actualColumns.find(act => 
        act.trim().toLowerCase() === reqCol.trim().toLowerCase()
      );
      if (found) {
        columnMap[reqCol] = found;
      } else {
        // If not found, use the required column name as fallback
        columnMap[reqCol] = reqCol;
      }
    });

    // Helper function to get value from row using column mapping
    const getValue = (row, colName) => {
      const mappedCol = columnMap[colName];
      if (mappedCol && row[mappedCol] !== undefined) {
        return row[mappedCol];
      }
      // Try direct access as fallback
      return row[colName];
    };

    const results = {
      processed: 0,
      skipped: 0,
      errors: [],
      studentsCreated: 0,
      studentsUpdated: 0,
      testResultsCreated: 0,
      testResultsUpdated: 0
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      const stuID = String(getValue(row, 'StuID') || '').trim();
      const studentName = String(getValue(row, 'Name') || '').trim();
      const batch = String(getValue(row, 'Batch') || '').trim();

      // Calculate actual Excel row number (header row + 1 for data start + current index + 1 for 1-based)
      const excelRowNum = headerRowNum + 1 + i + 1;

      if (!stuID || stuID === 'undefined' || stuID === 'null') {
        results.skipped++;
        results.errors.push(`Row ${excelRowNum}: StuID is missing or invalid`);
        continue;
      }

      if (!studentName || studentName === 'undefined' || studentName === 'null') {
        results.skipped++;
        results.errors.push(`Row ${excelRowNum}: Name is missing for StuID ${stuID}`);
        continue;
      }

      try {
        // CRITICAL: Check if student with this Roll Number already exists
        // Roll Number (StuID) is the unique identifier - do NOT create duplicates
        let student = await Student.findOne({ rollNumber: stuID });

        // Map Excel columns to student fields (case-insensitive, flexible matching)
        const columnMappings = {
          // Direct matches
          'parentname': 'parentName',
          'parent name': 'parentName',
          'parent': 'parentName',
          'parentoccupation': 'parentOccupation',
          'parent occupation': 'parentOccupation',
          'occupation': 'parentOccupation',
          'address': 'address',
          'contact': 'contactNumber',
          'contactnumber': 'contactNumber',
          'contact number': 'contactNumber',
          'phone': 'contactNumber',
          'mobile': 'contactNumber',
          'remark': 'generalRemark',
          'remarks': 'generalRemark',
          'generalremark': 'generalRemark',
          'general remark': 'generalRemark',
          'note': 'generalRemark',
          'notes': 'generalRemark'
        };

        // Extract all available data from Excel row
        const studentData = {
          rollNumber: stuID,
          name: studentName,
          batch: batch || 'Unknown'
        };

        // Try to map additional columns from Excel to student fields
        actualColumns.forEach(col => {
          const colLower = col.trim().toLowerCase();
          const value = getValue(row, col);
          
          // Skip if already mapped or if it's a test result column
          if (colLower === 'stuid' || colLower === 'name' || colLower === 'batch' ||
              colLower.includes('phy') || colLower.includes('chem') || colLower.includes('math') ||
              colLower.includes('total') || colLower === '%age' || colLower === 'rank') {
            return;
          }

          // Check if this column maps to a student field
          const mappedField = columnMappings[colLower];
          if (mappedField && value !== undefined && value !== null && String(value).trim() !== '') {
            studentData[mappedField] = String(value).trim();
          }
        });

        let isNewStudent = false;
        if (!student) {
          // Student with this Roll Number does NOT exist - create new student
          try {
            student = new Student({
              rollNumber: studentData.rollNumber,
              name: studentData.name,
              batch: studentData.batch,
              parentName: studentData.parentName || '',
              parentOccupation: studentData.parentOccupation || '',
              address: studentData.address || '',
              contactNumber: studentData.contactNumber || '',
              generalRemark: studentData.generalRemark || '',
              sourceType: 'excel'
            });
            await student.save();
            isNewStudent = true;
            results.studentsCreated++;
            console.log(`✅ Created new student: ${studentName} (Roll: ${stuID})`);
          } catch (createError) {
            // Handle race condition: if student was created between findOne and save
            if (createError.code === 11000 || createError.message.includes('duplicate')) {
              // Roll Number already exists - fetch the existing student
              student = await Student.findOne({ rollNumber: stuID });
              if (student) {
                console.log(`ℹ️  Student with Roll ${stuID} already exists (race condition handled), updating...`);
                isNewStudent = false;
              } else {
                throw createError;
              }
            } else {
              throw createError;
            }
          }
        } else {
          // Student with this Roll Number EXISTS - update existing student, do NOT create duplicate
          let updated = false;
          if (studentData.name && student.name !== studentData.name) {
            student.name = studentData.name;
            updated = true;
          }
          if (studentData.batch && student.batch !== studentData.batch) {
            student.batch = studentData.batch;
            updated = true;
          }
          if (studentData.parentName && student.parentName !== studentData.parentName) {
            student.parentName = studentData.parentName;
            updated = true;
          }
          if (studentData.parentOccupation && student.parentOccupation !== studentData.parentOccupation) {
            student.parentOccupation = studentData.parentOccupation;
            updated = true;
          }
          if (studentData.address && student.address !== studentData.address) {
            student.address = studentData.address;
            updated = true;
          }
          if (studentData.contactNumber && student.contactNumber !== studentData.contactNumber) {
            student.contactNumber = studentData.contactNumber;
            updated = true;
          }
          if (studentData.generalRemark && student.generalRemark !== studentData.generalRemark) {
            // Append to existing remark if it exists, otherwise set
            if (student.generalRemark) {
              student.generalRemark = `${student.generalRemark}\n${studentData.generalRemark}`;
            } else {
              student.generalRemark = studentData.generalRemark;
            }
            updated = true;
          }
          if (updated) {
            await student.save();
            results.studentsUpdated++;
            console.log(`🔄 Updated existing student: ${studentName} (Roll: ${stuID})`);
          } else {
            console.log(`ℹ️  Student ${studentName} (Roll: ${stuID}) already exists, no updates needed`);
          }
        }

        // Now add/update test details for this student (existing or newly created)
        // Check if test result already exists for this student and test
        const existingResult = await StudentTestResult.findOne({
          studentId: student._id,
          testId: testId
        });

        if (existingResult) {
          // Test result already exists - UPDATE it with new data from Excel
          // Preserve manually entered data (unattemptedQuestions, negativeQuestions, remarks)
          existingResult.totals = {
            totalCorrect: parseFloat(getValue(row, 'Total-R')) || 0,
            totalWrong: parseFloat(getValue(row, 'Total-W')) || 0,
            totalUnattempted: parseFloat(getValue(row, 'Total-U')) || 0,
            totalScore: parseFloat(getValue(row, 'Total-S')) || 0,
            percentage: parseFloat(getValue(row, '%age')) || 0,
            rank: parseInt(getValue(row, 'Rank')) || 0
          };
          existingResult.physics = {
            right: parseFloat(getValue(row, 'Phy-R')) || 0,
            wrong: parseFloat(getValue(row, 'Phy-W')) || 0,
            unattempted: parseFloat(getValue(row, 'Phy-U')) || 0,
            score: parseFloat(getValue(row, 'Phy-T')) || 0,
            // Preserve manually entered questions
            unattemptedQuestions: existingResult.physics?.unattemptedQuestions || [],
            negativeQuestions: existingResult.physics?.negativeQuestions || []
          };
          existingResult.chemistry = {
            right: parseFloat(getValue(row, 'Chem-R')) || 0,
            wrong: parseFloat(getValue(row, 'Chem-W')) || 0,
            unattempted: parseFloat(getValue(row, 'Chem-U')) || 0,
            score: parseFloat(getValue(row, 'Chem-T')) || 0,
            // Preserve manually entered questions
            unattemptedQuestions: existingResult.chemistry?.unattemptedQuestions || [],
            negativeQuestions: existingResult.chemistry?.negativeQuestions || []
          };
          existingResult.maths = {
            right: parseFloat(getValue(row, 'Math-R')) || 0,
            wrong: parseFloat(getValue(row, 'Math-W')) || 0,
            unattempted: parseFloat(getValue(row, 'Math-U')) || 0,
            score: parseFloat(getValue(row, 'Math-T')) || 0,
            // Preserve manually entered questions
            unattemptedQuestions: existingResult.maths?.unattemptedQuestions || [],
            negativeQuestions: existingResult.maths?.negativeQuestions || []
          };
          // Preserve remarks
          // existingResult.remarks remains unchanged

          await existingResult.save();
          results.processed++;
          results.testResultsUpdated++;
          console.log(`📝 Updated test result for student ${studentName} (Roll: ${stuID})`);
        } else {
          // Test result does NOT exist - CREATE new test result for this student
          const newResult = new StudentTestResult({
            studentId: student._id,
            testId: testId,
            totals: {
              totalCorrect: parseFloat(getValue(row, 'Total-R')) || 0,
              totalWrong: parseFloat(getValue(row, 'Total-W')) || 0,
              totalUnattempted: parseFloat(getValue(row, 'Total-U')) || 0,
              totalScore: parseFloat(getValue(row, 'Total-S')) || 0,
              percentage: parseFloat(getValue(row, '%age')) || 0,
              rank: parseInt(getValue(row, 'Rank')) || 0
            },
            physics: {
              right: parseFloat(getValue(row, 'Phy-R')) || 0,
              wrong: parseFloat(getValue(row, 'Phy-W')) || 0,
              unattempted: parseFloat(getValue(row, 'Phy-U')) || 0,
              score: parseFloat(getValue(row, 'Phy-T')) || 0,
              unattemptedQuestions: [],
              negativeQuestions: []
            },
            chemistry: {
              right: parseFloat(getValue(row, 'Chem-R')) || 0,
              wrong: parseFloat(getValue(row, 'Chem-W')) || 0,
              unattempted: parseFloat(getValue(row, 'Chem-U')) || 0,
              score: parseFloat(getValue(row, 'Chem-T')) || 0,
              unattemptedQuestions: [],
              negativeQuestions: []
            },
            maths: {
              right: parseFloat(getValue(row, 'Math-R')) || 0,
              wrong: parseFloat(getValue(row, 'Math-W')) || 0,
              unattempted: parseFloat(getValue(row, 'Math-U')) || 0,
              score: parseFloat(getValue(row, 'Math-T')) || 0,
              unattemptedQuestions: [],
              negativeQuestions: []
            },
            remarks: ''
          });

          await newResult.save();
          results.processed++;
          results.testResultsCreated++;
          console.log(`📝 Created new test result for student ${studentName} (Roll: ${stuID})`);
        }
      } catch (error) {
        results.skipped++;
        const excelRowNum = headerRowNum + 1 + i + 1;
        results.errors.push(`Row ${excelRowNum}: ${error.message}`);
      }
    }

    // Include test info in results
    results.test = test ? {
      _id: test._id,
      testName: test.testName,
      testDate: test.testDate,
      maxMarks: test.maxMarks
    } : null;
    
    return results;
  } catch (error) {
    throw new Error(`Excel parsing error: ${error.message}`);
  }
};

module.exports = { parseExcelFile, extractTestInfo };

