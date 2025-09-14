const asyncHandler = require('../utils/asyncHandler');

// Mock email templates - in a real app this would be a database collection
const emailTemplates = [
  {
    id: 'welcome',
    name: 'Welcome Series',
    category: 'Onboarding',
    subject: 'Welcome to {{brand}}!',
    preheader: 'Get started with your new account',
    content: 'Hi {{name}}, Welcome to {{brand}}! We are excited to have you on board.',
    variables: ['name', 'brand']
  },
  {
    id: 'promotion',
    name: 'Promotional Campaign',
    category: 'Marketing',
    subject: 'Special offer just for you, {{name}}!',
    preheader: 'Limited time offer inside',
    content: 'Hi {{name}}, We have an exclusive offer just for you! Get {{discount}}% off your next purchase.',
    variables: ['name', 'discount', 'expiryDays', 'promoCode', 'brand']
  },
  {
    id: 'newsletter',
    name: 'Newsletter Template',
    category: 'Content',
    subject: '{{brand}} Newsletter - {{monthYear}}',
    preheader: 'Your monthly update from {{brand}}',
    content: 'Hi {{name}}, Here is what is new at {{brand}} this month. Thanks for being part of our community!',
    variables: ['name', 'brand', 'monthYear', 'updates', 'stories', 'links']
  },
  {
    id: 'winback',
    name: 'Win-Back Campaign',
    category: 'Retention',
    subject: 'We miss you, {{name}}!',
    preheader: 'Come back and get a discount',
    content: 'Hi {{name}}, We noticed you have not been active lately, and we miss you! Here is a special offer to welcome you back.',
    variables: ['name', 'discount', 'freeShippingThreshold', 'brand']
  }
];

exports.getTemplates = asyncHandler(async (req, res) => {
  const { category } = req.query;
  
  let templates = emailTemplates;
  if (category && category !== 'all') {
    templates = emailTemplates.filter(template => 
      template.category.toLowerCase() === category.toLowerCase()
    );
  }

  res.json({
    templates: templates.map(template => ({
      id: template.id,
      name: template.name,
      category: template.category,
      subject: template.subject,
      preheader: template.preheader,
      variables: template.variables
    })),
    total: templates.length
  });
});

exports.getTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const template = emailTemplates.find(t => t.id === id);
  
  if (!template) {
    return res.status(404).json({ message: 'Template not found' });
  }

  res.json(template);
});

exports.getTemplateCategories = asyncHandler(async (req, res) => {
  const categories = [...new Set(emailTemplates.map(t => t.category))];
  res.json({ categories });
});