const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { requireRole } = require('../middlewares/auth');

// Classes CRUD (admin only for create/delete)
router.get('/', async (req, res) => {
  try {
    const [rows] = await getPool().query(`
      SELECT 
        c.*,
        COUNT(DISTINCT s.STUDENT_ID) as STUDENT_COUNT,
        COUNT(DISTINCT sub.SUBJECT_ID) as SUBJECT_COUNT
      FROM Classes c
      LEFT JOIN Students s ON c.NAME = s.CLASS
      LEFT JOIN Subjects sub ON c.CLASS_ID = sub.CLASS_ID
      GROUP BY c.CLASS_ID, c.NAME, c.DESCRIPTION
      ORDER BY c.CLASS_ID DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { NAME, DESCRIPTION } = req.body || {};
    if (!NAME) return res.status(400).json({ message: 'NAME required' });
    await getPool().query('INSERT INTO Classes (NAME, DESCRIPTION) VALUES (?, ?)', [NAME, DESCRIPTION || null]);
    res.status(201).json({ NAME, DESCRIPTION });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Class already exists' });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  await getPool().query('DELETE FROM Classes WHERE CLASS_ID=?', [id]);
  res.json({ message: 'Deleted' });
});

// General subjects endpoint (all subjects)
router.get('/subjects', async (req, res) => {
  try {
    const [rows] = await getPool().query(`
      SELECT s.*, c.NAME as CLASS_NAME 
      FROM Subjects s 
      JOIN Classes c ON s.CLASS_ID = c.CLASS_ID 
      ORDER BY s.SUBJECT_ID DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create subject (general endpoint)
router.post('/subjects', requireRole('admin'), async (req, res) => {
  try {
    const { CLASS_ID, NAME, CODE, DESCRIPTION } = req.body || {};
    if (!CLASS_ID || !NAME) return res.status(400).json({ message: 'CLASS_ID and NAME required' });
    await getPool().query('INSERT INTO Subjects (CLASS_ID, NAME, CODE, DESCRIPTION) VALUES (?, ?, ?, ?)', 
      [CLASS_ID, NAME, CODE || null, DESCRIPTION || null]);
    res.status(201).json({ CLASS_ID, NAME, CODE, DESCRIPTION });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Subject already exists for this class' });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get subject by ID
router.get('/subjects/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await getPool().query('SELECT * FROM Subjects WHERE SUBJECT_ID = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Subject not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update subject
router.put('/subjects/:id', requireRole('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { CLASS_ID, NAME, CODE, DESCRIPTION } = req.body || {};
    if (!CLASS_ID || !NAME) return res.status(400).json({ message: 'CLASS_ID and NAME required' });
    
    const [existing] = await getPool().query('SELECT * FROM Subjects WHERE SUBJECT_ID = ?', [id]);
    if (!existing.length) return res.status(404).json({ message: 'Subject not found' });
    
    await getPool().query(
      'UPDATE Subjects SET CLASS_ID=?, NAME=?, CODE=?, DESCRIPTION=? WHERE SUBJECT_ID=?',
      [CLASS_ID, NAME, CODE || null, DESCRIPTION || null, id]
    );
    
    const [rows] = await getPool().query('SELECT * FROM Subjects WHERE SUBJECT_ID = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Subject already exists for this class' });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete subject
router.delete('/subjects/:id', requireRole('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await getPool().query('SELECT * FROM Subjects WHERE SUBJECT_ID = ?', [id]);
    if (!existing.length) return res.status(404).json({ message: 'Subject not found' });
    
    await getPool().query('DELETE FROM Subjects WHERE SUBJECT_ID = ?', [id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Sections by Class
router.get('/:classId/sections', async (req, res) => {
  const classId = Number(req.params.classId);
  const [rows] = await getPool().query('SELECT * FROM Sections WHERE CLASS_ID=? ORDER BY SECTION_ID DESC', [classId]);
  res.json(rows);
});

router.post('/:classId/sections', requireRole('admin'), async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    const { NAME } = req.body || {};
    if (!NAME) return res.status(400).json({ message: 'NAME required' });
    await getPool().query('INSERT INTO Sections (CLASS_ID, NAME) VALUES (?, ?)', [classId, NAME]);
    res.status(201).json({ classId, NAME });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Section already exists for this class' });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/:classId/sections/:id', requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  await getPool().query('DELETE FROM Sections WHERE SECTION_ID=?', [id]);
  res.json({ message: 'Deleted' });
});

// Subjects by Class
router.get('/:classId/subjects', async (req, res) => {
  const classId = Number(req.params.classId);
  const [rows] = await getPool().query('SELECT * FROM Subjects WHERE CLASS_ID=? ORDER BY SUBJECT_ID DESC', [classId]);
  res.json(rows);
});

router.post('/:classId/subjects', requireRole('admin'), async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    const { NAME } = req.body || {};
    if (!NAME) return res.status(400).json({ message: 'NAME required' });
    await getPool().query('INSERT INTO Subjects (CLASS_ID, NAME) VALUES (?, ?)', [classId, NAME]);
    res.status(201).json({ classId, NAME });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Subject already exists for this class' });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/:classId/subjects/:id', requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  await getPool().query('DELETE FROM Subjects WHERE SUBJECT_ID=?', [id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;


