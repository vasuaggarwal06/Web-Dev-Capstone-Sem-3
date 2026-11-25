const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: { type: String, required: [true, 'Course name is required'], trim: true, maxlength: 120 },
    // "class" = the batch/section this subject is taught to, e.g. "CSE - Sem 5 - A"
    className: { type: String, required: [true, 'Class name is required'], trim: true, maxlength: 80 },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'Teacher is required'] },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    requiredPercentage: {
      type: Number,
      default: 75,
      min: [0, 'Required percentage cannot be below 0'],
      max: [100, 'Required percentage cannot exceed 100'],
    },
  },
  { timestamps: true }
);

courseSchema.index({ teacher: 1 });
courseSchema.index({ students: 1 });

module.exports = mongoose.model('Course', courseSchema);
