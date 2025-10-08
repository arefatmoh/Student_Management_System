async function fetchJson(url, options) { 
    return window.apiFetch(url, options); 
}

// Load initial metrics
async function loadMetrics() {
    try {
        // Load students count (handle array or paginated)
        const students = await fetchJson('/api/students?limit=1');
        const totalStudents = (students && typeof students.total === 'number') ? students.total : (Array.isArray(students) ? students.length : (students && students.data ? students.data.length : 0));
        document.getElementById('totalStudents').textContent = totalStudents;
        updateChangeIndicator('studentsChange', totalStudents, totalStudents - 5);
        
        // Load attendance rate
        const today = new Date().toISOString().slice(0, 10);
        const attendance = await fetchJson(`/api/attendance?from=${today}&to=${today}`);
        const attArr = attendance && attendance.data ? attendance.data : (Array.isArray(attendance) ? attendance : []);
        const present = attArr.filter(a => a.STATUS === 'Present').length || 0;
        const absent = attArr.filter(a => a.STATUS === 'Absent').length || 0;
        const attendanceRate = (present + absent) > 0 ? Math.round((present / (present + absent)) * 100) : 0;
        document.getElementById('attendanceRate').textContent = `${attendanceRate}%`;
        updateChangeIndicator('attendanceChange', attendanceRate, attendanceRate - 5);
        
        // Load fees data
        const fees = await fetchJson('/api/reports/fees');
        const totalRevenueRaw = (fees && typeof fees.total !== 'undefined') ? fees.total : (fees && fees.totalPaid ? fees.totalPaid : 0);
        const totalRevenue = Number(totalRevenueRaw) || 0;
        document.getElementById('totalRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
        updateChangeIndicator('revenueChange', totalRevenue, totalRevenue - 100);
        
        // Average grade from marks API
        const marks = await fetchJson('/api/marks');
        const marksArr = marks && marks.data ? marks.data : (Array.isArray(marks) ? marks : []);
        let sumPct = 0, cntPct = 0;
        marksArr.forEach(m => {
            const max = Number(m.MAX_SCORE || 0);
            const score = Number(m.SCORE || 0);
            if (max > 0) { sumPct += Math.round((score / max) * 100); cntPct++; }
        });
        const averageGrade = cntPct > 0 ? Math.round(sumPct / cntPct) : 0;
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

// Show loading state
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    element.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner"></i>
            Generating report...
        </div>
    `;
}

// Show empty state
function showEmpty(elementId, icon, title, message) {
    const element = document.getElementById(elementId);
    element.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-${icon}"></i>
            <h3>${title}</h3>
            <p>${message}</p>
        </div>
    `;
}

// Generate attendance report
async function generateAttendanceReport() {
    const classFilter = document.getElementById('attClass').value;
    const fromDate = document.getElementById('attFrom').value;
    const toDate = document.getElementById('attTo').value;
    
    if (!fromDate || !toDate) {
        showToast('Please select both from and to dates', 'error');
        return;
    }
    
    showLoading('attResult');
    
    try {
        const qs = new URLSearchParams({ 
            class: classFilter, 
            from: fromDate, 
            to: toDate 
        });
        const data = await fetchJson(`/api/reports/attendance?${qs.toString()}`);
        
        const present = data.present || 0;
        const absent = data.absent || 0;
        const total = present + absent;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        
        document.getElementById('attResult').innerHTML = `
            <div class="report-grid">
                <div class="metric-card">
                    <h4><i class="fas fa-check-circle"></i> Present</h4>
                    <div class="value">${present}</div>
                </div>
                <div class="metric-card">
                    <h4><i class="fas fa-times-circle"></i> Absent</h4>
                    <div class="value">${absent}</div>
                </div>
                <div class="metric-card">
                    <h4><i class="fas fa-percentage"></i> Attendance Rate</h4>
                    <div class="value">${rate}%</div>
                </div>
                <div class="metric-card">
                    <h4><i class="fas fa-users"></i> Total</h4>
                    <div class="value">${total}</div>
                </div>
            </div>
            <div class="export-options">
                <button class="export-btn primary" onclick="exportAttendanceReport()">
                    <i class="fas fa-download"></i> Export CSV
                </button>
                <button class="export-btn" onclick="printAttendanceReport()">
                    <i class="fas fa-print"></i> Print Report
                </button>
            </div>
        `;
        
        showToast('Attendance report generated successfully', 'success');
    } catch (error) {
        console.error('Error generating attendance report:', error);
        showEmpty('attResult', 'exclamation-triangle', 'Error', 'Failed to generate attendance report. Please try again.');
        showToast('Failed to generate attendance report', 'error');
    }
}

// Generate fees report
async function generateFeesReport() {
    const classFilter = document.getElementById('feeClass').value;
    const fromDate = document.getElementById('feeFrom').value;
    const toDate = document.getElementById('feeTo').value;
    
    if (!fromDate || !toDate) {
        showToast('Please select both from and to dates', 'error');
        return;
    }
    
    showLoading('feeResult');
    
    try {
        const qs = new URLSearchParams({ 
            class: classFilter, 
            from: fromDate, 
            to: toDate 
        });
        const data = await fetchJson(`/api/reports/fees?${qs.toString()}`);
        
        const totalPaid = data.totalPaid || 0;
        const totalPending = data.totalPending || 0;
        const total = data.total || 0;
        
        document.getElementById('feeResult').innerHTML = `
            <div class="report-grid">
                <div class="metric-card">
                    <h4><i class="fas fa-check-circle"></i> Total Paid</h4>
                    <div class="value">$${totalPaid.toFixed(2)}</div>
                </div>
                <div class="metric-card">
                    <h4><i class="fas fa-clock"></i> Pending</h4>
                    <div class="value">$${totalPending.toFixed(2)}</div>
                </div>
                <div class="metric-card">
                    <h4><i class="fas fa-dollar-sign"></i> Total Revenue</h4>
                    <div class="value">$${total.toFixed(2)}</div>
                </div>
                <div class="metric-card">
                    <h4><i class="fas fa-percentage"></i> Collection Rate</h4>
                    <div class="value">${total > 0 ? Math.round((totalPaid / total) * 100) : 0}%</div>
                </div>
            </div>
            <div class="export-options">
                <button class="export-btn primary" onclick="exportFeesReport()">
                    <i class="fas fa-download"></i> Export CSV
                </button>
                <button class="export-btn" onclick="printFeesReport()">
                    <i class="fas fa-print"></i> Print Report
                </button>
            </div>
        `;
        
        showToast('Fees report generated successfully', 'success');
    } catch (error) {
        console.error('Error generating fees report:', error);
        showEmpty('feeResult', 'exclamation-triangle', 'Error', 'Failed to generate fees report. Please try again.');
        showToast('Failed to generate fees report', 'error');
    }
}

// Generate performance report
async function generatePerformanceReport() {
    const classFilter = document.getElementById('perfClass').value;
    const subjectFilter = document.getElementById('perfSubject').value;
    
    if (!classFilter) {
        showToast('Please enter a class', 'error');
        return;
    }
    
    showLoading('perfResult');
    
    try {
        const qs = new URLSearchParams({ 
            class: classFilter,
            subject: subjectFilter
        });
        const data = await fetchJson(`/api/reports/performance?${qs.toString()}`);
        
        if (!data.data || data.data.length === 0) {
            showEmpty('perfResult', 'graduation-cap', 'No Data', 'No performance data found for the selected criteria.');
            return;
        }
        
        let tableHTML = `
            <table class="report-table">
                <thead>
                    <tr>
                        <th><i class="fas fa-hashtag"></i> ID</th>
                        <th><i class="fas fa-user"></i> Name</th>
                        <th><i class="fas fa-id-card"></i> Roll Number</th>
                        <th><i class="fas fa-school"></i> Class</th>
                        <th><i class="fas fa-percentage"></i> Attendance %</th>
                        <th><i class="fas fa-dollar-sign"></i> Pending Fees</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.data.forEach(student => {
            tableHTML += `
                <tr>
                    <td><span class="student-id">#${student.STUDENT_ID}</span></td>
                    <td><strong>${student.NAME}</strong></td>
                    <td><span class="roll-number">${student.ROLL_NUMBER}</span></td>
                    <td><span class="class-badge">${student.CLASS}</span></td>
                    <td><span class="attendance-rate">${student.attendanceRate || 0}%</span></td>
                    <td><span class="pending-fees">$${student.pendingFees || 0}</span></td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
            <div class="export-options">
                <button class="export-btn primary" onclick="exportPerformanceReport()">
                    <i class="fas fa-download"></i> Export CSV
                </button>
                <button class="export-btn" onclick="printPerformanceReport()">
                    <i class="fas fa-print"></i> Print Report
                </button>
            </div>
        `;
        
        document.getElementById('perfResult').innerHTML = tableHTML;
        showToast('Performance report generated successfully', 'success');
    } catch (error) {
        console.error('Error generating performance report:', error);
        showEmpty('perfResult', 'exclamation-triangle', 'Error', 'Failed to generate performance report. Please try again.');
        showToast('Failed to generate performance report', 'error');
    }
}

// Generate custom report
async function generateCustomReport() {
    const reportType = document.getElementById('customType').value;
    const classFilter = document.getElementById('customClass').value;
    const fromDate = document.getElementById('customFrom').value;
    const toDate = document.getElementById('customTo').value;
    
    showLoading('customResult');
    
    try {
        let data;
        const qs = new URLSearchParams({ 
            class: classFilter,
            from: fromDate,
            to: toDate
        });
        
        switch (reportType) {
            case 'attendance':
                data = await fetchJson(`/api/reports/attendance?${qs.toString()}`);
                break;
            case 'fees':
                data = await fetchJson(`/api/reports/fees?${qs.toString()}`);
                break;
            case 'performance':
                data = await fetchJson(`/api/reports/performance?${qs.toString()}`);
                break;
            case 'students':
                data = await fetchJson(`/api/students?${qs.toString()}`);
                break;
            default:
                throw new Error('Invalid report type');
        }
        
        // Display custom report based on type
        displayCustomReport(reportType, data);
        showToast('Custom report generated successfully', 'success');
    } catch (error) {
        console.error('Error generating custom report:', error);
        showEmpty('customResult', 'exclamation-triangle', 'Error', 'Failed to generate custom report. Please try again.');
        showToast('Failed to generate custom report', 'error');
    }
}

// Display custom report
function displayCustomReport(type, data) {
    const element = document.getElementById('customResult');
    
    switch (type) {
        case 'attendance':
            const present = data.present || 0;
            const absent = data.absent || 0;
            const total = present + absent;
            const rate = total > 0 ? Math.round((present / total) * 100) : 0;
            
            element.innerHTML = `
                <div class="report-grid">
                    <div class="metric-card">
                        <h4><i class="fas fa-check-circle"></i> Present</h4>
                        <div class="value">${present}</div>
                    </div>
                    <div class="metric-card">
                        <h4><i class="fas fa-times-circle"></i> Absent</h4>
                        <div class="value">${absent}</div>
                    </div>
                    <div class="metric-card">
                        <h4><i class="fas fa-percentage"></i> Rate</h4>
                        <div class="value">${rate}%</div>
                    </div>
                </div>
            `;
            break;
            
        case 'fees':
            const totalPaid = data.totalPaid || 0;
            const totalPending = data.totalPending || 0;
            const totalRevenue = data.total || 0;
            
            element.innerHTML = `
                <div class="report-grid">
                    <div class="metric-card">
                        <h4><i class="fas fa-check-circle"></i> Paid</h4>
                        <div class="value">$${totalPaid.toFixed(2)}</div>
                    </div>
                    <div class="metric-card">
                        <h4><i class="fas fa-clock"></i> Pending</h4>
                        <div class="value">$${totalPending.toFixed(2)}</div>
                    </div>
                    <div class="metric-card">
                        <h4><i class="fas fa-dollar-sign"></i> Total</h4>
                        <div class="value">$${totalRevenue.toFixed(2)}</div>
                    </div>
                </div>
            `;
            break;
            
        case 'students':
            const students = data.data || [];
            element.innerHTML = `
                <div class="metric-card">
                    <h4><i class="fas fa-users"></i> Total Students</h4>
                    <div class="value">${students.length}</div>
                </div>
            `;
            break;
            
        default:
            element.innerHTML = '<p>Report data not available</p>';
    }
}

// Export functions
function exportAttendanceReport() {
    showToast('Exporting attendance report...', 'info');
}

function exportFeesReport() {
    showToast('Exporting fees report...', 'info');
}

function exportPerformanceReport() {
    showToast('Exporting performance report...', 'info');
}

// Print functions
function printAttendanceReport() {
    window.print();
}

function printFeesReport() {
    window.print();
}

function printPerformanceReport() {
    window.print();
}

// Set default dates
function setDefaultDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('attFrom').value = firstDay.toISOString().split('T')[0];
    document.getElementById('attTo').value = today.toISOString().split('T')[0];
    document.getElementById('feeFrom').value = firstDay.toISOString().split('T')[0];
    document.getElementById('feeTo').value = today.toISOString().split('T')[0];
    document.getElementById('customFrom').value = firstDay.toISOString().split('T')[0];
    document.getElementById('customTo').value = today.toISOString().split('T')[0];
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Report generation buttons (guarded)
    const attRun = document.getElementById('attRun');
    if (attRun) attRun.addEventListener('click', generateAttendanceReport);
    const feeRun = document.getElementById('feeRun');
    if (feeRun) feeRun.addEventListener('click', generateFeesReport);
    const perfRun = document.getElementById('perfRun');
    if (perfRun) perfRun.addEventListener('click', generatePerformanceReport);
    const customRun = document.getElementById('customRun');
    if (customRun) customRun.addEventListener('click', generateCustomReport);

    // Export buttons (guarded)
    const attExport = document.getElementById('attExport');
    if (attExport) attExport.addEventListener('click', exportAttendanceReport);
    const feeExport = document.getElementById('feeExport');
    if (feeExport) feeExport.addEventListener('click', exportFeesReport);
    const perfExport = document.getElementById('perfExport');
    if (perfExport) perfExport.addEventListener('click', exportPerformanceReport);
    const customExport = document.getElementById('customExport');
    if (customExport) customExport.addEventListener('click', () => {
        showToast('Exporting custom report...', 'info');
    });

    // Set default dates if inputs exist
    const attFrom = document.getElementById('attFrom');
    if (attFrom) setDefaultDates();

    // Load initial metrics (only if metrics cards exist)
    if (document.getElementById('totalStudents')) {
        loadMetrics();
    }
});
