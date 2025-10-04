const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

let pool;

function createPool() {
  return mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
}

async function ensureDatabaseExists() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT || 3306),
    multipleStatements: true,
  });
  const dbName = process.env.DB_NAME;
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await connection.end();
}

async function initDb() {
  await ensureDatabaseExists();
  pool = createPool();
  const createStudents = `
    CREATE TABLE IF NOT EXISTS Students (
      STUDENT_ID INT AUTO_INCREMENT PRIMARY KEY,
      NAME VARCHAR(50) NOT NULL,
      ROLL_NUMBER VARCHAR(20) NOT NULL UNIQUE,
      CLASS VARCHAR(10) NOT NULL,
      PARENT_CONTACT VARCHAR(15)
    ) ENGINE=InnoDB;
  `;

  const createFees = `
    CREATE TABLE IF NOT EXISTS Fees (
      FEE_ID INT AUTO_INCREMENT PRIMARY KEY,
      STUDENT_ID INT NOT NULL,
      FEE_AMOUNT DECIMAL(10,2) NOT NULL,
      PAID_DATE DATE,
      STATUS ENUM('Paid','Pending') NOT NULL DEFAULT 'Pending',
      CONSTRAINT fk_fees_student FOREIGN KEY (STUDENT_ID)
        REFERENCES Students(STUDENT_ID) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `;

  const createAttendance = `
    CREATE TABLE IF NOT EXISTS Attendance (
      ATTENDANCE_ID INT AUTO_INCREMENT PRIMARY KEY,
      STUDENT_ID INT NOT NULL,
      ATTENDANCE_DATE DATE NOT NULL,
      STATUS ENUM('Present','Absent') NOT NULL,
      UNIQUE KEY uniq_student_date (STUDENT_ID, ATTENDANCE_DATE),
      CONSTRAINT fk_attendance_student FOREIGN KEY (STUDENT_ID)
        REFERENCES Students(STUDENT_ID) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `;

  const createUsers = `
    CREATE TABLE IF NOT EXISTS Users (
      USER_ID INT AUTO_INCREMENT PRIMARY KEY,
      USERNAME VARCHAR(30) NOT NULL UNIQUE,
      PASSWORD_HASH VARCHAR(100) NOT NULL,
      ROLE ENUM('admin','teacher') NOT NULL DEFAULT 'admin'
    ) ENGINE=InnoDB;
  `;

  const createClasses = `
    CREATE TABLE IF NOT EXISTS Classes (
      CLASS_ID INT AUTO_INCREMENT PRIMARY KEY,
      NAME VARCHAR(50) NOT NULL UNIQUE,
      DESCRIPTION TEXT
    ) ENGINE=InnoDB;
  `;

  const createSections = `
    CREATE TABLE IF NOT EXISTS Sections (
      SECTION_ID INT AUTO_INCREMENT PRIMARY KEY,
      CLASS_ID INT NOT NULL,
      NAME VARCHAR(50) NOT NULL,
      UNIQUE KEY uniq_class_section (CLASS_ID, NAME),
      CONSTRAINT fk_sections_class FOREIGN KEY (CLASS_ID)
        REFERENCES Classes(CLASS_ID) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `;

  const createSubjects = `
    CREATE TABLE IF NOT EXISTS Subjects (
      SUBJECT_ID INT AUTO_INCREMENT PRIMARY KEY,
      CLASS_ID INT NOT NULL,
      NAME VARCHAR(50) NOT NULL,
      UNIQUE KEY uniq_class_subject (CLASS_ID, NAME),
      CONSTRAINT fk_subjects_class FOREIGN KEY (CLASS_ID)
        REFERENCES Classes(CLASS_ID) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `;

  const createMarks = `
    CREATE TABLE IF NOT EXISTS Marks (
      MARK_ID INT AUTO_INCREMENT PRIMARY KEY,
      STUDENT_ID INT NOT NULL,
      SUBJECT_ID INT NOT NULL,
      TERM VARCHAR(20) NOT NULL,
      SCORE DECIMAL(5,2) NOT NULL,
      MAX_SCORE DECIMAL(5,2) NOT NULL DEFAULT 100,
      UNIQUE KEY uniq_mark (STUDENT_ID, SUBJECT_ID, TERM),
      CONSTRAINT fk_marks_student FOREIGN KEY (STUDENT_ID) REFERENCES Students(STUDENT_ID) ON DELETE CASCADE,
      CONSTRAINT fk_marks_subject FOREIGN KEY (SUBJECT_ID) REFERENCES Subjects(SUBJECT_ID) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `;

  const createInvoices = `
    CREATE TABLE IF NOT EXISTS Invoices (
      INVOICE_ID INT AUTO_INCREMENT PRIMARY KEY,
      STUDENT_ID INT NOT NULL,
      INVOICE_NUMBER VARCHAR(50) NOT NULL UNIQUE,
      DESCRIPTION VARCHAR(200) NOT NULL,
      TOTAL_AMOUNT DECIMAL(10,2) NOT NULL,
      PAID_AMOUNT DECIMAL(10,2) NOT NULL DEFAULT 0,
      DUE_DATE DATE NOT NULL,
      STATUS ENUM('Pending','Partially Paid','Paid','Overdue') NOT NULL DEFAULT 'Pending',
      CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_invoices_student FOREIGN KEY (STUDENT_ID)
        REFERENCES Students(STUDENT_ID) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `;

  const createPayments = `
    CREATE TABLE IF NOT EXISTS Payments (
      PAYMENT_ID INT AUTO_INCREMENT PRIMARY KEY,
      INVOICE_ID INT NOT NULL,
      AMOUNT DECIMAL(10,2) NOT NULL,
      PAYMENT_DATE DATE NOT NULL,
      PAYMENT_METHOD ENUM('Cash','Bank Transfer','Cheque','Card') NOT NULL DEFAULT 'Cash',
      NOTES VARCHAR(200),
      CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_payments_invoice FOREIGN KEY (INVOICE_ID)
        REFERENCES Invoices(INVOICE_ID) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `;

  await pool.query(createStudents);
  await pool.query(createFees);
  await pool.query(createAttendance);
  await pool.query(createUsers);
  await pool.query(createClasses);
  await pool.query(createSections);
  await pool.query(createSubjects);
  await pool.query(createMarks);
  await pool.query(createInvoices);
  await pool.query(createPayments);

  // Add DESCRIPTION column to Classes table if it doesn't exist
  try {
    await pool.query('ALTER TABLE Classes ADD COLUMN DESCRIPTION TEXT');
    console.log('Added DESCRIPTION column to Classes table');
  } catch (error) {
    // Column already exists, ignore error
    if (!error.message.includes('Duplicate column name')) {
      console.log('Note: DESCRIPTION column may already exist:', error.message);
    }
  }

  // Seed initial data
  try {
    const bcrypt = require('bcrypt');
    
    // Check if admin user exists
    const [adminUsers] = await pool.query('SELECT COUNT(*) as count FROM Users WHERE USERNAME = ?', ['admin']);
    if (adminUsers[0].count === 0) {
      const adminHash = await bcrypt.hash('admin123', 10);
      await pool.query('INSERT INTO Users (USERNAME, PASSWORD_HASH, ROLE) VALUES (?, ?, ?)', ['admin', adminHash, 'admin']);
      console.log('Admin user created: admin/admin123');
    }
    
    // Check if teacher user exists
    const [teacherUsers] = await pool.query('SELECT COUNT(*) as count FROM Users WHERE USERNAME = ?', ['teacher']);
    if (teacherUsers[0].count === 0) {
      const teacherHash = await bcrypt.hash('teacher123', 10);
      await pool.query('INSERT INTO Users (USERNAME, PASSWORD_HASH, ROLE) VALUES (?, ?, ?)', ['teacher', teacherHash, 'teacher']);
      console.log('Teacher user created: teacher/teacher123');
    }
    
    // Seed sample classes and subjects
    const [classCount] = await pool.query('SELECT COUNT(*) as count FROM Classes');
    if (classCount[0].count === 0) {
      await pool.query('INSERT INTO Classes (NAME) VALUES (?)', ['Grade 1']);
      await pool.query('INSERT INTO Classes (NAME) VALUES (?)', ['Grade 2']);
      await pool.query('INSERT INTO Classes (NAME) VALUES (?)', ['Grade 3']);
      console.log('Sample classes created');
    }
    
    const [subjectCount] = await pool.query('SELECT COUNT(*) as count FROM Subjects');
    if (subjectCount[0].count === 0) {
      const [classes] = await pool.query('SELECT CLASS_ID FROM Classes LIMIT 3');
      for (const cls of classes) {
        await pool.query('INSERT INTO Subjects (CLASS_ID, NAME) VALUES (?, ?)', [cls.CLASS_ID, 'Mathematics']);
        await pool.query('INSERT INTO Subjects (CLASS_ID, NAME) VALUES (?, ?)', [cls.CLASS_ID, 'English']);
        await pool.query('INSERT INTO Subjects (CLASS_ID, NAME) VALUES (?, ?)', [cls.CLASS_ID, 'Science']);
      }
      console.log('Sample subjects created');
    }
  } catch (error) {
    console.log('Note: Some seed data may already exist:', error.message);
  }
}
function getPool() {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

module.exports = { getPool, initDb };
