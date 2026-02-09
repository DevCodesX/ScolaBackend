const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const { requireRole } = require('../middlewares/role.middleware.js');
const {
    addSlot,
    getClassTimetable,
    getTeacherTimetable,
    getAllSlots,
    deleteSlot
} = require('../controllers/timetable.controller.js');

const router = Router();

// Admin only
router.post('/', requireAuth, requireRole('admin'), addSlot);
router.get('/all', requireAuth, requireRole('admin'), getAllSlots);
router.delete('/:id', requireAuth, requireRole('admin'), deleteSlot);

// Shared (any authenticated user)
router.get('/class/:classId', requireAuth, getClassTimetable);

// Teacher only
router.get('/teacher', requireAuth, requireRole('teacher'), getTeacherTimetable);

module.exports = router;
