async function fetchJson(url, options) { 
    return window.apiFetch(url, options); 
}

let currentPage = 1; 
let total = 0; 
let limit = 10;

// Load attendance with modern interface
async function loadAttendance() {
    const studentId = document.getElementById('filterStudentId').value;
    const status = document.getElementById('filterStatus').value;
    const from = document.getElementById('filterFrom').value;
    const to = document.getElementById('filterTo').value;
    
    try {
        const qs = new URLSearchParams({ studentId, status, from, to, page: currentPage, limit });
        const data = await fetchJson(`/api/attendance?${qs.toString()}`);
        
        renderAttendanceTable(data.data || []);
        renderPagination(data.pagination || {});
        updateSummaryCards(data);
    } catch (error) {
        console.error('Error loading attendance:', error);
        showToast('Failed to load attendance records', 'error');
    }
}

// Render attendance table
function renderAttendanceTable(attendance) {
    const body = document.getElementById('attendance-body');
    
    if (attendance.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <h3>No attendance records found</h3>
                    <p>Try adjusting your search criteria or record new attendance.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    body.innerHTML = attendance.map(att => `
        <tr>
            <td><span class="attendance-id">#${att.ATTENDANCE_ID}</span></td>
            <td>
                <a href="/students.html" class="student-link">
                    <i class="fas fa-user"></i> Student #${att.STUDENT_ID}
                </a>
            </td>
            <td>
                <span class="date-display">
                    ${new Date(att.ATTENDANCE_DATE).toLocaleDateString()}
                </span>
            </td>
            <td>
                <span class="attendance-badge status-${att.STATUS.toLowerCase()}">
                    <i class="fas fa-${att.STATUS === 'Present' ? 'check-circle' : 'times-circle'}"></i>
                    ${att.STATUS}
                </span>
            </td>
            <td>
                <div class="action-menu">
                    <button class="action-trigger" onclick="toggleActionMenu(${att.ATTENDANCE_ID})">
                        <i class="fas fa-ellipsis-v"></i>
                        Actions
                    </button>
                    <div class="action-dropdown" id="menu-${att.ATTENDANCE_ID}">
                        <a href="#" class="action-item" onclick="editAttendance(${att.ATTENDANCE_ID})">
                            <i class="fas fa-edit"></i>
                            Edit Attendance
                        </a>
                        <a href="/students.html?student=${att.STUDENT_ID}" class="action-item">
                            <i class="fas fa-user"></i>
                            View Student
                        </a>
                        <a href="/reports.html?student=${att.STUDENT_ID}" class="action-item">
                            <i class="fas fa-chart-line"></i>
                            Student Report
                        </a>
                        <a href="#" class="action-item danger" onclick="deleteAttendance(${att.ATTENDANCE_ID})">
                            <i class="fas fa-trash"></i>
                            Delete Record
                        </a>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');
}

// Render pagination
function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    if (!pagination || pagination.pages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    const { page, pages, total } = pagination;
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pages, page + 2);
    
    let html = `
        <div class="pagination-info">
            Showing ${((page - 1) * limit) + 1} to ${Math.min(page * limit, total)} of ${total} attendance records
        </div>
    `;
    
    if (page > 1) {
        html += `<button class="btn btn-secondary" onclick="goToPage(${page - 1})">
            <i class="fas fa-chevron-left"></i> Previous
        </button>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="btn ${i === page ? 'btn-primary' : 'btn-secondary'}" onclick="goToPage(${i})">
            ${i}
        </button>`;
    }
    
    if (page < pages) {
        html += `<button class="btn btn-secondary" onclick="goToPage(${page + 1})">
            Next <i class="fas fa-chevron-right"></i>
        </button>`;
    }
    
    container.innerHTML = html;
}

// Update summary cards
function updateSummaryCards(data) {
    const summary = data.summary || {};
    
    // Present Today
    const presentToday = summary.presentToday || 0;
    document.getElementById('presentToday').textContent = presentToday;
    
    // Absent Today
    const absentToday = summary.absentToday || 0;
    document.getElementById('absentToday').textContent = absentToday;
    
    // Attendance Rate
    const totalToday = presentToday + absentToday;
    const attendanceRate = totalToday > 0 ? Math.round((presentToday / totalToday) * 100) : 0;
    document.getElementById('attendanceRate').textContent = `${attendanceRate}%`;
    
    // This Month (mock data for now)
    const thisMonth = summary.thisMonth || 0;
    document.getElementById('thisMonth').textContent = thisMonth;
    
    // Update change indicators (mock data for now)
    updateChangeIndicator('presentChange', presentToday, presentToday - 2);
    updateChangeIndicator('absentChange', absentToday, absentToday + 1);
    updateChangeIndicator('rateChange', attendanceRate, attendanceRate - 5);
    updateChangeIndicator('monthChange', thisMonth, thisMonth - 10);
}

// Update change indicator
function updateChangeIndicator(elementId, current, previous) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const change = current - previous;
    const changePercent = previous > 0 ? Math.round((change / previous) * 100) : 0;
    
    if (change > 0) {
        element.className = 'change positive';
        element.innerHTML = `+${changePercent}%`;
    } else if (change < 0) {
        element.className = 'change negative';
        element.innerHTML = `${changePercent}%`;
    } else {
        element.className = 'change';
        element.innerHTML = '0%';
    }
}

// Toggle action menu
function toggleActionMenu(attendanceId) {
    // Close all other menus
    document.querySelectorAll('.action-dropdown').forEach(menu => {
        if (menu.id !== `menu-${attendanceId}`) {
            menu.classList.remove('show');
        }
    });
    
    // Toggle current menu
    const menu = document.getElementById(`menu-${attendanceId}`);
    menu.classList.toggle('show');
}

// Close action menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.action-menu')) {
        document.querySelectorAll('.action-dropdown').forEach(menu => {
            menu.classList.remove('show');
        });
    }
});

// Go to specific page
function goToPage(page) {
    currentPage = page;
    loadAttendance();
}

// Edit attendance
async function editAttendance(id) {
    try {
        const attendance = await fetchJson(`/api/attendance/${id}`);
        document.getElementById('studentId').value = attendance.STUDENT_ID;
        document.getElementById('date').value = attendance.ATTENDANCE_DATE;
        document.getElementById('status').value = attendance.STATUS;
        
        // Scroll to form
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
        
        // Focus on status field
        document.getElementById('status').focus();
        
        showToast('Attendance loaded for editing', 'success');
    } catch (error) {
        console.error('Error loading attendance:', error);
        showToast('Failed to load attendance', 'error');
    }
}

// Delete attendance
async function deleteAttendance(id) {
    if (!confirm('Are you sure you want to delete this attendance record? This action cannot be undone.')) {
        return;
    }
    
    try {
        await fetchJson(`/api/attendance/${id}`, { method: 'DELETE' });
        showToast('Attendance record deleted successfully', 'success');
        loadAttendance();
    } catch (error) {
        console.error('Error deleting attendance:', error);
        showToast('Failed to delete attendance record', 'error');
    }
}

// Save attendance
async function saveAttendance(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('studentId').value;
    const date = document.getElementById('date').value;
    const status = document.getElementById('status').value;
    
    if (!studentId || !date || !status) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const attendanceData = {
        STUDENT_ID: Number(studentId),
        ATTENDANCE_DATE: date,
        STATUS: status
    };
    
    try {
        const saveBtn = document.getElementById('saveAttBtn');
        const originalText = saveBtn.innerHTML;
        
        // Show loading state
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        await fetchJson('/api/attendance', {
            method: 'POST',
            body: JSON.stringify(attendanceData)
        });
        
        showToast('Attendance recorded successfully!', 'success');
        document.getElementById('attendance-form').reset();
        setDefaultDate();
        loadAttendance();
        
    } catch (error) {
        console.error('Error saving attendance:', error);
        showToast(error.message || 'Failed to record attendance', 'error');
        
        // Highlight error fields
        if (error.message && error.message.includes('STUDENT_ID')) {
            document.getElementById('studentId').classList.add('input-error');
        }
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('saveAttBtn');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Record Attendance';
    }
}

// Clear form
function clearForm() {
    document.getElementById('attendance-form').reset();
    document.querySelectorAll('.input-error').forEach(input => {
        input.classList.remove('input-error');
    });
    setDefaultDate();
    showToast('Form cleared', 'success');
}

// Search attendance
function searchAttendance() {
    currentPage = 1;
    loadAttendance();
}

// Clear search
function clearSearch() {
    document.getElementById('filterStudentId').value = '';
    document.getElementById('filterFrom').value = '';
    document.getElementById('filterTo').value = '';
    document.getElementById('filterStatus').value = '';
    currentPage = 1;
    loadAttendance();
    showToast('Search filters cleared', 'success');
}

// Refresh data
function refreshData() {
    loadAttendance();
    showToast('Data refreshed', 'success');
}

// Set default date to today
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

// Quick action functions
function markBulkAttendance() {
    window.location.href = '/attendance-bulk.html';
}

function viewCalendar() {
    window.location.href = '/attendance-bulk.html#calendar';
}

function generateReport() {
    window.location.href = '/reports.html#attendance';
}

function exportData() {
    window.location.href = '/import-export.html#export';
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Form submission
    document.getElementById('attendance-form').addEventListener('submit', saveAttendance);
    
    // Button events
    document.getElementById('clearAttBtn').addEventListener('click', clearForm);
    document.getElementById('searchAttBtn').addEventListener('click', searchAttendance);
    document.getElementById('clearSearchAttBtn').addEventListener('click', clearSearch);
    document.getElementById('refreshAttBtn').addEventListener('click', refreshData);
    
    // Search on Enter key
    ['filterStudentId', 'filterFrom', 'filterTo'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchAttendance();
            }
        });
    });
    
    // Set default date
    setDefaultDate();
    
    // Load initial data
    loadAttendance();
});