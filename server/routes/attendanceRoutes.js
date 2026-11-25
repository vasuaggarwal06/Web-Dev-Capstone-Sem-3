const router = require('express').Router();
const att = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Student
router.get('/me/summary', authorize('student'), att.mySummary);
router.get('/me/records', authorize('student'), att.myRecords);

// Teacher / Admin
router.post('/bulk', authorize('teacher', 'admin'), att.markBulk);
router.get('/summary', authorize('teacher', 'admin'), att.courseSummary);
router.get('/shortage', authorize('teacher', 'admin'), att.shortageList);
router.get('/course/:courseId', authorize('teacher', 'admin'), att.getCourseAttendance);
router.get('/:id/history', authorize('teacher', 'admin'), att.getHistory);
router.put('/:id', authorize('teacher', 'admin'), att.editAttendance);

module.exports = router;
