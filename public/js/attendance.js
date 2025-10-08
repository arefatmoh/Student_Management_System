async function fetchJson(url, options) { 
    return window.apiFetch(url, options); 
}

let currentPage = 1; 
let total = 0; 
let limit = 10;

// Load attendance with modern interface
async function loadAttendance() {
    const studentId = document.getElementById('filterStudent')?.dataset.id || '';
    const studentName = document.getElementById('filterStudent')?.dataset.name || '';
    const status = document.getElementById('filterStatus').value;
    const date = document.getElementById('filterDate').value;
    
    try {
        const qs = new URLSearchParams({ studentId, studentName, status, from: date, to: date, page: currentPage, limit });
        const data = await fetchJson(`/api/attendance?${qs.toString()}`);
        
        renderAttendanceTable(data.data || []);
        renderPagination(data.pagination || { page: data.page, limit: data.limit, total: data.total, pages: Math.ceil((data.total||0) / (data.limit||limit)) });
        
        // Load summary data separately
        loadAttendanceSummary();
    } catch (error) {
        console.error('Error loading attendance:', error);
        showToast('Failed to load attendance records', 'error');
    }
}

// Load attendance summary data
async function loadAttendanceSummary() {
    try {
        const summary = await fetchJson('/api/attendance/summary');
        updateSummaryCards({ summary });
    } catch (error) {
        console.error('Error loading attendance summary:', error);
        // Don't show error toast for summary, just use defaults
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
                <a href="/students.html?student=${att.STUDENT_ID}" class="student-link">
                    <i class="fas fa-user"></i> ${att.STUDENT_NAME || ('#' + att.STUDENT_ID)}
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
    
    // Attendance Rate (from API)
    const attendanceRate = summary.attendanceRate || 0;
    document.getElementById('attendanceRate').textContent = `${attendanceRate}%`;
    
    // This Month
    const thisMonth = summary.thisMonth || 0;
    document.getElementById('thisMonth').textContent = thisMonth;
    
    // Update change indicators (simplified - no mock data)
    updateChangeIndicator('presentChange', presentToday, 0);
    updateChangeIndicator('absentChange', absentToday, 0);
    updateChangeIndicator('rateChange', attendanceRate, 0);
    updateChangeIndicator('monthChange', thisMonth, 0);
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
        
        // Set the correct radio button
        const statusRadio = document.querySelector(`input[name="status"][value="${attendance.STATUS}"]`);
        if (statusRadio) {
            statusRadio.checked = true;
        }
        
        // Scroll to form
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
        
        // Focus on status toggle
        const statusToggle = document.querySelector('.status-toggle');
        if (statusToggle) {
            statusToggle.focus();
        }
        
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
    const status = document.querySelector('input[name="status"]:checked')?.value;
    
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
    document.getElementById('filterStudent').value = '';
    document.getElementById('filterStudent').dataset.id = '';
    document.getElementById('filterStudent').dataset.name = '';
    document.getElementById('filterDate').value = '';
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
    ['filterStudent', 'filterDate'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchAttendance();
            }
        });
    });
    
    // Live student search (form)
    const input = document.getElementById('studentSearch');
    const results = document.getElementById('studentResults');
    input.addEventListener('input', debounce(async (e) => {
        const q = e.target.value.trim();
        results.innerHTML = '';
        if (q.length < 1) { return; }
        try {
            const data = await fetchJson(`/api/students?q=${encodeURIComponent(q)}&prefix=1&limit=10`);
            const students = data.data || data.students || [];
            results.innerHTML = students.map(s => `
                <div class="dropdown-item" data-id="${s.STUDENT_ID}">
                    ${s.NAME} (${s.ROLL_NUMBER}) - ${s.CLASS}
                </div>
            `).join('');
        } catch (err) {
            // ignore
        }
    }, 250));

    results.addEventListener('click', (e) => {
        const item = e.target.closest('.dropdown-item');
        if (!item) return;
        document.getElementById('studentId').value = item.dataset.id;
        input.value = item.textContent.trim();
        results.innerHTML = '';
    });

    // Live student search (filter)
    const fInput = document.getElementById('filterStudent');
    const fResults = document.getElementById('filterStudentResults');
    fInput.addEventListener('input', debounce(async (e) => {
        const q = e.target.value.trim();
        fResults.innerHTML = '';
        fInput.dataset.id = '';
        fInput.dataset.name = '';
        if (q.length < 1) return;
        try {
            const data = await fetchJson(`/api/students?q=${encodeURIComponent(q)}&prefix=1&limit=10`);
            const students = data.data || data.students || [];
            fResults.innerHTML = students.map(s => `
                <div class="dropdown-item" data-id="${s.STUDENT_ID}" data-name="${s.NAME}">
                    ${s.NAME} (${s.ROLL_NUMBER}) - ${s.CLASS}
                </div>
            `).join('');
        } catch {}
    }, 250));
    fResults.addEventListener('click', (e) => {
        const item = e.target.closest('.dropdown-item');
        if (!item) return;
        fInput.value = `${item.dataset.name}`;
        fInput.dataset.id = item.dataset.id;
        fInput.dataset.name = item.dataset.name;
        fResults.innerHTML = '';
        searchAttendance();
    });
    
    // Set default date
    setDefaultDate();
    
    // Load initial data
    loadAttendance();
    loadAttendanceSummary();
});

// Simple debounce helper
function debounce(fn, wait) {
    let t;
    return function(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}