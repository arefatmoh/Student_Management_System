const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// Record a fee payment
router.post('/', async (req, res) => {
	try {
		const { STUDENT_ID, FEE_AMOUNT, PAID_DATE, STATUS, MONTH_PAID } = req.body || {};
		if (!STUDENT_ID || !FEE_AMOUNT) {
			return res.status(400).json({ message: 'STUDENT_ID and FEE_AMOUNT are required' });
		}
		const statusValue = STATUS === 'Paid' || STATUS === 'Pending' ? STATUS : 'Pending';
		const today = new Date();
		const paidDateValue = PAID_DATE || today.toISOString().slice(0,10);
		const monthPaidValue = MONTH_PAID || (paidDateValue ? paidDateValue.slice(0,7) : null);
		// Support multiple months (comma-separated YYYY-MM list)
		const months = String(monthPaidValue || '').split(',').map(m => m.trim()).filter(Boolean);
		if (months.length > 1) {
			const conn = await getPool().getConnection();
			try {
				await conn.beginTransaction();
				for (const m of months) {
					await conn.query(
						'INSERT INTO Fees (STUDENT_ID, FEE_AMOUNT, PAID_DATE, MONTH_PAID, STATUS) VALUES (?, ?, ?, ?, ?)',
						[STUDENT_ID, FEE_AMOUNT, paidDateValue, m, statusValue]
					);
				}
				await conn.commit();
			} catch (e) {
				await conn.rollback();
				throw e;
			} finally {
				conn.release();
			}
			return res.status(201).json({ message: 'Payments recorded for multiple months' });
		}
		const [result] = await getPool().query(
			'INSERT INTO Fees (STUDENT_ID, FEE_AMOUNT, PAID_DATE, MONTH_PAID, STATUS) VALUES (?, ?, ?, ?, ?)',
			[STUDENT_ID, FEE_AMOUNT, paidDateValue, monthPaidValue, statusValue]
		);
		const [rows] = await getPool().query('SELECT * FROM Fees WHERE FEE_ID = ?', [result.insertId]);
		res.status(201).json(rows[0]);
	} catch (err) {
		res.status(500).json({ message: 'Server error', error: err.message });
	}
});

// List fees with filters (by student, status, date range)
router.get('/', async (req, res) => {
	try {
		const { studentId, studentName, status, from, to, month, page = 1, limit = 10 } = req.query;
		const filters = [];
		const params = [];
		if (studentId) { filters.push('f.STUDENT_ID = ?'); params.push(Number(studentId)); }
		if (studentName) { filters.push('s.NAME LIKE ?'); params.push(`${studentName}%`); }
		if (status) { filters.push('f.STATUS = ?'); params.push(status); }
		if (from) { filters.push('f.PAID_DATE >= ?'); params.push(from); }
		if (to) { filters.push('f.PAID_DATE <= ?'); params.push(to); }
		if (month) { filters.push('f.MONTH_PAID = ?'); params.push(month); }
		const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
		const pageNum = Math.max(1, parseInt(page, 10) || 1);
		const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
		const offset = (pageNum - 1) * limitNum;

		const [rows] = await getPool().query(
			`SELECT f.*, s.NAME AS STUDENT_NAME, s.ROLL_NUMBER, s.CLASS
			 FROM Fees f
			 JOIN Students s ON s.STUDENT_ID = f.STUDENT_ID
			 ${where}
			 ORDER BY f.FEE_ID DESC LIMIT ? OFFSET ?`,
			[...params, limitNum, offset]
		);
		const [countRows] = await getPool().query(
			`SELECT COUNT(*) as total FROM Fees f JOIN Students s ON s.STUDENT_ID=f.STUDENT_ID ${where}`,
			params
		);
		res.json({ data: rows, pagination: { page: pageNum, limit: limitNum, total: countRows[0].total, pages: Math.ceil(countRows[0].total / limitNum) } });
	} catch (err) {
		res.status(500).json({ message: 'Server error', error: err.message });
	}
});

// Summary cards data: total paid, total pending, this month, total students
router.get('/summary', async (req, res) => {
    try {
        const pool = getPool();
        const yyyyMm = new Date().toISOString().slice(0,7);

        const [[paid]] = await pool.query(
            "SELECT IFNULL(SUM(FEE_AMOUNT),0) AS totalPaid FROM Fees WHERE STATUS='Paid'"
        );
        const [[pending]] = await pool.query(
            "SELECT IFNULL(SUM(FEE_AMOUNT),0) AS totalPending FROM Fees WHERE STATUS='Pending'"
        );
        const [[thisMonth]] = await pool.query(
            'SELECT IFNULL(SUM(FEE_AMOUNT),0) AS thisMonth FROM Fees WHERE STATUS=\'Paid\' AND MONTH_PAID = ?',[yyyyMm]
        );
        const [[students]] = await pool.query(
            'SELECT COUNT(*) AS totalStudents FROM Students'
        );

        res.json({
            totalPaid: Number(paid.totalPaid || 0),
            totalPending: Number(pending.totalPending || 0),
            thisMonth: Number(thisMonth.thisMonth || 0),
            totalStudents: Number(students.totalStudents || 0)
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get fee by id (receipt data)
router.get('/:id', async (req, res) => {
	try {
		const id = Number(req.params.id);
		const [rows] = await getPool().query('SELECT * FROM Fees WHERE FEE_ID = ?', [id]);
		if (!rows.length) return res.status(404).json({ message: 'Fee record not found' });
		res.json(rows[0]);
	} catch (err) {
		res.status(500).json({ message: 'Server error', error: err.message });
	}
});

// Summary for a student (paid vs pending totals)
router.get('/summary/:studentId', async (req, res) => {
	try {
		const studentId = Number(req.params.studentId);
		const [paid] = await getPool().query(
			"SELECT IFNULL(SUM(FEE_AMOUNT),0) as totalPaid FROM Fees WHERE STUDENT_ID=? AND STATUS='Paid'",
			[studentId]
		);
		const [pending] = await getPool().query(
			"SELECT IFNULL(SUM(FEE_AMOUNT),0) as totalPending FROM Fees WHERE STUDENT_ID=? AND STATUS='Pending'",
			[studentId]
		);
		res.json({ studentId, totalPaid: paid[0].totalPaid, totalPending: pending[0].totalPending });
	} catch (err) {
		res.status(500).json({ message: 'Server error', error: err.message });
	}
});

// Update fee status (Paid/Pending)
router.patch('/:id/status', async (req, res) => {
	try {
		const id = Number(req.params.id);
		const { STATUS } = req.body || {};
		if (STATUS !== 'Paid' && STATUS !== 'Pending') {
			return res.status(400).json({ message: 'STATUS must be Paid or Pending' });
		}
		await getPool().query('UPDATE Fees SET STATUS=? WHERE FEE_ID=?', [STATUS, id]);
		const [rows] = await getPool().query('SELECT * FROM Fees WHERE FEE_ID = ?', [id]);
		if (!rows.length) return res.status(404).json({ message: 'Fee record not found' });
		res.json(rows[0]);
	} catch (err) {
		res.status(500).json({ message: 'Server error', error: err.message });
	}
});

module.exports = router;
