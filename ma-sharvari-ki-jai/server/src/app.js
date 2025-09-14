require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const { errorHandler } = require('./middleware/errorHandler');
const crypto = require('crypto');
const { requireAuth } = require('./middleware/auth');

// Load env vars (already loaded above, keep for safety)
dotenv.config();

const app = express();

// Request ID middleware
app.use((req, res, next) => {
  const headerId = req.headers['x-request-id'];
  req.id = typeof headerId === 'string' && headerId.trim() ? headerId : crypto.randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
});

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());
const allowed = (process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: allowed.length ? allowed : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-request-id'],
  })
)
app.use(morgan('dev'));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Ma Sharvari Ki Jai CRM API' });
});

// Swagger docs
try {
  const swaggerDocument = YAML.load(path.join(__dirname, './docs/openapi.yaml'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  // Skip docs if not present
}

// Health route
app.use('/api/health', require('./routes/healthRoutes'));

// API Routes will be added here
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/customers', requireAuth, require('./routes/customerRoutes'));
app.use('/api/orders', requireAuth, require('./routes/orderRoutes'));
app.use('/api/campaigns', require('./routes/campaignRoutes'));
app.use('/api/segments', requireAuth, require('./routes/segmentRoutes'));
app.use('/api/dashboard', requireAuth, require('./routes/dashboardRoutes'));
app.use('/api/templates', require('./routes/templateRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// Error handler middleware
app.use(errorHandler);

module.exports = app;
