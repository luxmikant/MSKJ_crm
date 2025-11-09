const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const path = require('path');
const fs = require('fs');
let app;

describe('Customer CSV Import/Export', () => {
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
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    const Customer = require('../src/models/Customer');
    await Customer.deleteMany({});
  });

  describe('POST /api/customers/import', () => {
    test('successfully imports valid CSV with all fields', async () => {
      const csvContent = `externalCustomerId,name,email,phone,totalSpend,visitCount,lastOrderDate,tags,attributes
cust001,John Doe,john@example.com,555-1234,5000,10,2024-11-01,premium;vip,"{""tier"":""gold""}"
cust002,Jane Smith,jane@example.com,555-5678,3000,5,2024-10-15,regular,"{""tier"":""silver""}"`;

      const res = await request(app)
        .post('/api/customers/import')
        .attach('file', Buffer.from(csvContent), 'customers.csv');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.upserted).toBeGreaterThanOrEqual(2);
    });

    test('successfully imports CSV with only required fields', async () => {
      const csvContent = `externalCustomerId,name,email
cust003,Bob Wilson,bob@example.com
cust004,Alice Brown,alice@example.com`;

      const res = await request(app)
        .post('/api/customers/import')
        .attach('file', Buffer.from(csvContent), 'customers.csv');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.upserted).toBeGreaterThanOrEqual(2);
    });

    test('rejects CSV with missing required headers', async () => {
      const csvContent = `name,email
John Doe,john@example.com`;

      const res = await request(app)
        .post('/api/customers/import')
        .attach('file', Buffer.from(csvContent), 'customers.csv');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_HEADERS');
      expect(res.body.error.message).toContain('externalCustomerId');
    });

    test('rejects empty CSV file', async () => {
      const csvContent = `externalCustomerId,name,email`;

      const res = await request(app)
        .post('/api/customers/import')
        .attach('file', Buffer.from(csvContent), 'customers.csv');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EMPTY_CSV');
    });

    test('rejects request without file', async () => {
      const res = await request(app)
        .post('/api/customers/import')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NO_FILE');
    });

    test('validates email format in CSV data', async () => {
      const csvContent = `externalCustomerId,name,email
cust005,Invalid User,notanemail`;

      const res = await request(app)
        .post('/api/customers/import')
        .attach('file', Buffer.from(csvContent), 'customers.csv');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.details).toBeDefined();
    });

    test('handles CSV with tags separated by semicolons', async () => {
      const csvContent = `externalCustomerId,name,email,tags
cust006,Tagged User,tagged@example.com,tag1;tag2;tag3`;

      const res = await request(app)
        .post('/api/customers/import')
        .attach('file', Buffer.from(csvContent), 'customers.csv');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const Customer = require('../src/models/Customer');
      const customer = await Customer.findOne({ externalCustomerId: 'cust006' });
      expect(customer.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    test('handles idempotent re-import of same data', async () => {
      const csvContent = `externalCustomerId,name,email
cust007,Repeat User,repeat@example.com`;

      // First import
      const res1 = await request(app)
        .post('/api/customers/import')
        .attach('file', Buffer.from(csvContent), 'customers.csv');
      expect(res1.status).toBe(201);
      expect(res1.body.upserted).toBe(1);

      // Second import (should update)
      const res2 = await request(app)
        .post('/api/customers/import')
        .attach('file', Buffer.from(csvContent), 'customers.csv');
      expect(res2.status).toBe(201);
      expect(res2.body.matched).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/customers/export', () => {
    beforeEach(async () => {
      const Customer = require('../src/models/Customer');
      await Customer.insertMany([
        {
          externalCustomerId: 'exp001',
          name: 'Export User 1',
          email: 'export1@example.com',
          phone: '555-1111',
          totalSpend: 1000,
          visitCount: 5,
          lastOrderDate: new Date('2024-11-01'),
          tags: ['premium'],
          attributes: { tier: 'gold' },
          createdBy: '000000000000000000000000',
        },
        {
          externalCustomerId: 'exp002',
          name: 'Export User 2',
          email: 'export2@example.com',
          totalSpend: 500,
          visitCount: 2,
          tags: [],
          attributes: {},
          createdBy: '000000000000000000000000',
        },
      ]);
    });

    test('exports customers to CSV format', async () => {
      const res = await request(app).get('/api/customers/export');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('.csv');
      expect(res.text).toContain('externalCustomerId,name,email');
      expect(res.text).toContain('exp001');
      expect(res.text).toContain('Export User 1');
      expect(res.text).toContain('export1@example.com');
    });

    test('exports with filters applied', async () => {
      const res = await request(app)
        .get('/api/customers/export')
        .query({ minSpend: 800 });

      expect(res.status).toBe(200);
      expect(res.text).toContain('exp001');
      expect(res.text).not.toContain('exp002');
    });

    test('respects limit parameter', async () => {
      const res = await request(app)
        .get('/api/customers/export')
        .query({ limit: 1 });

      expect(res.status).toBe(200);
      const lines = res.text.split('\n').filter((l) => l.trim());
      expect(lines.length).toBe(2); // 1 header + 1 data row
    });

    test('exports empty CSV when no customers match', async () => {
      const res = await request(app)
        .get('/api/customers/export')
        .query({ minSpend: 99999 });

      expect(res.status).toBe(200);
      expect(res.text).toContain('externalCustomerId,name,email');
      const lines = res.text.split('\n').filter((l) => l.trim());
      expect(lines.length).toBe(1); // Only header
    });
  });

  describe('CSV round-trip (export then import)', () => {
    test('exported data can be re-imported successfully', async () => {
      const Customer = require('../src/models/Customer');
      await Customer.create({
        externalCustomerId: 'round001',
        name: 'Round Trip User',
        email: 'roundtrip@example.com',
        phone: '555-9999',
        totalSpend: 2500,
        visitCount: 8,
        tags: ['test', 'roundtrip'],
        attributes: { source: 'test' },
        createdBy: '000000000000000000000000',
      });

      // Export
      const exportRes = await request(app).get('/api/customers/export');
      expect(exportRes.status).toBe(200);

      // Clear database
      await Customer.deleteMany({});

      // Re-import
      const importRes = await request(app)
        .post('/api/customers/import')
        .attach('file', Buffer.from(exportRes.text), 'export.csv');

      expect(importRes.status).toBe(201);
      expect(importRes.body.success).toBe(true);

      // Verify data
      const reimported = await Customer.findOne({ externalCustomerId: 'round001' });
      expect(reimported).toBeDefined();
      expect(reimported.name).toBe('Round Trip User');
      expect(reimported.email).toBe('roundtrip@example.com');
      expect(reimported.totalSpend).toBe(2500);
      expect(reimported.tags).toContain('test');
    });
  });
});
