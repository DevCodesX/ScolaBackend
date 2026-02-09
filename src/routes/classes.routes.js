const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
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

router.get("/", requireAuth, getClasses);
router.post("/", requireAuth, addClass);
router.put("/:id", requireAuth, updateClass);
router.delete("/:id", requireAuth, deleteClass);

// Student assignment
router.get("/:classId/students", requireAuth, getClassStudents);
router.post("/:classId/students", requireAuth, addStudentToClass);
router.delete("/:classId/students/:studentId", requireAuth, removeStudentFromClass);

module.exports = router;
