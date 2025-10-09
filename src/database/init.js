const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { getPool } = require('../db');

// Database initialization module
class DatabaseInitializer {
    constructor() {
        this.pool = null;
        this.isInitialized = false;
    }

    // Use existing database pool
    async createPool() {
        try {
            this.pool = getPool();
            console.log('✅ Using existing database connection pool');
            return this.pool;
        } catch (error) {
            console.error('❌ Error getting database pool:', error);
            throw error;
        }
    }

    // Check if database is already initialized
    async isDatabaseInitialized() {
        try {
            const [tables] = await this.pool.query("SHOW TABLES LIKE 'Users'");
            return tables.length > 0;
        } catch (error) {
            console.log('🔍 Database not initialized yet');
            return false;
        }
    }

    // Initialize database with tables and default data
    async initializeDatabase() {
        try {
            console.log('🚀 Starting database initialization...');
            
            // Check if already initialized
            if (await this.isDatabaseInitialized()) {
                console.log('✅ Database already initialized');
                this.isInitialized = true;
                return;
            }

            console.log('📝 Creating database tables...');
            await this.createTables();
            
            console.log('👤 Creating default users...');
            await this.createDefaultUsers();
            
            console.log('📊 Inserting sample data...');
            await this.insertSampleData();
            
            this.isInitialized = true;
            console.log('🎉 Database initialization completed successfully!');
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    // Create all database tables
    async createTables() {
        const createTablesSQL = `
            -- Users table
            CREATE TABLE IF NOT EXISTS Users (
                USER_ID INT AUTO_INCREMENT PRIMARY KEY,
                USERNAME VARCHAR(50) UNIQUE NOT NULL,
                PASSWORD VARCHAR(255) NOT NULL,
                ROLE ENUM('admin', 'teacher', 'student') NOT NULL,
                PROFILE_PICTURE VARCHAR(255) NULL,
                CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );

            -- Students table
            CREATE TABLE IF NOT EXISTS Students (
                STUDENT_ID INT AUTO_INCREMENT PRIMARY KEY,
                NAME VARCHAR(100) NOT NULL,
                ROLL_NUMBER VARCHAR(20) UNIQUE NOT NULL,
                EMAIL VARCHAR(100) UNIQUE,
                PHONE VARCHAR(20),
                ADDRESS TEXT,
                DATE_OF_BIRTH DATE,
                GENDER ENUM('Male', 'Female', 'Other'),
                CLASS_ID INT,
                PARENT_NAME VARCHAR(100),
                PARENT_PHONE VARCHAR(20),
                ENROLLMENT_DATE DATE DEFAULT (CURRENT_DATE),
                STATUS ENUM('Active', 'Inactive', 'Graduated') DEFAULT 'Active',
                CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );

            -- Classes table
            CREATE TABLE IF NOT EXISTS Classes (
                CLASS_ID INT AUTO_INCREMENT PRIMARY KEY,
                CLASS_NAME VARCHAR(50) NOT NULL,
                SECTION VARCHAR(10),
                ACADEMIC_YEAR VARCHAR(20),
                CAPACITY INT DEFAULT 30,
                ROOM_NUMBER VARCHAR(20),
                CLASS_TEACHER_ID INT,
                CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );

            -- Subjects table
            CREATE TABLE IF NOT EXISTS Subjects (
                SUBJECT_ID INT AUTO_INCREMENT PRIMARY KEY,
                SUBJECT_NAME VARCHAR(100) NOT NULL,
                SUBJECT_CODE VARCHAR(20) UNIQUE,
                CLASS_ID INT,
                TEACHER_ID INT,
                CREDITS INT DEFAULT 1,
                DESCRIPTION TEXT,
                CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );

            -- Marks table
            CREATE TABLE IF NOT EXISTS Marks (
                MARK_ID INT AUTO_INCREMENT PRIMARY KEY,
                STUDENT_ID INT NOT NULL,
                SUBJECT_ID INT NOT NULL,
                EXAM_TYPE ENUM('Quiz', 'Midterm', 'Final', 'Assignment', 'Project') NOT NULL,
                MARKS_OBTAINED DECIMAL(5,2) NOT NULL,
                TOTAL_MARKS DECIMAL(5,2) NOT NULL,
                PERCENTAGE DECIMAL(5,2) GENERATED ALWAYS AS ((MARKS_OBTAINED / TOTAL_MARKS) * 100) STORED,
                GRADE VARCHAR(2),
                EXAM_DATE DATE,
                REMARKS TEXT,
                CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (STUDENT_ID) REFERENCES Students(STUDENT_ID) ON DELETE CASCADE,
                FOREIGN KEY (SUBJECT_ID) REFERENCES Subjects(SUBJECT_ID) ON DELETE CASCADE
            );

            -- Attendance table
            CREATE TABLE IF NOT EXISTS Attendance (
                ATTENDANCE_ID INT AUTO_INCREMENT PRIMARY KEY,
                STUDENT_ID INT NOT NULL,
                CLASS_ID INT NOT NULL,
                DATE DATE NOT NULL,
                STATUS ENUM('Present', 'Absent', 'Late', 'Excused') DEFAULT 'Present',
                REMARKS TEXT,
                CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (STUDENT_ID) REFERENCES Students(STUDENT_ID) ON DELETE CASCADE,
                FOREIGN KEY (CLASS_ID) REFERENCES Classes(CLASS_ID) ON DELETE CASCADE,
                UNIQUE KEY unique_attendance (STUDENT_ID, DATE)
            );

            -- Fees table
            CREATE TABLE IF NOT EXISTS Fees (
                FEE_ID INT AUTO_INCREMENT PRIMARY KEY,
                STUDENT_ID INT NOT NULL,
                FEE_TYPE ENUM('Tuition', 'Library', 'Sports', 'Transport', 'Exam', 'Other') NOT NULL,
                AMOUNT DECIMAL(10,2) NOT NULL,
                DUE_DATE DATE NOT NULL,
                PAID_DATE DATE NULL,
                STATUS ENUM('Pending', 'Paid', 'Overdue', 'Waived') DEFAULT 'Pending',
                PAYMENT_METHOD ENUM('Cash', 'Bank Transfer', 'Card', 'Cheque') NULL,
                TRANSACTION_ID VARCHAR(100),
                REMARKS TEXT,
                CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (STUDENT_ID) REFERENCES Students(STUDENT_ID) ON DELETE CASCADE
            );

            -- Notices table
            CREATE TABLE IF NOT EXISTS Notices (
                NOTICE_ID INT AUTO_INCREMENT PRIMARY KEY,
                TITLE VARCHAR(200) NOT NULL,
                CONTENT TEXT NOT NULL,
                TARGET_AUDIENCE ENUM('All', 'Students', 'Teachers', 'Parents') DEFAULT 'All',
                PRIORITY ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
                PUBLISHED_BY INT,
                PUBLISHED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                EXPIRES_AT TIMESTAMP NULL,
                IS_ACTIVE BOOLEAN DEFAULT TRUE,
                CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (PUBLISHED_BY) REFERENCES Users(USER_ID) ON DELETE SET NULL
            );
        `;

        await this.pool.query(createTablesSQL);
        console.log('✅ Database tables created successfully');

        // Create indexes
        await this.createIndexes();
    }

    // Create database indexes
    async createIndexes() {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_username ON Users(USERNAME)',
            'CREATE INDEX IF NOT EXISTS idx_users_role ON Users(ROLE)',
            'CREATE INDEX IF NOT EXISTS idx_users_profile_picture ON Users(PROFILE_PICTURE)',
            'CREATE INDEX IF NOT EXISTS idx_students_roll_number ON Students(ROLL_NUMBER)',
            'CREATE INDEX IF NOT EXISTS idx_students_class_id ON Students(CLASS_ID)',
            'CREATE INDEX IF NOT EXISTS idx_students_status ON Students(STATUS)',
            'CREATE INDEX IF NOT EXISTS idx_marks_student_id ON Marks(STUDENT_ID)',
            'CREATE INDEX IF NOT EXISTS idx_marks_subject_id ON Marks(SUBJECT_ID)',
            'CREATE INDEX IF NOT EXISTS idx_marks_exam_type ON Marks(EXAM_TYPE)',
            'CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON Attendance(STUDENT_ID)',
            'CREATE INDEX IF NOT EXISTS idx_attendance_date ON Attendance(DATE)',
            'CREATE INDEX IF NOT EXISTS idx_fees_student_id ON Fees(STUDENT_ID)',
            'CREATE INDEX IF NOT EXISTS idx_fees_status ON Fees(STATUS)',
            'CREATE INDEX IF NOT EXISTS idx_fees_due_date ON Fees(DUE_DATE)',
            'CREATE INDEX IF NOT EXISTS idx_notices_target_audience ON Notices(TARGET_AUDIENCE)',
            'CREATE INDEX IF NOT EXISTS idx_notices_is_active ON Notices(IS_ACTIVE)',
            'CREATE INDEX IF NOT EXISTS idx_notices_published_at ON Notices(PUBLISHED_AT)'
        ];

        for (const indexSQL of indexes) {
            await this.pool.query(indexSQL);
        }
        console.log('✅ Database indexes created successfully');
    }

    // Create default users (admin and teacher)
    async createDefaultUsers() {
        try {
            // Hash passwords
            const adminPassword = await bcrypt.hash('admin123', 10);
            const teacherPassword = await bcrypt.hash('teacher123', 10);

            // Insert default admin user
            await this.pool.query(`
                INSERT IGNORE INTO Users (USERNAME, PASSWORD, ROLE) VALUES 
                ('admin', ?, 'admin')
            `, [adminPassword]);

            // Insert default teacher user
            await this.pool.query(`
                INSERT IGNORE INTO Users (USERNAME, PASSWORD, ROLE) VALUES 
                ('teacher', ?, 'teacher')
            `, [teacherPassword]);

            console.log('✅ Default users created:');
            console.log('   👤 Admin: admin / admin123');
            console.log('   👤 Teacher: teacher / teacher123');
        } catch (error) {
            console.error('❌ Error creating default users:', error);
            throw error;
        }
    }

    // Insert sample data
    async insertSampleData() {
        try {
            // Insert sample classes
            await this.pool.query(`
                INSERT IGNORE INTO Classes (CLASS_NAME, SECTION, ACADEMIC_YEAR, CAPACITY, ROOM_NUMBER) VALUES 
                ('Grade 1', 'A', '2024-2025', 30, 'Room 101'),
                ('Grade 1', 'B', '2024-2025', 30, 'Room 102'),
                ('Grade 2', 'A', '2024-2025', 30, 'Room 201'),
                ('Grade 2', 'B', '2024-2025', 30, 'Room 202'),
                ('Grade 3', 'A', '2024-2025', 30, 'Room 301'),
                ('Grade 3', 'B', '2024-2025', 30, 'Room 302')
            `);

            // Insert sample subjects
            await this.pool.query(`
                INSERT IGNORE INTO Subjects (SUBJECT_NAME, SUBJECT_CODE, CLASS_ID, CREDITS, DESCRIPTION) VALUES 
                ('Mathematics', 'MATH-101', 1, 4, 'Basic mathematics for Grade 1'),
                ('English', 'ENG-101', 1, 3, 'English language and literature'),
                ('Science', 'SCI-101', 1, 3, 'Basic science concepts'),
                ('Social Studies', 'SOC-101', 1, 2, 'Social studies and history'),
                ('Mathematics', 'MATH-201', 3, 4, 'Advanced mathematics for Grade 2'),
                ('English', 'ENG-201', 3, 3, 'Advanced English language'),
                ('Science', 'SCI-201', 3, 3, 'Advanced science concepts'),
                ('Social Studies', 'SOC-201', 3, 2, 'Advanced social studies')
            `);

            // Insert sample students
            await this.pool.query(`
                INSERT IGNORE INTO Students (NAME, ROLL_NUMBER, EMAIL, PHONE, DATE_OF_BIRTH, GENDER, CLASS_ID, PARENT_NAME, PARENT_PHONE, STATUS) VALUES 
                ('John Doe', 'STU001', 'john.doe@example.com', '+1234567890', '2018-05-15', 'Male', 1, 'Jane Doe', '+1234567891', 'Active'),
                ('Alice Smith', 'STU002', 'alice.smith@example.com', '+1234567892', '2018-03-22', 'Female', 1, 'Bob Smith', '+1234567893', 'Active'),
                ('Mike Johnson', 'STU003', 'mike.johnson@example.com', '+1234567894', '2018-07-10', 'Male', 1, 'Sarah Johnson', '+1234567895', 'Active'),
                ('Emma Wilson', 'STU004', 'emma.wilson@example.com', '+1234567896', '2018-01-18', 'Female', 3, 'David Wilson', '+1234567897', 'Active'),
                ('Tom Brown', 'STU005', 'tom.brown@example.com', '+1234567898', '2017-11-25', 'Male', 3, 'Lisa Brown', '+1234567899', 'Active')
            `);

            // Insert sample marks
            await this.pool.query(`
                INSERT IGNORE INTO Marks (STUDENT_ID, SUBJECT_ID, EXAM_TYPE, MARKS_OBTAINED, TOTAL_MARKS, EXAM_DATE, REMARKS) VALUES 
                (1, 1, 'Quiz', 18, 20, '2024-10-01', 'Good performance'),
                (1, 2, 'Quiz', 16, 20, '2024-10-02', 'Needs improvement'),
                (2, 1, 'Quiz', 20, 20, '2024-10-01', 'Excellent'),
                (2, 2, 'Quiz', 19, 20, '2024-10-02', 'Very good'),
                (3, 1, 'Quiz', 15, 20, '2024-10-01', 'Average performance'),
                (4, 5, 'Quiz', 17, 20, '2024-10-01', 'Good work'),
                (5, 5, 'Quiz', 19, 20, '2024-10-01', 'Excellent')
            `);

            // Insert sample attendance
            await this.pool.query(`
                INSERT IGNORE INTO Attendance (STUDENT_ID, CLASS_ID, DATE, STATUS, REMARKS) VALUES 
                (1, 1, '2024-10-01', 'Present', 'On time'),
                (2, 1, '2024-10-01', 'Present', 'On time'),
                (3, 1, '2024-10-01', 'Late', 'Arrived 10 minutes late'),
                (4, 3, '2024-10-01', 'Present', 'On time'),
                (5, 3, '2024-10-01', 'Absent', 'Sick leave')
            `);

            // Insert sample fees
            await this.pool.query(`
                INSERT IGNORE INTO Fees (STUDENT_ID, FEE_TYPE, AMOUNT, DUE_DATE, STATUS, REMARKS) VALUES 
                (1, 'Tuition', 500.00, '2024-10-15', 'Pending', 'Monthly tuition fee'),
                (2, 'Tuition', 500.00, '2024-10-15', 'Pending', 'Monthly tuition fee'),
                (3, 'Tuition', 500.00, '2024-10-15', 'Paid', 'Paid on time'),
                (4, 'Tuition', 600.00, '2024-10-15', 'Pending', 'Monthly tuition fee'),
                (5, 'Tuition', 600.00, '2024-10-15', 'Pending', 'Monthly tuition fee')
            `);

            // Insert sample notices
            await this.pool.query(`
                INSERT IGNORE INTO Notices (TITLE, CONTENT, TARGET_AUDIENCE, PRIORITY, PUBLISHED_BY, EXPIRES_AT) VALUES 
                ('Welcome to New Academic Year', 'Welcome all students and parents to the new academic year 2024-2025. We are excited to have you with us!', 'All', 'High', 1, '2024-12-31 23:59:59'),
                ('Parent-Teacher Meeting', 'Parent-teacher meeting is scheduled for October 15th, 2024. Please contact the school office to book your slot.', 'Parents', 'Medium', 1, '2024-10-20 23:59:59'),
                ('Sports Day Announcement', 'Annual sports day will be held on November 1st, 2024. All students are encouraged to participate.', 'Students', 'Medium', 1, '2024-11-05 23:59:59'),
                ('Library Rules', 'Please remember to return books on time and maintain silence in the library. New books have been added to the collection.', 'Students', 'Low', 1, '2024-12-31 23:59:59')
            `);

            console.log('✅ Sample data inserted successfully');
        } catch (error) {
            console.error('❌ Error inserting sample data:', error);
            throw error;
        }
    }

    // Get database pool
    getPool() {
        return this.pool;
    }

    // Check if database is initialized
    getInitializationStatus() {
        return this.isInitialized;
    }
}

module.exports = DatabaseInitializer;