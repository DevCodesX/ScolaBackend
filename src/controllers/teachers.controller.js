const db = require('../config/db.js');
const { v4: uuid } = require('uuid');

const getAllTeachers = async (req, res) => {
    // Get institution_id from JWT token
    const institution_id = req.user.institution_id;

    try {
        const [rows] = await db.query(
            'SELECT * FROM teachers WHERE institution_id = ?',
            [institution_id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch teachers" });
    }
};

const getTeachers = async (req, res) => {
    // Use institution_id from JWT token (ignore URL param)
    const institution_id = req.user.institution_id;

    try {
        const [rows] = await db.query(
            "SELECT * FROM teachers WHERE institution_id = ?",
            [institution_id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch teachers" });
    }
};

const addTeacher = async (req, res) => {
    const { name, email, phone, subject } = req.body;
    // Get institution_id from JWT token
    const institution_id = req.user.institution_id;

    const id = uuid();

    try {
        await db.query(
            `INSERT INTO teachers 
            (id, name, email, phone, subject, institution_id) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [id, name, email, phone, subject, institution_id]
        );

        res.status(201).json({
            id,
            name,
            email,
            phone,
            subject,
            institution_id,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to add teacher" });
    }
};

const updateTeacher = async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, subject } = req.body;
    // Get institution_id from JWT token
    const institution_id = req.user.institution_id;

    try {
        const [result] = await db.query(
            `UPDATE teachers 
             SET name = ?, email = ?, phone = ?, subject = ?, institution_id = ? 
             WHERE id = ?`,
            [name, email, phone, subject, institution_id, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        const [rows] = await db.query(
            "SELECT * FROM teachers WHERE id = ?",
            [id]
        );

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update teacher" });
    }
};

const deleteTeacher = async (req, res) => {
    const { id } = req.params;

    try {
        await db.query("DELETE FROM teachers WHERE id = ?", [id]);
        res.sendStatus(204);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete teacher" });
    }
};

module.exports = {
    getAllTeachers,
    getTeachers,
    addTeacher,
    updateTeacher,
    deleteTeacher
};
