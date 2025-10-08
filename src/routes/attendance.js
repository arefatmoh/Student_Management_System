const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// Record attendance (single)
router.post('/', async (req, res) => {
	try {
		const { STUDENT_ID, ATTENDANCE_DATE, STATUS } = req.body || {};
		if (!STUDENT_ID || !ATTENDANCE_DATE || !STATUS) {
			return res.status(400).json({ message: 'STUDENT_ID, ATTENDANCE_DATE, STATUS are required' });
		}
		if (STATUS !== 'Present' && STATUS !== 'Absent') {
			return res.status(400).json({ message: 'STATUS must be Present or Absent' });
		}
		await getPool().query(
			'INSERT INTO Attendance (STUDENT_ID, ATTENDANCE_DATE, STATUS) VALUES (?, ?, ?)',
			[STUDENT_ID, ATTENDANCE_DATE, STATUS]
		);
		const [rows] = await getPool().query(
			'SELECT * FROM Attendance WHERE STUDENT_ID=? AND ATTENDANCE_DATE=?',
			[STUDENT_ID, ATTENDANCE_DATE]
		);
		res.status(201).json(rows[0]);
	} catch (err) {
		if (err && err.code === 'ER_DUP_ENTRY') {
			return res.status(409).json({ message: 'Attendance already recorded for this date' });
		}
		res.status(500).json({ message: 'Server error', error: err.message });
	}
});

// List attendance (filters: student, date range, status)
router.get('/', async (req, res) => {
	try {
		const { studentId, studentName, status, from, to, page = 1, limit = 10 } = req.query;
		const filters = [];
		const params = [];
		if (studentId) { filters.push('a.STUDENT_ID = ?'); params.push(Number(studentId)); }
		if (studentName) { filters.push('s.NAME LIKE ?'); params.push(`${studentName}%`); }
		if (status) { filters.push('a.STATUS = ?'); params.push(status); }
		if (from) { filters.push('a.ATTENDANCE_DATE >= ?'); params.push(from); }
		if (to) { filters.push('a.ATTENDANCE_DATE <= ?'); params.push(to); }
		const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
		const pageNum = Math.max(1, parseInt(page, 10) || 1);
		const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
		const offset = (pageNum - 1) * limitNum;

		const [rows] = await getPool().query(
			`SELECT a.*, s.NAME AS STUDENT_NAME, s.ROLL_NUMBER, s.CLASS
			 FROM Attendance a
			 JOIN Students s ON s.STUDENT_ID = a.STUDENT_ID
			 ${where} ORDER BY a.ATTENDANCE_DATE DESC, a.ATTENDANCE_ID DESC LIMIT ? OFFSET ?`,
			[...params, limitNum, offset]
		);
		const [countRows] = await getPool().query(
			`SELECT COUNT(*) as total FROM Attendance a JOIN Students s ON s.STUDENT_ID = a.STUDENT_ID ${where}`,
			params
		);
		res.json({ 
			data: rows, 
			pagination: { 
				page: pageNum, 
				limit: limitNum, 
				total: countRows[0].total, 
				pages: Math.ceil(countRows[0].total / limitNum) 
			} 
		});
	} catch (err) {
		res.status(500).json({ message: 'Server error', error: err.message });
	}
});

// Summary: counts for Present/Absent in a date range (defaults: last 30 days)
router.get('/summary/:studentId', async (req, res) => {
	try {
		const studentId = Number(req.params.studentId);
		let { from, to } = req.query;
		const today = new Date();
		if (!to) to = today.toISOString().slice(0, 10);
		if (!from) {
			const d = new Date(today);
			d.setDate(d.getDate() - 30);
			from = d.toISOString().slice(0, 10);
		}
		const [present] = await getPool().query(
			"SELECT COUNT(*) as present FROM Attendance WHERE STUDENT_ID=? AND STATUS='Present' AND ATTENDANCE_DATE BETWEEN ? AND ?",
			[studentId, from, to]
		);
		const [absent] = await getPool().query(
			"SELECT COUNT(*) as absent FROM Attendance WHERE STUDENT_ID=? AND STATUS='Absent' AND ATTENDANCE_DATE BETWEEN ? AND ?",
			[studentId, from, to]
		);
		res.json({ studentId, from, to, present: present[0].present, absent: absent[0].absent });
	} catch (err) {
		res.status(500).json({ message: 'Server error', error: err.message });
	}
});

// General summary for dashboard cards
router.get('/summary', async (req, res) => {
	try {
		const today = new Date().toISOString().slice(0, 10);
		const currentMonth = new Date().toISOString().slice(0, 7);
		const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
		
		// Present Today
		const [presentToday] = await getPool().query(
			"SELECT COUNT(*) as count FROM Attendance WHERE STATUS='Present' AND ATTENDANCE_DATE = ?",
			[today]
		);
		
		// Absent Today
		const [absentToday] = await getPool().query(
			"SELECT COUNT(*) as count FROM Attendance WHERE STATUS='Absent' AND ATTENDANCE_DATE = ?",
			[today]
		);
		
		// This Month (total attendance records)
		const [thisMonth] = await getPool().query(
			"SELECT COUNT(*) as count FROM Attendance WHERE ATTENDANCE_DATE >= ?",
			[firstDayOfMonth]
		);
		
		// Attendance Rate (Present / Total for today)
		const totalToday = presentToday[0].count + absentToday[0].count;
		const attendanceRate = totalToday > 0 ? Math.round((presentToday[0].count / totalToday) * 100) : 0;
		
		res.json({
			presentToday: presentToday[0].count,
			absentToday: absentToday[0].count,
			thisMonth: thisMonth[0].count,
			attendanceRate: attendanceRate
		});
	} catch (err) {
		res.status(500).json({ message: 'Server error', error: err.message });
	}
});

module.exports = router;
