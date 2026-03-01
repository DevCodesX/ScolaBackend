const db = require('../config/db.js');

/**
 * Middleware to check if a student has active access via teacher_students.
 * Checks status === 'active' and access_expires_at > NOW().
 * 
 * This should be applied to student-facing routes when the student
 * needs to access teacher-owned content.
 */
const requireStudentAccess = async (req, res, next) => {
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ message: "غير مصرح" });
    }

    try {
        const [rows] = await db.query(
            `SELECT ts.id, ts.status, ts.access_expires_at, ts.teacher_id
             FROM teacher_students ts
             WHERE ts.user_id = ?
               AND ts.status = 'active'
               AND (ts.access_expires_at IS NULL OR ts.access_expires_at > NOW())
             LIMIT 1`,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(403).json({
                message: "ليس لديك صلاحية الوصول. قد يكون اشتراكك منتهيًا أو معلقًا.",
                code: "ACCESS_DENIED",
            });
        }

        // Attach student access info to request
        req.studentAccess = rows[0];
        next();
    } catch (err) {
        console.error("Student access check error:", err);
        res.status(500).json({ message: "فشل في التحقق من الصلاحيات" });
    }
};

module.exports = { requireStudentAccess };
