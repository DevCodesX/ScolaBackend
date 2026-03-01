const db = require('../config/db.js');
const crypto = require('crypto');
const { randomUUID: uuid } = require('crypto');

// ═══════════════════════════════════════════════════════════════
//  INVITE LINK GENERATION
// ═══════════════════════════════════════════════════════════════

const generateInvite = async (req, res) => {
    const teacherId = req.user.teacherId;
    const { maxUses = 1, expiresInDays = 7 } = req.body;

    try {
        const id = uuid();
        const token = crypto.randomBytes(8).toString('hex'); // 16-char token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        await db.query(
            `INSERT INTO invite_tokens (id, teacher_id, token, expires_at, max_uses)
             VALUES (?, ?, ?, ?, ?)`,
            [id, teacherId, token, expiresAt, maxUses]
        );

        // Get teacher info for the response
        const [[teacher]] = await db.query(
            `SELECT t.first_name, t.last_name, t.join_code FROM teachers t WHERE t.id = ?`,
            [teacherId]
        );

        res.status(201).json({
            token,
            inviteUrl: `/join/${token}`,
            expiresAt,
            maxUses,
            joinCode: teacher?.join_code || null,
            teacherName: `${teacher?.first_name || ''} ${teacher?.last_name || ''}`.trim(),
        });
    } catch (err) {
        console.error("Generate invite error:", err);
        res.status(500).json({ message: "فشل في إنشاء رابط الدعوة" });
    }
};

// ═══════════════════════════════════════════════════════════════
//  GET INVITE INFO (Public — for the join page)
// ═══════════════════════════════════════════════════════════════

const getInviteInfo = async (req, res) => {
    const { token } = req.params;

    try {
        const [[invite]] = await db.query(
            `SELECT it.*, t.first_name, t.last_name, t.subject, t.qualification
             FROM invite_tokens it
             JOIN teachers t ON t.id = it.teacher_id
             WHERE it.token = ?`,
            [token]
        );

        if (!invite) {
            return res.status(404).json({ message: "رابط الدعوة غير موجود" });
        }

        if (!invite.is_active) {
            return res.status(410).json({ message: "رابط الدعوة غير مفعّل" });
        }

        if (new Date(invite.expires_at) < new Date()) {
            return res.status(410).json({ message: "رابط الدعوة منتهي الصلاحية" });
        }

        if (invite.used_count >= invite.max_uses) {
            return res.status(410).json({ message: "رابط الدعوة استُنفد بالكامل" });
        }

        res.json({
            teacherName: `${invite.first_name || ''} ${invite.last_name || ''}`.trim(),
            subject: invite.subject,
            qualification: invite.qualification,
            teacherId: invite.teacher_id,
        });
    } catch (err) {
        console.error("Get invite info error:", err);
        res.status(500).json({ message: "فشل في جلب بيانات الدعوة" });
    }
};

// ═══════════════════════════════════════════════════════════════
//  JOIN VIA INVITE TOKEN (Public)
// ═══════════════════════════════════════════════════════════════

const joinViaToken = async (req, res) => {
    const { token } = req.params;
    const { studentName, studentEmail, studentPhone } = req.body;

    if (!studentName) {
        return res.status(400).json({ message: "اسم الطالب مطلوب" });
    }

    try {
        // Validate invite token
        const [[invite]] = await db.query(
            `SELECT * FROM invite_tokens WHERE token = ?`, [token]
        );

        if (!invite || !invite.is_active) {
            return res.status(410).json({ message: "رابط الدعوة غير صالح" });
        }
        if (new Date(invite.expires_at) < new Date()) {
            return res.status(410).json({ message: "رابط الدعوة منتهي الصلاحية" });
        }
        if (invite.used_count >= invite.max_uses) {
            return res.status(410).json({ message: "رابط الدعوة استُنفد بالكامل" });
        }

        // Check if student already exists for this teacher (by email or phone)
        if (studentEmail) {
            const [[existing]] = await db.query(
                `SELECT id FROM teacher_students WHERE teacher_id = ? AND student_email = ?`,
                [invite.teacher_id, studentEmail]
            );
            if (existing) {
                return res.status(409).json({ message: "هذا الطالب مسجل مسبقاً لدى هذا المعلم" });
            }
        }

        // Create teacher_student record
        const id = uuid();
        await db.query(
            `INSERT INTO teacher_students (id, teacher_id, student_name, student_email, student_phone, status)
             VALUES (?, ?, ?, ?, ?, 'pending')`,
            [id, invite.teacher_id, studentName, studentEmail || null, studentPhone || null]
        );

        // Increment used_count
        await db.query(
            `UPDATE invite_tokens SET used_count = used_count + 1 WHERE id = ?`,
            [invite.id]
        );

        res.status(201).json({
            message: "تم تقديم طلب الانضمام بنجاح. سيقوم المعلم بقبولك قريباً.",
            studentId: id,
            status: 'pending',
        });
    } catch (err) {
        console.error("Join via token error:", err);
        res.status(500).json({ message: "فشل في الانضمام" });
    }
};

// ═══════════════════════════════════════════════════════════════
//  JOIN VIA JOIN CODE (Public)
// ═══════════════════════════════════════════════════════════════

const joinViaCode = async (req, res) => {
    const { joinCode, studentName, studentEmail, studentPhone } = req.body;

    if (!joinCode || !studentName) {
        return res.status(400).json({ message: "كود الانضمام واسم الطالب مطلوبان" });
    }

    try {
        // Find teacher by join code
        const [[teacher]] = await db.query(
            `SELECT id, first_name, last_name FROM teachers WHERE join_code = ? AND teacher_type = 'free'`,
            [joinCode.trim().toUpperCase()]
        );

        if (!teacher) {
            return res.status(404).json({ message: "كود الانضمام غير صحيح" });
        }

        // Check if already exists
        if (studentEmail) {
            const [[existing]] = await db.query(
                `SELECT id FROM teacher_students WHERE teacher_id = ? AND student_email = ?`,
                [teacher.id, studentEmail]
            );
            if (existing) {
                return res.status(409).json({ message: "هذا الطالب مسجل مسبقاً لدى هذا المعلم" });
            }
        }

        const id = uuid();
        await db.query(
            `INSERT INTO teacher_students (id, teacher_id, student_name, student_email, student_phone, status)
             VALUES (?, ?, ?, ?, ?, 'pending')`,
            [id, teacher.id, studentName, studentEmail || null, studentPhone || null]
        );

        res.status(201).json({
            message: "تم تقديم طلب الانضمام بنجاح.",
            teacherName: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim(),
            studentId: id,
            status: 'pending',
        });
    } catch (err) {
        console.error("Join via code error:", err);
        res.status(500).json({ message: "فشل في الانضمام" });
    }
};

// ═══════════════════════════════════════════════════════════════
//  ADD STUDENT MANUALLY (Teacher)
// ═══════════════════════════════════════════════════════════════

const addStudentManually = async (req, res) => {
    const teacherId = req.user.teacherId;
    const { studentName, studentEmail, studentPhone, autoApprove, expiresInDays } = req.body;

    if (!studentName) {
        return res.status(400).json({ message: "اسم الطالب مطلوب" });
    }

    try {
        // Check duplicate
        if (studentEmail) {
            const [[existing]] = await db.query(
                `SELECT id FROM teacher_students WHERE teacher_id = ? AND student_email = ?`,
                [teacherId, studentEmail]
            );
            if (existing) {
                return res.status(409).json({ message: "هذا الطالب مسجل مسبقاً" });
            }
        }

        const id = uuid();
        const status = autoApprove ? 'active' : 'pending';
        let accessExpiresAt = null;

        if (autoApprove && expiresInDays) {
            accessExpiresAt = new Date();
            accessExpiresAt.setDate(accessExpiresAt.getDate() + expiresInDays);
        }

        await db.query(
            `INSERT INTO teacher_students (id, teacher_id, student_name, student_email, student_phone, status, access_expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, teacherId, studentName, studentEmail || null, studentPhone || null, status, accessExpiresAt]
        );

        res.status(201).json({
            id,
            student_name: studentName,
            student_email: studentEmail,
            student_phone: studentPhone,
            status,
            access_expires_at: accessExpiresAt,
        });
    } catch (err) {
        console.error("Add student manually error:", err);
        res.status(500).json({ message: "فشل في إضافة الطالب" });
    }
};

// ═══════════════════════════════════════════════════════════════
//  GET MY INVITES (Teacher)
// ═══════════════════════════════════════════════════════════════

const getMyInvites = async (req, res) => {
    const teacherId = req.user.teacherId;

    try {
        const [rows] = await db.query(
            `SELECT * FROM invite_tokens WHERE teacher_id = ? ORDER BY created_at DESC`,
            [teacherId]
        );

        // Also get join code
        const [[teacher]] = await db.query(
            `SELECT join_code FROM teachers WHERE id = ?`, [teacherId]
        );

        res.json({
            invites: rows,
            joinCode: teacher?.join_code || null,
        });
    } catch (err) {
        console.error("Get invites error:", err);
        res.status(500).json({ message: "فشل في جلب الروابط" });
    }
};

// ═══════════════════════════════════════════════════════════════
//  DEACTIVATE INVITE (Teacher)
// ═══════════════════════════════════════════════════════════════

const deactivateInvite = async (req, res) => {
    const teacherId = req.user.teacherId;
    const { id } = req.params;

    try {
        const [result] = await db.query(
            `UPDATE invite_tokens SET is_active = false WHERE id = ? AND teacher_id = ?`,
            [id, teacherId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "الرابط غير موجود" });
        }

        res.json({ message: "تم تعطيل الرابط" });
    } catch (err) {
        console.error("Deactivate invite error:", err);
        res.status(500).json({ message: "فشل في تعطيل الرابط" });
    }
};

module.exports = {
    generateInvite,
    getInviteInfo,
    joinViaToken,
    joinViaCode,
    addStudentManually,
    getMyInvites,
    deactivateInvite,
};
