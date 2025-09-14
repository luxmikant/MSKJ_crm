const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  res.json({
    status: mongoOk ? 'ok' : 'degraded',
    mongo: mongoOk ? 'ok' : 'down',
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

module.exports = router;
