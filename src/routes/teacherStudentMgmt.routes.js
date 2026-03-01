const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const { requireRole, requireTeacherType } = require('../middlewares/role.middleware.js');
const {
    getMyStudentsList,
    approveStudent,
    rejectStudent,
    extendStudent,
    suspendStudent,
    reactivateStudent,
    getExpiringStudents,
    updateStudentNotes,
} = require('../controllers/teacherStudentMgmt.controller.js');

const router = Router();

// All routes require authenticated free teacher
const auth = [requireAuth, requireRole("teacher"), requireTeacherType("free")];

router.get("/", ...auth, getMyStudentsList);
router.get("/expiring", ...auth, getExpiringStudents);
router.patch("/:id/approve", ...auth, approveStudent);
router.patch("/:id/reject", ...auth, rejectStudent);
router.patch("/:id/extend", ...auth, extendStudent);
router.patch("/:id/suspend", ...auth, suspendStudent);
router.patch("/:id/reactivate", ...auth, reactivateStudent);
router.patch("/:id/notes", ...auth, updateStudentNotes);

module.exports = router;
