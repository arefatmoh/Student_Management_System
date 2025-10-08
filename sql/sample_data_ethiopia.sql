-- Sample Data Seed (Ethiopian names, varied scenarios)
-- Run in the target database (ensure DB_NAME is selected)

SET FOREIGN_KEY_CHECKS = 0;

-- Clear existing data (child tables first)
TRUNCATE TABLE Payments;
TRUNCATE TABLE Invoices;
TRUNCATE TABLE Marks;
TRUNCATE TABLE Attendance;
TRUNCATE TABLE Fees;
TRUNCATE TABLE Sections;
TRUNCATE TABLE Subjects;
TRUNCATE TABLE Classes;
TRUNCATE TABLE Users;
TRUNCATE TABLE Students;

SET FOREIGN_KEY_CHECKS = 1;

-- Users
INSERT INTO Users (USER_ID, USERNAME, PASSWORD_HASH, ROLE) VALUES
  (1, 'admin', '$2b$10$T8Vp1lJk6W8qQfF6c7YH7eQxJrB6qvZ3v0x2cVv6m7oJf6n0Q3a5a', 'admin'), -- placeholder hash
  (2, 'teacher', '$2b$10$T8Vp1lJk6W8qQfF6c7YH7eQxJrB6qvZ3v0x2cVv6m7oJf6n0Q3a5a', 'teacher');

-- Classes
INSERT INTO Classes (CLASS_ID, NAME, DESCRIPTION) VALUES
  (1, 'Grade 1', 'Entry level grade'),
  (2, 'Grade 2', 'Primary grade'),
  (3, 'Grade 3', 'Primary grade'),
  (4, 'Grade 4', 'Primary grade');

-- Sections
INSERT INTO Sections (SECTION_ID, CLASS_ID, NAME) VALUES
  (1, 1, 'A'), (2, 1, 'B'),
  (3, 2, 'A'), (4, 2, 'B'),
  (5, 3, 'A'), (6, 3, 'B'),
  (7, 4, 'A'), (8, 4, 'B');

-- Subjects
INSERT INTO Subjects (SUBJECT_ID, NAME, CODE, DESCRIPTION) VALUES
  (1, 'Amharic', 'AMH', 'Amharic language'),
  (2, 'English', 'ENG', 'English language'),
  (3, 'Mathematics', 'MATH', 'Mathematics'),
  (4, 'Science', 'SCI', 'Science'),
  (5, 'Social Studies', 'SOC', 'Social studies'),
  (6, 'Afan Oromo', 'AFO', 'Oromo language'),
  (7, 'Tigrinya', 'TIG', 'Tigrinya language'),
  (8, 'ICT', 'ICT', 'Information and Communication Technology');

-- Students (CLASS is free-text; use class names)
INSERT INTO Students (STUDENT_ID, NAME, ROLL_NUMBER, CLASS, PARENT_CONTACT) VALUES
  (1, 'Abel Tadesse', 'G1-001', 'Grade 1', '+251911111111'),
  (2, 'Mekdes Alemu', 'G1-002', 'Grade 1', '+251922222222'),
  (3, 'Hanna Getachew', 'G1-003', 'Grade 1', '+251933333333'),
  (4, 'Selamawit Tesfaye', 'G2-001', 'Grade 2', '+251944444444'),
  (5, 'Biruk Hailemariam', 'G2-002', 'Grade 2', '+251955555555'),
  (6, 'Yonas Abebe', 'G2-003', 'Grade 2', '+251966666666'),
  (7, 'Saron Kebede', 'G3-001', 'Grade 3', '+251977777777'),
  (8, 'Nahom Bekele', 'G3-002', 'Grade 3', '+251988888888'),
  (9, 'Liya Worku', 'G3-003', 'Grade 3', '+251990000000'),
  (10, 'Tigist Fikre', 'G4-001', 'Grade 4', '+251911222333'),
  (11, 'Samuel Nigussie', 'G4-002', 'Grade 4', '+251912345678'),
  (12, 'Rahwa Girmay', 'G4-003', 'Grade 4', '+251913579246'),
  (13, 'Dawit Eshetu', 'G2-004', 'Grade 2', '+251914111222'),
  (14, 'Eden Yohannes', 'G1-004', 'Grade 1', '+251915333444'),
  (15, 'Mulu Habte', 'G3-004', 'Grade 3', '+251916555666'),
  (16, 'Hiwot Adane', 'G4-004', 'Grade 4', '+251917777888'),
  (17, 'Kidus Tsegaye', 'G1-005', 'Grade 1', '+251918999000'),
  (18, 'Ruth Assefa', 'G2-005', 'Grade 2', '+251919101112'),
  (19, 'Yared Mulatu', 'G3-005', 'Grade 3', '+251920131415'),
  (20, 'Mahder Solomon', 'G4-005', 'Grade 4', '+251921161718');

-- Attendance (mix of Present/Absent across dates)
INSERT INTO Attendance (ATTENDANCE_ID, STUDENT_ID, ATTENDANCE_DATE, STATUS) VALUES
  (1, 1, '2024-10-01', 'Present'),
  (2, 1, '2024-10-02', 'Absent'),
  (3, 2, '2024-10-01', 'Present'),
  (4, 2, '2024-10-02', 'Present'),
  (5, 3, '2024-10-01', 'Absent'),
  (6, 3, '2024-10-02', 'Present'),
  (7, 4, '2024-10-01', 'Present'),
  (8, 4, '2024-10-02', 'Present'),
  (9, 5, '2024-10-01', 'Present'),
  (10, 5, '2024-10-02', 'Absent'),
  (11, 6, '2024-10-01', 'Absent'),
  (12, 6, '2024-10-02', 'Absent'),
  (13, 7, '2024-10-01', 'Present'),
  (14, 8, '2024-10-01', 'Present'),
  (15, 9, '2024-10-01', 'Present'),
  (16, 10, '2024-10-01', 'Absent'),
  (17, 11, '2024-10-01', 'Present'),
  (18, 12, '2024-10-01', 'Present'),
  (19, 13, '2024-10-01', 'Absent'),
  (20, 14, '2024-10-01', 'Present');

-- Marks (vary subjects, terms, and scores)
INSERT INTO Marks (MARK_ID, STUDENT_ID, SUBJECT_ID, TERM, SCORE, MAX_SCORE) VALUES
  (1, 1, 1, 'Term 1', 85, 100),
  (2, 1, 3, 'Term 1', 92, 100),
  (3, 2, 2, 'Term 1', 74, 100),
  (4, 2, 3, 'Term 1', 66, 100),
  (5, 3, 4, 'Term 1', 58, 100),
  (6, 3, 1, 'Term 1', 81, 100),
  (7, 4, 5, 'Term 1', 90, 100),
  (8, 4, 2, 'Term 1', 88, 100),
  (9, 5, 3, 'Term 1', 45, 100),
  (10, 6, 3, 'Term 1', 63, 100),
  (11, 7, 6, 'Term 1', 79, 100),
  (12, 8, 7, 'Term 1', 71, 100),
  (13, 9, 8, 'Term 1', 95, 100),
  (14, 10, 1, 'Term 1', 52, 100),
  (15, 11, 2, 'Term 1', 88, 100),
  (16, 12, 3, 'Term 1', 69, 100),
  (17, 13, 4, 'Term 1', 77, 100),
  (18, 14, 5, 'Term 1', 83, 100),
  (19, 15, 6, 'Term 1', 91, 100),
  (20, 16, 7, 'Term 1', 62, 100),
  (21, 17, 8, 'Term 1', 86, 100),
  (22, 18, 1, 'Term 1', 73, 100),
  (23, 19, 2, 'Term 1', 68, 100),
  (24, 20, 3, 'Term 1', 59, 100);

-- Fees (mix of months and statuses)
INSERT INTO Fees (FEE_ID, STUDENT_ID, FEE_AMOUNT, PAID_DATE, MONTH_PAID, STATUS) VALUES
  (1, 1, 500.00, '2024-09-05', '2024-09', 'Paid'),
  (2, 1, 500.00, '2024-10-05', '2024-10', 'Paid'),
  (3, 2, 500.00, NULL, '2024-10', 'Pending'),
  (4, 3, 450.00, '2024-10-02', '2024-10', 'Paid'),
  (5, 4, 500.00, '2024-09-07', '2024-09', 'Paid'),
  (6, 4, 500.00, NULL, '2024-10', 'Pending'),
  (7, 5, 500.00, '2024-10-03', '2024-10', 'Paid'),
  (8, 6, 500.00, NULL, '2024-10', 'Pending'),
  (9, 7, 480.00, '2024-09-06', '2024-09', 'Paid'),
  (10, 7, 480.00, '2024-10-06', '2024-10', 'Paid'),
  (11, 8, 480.00, NULL, '2024-10', 'Pending'),
  (12, 9, 480.00, '2024-10-04', '2024-10', 'Paid'),
  (13, 10, 520.00, NULL, '2024-10', 'Pending'),
  (14, 11, 520.00, '2024-10-02', '2024-10', 'Paid'),
  (15, 12, 520.00, NULL, '2024-10', 'Pending'),
  (16, 13, 500.00, '2024-09-08', '2024-09', 'Paid'),
  (17, 14, 500.00, '2024-10-02', '2024-10', 'Paid'),
  (18, 15, 480.00, '2024-09-10', '2024-09', 'Paid'),
  (19, 16, 520.00, NULL, '2024-10', 'Pending'),
  (20, 17, 500.00, '2024-10-01', '2024-10', 'Paid');

-- Invoices (varied statuses)
INSERT INTO Invoices (INVOICE_ID, STUDENT_ID, INVOICE_NUMBER, DESCRIPTION, TOTAL_AMOUNT, PAID_AMOUNT, DUE_DATE, STATUS, CREATED_AT) VALUES
  (1, 1, 'INV-2024-0001', 'September tuition', 500.00, 500.00, '2024-09-10', 'Paid', '2024-09-01 09:00:00'),
  (2, 1, 'INV-2024-0002', 'October tuition', 500.00, 500.00, '2024-10-10', 'Paid', '2024-10-01 09:00:00'),
  (3, 2, 'INV-2024-0003', 'October tuition', 500.00, 0.00, '2024-10-10', 'Pending', '2024-10-01 09:05:00'),
  (4, 4, 'INV-2024-0004', 'October tuition', 500.00, 250.00, '2024-10-10', 'Partially Paid', '2024-10-02 10:00:00'),
  (5, 5, 'INV-2024-0005', 'October tuition', 500.00, 500.00, '2024-10-10', 'Paid', '2024-10-02 10:05:00'),
  (6, 8, 'INV-2024-0006', 'October tuition', 480.00, 0.00, '2024-10-10', 'Overdue', '2024-10-01 09:10:00'),
  (7, 11, 'INV-2024-0007', 'October tuition', 520.00, 520.00, '2024-10-10', 'Paid', '2024-10-01 11:00:00'),
  (8, 13, 'INV-2024-0008', 'September tuition', 500.00, 500.00, '2024-09-10', 'Paid', '2024-09-01 08:30:00'),
  (9, 16, 'INV-2024-0009', 'October tuition', 520.00, 0.00, '2024-10-10', 'Pending', '2024-10-03 08:30:00');

-- Payments (for paid or partial invoices)
INSERT INTO Payments (PAYMENT_ID, INVOICE_ID, AMOUNT, PAYMENT_DATE, PAYMENT_METHOD, NOTES, CREATED_AT) VALUES
  (1, 1, 500.00, '2024-09-05', 'Cash', 'Full payment', '2024-09-05 12:00:00'),
  (2, 2, 500.00, '2024-10-05', 'Bank Transfer', 'Full payment', '2024-10-05 12:00:00'),
  (3, 4, 250.00, '2024-10-06', 'Cash', 'First installment', '2024-10-06 10:30:00'),
  (4, 5, 500.00, '2024-10-03', 'Card', 'Full payment', '2024-10-03 09:30:00'),
  (5, 7, 520.00, '2024-10-02', 'Cash', 'Full payment', '2024-10-02 11:30:00'),
  (6, 8, 500.00, '2024-09-08', 'Cash', 'September paid', '2024-09-08 14:00:00');

-- Additional diverse scenarios
-- Multiple months paid by same student (Kidus Tsegaye - id 17)
INSERT INTO Fees (FEE_ID, STUDENT_ID, FEE_AMOUNT, PAID_DATE, MONTH_PAID, STATUS) VALUES
  (21, 17, 500.00, '2024-09-02', '2024-09', 'Paid');

INSERT INTO Invoices (INVOICE_ID, STUDENT_ID, INVOICE_NUMBER, DESCRIPTION, TOTAL_AMOUNT, PAID_AMOUNT, DUE_DATE, STATUS, CREATED_AT) VALUES
  (10, 17, 'INV-2024-0010', 'September tuition', 500.00, 500.00, '2024-09-10', 'Paid', '2024-09-01 10:00:00'),
  (11, 17, 'INV-2024-0011', 'October tuition', 500.00, 0.00, '2024-10-10', 'Pending', '2024-10-01 10:00:00');

INSERT INTO Payments (PAYMENT_ID, INVOICE_ID, AMOUNT, PAYMENT_DATE, PAYMENT_METHOD, NOTES, CREATED_AT) VALUES
  (7, 10, 500.00, '2024-09-02', 'Cash', 'Full payment', '2024-09-02 09:00:00');

-- Partially paid then completed (Rahwa Girmay - id 12)
INSERT INTO Invoices (INVOICE_ID, STUDENT_ID, INVOICE_NUMBER, DESCRIPTION, TOTAL_AMOUNT, PAID_AMOUNT, DUE_DATE, STATUS, CREATED_AT) VALUES
  (12, 12, 'INV-2024-0012', 'October tuition', 520.00, 300.00, '2024-10-10', 'Partially Paid', '2024-10-02 12:00:00');

INSERT INTO Payments (PAYMENT_ID, INVOICE_ID, AMOUNT, PAYMENT_DATE, PAYMENT_METHOD, NOTES, CREATED_AT) VALUES
  (8, 12, 300.00, '2024-10-04', 'Bank Transfer', 'Partial', '2024-10-04 15:00:00');

-- Overdue without payment (Nahom Bekele - id 8 already has invoice 6 overdue)

-- Done.


