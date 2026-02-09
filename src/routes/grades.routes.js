const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const {
    addGrade,
    addBulkGrades,
    getClassGrades,
    getGradesSummary,
    updateGrade,
    deleteGrade
} = require('../controllers/grades.controller.js');

const router = Router();

// All routes require authentication
router.post('/', requireAuth, addGrade);
router.post('/bulk', requireAuth, addBulkGrades);
router.get('/class/:classId', requireAuth, getClassGrades);
router.get('/class/:classId/summary', requireAuth, getGradesSummary);
router.put('/:id', requireAuth, updateGrade);
router.delete('/:id', requireAuth, deleteGrade);

module.exports = router;
