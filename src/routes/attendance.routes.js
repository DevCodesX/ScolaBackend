const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const { requireRole } = require('../middlewares/role.middleware.js');
const { ensureTeacherOwnsClass } = require('../middlewares/ownership.middleware.js');
const {
    markAttendance,
    markBulkAttendance,
    getClassAttendance,
    getAttendanceSummary
} = require('../controllers/attendance.controller.js');

const router = Router();

// Teacher-only attendance routes — with ownership guard
router.post('/', requireAuth, requireRole('teacher'), ensureTeacherOwnsClass, markAttendance);
router.post('/bulk', requireAuth, requireRole('teacher'), ensureTeacherOwnsClass, markBulkAttendance);
router.get('/class/:classId', requireAuth, requireRole('teacher'), ensureTeacherOwnsClass, getClassAttendance);
router.get('/class/:classId/summary', requireAuth, requireRole('teacher'), ensureTeacherOwnsClass, getAttendanceSummary);

module.exports = router;
