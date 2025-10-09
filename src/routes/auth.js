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

router.get('/me', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'Not logged in' });
  
  try {
    console.log('=== AUTH /ME DEBUG ===');
    console.log('Session user ID:', req.session.user.id);
    
    // Fetch complete user data including profile picture
    const [users] = await getPool().query('SELECT USER_ID, USERNAME, ROLE, PROFILE_PICTURE FROM Users WHERE USER_ID = ?', [req.session.user.id]);
    console.log('User query result:', users);
    
    if (users.length > 0) {
      const user = users[0];
      console.log('User data from database:', user);
      console.log('Profile picture value:', user.PROFILE_PICTURE);
      console.log('Profile picture type:', typeof user.PROFILE_PICTURE);
      
      const response = {
        id: user.USER_ID,
        username: user.USERNAME,
        role: user.ROLE,
        PROFILE_PICTURE: user.PROFILE_PICTURE
      };
      
      console.log('Sending response:', response);
      console.log('=== END AUTH /ME DEBUG ===');
      res.json(response);
    } else {
      // Fallback to session data if user not found in database
      console.log('User not found in database, using session data');
      console.log('=== END AUTH /ME DEBUG ===');
      res.json(req.session.user);
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    console.log('=== END AUTH /ME DEBUG ===');
    // Fallback to session data on error
    res.json(req.session.user);
  }
});

module.exports = router;


