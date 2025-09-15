/*
  Seed last 30 days of activity:
  - Customers with createdAt spread across 30 days
  - Orders per customer across 30 days; aggregates updated on customers
  - One default segment if missing
  - 3 campaigns within 30 days (EMAIL/SMS)
  - Communication logs with SENT/FAILED/DELIVERED/OPENED/CLICKED
*/
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const { randomUUID } = require('crypto');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Campaign = require('../models/Campaign');
const CommunicationLog = require('../models/CommunicationLog');
const Segment = require('../models/Segment');
const User = require('../models/User');

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d }

async function seed() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ma-sharvari-crm';
  await mongoose.connect(mongoUri);

  // Ensure a demo user exists
  let user = await User.findOne({ email: 'demo@example.com' });
  if (!user) user = await User.create({ email: 'demo@example.com', name: 'Demo User', provider: 'local' });
  const createdBy = user._id;

  // Clean previous data created by demo user within last 45 days to avoid duplicates
  const cutoff = daysAgo(45);
  await Promise.all([
    Customer.deleteMany({ createdBy, createdAt: { $gte: cutoff } }),
    Order.deleteMany({ createdBy, createdAt: { $gte: cutoff } }),
    Campaign.deleteMany({ createdBy, createdAt: { $gte: cutoff } }),
    CommunicationLog.deleteMany({ createdBy, createdAt: { $gte: cutoff } }),
  ]);

  // Customers
  const customerCount = 120;
  const customers = [];
  for (let i = 0; i < customerCount; i++) {
    const day = randInt(0, 29);
    const createdAt = daysAgo(day);
    const first = `User${i+1}`;
    const last = `L${randInt(1, 9999)}`;
    customers.push({
      externalCustomerId: `c30_${i + 1}`,
      name: `${first} ${last}`,
      email: `${first}.${last}.${i}@example.com`.toLowerCase(),
      phone: `+1${randInt(2000000000, 9899999999)}`,
      tags: randInt(0, 1) ? ['newsletter'] : [],
      attributes: { loyaltyTier: choice(['Basic', 'Standard', 'Premium']), status: choice(['Active','Inactive']), location: choice(['NY','CA','TX','FL','WA']) },
      createdBy,
      createdAt,
      updatedAt: createdAt,
    });
  }
  await Customer.insertMany(customers);
  const customerDocs = await Customer.find({ createdBy, createdAt: { $gte: daysAgo(31) } }).select('_id externalCustomerId').lean();

  // Orders across last 30 days
  const orders = [];
  const statuses = ['PLACED', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  for (const cust of customerDocs) {
    const n = randInt(0, 4);
    for (let j = 0; j < n; j++) {
      const day = randInt(0, 29);
      const orderDate = daysAgo(day);
      const itemsCount = randInt(1, 3);
      const items = [];
      let total = 0;
      for (let k = 0; k < itemsCount; k++) {
        const price = randInt(500, 20000) / 100;
        const qty = randInt(1, 3);
        total += price * qty;
        items.push({ productId: `SKU-${randInt(1000, 9999)}`, name: `Product ${randInt(1, 200)}`, price, quantity: qty });
      }
      orders.push({
        externalOrderId: `o30_${cust.externalCustomerId}_${j+1}`,
        customerId: cust._id,
        items,
        orderTotal: Math.round(total * 100) / 100,
        status: choice(statuses),
        createdBy,
        orderDate,
        createdAt: orderDate,
        updatedAt: orderDate,
      });
    }
  }
  if (orders.length) await Order.insertMany(orders);

  // Update customer aggregates
  const aggregates = await Order.aggregate([
    { $match: { createdBy } },
    { $group: { _id: '$customerId', totalSpend: { $sum: '$orderTotal' }, visitCount: { $sum: 1 }, lastOrderDate: { $max: '$orderDate' } } },
  ]);
  for (const a of aggregates) {
    await Customer.updateOne(
      { _id: a._id, createdBy },
      { $set: { totalSpend: a.totalSpend, visitCount: a.visitCount, lastOrderDate: a.lastOrderDate } }
    );
  }

  // Ensure a segment exists
  let seg = await Segment.findOne({ createdBy, name: 'Active last 30 days' });
  if (!seg) seg = await Segment.create({ name: 'Active last 30 days', rules: { condition: 'AND', rules: [{ field: 'lastOrderDate', operator: 'in_last_days', value: 30 }] }, createdBy });

  // Campaigns within last 30 days
  const channels = ['EMAIL', 'SMS'];
  const campaigns = [];
  for (let i = 0; i < 3; i++) {
    const createdAt = daysAgo(randInt(0, 29));
    campaigns.push({
      name: `30D Promo ${i + 1}`,
      description: 'Monthly promotional campaign',
      segmentId: seg._id,
      channel: choice(channels),
      template: 'Hello {{name}}, check our new offers!',
      createdBy,
      status: choice(['draft', 'running', 'completed']),
      counts: { total: 0, sent: 0, failed: 0, delivered: 0 },
      createdAt,
      updatedAt: createdAt,
    });
  }
  const insertedCampaigns = await Campaign.insertMany(campaigns);

  // Communication Logs for the campaigns
  const logs = [];
  for (const camp of insertedCampaigns) {
    const audience = randInt(60, 160);
    for (let i = 0; i < audience; i++) {
      const cust = choice(customerDocs);
      const baseDate = daysAgo(randInt(0, 29));
      const sent = Math.random() < 0.85; // 85% sent
      const failed = !sent || Math.random() < 0.08; // up to ~15% failed
      const delivered = sent && !failed && Math.random() < 0.7;
      const opened = delivered && camp.channel === 'EMAIL' && Math.random() < 0.4;
      const clicked = opened && Math.random() < 0.3;

      const payload = { to: cust._id.toString(), template: camp.template, campaign: camp.name };
      const vendorMessageId = sent ? randomUUID() : undefined;
      const error = failed ? choice(['SMTP 550: Mailbox unavailable', 'Twilio 30006: Landline or unreachable carrier', 'Timeout contacting provider']) : undefined;

      const entry = {
        campaignId: camp._id,
        customerId: cust._id,
        channel: camp.channel,
        status: failed ? 'FAILED' : sent ? 'SENT' : 'PENDING',
        vendorMessageId,
        payload,
        error,
        createdBy,
        createdAt: baseDate,
        updatedAt: baseDate,
      };
      if (delivered) entry.status = 'DELIVERED';
      if (opened) entry.openedAt = new Date(baseDate.getTime() + randInt(10 * 60 * 1000, 6 * 60 * 60 * 1000));
      if (clicked) entry.clickedAt = new Date(baseDate.getTime() + randInt(20 * 60 * 1000, 12 * 60 * 60 * 1000));
      logs.push(entry);
    }

    // Update campaign counts with this campaign's logs
    const byCamp = (l) => l.campaignId.toString() === camp._id.toString();
    const total = logs.filter(byCamp).length;
    const sentCount = logs.filter((l) => byCamp(l) && (l.status === 'SENT' || l.status === 'DELIVERED' || l.status === 'OPENED' || l.status === 'CLICKED')).length;
    const failedCount = logs.filter((l) => byCamp(l) && l.status === 'FAILED').length;
    const deliveredCount = logs.filter((l) => byCamp(l) && l.status === 'DELIVERED').length;
    await Campaign.updateOne({ _id: camp._id }, { $set: { counts: { total, sent: sentCount, failed: failedCount, delivered: deliveredCount } } });
  }
  if (logs.length) await CommunicationLog.insertMany(logs);

  console.log(`Seeded last 30 days: ${customers.length} customers, ${orders.length} orders, ${insertedCampaigns.length} campaigns, ${logs.length} logs.`);
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1) });
