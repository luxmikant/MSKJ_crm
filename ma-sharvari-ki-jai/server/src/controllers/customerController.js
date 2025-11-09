const Customer = require('../models/Customer');
const asyncHandler = require('../utils/asyncHandler');
const { buildFilter, validateRuleNode } = require('./segmentController');

const DEFAULT_DEV_USER_ID = '000000000000000000000000';

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

function resolveOwnerId(req) {
  const fromUser = req.user && (req.user._id || req.user.sub);
  if (fromUser) return fromUser;
  const headerUser = req.headers['x-user-id'];
  if (headerUser) return headerUser;
  if (process.env.AUTH_DISABLED === 'true') return DEFAULT_DEV_USER_ID;
  return null;
}

function buildCustomerFilterFromQuery(query, owner) {
  const { q, email, tags, minSpend, maxSpend, dateFrom, dateTo, rules } = query;
  const filter = owner ? { createdBy: owner } : {};
  if (q) {
    filter.$or = [
      { name: { $regex: String(q), $options: 'i' } },
      { email: { $regex: String(q), $options: 'i' } },
    ];
  }
  if (email) filter.email = String(email).toLowerCase();
  if (tags) {
    const arr = Array.isArray(tags) ? tags : String(tags).split(',').map((s) => s.trim()).filter(Boolean);
    if (arr.length) filter.tags = { $all: arr };
  }
  if (minSpend || maxSpend) {
    filter.totalSpend = filter.totalSpend || {};
    if (minSpend) filter.totalSpend.$gte = Number(minSpend);
    if (maxSpend) filter.totalSpend.$lte = Number(maxSpend);
  }
  if (dateFrom || dateTo) {
    filter.lastOrderDate = filter.lastOrderDate || {};
    if (dateFrom) filter.lastOrderDate.$gte = new Date(String(dateFrom));
    if (dateTo) filter.lastOrderDate.$lte = new Date(String(dateTo));
  }
  if (rules) {
    try {
      const parsed = typeof rules === 'string' ? JSON.parse(rules) : rules;
      if (validateRuleNode(parsed)) {
        const ruleFilter = buildFilter(parsed);
        Object.assign(filter, ruleFilter);
      }
    } catch (_) {
      // ignore malformed rules JSON and fall back to basic filters
    }
  }
  return filter;
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  let str = typeof value === 'string' ? value : String(value);
  if (str.includes('"')) str = str.replace(/"/g, '""');
  if (/[",\n]/.test(str)) return `"${str}` + '"';
  return str;
}

function customersToCsv(customers) {
  const headers = [
    'externalCustomerId',
    'name',
    'email',
    'phone',
    'totalSpend',
    'visitCount',
    'lastOrderDate',
    'tags',
    'attributes',
    'createdAt',
    'updatedAt',
  ];
  const rows = customers.map((c) => {
    const attrs = c.attributes && Object.keys(c.attributes).length ? JSON.stringify(c.attributes) : '';
    const tags = Array.isArray(c.tags) ? c.tags.join(';') : '';
    const values = [
      c.externalCustomerId,
      c.name,
      c.email,
      c.phone,
      c.totalSpend,
      c.visitCount,
      c.lastOrderDate ? c.lastOrderDate.toISOString() : '',
      tags,
      attrs,
      c.createdAt ? c.createdAt.toISOString() : '',
      c.updatedAt ? c.updatedAt.toISOString() : '',
    ];
    return values.map(csvEscape).join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

exports.ingestCustomers = asyncHandler(async (req, res) => {
  const userId = resolveOwnerId(req);
  if (!userId) {
    res.status(401);
    throw Object.assign(new Error('Unauthorized'), { code: 'UNAUTHORIZED' });
  }
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

  const ops = docs.map((d) => ({
    updateOne: {
      filter: { createdBy: userId, externalCustomerId: d.externalCustomerId },
      update: {
        $setOnInsert: { createdBy: userId, externalCustomerId: d.externalCustomerId },
        $set: {
          name: d.name,
          email: d.email,
          phone: d.phone,
          totalSpend: d.totalSpend,
          visitCount: d.visitCount,
          lastOrderDate: d.lastOrderDate,
          tags: d.tags,
          attributes: d.attributes,
        },
      },
      upsert: true,
    },
  }));

  const result = await Customer.bulkWrite(ops, { ordered: false });
  res.status(201).json({ success: true, upserted: result.upsertedCount, modified: result.modifiedCount, matched: result.matchedCount });
});

exports.listCustomers = asyncHandler(async (req, res) => {
  const userId = resolveOwnerId(req);
  const { page = 1, limit = 20 } = req.query;
  const parsedPage = Math.max(Number(page) || 1, 1);
  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 500);
  const skip = (parsedPage - 1) * parsedLimit;
  const filter = buildCustomerFilterFromQuery(req.query, userId);

  const [items, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit),
    Customer.countDocuments(filter),
  ]);
  res.json({ items, total, page: parsedPage, limit: parsedLimit });
});

exports.exportCustomers = asyncHandler(async (req, res) => {
  const userId = resolveOwnerId(req);
  if (!userId) {
    res.status(401);
    throw Object.assign(new Error('Unauthorized'), { code: 'UNAUTHORIZED' });
  }
  const filter = buildCustomerFilterFromQuery(req.query, userId);
  const maxRows = Math.min(Number(req.query.limit) || 0, 5000);
  const query = Customer.find(filter).sort({ createdAt: -1 });
  if (maxRows > 0) query.limit(maxRows);
  const customers = await query;
  const csv = customersToCsv(customers);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Disposition', `attachment; filename="customers-${stamp}.csv"`);
  res.send(csv);
});

exports.getCustomer = asyncHandler(async (req, res) => {
  const owner = resolveOwnerId(req);
  const id = req.params.id;
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid customer id' });
  const doc = await Customer.findOne({ _id: id, ...(owner ? { createdBy: owner } : {}) });
  if (!doc) return res.status(404).json({ message: 'Customer not found' });
  res.json({ customer: doc });
});

module.exports.buildCustomerFilterFromQuery = buildCustomerFilterFromQuery;
module.exports.resolveOwnerId = resolveOwnerId;
module.exports.customersToCsv = customersToCsv;
