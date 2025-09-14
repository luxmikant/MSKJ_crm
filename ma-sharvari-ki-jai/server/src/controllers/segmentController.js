const Segment = require('../models/Segment');
const Customer = require('../models/Customer');
const asyncHandler = require('../utils/asyncHandler');
const { suggestMessage } = require('../services/ai');

// ruleTree format example:
// { condition: 'AND', rules: [ { field: 'totalSpend', operator: '>', value: 10000 }, { condition: 'OR', rules: [...] } ] }

function isDateString(v) {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v));
}

function toDateFromNow(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - Number(daysAgo || 0));
  return d;
}

function buildFilter(node) {
  if (!node) return {};
  if (node.condition && Array.isArray(node.rules)) {
    const clauses = node.rules.map(buildFilter).filter(Boolean);
    if (node.condition === 'AND') return { $and: clauses };
    return { $or: clauses };
  }

  // leaf rule
  const { field, operator, value } = node;
  if (!field) return {};
  switch ((operator || 'eq').toLowerCase()) {
    case '>':
      return { [field]: { $gt: value } };
    case '>=':
      return { [field]: { $gte: value } };
    case '<':
      return { [field]: { $lt: value } };
    case '<=':
      return { [field]: { $lte: value } };
    case '!=':
    case '<>':
      return { [field]: { $ne: value } };
    case 'exists':
      return { [field]: { $exists: !!value } };
    case 'in':
      return { [field]: { $in: Array.isArray(value) ? value : [value] } };
    case 'not_in':
      return { [field]: { $nin: Array.isArray(value) ? value : [value] } };
    case 'contains': {
      if (value == null) return {};
      return { [field]: { $regex: String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } };
    }
    case 'starts_with': {
      if (value == null) return {};
      return { [field]: { $regex: '^' + String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } };
    }
    case 'ends_with': {
      if (value == null) return {};
      return { [field]: { $regex: String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', $options: 'i' } };
    }
    case 'in_last_days': {
      const date = toDateFromNow(value);
      return { [field]: { $gte: date } };
    }
    case 'older_than_days': {
      const date = toDateFromNow(value);
      return { [field]: { $lt: date } };
    }
    case 'before': {
      const d = isDateString(value) ? new Date(value) : toDateFromNow(value);
      return { [field]: { $lt: d } };
    }
    case 'after': {
      const d = isDateString(value) ? new Date(value) : toDateFromNow(value);
      return { [field]: { $gt: d } };
    }
    case '=':
    case 'eq':
    default:
      if (isDateString(value)) return { [field]: new Date(value) };
      return { [field]: value };
  }
}

function validateRuleNode(node) {
  if (!node || typeof node !== 'object') return false;
  if (node.condition) {
    if (!(node.condition === 'AND' || node.condition === 'OR')) return false;
    if (!Array.isArray(node.rules)) return false;
    return node.rules.every(validateRuleNode);
  }
  // leaf
  if (typeof node.field !== 'string' || !node.field) return false;
  if (typeof node.operator !== 'string' && node.operator !== undefined) return false;
  // value can be anything (string/number/date/bool/array)
  return true;
}

exports.createSegment = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const rules = normalizeRules(req.body);
  if (!name || !rules) return res.status(400).json({ message: 'name and rules are required' });
  if (!validateRuleNode(rules)) return res.status(400).json({ message: 'Invalid rules tree' });
  const filter = buildFilter(rules);
  const owner = req.user && (req.user._id || req.user.sub);
  const scoped = owner ? { ...filter, createdBy: owner } : filter;
  const audienceSize = await Customer.countDocuments(scoped);
  const seg = await Segment.create({ name, description, rules, createdBy: owner, audienceSize });
  res.status(201).json({ segment: seg });
});

exports.previewSegment = asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    return res.json({ audienceSize: 0, sample: [] });
  }
  const rules = normalizeRules(req.body);
  const { sample = 10 } = req.body;
  if (!rules) return res.status(400).json({ message: 'rules are required' });
  if (!validateRuleNode(rules)) return res.status(400).json({ message: 'Invalid rules tree' });
  const filter = buildFilter(rules);
  const owner = req.user && (req.user._id || req.user.sub);
  const scoped = owner ? { ...filter, createdBy: owner } : filter;
  const audienceSize = await Customer.countDocuments(scoped);
  const sampleItems = await Customer.find(scoped).limit(Number(sample));
  res.json({ audienceSize, sample: sampleItems });
});

exports.listSegments = asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    return res.json({ items: [] });
  }
  const owner = req.user && (req.user._id || req.user.sub);
  const q = owner ? { createdBy: owner } : {};
  const items = await Segment.find(q).sort({ createdAt: -1 }).limit(50);
  res.json({ items });
});

// export for tests
exports.buildFilter = buildFilter;
exports.validateRuleNode = validateRuleNode;

exports.getSegment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid segment id' });
  }
  const owner = req.user && (req.user._id || req.user.sub);
  const seg = await Segment.findOne({ _id: id, ...(owner ? { createdBy: owner } : {}) });
  if (!seg) return res.status(404).json({ message: 'Segment not found' });
  res.json({ segment: seg });
});

exports.updateSegment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid segment id' });
  }
  const { name, description } = req.body;
  const rules = req.body.rules !== undefined || req.body.rulesTree || (req.body.logicBlocks && req.body.rules)
    ? normalizeRules(req.body)
    : undefined;
  const owner = req.user && (req.user._id || req.user.sub);
  const seg = await Segment.findOne({ _id: id, ...(owner ? { createdBy: owner } : {}) });
  if (!seg) return res.status(404).json({ message: 'Segment not found' });
  if (name !== undefined) seg.name = name;
  if (description !== undefined) seg.description = description;
  if (rules !== undefined) {
    if (!validateRuleNode(rules)) return res.status(400).json({ message: 'Invalid rules tree' });
    seg.rules = rules;
    const filter = buildFilter(rules);
    const scoped = owner ? { ...filter, createdBy: owner } : filter;
    seg.audienceSize = await Customer.countDocuments(scoped);
  }
  await seg.save();
  res.json({ segment: seg });
});

exports.deleteSegment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid segment id' });
  }
  const owner = (req.user && (req.user._id || req.user.sub)) || undefined;
  const seg = await Segment.findOneAndDelete({ _id: id, ...(owner ? { createdBy: owner } : {}) });
  if (!seg) return res.status(404).json({ message: 'Segment not found' });
  res.json({ ok: true });
});

// Build tree from { rules:[{filterId,operator,value}], logicBlocks:[{type:'AND'|'OR'}] }
function normalizeRules(body) {
  if (body && body.rules && Array.isArray(body.rules) && body.rules.length && body.rules[0].filterId) {
    const rules = body.rules.map((r) => ({ field: r.filterId, operator: r.operator, value: r.value }));
    if (!body.logicBlocks || !Array.isArray(body.logicBlocks) || body.logicBlocks.length === 0) {
      return rules.length === 1 ? rules[0] : { condition: 'AND', rules };
    }
    // Interleave rules with logicBlocks: r0 op0 r1 op1 r2 ...
    const nodes = [];
    for (let i = 0; i < rules.length; i++) {
      nodes.push(rules[i]);
      if (i < rules.length - 1) nodes.push(body.logicBlocks[i]?.type === 'OR' ? '$or' : '$and');
    }
    return flattenLogic(nodes);
  }
  return body.rulesTree || body.rules || null;
}

function flattenLogic(nodes) {
  if (!nodes || nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0];
  const op = nodes[1] === '$or' ? 'OR' : 'AND';
  return { condition: op, rules: [nodes[0], flattenLogic(nodes.slice(2))].filter(Boolean) };
}

// Available filters definition for UI (aligned with requested set + schema)
const availableFilters = [
  { id: 'attributes.loyaltyTier', label: 'Customer Tier', type: 'select', options: ['Premium', 'Standard', 'Basic'] },
  { id: 'totalSpend', label: 'Total Spent', type: 'number', operators: ['>', '<', '>=', '<=', '=', '!='] },
  { id: 'lastOrderDate', label: 'Last Purchase', type: 'date', operators: ['before', 'after', 'in_last_days', 'older_than_days'] },
  { id: 'attributes.status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  { id: 'attributes.location', label: 'Location', type: 'text', operators: ['contains', '='] },
  { id: 'attributes.age', label: 'Age', type: 'number', operators: ['>', '<', '>=', '<=', '=', '!='] },
  // still expose some schema-native fields
  { id: 'visitCount', label: 'Visit Count', type: 'number', operators: ['>', '<', '>=', '<=', '=', '!='] },
  { id: 'email', label: 'Email', type: 'text', operators: ['contains', 'starts_with', 'ends_with', '=', '!='] },
  { id: 'name', label: 'Name', type: 'text', operators: ['contains', 'starts_with', 'ends_with', '=', '!='] },
  { id: 'tags', label: 'Tags', type: 'text', operators: ['contains', 'in', 'not_in'] },
];

exports.availableFilters = asyncHandler(async (req, res) => {
  res.json({ filters: availableFilters });
});

exports.aiGenerate = asyncHandler(async (req, res) => {
  const { query, goal, tone, channel } = req.body || {};
  if (!query && !goal) return res.status(400).json({ message: 'query or goal is required' });
  // Basic mapping: if AI disabled, return a simple rule suggestion as a starting point
  const suggestion = await (async () => {
    try {
      const variants = await suggestMessage({ goal: query || goal, tone: tone || 'friendly', channel: channel || 'EMAIL' });
      return variants && variants[0];
    } catch (_) { return null; }
  })();
  // Simplistic heuristic: if query mentions "spent" or "$", suggest totalSpend>
  const text = (query || goal || '').toLowerCase();
  const rules = [];
  if (text.includes('spent') || text.includes('$')) rules.push({ filterId: 'totalSpend', operator: '>', value: 1000, label: 'High spenders' });
  if (text.includes('recent') || text.includes('last') || text.includes('days')) rules.push({ filterId: 'lastOrderDate', operator: 'in_last_days', value: 30, label: 'Recent buyers' });
  if (!rules.length) rules.push({ filterId: 'visitCount', operator: '>=', value: 1, label: 'Active visitors' });
  res.json({ rules, logicBlocks: rules.length > 1 ? Array(rules.length - 1).fill({ type: 'AND' }) : [], hint: suggestion });
});

exports.incrementUsage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner = req.user && (req.user._id || req.user.sub);
  const seg = await Segment.findOneAndUpdate(
    { _id: id, ...(owner ? { createdBy: owner } : {}) },
    { $inc: { usageCount: 1 }, $set: { lastUsed: new Date() } },
    { new: true }
  );
  if (!seg) return res.status(404).json({ message: 'Segment not found' });
  res.json({ segment: seg });
});
