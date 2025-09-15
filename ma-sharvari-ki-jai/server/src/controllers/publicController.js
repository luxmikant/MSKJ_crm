const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Campaign = require('../models/Campaign');
const CommunicationLog = require('../models/CommunicationLog');

exports.getPublicMetrics = async (_req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      customers,
      campaigns,
      ordersLast30Days,
      commsSentLike,
      commsFailedLike,
    ] = await Promise.all([
      Customer.countDocuments({}),
      Campaign.countDocuments({}),
      Order.countDocuments({ createdAt: { $gte: since } }),
      CommunicationLog.countDocuments({
        createdAt: { $gte: since },
        status: { $in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] },
      }),
      CommunicationLog.countDocuments({
        createdAt: { $gte: since },
        status: 'FAILED',
      }),
    ]);

    return res.json({
      since: since.toISOString(),
      customers,
      campaigns,
      ordersLast30Days,
      commsLast30Days: {
        sentLike: commsSentLike,
        failedLike: commsFailedLike,
      },
    });
  } catch (err) {
    return res.status(200).json({
      since: null,
      customers: 0,
      campaigns: 0,
      ordersLast30Days: 0,
      commsLast30Days: { sentLike: 0, failedLike: 0 },
      fallback: true,
      error: process.env.NODE_ENV === 'production' ? undefined : String(err?.message || err),
    });
  }
};
