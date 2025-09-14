const { createClient } = require('redis');
const logger = require('../utils/logger');

const redisClient = createClient({
  url: process.env.REDIS_URL
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
    logger.info('Redis client connected');
  } catch (error) {
    logger.error(`Redis Error: ${error.message}`);
    process.exit(1);
  }
};

redisClient.on('error', (err) => logger.error(`Redis Error: ${err}`));

module.exports = { redisClient, connectRedis };
