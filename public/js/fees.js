async function fetchJson(url, options) { 
    return window.apiFetch(url, options); 
}

let currentPage = 1; 
let total = 0; 
let limit = 10;

// Load fees with modern interface
async function loadFees() {
    const studentId = document.getElementById('filterStudentId').value;
    const status = document.getElementById('filterStatus').value;
    const from = document.getElementById('filterFrom').value;
    const to = document.getElementById('filterTo').value;
    
    try {
        const qs = new URLSearchParams({ studentId, status, from, to, page: currentPage, limit });
        const data = await fetchJson(`/api/fees?${qs.toString()}`);
        
        renderFeesTable(data.data || []);
        renderPagination(data.pagination || {});
        updateSummaryCards(data);
    } catch (error) {
        console.error('Error loading fees:', error);
        showToast('Failed to load fee records', 'error');
    }
}

// Render fees table
function renderFeesTable(fees) {
    const body = document.getElementById('fees-body');
    
    if (fees.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-dollar-sign"></i>
                    <h3>No fee records found</h3>
                    <p>Try adjusting your search criteria or record a new payment.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    body.innerHTML = fees.map(fee => `
        <tr>
            <td><span class="fee-id">#${fee.FEE_ID}</span></td>
            <td>
                <a href="/students.html" class="student-link">
                    <i class="fas fa-user"></i> Student #${fee.STUDENT_ID}
                </a>
            </td>
            <td>
                <span class="amount-display ${fee.STATUS === 'Paid' ? 'amount-paid' : 'amount-pending'}">
                    $${parseFloat(fee.FEE_AMOUNT).toFixed(2)}
                </span>
            </td>
            <td>
                <span class="date-display">
                    ${fee.PAID_DATE ? new Date(fee.PAID_DATE).toLocaleDateString() : 'Not paid'}
                </span>
            </td>
            <td>
                <span class="status-badge status-${fee.STATUS.toLowerCase()}">
                    <i class="fas fa-${fee.STATUS === 'Paid' ? 'check-circle' : 'clock'}"></i>
                    ${fee.STATUS}
                </span>
            </td>
            <td>
                <div class="action-menu">
                    <button class="action-trigger" onclick="toggleActionMenu(${fee.FEE_ID})">
                        <i class="fas fa-ellipsis-v"></i>
                        Actions
                    </button>
                    <div class="action-dropdown" id="menu-${fee.FEE_ID}">
                        <a href="#" class="action-item" onclick="editFee(${fee.FEE_ID})">
                            <i class="fas fa-edit"></i>
                            Edit Fee
                        </a>
                        <a href="/students.html?student=${fee.STUDENT_ID}" class="action-item">
                            <i class="fas fa-user"></i>
                            View Student
                        </a>
                        <a href="/reports.html?student=${fee.STUDENT_ID}" class="action-item">
                            <i class="fas fa-chart-line"></i>
                            Student Report
                        </a>
                        <a href="#" class="action-item danger" onclick="deleteFee(${fee.FEE_ID})">
                            <i class="fas fa-trash"></i>
                            Delete Fee
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
            Showing ${((page - 1) * limit) + 1} to ${Math.min(page * limit, total)} of ${total} fee records
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
    
    // Total Paid
    const totalPaid = summary.totalPaid || 0;
    document.getElementById('totalPaid').textContent = `$${totalPaid.toFixed(2)}`;
    
    // Total Pending
    const totalPending = summary.totalPending || 0;
    document.getElementById('totalPending').textContent = `$${totalPending.toFixed(2)}`;
    
    // This Month (mock data for now)
    const thisMonth = summary.thisMonth || 0;
    document.getElementById('thisMonth').textContent = `$${thisMonth.toFixed(2)}`;
    
    // Total Students
    const totalStudents = summary.totalStudents || 0;
    document.getElementById('totalStudents').textContent = totalStudents;
    
    // Update change indicators (mock data for now)
    updateChangeIndicator('paidChange', totalPaid, totalPaid - 100);
    updateChangeIndicator('pendingChange', totalPending, totalPending + 50);
    updateChangeIndicator('monthChange', thisMonth, thisMonth - 25);
    updateChangeIndicator('studentsChange', totalStudents, totalStudents - 2);
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
function toggleActionMenu(feeId) {
    // Close all other menus
    document.querySelectorAll('.action-dropdown').forEach(menu => {
        if (menu.id !== `menu-${feeId}`) {
            menu.classList.remove('show');
        }
    });
    
    // Toggle current menu
    const menu = document.getElementById(`menu-${feeId}`);
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
    loadFees();
}

// Edit fee
async function editFee(id) {
    try {
        const fee = await fetchJson(`/api/fees/${id}`);
        document.getElementById('studentId').value = fee.STUDENT_ID;
        document.getElementById('amount').value = fee.FEE_AMOUNT;
        document.getElementById('paidDate').value = fee.PAID_DATE || '';
        document.getElementById('status').value = fee.STATUS;
        
        // Scroll to form
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
        
        // Focus on amount field
        document.getElementById('amount').focus();
        
        showToast('Fee loaded for editing', 'success');
    } catch (error) {
        console.error('Error loading fee:', error);
        showToast('Failed to load fee', 'error');
    }
}

// Delete fee
async function deleteFee(id) {
    if (!confirm('Are you sure you want to delete this fee record? This action cannot be undone.')) {
        return;
    }
    
    try {
        await fetchJson(`/api/fees/${id}`, { method: 'DELETE' });
        showToast('Fee record deleted successfully', 'success');
        loadFees();
    } catch (error) {
        console.error('Error deleting fee:', error);
        showToast('Failed to delete fee record', 'error');
    }
}

// Save fee
async function saveFee(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('studentId').value;
    const amount = document.getElementById('amount').value;
    const paidDate = document.getElementById('paidDate').value;
    const status = document.getElementById('status').value;
    
    if (!studentId || !amount) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const feeData = {
        STUDENT_ID: Number(studentId),
        FEE_AMOUNT: Number(amount),
        PAID_DATE: paidDate || null,
        STATUS: status
    };
    
    try {
        const saveBtn = document.getElementById('saveFeeBtn');
        const originalText = saveBtn.innerHTML;
        
        // Show loading state
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        await fetchJson('/api/fees', {
            method: 'POST',
            body: JSON.stringify(feeData)
        });
        
        showToast('Fee payment recorded successfully!', 'success');
        document.getElementById('fee-form').reset();
        loadFees();
        
    } catch (error) {
        console.error('Error saving fee:', error);
        showToast(error.message || 'Failed to record fee payment', 'error');
        
        // Highlight error fields
        if (error.message && error.message.includes('STUDENT_ID')) {
            document.getElementById('studentId').classList.add('input-error');
        }
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('saveFeeBtn');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Record Payment';
    }
}

// Clear form
function clearForm() {
    document.getElementById('fee-form').reset();
    document.querySelectorAll('.input-error').forEach(input => {
        input.classList.remove('input-error');
    });
    showToast('Form cleared', 'success');
}

// Search fees
function searchFees() {
    currentPage = 1;
    loadFees();
}

// Clear search
function clearSearch() {
    document.getElementById('filterStudentId').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterFrom').value = '';
    document.getElementById('filterTo').value = '';
    currentPage = 1;
    loadFees();
    showToast('Search filters cleared', 'success');
}

// Refresh data
function refreshData() {
    loadFees();
    showToast('Data refreshed', 'success');
}

// Set default date to today
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('paidDate').value = today;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Form submission
    document.getElementById('fee-form').addEventListener('submit', saveFee);
    
    // Button events
    document.getElementById('clearFeeBtn').addEventListener('click', clearForm);
    document.getElementById('searchFeeBtn').addEventListener('click', searchFees);
    document.getElementById('clearSearchFeeBtn').addEventListener('click', clearSearch);
    document.getElementById('refreshFeeBtn').addEventListener('click', refreshData);
    
    // Search on Enter key
    ['filterStudentId', 'filterFrom', 'filterTo'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchFees();
            }
        });
    });
    
    // Set default date
    setDefaultDate();
    
    // Load initial data
    loadFees();
});