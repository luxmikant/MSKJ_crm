/*
  Seed demo data for dashboard and pages. WARNING: Dev use only.
*/
const mongoose = require('mongoose');
const faker = require('faker');
const dotenv = require('dotenv');
dotenv.config();

const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Campaign = require('../models/Campaign');
const CommunicationLog = require('../models/CommunicationLog');
const User = require('../models/User');

async function seed() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/xeno';
  await mongoose.connect(mongoUri);

  // Create or reuse a demo user
  let user = await User.findOne({ email: 'demo@example.com' });
  if (!user) {
    user = await User.create({ email: 'demo@example.com', name: 'Demo User', provider: 'local' });
  }
  const createdBy = user._id;

  // Clear previous demo data for this user
  await Promise.all([
    Customer.deleteMany({ createdBy }),
    Order.deleteMany({ createdBy }),
    Campaign.deleteMany({ createdBy }),
    CommunicationLog.deleteMany({ createdBy }),
  ]);

  // Customers
  const customerCount = 200;
  const customers = [];
  for (let i = 0; i < customerCount; i++) {
    const first = faker.name.firstName();
    const last = faker.name.lastName();
    customers.push({
      externalCustomerId: `cust_${i + 1}`,
      name: `${first} ${last}`,
      email: `${first}.${last}.${i}@example.com`.toLowerCase(),
      phone: faker.phone.phoneNumber('+1##########'),
      city: faker.address.city(),
      state: faker.address.stateAbbr(),
      country: 'US',
      age: faker.datatype.number({ min: 18, max: 75 }),
      gender: faker.random.arrayElement(['M', 'F', 'O']),
      tags: faker.random.arrayElements(['vip', 'new', 'churn-risk', 'newsletter', 'coupon'], faker.datatype.number({ min: 0, max: 3 })),
      createdBy,
    });
  }
  await Customer.insertMany(customers);
  const customerDocs = await Customer.find({ createdBy }).select('_id externalCustomerId').lean();

  // Orders
  const orders = [];
  const statuses = ['PLACED', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  for (let i = 0; i < 600; i++) {
    const cust = faker.random.arrayElement(customerDocs);
    const itemsCount = faker.datatype.number({ min: 1, max: 5 });
    const items = [];
  let total = 0;
    for (let j = 0; j < itemsCount; j++) {
      const price = faker.datatype.number({ min: 500, max: 20000 }) / 100; // $5 - $200
      const qty = faker.datatype.number({ min: 1, max: 3 });
      total += price * qty;
      items.push({ sku: `SKU-${faker.datatype.number(9999)}`, name: faker.commerce.productName(), price, quantity: qty });
    }
    const daysAgo = faker.datatype.number({ min: 0, max: 180 });
    const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    orders.push({
      externalOrderId: `ord_${i + 1}`,
      customerId: cust._id,
      items,
      orderTotal: Math.round(total * 100) / 100,
      status: faker.random.arrayElement(statuses),
      createdBy,
      orderDate,
      createdAt: orderDate,
      updatedAt: orderDate,
    });
  }
  await Order.insertMany(orders);

  // Update customer aggregates based on inserted orders
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
  const Segment = require('../models/Segment');
  let seg = await Segment.findOne({ createdBy });
  if (!seg) {
    seg = await Segment.create({ name: 'All Customers', rules: { op: 'ALL' }, createdBy });
  }

  // Campaigns
  const campaigns = [];
  const campStatuses = ['draft', 'scheduled', 'running', 'completed', 'paused'];
  for (let i = 0; i < 6; i++) {
    const createdAt = new Date(Date.now() - faker.datatype.number({ min: 0, max: 90 }) * 24 * 60 * 60 * 1000);
    campaigns.push({
      name: `Promo ${i + 1}`,
  segmentId: seg._id,
      channel: faker.random.arrayElement(['EMAIL', 'SMS']),
      template: 'Hello {{name}}, check our deals!',
      createdBy,
      status: faker.random.arrayElement(campStatuses),
      counts: { total: 0, sent: 0, failed: 0, delivered: 0 },
      createdAt,
      updatedAt: createdAt,
    });
  }
  const insertedCampaigns = await Campaign.insertMany(campaigns);

  // Communication Logs
  const logStatuses = ['SENT', 'FAILED', 'DELIVERED', 'OPENED', 'CLICKED'];
  const logs = [];
  for (const camp of insertedCampaigns) {
    const audience = faker.datatype.number({ min: 50, max: 200 });
    for (let i = 0; i < audience; i++) {
      const cust = faker.random.arrayElement(customerDocs);
      const status = faker.random.arrayElement(logStatuses);
      const createdAt = new Date(camp.createdAt.getTime() + faker.datatype.number({ min: 0, max: 7 }) * 24 * 60 * 60 * 1000);
      logs.push({
        campaignId: camp._id,
        customerId: cust._id,
        status,
        channel: camp.channel,
        createdBy,
        createdAt,
        updatedAt: createdAt,
      });
    }
    // Update counts on campaign
    const sent = logs.filter((l) => l.campaignId.equals(camp._id) && l.status === 'SENT').length;
    const failed = logs.filter((l) => l.campaignId.equals(camp._id) && l.status === 'FAILED').length;
    const delivered = logs.filter((l) => l.campaignId.equals(camp._id) && l.status === 'DELIVERED').length;
    await Campaign.updateOne({ _id: camp._id }, { $set: { counts: { total: audience, sent, failed, delivered } } });
  }
  await CommunicationLog.insertMany(logs);

  console.log('Seed completed for user demo@example.com');
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
