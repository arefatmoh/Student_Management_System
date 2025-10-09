const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { getPool } = require('../db');
const { requireRole } = require('../middlewares/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/profiles';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// All routes in this file require admin
router.use(requireRole('admin'));

// List users
router.get('/', async (req, res) => {
  const [rows] = await getPool().query('SELECT USER_ID, USERNAME, ROLE, PROFILE_PICTURE FROM Users ORDER BY USER_ID DESC');
  res.json(rows);
});

// Create user
router.post('/', upload.single('profilePicture'), async (req, res) => {
  try {
    const { username, password, role } = req.body || {};
    if (!username || !password || !role) return res.status(400).json({ message: 'username, password, role required' });
    
    const hash = await bcrypt.hash(password, 10);
    let profilePicturePath = null;
    
    // Handle profile picture if uploaded
    if (req.file) {
      profilePicturePath = req.file.filename;
    }
    
    // Insert user with profile picture
    const [result] = await getPool().query(
      'INSERT INTO Users (USERNAME, PASSWORD_HASH, ROLE, PROFILE_PICTURE) VALUES (?, ?, ?, ?)', 
      [username, hash, role, profilePicturePath]
    );
    
    res.status(201).json({ 
      id: result.insertId,
      username, 
      role, 
      profilePicture: profilePicturePath 
    });
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


