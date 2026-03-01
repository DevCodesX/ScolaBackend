const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const { requireRole } = require('../middlewares/role.middleware.js');
const { ensureTeacherOwnsClass } = require('../middlewares/ownership.middleware.js');
const {
    addGrade,
    addBulkGrades,
    getClassGrades,
    getGradesSummary,
    updateGrade,
    deleteGrade
} = require('../controllers/grades.controller.js');

const router = Router();

// All routes require teacher role + ownership guard
router.post('/', requireAuth, requireRole('teacher'), ensureTeacherOwnsClass, addGrade);
router.post('/bulk', requireAuth, requireRole('teacher'), ensureTeacherOwnsClass, addBulkGrades);
router.get('/class/:classId', requireAuth, requireRole('teacher'), ensureTeacherOwnsClass, getClassGrades);
router.get('/class/:classId/summary', requireAuth, requireRole('teacher'), ensureTeacherOwnsClass, getGradesSummary);
router.put('/:id', requireAuth, requireRole('teacher'), updateGrade);
router.delete('/:id', requireAuth, requireRole('teacher'), deleteGrade);

module.exports = router;
