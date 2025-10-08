let currentStudents = [];
let currentAttendanceData = {};
let currentDate = new Date().toISOString().split('T')[0];

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date
    document.getElementById('bulk-date').value = currentDate;
    
    // Load classes for filters
    loadClasses();
    
    // Load students for bulk marking
    loadStudentsForBulk();
});

// Load classes for dropdowns
async function loadClasses() {
    try {
        console.log('Loading classes...');
        const response = await apiFetch('/api/classes');
        console.log('Classes response:', response);
        
        const classes = response || [];
        
        const bulkFilter = document.getElementById('bulk-class-filter');
        
        if (!bulkFilter) {
            console.error('Class filter element not found');
            return;
        }
        
        // Clear existing options
        bulkFilter.innerHTML = '<option value="all">All Classes</option>';
        
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.NAME;
            option.textContent = cls.NAME;
            bulkFilter.appendChild(option);
        });
        
        console.log(`Loaded ${classes.length} classes`);
    } catch (error) {
        console.error('Error loading classes:', error);
        showToast(`Failed to load classes: ${error.message || 'Unknown error'}`, 'error');
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
    
    // Show loading state
    const container = document.getElementById('student-list');
    container.innerHTML = `
        <tr>
            <td colspan="5" class="loading-state">
                <div class="loading-spinner"></div>
                <h3>Loading Students...</h3>
                <p>Please wait while we fetch the student data</p>
            </td>
        </tr>
    `;
    
    try {
        currentDate = date;
        
        // Get students
        let url = '/api/students?limit=1000';
        if (classFilter !== 'all') {
            url += `&class=${encodeURIComponent(classFilter)}`;
        }
        
        console.log('Loading students from:', url);
        const response = await apiFetch(url);
        console.log('Students response:', response);
        
        currentStudents = response.data || [];
        
        if (currentStudents.length === 0) {
            showToast('No students found for the selected class', 'warning');
            renderStudentList();
            return;
        }
        
        // Get existing attendance for this date - use the same API as regular attendance
        const attendanceResponse = await apiFetch(`/api/attendance?from=${date}&to=${date}&limit=1000`);
        const existingAttendance = attendanceResponse.data || [];
        
        console.log('Existing attendance for date', date, ':', existingAttendance);
        
        // Create attendance lookup
        currentAttendanceData = {};
        existingAttendance.forEach(record => {
            currentAttendanceData[record.STUDENT_ID] = record.STATUS;
        });
        
        renderStudentList();
        showToast(`Loaded ${currentStudents.length} students`, 'success');
    } catch (error) {
        console.error('Error loading students:', error);
        showToast(`Failed to load students: ${error.message || 'Unknown error'}`, 'error');
        renderStudentList();
    }
}

// Render student list for bulk marking
function renderStudentList() {
    const container = document.getElementById('student-list');
    
    if (currentStudents.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No Students Found</h3>
                    <p>No students found for the selected criteria</p>
                </td>
            </tr>
        `;
        updateSummaryCards();
        return;
    }
    
    container.innerHTML = currentStudents.map(student => {
        const currentStatus = currentAttendanceData[student.STUDENT_ID] || 'Present';
        
        return `
            <tr>
                <td>
                    <input type="checkbox" class="student-checkbox" 
                           data-student-id="${student.STUDENT_ID}" 
                           onchange="updateSelectAllState()">
                </td>
                <td>
                    <div class="student-info">
                        <div class="student-name">${student.NAME}</div>
                        <div class="student-details">
                            <span><i class="fas fa-id-card"></i> ID: ${student.STUDENT_ID}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="roll-number">${student.ROLL_NUMBER}</span>
                </td>
                <td>
                    <span class="class-name">${student.CLASS}</span>
                </td>
                <td>
                    <div class="attendance-controls">
                        <div class="status-toggle">
                            <div class="status-option">
                                <input type="radio" 
                                       name="status_${student.STUDENT_ID}" 
                                       value="Present" 
                                       id="present_${student.STUDENT_ID}"
                                       ${currentStatus === 'Present' ? 'checked' : ''}
                                       onchange="updateAttendance(${student.STUDENT_ID}, 'Present')">
                                <label for="present_${student.STUDENT_ID}" class="present">
                                    <i class="fas fa-check"></i> Present
                                </label>
                            </div>
                            <div class="status-option">
                                <input type="radio" 
                                       name="status_${student.STUDENT_ID}" 
                                       value="Absent" 
                                       id="absent_${student.STUDENT_ID}"
                                       ${currentStatus === 'Absent' ? 'checked' : ''}
                                       onchange="updateAttendance(${student.STUDENT_ID}, 'Absent')">
                                <label for="absent_${student.STUDENT_ID}" class="absent">
                                    <i class="fas fa-times"></i> Absent
                                </label>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    updateSummaryCards();
    updateButtonText(0); // Reset button text when list is rendered
}

// Update attendance status for a student
function updateAttendance(studentId, status) {
    currentAttendanceData[studentId] = status;
    updateSummaryCards();
}

// Toggle attendance status for a student (legacy function)
function toggleAttendance(studentId, status) {
    updateAttendance(studentId, status);
}

// Update summary cards
function updateSummaryCards() {
    const totalStudents = currentStudents.length;
    const presentCount = Object.values(currentAttendanceData).filter(status => status === 'Present').length;
    const absentCount = Object.values(currentAttendanceData).filter(status => status === 'Absent').length;
    
    document.getElementById('total-students').textContent = totalStudents;
    document.getElementById('present-count').textContent = presentCount;
    document.getElementById('absent-count').textContent = absentCount;
}

// Toggle select all checkbox
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('select-all');
    const studentCheckboxes = document.querySelectorAll('.student-checkbox');
    
    studentCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
}

// Update select all checkbox state
function updateSelectAllState() {
    const selectAllCheckbox = document.getElementById('select-all');
    const studentCheckboxes = document.querySelectorAll('.student-checkbox');
    const checkedCount = document.querySelectorAll('.student-checkbox:checked').length;
    
    if (checkedCount === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (checkedCount === studentCheckboxes.length) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.indeterminate = true;
    }
    
    // Update button text based on selection
    updateButtonText(checkedCount);
}

// Update button text based on selection
function updateButtonText(selectedCount) {
    const markPresentText = document.getElementById('markPresentText');
    const markAbsentText = document.getElementById('markAbsentText');
    
    if (selectedCount > 0) {
        markPresentText.textContent = `Mark Selected Present (${selectedCount})`;
        markAbsentText.textContent = `Mark Selected Absent (${selectedCount})`;
    } else {
        markPresentText.textContent = 'Mark All Present';
        markAbsentText.textContent = 'Mark All Absent';
    }
}

// Mark students as present (selected or all)
function markAllPresent() {
    const selectedStudents = getSelectedStudents();
    
    if (selectedStudents.length > 0) {
        // Mark only selected students
        selectedStudents.forEach(studentId => {
            currentAttendanceData[studentId] = 'Present';
        });
        renderStudentList();
        showToast(`${selectedStudents.length} selected students marked as present`, 'success');
    } else {
        // Mark all students
        currentStudents.forEach(student => {
            currentAttendanceData[student.STUDENT_ID] = 'Present';
        });
        renderStudentList();
        showToast('All students marked as present', 'success');
    }
}

// Mark students as absent (selected or all)
function markAllAbsent() {
    const selectedStudents = getSelectedStudents();
    
    if (selectedStudents.length > 0) {
        // Mark only selected students
        selectedStudents.forEach(studentId => {
            currentAttendanceData[studentId] = 'Absent';
        });
        renderStudentList();
        showToast(`${selectedStudents.length} selected students marked as absent`, 'success');
    } else {
        // Mark all students
        currentStudents.forEach(student => {
            currentAttendanceData[student.STUDENT_ID] = 'Absent';
        });
        renderStudentList();
        showToast('All students marked as absent', 'success');
    }
}

// Get selected student IDs from checkboxes
function getSelectedStudents() {
    const selectedCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    return Array.from(selectedCheckboxes).map(checkbox => 
        parseInt(checkbox.getAttribute('data-student-id'))
    );
}

// Save bulk attendance
async function saveBulkAttendance() {
    if (currentStudents.length === 0) {
        showToast('No students loaded', 'error');
        return;
    }
    
    const classFilter = document.getElementById('bulk-class-filter').value;
    
    try {
        // Use the same API as regular attendance management
        const attendanceRecords = Object.entries(currentAttendanceData).map(([studentId, status]) => ({
            STUDENT_ID: parseInt(studentId),
            ATTENDANCE_DATE: currentDate,
            STATUS: status
        }));
        
        console.log('Saving bulk attendance:', attendanceRecords);
        
        // Save each attendance record using the regular attendance API
        let savedCount = 0;
        for (const record of attendanceRecords) {
            try {
                const response = await apiFetch('/api/attendance', {
                    method: 'POST',
                    body: JSON.stringify(record)
                });
                savedCount++;
            } catch (error) {
                console.error('Error saving individual attendance record:', error);
            }
        }
        
        showToast(`Attendance saved for ${savedCount} students`, 'success');
        
        // Auto-clear after successful save
        clearBulkAttendance();
        
        // Reload the list to show updated data
        loadStudentsForBulk();
    } catch (error) {
        console.error('Error saving bulk attendance:', error);
        showToast('Failed to save attendance', 'error');
    }
}

// Clear bulk attendance form
function clearBulkAttendance() {
    // Reset attendance data
    currentAttendanceData = {};
    
    // Reset form fields
    document.getElementById('bulk-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('bulk-class-filter').value = 'all';
    
    // Clear student list
    currentStudents = [];
    
    // Reset summary cards
    updateSummaryCards();
    
    // Reset select all checkbox
    const selectAllCheckbox = document.getElementById('select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
    
    // Show empty state
    const container = document.getElementById('student-list');
    container.innerHTML = `
        <tr>
            <td colspan="5" class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No Students Loaded</h3>
                <p>Click "Load Students" to begin marking attendance</p>
            </td>
        </tr>
    `;
}





// Event listeners
document.getElementById('bulk-class-filter').addEventListener('change', loadStudentsForBulk);
