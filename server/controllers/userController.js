const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/users?role=student   (admin)
exports.listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, users });
});

// GET /api/users/students   (teacher, admin) - used when enrolling students
exports.listStudents = asyncHandler(async (req, res) => {
  const students = await User.find({ role: 'student' }).sort({ name: 1 });
  res.json({ success: true, count: students.length, users: students });
});

// POST /api/users   (admin) - create a user with any role
exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, rollNumber } = req.body;
  const user = await User.create({ name, email, password, role, rollNumber });
  res.status(201).json({ success: true, user });
});

// PATCH /api/users/:id/role   (admin)
exports.updateRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!User.ROLES.includes(role)) throw ApiError.badRequest('Role must be student, teacher or admin');
  if (String(req.user._id) === req.params.id) throw ApiError.badRequest('You cannot change your own role');

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('User not found');
  res.json({ success: true, user });
});
