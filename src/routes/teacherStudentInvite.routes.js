const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const { requireRole, requireTeacherType } = require('../middlewares/role.middleware.js');
const {
    generateInvite,
    getInviteInfo,
    joinViaToken,
    joinViaCode,
    addStudentManually,
    getMyInvites,
    deactivateInvite,
} = require('../controllers/teacherStudentInvite.controller.js');

const router = Router();

// ── Public routes (no auth needed) ──
router.get("/invite/:token", getInviteInfo);
router.post("/invite/:token/join", joinViaToken);
router.post("/join-code", joinViaCode);

// ── Teacher-only routes ──
router.post("/invite/generate", requireAuth, requireRole("teacher"), requireTeacherType("free"), generateInvite);
router.get("/my-invites", requireAuth, requireRole("teacher"), requireTeacherType("free"), getMyInvites);
router.patch("/invite/:id/deactivate", requireAuth, requireRole("teacher"), requireTeacherType("free"), deactivateInvite);
router.post("/students/add-manual", requireAuth, requireRole("teacher"), requireTeacherType("free"), addStudentManually);

module.exports = router;
