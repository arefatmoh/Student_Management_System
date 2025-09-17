const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// Create student
router.post('/', async (req, res) => {
  try {
    const { NAME, ROLL_NUMBER, CLASS, PARENT_CONTACT } = req.body || {};
    if (!NAME || !ROLL_NUMBER || !CLASS) {
      return res.status(400).json({ message: 'NAME, ROLL_NUMBER, and CLASS are required' });
    }
    const [result] = await getPool().query(
      'INSERT INTO Students (NAME, ROLL_NUMBER, CLASS, PARENT_CONTACT) VALUES (?, ?, ?, ?)',
      [NAME, ROLL_NUMBER, CLASS, PARENT_CONTACT || null]
    );
    const [rows] = await getPool().query('SELECT * FROM Students WHERE STUDENT_ID = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'ROLL_NUMBER must be unique' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// List students with basic filters and pagination
router.get('/', async (req, res) => {
  try {
    const { name, roll, class: className, page = 1, limit = 10 } = req.query;
    const filters = [];
    const params = [];
    if (name) { filters.push('NAME LIKE ?'); params.push(`%${name}%`); }
    if (roll) { filters.push('ROLL_NUMBER LIKE ?'); params.push(`%${roll}%`); }
    if (className) { filters.push('CLASS = ?'); params.push(className); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const [rows] = await getPool().query(
      `SELECT * FROM Students ${where} ORDER BY STUDENT_ID DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    const [countRows] = await getPool().query(
      `SELECT COUNT(*) as total FROM Students ${where}`,
      params
    );
    res.json({ data: rows, page: pageNum, limit: limitNum, total: countRows[0].total });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get by id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await getPool().query('SELECT * FROM Students WHERE STUDENT_ID = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Student not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { NAME, ROLL_NUMBER, CLASS, PARENT_CONTACT } = req.body || {};
    if (!NAME || !ROLL_NUMBER || !CLASS) {
      return res.status(400).json({ message: 'NAME, ROLL_NUMBER, and CLASS are required' });
    }
    const [existing] = await getPool().query('SELECT * FROM Students WHERE STUDENT_ID = ?', [id]);
    if (!existing.length) return res.status(404).json({ message: 'Student not found' });
    await getPool().query(
      'UPDATE Students SET NAME=?, ROLL_NUMBER=?, CLASS=?, PARENT_CONTACT=? WHERE STUDENT_ID=?',
      [NAME, ROLL_NUMBER, CLASS, PARENT_CONTACT || null, id]
    );
    const [rows] = await getPool().query('SELECT * FROM Students WHERE STUDENT_ID = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'ROLL_NUMBER must be unique' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await getPool().query('SELECT * FROM Students WHERE STUDENT_ID = ?', [id]);
    if (!existing.length) return res.status(404).json({ message: 'Student not found' });
    await getPool().query('DELETE FROM Students WHERE STUDENT_ID = ?', [id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;


