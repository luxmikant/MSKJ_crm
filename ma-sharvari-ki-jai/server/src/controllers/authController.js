const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function sign(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, name: user.name, picture: user.picture },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

exports.googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ message: 'idToken required' });

  if (process.env.AUTH_DISABLED === 'true' && idToken === 'dev') {
    let user = await User.findOne({ email: 'demo@example.com' });
    if (!user) user = await User.create({ email: 'demo@example.com', name: 'Demo User', provider: 'local' });
    const token = jwt.sign({ _id: user._id.toString(), email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
  }

  // Quick format guard: Google ID tokens are JWTs with 3 segments
  if (typeof idToken !== 'string' || idToken.split('.').length !== 3) {
    return res.status(400).json({ message: 'Invalid Google token format' });
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch (e) {
    return res.status(400).json({ message: 'Invalid Google token', details: e?.message || String(e) });
  }
  const email = payload.email?.toLowerCase();
  if (!email) return res.status(400).json({ message: 'Invalid Google token' });

  const update = {
    googleId: payload.sub,
    email,
    name: payload.name || email,
    picture: payload.picture,
  };
  const user = await User.findOneAndUpdate({ email }, { $set: update }, { upsert: true, new: true });
  const token = sign(user);

  if (req.query.cookie === 'true') {
    const prod = process.env.NODE_ENV === 'production';
    res.cookie('token', token, { httpOnly: true, secure: prod, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  }
  res.json({ token, user: { id: user._id, email: user.email, name: user.name, picture: user.picture } });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ user: req.user || null });
});

exports.logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});
