const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const { requireOneOfRoles } = require('../middlewares/role.middleware.js');
const {
    getAllTeachers,
    getTeachers,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    bulkAddTeachers,
} = require('../controllers/teachers.controller.js');

const router = Router();

// Protected routes - require JWT token
router.get("/", requireAuth, getAllTeachers);
router.get("/:institutionId", requireAuth, getTeachers);
router.post("/", requireAuth, addTeacher);
router.post("/bulk", requireAuth, requireOneOfRoles('institution_admin', 'admin'), bulkAddTeachers);
router.put("/:id", requireAuth, updateTeacher);
router.delete("/:id", requireAuth, deleteTeacher);

module.exports = router;
