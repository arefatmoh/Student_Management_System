const express = require('express');
const { getPool } = require('../db');
const { requireAuth } = require('../middlewares/auth');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Export students to CSV
router.get('/students/export', async (req, res) => {
  try {
    const { classFilter } = req.query;
    const pool = getPool();
    
    let query = 'SELECT * FROM Students';
    let params = [];
    
    if (classFilter && classFilter !== 'all') {
      query += ' WHERE CLASS = ?';
      params.push(classFilter);
    }
    
    const [students] = await pool.query(query, params);
    
    // Generate CSV content
    const csvHeader = 'STUDENT_ID,NAME,ROLL_NUMBER,CLASS,PARENT_CONTACT\n';
    const csvRows = students.map(student => 
      `${student.STUDENT_ID},"${student.NAME}","${student.ROLL_NUMBER}","${student.CLASS}","${student.PARENT_CONTACT || ''}"`
    ).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="students_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting students:', error);
    res.status(500).json({ error: 'Failed to export students' });
  }
});

// Import students from CSV
router.post('/students/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const pool = getPool();
    const results = {
      success: 0,
      errors: [],
      duplicates: 0
    };
    
    const students = [];
    const duplicateRollNumbers = new Set();
    
    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          // Validate required fields
          if (!row.NAME || !row.ROLL_NUMBER || !row.CLASS) {
            results.errors.push(`Row ${students.length + 1}: Missing required fields (NAME, ROLL_NUMBER, CLASS)`);
            return;
          }
          
          students.push({
            name: row.NAME.trim(),
            rollNumber: row.ROLL_NUMBER.trim(),
            class: row.CLASS.trim(),
            parentContact: row.PARENT_CONTACT ? row.PARENT_CONTACT.trim() : null
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    if (students.length === 0) {
      return res.status(400).json({ error: 'No valid data found in CSV file' });
    }
    
    // Check for duplicates in the file
    const rollNumbers = students.map(s => s.rollNumber);
    const uniqueRollNumbers = new Set(rollNumbers);
    if (rollNumbers.length !== uniqueRollNumbers.size) {
      results.errors.push('Duplicate roll numbers found in the file');
    }
    
    // Check for existing roll numbers in database
    const existingRollNumbers = rollNumbers.join("','");
    const [existing] = await pool.query(
      `SELECT ROLL_NUMBER FROM Students WHERE ROLL_NUMBER IN ('${existingRollNumbers}')`
    );
    
    const existingSet = new Set(existing.map(r => r.ROLL_NUMBER));
    
    // Process students
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      
      if (existingSet.has(student.rollNumber)) {
        results.duplicates++;
        results.errors.push(`Row ${i + 1}: Roll number ${student.rollNumber} already exists`);
        continue;
      }
      
      try {
        await pool.query(
          'INSERT INTO Students (NAME, ROLL_NUMBER, CLASS, PARENT_CONTACT) VALUES (?, ?, ?, ?)',
          [student.name, student.rollNumber, student.class, student.parentContact]
        );
        results.success++;
      } catch (error) {
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({
      message: 'Import completed',
      ...results
    });
  } catch (error) {
    console.error('Error importing students:', error);
    res.status(500).json({ error: 'Failed to import students' });
  }
});

// Export attendance to CSV
router.get('/attendance/export', async (req, res) => {
  try {
    const { startDate, endDate, classFilter } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const pool = getPool();
    
    let query = `
      SELECT 
        s.NAME,
        s.ROLL_NUMBER,
        s.CLASS,
        a.ATTENDANCE_DATE,
        a.STATUS
      FROM Attendance a
      JOIN Students s ON a.STUDENT_ID = s.STUDENT_ID
      WHERE a.ATTENDANCE_DATE BETWEEN ? AND ?
    `;
    
    let params = [startDate, endDate];
    
    if (classFilter && classFilter !== 'all') {
      query += ' AND s.CLASS = ?';
      params.push(classFilter);
    }
    
    query += ' ORDER BY a.ATTENDANCE_DATE, s.CLASS, s.ROLL_NUMBER';
    
    const [attendance] = await pool.query(query, params);
    
    // Generate CSV content
    const csvHeader = 'STUDENT_NAME,ROLL_NUMBER,CLASS,ATTENDANCE_DATE,STATUS\n';
    const csvRows = attendance.map(record => 
      `"${record.NAME}","${record.ROLL_NUMBER}","${record.CLASS}","${record.ATTENDANCE_DATE}","${record.STATUS}"`
    ).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${startDate}_to_${endDate}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting attendance:', error);
    res.status(500).json({ error: 'Failed to export attendance' });
  }
});

// Export fees to CSV
router.get('/fees/export', async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    const pool = getPool();
    
    let query = `
      SELECT 
        s.NAME,
        s.ROLL_NUMBER,
        s.CLASS,
        f.FEE_AMOUNT,
        f.PAID_DATE,
        f.STATUS
      FROM Fees f
      JOIN Students s ON f.STUDENT_ID = s.STUDENT_ID
      WHERE 1=1
    `;
    
    let params = [];
    
    if (startDate) {
      query += ' AND f.PAID_DATE >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND f.PAID_DATE <= ?';
      params.push(endDate);
    }
    
    if (status) {
      query += ' AND f.STATUS = ?';
      params.push(status);
    }
    
    query += ' ORDER BY f.PAID_DATE DESC, s.CLASS, s.ROLL_NUMBER';
    
    const [fees] = await pool.query(query, params);
    
    // Generate CSV content
    const csvHeader = 'STUDENT_NAME,ROLL_NUMBER,CLASS,FEE_AMOUNT,PAID_DATE,STATUS\n';
    const csvRows = fees.map(record => 
      `"${record.NAME}","${record.ROLL_NUMBER}","${record.CLASS}","${record.FEE_AMOUNT}","${record.PAID_DATE || ''}","${record.STATUS}"`
    ).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="fees_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting fees:', error);
    res.status(500).json({ error: 'Failed to export fees' });
  }
});

// Download CSV template for students
router.get('/students/template', (req, res) => {
  const template = 'NAME,ROLL_NUMBER,CLASS,PARENT_CONTACT\n"John Doe","ST001","Grade 1","1234567890"\n"Jane Smith","ST002","Grade 1","0987654321"';
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="students_template.csv"');
  res.send(template);
});

// Get import/export statistics
router.get('/stats', async (req, res) => {
  try {
    const pool = getPool();
    
    const [studentCount] = await pool.query('SELECT COUNT(*) as count FROM Students');
    const [attendanceCount] = await pool.query('SELECT COUNT(*) as count FROM Attendance');
    const [feesCount] = await pool.query('SELECT COUNT(*) as count FROM Fees');
    
    res.json({
      students: studentCount[0].count,
      attendance: attendanceCount[0].count,
      fees: feesCount[0].count
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
