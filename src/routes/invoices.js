const express = require('express');
const { getPool } = require('../db');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// Generate unique invoice number
function generateInvoiceNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `INV-${timestamp}-${random}`;
}

// Create new invoice
router.post('/', async (req, res) => {
  try {
    const { studentId, description, totalAmount, dueDate } = req.body;
    
    if (!studentId || !description || !totalAmount || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const pool = getPool();
    const invoiceNumber = generateInvoiceNumber();
    
    const [result] = await pool.query(
      'INSERT INTO Invoices (STUDENT_ID, INVOICE_NUMBER, DESCRIPTION, TOTAL_AMOUNT, DUE_DATE) VALUES (?, ?, ?, ?, ?)',
      [studentId, invoiceNumber, description, totalAmount, dueDate]
    );

    res.status(201).json({
      message: 'Invoice created successfully',
      invoiceId: result.insertId,
      invoiceNumber
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Batch create invoices (and optional payments)
router.post('/batch', async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items to process' });
  }
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const created = [];
    for (const it of items) {
      const studentId = Number(it.studentId);
      const amount = Number(it.amount || 0);
      const months = (it.months || []).map(m => String(m));
      if (!studentId || !amount || months.length === 0) {
        throw new Error('Invalid item: studentId, amount, months required');
      }
      const description = `Fees for ${months.join(', ')}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14); // default 2 weeks
      const invoiceNumber = generateInvoiceNumber();

      const [invRes] = await conn.query(
        'INSERT INTO Invoices (STUDENT_ID, INVOICE_NUMBER, DESCRIPTION, TOTAL_AMOUNT, DUE_DATE) VALUES (?, ?, ?, ?, ?)',
        [studentId, invoiceNumber, description, amount, dueDate.toISOString().slice(0,10)]
      );
      const invoiceId = invRes.insertId;

      if (it.recordPayment) {
        const today = new Date().toISOString().slice(0,10);
        for (const m of months) {
          await conn.query(
            'INSERT INTO Payments (INVOICE_ID, AMOUNT, PAYMENT_DATE, PAYMENT_METHOD, NOTES) VALUES (?, ?, ?, ?, ?)',
            [invoiceId, amount, today, 'Cash', `Month ${m}`]
          );
          await conn.query('UPDATE Invoices SET PAID_AMOUNT = PAID_AMOUNT + ? WHERE INVOICE_ID = ?', [amount, invoiceId]);
          // Also mirror into Fees table for the Fees page
          await conn.query(
            'INSERT INTO Fees (STUDENT_ID, FEE_AMOUNT, PAID_DATE, MONTH_PAID, STATUS) VALUES (?, ?, ?, ?, ?)',
            [studentId, amount, today, m, 'Paid']
          );
        }
        // update status
        const [[inv]] = await conn.query('SELECT TOTAL_AMOUNT, PAID_AMOUNT FROM Invoices WHERE INVOICE_ID=?', [invoiceId]);
        const remaining = inv.TOTAL_AMOUNT - inv.PAID_AMOUNT;
        const status = remaining <= 0 ? 'Paid' : (inv.PAID_AMOUNT > 0 ? 'Partially Paid' : 'Pending');
        await conn.query('UPDATE Invoices SET STATUS=? WHERE INVOICE_ID=?', [status, invoiceId]);
      }
      created.push({ invoiceId, invoiceNumber, studentId });
    }
    await conn.commit();
    res.json({ created });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message || 'Failed to create batch invoices' });
  } finally {
    conn.release();
  }
});

// Get all invoices with student info
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, studentId } = req.query;
    const offset = (page - 1) * limit;
    
    const pool = getPool();
    let whereClause = '1=1';
    const params = [];
    
    if (status) {
      whereClause += ' AND i.STATUS = ?';
      params.push(status);
    }
    
    if (studentId) {
      whereClause += ' AND i.STUDENT_ID = ?';
      params.push(studentId);
    }
    
    // Get invoices with student info
    const [invoices] = await pool.query(`
      SELECT 
        i.*,
        s.NAME as STUDENT_NAME,
        s.ROLL_NUMBER,
        s.CLASS,
        (i.TOTAL_AMOUNT - i.PAID_AMOUNT) as REMAINING_AMOUNT,
        CASE 
          WHEN i.STATUS = 'Overdue' THEN 'Overdue'
          WHEN i.DUE_DATE < CURDATE() AND i.STATUS != 'Paid' THEN 'Overdue'
          ELSE i.STATUS
        END as ACTUAL_STATUS
      FROM Invoices i
      JOIN Students s ON i.STUDENT_ID = s.STUDENT_ID
      WHERE ${whereClause}
      ORDER BY i.CREATED_AT DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);
    
    // Get total count
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM Invoices i
      WHERE ${whereClause}
    `, params);
    
    const total = countResult[0].total;
    
    res.json({
      invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get invoice by ID with payments
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // Get invoice with student info
    const [invoices] = await pool.query(`
      SELECT 
        i.*,
        s.NAME as STUDENT_NAME,
        s.ROLL_NUMBER,
        s.CLASS,
        (i.TOTAL_AMOUNT - i.PAID_AMOUNT) as REMAINING_AMOUNT
      FROM Invoices i
      JOIN Students s ON i.STUDENT_ID = s.STUDENT_ID
      WHERE i.INVOICE_ID = ?
    `, [id]);
    
    if (invoices.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Get payments for this invoice
    const [payments] = await pool.query(`
      SELECT * FROM Payments 
      WHERE INVOICE_ID = ? 
      ORDER BY PAYMENT_DATE DESC
    `, [id]);
    
    res.json({
      invoice: invoices[0],
      payments
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Update invoice status (mark as paid/overdue)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['Pending', 'Partially Paid', 'Paid', 'Overdue'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const pool = getPool();
    
    await pool.query(
      'UPDATE Invoices SET STATUS = ? WHERE INVOICE_ID = ?',
      [status, id]
    );
    
    res.json({ message: 'Invoice status updated successfully' });
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    await pool.query('DELETE FROM Invoices WHERE INVOICE_ID = ?', [id]);
    
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// Update overdue invoices (utility endpoint)
router.post('/update-overdue', async (req, res) => {
  try {
    const pool = getPool();
    
    // Mark invoices as overdue if due date has passed and not fully paid
    await pool.query(`
      UPDATE Invoices 
      SET STATUS = 'Overdue' 
      WHERE DUE_DATE < CURDATE() 
      AND STATUS NOT IN ('Paid', 'Overdue')
    `);
    
    res.json({ message: 'Overdue invoices updated successfully' });
  } catch (error) {
    console.error('Error updating overdue invoices:', error);
    res.status(500).json({ error: 'Failed to update overdue invoices' });
  }
});

module.exports = router;
