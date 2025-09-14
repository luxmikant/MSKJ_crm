const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Campaign = require('../models/Campaign');
const CommunicationLog = require('../models/CommunicationLog');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');

// GET /api/dashboard/kpis
exports.getKPIs = asyncHandler(async (req, res) => {
  const owner = req.user && (req.user._id || req.user.sub);
  const createdBy = owner;

  const [customerCount, orderAgg, revenue30dAgg, campaignsAgg] = await Promise.all([
    Customer.countDocuments({ createdBy }),
    Order.aggregate([
      { $match: { createdBy } },
      { $group: { _id: null, totalRevenue: { $sum: '$orderTotal' }, orders: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { createdBy, orderDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: null, revenue30d: { $sum: '$orderTotal' }, orders30d: { $sum: 1 } } },
    ]),
    Campaign.aggregate([
      { $match: { createdBy } },
      { $group: { _id: null, total: { $sum: 1 }, running: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } } } },
    ]),
  ]);

  const totals = orderAgg[0] || { totalRevenue: 0, orders: 0 };
  const last30 = revenue30dAgg[0] || { revenue30d: 0, orders30d: 0 };
  const camp = campaignsAgg[0] || { total: 0, running: 0 };

  res.json({
    customers: customerCount,
    orders: totals.orders,
    revenue: totals.totalRevenue,
    revenue30d: last30.revenue30d,
    activeCampaigns: camp.running,
    totalCampaigns: camp.total,
  });
});

// GET /api/dashboard/recent-activity
exports.getRecentActivity = asyncHandler(async (req, res) => {
  const owner = req.user && (req.user._id || req.user.sub);
  const createdBy = owner;
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);

  const [recentOrders, recentCustomers, recentLogs, recentCampaigns] = await Promise.all([
    Order.find({ createdBy }).sort({ orderDate: -1 }).limit(limit).select('orderTotal status orderDate customerId externalOrderId').lean(),
    Customer.find({ createdBy }).sort({ createdAt: -1 }).limit(limit).select('name email phone createdAt externalCustomerId').lean(),
    CommunicationLog.find({ createdBy }).sort({ createdAt: -1 }).limit(limit).select('campaignId status channel createdAt').lean(),
    Campaign.find({ createdBy }).sort({ createdAt: -1 }).limit(limit).select('name status channel createdAt updatedAt counts').lean(),
  ]);

  res.json({ recentOrders, recentCustomers, recentLogs, recentCampaigns });
});

// GET /api/dashboard/campaign-performance
exports.getCampaignPerformance = asyncHandler(async (req, res) => {
  const owner = req.user && (req.user._id || req.user.sub);
  const createdBy = owner;
  const sinceDays = Math.min(parseInt(req.query.days || '30', 10), 365);
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const perf = await CommunicationLog.aggregate([
    { $match: { createdBy, createdAt: { $gte: since } } },
    {
      $group: {
        _id: { campaignId: '$campaignId', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  // reshape results per campaign
  const map = {};
  for (const row of perf) {
    const id = String(row._id.campaignId);
    if (!map[id]) map[id] = { campaignId: id, SENT: 0, FAILED: 0, DELIVERED: 0, OPENED: 0, CLICKED: 0 };
    map[id][row._id.status] = row.count;
  }

  // join with campaign names
  const ids = Object.keys(map).map((s) => s);
  const mongoose = require('mongoose');
  const objIds = ids.map((s) => new mongoose.Types.ObjectId(s));
  const campaigns = await Campaign.find({ _id: { $in: objIds }, createdBy }).select('name status createdAt').lean();
  const byId = Object.fromEntries(campaigns.map((c) => [String(c._id), c]));
  const data = ids.map((id) => ({
    campaignId: id,
    name: byId[id]?.name || 'Unknown',
    status: byId[id]?.status || 'draft',
    createdAt: byId[id]?.createdAt || null,
    metrics: map[id],
  }));

  res.json(data);
});

// GET /api/dashboard/campaigns
exports.getDashboardCampaigns = asyncHandler(async (req, res) => {
  const owner = req.user && (req.user._id || req.user.sub);
  const createdBy = owner;
  const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const skip = (page - 1) * limit;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [items, total] = await Promise.all([
    Campaign.find({ createdBy, createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name status createdAt channel segmentId counts metrics performance scheduledFor startedAt completedAt')
      .lean(),
    Campaign.countDocuments({ createdBy, createdAt: { $gte: since } }),
  ]);

  res.json({ success: true, data: { campaigns: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

// GET /api/dashboard/summary
exports.getInsightsSummary = asyncHandler(async (req, res) => {
  const owner = req.user && (req.user._id || req.user.sub);
  const createdBy = owner;
  const sinceDays = Math.min(parseInt(req.query.days || '30', 10), 365);
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const [customerCount, totalsAgg, logsAgg, recentCampaigns] = await Promise.all([
    Customer.countDocuments({ createdBy }),
    Order.aggregate([
      { $match: { createdBy } },
      { $group: { _id: null, revenueAll: { $sum: '$orderTotal' }, ordersAll: { $sum: 1 } } },
    ]),
    CommunicationLog.aggregate([
      { $match: { createdBy, createdAt: { $gte: since } } },
      { $group: { _id: { campaignId: '$campaignId', status: '$status' }, count: { $sum: 1 } } },
    ]),
    Campaign.find({ createdBy }).sort({ createdAt: -1 }).limit(20).select('name status').lean(),
  ]);

  const totals = totalsAgg[0] || { revenueAll: 0, ordersAll: 0 };

  const byCampaign = {};
  for (const row of logsAgg) {
    const id = String(row._id.campaignId);
    if (!byCampaign[id]) byCampaign[id] = { SENT: 0, FAILED: 0, DELIVERED: 0, OPENED: 0, CLICKED: 0 };
    byCampaign[id][row._id.status] = row.count;
  }

  const ids = Object.keys(byCampaign);
  let campaignsMeta = [];
  if (ids.length) {
    const objIds = ids
      .filter((s) => mongoose.isValidObjectId(s))
      .map((s) => new mongoose.Types.ObjectId(s));
    campaignsMeta = await Campaign.find({ _id: { $in: objIds }, createdBy })
      .select('name status createdAt')
      .lean();
  }
  const metaById = Object.fromEntries(campaignsMeta.map((c) => [String(c._id), c]));

  const rows = ids.map((id) => {
    const m = byCampaign[id];
    const delivered = m.DELIVERED || 0;
    const openRate = delivered ? (m.OPENED || 0) / delivered : 0;
    const clickRate = delivered ? (m.CLICKED || 0) / delivered : 0;
    return {
      id,
      name: metaById[id]?.name || 'Unknown',
      status: metaById[id]?.status || 'draft',
      metrics: m,
      openRate,
      clickRate,
    };
  });

  const totals30 = rows.reduce(
    (acc, r) => {
      acc.SENT += r.metrics.SENT || 0;
      acc.DELIVERED += r.metrics.DELIVERED || 0;
      acc.OPENED += r.metrics.OPENED || 0;
      acc.CLICKED += r.metrics.CLICKED || 0;
      acc.FAILED += r.metrics.FAILED || 0;
      return acc;
    },
    { SENT: 0, DELIVERED: 0, OPENED: 0, CLICKED: 0, FAILED: 0 }
  );

  const topByOpen = rows
    .filter((r) => r.metrics.DELIVERED > 0)
    .sort((a, b) => b.openRate - a.openRate)[0] || null;
  const topByClick = rows
    .filter((r) => r.metrics.DELIVERED > 0)
    .sort((a, b) => b.clickRate - a.clickRate)[0] || null;

  let summary;
  if (rows.length === 0) {
    summary = `No communication activity in the last ${sinceDays} days. Launch a campaign to re-engage your ${customerCount} customers.`;
  } else {
    const avgOpen = totals30.DELIVERED ? (totals30.OPENED / totals30.DELIVERED) * 100 : 0;
    const avgClick = totals30.DELIVERED ? (totals30.CLICKED / totals30.DELIVERED) * 100 : 0;
    const topOpenText = topByOpen ? `${topByOpen.name} (${(topByOpen.openRate * 100).toFixed(1)}% open rate)` : 'N/A';
    const topClickText = topByClick ? `${topByClick.name} (${(topByClick.clickRate * 100).toFixed(1)}% click rate)` : 'N/A';
    summary = `Over the last ${sinceDays} days, you reached ${totals30.SENT.toLocaleString()} customers across ${rows.length} campaigns, delivering ${totals30.DELIVERED.toLocaleString()} messages. Average open rate was ${avgOpen.toFixed(1)}% with a ${avgClick.toFixed(1)}% click-through rate. Top performers: opens — ${topOpenText}; clicks — ${topClickText}. Lifetime revenue stands at $${totals.revenueAll.toLocaleString()}.`;
  }

  const highlights = [];
  if (topByOpen) highlights.push(`Best open rate: ${topByOpen.name} at ${(topByOpen.openRate * 100).toFixed(1)}%.`);
  if (topByClick) highlights.push(`Best click rate: ${topByClick.name} at ${(topByClick.clickRate * 100).toFixed(1)}%.`);
  if (totals30.FAILED > 0) highlights.push(`${totals30.FAILED.toLocaleString()} messages failed; check sender reputation and lists.`);
  if (totals30.DELIVERED > 0 && totals30.OPENED === 0) highlights.push('Low engagement: delivered messages received zero opens. Review subject lines and timing.');

  const recommendations = [];
  if (!rows.length) {
    recommendations.push('Create a welcome or re-engagement campaign to activate your audience.');
  } else {
    recommendations.push('Replicate elements from top-performing campaigns (subject, audience, timing).');
    recommendations.push('A/B test subject lines to lift open rates.');
    recommendations.push('Tighten targeting using recent purchasers vs lapsed segments.');
  }

  res.json({
    periodDays: sinceDays,
    summary,
    highlights,
    recommendations,
    metrics: {
      customers: customerCount,
      revenueAll: totals.revenueAll,
      ordersAll: totals.ordersAll,
      totals30,
      campaignsAnalyzed: rows.length,
      topOpen: topByOpen && {
        name: topByOpen.name,
        openRate: topByOpen.openRate,
        metrics: topByOpen.metrics,
      },
      topClick: topByClick && {
        name: topByClick.name,
        clickRate: topByClick.clickRate,
        metrics: topByClick.metrics,
      },
      recentCampaigns,
    },
  });
});
