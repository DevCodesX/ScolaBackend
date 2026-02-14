const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const { requireOneOfRoles } = require('../middlewares/role.middleware.js');
const {
    createCourse,
    getCourses,
    getCourseById,
    updateCourse,
    deleteCourse
} = require('../controllers/courses.controller.js');

const router = Router();

// Get all courses (any authenticated user)
router.get("/", requireAuth, getCourses);

// Get single course
router.get("/:id", requireAuth, getCourseById);

// Create course (teacher only)
router.post("/", requireAuth, requireOneOfRoles("teacher"), createCourse);

// Update course (teacher only, must own it)
router.put("/:id", requireAuth, requireOneOfRoles("teacher"), updateCourse);

// Delete course (teacher only, must own it)
router.delete("/:id", requireAuth, requireOneOfRoles("teacher"), deleteCourse);

module.exports = router;
