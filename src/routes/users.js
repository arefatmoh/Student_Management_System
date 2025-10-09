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
    console.log('Multer destination - Creating directory:', uploadDir);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('Directory created:', uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'profile-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Multer filename - Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('Multer fileFilter - Processing file:', file.originalname, file.mimetype);
    if (file.mimetype.startsWith('image/')) {
      console.log('File accepted by multer');
      cb(null, true);
    } else {
      console.log('File rejected by multer - not an image');
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// All routes in this file require admin
router.use(requireRole('admin'));

// List users
router.get('/', async (req, res) => {
  const [rows] = await getPool().query('SELECT USER_ID, USERNAME, ROLE, PROFILE_PICTURE FROM Users ORDER BY USER_ID DESC');
  console.log('=== LIST USERS DEBUG ===');
  console.log('All users in database:', rows);
  console.log('=== END LIST USERS DEBUG ===');
  res.json(rows);
});

// Create user
router.post('/', upload.single('profilePicture'), async (req, res) => {
  try {
    const { username, password, role } = req.body || {};
    console.log('=== USER CREATION DEBUG ===');
    console.log('📝 Request body:', { username, password: '***', role });
    console.log('📁 Uploaded file:', req.file);
    
    if (req.file) {
      console.log('📸 File details:');
      console.log('  - Original name:', req.file.originalname);
      console.log('  - Filename:', req.file.filename);
      console.log('  - Path:', req.file.path);
      console.log('  - Size:', req.file.size, 'bytes');
      console.log('  - Mime type:', req.file.mimetype);
    } else {
      console.log('❌ No file uploaded');
    }
    
    if (!username || !password || !role) return res.status(400).json({ message: 'username, password, role required' });
    
    const hash = await bcrypt.hash(password, 10);
    let profilePicturePath = null;
    
    // Handle profile picture if uploaded
    if (req.file) {
      profilePicturePath = `uploads/profiles/${req.file.filename}`;
      console.log('✅ Profile picture path set:', profilePicturePath);
    } else {
      console.log('⚠️ No profile picture uploaded');
    }
    
    console.log('💾 About to insert user into database:');
    console.log('  - Username:', username);
    console.log('  - Role:', role);
    console.log('  - Profile Picture Path:', profilePicturePath);
    
    // Insert user with profile picture
    const [result] = await getPool().query(
      'INSERT INTO Users (USERNAME, PASSWORD_HASH, ROLE, PROFILE_PICTURE) VALUES (?, ?, ?, ?)', 
      [username, hash, role, profilePicturePath]
    );
    
    console.log('✅ User created successfully with ID:', result.insertId);
    
    // Verify the user was inserted correctly
    const [newUser] = await getPool().query(
      'SELECT USER_ID, USERNAME, ROLE, PROFILE_PICTURE FROM Users WHERE USER_ID = ?', 
      [result.insertId]
    );
    
    console.log('🔍 Verification - User in database:', newUser[0]);
    console.log('=== END USER CREATION DEBUG ===');
    
    res.status(201).json({ 
      id: result.insertId,
      username, 
      role, 
      profilePicture: profilePicturePath 
    });
  } catch (err) {
    console.error('Error creating user:', err);
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


