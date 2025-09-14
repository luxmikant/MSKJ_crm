require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Customer = require('../models/Customer');

(async () => {
  try {
    await connectDB();
    const now = new Date();
    const days = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
    const docs = [
      { name: 'Alice', email: 'alice@test.com', totalSpend: 15000, visitCount: 10, lastOrderDate: days(5), tags: ['vip'] },
      { name: 'Bob', email: 'bob@test.com', totalSpend: 5000, visitCount: 2, lastOrderDate: days(60), tags: ['new'] },
      { name: 'Carol', email: 'carol@test.com', totalSpend: 12000, visitCount: 1, lastOrderDate: days(200) },
      { name: 'Dave', email: 'dave@test.com', totalSpend: 800, visitCount: 1, lastOrderDate: days(400) },
    ];
    await Customer.deleteMany({ email: { $in: docs.map((d) => d.email) } });
    await Customer.insertMany(docs);
    console.log(`Seeded ${docs.length} customers.`);
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
