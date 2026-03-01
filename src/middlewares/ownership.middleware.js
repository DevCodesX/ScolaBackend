const db = require('../config/db.js');

/**
 * Ensures the authenticated teacher owns the class being accessed.
 * Reads class_id from: req.params.classId || req.body.class_id
 * Sets req.verifiedClassId on success for downstream use.
 */
const ensureTeacherOwnsClass = async (req, res, next) => {
    const teacherId = req.user.teacherId;
    const classId = req.params.classId || req.body.class_id;

    if (!teacherId) {
        return res.status(403).json({ message: "Forbidden - No teacher profile" });
    }

    if (!classId) {
        return res.status(400).json({ message: "class_id is required" });
    }

    try {
        const [rows] = await db.query(
            "SELECT id FROM classes WHERE id = ? AND teacher_id = ?",
            [classId, teacherId]
        );

        if (rows.length === 0) {
            return res.status(403).json({ message: "Forbidden - You don't own this class" });
        }

        req.verifiedClassId = classId;
        next();
    } catch (err) {
        console.error("Ownership check error:", err);
        res.status(500).json({ message: "Ownership verification failed" });
    }
};

/**
 * Ensures the authenticated teacher owns the student being accessed.
 * Reads student_id from: req.params.id || req.params.studentId
 */
const ensureTeacherOwnsStudent = async (req, res, next) => {
    const teacherId = req.user.teacherId;
    const studentId = req.params.id || req.params.studentId;

    if (!teacherId) {
        return res.status(403).json({ message: "Forbidden - No teacher profile" });
    }

    if (!studentId) {
        return res.status(400).json({ message: "student_id is required" });
    }

    try {
        const [rows] = await db.query(
            "SELECT id FROM students WHERE id = ? AND owner_teacher_id = ?",
            [studentId, teacherId]
        );

        if (rows.length === 0) {
            return res.status(403).json({ message: "Forbidden - You don't own this student" });
        }

        next();
    } catch (err) {
        console.error("Student ownership check error:", err);
        res.status(500).json({ message: "Ownership verification failed" });
    }
};

module.exports = { ensureTeacherOwnsClass, ensureTeacherOwnsStudent };
