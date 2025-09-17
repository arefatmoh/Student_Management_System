const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// Record a fee payment
router.post('/', async (req, res) => {
	try {
		const { STUDENT_ID, FEE_AMOUNT, PAID_DATE, STATUS } = req.body || {};
		if (!STUDENT_ID || !FEE_AMOUNT) {
			return res.status(400).json({ message: 'STUDENT_ID and FEE_AMOUNT are required' });
		}
		const statusValue = STATUS === 'Paid' || STATUS === 'Pending' ? STATUS : 'Pending';
		const paidDateValue = PAID_DATE || null;
		const [result] = await getPool().query(
			'INSERT INTO Fees (STUDENT_ID, FEE_AMOUNT, PAID_DATE, STATUS) VALUES (?, ?, ?, ?)',
			[STUDENT_ID, FEE_AMOUNT, paidDateValue, statusValue]
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
		const { studentId, status, from, to, page = 1, limit = 10 } = req.query;
		const filters = [];
		const params = [];
		if (studentId) { filters.push('STUDENT_ID = ?'); params.push(Number(studentId)); }
		if (status) { filters.push('STATUS = ?'); params.push(status); }
		if (from) { filters.push('PAID_DATE >= ?'); params.push(from); }
		if (to) { filters.push('PAID_DATE <= ?'); params.push(to); }
		const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
		const pageNum = Math.max(1, parseInt(page, 10) || 1);
		const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
		const offset = (pageNum - 1) * limitNum;

		const [rows] = await getPool().query(
			`SELECT * FROM Fees ${where} ORDER BY FEE_ID DESC LIMIT ? OFFSET ?`,
			[...params, limitNum, offset]
		);
		const [countRows] = await getPool().query(
			`SELECT COUNT(*) as total FROM Fees ${where}`,
			params
		);
		res.json({ data: rows, page: pageNum, limit: limitNum, total: countRows[0].total });
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
