const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  const code = err.code || (statusCode >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
  const requestId = req.id || req.requestId || req.headers['x-request-id'];

  logger.error(`${code} ${err.message} - ${req.method} ${req.originalUrl} - requestId=${requestId}`);

  res.status(statusCode).json({
    success: false,
    error: { code, message: err.message },
    details: err.details || undefined,
    requestId,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = { errorHandler };
