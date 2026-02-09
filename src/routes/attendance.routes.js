const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const { requireRole } = require('../middlewares/role.middleware.js');
const {
    markAttendance,
    markBulkAttendance,
    getClassAttendance,
    getAttendanceSummary
} = require('../controllers/attendance.controller.js');

const router = Router();

// Teacher-only attendance routes
router.post('/', requireAuth, requireRole('teacher'), markAttendance);
router.post('/bulk', requireAuth, requireRole('teacher'), markBulkAttendance);
router.get('/class/:classId', requireAuth, requireRole('teacher'), getClassAttendance);
router.get('/class/:classId/summary', requireAuth, requireRole('teacher'), getAttendanceSummary);

module.exports = router;
