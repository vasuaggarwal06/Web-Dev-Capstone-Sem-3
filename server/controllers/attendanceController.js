const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Course = require('../models/Course');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parseDay } = require('../utils/dates');

const { STATUSES } = Attendance;
const oid = (v) => new mongoose.Types.ObjectId(String(v));

const loadCourseFor = async (courseId, user) => {
  if (!mongoose.isValidObjectId(courseId)) throw ApiError.badRequest("Invalid value for 'courseId'");
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  if (user.role === 'teacher' && String(course.teacher) !== String(user._id)) {
    throw ApiError.forbidden('You can only manage attendance for your own courses');
  }
  return course;
};

/**
 * Aggregation pipeline: attendance % per student per course.
 * "present" and "late" count as attended; "excused" days are left out of the total.
 */
const percentagePipeline = (match) => [
  { $match: match },
  { $match: { status: { $ne: 'excused' } } },
  {
    $group: {
      _id: { student: '$student', course: '$course' },
      totalClasses: { $sum: 1 },
      attended: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
    },
  },
  {
    $addFields: {
      percentage: { $round: [{ $multiply: [{ $divide: ['$attended', '$totalClasses'] }, 100] }, 2] },
    },
  },
  { $lookup: { from: 'courses', localField: '_id.course', foreignField: '_id', as: 'course' } },
  { $unwind: '$course' },
  { $lookup: { from: 'users', localField: '_id.student', foreignField: '_id', as: 'student' } },
  { $unwind: '$student' },
  {
    $project: {
      _id: 0,
      studentId: '$student._id',
      studentName: '$student.name',
      rollNumber: '$student.rollNumber',
      courseId: '$course._id',
      courseCode: '$course.code',
      courseName: '$course.name',
      requiredPercentage: '$course.requiredPercentage',
      totalClasses: 1,
      attended: 1,
      percentage: 1,
      shortage: { $lt: ['$percentage', '$course.requiredPercentage'] },
    },
  },
  { $sort: { courseCode: 1, studentName: 1 } },
];

// POST /api/attendance/bulk
// body: { courseId, date: "YYYY-MM-DD", records: [{ studentId, status, remarks? }], reason? }
exports.markBulk = asyncHandler(async (req, res) => {
  const { courseId, date, records, reason } = req.body;
  if (!Array.isArray(records) || records.length === 0) throw ApiError.badRequest('records must be a non-empty array');

  const course = await loadCourseFor(courseId, req.user);
  const day = parseDay(date);
  const enrolled = new Set(course.students.map(String));

  const seen = new Set();
  for (const r of records) {
    if (!r.studentId || !mongoose.isValidObjectId(r.studentId)) throw ApiError.badRequest('Each record needs a valid studentId');
    if (!STATUSES.includes(r.status)) throw ApiError.badRequest(`status must be one of: ${STATUSES.join(', ')}`);
    if (!enrolled.has(String(r.studentId))) throw ApiError.badRequest(`Student ${r.studentId} is not enrolled in this course`);
    if (seen.has(String(r.studentId))) throw ApiError.badRequest(`Duplicate record for student ${r.studentId}`);
    seen.add(String(r.studentId));
  }

  const existing = await Attendance.find({ course: course._id, date: day, student: { $in: [...seen] } });
  const existingByStudent = new Map(existing.map((e) => [String(e.student), e]));

  const ops = records.map((r) => {
    const prev = existingByStudent.get(String(r.studentId));
    const filter = { course: course._id, student: oid(r.studentId), date: day };
    const set = { status: r.status, markedBy: req.user._id, remarks: r.remarks || '' };

    if (prev && prev.status !== r.status) {
      return {
        updateOne: {
          filter,
          update: {
            $set: set,
            $push: {
              history: { previousStatus: prev.status, newStatus: r.status, editedBy: req.user._id, editedAt: new Date(), reason: reason || 'Bulk update' },
            },
          },
        },
      };
    }
    return { updateOne: { filter, update: { $set: set }, upsert: true } };
  });

  const result = await Attendance.bulkWrite(ops);
  res.status(200).json({
    success: true,
    message: 'Attendance saved',
    inserted: result.upsertedCount,
    modified: result.modifiedCount,
  });
});

// GET /api/attendance/course/:courseId?date=YYYY-MM-DD
exports.getCourseAttendance = asyncHandler(async (req, res) => {
  const course = await loadCourseFor(req.params.courseId, req.user);
  const filter = { course: course._id };
  if (req.query.date) filter.date = parseDay(req.query.date);
  const records = await Attendance.find(filter)
    .populate('student', 'name rollNumber')
    .sort({ date: -1 });
  res.json({ success: true, count: records.length, records });
});

// PUT /api/attendance/:id    body: { status, reason }   -> edit with audit trail
exports.editAttendance = asyncHandler(async (req, res) => {
  const { status, reason, remarks } = req.body;
  if (!STATUSES.includes(status)) throw ApiError.badRequest(`status must be one of: ${STATUSES.join(', ')}`);
  if (!reason || !String(reason).trim()) throw ApiError.badRequest('A reason is required when editing attendance');

  const record = await Attendance.findById(req.params.id);
  if (!record) throw ApiError.notFound('Attendance record not found');
  await loadCourseFor(record.course, req.user); // ownership check

  if (record.status !== status) {
    record.history.push({ previousStatus: record.status, newStatus: status, editedBy: req.user._id, reason: String(reason).trim() });
    record.status = status;
  }
  if (remarks !== undefined) record.remarks = remarks;
  record.markedBy = req.user._id;
  await record.save();
  res.json({ success: true, record });
});

// GET /api/attendance/:id/history
exports.getHistory = asyncHandler(async (req, res) => {
  const record = await Attendance.findById(req.params.id)
    .populate('student', 'name rollNumber')
    .populate('history.editedBy', 'name role');
  if (!record) throw ApiError.notFound('Attendance record not found');
  await loadCourseFor(record.course, req.user);
  res.json({ success: true, student: record.student, date: record.date, currentStatus: record.status, history: record.history });
});

// GET /api/attendance/me/summary   (student) - own % per subject + shortage alerts
exports.mySummary = asyncHandler(async (req, res) => {
  const summary = await Attendance.aggregate(percentagePipeline({ student: req.user._id }));
  res.json({
    success: true,
    summary,
    alerts: summary.filter((s) => s.shortage),
  });
});

// GET /api/attendance/me/records?courseId=   (student) - own day-by-day records
exports.myRecords = asyncHandler(async (req, res) => {
  const filter = { student: req.user._id };
  if (req.query.courseId) filter.course = req.query.courseId;
  const records = await Attendance.find(filter).populate('course', 'code name').sort({ date: -1 }).select('-history');
  res.json({ success: true, count: records.length, records });
});

// GET /api/attendance/summary?courseId=   (teacher, admin)
exports.courseSummary = asyncHandler(async (req, res) => {
  const match = {};
  if (req.query.courseId) {
    const course = await loadCourseFor(req.query.courseId, req.user);
    match.course = course._id;
  } else if (req.user.role === 'teacher') {
    const mine = await Course.find({ teacher: req.user._id }).select('_id');
    match.course = { $in: mine.map((c) => c._id) };
  }
  const summary = await Attendance.aggregate(percentagePipeline(match));
  res.json({ success: true, count: summary.length, summary });
});

// GET /api/attendance/shortage?courseId=   (teacher, admin) - students below required %
exports.shortageList = asyncHandler(async (req, res) => {
  const match = {};
  if (req.query.courseId) {
    const course = await loadCourseFor(req.query.courseId, req.user);
    match.course = course._id;
  } else if (req.user.role === 'teacher') {
    const mine = await Course.find({ teacher: req.user._id }).select('_id');
    match.course = { $in: mine.map((c) => c._id) };
  }
  const summary = await Attendance.aggregate([...percentagePipeline(match), { $match: { shortage: true } }]);
  res.json({ success: true, count: summary.length, shortage: summary });
});
