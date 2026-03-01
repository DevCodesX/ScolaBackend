const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const { requireRole } = require('../middlewares/role.middleware.js');
const {
    getClasses,
    addClass,
    updateClass,
    deleteClass,
    addStudentToClass,
    removeStudentFromClass,
    getClassStudents
} = require('../controllers/classes.controller.js');

const router = Router();

// Institution admin only — free teachers use /api/teacher/classes
router.get("/", requireAuth, requireRole('institution_admin'), getClasses);
router.post("/", requireAuth, requireRole('institution_admin'), addClass);
router.put("/:id", requireAuth, requireRole('institution_admin'), updateClass);
router.delete("/:id", requireAuth, requireRole('institution_admin'), deleteClass);

// Student assignment (institution admin only)
router.get("/:classId/students", requireAuth, requireRole('institution_admin'), getClassStudents);
router.post("/:classId/students", requireAuth, requireRole('institution_admin'), addStudentToClass);
router.delete("/:classId/students/:studentId", requireAuth, requireRole('institution_admin'), removeStudentFromClass);

module.exports = router;
