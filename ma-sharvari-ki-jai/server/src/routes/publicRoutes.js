const express = require('express');
const router = express.Router();
const { getPublicMetrics } = require('../controllers/publicController');

// Public, no auth required
router.get('/metrics', getPublicMetrics);

module.exports = router;
