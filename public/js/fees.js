async function fetchJson(url, options) { 
    return window.apiFetch(url, options); 
}

let currentPage = 1; 
let total = 0; 
let limit = 10;

// Load fees with modern interface
async function loadFees() {
    const studentId = document.getElementById('filterStudent')?.dataset.id || '';
    const studentName = document.getElementById('filterStudent')?.dataset.name || '';
    const status = document.getElementById('filterStatus').value;
    const from = document.getElementById('filterFrom').value;
    const to = document.getElementById('filterTo').value;
    
    try {
        const qs = new URLSearchParams({ studentId, studentName, status, from, to, page: currentPage, limit });
        const data = await fetchJson(`/api/fees?${qs.toString()}`);
        
        renderFeesTable(data.data || []);
        renderPagination(data.pagination || { page: data.page, limit: data.limit, total: data.total, pages: Math.ceil((data.total||0) / (data.limit||limit)) });
        // fetch real summary separate from list
        loadFeesSummary();
    } catch (error) {
        console.error('Error loading fees:', error);
        showToast('Failed to load fee records', 'error');
    }
}

async function loadFeesSummary() {
    try {
        const s = await fetchJson('/api/fees/summary');
        updateSummaryCards({ summary: s });
    } catch (e) {
        // ignore silently
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
                <a href="/students.html?student=${fee.STUDENT_ID}" class="student-link">
                    <i class="fas fa-user"></i> ${fee.STUDENT_NAME || ('#' + fee.STUDENT_ID)}
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
                <span class="date-display">${fee.MONTH_PAID || ''}</span>
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
                        <a href="#" class="action-item" onclick="viewInvoice(${fee.FEE_ID})">
                            <i class="fas fa-file-invoice"></i>
                            View Invoice
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
    const paidDate = null; // auto set on server
    const monthField = document.getElementById('monthPaid');
    const monthPaid = monthField && monthField.tagName === 'SELECT'
        ? Array.from(monthField.selectedOptions).map(o => o.value).join(',')
        : (monthField ? monthField.value : '');
    const status = document.getElementById('status').value;
    
    if (!studentId || !amount) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const feeData = {
        STUDENT_ID: Number(studentId),
        FEE_AMOUNT: Number(amount),
        PAID_DATE: paidDate || null,
        MONTH_PAID: monthPaid || null,
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
    // removed manual paid date; keep function for compatibility
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
    ['filterStudent', 'filterFrom', 'filterTo'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchFees();
            }
        });
    });
    
    // Tabs
    initFeeTabs();

    // Initialize custom month pickers (single and bulk)
    initMonthPicker({
        hiddenId: 'monthPaid',
        controlId: 'monthControl',
        panelId: 'monthPanel',
        gridId: 'monthGrid',
        yearLabelId: 'monthYearLabel',
        prevBtnId: 'monthPrev',
        nextBtnId: 'monthNext',
        preselectCurrent: true
    });
    initMonthPicker({
        hiddenId: 'monthPaidBulk',
        controlId: 'monthPaidBulkControl',
        panelId: 'monthPaidBulkPanel',
        gridId: 'monthPaidBulkGrid',
        yearLabelId: 'monthPaidBulkYearLabel',
        prevBtnId: 'monthPaidBulkPrev',
        nextBtnId: 'monthPaidBulkNext',
        preselectCurrent: false
    });

    // Bulk handlers
    document.getElementById('bulkClass').addEventListener('change', loadBulkStudents);
    document.getElementById('bulkRefreshBtn').addEventListener('click', loadBulkStudents);
    document.getElementById('bulkSelectAll').addEventListener('change', toggleBulkSelectAll);
    // Load classes into bulk class select
    loadBulkClasses();
    // No manual payment date field
    
    // Cart events
    const addSingleBtn = document.getElementById('addSingleToCartBtn');
    const addBulkBtn = document.getElementById('bulkAddToCartBtn');
    const cartClearBtn = document.getElementById('cartClearBtn');
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (addSingleBtn) addSingleBtn.addEventListener('click', addSingleToCart);
    if (addBulkBtn) addBulkBtn.addEventListener('click', addBulkToCart);
    if (cartClearBtn) cartClearBtn.addEventListener('click', clearCart);
    if (checkoutBtn) checkoutBtn.addEventListener('click', () => checkoutCart(true));

    // Invoice modal events
    const invoiceModal = document.getElementById('invoiceModal');
    const invoiceClose = document.getElementById('invoiceModalClose');
    const invoiceDone = document.getElementById('invoiceDoneBtn');
    const invoicePrint = document.getElementById('invoicePrintBtn');
    if (invoiceClose) invoiceClose.addEventListener('click', () => invoiceModal.classList.add('hidden'));
    if (invoiceDone) invoiceDone.addEventListener('click', () => invoiceModal.classList.add('hidden'));
    if (invoicePrint) invoicePrint.addEventListener('click', printInvoicePreview);
    
    // Load initial data
    loadFees();

    // Live student search (single form)
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
        searchFees();
    });
});

// Simple debounce helper
function debounce(fn, wait) {
    let t;
    return function(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

// Month picker logic
function initMonthPicker(cfg) {
    const hidden = document.getElementById(cfg.hiddenId);
    const control = document.getElementById(cfg.controlId);
    const panel = document.getElementById(cfg.panelId);
    const grid = document.getElementById(cfg.gridId);
    const yearLabel = document.getElementById(cfg.yearLabelId);
    const btnPrev = document.getElementById(cfg.prevBtnId);
    const btnNext = document.getElementById(cfg.nextBtnId);

    if (!hidden || !control || !panel || !grid) return;

    let currentYear = new Date().getFullYear();
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    function selectedMonths() {
        return (hidden.value || '').split(',').map(s => s.trim()).filter(Boolean);
    }

    function setSelectedMonths(list) {
        hidden.value = list.join(',');
        renderChips();
        renderGrid();
    }

    function renderChips() {
        control.innerHTML = '';
        const sel = selectedMonths();
        if (sel.length === 0) {
            const ph = document.createElement('span');
            ph.className = 'month-placeholder';
            ph.textContent = 'Select month(s)';
            control.appendChild(ph);
            return;
        }
        sel.forEach(v => {
            const chip = document.createElement('span');
            chip.className = 'month-chip';
            chip.innerHTML = `${v} <span class="chip-remove" data-v="${v}"><i class="fas fa-times"></i></span>`;
            control.appendChild(chip);
        });
    }

    function renderGrid() {
        yearLabel.textContent = String(currentYear);
        const sel = new Set(selectedMonths());
        grid.innerHTML = '';
        for (let m = 0; m < 12; m++) {
            const v = `${currentYear}-${String(m+1).padStart(2,'0')}`;
            const btn = document.createElement('div');
            btn.className = 'month-btn' + (sel.has(v) ? ' active' : '');
            btn.dataset.v = v;
            btn.textContent = `${monthNames[m]}`;
            grid.appendChild(btn);
        }
    }

    control.addEventListener('click', () => {
        panel.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.month-picker')) {
            panel.classList.add('hidden');
        }
    });

    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.month-btn');
        if (!btn) return;
        const v = btn.dataset.v;
        const sel = new Set(selectedMonths());
        if (sel.has(v)) sel.delete(v); else sel.add(v);
        setSelectedMonths(Array.from(sel).sort());
    });

    control.addEventListener('click', (e) => {
        const rm = e.target.closest('.chip-remove');
        if (!rm) return;
        const v = rm.dataset.v;
        const sel = new Set(selectedMonths());
        sel.delete(v);
        setSelectedMonths(Array.from(sel).sort());
        e.stopPropagation();
    });

    btnPrev.addEventListener('click', () => { currentYear--; renderGrid(); });
    btnNext.addEventListener('click', () => { currentYear++; renderGrid(); });

    // initial state: preselect current month
    if (cfg.preselectCurrent) {
        const d = new Date();
        setSelectedMonths([`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`]);
    } else {
        renderChips();
        renderGrid();
    }
}

// Tabs for single/bulk panels
function initFeeTabs() {
    const buttons = document.querySelectorAll('.tab-button');
    const panels = document.querySelectorAll('.tab-panel');
    buttons.forEach(btn => btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        panels.forEach(p => p.classList.add('hidden'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.remove('hidden');
        document.getElementById(btn.dataset.tab).classList.add('active');
    }));
}

// Cart state and helpers
let invoiceCart = [];
function renderCart() {
    const body = document.getElementById('cartBody');
    const label = document.getElementById('cartTotalLabel');
    if (!body || !label) return;
    if (!invoiceCart.length) {
        body.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-shopping-cart"></i>
                    <p>No items yet. Use \"Add to Invoice Cart\" to collect items.</p>
                </td>
            </tr>`;
        label.textContent = '0 items • $0.00';
        return;
    }
    let total = 0;
    body.innerHTML = invoiceCart.map((it, idx) => {
        total += Number(it.amount||0);
        return `
            <tr>
                <td>#${it.studentId} ${it.studentName || ''}</td>
                <td>${(it.months||[]).join(', ')}</td>
                <td>$${Number(it.amount||0).toFixed(2)}</td>
                <td>${it.status||'Paid'}</td>
                <td><button class="btn btn-secondary btn-small" onclick="removeCartItem(${idx})"><i class="fas fa-times"></i> Remove</button></td>
            </tr>`;
    }).join('');
    label.textContent = `${invoiceCart.length} items • $${total.toFixed(2)}`;
}
function removeCartItem(idx) {
    invoiceCart.splice(idx, 1);
    renderCart();
}
function clearCart() {
    invoiceCart = [];
    renderCart();
}
function addSingleToCart() {
    const studentId = Number(document.getElementById('studentId').value);
    const studentDisplay = (document.getElementById('studentSearch').value || '').trim();
    const amount = Number(document.getElementById('amount').value||0);
    const months = (document.getElementById('monthPaid').value||'').split(',').map(s=>s.trim()).filter(Boolean);
    const status = document.getElementById('status').value;
    if (!studentId || !amount || months.length===0) { showToast('Fill student, amount and months', 'error'); return; }
    const studentName = studentDisplay.split(' (')[0] || '';
    const className = studentDisplay.includes(' - ') ? studentDisplay.split(' - ').pop() : '';
    invoiceCart.push({ studentId, studentName, className, amount, months, status });
    renderCart();
    resetSingleForm();
    showToast('Added to Invoice Cart', 'success');
}
function addBulkToCart() {
    const amount = Number(document.getElementById('bulkAmount').value||0);
    const months = (document.getElementById('monthPaidBulk').value||'').split(',').map(s=>s.trim()).filter(Boolean);
    const status = document.getElementById('bulkStatus').value;
    const ids = Array.from(document.querySelectorAll('.bulkCheck:checked')).map(cb=>Number(cb.value));
    if (!ids.length || !amount || !months.length) { showToast('Select students, amount and months', 'error'); return; }
    ids.forEach(id => {
        const row = document.querySelector(`.bulkCheck[value="${id}"]`)?.closest('tr');
        const name = row ? row.children[2].textContent.trim() : '';
        const cls = row ? row.children[4].textContent.trim() : '';
        invoiceCart.push({ studentId: id, studentName: name, className: cls, amount, months, status });
    });
    renderCart();
}
async function checkoutCart(withPayments) {
    // If no cart items, fall back to quick payment (single form)
    if (!invoiceCart.length) {
        return quickSinglePayment();
    }
    try {
        const previewItems = invoiceCart.map(it => ({ ...it }));
        const payload = invoiceCart.map(it => ({
            studentId: it.studentId,
            amount: it.amount,
            months: it.months,
            status: withPayments ? (it.status||'Paid') : undefined,
            recordPayment: withPayments
        }));
        const res = await fetchJson('/api/invoices/batch', { method: 'POST', body: JSON.stringify({ items: payload }) });
        // Show success toast immediately
        showToast('Invoices created and payments recorded', 'success');
        // Show invoice preview modal
        renderInvoicePreview(res.created || [], previewItems);
        const modal = document.getElementById('invoiceModal');
        if (modal) modal.classList.remove('hidden');
        clearCart();
        loadFees();
    } catch (e) {
        if (String(e).includes('401')) {
            showToast('Session expired. Please log in again.', 'error');
        } else {
            showToast('Checkout failed', 'error');
        }
    }
}

// Quick fallback: act like the previous Record Payment button
async function quickSinglePayment() {
    const studentId = document.getElementById('studentId')?.value;
    const amount = document.getElementById('amount')?.value;
    const monthPaid = (document.getElementById('monthPaid')?.value || '').trim();
    const status = document.getElementById('status')?.value || 'Paid';
    if (!studentId || !amount || !monthPaid) {
        showToast('Please fill student, amount and months', 'error');
        return;
    }
    try {
        await fetchJson('/api/fees', {
            method: 'POST',
            body: JSON.stringify({
                STUDENT_ID: Number(studentId),
                FEE_AMOUNT: Number(amount),
                MONTH_PAID: monthPaid,
                STATUS: status
            })
        });
        showToast('Payment recorded successfully', 'success');
        loadFees();
    } catch (e) {
        if (String(e).includes('401')) {
            showToast('Session expired. Please log in again.', 'error');
        } else {
            showToast('Failed to record payment', 'error');
        }
    }
}

function renderInvoicePreview(created, items = []) {
    const box = document.getElementById('invoicePreview');
    if (!box) return;
    const today = new Date().toLocaleDateString();
    const header = `
        <div style="text-align:center; margin-bottom:16px;">
            <div style="font-size:20px; font-weight:800;">Student Management System</div>
            <div style="color:#6b7280;">${today}</div>
        </div>`;
    const cards = (items.length ? items : (created||[])).map((it, idx) => {
        const inv = created[idx] || {};
        const invNo = inv.invoiceNumber ? `#${inv.invoiceNumber}` : `#${(inv.id||'')}`;
        const name = it.studentName ? it.studentName : `Student ${it.studentId || inv.studentId}`;
        const cls = it.className ? `Class: ${it.className}` : '';
        const months = (it.months||inv.months||[]).join(', ');
        const amount = Number(it.amount || inv.amount || 0).toFixed(2);
        const status = (it.status || 'Paid');
        return `
            <div style="border:1px solid #e5e7eb; border-radius:12px; margin:12px 0; overflow:hidden;">
                <div style="background:#f9fafb; padding:10px 14px; display:flex; justify-content:space-between;">
                    <div style="font-weight:700;">Invoice ${invNo}</div>
                    <div style="color:#6b7280;">Status: ${status}</div>
                </div>
                <div style="padding:14px; display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <div>
                        <div style="font-weight:600;">${name}</div>
                        <div style="color:#6b7280; font-size:12px;">ID: ${it.studentId || inv.studentId}</div>
                        ${cls ? `<div style=\"color:#6b7280; font-size:12px;\">${cls}</div>` : ''}
                    </div>
                    <div>
                        <div><span style="color:#6b7280;">Months:</span> ${months}</div>
                        <div><span style="color:#6b7280;">Amount:</span> $${amount}</div>
                    </div>
                </div>
            </div>`;
    }).join('');
    box.innerHTML = `<div style="padding:20px">${header}${cards || '<div style=\"text-align:center; color:#6b7280;\">No invoices to show</div>'}</div>`;
}

// Reset single payment form after adding to cart
function resetSingleForm() {
    const studentInput = document.getElementById('studentSearch');
    const studentIdHidden = document.getElementById('studentId');
    const amountInput = document.getElementById('amount');
    const statusSelect = document.getElementById('status');
    const monthHidden = document.getElementById('monthPaid');
    const monthControl = document.getElementById('monthControl');
    const monthPanel = document.getElementById('monthPanel');
    const results = document.getElementById('studentResults');

    if (studentInput) studentInput.value = '';
    if (studentIdHidden) studentIdHidden.value = '';
    if (amountInput) amountInput.value = '';
    if (statusSelect) statusSelect.value = 'Paid';
    if (results) results.innerHTML = '';
    if (monthHidden) monthHidden.value = '';
    if (monthControl) monthControl.innerHTML = '<span class="month-placeholder">Select month(s)</span>';
    if (monthPanel) monthPanel.classList.add('hidden');
}

function printInvoicePreview() {
    const content = document.getElementById('invoicePreview').innerHTML;
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><title>Invoices</title></head><body>${content}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}
// Load classes for bulk select
async function loadBulkClasses() {
    const sel = document.getElementById('bulkClass');
    if (!sel) return;
    sel.innerHTML = '<option value="">Loading...</option>';
    try {
        const classes = await fetchJson('/api/classes');
        sel.innerHTML = '<option value="">Select a class</option>' +
            classes.map(c => `<option value="${c.NAME}">${c.NAME}</option>`).join('');
    } catch (e) {
        sel.innerHTML = '<option value="">Failed to load classes</option>';
    }
}

// Load bulk students by class
async function loadBulkStudents() {
    const cls = document.getElementById('bulkClass').value;
    const body = document.getElementById('bulkStudentsBody');
    if (!cls) {
        body.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-info-circle"></i>
                    <p>Select a class to load students</p>
                </td>
            </tr>`;
        return;
    }
    try {
        const data = await fetchJson(`/api/students?class=${encodeURIComponent(cls)}&limit=1000`);
        const students = data.data || data.students || [];
        body.innerHTML = students.map(s => `
            <tr>
                <td><input type="checkbox" class="bulkCheck" value="${s.STUDENT_ID}" /></td>
                <td>#${s.STUDENT_ID}</td>
                <td>${s.NAME}</td>
                <td>${s.ROLL_NUMBER}</td>
                <td>${s.CLASS}</td>
            </tr>
        `).join('');
    } catch (e) {
        body.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load students</p>
                </td>
            </tr>`;
    }
}

function toggleBulkSelectAll(e) {
    const checked = e.target.checked;
    document.querySelectorAll('.bulkCheck').forEach(cb => cb.checked = checked);
}

async function submitBulkPayments() {
    const amount = Number(document.getElementById('bulkAmount').value || 0);
    const status = document.getElementById('bulkStatus').value;
    const months = (document.getElementById('monthPaidBulk').value || '').trim();
    const selected = Array.from(document.querySelectorAll('.bulkCheck:checked')).map(cb => Number(cb.value));
    if (!selected.length || !amount || !months) {
        showToast('Select students, amount, and months', 'error');
        return;
    }
    // Submit sequentially to reuse existing endpoint; could be optimized later
    try {
        for (const studentId of selected) {
            await fetchJson('/api/fees', {
                method: 'POST',
                body: JSON.stringify({ STUDENT_ID: studentId, FEE_AMOUNT: amount, MONTH_PAID: months, STATUS: status })
            });
        }
        showToast('Bulk payments recorded', 'success');
        loadFees();
    } catch (e) {
        showToast('Failed to record some payments', 'error');
    }
}

// View invoice for a specific fee record
async function viewInvoice(feeId) {
    try {
        const fee = await fetchJson(`/api/fees/${feeId}`);
        const student = await fetchJson(`/api/students/${fee.STUDENT_ID}`);
        
        // Create invoice preview
        const invoiceData = {
            feeId: fee.FEE_ID,
            studentName: student.NAME,
            studentId: student.STUDENT_ID,
            rollNumber: student.ROLL_NUMBER,
            className: student.CLASS,
            amount: fee.FEE_AMOUNT,
            monthPaid: fee.MONTH_PAID,
            status: fee.STATUS,
            paidDate: fee.PAID_DATE
        };
        
        renderInvoicePreview([{ invoiceNumber: `INV-${feeId}`, ...invoiceData }], [invoiceData]);
        
        // Show the modal
        const modal = document.getElementById('invoiceModal');
        if (modal) modal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading invoice:', error);
        showToast('Failed to load invoice details', 'error');
    }
}