// Usage: npm run seed   (wipes users, courses, attendance and inserts demo data)
const env = require('../config/env');
env.validateEnv();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');

const day = (offset) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - offset);
  return d;
};

(async () => {
  await connectDB();
  await Promise.all([User.deleteMany({}), Course.deleteMany({}), Attendance.deleteMany({})]);

  const admin = await User.create({ name: 'Admin User', email: 'admin@attendtrack.test', password: 'Admin@123', role: 'admin' });
  const teacherData = [
    { name: 'Prof. Devendra Gupta', email: 'devendra@attendtrack.test', password: 'Devendra@123', course: { code: 'CS301', name: 'Web Dev-III' } },
    { name: 'Prof. Megha Sharma', email: 'megha@attendtrack.test', password: 'Megha@123', course: { code: 'CS302', name: 'DBMS' } },
    { name: 'Prof. Anjali Pal', email: 'anjali@attendtrack.test', password: 'Anjali@123', course: { code: 'CS303', name: 'DAA' } },
  ];
  const teachers = [];
  for (const t of teacherData) {
    teachers.push(await User.create({ name: t.name, email: t.email, password: t.password, role: 'teacher' }));
  }

  const studentData = [
    { name: 'Vasu', email: 'Vasu@attendtrack.test', password: 'Vasu@123', rollNumber: '0082' },
    { name: 'Pratham', email: 'Pratham@attendtrack.test', password: 'Pratham@123', rollNumber: '0006' },
    { name: 'Yug Verma', email: 'Yug@attendtrack.test', password: 'Yug@123', rollNumber: '0004' },
  ];
  const students = [];
  for (const s of studentData) {
    students.push(await User.create({ ...s, role: 'student' }));
  }

  const studentIds = students.map((s) => s._id);
  const courses = [];
  for (let i = 0; i < teacherData.length; i += 1) {
    courses.push(await Course.create({
      code: teacherData[i].course.code,
      name: teacherData[i].course.name,
      className: 'CSE - Sem 5 - A',
      teacher: teachers[i]._id,
      students: studentIds,
      requiredPercentage: 75,
    }));
  }

  // 10 class days; student i misses (i-1)*... classes so some fall below 75%
  const absences = [0, 1, 2, 3, 5];
  const records = [];
  courses.forEach((course) => {
    for (let d = 0; d < 10; d += 1) {
      students.forEach((s, idx) => {
        records.push({
          course: course._id, student: s._id, date: day(d),
          status: d < absences[idx] ? 'absent' : 'present', markedBy: course.teacher,
        });
      });
    }
  });
  await Attendance.insertMany(records);

  console.log('Seeded. Login credentials:');
  console.log('  admin    admin@attendtrack.test    Admin@123');
  teacherData.forEach((t) => {
    console.log(`  teacher  ${t.email.toLowerCase()}  ${t.password} (${t.course.name})`);
  });
  studentData.forEach((s) => {
    console.log(`  student  ${s.email.toLowerCase()}  ${s.password}`);
  });
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
