const app = require('./app');
const config = require('./config/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
config.connectDB();

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
