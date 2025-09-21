let currentPage = 1;
let currentFilters = {};

// Load students for dropdowns
async function loadStudents() {
    try {
        const response = await apiFetch('/api/students?limit=1000');
        const students = response.students || [];
        
        const studentSelect = document.getElementById('student-select');
        const studentFilter = document.getElementById('student-filter');
        
        // Clear existing options
        studentSelect.innerHTML = '<option value="">Select Student</option>';
        studentFilter.innerHTML = '<option value="">All Students</option>';
        
        students.forEach(student => {
            const option1 = document.createElement('option');
            option1.value = student.STUDENT_ID;
            option1.textContent = `${student.NAME} (${student.ROLL_NUMBER})`;
            studentSelect.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = student.STUDENT_ID;
            option2.textContent = `${student.NAME} (${student.ROLL_NUMBER})`;
            studentFilter.appendChild(option2);
        });
    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Failed to load students', 'error');
    }
}

// Load invoices
async function loadInvoices(page = 1) {
    try {
        currentPage = page;
        const status = document.getElementById('status-filter').value;
        const studentId = document.getElementById('student-filter').value;
        
        let url = `/api/invoices?page=${page}&limit=10`;
        if (status) url += `&status=${status}`;
        if (studentId) url += `&studentId=${studentId}`;
        
        const response = await apiFetch(url);
        const invoices = response.invoices || [];
        const pagination = response.pagination || {};
        
        renderInvoicesTable(invoices);
        renderPagination(pagination);
    } catch (error) {
        console.error('Error loading invoices:', error);
        showToast('Failed to load invoices', 'error');
    }
}

// Render invoices table
function renderInvoicesTable(invoices) {
    const tbody = document.querySelector('#invoices-table tbody');
    tbody.innerHTML = '';
    
    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No invoices found</td></tr>';
        return;
    }
    
    invoices.forEach(invoice => {
        const row = document.createElement('tr');
        const remainingAmount = invoice.REMAINING_AMOUNT || (invoice.TOTAL_AMOUNT - invoice.PAID_AMOUNT);
        const statusClass = getStatusClass(invoice.ACTUAL_STATUS || invoice.STATUS);
        
        row.innerHTML = `
            <td>${invoice.INVOICE_NUMBER}</td>
            <td>${invoice.STUDENT_NAME} (${invoice.ROLL_NUMBER})</td>
            <td>${invoice.DESCRIPTION}</td>
            <td>$${parseFloat(invoice.TOTAL_AMOUNT).toFixed(2)}</td>
            <td>$${parseFloat(invoice.PAID_AMOUNT).toFixed(2)}</td>
            <td>$${parseFloat(remainingAmount).toFixed(2)}</td>
            <td>${new Date(invoice.DUE_DATE).toLocaleDateString()}</td>
            <td><span class="status ${statusClass}">${invoice.ACTUAL_STATUS || invoice.STATUS}</span></td>
            <td>
                <div class="action-menu">
                    <button class="action-btn" onclick="viewInvoiceDetails(${invoice.INVOICE_ID})">👁️</button>
                    <button class="action-btn" onclick="recordPayment(${invoice.INVOICE_ID}, ${remainingAmount})" ${remainingAmount <= 0 ? 'disabled' : ''}>💰</button>
                    <button class="action-btn" onclick="deleteInvoice(${invoice.INVOICE_ID})">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Get status CSS class
function getStatusClass(status) {
    switch (status) {
        case 'Paid': return 'status-paid';
        case 'Partially Paid': return 'status-partial';
        case 'Pending': return 'status-pending';
        case 'Overdue': return 'status-overdue';
        default: return 'status-pending';
    }
}

// Render pagination
function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    container.innerHTML = '';
    
    if (pagination.pages <= 1) return;
    
    const { page, pages } = pagination;
    
    // Previous button
    if (page > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '← Previous';
        prevBtn.className = 'btn btn-secondary';
        prevBtn.onclick = () => loadInvoices(page - 1);
        container.appendChild(prevBtn);
    }
    
    // Page numbers
    for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = `btn ${i === page ? 'btn-primary' : 'btn-secondary'}`;
        pageBtn.onclick = () => loadInvoices(i);
        container.appendChild(pageBtn);
    }
    
    // Next button
    if (page < pages) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next →';
        nextBtn.className = 'btn btn-secondary';
        nextBtn.onclick = () => loadInvoices(page + 1);
        container.appendChild(nextBtn);
    }
}

// Create invoice
async function createInvoice(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const invoiceData = {
        studentId: document.getElementById('student-select').value,
        description: document.getElementById('description').value,
        totalAmount: parseFloat(document.getElementById('total-amount').value),
        dueDate: document.getElementById('due-date').value
    };
    
    try {
        const response = await apiFetch('/api/invoices', {
            method: 'POST',
            body: JSON.stringify(invoiceData)
        });
        
        showToast('Invoice created successfully!', 'success');
        form.reset();
        loadInvoices(currentPage);
    } catch (error) {
        console.error('Error creating invoice:', error);
        showToast(error.message || 'Failed to create invoice', 'error');
    }
}

// Record payment
function recordPayment(invoiceId, maxAmount) {
    document.getElementById('payment-invoice-id').value = invoiceId;
    document.getElementById('payment-amount').max = maxAmount;
    document.getElementById('payment-amount').value = maxAmount;
    document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('payment-modal').style.display = 'block';
}

// Close payment modal
function closePaymentModal() {
    document.getElementById('payment-modal').style.display = 'none';
    document.getElementById('payment-form').reset();
}

// Submit payment
async function submitPayment(event) {
    event.preventDefault();
    
    const paymentData = {
        invoiceId: document.getElementById('payment-invoice-id').value,
        amount: parseFloat(document.getElementById('payment-amount').value),
        paymentDate: document.getElementById('payment-date').value,
        paymentMethod: document.getElementById('payment-method').value,
        notes: document.getElementById('payment-notes').value
    };
    
    try {
        const response = await apiFetch('/api/payments', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
        
        showToast(`Payment recorded! New status: ${response.newStatus}`, 'success');
        closePaymentModal();
        loadInvoices(currentPage);
    } catch (error) {
        console.error('Error recording payment:', error);
        showToast(error.message || 'Failed to record payment', 'error');
    }
}

// View invoice details
async function viewInvoiceDetails(invoiceId) {
    try {
        const response = await apiFetch(`/api/invoices/${invoiceId}`);
        const { invoice, payments } = response;
        
        const detailsDiv = document.getElementById('invoice-details');
        const paymentsDiv = document.getElementById('payments-list');
        
        detailsDiv.innerHTML = `
            <div class="invoice-info">
                <h3>Invoice #${invoice.INVOICE_NUMBER}</h3>
                <p><strong>Student:</strong> ${invoice.STUDENT_NAME} (${invoice.ROLL_NUMBER})</p>
                <p><strong>Description:</strong> ${invoice.DESCRIPTION}</p>
                <p><strong>Total Amount:</strong> $${parseFloat(invoice.TOTAL_AMOUNT).toFixed(2)}</p>
                <p><strong>Paid Amount:</strong> $${parseFloat(invoice.PAID_AMOUNT).toFixed(2)}</p>
                <p><strong>Remaining:</strong> $${parseFloat(invoice.REMAINING_AMOUNT).toFixed(2)}</p>
                <p><strong>Due Date:</strong> ${new Date(invoice.DUE_DATE).toLocaleDateString()}</p>
                <p><strong>Status:</strong> <span class="status ${getStatusClass(invoice.STATUS)}">${invoice.STATUS}</span></p>
            </div>
        `;
        
        if (payments.length > 0) {
            paymentsDiv.innerHTML = `
                <h4>Payment History</h4>
                <table class="payments-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Notes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(payment => `
                            <tr>
                                <td>${new Date(payment.PAYMENT_DATE).toLocaleDateString()}</td>
                                <td>$${parseFloat(payment.AMOUNT).toFixed(2)}</td>
                                <td>${payment.PAYMENT_METHOD}</td>
                                <td>${payment.NOTES || '-'}</td>
                                <td>
                                    <button class="btn btn-danger btn-sm" onclick="deletePayment(${payment.PAYMENT_ID})">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            paymentsDiv.innerHTML = '<p>No payments recorded yet.</p>';
        }
        
        document.getElementById('invoice-details-modal').style.display = 'block';
    } catch (error) {
        console.error('Error loading invoice details:', error);
        showToast('Failed to load invoice details', 'error');
    }
}

// Close invoice details modal
function closeInvoiceDetailsModal() {
    document.getElementById('invoice-details-modal').style.display = 'none';
}

// Delete payment
async function deletePayment(paymentId) {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    
    try {
        await apiFetch(`/api/payments/${paymentId}`, { method: 'DELETE' });
        showToast('Payment deleted successfully', 'success');
        loadInvoices(currentPage);
        closeInvoiceDetailsModal();
    } catch (error) {
        console.error('Error deleting payment:', error);
        showToast('Failed to delete payment', 'error');
    }
}

// Delete invoice
async function deleteInvoice(invoiceId) {
    if (!confirm('Are you sure you want to delete this invoice? This will also delete all associated payments.')) return;
    
    try {
        await apiFetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
        showToast('Invoice deleted successfully', 'success');
        loadInvoices(currentPage);
    } catch (error) {
        console.error('Error deleting invoice:', error);
        showToast('Failed to delete invoice', 'error');
    }
}

// Update overdue invoices
async function updateOverdueInvoices() {
    try {
        await apiFetch('/api/invoices/update-overdue', { method: 'POST' });
        showToast('Overdue invoices updated', 'success');
        loadInvoices(currentPage);
    } catch (error) {
        console.error('Error updating overdue invoices:', error);
        showToast('Failed to update overdue invoices', 'error');
    }
}

// Clear invoice form
function clearInvoiceForm() {
    document.getElementById('invoice-form').reset();
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    loadStudents();
    loadInvoices();
    
    document.getElementById('invoice-form').addEventListener('submit', createInvoice);
    document.getElementById('payment-form').addEventListener('submit', submitPayment);
    
    // Set default due date to 30 days from now
    const dueDateInput = document.getElementById('due-date');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    dueDateInput.value = futureDate.toISOString().split('T')[0];
});
