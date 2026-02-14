const db = require('../config/db.js');
const { v4: uuid } = require('uuid');

// Create a new course (teacher only)
const createCourse = async (req, res) => {
    const { title, description, price, max_students, type } = req.body;

    try {
        const id = uuid();
        await db.query(
            `INSERT INTO courses (id, title, description, teacher_id, price, max_students, type) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, title, description, req.user.userId, price, max_students, type]
        );

        res.status(201).json({ message: "Course created", courseId: id });
    } catch (err) {
        console.error("Create course error:", err);
        res.status(500).json({ message: "Failed to create course" });
    }
};

// Get all courses (filtered by institution)
const getCourses = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT c.*, u.name AS teacher_name 
             FROM courses c 
             LEFT JOIN users u ON c.teacher_id = u.id 
             ORDER BY c.created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error("Get courses error:", err);
        res.status(500).json({ message: "Failed to fetch courses" });
    }
};

// Get a single course by ID
const getCourseById = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT c.*, u.name AS teacher_name 
             FROM courses c 
             LEFT JOIN users u ON c.teacher_id = u.id 
             WHERE c.id = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Course not found" });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error("Get course error:", err);
        res.status(500).json({ message: "Failed to fetch course" });
    }
};

// Update a course (teacher must own it)
const updateCourse = async (req, res) => {
    const { title, description, price, max_students, type } = req.body;

    try {
        const [result] = await db.query(
            `UPDATE courses SET title = ?, description = ?, price = ?, max_students = ?, type = ? 
             WHERE id = ? AND teacher_id = ?`,
            [title, description, price, max_students, type, req.params.id, req.user.userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Course not found or you don't own it" });
        }

        const [rows] = await db.query("SELECT * FROM courses WHERE id = ?", [req.params.id]);
        res.json(rows[0]);
    } catch (err) {
        console.error("Update course error:", err);
        res.status(500).json({ message: "Failed to update course" });
    }
};

// Delete a course (teacher must own it)
const deleteCourse = async (req, res) => {
    try {
        const [result] = await db.query(
            "DELETE FROM courses WHERE id = ? AND teacher_id = ?",
            [req.params.id, req.user.userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Course not found or you don't own it" });
        }

        res.sendStatus(204);
    } catch (err) {
        console.error("Delete course error:", err);
        res.status(500).json({ message: "Failed to delete course" });
    }
};

module.exports = {
    createCourse,
    getCourses,
    getCourseById,
    updateCourse,
    deleteCourse
};
