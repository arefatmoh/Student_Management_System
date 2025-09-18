const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { requireRole } = require('../middlewares/auth');

// Classes CRUD (admin only for create/delete)
router.get('/', async (req, res) => {
  const [rows] = await getPool().query('SELECT * FROM Classes ORDER BY CLASS_ID DESC');
  res.json(rows);
});

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { NAME } = req.body || {};
    if (!NAME) return res.status(400).json({ message: 'NAME required' });
    await getPool().query('INSERT INTO Classes (NAME) VALUES (?)', [NAME]);
    res.status(201).json({ NAME });
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


