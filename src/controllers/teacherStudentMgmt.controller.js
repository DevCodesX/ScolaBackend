const db = require('../config/db.js');

// ═══════════════════════════════════════════════════════════════
//  GET ALL MY STUDENTS (Teacher)
// ═══════════════════════════════════════════════════════════════

const getMyStudentsList = async (req, res) => {
    const teacherId = req.user.teacherId;

    try {
        const [rows] = await db.query(
            `SELECT ts.*, 
                    CASE 
                        WHEN ts.status = 'active' AND ts.access_expires_at IS NOT NULL AND ts.access_expires_at < NOW() 
                        THEN 'expired'
                        ELSE ts.status 
                    END as computed_status,
                    CASE 
                        WHEN ts.access_expires_at IS NOT NULL 
                        THEN DATEDIFF(ts.access_expires_at, NOW()) 
                        ELSE NULL 
                    END as days_remaining
             FROM teacher_students ts
             WHERE ts.teacher_id = ?
             ORDER BY 
                FIELD(ts.status, 'pending', 'active', 'expired', 'suspended'),
                ts.created_at DESC`,
            [teacherId]
        );

        // Auto-expire students whose access has expired
        const expiredIds = rows
            .filter(r => r.status === 'active' && r.access_expires_at && new Date(r.access_expires_at) < new Date())
            .map(r => r.id);

        if (expiredIds.length > 0) {
            await db.query(
                `UPDATE teacher_students SET status = 'expired' WHERE id IN (?)`,
                [expiredIds]
            );
        }

        // Return with computed status
        const result = rows.map(r => ({
            ...r,
            status: r.computed_status,
            days_remaining: r.days_remaining,
        }));

        res.json(result);
    } catch (err) {
        console.error("Get students list error:", err);
        res.status(500).json({ message: "فشل في جلب قائمة الطلاب" });
    }
};

// ═══════════════════════════════════════════════════════════════
//  APPROVE STUDENT (Teacher)
// ═══════════════════════════════════════════════════════════════

const approveStudent = async (req, res) => {
    const teacherId = req.user.teacherId;
    const { id } = req.params;
    const { expiresInDays = 30 } = req.body;

    try {
        const accessExpiresAt = new Date();
        accessExpiresAt.setDate(accessExpiresAt.getDate() + expiresInDays);

        const [result] = await db.query(
            `UPDATE teacher_students 
             SET status = 'active', access_expires_at = ?
             WHERE id = ? AND teacher_id = ? AND status = 'pending'`,
            [accessExpiresAt, id, teacherId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "الطالب غير موجود أو ليس في حالة انتظار" });
        }

        const [[student]] = await db.query(
            `SELECT * FROM teacher_students WHERE id = ?`, [id]
        );

        res.json({
            message: "تم قبول الطالب بنجاح",
            student,
        });
    } catch (err) {
        console.error("Approve student error:", err);
        res.status(500).json({ message: "فشل في قبول الطالب" });
    }
};

// ═══════════════════════════════════════════════════════════════
//  REJECT STUDENT (Teacher)
// ═══════════════════════════════════════════════════════════════

const rejectStudent = async (req, res) => {
    const teacherId = req.user.teacherId;
    const { id } = req.params;

    try {
        const [result] = await db.query(
            `DELETE FROM teacher_students 
             WHERE id = ? AND teacher_id = ? AND status = 'pending'`,
            [id, teacherId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "الطالب غير موجود أو ليس في حالة انتظار" });
        }

        res.json({ message: "تم رفض الطالب" });
    } catch (err) {
        console.error("Reject student error:", err);
        res.status(500).json({ message: "فشل في رفض الطالب" });
    }
};

// ═══════════════════════════════════════════════════════════════
//  EXTEND SUBSCRIPTION (Teacher)
// ═══════════════════════════════════════════════════════════════

const extendStudent = async (req, res) => {
    const teacherId = req.user.teacherId;
    const { id } = req.params;
    const { expiresInDays = 30 } = req.body;

    try {
        // Get current student
        const [[student]] = await db.query(
            `SELECT * FROM teacher_students WHERE id = ? AND teacher_id = ?`,
            [id, teacherId]
        );

        if (!student) {
            return res.status(404).json({ message: "الطالب غير موجود" });
        }

        // Calculate new expiry from today or from current expiry (whichever is later)
        const now = new Date();
        const currentExpiry = student.access_expires_at ? new Date(student.access_expires_at) : now;
        const baseDate = currentExpiry > now ? currentExpiry : now;
        const newExpiry = new Date(baseDate);
        newExpiry.setDate(newExpiry.getDate() + expiresInDays);

        await db.query(
            `UPDATE teacher_students 
             SET access_expires_at = ?, status = 'active'
             WHERE id = ? AND teacher_id = ?`,
            [newExpiry, id, teacherId]
        );

        res.json({
            message: `تم تمديد الاشتراك ${expiresInDays} يوم`,
            newExpiresAt: newExpiry,
        });
    } catch (err) {
        console.error("Extend student error:", err);
        res.status(500).json({ message: "فشل في تمديد الاشتراك" });
    }
};

// ═══════════════════════════════════════════════════════════════
//  SUSPEND STUDENT (Teacher)
// ═══════════════════════════════════════════════════════════════

const suspendStudent = async (req, res) => {
    const teacherId = req.user.teacherId;
    const { id } = req.params;

    try {
        const [result] = await db.query(
            `UPDATE teacher_students 
             SET status = 'suspended'
             WHERE id = ? AND teacher_id = ? AND status IN ('active', 'expired')`,
            [id, teacherId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "الطالب غير موجود أو لا يمكن إيقافه" });
        }

        res.json({ message: "تم إيقاف الطالب" });
    } catch (err) {
        console.error("Suspend student error:", err);
        res.status(500).json({ message: "فشل في إيقاف الطالب" });
    }
};

// ═══════════════════════════════════════════════════════════════
//  REACTIVATE STUDENT (Teacher)
// ═══════════════════════════════════════════════════════════════

const reactivateStudent = async (req, res) => {
    const teacherId = req.user.teacherId;
    const { id } = req.params;
    const { expiresInDays = 30 } = req.body;

    try {
        const accessExpiresAt = new Date();
        accessExpiresAt.setDate(accessExpiresAt.getDate() + expiresInDays);

        const [result] = await db.query(
            `UPDATE teacher_students 
             SET status = 'active', access_expires_at = ?
             WHERE id = ? AND teacher_id = ? AND status IN ('suspended', 'expired')`,
            [accessExpiresAt, id, teacherId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "الطالب غير موجود" });
        }

        res.json({
            message: "تم إعادة تفعيل الطالب",
            newExpiresAt: accessExpiresAt,
        });
    } catch (err) {
        console.error("Reactivate student error:", err);
        res.status(500).json({ message: "فشل في إعادة التفعيل" });
    }
};

// ═══════════════════════════════════════════════════════════════
//  GET EXPIRING STUDENTS (Teacher)
// ═══════════════════════════════════════════════════════════════

const getExpiringStudents = async (req, res) => {
    const teacherId = req.user.teacherId;
    const { days = 3 } = req.query;

    try {
        const [rows] = await db.query(
            `SELECT *, DATEDIFF(access_expires_at, NOW()) as days_remaining
             FROM teacher_students
             WHERE teacher_id = ?
               AND status = 'active'
               AND access_expires_at IS NOT NULL
               AND access_expires_at <= DATE_ADD(NOW(), INTERVAL ? DAY)
               AND access_expires_at > NOW()
             ORDER BY access_expires_at ASC`,
            [teacherId, parseInt(days)]
        );

        res.json(rows);
    } catch (err) {
        console.error("Get expiring students error:", err);
        res.status(500).json({ message: "فشل في جلب الطلاب المنتهية اشتراكاتهم" });
    }
};

// ═══════════════════════════════════════════════════════════════
//  UPDATE STUDENT NOTES (Teacher)
// ═══════════════════════════════════════════════════════════════

const updateStudentNotes = async (req, res) => {
    const teacherId = req.user.teacherId;
    const { id } = req.params;
    const { notes } = req.body;

    try {
        const [result] = await db.query(
            `UPDATE teacher_students SET notes = ? WHERE id = ? AND teacher_id = ?`,
            [notes || null, id, teacherId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "الطالب غير موجود" });
        }

        res.json({ message: "تم تحديث الملاحظات" });
    } catch (err) {
        console.error("Update notes error:", err);
        res.status(500).json({ message: "فشل في تحديث الملاحظات" });
    }
};

module.exports = {
    getMyStudentsList,
    approveStudent,
    rejectStudent,
    extendStudent,
    suspendStudent,
    reactivateStudent,
    getExpiringStudents,
    updateStudentNotes,
};
