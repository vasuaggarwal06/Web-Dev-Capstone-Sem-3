const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  signAccessToken, signRefreshToken, verifyRefreshToken, hashToken,
} = require('../utils/tokens');

const MAX_SESSIONS = 5; // keep at most 5 active refresh tokens per user

const issueTokens = async (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const hashes = [...(user.refreshTokens || []), hashToken(refreshToken)].slice(-MAX_SESSIONS);
  await User.updateOne({ _id: user._id }, { $set: { refreshTokens: hashes } });
  return { accessToken, refreshToken };
};

// POST /api/auth/register  (public self-registration always creates a student)
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, rollNumber } = req.body;
  const user = await User.create({ name, email, password, rollNumber, role: 'student' });
  const tokens = await issueTokens(user);
  res.status(201).json({ success: true, user, ...tokens });
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw ApiError.badRequest('Email and password are required');

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password +refreshTokens');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  const tokens = await issueTokens(user);
  res.json({ success: true, user, ...tokens });
});

// POST /api/auth/refresh  (rotates the refresh token)
exports.refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.badRequest('refreshToken is required');

  const decoded = verifyRefreshToken(refreshToken);
  const user = await User.findById(decoded.id).select('+refreshTokens');
  const hash = hashToken(refreshToken);
  if (!user || !user.refreshTokens.includes(hash)) {
    // Reuse of an already-rotated token: revoke every session for safety.
    if (user) await User.updateOne({ _id: user._id }, { $set: { refreshTokens: [] } });
    throw ApiError.unauthorized('Refresh token is no longer valid');
  }

  user.refreshTokens = user.refreshTokens.filter((h) => h !== hash);
  const tokens = await issueTokens(user);
  res.json({ success: true, ...tokens });
});

// POST /api/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await User.updateOne({ _id: req.user._id }, { $pull: { refreshTokens: hashToken(refreshToken) } });
  }
  res.json({ success: true, message: 'Logged out' });
});

// GET /api/auth/me
exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});
