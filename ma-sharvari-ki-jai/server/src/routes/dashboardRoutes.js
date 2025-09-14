const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getKPIs, getRecentActivity, getCampaignPerformance, getDashboardCampaigns, getInsightsSummary } = require('../controllers/dashboardController');

router.use(requireAuth);

router.get('/kpis', getKPIs);
router.get('/recent-activity', getRecentActivity);
router.get('/campaign-performance', getCampaignPerformance);
router.get('/campaigns', getDashboardCampaigns);
router.get('/summary', getInsightsSummary);

module.exports = router;
