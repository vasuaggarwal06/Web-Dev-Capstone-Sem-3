const router = require('express').Router();
const courses = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', courses.listCourses);
router.post('/', authorize('teacher', 'admin'), courses.createCourse);
router.get('/:id', courses.getCourse);
router.put('/:id', authorize('teacher', 'admin'), courses.updateCourse);
router.delete('/:id', authorize('admin'), courses.deleteCourse);

router.post('/:id/enroll', authorize('teacher', 'admin'), courses.enrollStudents);
router.delete('/:id/enroll/:studentId', authorize('teacher', 'admin'), courses.unenrollStudent);

module.exports = router;
