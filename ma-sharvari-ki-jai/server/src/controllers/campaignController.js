const asyncHandler = require('../utils/asyncHandler');
const Campaign = require('../models/Campaign');
const CommunicationLog = require('../models/CommunicationLog');
const Segment = require('../models/Segment');
const Customer = require('../models/Customer');
const { buildFilter } = require('./segmentController');

exports.createCampaign = asyncHandler(async (req, res) => {
  const { 
    name, 
    segmentId, 
    channel = 'EMAIL', 
    template, 
    description,
    subject,
    preheader,
    scheduleType = 'draft',
    scheduleDate,
    scheduleTime,
    priority = 'normal',
    trackOpens = true,
    trackClicks = true
  } = req.body;
  
  if (!name || !segmentId || !template) return res.status(400).json({ message: 'name, segmentId, template required' });

  const owner = req.user && (req.user._id || req.user.sub);
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(segmentId)) {
    return res.status(400).json({ message: 'Invalid segmentId' });
  }
  const segment = await Segment.findOne({ _id: segmentId, ...(owner ? { createdBy: owner } : {}) });
  if (!segment) return res.status(404).json({ message: 'Segment not found' });

  // Determine initial status based on scheduleType
  let status = 'draft';
  if (scheduleType === 'now') {
    status = 'running';
  } else if (scheduleType === 'scheduled') {
    status = 'scheduled';
  }

  const baseFilter = buildFilter(segment.rules);
  const filter = owner ? { ...baseFilter, createdBy: owner } : baseFilter;
  const customers = await Customer.find(filter).select('_id email name phone');
  
  const scheduledFor = scheduleType === 'scheduled' && scheduleDate
    ? new Date(scheduleDate + 'T' + (scheduleTime || '09:00'))
    : undefined;

  const campaign = await Campaign.create({ 
    name, 
    description,
    segmentId, 
    channel, 
    template,
    subject,
    preheader,
    scheduleType,
    scheduleDate: scheduledFor,
    scheduleTime,
    scheduledFor,
    startedAt: status === 'running' ? new Date() : undefined,
    priority,
    trackOpens,
    trackClicks,
    status,
    createdBy: owner, 
    counts: { total: customers.length },
    metrics: { total: customers.length, sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0, bounced: 0 }
  });

  // Only create logs if we're sending now, otherwise they'll be created when scheduled
  if (scheduleType === 'now') {
    const logs = customers.map((c) => ({
      campaignId: campaign._id,
      customerId: c._id,
      channel,
      status: 'PENDING',
      payload: { to: channel === 'EMAIL' ? c.email : c.phone, name: c.name, template, subject, preheader },
      createdBy: owner,
    }));
    await CommunicationLog.insertMany(logs);
  }

  res.status(201).json({ 
    campaignId: campaign._id, 
    total: customers.length,
    status,
    scheduledFor,
    message: scheduleType === 'draft' ? 'Campaign saved as draft' : 
             scheduleType === 'scheduled' ? 'Campaign scheduled successfully' : 
             'Campaign started successfully'
  });
});

exports.listCampaigns = asyncHandler(async (req, res) => {
  const { skip = 0, limit = 50, status } = req.query;
  const owner = req.user && (req.user._id || req.user.sub);
  const q = owner ? { createdBy: owner } : {};
  if (status) q.status = status;
  const items = await Campaign.find(q).sort({ createdAt: -1 }).skip(Number(skip)).limit(Number(limit));
  const total = await Campaign.countDocuments(q);
  res.json({ total, items });
});

exports.getCampaign = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid campaign id' });
  }
  const owner = req.user && (req.user._id || req.user.sub);
  const q = owner ? { _id: id, createdBy: owner } : { _id: id };
  const campaign = await Campaign.findOne(q);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  res.json(campaign);
});

exports.getCampaignLogs = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, skip = 0, limit = 50, from, to, channel } = req.query;
  const owner = req.user && (req.user._id || req.user.sub);
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid campaign id' });
  }
  const q = { campaignId: id, ...(owner ? { createdBy: owner } : {}) };
  if (status) q.status = status;
  if (channel) q.channel = channel;
  if (from || to) {
    q.createdAt = {};
    if (from) q.createdAt.$gte = new Date(from);
    if (to) q.createdAt.$lte = new Date(to);
  }
  const items = await CommunicationLog.find(q).sort({ createdAt: -1 }).skip(Number(skip)).limit(Number(limit));
  const total = await CommunicationLog.countDocuments(q);
  res.json({ total, items });
});

// Vendor simulator: send
exports.vendorSend = asyncHandler(async (req, res) => {
  const { campaignId } = req.body;
  if (!campaignId) return res.status(400).json({ message: 'campaignId required' });
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    return res.status(400).json({ message: 'Invalid campaignId' });
  }
  const owner = req.user && (req.user._id || req.user.sub);
  const logs = await CommunicationLog.find({ campaignId, status: 'PENDING', ...(owner ? { createdBy: owner } : {}) }).limit(1000);
  // 90% SENT, 10% FAILED
  const updates = logs.map((log) => {
    const rnd = Math.random();
    const status = rnd < 0.9 ? 'SENT' : 'FAILED';
    const vendorMessageId = status === 'SENT' ? `msg_${log._id}` : undefined;
    return { updateOne: { filter: { _id: log._id }, update: { $set: { status, vendorMessageId } } } };
  });
  if (updates.length) await CommunicationLog.bulkWrite(updates);

  const sent = updates.filter((u) => u.updateOne.update.$set.status === 'SENT').length;
  const failed = updates.length - sent;
  await Campaign.updateOne({ _id: campaignId }, { $inc: { 'counts.sent': sent, 'counts.failed': failed } });

  res.json({ updated: updates.length, sent, failed });
});

// Vendor simulator: receipt webhook
async function updateCampaignMetricsFromLogs(campaignId) {
  const metrics = await CommunicationLog.aggregate([
    { $match: { campaignId: new (require('mongoose').Types.ObjectId)(campaignId) } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(metrics.map((m) => [m._id, m.count]));
  await Campaign.updateOne(
    { _id: campaignId },
    {
      $set: {
        'metrics.sent': map.SENT || 0,
        'metrics.delivered': map.DELIVERED || 0,
        'metrics.opened': map.OPENED || 0,
        'metrics.clicked': map.CLICKED || 0,
        'metrics.failed': map.FAILED || 0,
      },
    }
  );
}

exports.vendorReceipt = asyncHandler(async (req, res) => {
  const { vendorMessageId, status, timestamp, reason } = req.body; // status: DELIVERED, OPENED, CLICKED, FAILED, BOUNCED
  if (!vendorMessageId || !status) return res.status(400).json({ message: 'vendorMessageId and status required' });

  const set = { status };
  if (timestamp) {
    if (status === 'DELIVERED') set.deliveredAt = new Date(timestamp);
    if (status === 'OPENED') set.openedAt = new Date(timestamp);
    if (status === 'CLICKED') set.clickedAt = new Date(timestamp);
    if (status === 'BOUNCED') set.bouncedAt = new Date(timestamp);
  }
  if (reason) set.bounceReason = reason;

  const log = await CommunicationLog.findOneAndUpdate({ vendorMessageId }, { $set: set }, { new: true });
  if (log) {
    await updateCampaignMetricsFromLogs(log.campaignId);
  }
  res.json({ ok: true });
});
