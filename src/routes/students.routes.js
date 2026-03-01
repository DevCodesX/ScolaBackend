const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const { requireRole } = require('../middlewares/role.middleware.js');
const {
    getStudents,
    addStudent,
    updateStudent,
    deleteStudent
} = require('../controllers/students.controller.js');

const router = Router();

// Institution admin only — free teachers use /api/teacher/students
router.get("/", requireAuth, requireRole('institution_admin'), getStudents);
router.post("/", requireAuth, requireRole('institution_admin'), addStudent);
router.put("/:id", requireAuth, requireRole('institution_admin'), updateStudent);
router.delete("/:id", requireAuth, requireRole('institution_admin'), deleteStudent);

module.exports = router;
