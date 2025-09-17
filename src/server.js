const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());

// Basic CORS for local dev (optional simple approach)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

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
app.get('/api/health/db', async (req, res) => {
  try {
    await getPool().query('SELECT 1');
    res.json({ db: 'ok' });
  } catch (err) {
    res.status(500).json({ db: 'error', message: err.message });
  }
});

// Routes
app.use('/api/students', studentsRouter);
app.use('/api/fees', feesRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/reports', reportsRouter);

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
