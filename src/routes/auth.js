const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { getPool } = require('../db');

// Ensure at least one admin user exists (simple seed)
async function ensureAdminSeed() {
  const [rows] = await getPool().query('SELECT COUNT(*) as c FROM Users');
  if (rows[0].c === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await getPool().query('INSERT INTO Users (USERNAME, PASSWORD_HASH, ROLE) VALUES (?, ?, ?)', ['admin', hash, 'admin']);
  }
}

router.post('/login', async (req, res) => {
  try {
    await ensureAdminSeed();
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ message: 'username and password are required' });
    const [users] = await getPool().query('SELECT * FROM Users WHERE USERNAME=?', [username]);
    if (!users.length) return res.status(401).json({ message: 'Invalid credentials' });
    const user = users[0];
    const ok = await bcrypt.compare(password, user.PASSWORD_HASH);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    req.session.user = { id: user.USER_ID, username: user.USERNAME, role: user.ROLE };
    res.json({ id: user.USER_ID, username: user.USERNAME, role: user.ROLE });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

router.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'Not logged in' });
  res.json(req.session.user);
});

module.exports = router;


