const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { createCampaign, listCampaigns, vendorSend, vendorReceipt, getCampaignLogs, getCampaign } = require('../controllers/campaignController');

router.post('/', requireAuth, createCampaign);
router.get('/', requireAuth, listCampaigns);
router.get('/:id/logs', requireAuth, getCampaignLogs);
router.get('/:id', requireAuth, getCampaign);

// Vendor simulator endpoints
router.post('/vendor/send', requireAuth, vendorSend);
router.post('/vendor/receipt', vendorReceipt); // webhook: can be public

module.exports = router;
