const express = require('express');
const router = express.Router();
const { createSegment, previewSegment, listSegments, getSegment, updateSegment, deleteSegment, availableFilters, aiGenerate, incrementUsage } = require('../controllers/segmentController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, createSegment);
router.post('/preview', requireAuth, previewSegment);
router.get('/filters/available', requireAuth, availableFilters);
router.post('/ai/generate', requireAuth, aiGenerate);
router.get('/', requireAuth, listSegments);
router.get('/:id', requireAuth, getSegment);
router.put('/:id', requireAuth, updateSegment);
router.delete('/:id', requireAuth, deleteSegment);
router.post('/:id/usage', requireAuth, incrementUsage);

module.exports = router;
