const db = require('../config/db.js');
const { randomUUID: uuid } = require('crypto');

// ─── Helper: get teacher record from user_id ────────────────
const getTeacherByUserId = async (userId) => {
    const [rows] = await db.query(
        "SELECT * FROM teachers WHERE user_id = ?",
        [userId]
    );
    return rows.length ? rows[0] : null;
};

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════

const getTeacherDashboard = async (req, res) => {
    const userId = req.user.userId;

    try {
        const teacher = await getTeacherByUserId(userId);
        if (!teacher) {
            return res.status(404).json({ message: "Teacher profile not found" });
        }

        // Get teacher's classes count (using teacher.id from teachers table)
        const [[classesCount]] = await db.query(
            "SELECT COUNT(*) as total FROM classes WHERE teacher_id = ?",
            [teacher.id]
        );

        // Get teacher's students count
        let studentsTotal = 0;
        if (teacher.teacher_type === 'free') {
            // Free teacher: count owned students
            const [[ownedCount]] = await db.query(
                "SELECT COUNT(*) as total FROM students WHERE owner_teacher_id = ?",
                [teacher.id]
            );
            studentsTotal = ownedCount.total;
        } else {
            // Institution teacher: count students via classes
            const [[classStudents]] = await db.query(
                `SELECT COUNT(DISTINCT sc.student_id) as total 
                 FROM student_classes sc 
                 JOIN classes c ON c.id = sc.class_id 
                 WHERE c.teacher_id = ?`,
                [teacher.id]
            );
            studentsTotal = classStudents.total;
        }

        res.json({
            classes: classesCount.total,
            students: studentsTotal,
            teacher: {
                id: teacher.id,
                firstName: teacher.first_name,
                lastName: teacher.last_name,
                subject: teacher.subject,
                qualification: teacher.qualification,
                teacherType: teacher.teacher_type,
            }
        });
    } catch (err) {
        console.error("Teacher dashboard error:", err);
        res.status(500).json({ message: "Failed to load dashboard" });
    }
};

// ═══════════════════════════════════════════════════════════════
//  CLASSES (Read for all teachers)
// ═══════════════════════════════════════════════════════════════

const getTeacherClasses = async (req, res) => {
    const userId = req.user.userId;

    try {
        const teacher = await getTeacherByUserId(userId);
        if (!teacher) {
            return res.status(404).json({ message: "Teacher profile not found" });
        }

        const [rows] = await db.query(
            "SELECT * FROM classes WHERE teacher_id = ? ORDER BY created_at DESC",
            [teacher.id]
        );
        res.json(rows);
    } catch (err) {
        console.error("Teacher classes error:", err);
        res.status(500).json({ message: "Failed to load classes" });
    }
};

// ═══════════════════════════════════════════════════════════════
//  STUDENTS (Read for all teachers)
// ═══════════════════════════════════════════════════════════════

// Get students in teacher's classes (for institutional teachers)
const getTeacherStudents = async (req, res) => {
    const userId = req.user.userId;

    try {
        const teacher = await getTeacherByUserId(userId);
        if (!teacher) {
            return res.status(404).json({ message: "Teacher profile not found" });
        }

        const [rows] = await db.query(
            `SELECT DISTINCT s.* 
             FROM students s 
             JOIN student_classes sc ON sc.student_id = s.id 
             JOIN classes c ON c.id = sc.class_id 
             WHERE c.teacher_id = ?
             ORDER BY s.name`,
            [teacher.id]
        );
        res.json(rows);
    } catch (err) {
        console.error("Teacher students error:", err);
        res.status(500).json({ message: "Failed to load students" });
    }
};

// Get students in a specific class (for teacher)
const getTeacherClassStudents = async (req, res) => {
    const userId = req.user.userId;
    const { classId } = req.params;

    try {
        const teacher = await getTeacherByUserId(userId);
        if (!teacher) {
            return res.status(404).json({ message: "Teacher profile not found" });
        }

        // Verify teacher owns this class
        const [[cls]] = await db.query(
            "SELECT id FROM classes WHERE id = ? AND teacher_id = ?",
            [classId, teacher.id]
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

// ═══════════════════════════════════════════════════════════════
//  FREE TEACHER — STUDENT CRUD
// ═══════════════════════════════════════════════════════════════

// Get ALL students owned by the free teacher
const getAllTeacherStudents = async (req, res) => {
    const teacherId = req.user.teacherId;

    try {
        const [rows] = await db.query(
            "SELECT * FROM students WHERE owner_teacher_id = ? ORDER BY name",
            [teacherId]
        );
        res.json(rows);
    } catch (err) {
        console.error("Get all teacher students error:", err);
        res.status(500).json({ message: "Failed to fetch students" });
    }
};

// Create a student owned by the free teacher
const createTeacherStudent = async (req, res) => {
    const { name, email, phone } = req.body;
    const teacherId = req.user.teacherId;

    if (!name) {
        return res.status(400).json({ message: "Student name is required" });
    }

    try {
        const id = uuid();
        await db.query(
            `INSERT INTO students (id, name, email, phone, owner_teacher_id) 
             VALUES (?, ?, ?, ?, ?)`,
            [id, name, email || null, phone || null, teacherId]
        );

        res.status(201).json({ id, name, email, phone, owner_teacher_id: teacherId });
    } catch (err) {
        console.error("Create teacher student error:", err);
        res.status(500).json({ message: "Failed to create student" });
    }
};

// Update a student owned by the free teacher
const updateTeacherStudent = async (req, res) => {
    const { id } = req.params;
    const { name, email, phone } = req.body;
    const teacherId = req.user.teacherId;

    try {
        const [result] = await db.query(
            `UPDATE students SET name = ?, email = ?, phone = ? 
             WHERE id = ? AND owner_teacher_id = ?`,
            [name, email || null, phone || null, id, teacherId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Student not found or not owned by you" });
        }

        const [rows] = await db.query("SELECT * FROM students WHERE id = ?", [id]);
        res.json(rows[0]);
    } catch (err) {
        console.error("Update teacher student error:", err);
        res.status(500).json({ message: "Failed to update student" });
    }
};

// Delete a student owned by the free teacher
const deleteTeacherStudent = async (req, res) => {
    const { id } = req.params;
    const teacherId = req.user.teacherId;

    try {
        const [result] = await db.query(
            "DELETE FROM students WHERE id = ? AND owner_teacher_id = ?",
            [id, teacherId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Student not found or not owned by you" });
        }

        res.sendStatus(204);
    } catch (err) {
        console.error("Delete teacher student error:", err);
        res.status(500).json({ message: "Failed to delete student" });
    }
};

// ═══════════════════════════════════════════════════════════════
//  FREE TEACHER — CLASS CRUD
// ═══════════════════════════════════════════════════════════════

// Create a class owned by the free teacher
const createTeacherClass = async (req, res) => {
    const { name } = req.body;
    const teacherId = req.user.teacherId;

    if (!name) {
        return res.status(400).json({ message: "Class name is required" });
    }

    try {
        const id = uuid();
        await db.query(
            `INSERT INTO classes (id, name, teacher_id) VALUES (?, ?, ?)`,
            [id, name, teacherId]
        );

        res.status(201).json({ id, name, teacher_id: teacherId, institution_id: null });
    } catch (err) {
        console.error("Create teacher class error:", err);
        res.status(500).json({ message: "Failed to create class" });
    }
};

// Update a class owned by the free teacher
const updateTeacherClass = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const teacherId = req.user.teacherId;

    try {
        const [result] = await db.query(
            `UPDATE classes SET name = ? WHERE id = ? AND teacher_id = ?`,
            [name, id, teacherId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Class not found or not owned by you" });
        }

        const [rows] = await db.query("SELECT * FROM classes WHERE id = ?", [id]);
        res.json(rows[0]);
    } catch (err) {
        console.error("Update teacher class error:", err);
        res.status(500).json({ message: "Failed to update class" });
    }
};

// Delete a class owned by the free teacher
const deleteTeacherClass = async (req, res) => {
    const { id } = req.params;
    const teacherId = req.user.teacherId;

    try {
        const [result] = await db.query(
            "DELETE FROM classes WHERE id = ? AND teacher_id = ?",
            [id, teacherId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Class not found or not owned by you" });
        }

        res.sendStatus(204);
    } catch (err) {
        console.error("Delete teacher class error:", err);
        res.status(500).json({ message: "Failed to delete class" });
    }
};

// ═══════════════════════════════════════════════════════════════
//  FREE TEACHER — STUDENT ↔ CLASS ASSIGNMENT
// ═══════════════════════════════════════════════════════════════

// Add student to teacher's class
const addStudentToTeacherClass = async (req, res) => {
    const { classId } = req.params;
    const { studentId } = req.body;
    const teacherId = req.user.teacherId;

    try {
        // Verify teacher owns the class
        const [[cls]] = await db.query(
            "SELECT id FROM classes WHERE id = ? AND teacher_id = ?",
            [classId, teacherId]
        );
        if (!cls) {
            return res.status(403).json({ message: "You don't own this class" });
        }

        // Verify teacher owns the student
        const [[student]] = await db.query(
            "SELECT id FROM students WHERE id = ? AND owner_teacher_id = ?",
            [studentId, teacherId]
        );
        if (!student) {
            return res.status(403).json({ message: "You don't own this student" });
        }

        await db.query(
            "INSERT INTO student_classes (student_id, class_id) VALUES (?, ?)",
            [studentId, classId]
        );
        res.status(201).json({ message: "Student added to class" });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "Student already in this class" });
        }
        console.error("Add student to class error:", err);
        res.status(500).json({ message: "Failed to add student to class" });
    }
};

// Remove student from teacher's class
const removeStudentFromTeacherClass = async (req, res) => {
    const { classId, studentId } = req.params;
    const teacherId = req.user.teacherId;

    try {
        // Verify teacher owns the class
        const [[cls]] = await db.query(
            "SELECT id FROM classes WHERE id = ? AND teacher_id = ?",
            [classId, teacherId]
        );
        if (!cls) {
            return res.status(403).json({ message: "You don't own this class" });
        }

        await db.query(
            "DELETE FROM student_classes WHERE student_id = ? AND class_id = ?",
            [studentId, classId]
        );
        res.sendStatus(204);
    } catch (err) {
        console.error("Remove student from class error:", err);
        res.status(500).json({ message: "Failed to remove student from class" });
    }
};

module.exports = {
    getTeacherDashboard,
    getTeacherClasses,
    getTeacherStudents,
    getTeacherClassStudents,
    // Free teacher CRUD
    getAllTeacherStudents,
    createTeacherStudent,
    updateTeacherStudent,
    deleteTeacherStudent,
    createTeacherClass,
    updateTeacherClass,
    deleteTeacherClass,
    addStudentToTeacherClass,
    removeStudentFromTeacherClass,
};
