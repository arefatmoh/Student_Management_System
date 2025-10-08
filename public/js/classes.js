async function fetchJson(url, options) { 
    return window.apiFetch(url, options); 
}

let currentTab = 'classes';

// Load initial metrics
async function loadMetrics() {
    try {
        // Load classes count
        const classes = await fetchJson('/api/classes');
        const totalClasses = classes.length || 0;
        document.getElementById('totalClasses').textContent = totalClasses;
        updateChangeIndicator('classesChange', totalClasses, totalClasses - 2);
        
        // Load subjects count
        const subjects = await fetchJson('/api/classes/subjects');
        const totalSubjects = subjects.length || 0;
        document.getElementById('totalSubjects').textContent = totalSubjects;
        updateChangeIndicator('subjectsChange', totalSubjects, totalSubjects - 3);
        
        // Load students count
        const students = await fetchJson('/api/students?limit=1');
        const totalStudents = students.total || 0;
        document.getElementById('totalStudents').textContent = totalStudents;
        updateChangeIndicator('studentsChange', totalStudents, totalStudents - 5);
        
        
    } catch (error) {
        console.error('Error loading metrics:', error);
    }
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

// Switch tabs
function switchTab(tabName) {
    currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Load data for the active tab
    if (tabName === 'classes') {
        loadClasses();
    } else if (tabName === 'subjects') {
        loadSubjects();
    }
}

// Load classes
async function loadClasses() {
    try {
        const classes = await fetchJson('/api/classes');
        const body = document.getElementById('classes-body');
        
        if (classes.length === 0) {
            body.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-school"></i>
                        <h3>No classes found</h3>
                        <p>Create your first class to get started.</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        body.innerHTML = classes.map(cls => `
            <tr>
                <td><span class="class-id">#${cls.CLASS_ID}</span></td>
                <td><span class="class-name">${cls.NAME}</span></td>
                <td>${cls.DESCRIPTION || '<span class="text-muted">No description</span>'}</td>
                <td><span class="stats-badge">${cls.STUDENT_COUNT || 0} students</span></td>
                <td>
                    <div class="action-menu">
                        <button class="action-trigger" onclick="toggleActionMenu(${cls.CLASS_ID})">
                            <i class="fas fa-ellipsis-v"></i>
                            Actions
                        </button>
                        <div class="action-dropdown" id="menu-${cls.CLASS_ID}">
                            <a href="#" class="action-item" onclick="editClass(${cls.CLASS_ID})">
                                <i class="fas fa-edit"></i>
                                Edit Class
                            </a>
                            <a href="#" class="action-item" onclick="manageSubjects(${cls.CLASS_ID})">
                                <i class="fas fa-book"></i>
                                Manage Subjects
                            </a>
                            <a href="/students.html?class=${cls.CLASS_ID}" class="action-item">
                                <i class="fas fa-users"></i>
                                View Students
                            </a>
                            <a href="/reports.html?class=${cls.CLASS_ID}" class="action-item">
                                <i class="fas fa-chart-line"></i>
                                Class Report
                            </a>
                            <a href="#" class="action-item danger" onclick="deleteClass(${cls.CLASS_ID})">
                                <i class="fas fa-trash"></i>
                                Delete Class
                            </a>
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading classes:', error);
        showToast('Failed to load classes', 'error');
    }
}

// Load subjects
async function loadSubjects() {
    try {
        const subjects = await fetchJson('/api/classes/subjects');
        const container = document.getElementById('subjects-list');
        
        if (subjects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book"></i>
                    <h3>No subjects found</h3>
                    <p>Create your first subject to get started.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = subjects.map(subject => `
            <div class="subject-card">
                <h5>${subject.NAME}</h5>
                <p><strong>Code:</strong> ${subject.CODE || 'N/A'}</p>
                <p><strong>Class:</strong> ${subject.CLASS_NAME || 'N/A'}</p>
                <p><strong>Description:</strong> ${subject.DESCRIPTION || 'No description'}</p>
                <div class="subject-actions-card">
                    <button class="btn btn-primary btn-sm" onclick="editSubject(${subject.SUBJECT_ID})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteSubject(${subject.SUBJECT_ID})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading subjects:', error);
        showToast('Failed to load subjects', 'error');
    }
}


// Toggle action menu
function toggleActionMenu(classId) {
    // Close all other menus
    document.querySelectorAll('.action-dropdown').forEach(menu => {
        if (menu.id !== `menu-${classId}`) {
            menu.classList.remove('show');
        }
    });
    
    // Toggle current menu
    const menu = document.getElementById(`menu-${classId}`);
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

// Edit class
async function editClass(id) {
    try {
        const cls = await fetchJson(`/api/classes/${id}`);
        document.getElementById('className').value = cls.NAME;
        document.getElementById('classDescription').value = cls.DESCRIPTION || '';
        
        // Scroll to form
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
        
        // Focus on name field
        document.getElementById('className').focus();
        
        showToast('Class loaded for editing', 'success');
    } catch (error) {
        console.error('Error loading class:', error);
        showToast('Failed to load class', 'error');
    }
}

// Delete class
async function deleteClass(id) {
    if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
        return;
    }
    
    try {
        await fetchJson(`/api/classes/${id}`, { method: 'DELETE' });
        showToast('Class deleted successfully', 'success');
        loadClasses();
        loadMetrics();
    } catch (error) {
        console.error('Error deleting class:', error);
        showToast('Failed to delete class', 'error');
    }
}

// Manage subjects for a class
function manageSubjects(classId) {
    switchTab('subjects');
    // Filter subjects by class if needed
    showToast('Switched to subjects tab', 'info');
}

// Edit subject
async function editSubject(id) {
    try {
        const subject = await fetchJson(`/api/classes/subjects/${id}`);
        document.getElementById('subjectName').value = subject.NAME;
        document.getElementById('subjectCode').value = subject.CODE || '';
        document.getElementById('subjectClass').value = subject.CLASS_ID;
        document.getElementById('subjectDescription').value = subject.DESCRIPTION || '';
        
        // Scroll to form
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
        
        // Focus on name field
        document.getElementById('subjectName').focus();
        
        showToast('Subject loaded for editing', 'success');
    } catch (error) {
        console.error('Error loading subject:', error);
        showToast('Failed to load subject', 'error');
    }
}

// Delete subject
async function deleteSubject(id) {
    if (!confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
        return;
    }
    
    try {
        await fetchJson(`/api/classes/subjects/${id}`, { method: 'DELETE' });
        showToast('Subject deleted successfully', 'success');
        loadSubjects();
        loadMetrics();
    } catch (error) {
        console.error('Error deleting subject:', error);
        showToast('Failed to delete subject', 'error');
    }
}

// Save class
async function saveClass(event) {
    event.preventDefault();
    
    const name = document.getElementById('className').value;
    const description = document.getElementById('classDescription').value;
    
    if (!name) {
        showToast('Please enter a class name', 'error');
        return;
    }
    
    const classData = {
        NAME: name,
        DESCRIPTION: description
    };
    
    try {
        const saveBtn = document.getElementById('saveClassBtn');
        const originalText = saveBtn.innerHTML;
        
        // Show loading state
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        
        await fetchJson('/api/classes', {
            method: 'POST',
            body: JSON.stringify(classData)
        });
        
        showToast('Class created successfully!', 'success');
        document.getElementById('class-form').reset();
        loadClasses();
        loadMetrics();
        
    } catch (error) {
        console.error('Error saving class:', error);
        showToast(error.message || 'Failed to create class', 'error');
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('saveClassBtn');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Create Class';
    }
}

// Save subject
async function saveSubject(event) {
    event.preventDefault();
    
    const name = document.getElementById('subjectName').value;
    const code = document.getElementById('subjectCode').value;
    const description = document.getElementById('subjectDescription').value;
    
    if (!name) {
        showToast('Please enter subject name', 'error');
        return;
    }
    
    const subjectData = {
        NAME: name,
        CODE: code,
        DESCRIPTION: description
    };
    
    try {
        const saveBtn = document.getElementById('saveSubjectBtn');
        const originalText = saveBtn.innerHTML;
        
        // Show loading state
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        
        await fetchJson('/api/classes/subjects', {
            method: 'POST',
            body: JSON.stringify(subjectData)
        });
        
        showToast('Subject created successfully!', 'success');
        document.getElementById('subject-form').reset();
        loadSubjects();
        loadMetrics();
        
    } catch (error) {
        console.error('Error saving subject:', error);
        showToast(error.message || 'Failed to create subject', 'error');
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('saveSubjectBtn');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Create Subject';
    }
}

// Clear forms
function clearClassForm() {
    document.getElementById('class-form').reset();
    showToast('Form cleared', 'success');
}

function clearSubjectForm() {
    document.getElementById('subject-form').reset();
    showToast('Form cleared', 'success');
}

// Refresh data
function refreshClasses() {
    loadClasses();
    showToast('Classes refreshed', 'success');
}

function refreshSubjects() {
    loadSubjects();
    showToast('Subjects refreshed', 'success');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Form submissions
    document.getElementById('class-form').addEventListener('submit', saveClass);
    document.getElementById('subject-form').addEventListener('submit', saveSubject);
    
    // Button events
    document.getElementById('clearClassBtn').addEventListener('click', clearClassForm);
    document.getElementById('clearSubjectBtn').addEventListener('click', clearSubjectForm);
    document.getElementById('refreshClassesBtn').addEventListener('click', refreshClasses);
    document.getElementById('refreshSubjectsBtn').addEventListener('click', refreshSubjects);
    
    // Load initial data
    loadMetrics();
    loadClasses();
});