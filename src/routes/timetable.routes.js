const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const { requireRole, requireOneOfRoles } = require('../middlewares/role.middleware.js');
const { ensureTeacherOwnsClass } = require('../middlewares/ownership.middleware.js');
const {
    addSlot,
    getClassTimetable,
    getTeacherTimetable,
    getAllSlots,
    deleteSlot
} = require('../controllers/timetable.controller.js');

const router = Router();

// Institution Admin — manage all slots
router.post('/', requireAuth, requireOneOfRoles('institution_admin'), addSlot);
router.get('/all', requireAuth, requireOneOfRoles('institution_admin'), getAllSlots);
router.delete('/:id', requireAuth, requireOneOfRoles('institution_admin'), deleteSlot);

// Teacher — manage own slots
router.post('/my-slot', requireAuth, requireRole('teacher'), ensureTeacherOwnsClass, addSlot);
router.delete('/my-slot/:id', requireAuth, requireRole('teacher'), deleteSlot);

// Shared (any authenticated user)
router.get('/class/:classId', requireAuth, getClassTimetable);

// Teacher only — view their own schedule
router.get('/teacher', requireAuth, requireRole('teacher'), getTeacherTimetable);

module.exports = router;
