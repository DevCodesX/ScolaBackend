const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const { requireRole } = require('../middlewares/role.middleware.js');
const {
    getTeacherDashboard,
    getTeacherClasses,
    getTeacherStudents,
    getTeacherClassStudents
} = require('../controllers/teacher.controller.js');

const router = Router();

// All routes require authentication and teacher role
router.get("/dashboard", requireAuth, requireRole("teacher"), getTeacherDashboard);
router.get("/classes", requireAuth, requireRole("teacher"), getTeacherClasses);
router.get("/students", requireAuth, requireRole("teacher"), getTeacherStudents);
router.get("/classes/:classId/students", requireAuth, requireRole("teacher"), getTeacherClassStudents);

module.exports = router;
