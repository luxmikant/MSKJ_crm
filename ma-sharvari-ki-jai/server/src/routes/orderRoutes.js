const express = require('express');
const { ingestOrders, listOrders } = require('../controllers/orderController');

const router = express.Router();

function orderValidator(req, res, next) {
  const payload = Array.isArray(req.body) ? req.body : [req.body];
  const errors = [];
  payload.forEach((o, idx) => {
    const base = Array.isArray(req.body) ? `[${idx}]` : '';
    if (!o || typeof o !== 'object') {
      errors.push({ path: base || 'body', msg: 'Each item must be an object' });
      return;
    }
    if (!o.externalOrderId) {
      errors.push({ path: `${base ? base + '.' : ''}externalOrderId`, msg: 'externalOrderId is required' });
    }
    if (!o.customerId) {
      errors.push({ path: `${base ? base + '.' : ''}customerId`, msg: 'customerId is required' });
    }
    const total = Number(o.orderTotal);
    if (!Number.isFinite(total) || total < 0) {
      errors.push({ path: `${base ? base + '.' : ''}orderTotal`, msg: 'orderTotal must be >= 0' });
    }
    if (o.items && !Array.isArray(o.items)) {
      errors.push({ path: `${base ? base + '.' : ''}items`, msg: 'items must be an array' });
    }
  });
  if (errors.length) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid order payload' }, details: errors, requestId: req.id });
    return;
  }
  next();
}

router.post('/', orderValidator, ingestOrders);
router.get('/', listOrders);

module.exports = router;
