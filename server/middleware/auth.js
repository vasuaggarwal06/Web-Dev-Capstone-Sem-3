const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/tokens');

// Protected route: requires a valid access token in "Authorization: Bearer <token>"
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) throw ApiError.unauthorized('Access token missing');

  const decoded = verifyAccessToken(header.split(' ')[1]); // JWT errors handled centrally
  const user = await User.findById(decoded.id);
  if (!user) throw ApiError.unauthorized('User belonging to this token no longer exists');

  req.user = user;
  next();
});

// RBAC: allow only the listed roles
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden(`Role '${req.user.role}' is not allowed to access this route`));
  }
  next();
};

module.exports = { protect, authorize };
