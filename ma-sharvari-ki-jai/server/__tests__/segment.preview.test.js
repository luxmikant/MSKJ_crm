const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
let app;

describe('Segments preview (integration)', () => {
  jest.setTimeout(60000);
  let mongod;

  beforeAll(async () => {
    process.env.AUTH_DISABLED = 'true';
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGO_URI = uri;
    app = require('../src/app');
    const connectDB = require('../src/config/db');
    await connectDB();

    const Customer = require('../src/models/Customer');
    const now = new Date();
    const days = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

    await Customer.insertMany([
      { name: 'Alice', email: 'alice@test.com', totalSpend: 15000, visitCount: 10, lastOrderDate: days(5) },
      { name: 'Bob', email: 'bob@test.com', totalSpend: 5000, visitCount: 2, lastOrderDate: days(60) },
      { name: 'Carol', email: 'carol@test.com', totalSpend: 12000, visitCount: 1, lastOrderDate: days(200) },
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  test('preview by spend and recency', async () => {
    const res = await request(app)
      .post('/api/segments/preview')
      .send({
        rules: {
          condition: 'AND',
          rules: [
            { field: 'totalSpend', operator: '>', value: 10000 },
            { field: 'lastOrderDate', operator: 'in_last_days', value: 30 },
          ],
        },
        sample: 10,
      });

    expect(res.status).toBe(200);
    expect(typeof res.body.audienceSize).toBe('number');
    expect(res.body.audienceSize).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.sample)).toBe(true);
    expect(res.body.sample.length).toBeGreaterThanOrEqual(1);
  });
});
