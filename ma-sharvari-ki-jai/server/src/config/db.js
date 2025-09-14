const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ma-sharvari-crm';
    const conn = await mongoose.connect(mongoUri); // no deprecated options
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    const noDbOk = process.env.NO_DB_OK === 'true' || process.env.AUTH_DISABLED === 'true' || process.env.NODE_ENV !== 'production';
    if (noDbOk) {
      logger.warn('Continuing without MongoDB connection (NO_DB_OK or non-production). Some features may not work.');
      return; // Don't exit in dev/when allowed
    }
    process.exit(1);
  }
};

module.exports = { connectDB };