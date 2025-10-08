let selectedFile = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    loadClasses();
    setupFileUpload();
    setDefaultDates();
});

// Load statistics
async function loadStats() {
    try {
        const response = await apiFetch('/api/import-export/stats');
        document.getElementById('stat-students').textContent = response.students || 0;
        document.getElementById('stat-attendance').textContent = response.attendance || 0;
        document.getElementById('stat-fees').textContent = response.fees || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load classes for dropdowns
async function loadClasses() {
    try {
        const response = await apiFetch('/api/classes');
        const classes = response || [];
        
        const dropdowns = [
            'import-class-filter',
            'export-students-class',
            'export-attendance-class'
        ];
        
        dropdowns.forEach(dropdownId => {
            const dropdown = document.getElementById(dropdownId);
            dropdown.innerHTML = '<option value="all">All Classes</option>';
            
            classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.NAME;
                option.textContent = cls.NAME;
                dropdown.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error loading classes:', error);
        showToast('Failed to load classes', 'error');
    }
}

// Set default dates for export
function setDefaultDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('export-attendance-start').value = firstDay.toISOString().split('T')[0];
    document.getElementById('export-attendance-end').value = today.toISOString().split('T')[0];
    document.getElementById('export-fees-start').value = firstDay.toISOString().split('T')[0];
    document.getElementById('export-fees-end').value = today.toISOString().split('T')[0];
}

// Setup file upload area
function setupFileUpload() {
    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-input');
    
    // Drag and drop events
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
}

// Handle file selection
function handleFileSelect(event) {
    if (event.target.files.length > 0) {
        handleFile(event.target.files[0]);
    }
}

// Handle file
function handleFile(file) {
    if (!file.name.endsWith('.csv')) {
        showToast('Please select a CSV file', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be less than 5MB', 'error');
        return;
    }
    
    selectedFile = file;
    document.getElementById('file-upload-area').innerHTML = `
        <div class="upload-icon">✅</div>
        <p><strong>${file.name}</strong></p>
        <p style="font-size: 14px; color: #6b7280;">${(file.size / 1024).toFixed(1)} KB</p>
        <button class="btn btn-secondary" onclick="clearFile()">Remove File</button>
    `;
    
    document.getElementById('import-btn').disabled = false;
}

// Clear selected file
function clearFile() {
    selectedFile = null;
    document.getElementById('file-upload-area').innerHTML = `
        <div class="upload-icon">📁</div>
        <p>Click to select CSV file or drag and drop</p>
        <p style="font-size: 14px; color: #6b7280;">Maximum file size: 5MB</p>
    `;
    document.getElementById('import-btn').disabled = true;
    document.getElementById('import-results').classList.remove('show');
}

// Download template
function downloadTemplate() {
    // Generate CSV with Ethiopian sample names plus existing DB students (first 20)
    try {
        generateTemplateCsv();
    } catch (e) {
        // Fallback to server endpoint
        window.open('/api/import-export/students/template', '_blank');
    }
}

async function generateTemplateCsv() {
    const headers = ['NAME','ROLL_NUMBER','CLASS','PARENT_CONTACT'];
    const ethiopianSamples = [
        ['Abebe Bekele','R001','Grade 1','0912345678'],
        ['Almaz Kebede','R002','Grade 1','0911223344'],
        ['Kebede Alemu','R003','Grade 2','0922334455'],
        ['Hanna Tesfaye','R004','Grade 3','0933445566'],
        ['Meron Haile','R005','Grade 2','0944556677'],
        ['Samuel Girma','R006','Grade 4','0955667788'],
        ['Mulu Getachew','R007','Grade 5','0966778899'],
        ['Kidus Tadesse','R008','Grade 3','0977889900'],
        ['Feven Solomon','R009','Grade 4','0988990011'],
        ['Yared Tsegaye','R010','Grade 5','0999001122']
    ];
    let existing = [];
    try {
        const res = await apiFetch('/api/students?limit=20');
        const data = res && res.data ? res.data : res;
        existing = (data || []).map(s => [s.NAME, s.ROLL_NUMBER, s.CLASS, s.PARENT_CONTACT || '']);
    } catch (e) {
        // ignore fetch errors; still provide samples
    }
    const rows = [headers].concat(ethiopianSamples).concat(existing);
    const csv = rows.map(r => r.map(v => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g,'""') + '"' : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_template_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import students
async function importStudents() {
    if (!selectedFile) {
        showToast('Please select a file first', 'error');
        return;
    }
    
    const classFilter = document.getElementById('import-class-filter').value;
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    // Show progress bar
    document.getElementById('progress-bar').style.display = 'block';
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('import-btn').disabled = true;
    
    try {
        // Simulate progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            document.getElementById('progress-fill').style.width = progress + '%';
            if (progress >= 90) clearInterval(progressInterval);
        }, 100);
        
        const response = await fetch('/api/import-export/students/import', {
            method: 'POST',
            body: formData
        });
        
        clearInterval(progressInterval);
        document.getElementById('progress-fill').style.width = '100%';
        
        const result = await response.json();
        
        if (response.ok) {
            showImportResults(result);
            showToast(`Import completed: ${result.success} successful, ${result.errors.length} errors`, 'success');
            loadStats(); // Refresh stats
        } else {
            throw new Error(result.error || 'Import failed');
        }
    } catch (error) {
        console.error('Error importing students:', error);
        showToast(error.message || 'Failed to import students', 'error');
    } finally {
        document.getElementById('import-btn').disabled = false;
        setTimeout(() => {
            document.getElementById('progress-bar').style.display = 'none';
        }, 1000);
    }
}

// Show import results
function showImportResults(result) {
    const resultsDiv = document.getElementById('import-results');
    const summaryDiv = document.getElementById('import-summary');
    const errorListDiv = document.getElementById('error-list');
    
    summaryDiv.innerHTML = `
        <div class="success-count">✅ Successfully imported: ${result.success}</div>
        ${result.duplicates > 0 ? `<div class="duplicate-count">⚠️ Duplicates skipped: ${result.duplicates}</div>` : ''}
        ${result.errors.length > 0 ? `<div class="error-count">❌ Errors: ${result.errors.length}</div>` : ''}
    `;
    
    if (result.errors.length > 0) {
        errorListDiv.innerHTML = result.errors.map(error => 
            `<div class="error-item">${error}</div>`
        ).join('');
    } else {
        errorListDiv.innerHTML = '<div class="error-item">No errors!</div>';
    }
    
    resultsDiv.classList.add('show');
}

// Export students
async function exportStudents() {
    try {
        const classFilter = document.getElementById('export-students-class').value;
        let url = '/api/import-export/students/export';
        if (classFilter !== 'all') {
            url += `?classFilter=${encodeURIComponent(classFilter)}`;
        }
        
        const response = await fetch(url);
        if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
            showToast('Students exported successfully', 'success');
        } else {
            throw new Error('Export failed');
        }
    } catch (error) {
        console.error('Error exporting students:', error);
        showToast('Failed to export students', 'error');
    }
}

// Export attendance
async function exportAttendance() {
    try {
        const startDate = document.getElementById('export-attendance-start').value;
        const endDate = document.getElementById('export-attendance-end').value;
        const classFilter = document.getElementById('export-attendance-class').value;
        
        if (!startDate || !endDate) {
            showToast('Please select start and end dates', 'error');
            return;
        }
        
        let url = `/api/import-export/attendance/export?startDate=${startDate}&endDate=${endDate}`;
        if (classFilter !== 'all') {
            url += `&classFilter=${encodeURIComponent(classFilter)}`;
        }
        
        const response = await fetch(url);
        if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `attendance_${startDate}_to_${endDate}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
            showToast('Attendance exported successfully', 'success');
        } else {
            throw new Error('Export failed');
        }
    } catch (error) {
        console.error('Error exporting attendance:', error);
        showToast('Failed to export attendance', 'error');
    }
}

// Export fees
async function exportFees() {
    try {
        const startDate = document.getElementById('export-fees-start').value;
        const endDate = document.getElementById('export-fees-end').value;
        const status = document.getElementById('export-fees-status').value;
        
        let url = '/api/import-export/fees/export';
        const params = new URLSearchParams();
        
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (status) params.append('status', status);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await fetch(url);
        if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `fees_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
            showToast('Fees exported successfully', 'success');
        } else {
            throw new Error('Export failed');
        }
    } catch (error) {
        console.error('Error exporting fees:', error);
        showToast('Failed to export fees', 'error');
    }
}
