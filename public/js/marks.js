async function fetchJson(url, options) { 
    return window.apiFetch(url, options); 
}

let currentTab = 'record';

// Load initial metrics
async function loadMetrics() {
    try {
        // Mock data for now - in real implementation, these would come from API
        const averageGrade = 85;
        document.getElementById('averageGrade').textContent = `${averageGrade}%`;
        updateChangeIndicator('gradeChange', averageGrade, averageGrade - 3);
        
        const excellentGrades = 25;
        document.getElementById('excellentGrades').textContent = excellentGrades;
        updateChangeIndicator('excellentChange', excellentGrades, excellentGrades - 2);
        
        const studentsGraded = 150;
        document.getElementById('studentsGraded').textContent = studentsGraded;
        updateChangeIndicator('gradedChange', studentsGraded, studentsGraded - 5);
        
        const totalSubjects = 12;
        document.getElementById('totalSubjects').textContent = totalSubjects;
        updateChangeIndicator('subjectsChange', totalSubjects, totalSubjects - 1);
        
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
    if (tabName === 'view') {
        loadMarks();
    } else if (tabName === 'analytics') {
        loadAnalytics();
    }
}

// Load subjects for reference
async function loadSubjects() {
    try {
        const subjects = await fetchJson('/api/classes/subjects');
        const body = document.getElementById('subjects-body');
        
        if (subjects.length === 0) {
            body.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <i class="fas fa-book"></i>
                        <h3>No subjects found</h3>
                        <p>Create subjects in the Classes page first.</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        body.innerHTML = subjects.map(subject => `
            <tr>
                <td><span class="subject-id">#${subject.SUBJECT_ID}</span></td>
                <td><strong>${subject.NAME}</strong></td>
                <td><span class="subject-code">${subject.CODE || 'N/A'}</span></td>
                <td><span class="class-badge">${subject.CLASS_NAME || 'N/A'}</span></td>
                <td>${subject.DESCRIPTION || '<span class="text-muted">No description</span>'}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading subjects:', error);
        showToast('Failed to load subjects', 'error');
    }
}

// Load marks
async function loadMarks() {
    try {
        const studentId = document.getElementById('queryStudentId').value;
        const subjectId = document.getElementById('querySubjectId').value;
        const term = document.getElementById('queryTerm').value;
        const classFilter = document.getElementById('queryClass').value;
        
        let url = '/api/marks';
        const params = new URLSearchParams();
        
        if (studentId) {
            url = `/api/marks/student/${studentId}`;
        }
        if (subjectId) params.append('subjectId', subjectId);
        if (term) params.append('term', term);
        if (classFilter) params.append('class', classFilter);
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        const marks = await fetchJson(url);
        const body = document.getElementById('student-marks');
        
        if (!marks || marks.length === 0) {
            body.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-graduation-cap"></i>
                        <h3>No marks found</h3>
                        <p>Try adjusting your search criteria or record new marks.</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        body.innerHTML = marks.map(mark => {
            const percentage = mark.MAX_SCORE > 0 ? Math.round((mark.SCORE / mark.MAX_SCORE) * 100) : 0;
            const gradeClass = getGradeClass(percentage);
            const gradeText = getGradeText(percentage);
            
            return `
                <tr>
                    <td>
                        <a href="/students.html?student=${mark.STUDENT_ID}" class="student-link">
                            <i class="fas fa-user"></i> Student #${mark.STUDENT_ID}
                        </a>
                    </td>
                    <td><strong>${mark.SUBJECT_NAME || 'Unknown Subject'}</strong></td>
                    <td><span class="term-badge">${mark.TERM}</span></td>
                    <td><span class="score-display">${mark.SCORE}</span></td>
                    <td><span class="max-score">${mark.MAX_SCORE}</span></td>
                    <td>
                        <span class="grade-badge ${gradeClass}">
                            <i class="fas fa-${getGradeIcon(percentage)}"></i>
                            ${gradeText}
                        </span>
                        <div class="percentage-display">${percentage}%</div>
                    </td>
                    <td>
                        <div class="action-menu">
                            <button class="action-trigger" onclick="toggleActionMenu(${mark.MARK_ID})">
                                <i class="fas fa-ellipsis-v"></i>
                                Actions
                            </button>
                            <div class="action-dropdown" id="menu-${mark.MARK_ID}">
                                <a href="#" class="action-item" onclick="editMark(${mark.MARK_ID})">
                                    <i class="fas fa-edit"></i>
                                    Edit Mark
                                </a>
                                <a href="/students.html?student=${mark.STUDENT_ID}" class="action-item">
                                    <i class="fas fa-user"></i>
                                    View Student
                                </a>
                                <a href="/reports.html?student=${mark.STUDENT_ID}" class="action-item">
                                    <i class="fas fa-chart-line"></i>
                                    Student Report
                                </a>
                                <a href="#" class="action-item danger" onclick="deleteMark(${mark.MARK_ID})">
                                    <i class="fas fa-trash"></i>
                                    Delete Mark
                                </a>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading marks:', error);
        showToast('Failed to load marks', 'error');
    }
}

// Get grade class based on percentage
function getGradeClass(percentage) {
    if (percentage >= 90) return 'grade-excellent';
    if (percentage >= 80) return 'grade-good';
    if (percentage >= 70) return 'grade-average';
    return 'grade-poor';
}

// Get grade text based on percentage
function getGradeText(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
}

// Get grade icon based on percentage
function getGradeIcon(percentage) {
    if (percentage >= 90) return 'trophy';
    if (percentage >= 80) return 'star';
    if (percentage >= 70) return 'check-circle';
    return 'exclamation-triangle';
}

// Load analytics
async function loadAnalytics() {
    // Mock analytics data - in real implementation, this would come from API
    showToast('Analytics loaded', 'success');
}

// Toggle action menu
function toggleActionMenu(markId) {
    // Close all other menus
    document.querySelectorAll('.action-dropdown').forEach(menu => {
        if (menu.id !== `menu-${markId}`) {
            menu.classList.remove('show');
        }
    });
    
    // Toggle current menu
    const menu = document.getElementById(`menu-${markId}`);
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

// Edit mark
async function editMark(id) {
    try {
        const mark = await fetchJson(`/api/marks/${id}`);
        document.getElementById('studentId').value = mark.STUDENT_ID;
        document.getElementById('subjectId').value = mark.SUBJECT_ID;
        document.getElementById('term').value = mark.TERM;
        document.getElementById('score').value = mark.SCORE;
        document.getElementById('maxScore').value = mark.MAX_SCORE;
        
        // Switch to record tab
        switchTab('record');
        
        // Scroll to form
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
        
        // Focus on score field
        document.getElementById('score').focus();
        
        showToast('Mark loaded for editing', 'success');
    } catch (error) {
        console.error('Error loading mark:', error);
        showToast('Failed to load mark', 'error');
    }
}

// Delete mark
async function deleteMark(id) {
    if (!confirm('Are you sure you want to delete this mark? This action cannot be undone.')) {
        return;
    }
    
    try {
        await fetchJson(`/api/marks/${id}`, { method: 'DELETE' });
        showToast('Mark deleted successfully', 'success');
        loadMarks();
        loadMetrics();
    } catch (error) {
        console.error('Error deleting mark:', error);
        showToast('Failed to delete mark', 'error');
    }
}

// Save mark
async function saveMark(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('studentId').value;
    const subjectId = document.getElementById('subjectId').value;
    const term = document.getElementById('term').value;
    const score = document.getElementById('score').value;
    const maxScore = document.getElementById('maxScore').value;
    
    if (!studentId || !subjectId || !term || !score) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const markData = {
        STUDENT_ID: Number(studentId),
        SUBJECT_ID: Number(subjectId),
        TERM: term,
        SCORE: Number(score),
        MAX_SCORE: maxScore ? Number(maxScore) : 100
    };
    
    try {
        const saveBtn = document.getElementById('saveMarkBtn');
        const originalText = saveBtn.innerHTML;
        
        // Show loading state
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        await fetchJson('/api/marks', {
            method: 'POST',
            body: JSON.stringify(markData)
        });
        
        showToast('Mark recorded successfully!', 'success');
        document.getElementById('mark-form').reset();
        loadMetrics();
        
    } catch (error) {
        console.error('Error saving mark:', error);
        showToast(error.message || 'Failed to record mark', 'error');
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('saveMarkBtn');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Record Mark';
    }
}

// Clear form
function clearForm() {
    document.getElementById('mark-form').reset();
    showToast('Form cleared', 'success');
}

// Clear search
function clearSearch() {
    document.getElementById('queryStudentId').value = '';
    document.getElementById('querySubjectId').value = '';
    document.getElementById('queryTerm').value = '';
    document.getElementById('queryClass').value = '';
    loadMarks();
    showToast('Search filters cleared', 'success');
}

// Refresh data
function refreshSubjects() {
    loadSubjects();
    showToast('Subjects refreshed', 'success');
}

function refreshMarks() {
    loadMarks();
    showToast('Marks refreshed', 'success');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Form submission
    document.getElementById('mark-form').addEventListener('submit', saveMark);
    
    // Button events
    document.getElementById('clearMarkBtn').addEventListener('click', clearForm);
    document.getElementById('loadByStudent').addEventListener('click', loadMarks);
    document.getElementById('clearSearchBtn').addEventListener('click', clearSearch);
    document.getElementById('refreshSubjectsBtn').addEventListener('click', refreshSubjects);
    document.getElementById('refreshMarksBtn').addEventListener('click', refreshMarks);
    
    // Search on Enter key
    ['queryStudentId', 'querySubjectId', 'queryTerm', 'queryClass'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadMarks();
            }
        });
    });
    
    // Load initial data
    loadMetrics();
    loadSubjects();
});