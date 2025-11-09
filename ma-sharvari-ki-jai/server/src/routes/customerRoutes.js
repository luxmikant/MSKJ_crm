const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { ingestCustomers, listCustomers, getCustomer, exportCustomers } = require('../controllers/customerController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

function validateEmail(val) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(val || ''));
}

function customerValidator(req, res, next) {
  const payload = Array.isArray(req.body) ? req.body : [req.body];
  const errors = [];
  payload.forEach((c, idx) => {
    const base = Array.isArray(req.body) ? `[${idx}]` : '';
    if (!c || typeof c !== 'object') {
      errors.push({ path: base || 'body', msg: 'Each item must be an object' });
      return;
    }
    if (!c.externalCustomerId) {
      errors.push({ path: `${base ? base + '.' : ''}externalCustomerId`, msg: 'externalCustomerId is required' });
    }
    if (!c.name || String(c.name).trim() === '') {
      errors.push({ path: `${base ? base + '.' : ''}name`, msg: 'Name is required' });
    }
    if (!c.email || !validateEmail(c.email)) {
      errors.push({ path: `${base ? base + '.' : ''}email`, msg: 'Valid email is required' });
    }
  });
  if (errors.length) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid customer payload' }, details: errors, requestId: req.id });
    return;
  }
  next();
}

function csvImportHandler(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ 
      success: false, 
      error: { code: 'NO_FILE', message: 'No CSV file uploaded' }, 
      requestId: req.id 
    });
  }

  const csvContent = req.file.buffer.toString('utf-8');
  const requiredHeaders = ['externalCustomerId', 'name', 'email'];
  
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    if (!records || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMPTY_CSV', message: 'CSV file is empty or has no valid records' },
        requestId: req.id,
      });
    }

    const headers = Object.keys(records[0] || {});
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'MISSING_HEADERS', 
          message: `CSV is missing required columns: ${missingHeaders.join(', ')}` 
        },
        requestId: req.id,
      });
    }

    // Transform CSV records to match customer schema
    const customers = records.map((row, idx) => {
      const customer = {
        externalCustomerId: row.externalCustomerId,
        name: row.name,
        email: row.email,
        phone: row.phone || '',
        totalSpend: row.totalSpend ? Number(row.totalSpend) : 0,
        visitCount: row.visitCount ? Number(row.visitCount) : 0,
        lastOrderDate: row.lastOrderDate || undefined,
        tags: row.tags ? row.tags.split(';').map((t) => t.trim()).filter(Boolean) : [],
        attributes: {},
      };

      // Parse attributes if present
      if (row.attributes) {
        try {
          customer.attributes = JSON.parse(row.attributes);
        } catch (e) {
          customer.attributes = {};
        }
      }

      return customer;
    });

    req.body = customers;
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: { 
        code: 'CSV_PARSE_ERROR', 
        message: `Failed to parse CSV: ${error.message}` 
      },
      requestId: req.id,
    });
  }
}

router.post('/', customerValidator, ingestCustomers);
router.post('/import', upload.single('file'), csvImportHandler, customerValidator, ingestCustomers);
router.get('/export', exportCustomers);
router.get('/', listCustomers);
router.get('/:id', getCustomer);

module.exports = router;
