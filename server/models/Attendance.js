const mongoose = require('mongoose');

const STATUSES = ['present', 'absent', 'late', 'excused'];

// Audit trail entry: one is pushed every time a record's status is changed.
const historySchema = new mongoose.Schema(
  {
    previousStatus: { type: String, enum: STATUSES, required: true },
    newStatus: { type: String, enum: STATUSES, required: true },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    editedAt: { type: Date, default: Date.now },
    reason: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: [true, 'Date is required'] }, // stored as 00:00 UTC of the class day
    status: { type: String, enum: { values: STATUSES, message: 'Status must be one of: ' + STATUSES.join(', ') }, required: true },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    remarks: { type: String, trim: true, maxlength: 200 },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true }
);

// One record per student per course per day, and it makes the daily lookups fast.
attendanceSchema.index({ course: 1, student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ course: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
module.exports.STATUSES = STATUSES;
