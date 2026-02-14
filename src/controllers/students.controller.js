const db = require('../config/db.js');
const { v4: uuid } = require('uuid');

const getStudents = async (req, res) => {
    const institution_id = req.user.institution_id;

    try {
        const [rows] = await db.query(
            "SELECT * FROM students WHERE institution_id = ? ORDER BY created_at DESC",
            [institution_id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch students" });
    }
};

const addStudent = async (req, res) => {
    const { name, email, phone } = req.body;
    const institution_id = req.user.institution_id;

    const id = uuid();

    try {
        await db.query(
            `INSERT INTO students (id, name, email, phone, institution_id) 
             VALUES (?, ?, ?, ?, ?)`,
            [id, name, email, phone, institution_id]
        );

        res.status(201).json({ id, name, email, phone, institution_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to add student" });
    }
};

const updateStudent = async (req, res) => {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    try {
        const [result] = await db.query(
            `UPDATE students SET name = ?, email = ?, phone = ? WHERE id = ?`,
            [name, email, phone, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Student not found" });
        }

        const [rows] = await db.query("SELECT * FROM students WHERE id = ?", [id]);
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update student" });
    }
};

const deleteStudent = async (req, res) => {
    try {
        await db.query("DELETE FROM students WHERE id = ?", [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete student" });
    }
};

module.exports = {
    getStudents,
    addStudent,
    updateStudent,
    deleteStudent
};
