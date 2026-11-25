const router = require('express').Router();
const users = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/students', authorize('teacher', 'admin'), users.listStudents);

// Admin-only (RBAC)
router.get('/', authorize('admin'), users.listUsers);
router.post('/', authorize('admin'), users.createUser);
router.patch('/:id/role', authorize('admin'), users.updateRole);

module.exports = router;
