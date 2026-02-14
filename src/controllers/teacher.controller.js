const db = require('../config/db.js');

// Dashboard summary for teacher
const getTeacherDashboard = async (req, res) => {
    const teacherId = req.user.userId;

    try {
        // Get teacher's classes count
        const [[classesCount]] = await db.query(
            "SELECT COUNT(*) as total FROM classes WHERE teacher_id = ?",
            [teacherId]
        );

        // Get teacher's students count (students in their classes)
        const [[studentsCount]] = await db.query(
            `SELECT COUNT(DISTINCT sc.student_id) as total 
             FROM student_classes sc 
             JOIN classes c ON c.id = sc.class_id 
             WHERE c.teacher_id = ?`,
            [teacherId]
        );

        res.json({
            classes: classesCount.total,
            students: studentsCount.total,
        });
    } catch (err) {
        console.error("Teacher dashboard error:", err);
        res.status(500).json({ message: "Failed to load dashboard" });
    }
};

// Get classes assigned to teacher
const getTeacherClasses = async (req, res) => {
    const teacherId = req.user.userId;

    try {
        const [rows] = await db.query(
            "SELECT * FROM classes WHERE teacher_id = ? ORDER BY created_at DESC",
            [teacherId]
        );
        res.json(rows);
    } catch (err) {
        console.error("Teacher classes error:", err);
        res.status(500).json({ message: "Failed to load classes" });
    }
};

// Get students in teacher's classes
const getTeacherStudents = async (req, res) => {
    const teacherId = req.user.userId;

    try {
        const [rows] = await db.query(
            `SELECT DISTINCT s.* 
             FROM students s 
             JOIN student_classes sc ON sc.student_id = s.id 
             JOIN classes c ON c.id = sc.class_id 
             WHERE c.teacher_id = ?
             ORDER BY s.name`,
            [teacherId]
        );
        res.json(rows);
    } catch (err) {
        console.error("Teacher students error:", err);
        res.status(500).json({ message: "Failed to load students" });
    }
};

// Get students in a specific class (for teacher)
const getTeacherClassStudents = async (req, res) => {
    const teacherId = req.user.userId;
    const { classId } = req.params;

    try {
        // Verify teacher owns this class
        const [[cls]] = await db.query(
            "SELECT id FROM classes WHERE id = ? AND teacher_id = ?",
            [classId, teacherId]
        );

        if (!cls) {
            return res.status(403).json({ message: "You don't have access to this class" });
        }

        const [rows] = await db.query(
            `SELECT s.* FROM students s 
             JOIN student_classes sc ON s.id = sc.student_id 
             WHERE sc.class_id = ?`,
            [classId]
        );
        res.json(rows);
    } catch (err) {
        console.error("Teacher class students error:", err);
        res.status(500).json({ message: "Failed to load students" });
    }
};

module.exports = {
    getTeacherDashboard,
    getTeacherClasses,
    getTeacherStudents,
    getTeacherClassStudents
};
