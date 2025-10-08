async function fetchJson(url, options) { 
    return window.apiFetch(url, options); 
}

let currentTab = 'record';

// Load initial metrics (real data)
async function loadMetrics() {
    try {
        // Load subjects
        const subjectsRes = await fetchJson('/api/classes/subjects');
        const subjectsArr = subjectsRes && subjectsRes.data ? subjectsRes.data : subjectsRes || [];
        const totalSubjects = subjectsArr.length;
        document.getElementById('totalSubjects').textContent = totalSubjects;
        updateChangeIndicator('subjectsChange', totalSubjects, Math.max(totalSubjects - 1, 0));

        // Load marks
        const marksRes = await fetchJson('/api/marks');
        const marksArr = marksRes && marksRes.data ? marksRes.data : marksRes || [];
        const studentsSet = new Set();
        let totalPercentageSum = 0;
        let totalCountWithMax = 0;
        let excellentCount = 0;
        marksArr.forEach(m => {
            if (m.STUDENT_ID != null) studentsSet.add(m.STUDENT_ID);
            const max = Number(m.MAX_SCORE || 0);
            const score = Number(m.SCORE || 0);
            if (max > 0) {
                const pct = Math.round((score / max) * 100);
                totalPercentageSum += pct;
                totalCountWithMax += 1;
                if (pct >= 90) excellentCount += 1;
            }
        });
        const studentsGraded = studentsSet.size;
        const averageGrade = totalCountWithMax > 0 ? Math.round(totalPercentageSum / totalCountWithMax) : 0;

        document.getElementById('studentsGraded').textContent = studentsGraded;
        updateChangeIndicator('gradedChange', studentsGraded, Math.max(studentsGraded - 1, 0));

        document.getElementById('excellentGrades').textContent = excellentCount;
        updateChangeIndicator('excellentChange', excellentCount, Math.max(excellentCount - 1, 0));

        document.getElementById('averageGrade').textContent = `${averageGrade}%`;
        updateChangeIndicator('gradeChange', averageGrade, Math.max(averageGrade - 1, 0));
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
    } else if (tabName === 'bulk') {
        ensureBulkInitialized();
    }
}
// Bulk helpers
let bulkInitialized = false;
function ensureBulkInitialized() {
    if (bulkInitialized) return;
    bulkInitialized = true;
    loadBulkClasses();
    loadSubjectsInto('bulkSubject');
    wireBulkHandlers();
}

async function loadBulkClasses() {
    try {
        const classes = await fetchJson('/api/classes');
        const sel = document.getElementById('bulkClass');
        if (!sel) return;
        sel.innerHTML = '<option value="">All Classes</option>';
        (classes || []).forEach(c => {
            const o = document.createElement('option');
            o.value = c.NAME || c.CLASS_NAME || c.id || c.CLASS_ID;
            o.textContent = c.NAME || c.CLASS_NAME || `Class ${c.CLASS_ID || ''}`;
            sel.appendChild(o);
        });
    } catch (e) {
        console.error('Failed to load classes:', e);
    }
}

async function loadSubjectsInto(selectId) {
    try {
        const subjects = await fetchJson('/api/classes/subjects');
        const sel = document.getElementById(selectId);
        if (!sel) return;
        sel.innerHTML = '<option value="">Select subject</option>';
        (subjects || []).forEach(s => {
            const o = document.createElement('option');
            o.value = s.SUBJECT_ID;
            o.textContent = s.NAME + (s.CODE ? ` (${s.CODE})` : '');
            sel.appendChild(o);
        });
    } catch (e) {
        console.error('Failed to load subjects:', e);
    }
}

function wireBulkHandlers() {
    const loadBtn = document.getElementById('loadBulkStudentsBtn');
    const saveBtn = document.getElementById('saveBulkMarksBtn');
    const clearBtn = document.getElementById('clearBulkMarksBtn');
    const allZeroBtn = document.getElementById('markAllZeroBtn');
    const fillMaxBtn = document.getElementById('distributeMaxBtn');
    if (loadBtn) loadBtn.addEventListener('click', loadBulkStudents);
    if (saveBtn) saveBtn.addEventListener('click', saveBulkMarks);
    if (clearBtn) clearBtn.addEventListener('click', clearBulkMarks);
    if (allZeroBtn) allZeroBtn.addEventListener('click', () => setAllBulkScores(0));
    if (fillMaxBtn) fillMaxBtn.addEventListener('click', fillBulkScoresMax);
}

async function loadBulkStudents() {
    const cls = document.getElementById('bulkClass').value;
    const body = document.getElementById('bulkStudentsBody');
    body.innerHTML = `
        <tr>
            <td colspan="3" class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading students...</p></td>
        </tr>`;
    try {
        let url = '/api/students?limit=1000';
        if (cls) url += `&class=${encodeURIComponent(cls)}`;
        const res = await fetchJson(url);
        const students = res && res.data ? res.data : res;
        if (!students || students.length === 0) {
            body.innerHTML = `
                <tr><td colspan="3" class="empty-state"><p>No students found.</p></td></tr>`;
            return;
        }
        body.innerHTML = students.map(s => `
            <tr data-id="${s.STUDENT_ID}">
                <td><strong>${s.NAME}</strong></td>
                <td>${s.ROLL_NUMBER || ''}</td>
                <td><input type="number" step="0.01" min="0" class="bulk-score" placeholder="0" style="width:120px" /></td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Failed to load students:', e);
        body.innerHTML = `
            <tr><td colspan="3" class="empty-state"><p>Failed to load students.</p></td></tr>`;
    }
}

function setAllBulkScores(value) {
    document.querySelectorAll('#bulkStudentsBody .bulk-score').forEach(inp => {
        inp.value = value;
    });
}

function fillBulkScoresMax() {
    const max = Number(document.getElementById('bulkMax').value || 100);
    document.querySelectorAll('#bulkStudentsBody .bulk-score').forEach(inp => {
        inp.value = max;
    });
}

function clearBulkMarks() {
    document.getElementById('bulkTerm').value = '';
    document.getElementById('bulkMax').value = '';
    document.getElementById('bulkSubject').value = '';
    document.getElementById('bulkStudentsBody').innerHTML = `
        <tr>
            <td colspan="3" class="empty-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Select class and click Load Students.</p>
            </td>
        </tr>`;
}

async function saveBulkMarks() {
    const subjectId = document.getElementById('bulkSubject').value;
    const term = document.getElementById('bulkTerm').value;
    const maxScore = Number(document.getElementById('bulkMax').value || 100);
    if (!subjectId || !term) {
        showToast('Please select subject and term', 'error');
        return;
    }
    const rows = Array.from(document.querySelectorAll('#bulkStudentsBody tr[data-id]'));
    const payload = rows.map(row => {
        const studentId = Number(row.getAttribute('data-id'));
        const scoreInput = row.querySelector('.bulk-score');
        const score = Number(scoreInput && scoreInput.value ? scoreInput.value : 0);
        return {
            STUDENT_ID: studentId,
            SUBJECT_ID: Number(subjectId),
            TERM: term,
            SCORE: score,
            MAX_SCORE: maxScore
        };
    }).filter(r => !Number.isNaN(r.STUDENT_ID));

    if (payload.length === 0) {
        showToast('No students to save', 'info');
        return;
    }

    try {
        const btn = document.getElementById('saveBulkMarksBtn');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        // Save sequentially to reuse existing API
        for (const rec of payload) {
            await fetchJson('/api/marks', { method: 'POST', body: JSON.stringify(rec) });
        }
        showToast('Bulk marks saved', 'success');
        clearBulkMarks();
        btn.disabled = false;
        btn.innerHTML = original;
    } catch (e) {
        console.error('Bulk save failed:', e);
        showToast('Failed to save bulk marks', 'error');
    }
}

// Load subjects into dropdown
async function loadSubjects() {
    try {
        const subjects = await fetchJson('/api/classes/subjects');
        const select = document.getElementById('subjectSelect');
        if (!select) return;
        select.innerHTML = '<option value="">Select subject</option>';
        (subjects || []).forEach(subject => {
            const opt = document.createElement('option');
            opt.value = subject.SUBJECT_ID;
            opt.textContent = subject.NAME + (subject.CODE ? ` (${subject.CODE})` : '');
            select.appendChild(opt);
        });
    } catch (error) {
        console.error('Error loading subjects:', error);
        showToast('Failed to load subjects', 'error');
    }
}

// Load marks
async function loadMarks() {
    try {
        const studentId = document.getElementById('filterStudentId').value;
        const subjectId = document.getElementById('querySubjectSelect').value;
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

// Load analytics (real data)
async function loadAnalytics() {
    try {
        const marksRes = await fetchJson('/api/marks');
        const marksArr = marksRes && marksRes.data ? marksRes.data : marksRes || [];
        let excellent = 0, good = 0, average = 0, poor = 0;
        marksArr.forEach(m => {
            const max = Number(m.MAX_SCORE || 0);
            const score = Number(m.SCORE || 0);
            if (max > 0) {
                const pct = Math.round((score / max) * 100);
                if (pct >= 90) excellent++;
                else if (pct >= 80) good++;
                else if (pct >= 70) average++;
                else poor++;
            }
        });
        const total = excellent + good + average + poor;
        const pct = (n) => total > 0 ? Math.round((n / total) * 100) : 0;

        // Update progress widths
        const exProg = document.querySelector('.grade-bar-progress.grade-excellent');
        const gdProg = document.querySelector('.grade-bar-progress.grade-good');
        const avProg = document.querySelector('.grade-bar-progress.grade-average');
        const prProg = document.querySelector('.grade-bar-progress.grade-poor');
        if (exProg) exProg.style.width = pct(excellent) + '%';
        if (gdProg) gdProg.style.width = pct(good) + '%';
        if (avProg) avProg.style.width = pct(average) + '%';
        if (prProg) prProg.style.width = pct(poor) + '%';

        // Update counts (assumes bars are listed in order Excellent, Good, Average, Poor)
        const bars = document.querySelectorAll('#analytics-tab .grade-bar');
        if (bars && bars.length >= 4) {
            const counts = [excellent, good, average, poor];
            counts.forEach((c, i) => {
                const countEl = bars[i].querySelector('.grade-bar-count');
                if (countEl) countEl.textContent = String(c);
            });
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
        showToast('Failed to load analytics', 'error');
    }
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
        const studentInput = document.getElementById('studentSearch');
        if (studentInput) {
            studentInput.value = `ID ${mark.STUDENT_ID}`;
        }
        const subjectSelect = document.getElementById('subjectSelect');
        if (subjectSelect) {
            subjectSelect.value = String(mark.SUBJECT_ID);
        }
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
    const subjectId = document.getElementById('subjectSelect').value;
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
        clearForm();
        const subjectSelect = document.getElementById('subjectSelect');
        if (subjectSelect) subjectSelect.value = '';
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
    const results = document.getElementById('studentResults');
    if (results) results.innerHTML = '';
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
    document.getElementById('refreshMarksBtn').addEventListener('click', refreshMarks);
    
    // Search on Enter key
    ['queryTerm', 'queryClass'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadMarks();
            }
        });
    });
    
    // Load initial data
    loadMetrics();
    loadSubjects();
    // also load subjects into search dropdown
    loadSubjectsInto('querySubjectSelect');

    // Live student search
    const studentInput = document.getElementById('studentSearch');
    const studentResults = document.getElementById('studentResults');
    let studentSearchTimeout;
    function renderStudentResults(items) {
        if (!studentResults) return;
        if (!items || items.length === 0) {
            studentResults.innerHTML = '';
            return;
        }
        studentResults.innerHTML = items.map(s => (
            `<div class="dropdown-item" data-id="${s.STUDENT_ID}" data-name="${s.NAME}">`+
            `<strong>${s.NAME}</strong> <span style="color:var(--gray-500)">#${s.STUDENT_ID}${s.ROLL_NUMBER ? ' · Roll ' + s.ROLL_NUMBER : ''}</span>`+
            `</div>`
        )).join('');
        studentResults.querySelectorAll('.dropdown-item').forEach(el => {
            el.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const id = el.getAttribute('data-id');
                const name = el.getAttribute('data-name');
                document.getElementById('studentId').value = id;
                if (studentInput) studentInput.value = name + ' (#' + id + ')';
                studentResults.innerHTML = '';
            });
        });
    }
    async function searchStudents(q) {
        try {
            if (!q || q.length < 1) { renderStudentResults([]); return; }
            const res = await fetchJson(`/api/students?limit=1000&search=${encodeURIComponent(q)}`);
            const data = res && res.data ? res.data : res; // support both shapes
            const norm = q.toLowerCase();
            const filtered = (data || []).filter(s => {
                const name = (s.NAME || '').toLowerCase();
                const roll = String(s.ROLL_NUMBER || '').toLowerCase();
                const idStr = String(s.STUDENT_ID || '');
                return name.startsWith(norm) || roll.startsWith(norm) || idStr.startsWith(q);
            }).slice(0, 10);
            renderStudentResults(filtered);
        } catch (e) {
            console.error('Student search failed:', e);
        }
    }
    if (studentInput) {
        studentInput.addEventListener('input', (e) => {
            clearTimeout(studentSearchTimeout);
            const q = e.target.value.trim();
            studentSearchTimeout = setTimeout(() => searchStudents(q), 200);
        });
        studentInput.addEventListener('focus', () => {
            const q = studentInput.value.trim();
            if (q) searchStudents(q);
        });
        studentInput.addEventListener('blur', () => {
            setTimeout(() => { if (studentResults) studentResults.innerHTML = ''; }, 150);
        });
    }

    // Live search for filter student
    const filterStudentInput = document.getElementById('filterStudentSearch');
    const filterStudentResults = document.getElementById('filterStudentResults');
    let filterSearchTimeout;
    function renderFilterResults(items) {
        if (!filterStudentResults) return;
        if (!items || items.length === 0) { filterStudentResults.innerHTML = ''; return; }
        filterStudentResults.innerHTML = items.map(s => (
            `<div class="dropdown-item" data-id="${s.STUDENT_ID}" data-name="${s.NAME}">`+
            `<strong>${s.NAME}</strong> <span style="color:var(--gray-500)">#${s.STUDENT_ID}${s.ROLL_NUMBER ? ' · Roll ' + s.ROLL_NUMBER : ''}</span>`+
            `</div>`
        )).join('');
        filterStudentResults.querySelectorAll('.dropdown-item').forEach(el => {
            el.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const id = el.getAttribute('data-id');
                const name = el.getAttribute('data-name');
                document.getElementById('filterStudentId').value = id;
                if (filterStudentInput) filterStudentInput.value = name + ' (#' + id + ')';
                filterStudentResults.innerHTML = '';
            });
        });
    }
    async function searchFilterStudents(q) {
        try {
            if (!q || q.length < 1) { renderFilterResults([]); return; }
            const res = await fetchJson(`/api/students?limit=1000&search=${encodeURIComponent(q)}`);
            const data = res && res.data ? res.data : res;
            const norm = q.toLowerCase();
            const filtered = (data || []).filter(s => {
                const name = (s.NAME || '').toLowerCase();
                const roll = String(s.ROLL_NUMBER || '').toLowerCase();
                const idStr = String(s.STUDENT_ID || '');
                return name.startsWith(norm) || roll.startsWith(norm) || idStr.startsWith(q);
            }).slice(0, 10);
            renderFilterResults(filtered);
        } catch (e) {
            console.error('Student filter search failed:', e);
        }
    }
    if (filterStudentInput) {
        filterStudentInput.addEventListener('input', (e) => {
            clearTimeout(filterSearchTimeout);
            const q = e.target.value.trim();
            filterSearchTimeout = setTimeout(() => searchFilterStudents(q), 200);
        });
        filterStudentInput.addEventListener('focus', () => {
            const q = filterStudentInput.value.trim();
            if (q) searchFilterStudents(q);
        });
        filterStudentInput.addEventListener('blur', () => {
            setTimeout(() => { if (filterStudentResults) filterStudentResults.innerHTML = ''; }, 150);
        });
    }
});