const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// List all marks (with student and subject names)
router.get('/', async (req, res) => {
  try {
    const [rows] = await getPool().query(
      `SELECT m.*, s.NAME AS SUBJECT_NAME, st.NAME AS STUDENT_NAME, st.ROLL_NUMBER
       FROM Marks m
       JOIN Subjects s ON s.SUBJECT_ID = m.SUBJECT_ID
       JOIN Students st ON st.STUDENT_ID = m.STUDENT_ID
       ORDER BY m.MARK_ID DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Record or update a mark (upsert by unique key)
router.post('/', async (req, res) => {
  try {
    const { STUDENT_ID, SUBJECT_ID, TERM, SCORE, MAX_SCORE } = req.body || {};
    if (!STUDENT_ID || !SUBJECT_ID || !TERM || SCORE == null) {
      return res.status(400).json({ message: 'STUDENT_ID, SUBJECT_ID, TERM, SCORE are required' });
    }
    await getPool().query(
      `INSERT INTO Marks (STUDENT_ID, SUBJECT_ID, TERM, SCORE, MAX_SCORE)
       VALUES (?, ?, ?, ?, COALESCE(?,100))
       ON DUPLICATE KEY UPDATE SCORE=VALUES(SCORE), MAX_SCORE=VALUES(MAX_SCORE)`,
      [STUDENT_ID, SUBJECT_ID, TERM, SCORE, MAX_SCORE]
    );
    const [rows] = await getPool().query(
      'SELECT * FROM Marks WHERE STUDENT_ID=? AND SUBJECT_ID=? AND TERM=?',
      [STUDENT_ID, SUBJECT_ID, TERM]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// List marks by student (optional term)
router.get('/student/:studentId', async (req, res) => {
  const studentId = Number(req.params.studentId);
  const { term } = req.query;
  const where = term ? 'AND m.TERM=?' : '';
  const params = term ? [studentId, term] : [studentId];
  const [rows] = await getPool().query(
    `SELECT m.*, s.NAME AS SUBJECT_NAME
     FROM Marks m JOIN Subjects s ON s.SUBJECT_ID=m.SUBJECT_ID
     WHERE m.STUDENT_ID=? ${where} ORDER BY s.NAME ASC`,
    params
  );
  res.json(rows);
});

// List marks by class (optional term)
router.get('/class/:classId', async (req, res) => {
  const classId = Number(req.params.classId);
  const { term } = req.query;
  const where = term ? 'AND m.TERM=?' : '';
  const params = term ? [classId, term] : [classId];
  const [rows] = await getPool().query(
    `SELECT m.*, s.NAME AS SUBJECT_NAME, st.NAME AS STUDENT_NAME, st.ROLL_NUMBER
     FROM Marks m
     JOIN Subjects s ON s.SUBJECT_ID=m.SUBJECT_ID
     JOIN Students st ON st.STUDENT_ID=m.STUDENT_ID
     WHERE s.CLASS_ID=? ${where}
     ORDER BY st.ROLL_NUMBER, s.NAME`,
    params
  );
  res.json(rows);
});

module.exports = router;


