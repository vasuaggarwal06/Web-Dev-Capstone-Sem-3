const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const signAccessToken = (user) => {
  const cfg = env.get();
  return jwt.sign({ id: user._id, role: user.role }, cfg.accessSecret, { expiresIn: cfg.accessExpires });
};

const signRefreshToken = (user) => {
  const cfg = env.get();
  // jti makes every refresh token unique, even if issued in the same second
  return jwt.sign({ id: user._id, jti: crypto.randomUUID() }, cfg.refreshSecret, {
    expiresIn: cfg.refreshExpires,
  });
};

const verifyAccessToken = (token) => jwt.verify(token, env.get().accessSecret);
const verifyRefreshToken = (token) => jwt.verify(token, env.get().refreshSecret);

// Refresh tokens are stored hashed so a database leak does not expose live tokens.
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, hashToken };
