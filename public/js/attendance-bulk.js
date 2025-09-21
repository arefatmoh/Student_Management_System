let currentStudents = [];
let currentAttendanceData = {};
let currentDate = new Date().toISOString().split('T')[0];
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date
    document.getElementById('bulk-date').value = currentDate;
    
    // Load classes for filters
    loadClasses();
    
    // Load calendar for current month
    loadCalendar();
});

// Load classes for dropdowns
async function loadClasses() {
    try {
        const response = await apiFetch('/api/classes');
        const classes = response || [];
        
        const bulkFilter = document.getElementById('bulk-class-filter');
        const calendarFilter = document.getElementById('calendar-class-filter');
        
        // Clear existing options
        bulkFilter.innerHTML = '<option value="all">All Classes</option>';
        calendarFilter.innerHTML = '<option value="all">All Classes</option>';
        
        classes.forEach(cls => {
            const option1 = document.createElement('option');
            option1.value = cls.NAME;
            option1.textContent = cls.NAME;
            bulkFilter.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = cls.NAME;
            option2.textContent = cls.NAME;
            calendarFilter.appendChild(option2);
        });
    } catch (error) {
        console.error('Error loading classes:', error);
        showToast('Failed to load classes', 'error');
    }
}

// Switch between tabs
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');
    
    // Load data for calendar tab if switching to it
    if (tabName === 'calendar') {
        loadCalendar();
    }
}

// Load students for bulk marking
async function loadStudentsForBulk() {
    const date = document.getElementById('bulk-date').value;
    const classFilter = document.getElementById('bulk-class-filter').value;
    
    if (!date) {
        showToast('Please select a date', 'error');
        return;
    }
    
    try {
        currentDate = date;
        
        // Get students
        let url = '/api/students?limit=1000';
        if (classFilter !== 'all') {
            url += `&class=${classFilter}`;
        }
        
        const response = await apiFetch(url);
        currentStudents = response.students || [];
        
        // Get existing attendance for this date
        const attendanceResponse = await apiFetch(`/api/attendance?date=${date}&limit=1000`);
        const existingAttendance = attendanceResponse.attendance || [];
        
        // Create attendance lookup
        currentAttendanceData = {};
        existingAttendance.forEach(record => {
            currentAttendanceData[record.STUDENT_ID] = record.STATUS;
        });
        
        renderStudentList();
        showToast(`Loaded ${currentStudents.length} students`, 'success');
    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Failed to load students', 'error');
    }
}

// Render student list for bulk marking
function renderStudentList() {
    const container = document.getElementById('student-list');
    
    if (currentStudents.length === 0) {
        container.innerHTML = '<p class="text-center">No students found</p>';
        return;
    }
    
    container.innerHTML = currentStudents.map(student => {
        const currentStatus = currentAttendanceData[student.STUDENT_ID] || 'Present';
        return `
            <div class="student-item">
                <div class="student-info">
                    <strong>${student.NAME}</strong> (${student.ROLL_NUMBER}) - ${student.CLASS}
                </div>
                <div class="student-actions">
                    <button class="attendance-toggle ${currentStatus === 'Present' ? 'present' : ''}" 
                            onclick="toggleAttendance(${student.STUDENT_ID}, 'Present')">
                        Present
                    </button>
                    <button class="attendance-toggle ${currentStatus === 'Absent' ? 'absent' : ''}" 
                            onclick="toggleAttendance(${student.STUDENT_ID}, 'Absent')">
                        Absent
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Toggle attendance status for a student
function toggleAttendance(studentId, status) {
    currentAttendanceData[studentId] = status;
    renderStudentList();
}

// Mark all students as present
function markAllPresent() {
    currentStudents.forEach(student => {
        currentAttendanceData[student.STUDENT_ID] = 'Present';
    });
    renderStudentList();
    showToast('All students marked as present', 'success');
}

// Mark all students as absent
function markAllAbsent() {
    currentStudents.forEach(student => {
        currentAttendanceData[student.STUDENT_ID] = 'Absent';
    });
    renderStudentList();
    showToast('All students marked as absent', 'success');
}

// Save bulk attendance
async function saveBulkAttendance() {
    if (currentStudents.length === 0) {
        showToast('No students loaded', 'error');
        return;
    }
    
    const classFilter = document.getElementById('bulk-class-filter').value;
    
    try {
        const attendanceData = Object.entries(currentAttendanceData).map(([studentId, status]) => ({
            studentId: parseInt(studentId),
            status
        }));
        
        const response = await apiFetch('/api/attendance-bulk/bulk', {
            method: 'POST',
            body: JSON.stringify({
                date: currentDate,
                classFilter,
                attendanceData
            })
        });
        
        showToast(`Attendance saved for ${response.recordsCount} students`, 'success');
        
        // Reload the list to show updated data
        loadStudentsForBulk();
    } catch (error) {
        console.error('Error saving bulk attendance:', error);
        showToast('Failed to save attendance', 'error');
    }
}

// Calendar functions
async function loadCalendar() {
    const classFilter = document.getElementById('calendar-class-filter').value;
    
    try {
        const response = await apiFetch(`/api/attendance-bulk/calendar?year=${currentYear}&month=${currentMonth}&classFilter=${classFilter}`);
        
        currentStudents = response.students || [];
        renderCalendar(response.calendarData, currentYear, currentMonth);
        updateMonthDisplay();
    } catch (error) {
        console.error('Error loading calendar:', error);
        showToast('Failed to load calendar', 'error');
    }
}

// Render calendar
function renderCalendar(calendarData, year, month) {
    const container = document.getElementById('calendar-container');
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = dayHeaders.map(day => `<div class="calendar-day-header">${day}</div>`).join('');
    
    // Previous month's trailing days
    const prevMonth = new Date(year, month - 2, 0);
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonth.getDate() - i;
        html += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    // Current month's days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const isToday = today.getFullYear() === year && today.getMonth() === month - 1 && today.getDate() === day;
        const hasAttendance = calendarData[dateStr];
        
        let dayClass = 'calendar-day';
        if (isToday) dayClass += ' today';
        if (hasAttendance) dayClass += ' has-attendance';
        
        let attendanceIndicator = '';
        if (hasAttendance) {
            const presentCount = hasAttendance.filter(s => s.status === 'Present').length;
            const absentCount = hasAttendance.filter(s => s.status === 'Absent').length;
            const totalCount = hasAttendance.length;
            
            if (presentCount === totalCount) {
                attendanceIndicator = `<div class="attendance-indicator present-indicator">${presentCount}</div>`;
            } else if (absentCount === totalCount) {
                attendanceIndicator = `<div class="attendance-indicator absent-indicator">${absentCount}</div>`;
            } else {
                attendanceIndicator = `<div class="attendance-indicator" style="background: #f59e0b; color: white;">${presentCount}/${totalCount}</div>`;
            }
        }
        
        html += `
            <div class="calendar-day ${dayClass}" onclick="showAttendanceDetails('${dateStr}')">
                ${day}
                ${attendanceIndicator}
            </div>
        `;
    }
    
    // Next month's leading days
    const remainingDays = 42 - (startingDayOfWeek + daysInMonth);
    for (let day = 1; day <= remainingDays; day++) {
        html += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    container.innerHTML = html;
}

// Update month display
function updateMonthDisplay() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('current-month').textContent = `${monthNames[currentMonth - 1]} ${currentYear}`;
}

// Navigate to previous month
function previousMonth() {
    currentMonth--;
    if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
    }
    loadCalendar();
}

// Navigate to next month
function nextMonth() {
    currentMonth++;
    if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
    }
    loadCalendar();
}

// Show attendance details for a specific date
async function showAttendanceDetails(date) {
    try {
        const response = await apiFetch(`/api/attendance-bulk/calendar?year=${date.split('-')[0]}&month=${date.split('-')[1]}&classFilter=all`);
        const dayData = response.calendarData[date] || [];
        
        const content = document.getElementById('attendance-details-content');
        content.innerHTML = `
            <h3>Attendance for ${new Date(date).toLocaleDateString()}</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Roll Number</th>
                            <th>Class</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dayData.map(student => `
                            <tr>
                                <td>${student.name}</td>
                                <td>${student.rollNumber}</td>
                                <td>${student.class}</td>
                                <td><span class="status ${student.status === 'Present' ? 'status-paid' : 'status-overdue'}">${student.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('attendance-details-modal').style.display = 'block';
    } catch (error) {
        console.error('Error loading attendance details:', error);
        showToast('Failed to load attendance details', 'error');
    }
}

// Close attendance details modal
function closeAttendanceDetailsModal() {
    document.getElementById('attendance-details-modal').style.display = 'none';
}

// Event listeners
document.getElementById('bulk-class-filter').addEventListener('change', loadStudentsForBulk);
document.getElementById('calendar-class-filter').addEventListener('change', loadCalendar);
