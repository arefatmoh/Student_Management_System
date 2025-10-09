const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());

// Serve static files for profile pictures
app.use('/uploads', express.static('uploads'));

// Serve static files from public directory (for favicon, CSS, JS, etc.)
app.use(express.static('public'));
const session = require('express-session');
const authRouter = require('./routes/auth');

// Basic CORS for local dev (optional simple approach)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 },
}));

// Health route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// DB health check
const { getPool, initDb } = require('./db');
const studentsRouter = require('./routes/students');
const feesRouter = require('./routes/fees');
const attendanceRouter = require('./routes/attendance');
const reportsRouter = require('./routes/reports');
const usersRouter = require('./routes/users');
const classesRouter = require('./routes/classes');
const marksRouter = require('./routes/marks');
const invoicesRouter = require('./routes/invoices');
const paymentsRouter = require('./routes/payments');
const attendanceBulkRouter = require('./routes/attendance-bulk');
const importExportRouter = require('./routes/import-export');
const { requireAuth } = require('./middlewares/auth');
app.get('/api/health/db', async (req, res) => {
  try {
    await getPool().query('SELECT 1');
    res.json({ db: 'ok' });
  } catch (err) {
    res.status(500).json({ db: 'error', message: err.message });
  }
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/students', requireAuth, studentsRouter);
app.use('/api/fees', requireAuth, feesRouter);
app.use('/api/attendance', requireAuth, attendanceRouter);
app.use('/api/reports', requireAuth, reportsRouter);
app.use('/api/users', requireAuth, usersRouter);
app.use('/api/classes', requireAuth, classesRouter);
app.use('/api/marks', requireAuth, marksRouter);
app.use('/api/invoices', requireAuth, invoicesRouter);
app.use('/api/payments', requireAuth, paymentsRouter);
app.use('/api/attendance-bulk', requireAuth, attendanceBulkRouter);
app.use('/api/import-export', requireAuth, importExportRouter);

// Static frontend
const path = require('path');
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  try {
    await initDb();
    console.log('Database initialized');
  } catch (e) {
    console.error('DB init error:', e);
  }
  console.log(`Server running on http://localhost:${PORT}`);
});
