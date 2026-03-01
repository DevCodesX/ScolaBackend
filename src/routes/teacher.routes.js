const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const { requireRole, requireTeacherType } = require('../middlewares/role.middleware.js');
const { ensureTeacherOwnsClass } = require('../middlewares/ownership.middleware.js');
const {
    getTeacherDashboard,
    getTeacherClasses,
    getTeacherStudents,
    getTeacherClassStudents,
    // Free teacher CRUD
    getAllTeacherStudents,
    createTeacherStudent,
    updateTeacherStudent,
    deleteTeacherStudent,
    createTeacherClass,
    updateTeacherClass,
    deleteTeacherClass,
    addStudentToTeacherClass,
    removeStudentFromTeacherClass,
} = require('../controllers/teacher.controller.js');

const router = Router();

// ── All teachers (free + institution) ──
router.get("/dashboard", requireAuth, requireRole("teacher"), getTeacherDashboard);
router.get("/classes", requireAuth, requireRole("teacher"), getTeacherClasses);
router.get("/students", requireAuth, requireRole("teacher"), getTeacherStudents);
router.get("/classes/:classId/students", requireAuth, requireRole("teacher"), getTeacherClassStudents);

// ── Free teacher only — Student CRUD ──
router.get("/students/all", requireAuth, requireRole("teacher"), requireTeacherType("free"), getAllTeacherStudents);
router.post("/students", requireAuth, requireRole("teacher"), requireTeacherType("free"), createTeacherStudent);
router.put("/students/:id", requireAuth, requireRole("teacher"), requireTeacherType("free"), updateTeacherStudent);
router.delete("/students/:id", requireAuth, requireRole("teacher"), requireTeacherType("free"), deleteTeacherStudent);

// ── Free teacher only — Class CRUD ──
router.post("/classes", requireAuth, requireRole("teacher"), requireTeacherType("free"), createTeacherClass);
router.put("/classes/:id", requireAuth, requireRole("teacher"), requireTeacherType("free"), updateTeacherClass);
router.delete("/classes/:id", requireAuth, requireRole("teacher"), requireTeacherType("free"), deleteTeacherClass);

// ── Free teacher only — Student ↔ Class assignment ──
router.post("/classes/:classId/students", requireAuth, requireRole("teacher"), requireTeacherType("free"), addStudentToTeacherClass);
router.delete("/classes/:classId/students/:studentId", requireAuth, requireRole("teacher"), requireTeacherType("free"), removeStudentFromTeacherClass);

module.exports = router;
