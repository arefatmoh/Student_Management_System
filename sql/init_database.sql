-- Student Management System Database Initialization
-- This script creates all necessary tables and default users

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS student_management;
USE student_management;

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON Users(USERNAME);
CREATE INDEX IF NOT EXISTS idx_users_role ON Users(ROLE);
CREATE INDEX IF NOT EXISTS idx_users_profile_picture ON Users(PROFILE_PICTURE);
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON Students(ROLL_NUMBER);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON Students(CLASS_ID);
CREATE INDEX IF NOT EXISTS idx_students_status ON Students(STATUS);
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON Marks(STUDENT_ID);
CREATE INDEX IF NOT EXISTS idx_marks_subject_id ON Marks(SUBJECT_ID);
CREATE INDEX IF NOT EXISTS idx_marks_exam_type ON Marks(EXAM_TYPE);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON Attendance(STUDENT_ID);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON Attendance(DATE);
CREATE INDEX IF NOT EXISTS idx_fees_student_id ON Fees(STUDENT_ID);
CREATE INDEX IF NOT EXISTS idx_fees_status ON Fees(STATUS);
CREATE INDEX IF NOT EXISTS idx_fees_due_date ON Fees(DUE_DATE);
CREATE INDEX IF NOT EXISTS idx_notices_target_audience ON Notices(TARGET_AUDIENCE);
CREATE INDEX IF NOT EXISTS idx_notices_is_active ON Notices(IS_ACTIVE);
CREATE INDEX IF NOT EXISTS idx_notices_published_at ON Notices(PUBLISHED_AT);

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO Users (USERNAME, PASSWORD, ROLE) VALUES 
('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Insert default teacher user (password: teacher123)
INSERT IGNORE INTO Users (USERNAME, PASSWORD, ROLE) VALUES 
('teacher', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher');

-- Insert sample classes
INSERT IGNORE INTO Classes (CLASS_NAME, SECTION, ACADEMIC_YEAR, CAPACITY, ROOM_NUMBER) VALUES 
('Grade 1', 'A', '2024-2025', 30, 'Room 101'),
('Grade 1', 'B', '2024-2025', 30, 'Room 102'),
('Grade 2', 'A', '2024-2025', 30, 'Room 201'),
('Grade 2', 'B', '2024-2025', 30, 'Room 202'),
('Grade 3', 'A', '2024-2025', 30, 'Room 301'),
('Grade 3', 'B', '2024-2025', 30, 'Room 302');

-- Insert sample subjects
INSERT IGNORE INTO Subjects (SUBJECT_NAME, SUBJECT_CODE, CLASS_ID, CREDITS, DESCRIPTION) VALUES 
('Mathematics', 'MATH-101', 1, 4, 'Basic mathematics for Grade 1'),
('English', 'ENG-101', 1, 3, 'English language and literature'),
('Science', 'SCI-101', 1, 3, 'Basic science concepts'),
('Social Studies', 'SOC-101', 1, 2, 'Social studies and history'),
('Mathematics', 'MATH-201', 3, 4, 'Advanced mathematics for Grade 2'),
('English', 'ENG-201', 3, 3, 'Advanced English language'),
('Science', 'SCI-201', 3, 3, 'Advanced science concepts'),
('Social Studies', 'SOC-201', 3, 2, 'Advanced social studies');

-- Insert sample students
INSERT IGNORE INTO Students (NAME, ROLL_NUMBER, EMAIL, PHONE, DATE_OF_BIRTH, GENDER, CLASS_ID, PARENT_NAME, PARENT_PHONE, STATUS) VALUES 
('John Doe', 'STU001', 'john.doe@example.com', '+1234567890', '2018-05-15', 'Male', 1, 'Jane Doe', '+1234567891', 'Active'),
('Alice Smith', 'STU002', 'alice.smith@example.com', '+1234567892', '2018-03-22', 'Female', 1, 'Bob Smith', '+1234567893', 'Active'),
('Mike Johnson', 'STU003', 'mike.johnson@example.com', '+1234567894', '2018-07-10', 'Male', 1, 'Sarah Johnson', '+1234567895', 'Active'),
('Emma Wilson', 'STU004', 'emma.wilson@example.com', '+1234567896', '2018-01-18', 'Female', 3, 'David Wilson', '+1234567897', 'Active'),
('Tom Brown', 'STU005', 'tom.brown@example.com', '+1234567898', '2017-11-25', 'Male', 3, 'Lisa Brown', '+1234567899', 'Active');

-- Insert sample marks
INSERT IGNORE INTO Marks (STUDENT_ID, SUBJECT_ID, EXAM_TYPE, MARKS_OBTAINED, TOTAL_MARKS, EXAM_DATE, REMARKS) VALUES 
(1, 1, 'Quiz', 18, 20, '2024-10-01', 'Good performance'),
(1, 2, 'Quiz', 16, 20, '2024-10-02', 'Needs improvement'),
(2, 1, 'Quiz', 20, 20, '2024-10-01', 'Excellent'),
(2, 2, 'Quiz', 19, 20, '2024-10-02', 'Very good'),
(3, 1, 'Quiz', 15, 20, '2024-10-01', 'Average performance'),
(4, 5, 'Quiz', 17, 20, '2024-10-01', 'Good work'),
(5, 5, 'Quiz', 19, 20, '2024-10-01', 'Excellent');

-- Insert sample attendance
INSERT IGNORE INTO Attendance (STUDENT_ID, CLASS_ID, DATE, STATUS, REMARKS) VALUES 
(1, 1, '2024-10-01', 'Present', 'On time'),
(2, 1, '2024-10-01', 'Present', 'On time'),
(3, 1, '2024-10-01', 'Late', 'Arrived 10 minutes late'),
(4, 3, '2024-10-01', 'Present', 'On time'),
(5, 3, '2024-10-01', 'Absent', 'Sick leave');

-- Insert sample fees
INSERT IGNORE INTO Fees (STUDENT_ID, FEE_TYPE, AMOUNT, DUE_DATE, STATUS, REMARKS) VALUES 
(1, 'Tuition', 500.00, '2024-10-15', 'Pending', 'Monthly tuition fee'),
(2, 'Tuition', 500.00, '2024-10-15', 'Pending', 'Monthly tuition fee'),
(3, 'Tuition', 500.00, '2024-10-15', 'Paid', 'Paid on time'),
(4, 'Tuition', 600.00, '2024-10-15', 'Pending', 'Monthly tuition fee'),
(5, 'Tuition', 600.00, '2024-10-15', 'Pending', 'Monthly tuition fee');

-- Insert sample notices
INSERT IGNORE INTO Notices (TITLE, CONTENT, TARGET_AUDIENCE, PRIORITY, PUBLISHED_BY, EXPIRES_AT) VALUES 
('Welcome to New Academic Year', 'Welcome all students and parents to the new academic year 2024-2025. We are excited to have you with us!', 'All', 'High', 1, '2024-12-31 23:59:59'),
('Parent-Teacher Meeting', 'Parent-teacher meeting is scheduled for October 15th, 2024. Please contact the school office to book your slot.', 'Parents', 'Medium', 1, '2024-10-20 23:59:59'),
('Sports Day Announcement', 'Annual sports day will be held on November 1st, 2024. All students are encouraged to participate.', 'Students', 'Medium', 1, '2024-11-05 23:59:59'),
('Library Rules', 'Please remember to return books on time and maintain silence in the library. New books have been added to the collection.', 'Students', 'Low', 1, '2024-12-31 23:59:59');

-- Create a view for student summary
CREATE OR REPLACE VIEW StudentSummary AS
SELECT 
    s.STUDENT_ID,
    s.NAME,
    s.ROLL_NUMBER,
    s.EMAIL,
    s.PHONE,
    c.CLASS_NAME,
    c.SECTION,
    s.STATUS,
    s.ENROLLMENT_DATE,
    COUNT(DISTINCT a.ATTENDANCE_ID) as TOTAL_ATTENDANCE,
    COUNT(DISTINCT CASE WHEN a.STATUS = 'Present' THEN a.ATTENDANCE_ID END) as PRESENT_DAYS,
    ROUND(
        (COUNT(DISTINCT CASE WHEN a.STATUS = 'Present' THEN a.ATTENDANCE_ID END) / 
         NULLIF(COUNT(DISTINCT a.ATTENDANCE_ID), 0)) * 100, 2
    ) as ATTENDANCE_PERCENTAGE
FROM Students s
LEFT JOIN Classes c ON s.CLASS_ID = c.CLASS_ID
LEFT JOIN Attendance a ON s.STUDENT_ID = a.STUDENT_ID
GROUP BY s.STUDENT_ID, s.NAME, s.ROLL_NUMBER, s.EMAIL, s.PHONE, c.CLASS_NAME, c.SECTION, s.STATUS, s.ENROLLMENT_DATE;

-- Create a view for fee summary
CREATE OR REPLACE VIEW FeeSummary AS
SELECT 
    s.STUDENT_ID,
    s.NAME,
    s.ROLL_NUMBER,
    c.CLASS_NAME,
    c.SECTION,
    SUM(f.AMOUNT) as TOTAL_FEES,
    SUM(CASE WHEN f.STATUS = 'Paid' THEN f.AMOUNT ELSE 0 END) as PAID_AMOUNT,
    SUM(CASE WHEN f.STATUS = 'Pending' THEN f.AMOUNT ELSE 0 END) as PENDING_AMOUNT,
    SUM(CASE WHEN f.STATUS = 'Overdue' THEN f.AMOUNT ELSE 0 END) as OVERDUE_AMOUNT
FROM Students s
LEFT JOIN Classes c ON s.CLASS_ID = c.CLASS_ID
LEFT JOIN Fees f ON s.STUDENT_ID = f.STUDENT_ID
GROUP BY s.STUDENT_ID, s.NAME, s.ROLL_NUMBER, c.CLASS_NAME, c.SECTION;
