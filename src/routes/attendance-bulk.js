const express = require('express');
const { getPool } = require('../db');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// Bulk mark attendance for multiple students
router.post('/bulk', async (req, res) => {
  try {
    const { date, classFilter, attendanceData } = req.body;
    
    if (!date || !attendanceData || !Array.isArray(attendanceData)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Get students based on class filter
      let studentQuery = 'SELECT STUDENT_ID FROM Students';
      let queryParams = [];
      
      if (classFilter && classFilter !== 'all') {
        studentQuery += ' WHERE CLASS = ?';
        queryParams.push(classFilter);
      }
      
      const [students] = await connection.query(studentQuery, queryParams);
      const studentIds = students.map(s => s.STUDENT_ID);
      
      // Process attendance data
      const attendanceRecords = [];
      for (const record of attendanceData) {
        if (studentIds.includes(record.studentId)) {
          attendanceRecords.push([
            record.studentId,
            date,
            record.status
          ]);
        }
      }
      
      if (attendanceRecords.length === 0) {
        return res.status(400).json({ error: 'No valid students found' });
      }
      
      // Delete existing attendance for this date and students
      const placeholders = studentIds.map(() => '?').join(',');
      await connection.query(
        `DELETE FROM Attendance WHERE ATTENDANCE_DATE = ? AND STUDENT_ID IN (${placeholders})`,
        [date, ...studentIds]
      );
      
      // Insert new attendance records
      if (attendanceRecords.length > 0) {
        await connection.query(
          'INSERT INTO Attendance (STUDENT_ID, ATTENDANCE_DATE, STATUS) VALUES ?',
          [attendanceRecords]
        );
      }
      
      await connection.commit();
      
      res.json({
        message: 'Bulk attendance recorded successfully',
        recordsCount: attendanceRecords.length
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error recording bulk attendance:', error);
    res.status(500).json({ error: 'Failed to record bulk attendance' });
  }
});

// Get attendance calendar data for a month
router.get('/calendar', async (req, res) => {
  try {
    const { year, month, classFilter } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    const pool = getPool();
    
    // Get students based on class filter
    let studentQuery = 'SELECT STUDENT_ID, NAME, ROLL_NUMBER, CLASS FROM Students';
    let queryParams = [];
    
    if (classFilter && classFilter !== 'all') {
      studentQuery += ' WHERE CLASS = ?';
      queryParams.push(classFilter);
    }
    
    const [students] = await pool.query(studentQuery, queryParams);
    
    // Get attendance data for the month
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const [attendance] = await pool.query(`
      SELECT 
        a.STUDENT_ID,
        a.ATTENDANCE_DATE,
        a.STATUS,
        s.NAME,
        s.ROLL_NUMBER,
        s.CLASS
      FROM Attendance a
      JOIN Students s ON a.STUDENT_ID = s.STUDENT_ID
      WHERE a.ATTENDANCE_DATE BETWEEN ? AND ?
      ${classFilter && classFilter !== 'all' ? 'AND s.CLASS = ?' : ''}
      ORDER BY a.ATTENDANCE_DATE, s.NAME
    `, classFilter && classFilter !== 'all' ? [startDate, endDate, classFilter] : [startDate, endDate]);
    
    // Organize data by date
    const calendarData = {};
    attendance.forEach(record => {
      const date = record.ATTENDANCE_DATE;
      if (!calendarData[date]) {
        calendarData[date] = [];
      }
      calendarData[date].push({
        studentId: record.STUDENT_ID,
        name: record.NAME,
        rollNumber: record.ROLL_NUMBER,
        class: record.CLASS,
        status: record.STATUS
      });
    });
    
    res.json({
      students,
      calendarData,
      month: parseInt(month),
      year: parseInt(year)
    });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
});

// Get attendance summary for a date range
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate, classFilter } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const pool = getPool();
    
    let whereClause = 'a.ATTENDANCE_DATE BETWEEN ? AND ?';
    let queryParams = [startDate, endDate];
    
    if (classFilter && classFilter !== 'all') {
      whereClause += ' AND s.CLASS = ?';
      queryParams.push(classFilter);
    }
    
    const [summary] = await pool.query(`
      SELECT 
        a.ATTENDANCE_DATE,
        COUNT(*) as total_students,
        SUM(CASE WHEN a.STATUS = 'Present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN a.STATUS = 'Absent' THEN 1 ELSE 0 END) as absent_count,
        ROUND(
          (SUM(CASE WHEN a.STATUS = 'Present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2
        ) as attendance_percentage
      FROM Attendance a
      JOIN Students s ON a.STUDENT_ID = s.STUDENT_ID
      WHERE ${whereClause}
      GROUP BY a.ATTENDANCE_DATE
      ORDER BY a.ATTENDANCE_DATE
    `, queryParams);
    
    res.json({ summary });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ error: 'Failed to fetch attendance summary' });
  }
});

module.exports = router;
