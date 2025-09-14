const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { suggestMessage, generateEmail } = require('../services/ai');

router.post('/suggest-message', requireAuth, asyncHandler(async (req, res) => {
  const { goal, brand, tone, channel, segmentSummary, variables } = req.body || {};
  if (!goal) return res.status(400).json({ message: 'goal is required' });
  const variants = await suggestMessage({ goal, brand, tone, channel, segmentSummary, variables });
  res.json({ variants });
}));

module.exports = router;

// Generate full email (subject, preheader, content) from scenario
router.post('/generate-email', requireAuth, asyncHandler(async (req, res) => {
  const { scenario, brand, tone, channel, variables, length } = req.body || {};
  if (!scenario) return res.status(400).json({ message: 'scenario is required' });
  const result = await generateEmail({ scenario, brand, tone, channel, variables, length });
  res.json(result);
}));
