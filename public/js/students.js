async function fetchJson(url, options) { 
    return window.apiFetch(url, options); 
}

let currentPage = 1; 
let total = 0; 
let limit = 10;
let currentView = 'table';

// Load classes for dropdown
async function loadClasses() {
    try {
        const classes = await fetchJson('/api/classes');
        
        // Populate class dropdown in form
        const classSelect = document.getElementById('class');
        classSelect.innerHTML = '<option value="">Select a class...</option>';
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.NAME;
            option.textContent = cls.NAME;
            classSelect.appendChild(option);
        });
        
        // Populate class filter dropdown
        const searchClassSelect = document.getElementById('searchClass');
        searchClassSelect.innerHTML = '<option value="">All Classes</option>';
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.NAME;
            option.textContent = cls.NAME;
            searchClassSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading classes:', error);
        showToast('Failed to load classes', 'error');
    }
}

// Load students with modern interface
async function loadStudents() {
    const name = document.getElementById('searchName').value || '';
    const roll = document.getElementById('searchRoll').value || '';
    const cls = document.getElementById('searchClass').value || '';
    
    try {
        const data = await fetchJson(`/api/students?name=${encodeURIComponent(name)}&roll=${encodeURIComponent(roll)}&class=${encodeURIComponent(cls)}&page=${currentPage}&limit=${limit}`);
        
        if (currentView === 'table') {
            renderTableView(data.data || []);
        } else {
            renderCardView(data.data || []);
        }
        
        renderPagination(data.pagination || {});
    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Failed to load students', 'error');
    }
}

// Render table view
function renderTableView(students) {
    const body = document.getElementById('students-body');
    
    if (students.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No students found</h3>
                    <p>Try adjusting your search criteria or add a new student.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    body.innerHTML = students.map(student => `
        <tr>
            <td><span class="student-id">#${student.STUDENT_ID}</span></td>
            <td>
                <div class="student-name">
                    <strong>${student.NAME}</strong>
                </div>
            </td>
            <td><span class="roll-number">${student.ROLL_NUMBER}</span></td>
            <td><span class="class-badge">${student.CLASS}</span></td>
            <td>${student.PARENT_CONTACT || '<span class="text-muted">Not provided</span>'}</td>
            <td>
                <div class="action-menu">
                    <button class="action-trigger" onclick="toggleActionMenu(${student.STUDENT_ID})">
                        <i class="fas fa-ellipsis-v"></i>
                        Actions
                    </button>
                    <div class="action-dropdown" id="menu-${student.STUDENT_ID}">
                        <div class="action-header">
                            <h4>Actions for ${student.NAME}</h4>
                            <button class="action-close" onclick="closeActionMenu(${student.STUDENT_ID})">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="action-items">
                            <a href="#" class="action-item" onclick="editStudent(${student.STUDENT_ID}); closeActionMenu(${student.STUDENT_ID});">
                                <i class="fas fa-edit"></i>
                                Edit Student
                            </a>
                            <a href="/fees.html?student=${student.STUDENT_ID}" class="action-item">
                                <i class="fas fa-dollar-sign"></i>
                                Add Fee
                            </a>
                            <a href="/fees.html?student=${student.STUDENT_ID}" class="action-item">
                                <i class="fas fa-list"></i>
                                View Fees
                            </a>
                            <a href="/attendance.html?student=${student.STUDENT_ID}" class="action-item">
                                <i class="fas fa-calendar-check"></i>
                                Mark Attendance
                            </a>
                            <a href="/attendance.html?student=${student.STUDENT_ID}" class="action-item">
                                <i class="fas fa-chart-line"></i>
                                View Attendance
                            </a>
                            <a href="/reports.html?student=${student.STUDENT_ID}" class="action-item">
                                <i class="fas fa-file-alt"></i>
                                Student Summary
                            </a>
                            <a href="#" class="action-item danger" onclick="deleteStudent(${student.STUDENT_ID}); closeActionMenu(${student.STUDENT_ID});">
                                <i class="fas fa-trash"></i>
                                Delete Student
                            </a>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');
}

// Render card view
function renderCardView(students) {
    const container = document.getElementById('students-cards');
    
    if (students.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No students found</h3>
                <p>Try adjusting your search criteria or add a new student.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = students.map(student => `
        <div class="student-card">
            <div class="student-info">
                <div class="student-details">
                    <h4>${student.NAME}</h4>
                    <p><strong>Roll:</strong> ${student.ROLL_NUMBER} | <strong>Class:</strong> ${student.CLASS}</p>
                    <p><strong>Parent Contact:</strong> ${student.PARENT_CONTACT || 'Not provided'}</p>
                </div>
                <div class="student-actions">
                    <button class="btn btn-primary btn-sm" onclick="editStudent(${student.STUDENT_ID})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteStudent(${student.STUDENT_ID})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
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
            Showing ${((page - 1) * limit) + 1} to ${Math.min(page * limit, total)} of ${total} students
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

// Toggle action menu
function toggleActionMenu(studentId) {
    // Close all other menus
    document.querySelectorAll('.action-dropdown').forEach(menu => {
        if (menu.id !== `menu-${studentId}`) {
            menu.classList.remove('show');
        }
    });
    
    // Toggle current menu
    const menu = document.getElementById(`menu-${studentId}`);
    menu.classList.toggle('show');
    
    // Prevent body scroll when menu is open
    if (menu.classList.contains('show')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

function closeActionMenu(studentId) {
    const menu = document.getElementById(`menu-${studentId}`);
    if (menu) {
        menu.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Close action menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.action-menu') && !e.target.closest('.action-dropdown')) {
        document.querySelectorAll('.action-dropdown').forEach(menu => {
            menu.classList.remove('show');
        });
        document.body.style.overflow = '';
    }
});

// Close action menus when pressing Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.action-dropdown').forEach(menu => {
            menu.classList.remove('show');
        });
        document.body.style.overflow = '';
    }
});

// Toggle between table and card view
function toggleView(view) {
    currentView = view;
    
    // Update button states
    document.getElementById('tableViewBtn').classList.toggle('active', view === 'table');
    document.getElementById('cardViewBtn').classList.toggle('active', view === 'card');
    
    // Show/hide views
    document.getElementById('tableView').style.display = view === 'table' ? 'block' : 'none';
    document.getElementById('cardView').style.display = view === 'card' ? 'block' : 'none';
    
    // Reload data with current view
    loadStudents();
}

// Go to specific page
function goToPage(page) {
    currentPage = page;
    loadStudents();
}

// Edit student
async function editStudent(id) {
    try {
        const student = await fetchJson(`/api/students/${id}`);
        document.getElementById('studentId').value = student.STUDENT_ID;
        document.getElementById('name').value = student.NAME;
        document.getElementById('roll').value = student.ROLL_NUMBER;
        document.getElementById('class').value = student.CLASS;
        document.getElementById('contact').value = student.PARENT_CONTACT || '';
        
        // Scroll to form
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
        
        // Focus on name field
        document.getElementById('name').focus();
        
        showToast('Student loaded for editing', 'success');
    } catch (error) {
        console.error('Error loading student:', error);
        showToast('Failed to load student', 'error');
    }
}

// Delete student
async function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
        return;
    }
    
    try {
        await fetchJson(`/api/students/${id}`, { method: 'DELETE' });
        showToast('Student deleted successfully', 'success');
        loadStudents();
    } catch (error) {
        console.error('Error deleting student:', error);
        showToast('Failed to delete student', 'error');
    }
}

// Save student
async function saveStudent(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const studentData = {
        NAME: document.getElementById('name').value,
        ROLL_NUMBER: document.getElementById('roll').value,
        CLASS: document.getElementById('class').value,
        PARENT_CONTACT: document.getElementById('contact').value
    };
    
    const studentId = document.getElementById('studentId').value;
    const isEdit = studentId !== '';
    
    try {
        const saveBtn = document.getElementById('saveBtn');
        const originalText = saveBtn.innerHTML;
        
        // Show loading state
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        let response;
        if (isEdit) {
            response = await fetchJson(`/api/students/${studentId}`, {
                method: 'PUT',
                body: JSON.stringify(studentData)
            });
        } else {
            response = await fetchJson('/api/students', {
                method: 'POST',
                body: JSON.stringify(studentData)
            });
        }
        
        showToast(`Student ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
        form.reset();
        loadStudents();
        
    } catch (error) {
        console.error('Error saving student:', error);
        showToast(error.message || `Failed to ${isEdit ? 'update' : 'create'} student`, 'error');
        
        // Highlight error fields
        if (error.message && error.message.includes('ROLL_NUMBER')) {
            document.getElementById('roll').classList.add('input-error');
        }
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Student';
    }
}

// Clear form
function clearForm() {
    document.getElementById('student-form').reset();
    document.querySelectorAll('.input-error').forEach(input => {
        input.classList.remove('input-error');
    });
    showToast('Form cleared', 'success');
}

// Search students
function searchStudents() {
    currentPage = 1;
    loadStudents();
}

// Clear search
function clearSearch() {
    document.getElementById('searchName').value = '';
    document.getElementById('searchRoll').value = '';
    document.getElementById('searchClass').value = '';
    currentPage = 1;
    loadStudents();
    showToast('Search filters cleared', 'success');
}

// Refresh data
function refreshData() {
    loadStudents();
    showToast('Data refreshed', 'success');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Form submission
    document.getElementById('student-form').addEventListener('submit', saveStudent);
    
    // Button events
    document.getElementById('clearBtn').addEventListener('click', clearForm);
    document.getElementById('searchBtn').addEventListener('click', searchStudents);
    document.getElementById('clearSearchBtn').addEventListener('click', clearSearch);
    document.getElementById('refreshBtn').addEventListener('click', refreshData);
    
    // Search on Enter key
    ['searchName', 'searchRoll'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchStudents();
            }
        });
    });
    
    // Search on dropdown change
    document.getElementById('searchClass').addEventListener('change', searchStudents);
    
    // Load initial data
    loadClasses();
    loadStudents();
});