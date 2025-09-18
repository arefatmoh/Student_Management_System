const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { getPool } = require('../db');
const { requireRole } = require('../middlewares/auth');

// All routes in this file require admin
router.use(requireRole('admin'));

// List users
router.get('/', async (req, res) => {
  const [rows] = await getPool().query('SELECT USER_ID, USERNAME, ROLE FROM Users ORDER BY USER_ID DESC');
  res.json(rows);
});

// Create user
router.post('/', async (req, res) => {
  try {
    const { username, password, role } = req.body || {};
    if (!username || !password || !role) return res.status(400).json({ message: 'username, password, role required' });
    const hash = await bcrypt.hash(password, 10);
    await getPool().query('INSERT INTO Users (USERNAME, PASSWORD_HASH, ROLE) VALUES (?, ?, ?)', [username, hash, role]);
    res.status(201).json({ username, role });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'USERNAME must be unique' });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await getPool().query('DELETE FROM Users WHERE USER_ID=?', [id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;


