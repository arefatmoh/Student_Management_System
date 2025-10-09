# Student Management System - Railway Deployment Guide

## 🚀 Automatic Database Initialization

Your Student Management System now includes **automatic database initialization**! When you first start the application, it will:

1. ✅ **Create all necessary tables** automatically
2. ✅ **Insert sample data** (students, classes, subjects, etc.)
3. ✅ **Create default users** with secure passwords
4. ✅ **Set up database indexes** for optimal performance

## 🔑 Default Login Credentials

After the first startup, you can log in with:

- **Admin Account**: `admin` / `admin123`
- **Teacher Account**: `teacher` / `teacher123`

## 📋 What Gets Created Automatically

### 🗄️ Database Tables:
- **Users** - User accounts and authentication
- **Students** - Student information and records
- **Classes** - Class and grade management
- **Subjects** - Subject and course management
- **Marks** - Student grades and assessments
- **Attendance** - Daily attendance tracking
- **Fees** - Fee management and payments
- **Notices** - School announcements

### 👥 Sample Data:
- **2 Default Users** (admin, teacher)
- **6 Sample Classes** (Grade 1-3, Sections A & B)
- **8 Sample Subjects** (Math, English, Science, etc.)
- **5 Sample Students** with complete profiles
- **Sample Marks** and attendance records
- **Sample Fees** and payment records
- **Sample Notices** and announcements

## 🚀 Railway Deployment Steps

### 1. **Set Up Railway Project**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway new
```

### 2. **Add MySQL Database**
- In Railway dashboard, click "New Service"
- Select "Database" → "MySQL"
- Railway will automatically provide connection details

### 3. **Configure Environment Variables**
In your Railway project settings, add these environment variables:

```env
DB_HOST=your-railway-mysql-host
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-railway-mysql-password
DB_NAME=railway
SESSION_SECRET=your-super-secret-session-key-here
NODE_ENV=production
```

### 4. **Deploy Your Application**
```bash
# Deploy to Railway
railway up

# Or connect to GitHub and auto-deploy
railway connect
```

## 🎯 What Happens on First Startup

1. **Server starts** and connects to Railway MySQL
2. **Database initialization** runs automatically
3. **All tables created** with proper relationships
4. **Sample data inserted** for immediate testing
5. **Default users created** with secure passwords
6. **Application ready** for use!

## 🔧 Manual Database Reset (If Needed)

If you need to reset the database:

```sql
-- Connect to your Railway MySQL database
-- Run this to reset everything
DROP DATABASE IF EXISTS student_management;
-- The application will recreate everything on next startup
```

## 📊 Database Schema Overview

### Core Tables:
- **Users**: Authentication and user management
- **Students**: Student profiles and information
- **Classes**: Grade and section management
- **Subjects**: Course and subject management

### Academic Tables:
- **Marks**: Student grades and assessments
- **Attendance**: Daily attendance tracking
- **Fees**: Financial management

### Communication:
- **Notices**: School announcements and updates

## 🎉 Ready to Use!

After deployment, your Student Management System will be fully functional with:

- ✅ **Complete database schema**
- ✅ **Sample data for testing**
- ✅ **Default admin and teacher accounts**
- ✅ **All features working immediately**

## 🔐 Security Notes

- **Change default passwords** after first login
- **Update session secret** for production
- **Configure CORS** for your domain
- **Set up SSL** for secure connections

## 📞 Support

If you encounter any issues:

1. Check Railway logs for error messages
2. Verify environment variables are set correctly
3. Ensure MySQL database is running
4. Check network connectivity

Your Student Management System is now ready for production use! 🚀
