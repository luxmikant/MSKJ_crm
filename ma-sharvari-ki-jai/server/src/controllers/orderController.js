const Order = require('../models/Order');
const Customer = require('../models/Customer');
const asyncHandler = require('../utils/asyncHandler');

const normalize = (o) => ({
  customerId: o.customerId,
  orderTotal: Number(o.orderTotal),
  items: Array.isArray(o.items) ? o.items.map(it => ({
    productId: String(it.productId),
    name: String(it.name),
    price: Number(it.price),
    quantity: Number(it.quantity),
  })) : [],
  orderDate: o.orderDate ? new Date(o.orderDate) : new Date(),
  status: o.status,
  externalOrderId: String(o.externalOrderId || ''),
});

exports.ingestOrders = asyncHandler(async (req, res) => {
  const userId = req.user && (req.user._id || req.user.sub);
  const payload = Array.isArray(req.body) ? req.body : [req.body];
  const docs = payload.map(normalize).map((d) => ({ ...d, createdBy: userId }));

  const errors = [];
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    const base = Array.isArray(req.body) ? `[${i}]` : '';
    if (!d.externalOrderId) errors.push({ path: `${base ? base + '.' : ''}externalOrderId`, msg: 'externalOrderId is required' });
    if (!d.customerId) errors.push({ path: `${base ? base + '.' : ''}customerId`, msg: 'customerId is required' });
    if (!Number.isFinite(d.orderTotal) || d.orderTotal < 0) errors.push({ path: `${base ? base + '.' : ''}orderTotal`, msg: 'orderTotal must be >= 0' });
    if (!Array.isArray(d.items)) errors.push({ path: `${base ? base + '.' : ''}items`, msg: 'items must be an array' });
  }
  if (errors.length) {
    res.status(400);
    const err = new Error('ValidationError');
    err.code = 'VALIDATION_ERROR';
    err.details = errors;
    throw err;
  }

  // Idempotent upsert by (createdBy, externalOrderId)
  const ops = docs.map((d) => ({
    updateOne: {
      filter: { createdBy: userId, externalOrderId: d.externalOrderId },
      update: { $setOnInsert: { createdBy: userId, externalOrderId: d.externalOrderId }, $set: {
        customerId: d.customerId,
        orderTotal: d.orderTotal,
        items: d.items,
        orderDate: d.orderDate,
        status: d.status,
      } },
      upsert: true,
    },
  }));
  const result = await Order.bulkWrite(ops, { ordered: false });

  // Update customer aggregates
  const byCustomer = new Map();
  for (const d of docs) {
    const agg = byCustomer.get(String(d.customerId)) || { spend: 0, visits: 0, last: new Date(0) };
    agg.spend += d.orderTotal || 0;
    agg.visits += 1;
    if (d.orderDate && d.orderDate > agg.last) agg.last = d.orderDate;
    byCustomer.set(String(d.customerId), agg);
  }
  const updates = [];
  for (const [cid, agg] of byCustomer.entries()) {
    updates.push(
      Customer.updateOne(
        { _id: cid, createdBy: userId },
        { $inc: { totalSpend: agg.spend, visitCount: agg.visits }, $set: { lastOrderDate: agg.last } }
      )
    );
  }
  if (updates.length) await Promise.allSettled(updates);

  res.status(201).json({ success: true, upserted: result.upsertedCount, modified: result.modifiedCount, matched: result.matchedCount });
});

exports.listOrders = asyncHandler(async (req, res) => {
  const userId = req.user && (req.user._id || req.user.sub);
  const { customerId, status, minTotal, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const filter = { createdBy: userId };
  if (customerId) filter.customerId = customerId;
  if (status) filter.status = String(status);
  if (minTotal) {
    filter.orderTotal = { $gte: Number(minTotal) };
  }
  if (dateFrom || dateTo) {
    filter.orderDate = {};
    if (dateFrom) filter.orderDate.$gte = new Date(String(dateFrom));
    if (dateTo) filter.orderDate.$lte = new Date(String(dateTo));
  }
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Order.countDocuments(filter),
  ]);
  res.json({ items, total, page: Number(page), limit: Number(limit) });
});
