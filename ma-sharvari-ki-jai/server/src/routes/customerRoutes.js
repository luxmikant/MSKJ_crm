const express = require('express');
const { ingestCustomers, listCustomers, getCustomer } = require('../controllers/customerController');

const router = express.Router();

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

router.post('/', customerValidator, ingestCustomers);
router.get('/', listCustomers);
router.get('/:id', getCustomer);

module.exports = router;
