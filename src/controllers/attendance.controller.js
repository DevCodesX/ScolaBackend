const db = require('../config/db.js');
const { v4: uuid } = require('uuid');

// Mark/Update attendance (once per day - uses UPSERT)
const markAttendance = async (req, res) => {
    const { student_id, class_id, date, status } = req.body;

    try {
        await db.query(
            `INSERT INTO attendance (id, student_id, class_id, date, status)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE status = VALUES(status)`,
            [uuid(), student_id, class_id, date, status]
        );
        res.sendStatus(200);
    } catch (err) {
        console.error('Mark attendance error:', err);
        res.status(500).json({ message: 'Failed to mark attendance' });
    }
};

// Mark bulk attendance (multiple students at once)
const markBulkAttendance = async (req, res) => {
    const { class_id, date, records } = req.body;
    // records = [{ student_id, status }, ...]

    try {
        for (const record of records) {
            await db.query(
                `INSERT INTO attendance (id, student_id, class_id, date, status)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE status = VALUES(status)`,
                [uuid(), record.student_id, class_id, date, record.status]
            );
        }
        res.json({ success: true, count: records.length });
    } catch (err) {
        console.error('Bulk attendance error:', err);
        res.status(500).json({ message: 'Failed to save attendance' });
    }
};

// Get class attendance for a specific date (defaults to today)
const getClassAttendance = async (req, res) => {
    const { classId } = req.params;
    const { date } = req.query; // optional
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
        const [rows] = await db.query(
            `SELECT 
                s.id AS student_id,
                s.name,
                IFNULL(a.status, 'absent') AS status
             FROM students s
             JOIN student_classes sc ON sc.student_id = s.id
             LEFT JOIN attendance a 
                 ON a.student_id = s.id 
                 AND a.class_id = ?
                 AND a.date = ?
             WHERE sc.class_id = ?
             ORDER BY s.name`,
            [classId, targetDate, classId]
        );
        res.json({ date: targetDate, students: rows });
    } catch (err) {
        console.error('Get attendance error:', err);
        res.status(500).json({ message: 'Failed to fetch attendance' });
    }
};

// Get attendance summary for a class (all dates)
const getAttendanceSummary = async (req, res) => {
    const { classId } = req.params;

    try {
        const [rows] = await db.query(
            `SELECT 
                s.id, s.name,
                COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
                COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
                COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count
             FROM students s
             JOIN student_classes sc ON sc.student_id = s.id
             LEFT JOIN attendance a ON a.student_id = s.id AND a.class_id = ?
             WHERE sc.class_id = ?
             GROUP BY s.id, s.name
             ORDER BY s.name`,
            [classId, classId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Attendance summary error:', err);
        res.status(500).json({ message: 'Failed to fetch summary' });
    }
};

module.exports = {
    markAttendance,
    markBulkAttendance,
    getClassAttendance,
    getAttendanceSummary
};
