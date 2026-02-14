const db = require('../config/db.js');
const { v4: uuid } = require('uuid');

// Admin: add slot
const addSlot = async (req, res) => {
    const { class_id, teacher_id, day, start_time, end_time } = req.body;

    try {
        const id = uuid();
        await db.query(
            `INSERT INTO timetable (id, class_id, teacher_id, day, start_time, end_time)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, class_id, teacher_id, day, start_time, end_time]
        );
        res.status(201).json({ id, class_id, teacher_id, day, start_time, end_time });
    } catch (err) {
        console.error('Add slot error:', err);
        res.status(500).json({ message: 'Failed to add slot' });
    }
};

// View class timetable
const getClassTimetable = async (req, res) => {
    const { classId } = req.params;

    try {
        const [rows] = await db.query(
            `SELECT t.*, c.name AS class_name, te.name AS teacher_name
             FROM timetable t
             JOIN classes c ON c.id = t.class_id
             JOIN teachers te ON te.id = t.teacher_id
             WHERE t.class_id = ?
             ORDER BY FIELD(day,'sat','sun','mon','tue','wed','thu'), start_time`,
            [classId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Get class timetable error:', err);
        res.status(500).json({ message: 'Failed to fetch timetable' });
    }
};

// Teacher timetable (their own schedule)
const getTeacherTimetable = async (req, res) => {
    const teacherId = req.user.userId;

    try {
        const [rows] = await db.query(
            `SELECT t.*, c.name AS class_name
             FROM timetable t
             JOIN classes c ON c.id = t.class_id
             WHERE t.teacher_id = ?
             ORDER BY FIELD(day,'sat','sun','mon','tue','wed','thu'), start_time`,
            [teacherId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Get teacher timetable error:', err);
        res.status(500).json({ message: 'Failed to fetch timetable' });
    }
};

// Get all slots (admin)
const getAllSlots = async (req, res) => {
    const institution_id = req.user.institution_id;

    try {
        const [rows] = await db.query(
            `SELECT t.*, c.name AS class_name, te.name AS teacher_name
             FROM timetable t
             JOIN classes c ON c.id = t.class_id
             JOIN teachers te ON te.id = t.teacher_id
             WHERE c.institution_id = ?
             ORDER BY FIELD(day,'sat','sun','mon','tue','wed','thu'), start_time`,
            [institution_id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Get all slots error:', err);
        res.status(500).json({ message: 'Failed to fetch timetable' });
    }
};

// Admin delete slot
const deleteSlot = async (req, res) => {
    try {
        await db.query('DELETE FROM timetable WHERE id = ?', [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        console.error('Delete slot error:', err);
        res.status(500).json({ message: 'Failed to delete slot' });
    }
};

module.exports = {
    addSlot,
    getClassTimetable,
    getTeacherTimetable,
    getAllSlots,
    deleteSlot
};
