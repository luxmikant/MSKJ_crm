const express = require('express');
const { requireAuth } = require('../middleware/auth');
const templateController = require('../controllers/templateController');

const router = express.Router();

// Get all email templates
router.get('/', requireAuth, templateController.getTemplates);

// Get template categories
router.get('/categories', requireAuth, templateController.getTemplateCategories);

// Get specific template by ID
router.get('/:id', requireAuth, templateController.getTemplate);

module.exports = router;