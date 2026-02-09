const db = require('../db.js');
const { v4: uuid } = require('uuid');

const getClasses = async (req, res) => {
    const institution_id = req.user.institution_id;

    try {
        const [rows] = await db.query(
            `SELECT c.*, t.name AS teacher_name 
             FROM classes c 
             LEFT JOIN teachers t ON c.teacher_id = t.id 
             WHERE c.institution_id = ? 
             ORDER BY c.created_at DESC`,
            [institution_id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch classes" });
    }
};

const addClass = async (req, res) => {
    const { name, teacher_id } = req.body;
    const institution_id = req.user.institution_id;

    const id = uuid();

    try {
        await db.query(
            `INSERT INTO classes (id, name, teacher_id, institution_id) 
             VALUES (?, ?, ?, ?)`,
            [id, name, teacher_id || null, institution_id]
        );

        res.status(201).json({ id, name, teacher_id, institution_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to add class" });
    }
};

const updateClass = async (req, res) => {
    const { id } = req.params;
    const { name, teacher_id } = req.body;

    try {
        const [result] = await db.query(
            `UPDATE classes SET name = ?, teacher_id = ? WHERE id = ?`,
            [name, teacher_id || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Class not found" });
        }

        const [rows] = await db.query(
            `SELECT c.*, t.name AS teacher_name 
             FROM classes c 
             LEFT JOIN teachers t ON c.teacher_id = t.id 
             WHERE c.id = ?`,
            [id]
        );
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update class" });
    }
};

const deleteClass = async (req, res) => {
    try {
        await db.query("DELETE FROM classes WHERE id = ?", [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete class" });
    }
};

// Assign student to class
const addStudentToClass = async (req, res) => {
    const { classId } = req.params;
    const { studentId } = req.body;

    try {
        await db.query(
            "INSERT INTO student_classes (student_id, class_id) VALUES (?, ?)",
            [studentId, classId]
        );
        res.status(201).json({ message: "Student added to class" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to add student to class" });
    }
};

// Remove student from class
const removeStudentFromClass = async (req, res) => {
    const { classId, studentId } = req.params;

    try {
        await db.query(
            "DELETE FROM student_classes WHERE student_id = ? AND class_id = ?",
            [studentId, classId]
        );
        res.sendStatus(204);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to remove student from class" });
    }
};

// Get students in a class
const getClassStudents = async (req, res) => {
    const { classId } = req.params;

    try {
        const [rows] = await db.query(
            `SELECT s.* FROM students s 
             JOIN student_classes sc ON s.id = sc.student_id 
             WHERE sc.class_id = ?`,
            [classId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch class students" });
    }
};

module.exports = {
    getClasses,
    addClass,
    updateClass,
    deleteClass,
    addStudentToClass,
    removeStudentFromClass,
    getClassStudents
};
