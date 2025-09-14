const Customer = require('../models/Customer');
const asyncHandler = require('../utils/asyncHandler');
const { buildFilter, validateRuleNode } = require('./segmentController');

const normalize = (c) => ({
  name: c.name?.trim(),
  email: c.email?.toLowerCase().trim(),
  phone: c.phone,
  totalSpend: Number(c.totalSpend || 0),
  visitCount: Number(c.visitCount || 0),
  lastOrderDate: c.lastOrderDate ? new Date(c.lastOrderDate) : undefined,
  tags: Array.isArray(c.tags) ? c.tags : [],
  attributes: typeof c.attributes === 'object' && c.attributes !== null ? c.attributes : {},
  externalCustomerId: String(c.externalCustomerId || ''),
});

exports.ingestCustomers = asyncHandler(async (req, res) => {
  const userId = req.user && (req.user._id || req.user.sub);
  const payload = Array.isArray(req.body) ? req.body : [req.body];
  const docs = payload.map(normalize).map((d) => ({ ...d, createdBy: userId }));

  const errors = [];
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    if (!d.externalCustomerId) errors.push({ path: Array.isArray(req.body) ? `[${i}].externalCustomerId` : 'externalCustomerId', msg: 'externalCustomerId is required' });
    if (!d.email) errors.push({ path: Array.isArray(req.body) ? `[${i}].email` : 'email', msg: 'Valid email is required' });
  }
  if (errors.length) {
    res.status(400);
    const err = new Error('ValidationError');
    err.code = 'VALIDATION_ERROR';
    err.details = errors;
    throw err;
  }

  // Idempotency: upsert by (createdBy, externalCustomerId)
  const ops = docs.map((d) => ({
    updateOne: {
      filter: { createdBy: userId, externalCustomerId: d.externalCustomerId },
      update: { $setOnInsert: { createdBy: userId, externalCustomerId: d.externalCustomerId }, $set: {
        name: d.name,
        email: d.email,
        phone: d.phone,
        totalSpend: d.totalSpend,
        visitCount: d.visitCount,
        lastOrderDate: d.lastOrderDate,
        tags: d.tags,
        attributes: d.attributes,
      } },
      upsert: true,
    },
  }));

  const result = await Customer.bulkWrite(ops, { ordered: false });
  res.status(201).json({ success: true, upserted: result.upsertedCount, modified: result.modifiedCount, matched: result.matchedCount });
});

exports.listCustomers = asyncHandler(async (req, res) => {
  const userId = req.user && (req.user._id || req.user.sub);
  const { q, email, tags, minSpend, maxSpend, dateFrom, dateTo, page = 1, limit = 20, rules } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const filter = { createdBy: userId };
  if (q) {
    filter.$or = [
      { name: { $regex: String(q), $options: 'i' } },
      { email: { $regex: String(q), $options: 'i' } },
    ];
  }
  if (email) filter.email = String(email).toLowerCase();
  if (tags) {
    const arr = Array.isArray(tags) ? tags : String(tags).split(',').map(s=>s.trim()).filter(Boolean);
    if (arr.length) filter.tags = { $all: arr };
  }
  if (minSpend || maxSpend) {
    filter.totalSpend = {};
    if (minSpend) filter.totalSpend.$gte = Number(minSpend);
    if (maxSpend) filter.totalSpend.$lte = Number(maxSpend);
  }
  if (dateFrom || dateTo) {
    filter.lastOrderDate = {};
    if (dateFrom) filter.lastOrderDate.$gte = new Date(String(dateFrom));
    if (dateTo) filter.lastOrderDate.$lte = new Date(String(dateTo));
  }
  if (rules) {
    try {
      const parsed = typeof rules === 'string' ? JSON.parse(rules) : rules;
      if (validateRuleNode(parsed)) {
        const rf = buildFilter(parsed);
        Object.assign(filter, rf);
      }
    } catch (_) {}
  }

  const [items, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Customer.countDocuments(filter),
  ]);
  res.json({ items, total, page: Number(page), limit: Number(limit) });
});

exports.getCustomer = asyncHandler(async (req, res) => {
  const owner = req.user && (req.user._id || req.user.sub);
  const id = req.params.id;
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid customer id' });
  const doc = await Customer.findOne({ _id: id, createdBy: owner });
  if (!doc) return res.status(404).json({ message: 'Customer not found' });
  res.json({ customer: doc });
});
