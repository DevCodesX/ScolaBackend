const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const {
    getStudents,
    addStudent,
    updateStudent,
    deleteStudent
} = require('../controllers/students.controller.js');

const router = Router();

router.get("/", requireAuth, getStudents);
router.post("/", requireAuth, addStudent);
router.put("/:id", requireAuth, updateStudent);
router.delete("/:id", requireAuth, deleteStudent);

module.exports = router;
