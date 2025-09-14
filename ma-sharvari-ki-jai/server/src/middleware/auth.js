const jwt = require('jsonwebtoken');

function getToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7);
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}

exports.requireAuth = (req, res, next) => {
  if (process.env.AUTH_DISABLED === 'true') return next();
  const token = getToken(req);
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
