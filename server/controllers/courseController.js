const Course = require('../models/Course');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const populateCourse = (q) =>
  q.populate('teacher', 'name email').populate('students', 'name email rollNumber');

// Teachers may only touch their own courses; admins may touch all.
const assertCanManage = (course, user) => {
  if (user.role === 'admin') return;
  if (String(course.teacher._id || course.teacher) !== String(user._id)) {
    throw ApiError.forbidden('You can only manage your own courses');
  }
};

// GET /api/courses  - scoped by role
exports.listCourses = asyncHandler(async (req, res) => {
  const { role, _id } = req.user;
  const filter = {};
  if (role === 'teacher') filter.teacher = _id;
  if (role === 'student') filter.students = _id;
  const courses = await populateCourse(Course.find(filter).sort({ code: 1 }));
  res.json({ success: true, count: courses.length, courses });
});

// GET /api/courses/:id
exports.getCourse = asyncHandler(async (req, res) => {
  const course = await populateCourse(Course.findById(req.params.id));
  if (!course) throw ApiError.notFound('Course not found');

  if (req.user.role === 'teacher') assertCanManage(course, req.user);
  if (req.user.role === 'student' && !course.students.some((s) => String(s._id) === String(req.user._id))) {
    throw ApiError.forbidden('You are not enrolled in this course');
  }
  res.json({ success: true, course });
});

// POST /api/courses  (teacher, admin)
exports.createCourse = asyncHandler(async (req, res) => {
  const { code, name, className, requiredPercentage } = req.body;
  let teacherId = req.user._id;

  if (req.user.role === 'admin') {
    if (!req.body.teacher) throw ApiError.badRequest('teacher (user id) is required when an admin creates a course');
    const teacher = await User.findById(req.body.teacher);
    if (!teacher || teacher.role !== 'teacher') throw ApiError.badRequest('teacher must be an existing user with role teacher');
    teacherId = teacher._id;
  }

  const course = await Course.create({ code, name, className, requiredPercentage, teacher: teacherId });
  res.status(201).json({ success: true, course: await populateCourse(Course.findById(course._id)) });
});

// PUT /api/courses/:id
exports.updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');
  assertCanManage(course, req.user);

  ['code', 'name', 'className', 'requiredPercentage'].forEach((f) => {
    if (req.body[f] !== undefined) course[f] = req.body[f];
  });
  await course.save(); // runs validators
  res.json({ success: true, course: await populateCourse(Course.findById(course._id)) });
});

// DELETE /api/courses/:id  (admin)
exports.deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');
  await Attendance.deleteMany({ course: course._id });
  await course.deleteOne();
  res.json({ success: true, message: 'Course and its attendance records deleted' });
});

// POST /api/courses/:id/enroll   body: { studentIds: [...] }
exports.enrollStudents = asyncHandler(async (req, res) => {
  const { studentIds } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw ApiError.badRequest('studentIds must be a non-empty array');
  }
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');
  assertCanManage(course, req.user);

  const students = await User.find({ _id: { $in: studentIds }, role: 'student' }).select('_id');
  if (students.length !== new Set(studentIds.map(String)).size) {
    throw ApiError.badRequest('One or more ids are not valid students');
  }
  await Course.updateOne({ _id: course._id }, { $addToSet: { students: { $each: students.map((s) => s._id) } } });
  res.json({ success: true, course: await populateCourse(Course.findById(course._id)) });
});

// DELETE /api/courses/:id/enroll/:studentId
exports.unenrollStudent = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');
  assertCanManage(course, req.user);

  await Course.updateOne({ _id: course._id }, { $pull: { students: req.params.studentId } });
  res.json({ success: true, course: await populateCourse(Course.findById(course._id)) });
});
