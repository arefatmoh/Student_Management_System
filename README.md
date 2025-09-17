Student Management System (Beginner-Friendly)

Simple full-stack app for managing Students, Fees, Attendance, and Reports.

Tech Stack
- Backend: Node.js + Express
- Database: MySQL
- Frontend: HTML, CSS, JavaScript (vanilla)
- Tools: Postman, Git/GitHub

Quick Start
1. Install Node.js (LTS) and MySQL.
2. Install dependencies:
   npm install
3. Create env file:
   copy .env.example .env
   Edit .env (DB credentials). Default DB name is student_management.
4. Start MySQL service.
5. Run the app (auto-creates DB and tables):
   npm run dev
6. Open the UI:
   - Dashboard: http://localhost:3000/
   - Students: http://localhost:3000/students.html
   - Fees: http://localhost:3000/fees.html
   - Attendance: http://localhost:3000/attendance.html
   - Reports: http://localhost:3000/reports.html

API Overview
- Health: GET /api/health, /api/health/db

Students
- POST /api/students { NAME, ROLL_NUMBER, CLASS, PARENT_CONTACT? }
- GET /api/students ?name=&roll=&class=&page=&limit=
- GET /api/students/:id
- PUT /api/students/:id { NAME, ROLL_NUMBER, CLASS, PARENT_CONTACT? }
- DELETE /api/students/:id

Fees
- POST /api/fees { STUDENT_ID, FEE_AMOUNT, PAID_DATE?, STATUS(Paid|Pending) }
- GET /api/fees ?studentId=&status=&from=&to=&page=&limit=
- GET /api/fees/:id
- GET /api/fees/summary/:studentId
- PATCH /api/fees/:id/status { STATUS }

Attendance
- POST /api/attendance { STUDENT_ID, ATTENDANCE_DATE, STATUS(Present|Absent) }
- GET /api/attendance ?studentId=&status=&from=&to=&page=&limit=
- GET /api/attendance/summary/:studentId ?from=&to=

Reports
- GET /api/reports/attendance ?class=&from=&to=
- GET /api/reports/fees ?class=&from=&to=
- GET /api/reports/performance ?class=&from=&to=&page=&limit=

Database Schema
- Students(STUDENT_ID PK, NAME, ROLL_NUMBER unique, CLASS, PARENT_CONTACT)
- Fees(FEE_ID PK, STUDENT_ID FK, FEE_AMOUNT, PAID_DATE, STATUS enum)
- Attendance(ATTENDANCE_ID PK, STUDENT_ID FK, ATTENDANCE_DATE, STATUS enum, unique(STUDENT_ID, ATTENDANCE_DATE))

Tables are created automatically on server start.

Postman
- Collection at postman/StudentManagement.postman_collection.json
- Import in Postman and run against http://localhost:3000

Notes
- Beginner-friendly code (no ORM). For production, add auth and validation.


