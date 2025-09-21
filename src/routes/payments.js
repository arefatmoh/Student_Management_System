const express = require('express');
const { getPool } = require('../db');
const { ensureAuth } = require('../middlewares/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(ensureAuth);

// Record payment
router.post('/', async (req, res) => {
  try {
    const { invoiceId, amount, paymentDate, paymentMethod, notes } = req.body;
    
    if (!invoiceId || !amount || !paymentDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const pool = getPool();
    
    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Record the payment
      const [paymentResult] = await connection.query(
        'INSERT INTO Payments (INVOICE_ID, AMOUNT, PAYMENT_DATE, PAYMENT_METHOD, NOTES) VALUES (?, ?, ?, ?, ?)',
        [invoiceId, amount, paymentDate, paymentMethod || 'Cash', notes]
      );
      
      // Update invoice paid amount
      await connection.query(
        'UPDATE Invoices SET PAID_AMOUNT = PAID_AMOUNT + ? WHERE INVOICE_ID = ?',
        [amount, invoiceId]
      );
      
      // Get updated invoice info
      const [invoices] = await connection.query(
        'SELECT TOTAL_AMOUNT, PAID_AMOUNT FROM Invoices WHERE INVOICE_ID = ?',
        [invoiceId]
      );
      
      const invoice = invoices[0];
      const remainingAmount = invoice.TOTAL_AMOUNT - invoice.PAID_AMOUNT;
      
      // Update invoice status based on payment
      let newStatus;
      if (remainingAmount <= 0) {
        newStatus = 'Paid';
      } else if (invoice.PAID_AMOUNT > 0) {
        newStatus = 'Partially Paid';
      } else {
        newStatus = 'Pending';
      }
      
      await connection.query(
        'UPDATE Invoices SET STATUS = ? WHERE INVOICE_ID = ?',
        [newStatus, invoiceId]
      );
      
      await connection.commit();
      
      res.status(201).json({
        message: 'Payment recorded successfully',
        paymentId: paymentResult.insertId,
        newStatus,
        remainingAmount: Math.max(0, remainingAmount)
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Get payments for an invoice
router.get('/invoice/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const pool = getPool();
    
    const [payments] = await pool.query(`
      SELECT p.*, i.INVOICE_NUMBER, s.NAME as STUDENT_NAME
      FROM Payments p
      JOIN Invoices i ON p.INVOICE_ID = i.INVOICE_ID
      JOIN Students s ON i.STUDENT_ID = s.STUDENT_ID
      WHERE p.INVOICE_ID = ?
      ORDER BY p.PAYMENT_DATE DESC
    `, [invoiceId]);
    
    res.json({ payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get all payments with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, studentId, invoiceId } = req.query;
    const offset = (page - 1) * limit;
    
    const pool = getPool();
    let whereClause = '1=1';
    const params = [];
    
    if (studentId) {
      whereClause += ' AND i.STUDENT_ID = ?';
      params.push(studentId);
    }
    
    if (invoiceId) {
      whereClause += ' AND p.INVOICE_ID = ?';
      params.push(invoiceId);
    }
    
    const [payments] = await pool.query(`
      SELECT 
        p.*,
        i.INVOICE_NUMBER,
        i.DESCRIPTION as INVOICE_DESCRIPTION,
        s.NAME as STUDENT_NAME,
        s.ROLL_NUMBER,
        s.CLASS
      FROM Payments p
      JOIN Invoices i ON p.INVOICE_ID = i.INVOICE_ID
      JOIN Students s ON i.STUDENT_ID = s.STUDENT_ID
      WHERE ${whereClause}
      ORDER BY p.PAYMENT_DATE DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);
    
    // Get total count
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM Payments p
      JOIN Invoices i ON p.INVOICE_ID = i.INVOICE_ID
      WHERE ${whereClause}
    `, params);
    
    const total = countResult[0].total;
    
    res.json({
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Delete payment (and update invoice)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Get payment amount and invoice ID
      const [payments] = await connection.query(
        'SELECT AMOUNT, INVOICE_ID FROM Payments WHERE PAYMENT_ID = ?',
        [id]
      );
      
      if (payments.length === 0) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      
      const payment = payments[0];
      
      // Delete the payment
      await connection.query('DELETE FROM Payments WHERE PAYMENT_ID = ?', [id]);
      
      // Update invoice paid amount
      await connection.query(
        'UPDATE Invoices SET PAID_AMOUNT = PAID_AMOUNT - ? WHERE INVOICE_ID = ?',
        [payment.AMOUNT, payment.INVOICE_ID]
      );
      
      // Get updated invoice info
      const [invoices] = await connection.query(
        'SELECT TOTAL_AMOUNT, PAID_AMOUNT FROM Invoices WHERE INVOICE_ID = ?',
        [payment.INVOICE_ID]
      );
      
      const invoice = invoices[0];
      const remainingAmount = invoice.TOTAL_AMOUNT - invoice.PAID_AMOUNT;
      
      // Update invoice status
      let newStatus;
      if (remainingAmount <= 0) {
        newStatus = 'Paid';
      } else if (invoice.PAID_AMOUNT > 0) {
        newStatus = 'Partially Paid';
      } else {
        newStatus = 'Pending';
      }
      
      await connection.query(
        'UPDATE Invoices SET STATUS = ? WHERE INVOICE_ID = ?',
        [newStatus, payment.INVOICE_ID]
      );
      
      await connection.commit();
      
      res.json({
        message: 'Payment deleted successfully',
        newStatus,
        remainingAmount: Math.max(0, remainingAmount)
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

module.exports = router;
