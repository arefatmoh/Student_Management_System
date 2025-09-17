const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// Attendance report: totals per status in date range, optional class filter
router.get('/attendance', async (req, res) => {
	try {
		let { from, to, class: className } = req.query;
		const today = new Date();
		if (!to) to = today.toISOString().slice(0, 10);
		if (!from) {
			const d = new Date(today);
			d.setDate(d.getDate() - 30);
			from = d.toISOString().slice(0, 10);
		}
		let where = 'WHERE a.ATTENDANCE_DATE BETWEEN ? AND ?';
		const params = [from, to];
		if (className) { where += ' AND s.CLASS = ?'; params.push(className); }
		const sql = `
			SELECT a.STATUS, COUNT(*) as count
			FROM Attendance a
			JOIN Students s ON s.STUDENT_ID = a.STUDENT_ID
			${where}
			GROUP BY a.STATUS
		`;
		const [rows] = await getPool().query(sql, params);
		const present = rows.find(r => r.STATUS === 'Present')?.count || 0;
		const absent = rows.find(r => r.STATUS === 'Absent')?.count || 0;
		res.json({ from, to, class: className || null, present, absent });
	} catch (err) {
		res.status(500).json({ message: 'Server error', error: err.message });
	}
});

// Fees report: totals by status and overall, optional class filter
router.get('/fees', async (req, res) => {
	try {
		const { class: className, from, to } = req.query;
		let where = 'WHERE 1=1';
		const params = [];
		if (className) { where += ' AND s.CLASS = ?'; params.push(className); }
		if (from) { where += ' AND f.PAID_DATE >= ?'; params.push(from); }
		if (to) { where += ' AND f.PAID_DATE <= ?'; params.push(to); }
		const sql = `
			SELECT f.STATUS, IFNULL(SUM(f.FEE_AMOUNT),0) as total
			FROM Fees f
			JOIN Students s ON s.STUDENT_ID = f.STUDENT_ID
			${where}
			GROUP BY f.STATUS
		`;
		const [rows] = await getPool().query(sql, params);
		const totalPaid = rows.find(r => r.STATUS === 'Paid')?.total || 0;
		const totalPending = rows.find(r => r.STATUS === 'Pending')?.total || 0;
		res.json({ class: className || null, from: from || null, to: to || null, totalPaid, totalPending, total: totalPaid + totalPending });
	} catch (err) {
		res.status(500).json({ message: 'Server error', error: err.message });
	}
});

// Performance report: for each student -> attendance rate and fee status
router.get('/performance', async (req, res) => {
	try {
		const { class: className, from, to, page = 1, limit = 10 } = req.query;
		const pageNum = Math.max(1, parseInt(page, 10) || 1);
		const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
		const offset = (pageNum - 1) * limitNum;

		let dateFilter = '';
		const dateParams = [];
		if (from) { dateFilter += ' AND a.ATTENDANCE_DATE >= ?'; dateParams.push(from); }
		if (to) { dateFilter += ' AND a.ATTENDANCE_DATE <= ?'; dateParams.push(to); }

		let classFilter = '';
		const classParams = [];
		if (className) { classFilter = ' WHERE s.CLASS = ?'; classParams.push(className); }

		const sql = `
			SELECT s.STUDENT_ID, s.NAME, s.ROLL_NUMBER, s.CLASS,
			  SUM(CASE WHEN a.STATUS='Present' THEN 1 ELSE 0 END) AS presentCount,
			  COUNT(a.ATTENDANCE_ID) AS totalDays,
			  (SELECT IFNULL(SUM(f.FEE_AMOUNT),0) FROM Fees f WHERE f.STUDENT_ID = s.STUDENT_ID AND f.STATUS='Pending') AS pendingFees
			FROM Students s
			LEFT JOIN Attendance a ON a.STUDENT_ID = s.STUDENT_ID ${dateFilter}
			${classFilter}
			GROUP BY s.STUDENT_ID
			ORDER BY s.STUDENT_ID DESC
			LIMIT ? OFFSET ?
		`;
		const params = [...dateParams, ...classParams, limitNum, offset];
		const [rows] = await getPool().query(sql, params);
		const results = rows.map(r => {
			const attendanceRate = r.totalDays ? Math.round((r.presentCount / r.totalDays) * 100) : 0;
			return {
				STUDENT_ID: r.STUDENT_ID,
				NAME: r.NAME,
				ROLL_NUMBER: r.ROLL_NUMBER,
				CLASS: r.CLASS,
				attendanceRate,
				pendingFees: Number(r.pendingFees)
			};
		});
		res.json({ data: results, page: pageNum, limit: limitNum });
	} catch (err) {
		res.status(500).json({ message: 'Server error', error: err.message });
	}
});

module.exports = router;
