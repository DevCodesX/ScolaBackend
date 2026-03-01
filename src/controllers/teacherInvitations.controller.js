const db = require('../config/db.js');
const bcrypt = require('bcrypt');
const { randomUUID: uuid } = require('crypto');
const crypto = require('crypto');
const { sendInvitationEmail } = require('../services/email.service.js');

// ─── Helper: get institution_id for the logged-in admin ─────
const getInstitutionId = async (req) => {
    try {
        if (!req.user || !req.user.userId) return null;
        if (req.user.institutionId) return req.user.institutionId;
        const [rows] = await db.query(
            "SELECT id FROM institutions WHERE owner_user_id = ?",
            [req.user.userId]
        );
        return rows.length ? rows[0].id : null;
    } catch (e) {
        console.error("getInstitutionId error:", e.message);
        return null;
    }
};

// ===============================
// المؤسسة تُنشئ دعوة لمدرس
// ===============================
const inviteTeacher = async (req, res) => {
    const { first_name, last_name, email, phone, subject } = req.body;

    if (!first_name || !email) {
        return res.status(400).json({ message: 'الاسم والبريد الإلكتروني مطلوبان' });
    }

    try {
        const institutionId = await getInstitutionId(req);
        if (!institutionId) {
            return res.status(404).json({ message: 'المؤسسة غير موجودة' });
        }

        // هل المدرس مدعو مسبقاً لنفس المؤسسة؟
        const [existing] = await db.query(
            `SELECT id FROM teacher_invitations
             WHERE email = ? AND institution_id = ? AND status = 'pending'`,
            [email, institutionId]
        );
        if (existing.length > 0) {
            return res.status(409).json({ message: 'تمت دعوة هذا البريد مسبقاً وهي لا تزال معلقة' });
        }

        // هل هو مدرس تابع لهذه المؤسسة أصلاً؟
        const [alreadyTeacher] = await db.query(
            `SELECT t.id FROM teachers t
             JOIN users u ON u.id = t.user_id
             WHERE u.email = ? AND t.institution_id = ?`,
            [email, institutionId]
        );
        if (alreadyTeacher.length > 0) {
            return res.status(409).json({ message: 'هذا المدرس منضم للمؤسسة بالفعل' });
        }

        // جلب اسم المؤسسة للبريد الإلكتروني
        const [instRows] = await db.query(
            `SELECT name FROM institutions WHERE id = ?`,
            [institutionId]
        );
        const institutionName = instRows.length ? instRows[0].name : 'مؤسسة Scola';

        // إنشاء رمز دعوة آمن
        const token = crypto.randomBytes(32).toString('hex');
        const id = uuid();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 أيام

        await db.query(
            `INSERT INTO teacher_invitations
             (id, institution_id, email, first_name, last_name, subject, phone, token, status, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
            [id, institutionId, email, first_name, last_name || null, subject || null, phone || null, token, expiresAt]
        );

        // رابط الدعوة — HashRouter يستخدم #
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const inviteLink = `${frontendUrl}/#/accept-invite?token=${token}`;

        // إرسال البريد الإلكتروني
        let emailSent = false;
        try {
            emailSent = await sendInvitationEmail(email, first_name, inviteLink, institutionName);
        } catch (emailErr) {
            console.error('Email send error (non-fatal):', emailErr.message);
        }

        res.status(201).json({
            message: emailSent
                ? 'تم إرسال الدعوة بنجاح عبر البريد الإلكتروني'
                : 'تم حفظ الدعوة بنجاح — يرجى نسخ الرابط وإرساله يدوياً',
            invitationId: id,
            inviteLink,
            expiresAt,
            emailSent,
        });
    } catch (err) {
        console.error('Invite teacher error:', err);
        res.status(500).json({ message: 'فشل في إرسال الدعوة' });
    }
};

// ===============================
// جلب جميع الدعوات للمؤسسة
// ===============================
const getInstitutionInvitations = async (req, res) => {
    try {
        const institutionId = await getInstitutionId(req);
        if (!institutionId) {
            return res.status(404).json({ message: 'المؤسسة غير موجودة' });
        }

        const [rows] = await db.query(
            `SELECT id, first_name, last_name, email, subject, phone, status, expires_at, created_at
             FROM teacher_invitations
             WHERE institution_id = ?
             ORDER BY created_at DESC`,
            [institutionId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Get invitations error:', err);
        res.status(500).json({ message: 'فشل في جلب الدعوات' });
    }
};

// ===============================
// حذف / إلغاء دعوة
// ===============================
const cancelInvitation = async (req, res) => {
    const { id } = req.params;

    try {
        const institutionId = await getInstitutionId(req);
        if (!institutionId) {
            return res.status(404).json({ message: 'المؤسسة غير موجودة' });
        }

        const [result] = await db.query(
            `DELETE FROM teacher_invitations WHERE id = ? AND institution_id = ?`,
            [id, institutionId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'الدعوة غير موجودة' });
        }
        res.json({ message: 'تم إلغاء الدعوة' });
    } catch (err) {
        console.error('Cancel invitation error:', err);
        res.status(500).json({ message: 'فشل في إلغاء الدعوة' });
    }
};

// ===============================
// المدرس يقبل الدعوة (public endpoint)
// ===============================
const acceptInvitation = async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ message: 'الرمز وكلمة المرور مطلوبان' });
    }
    if (password.length < 8) {
        return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    }

    const conn = await db.getConnection();

    try {
        // جلب الدعوة
        const [[invitation]] = await conn.query(
            `SELECT * FROM teacher_invitations WHERE token = ? AND status = 'pending'`,
            [token]
        );

        if (!invitation) {
            conn.release();
            return res.status(404).json({ message: 'رمز الدعوة غير صالح أو منتهي' });
        }

        // هل انتهت الصلاحية؟
        if (new Date() > new Date(invitation.expires_at)) {
            await conn.query(
                `UPDATE teacher_invitations SET status = 'expired' WHERE id = ?`,
                [invitation.id]
            );
            conn.release();
            return res.status(410).json({ message: 'انتهت صلاحية الدعوة، اطلب من المؤسسة إعادة الإرسال' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await conn.beginTransaction();

        try {
            // هل المستخدم موجود مسبقاً؟
            const [existingUser] = await conn.query(
                `SELECT id FROM users WHERE email = ?`,
                [invitation.email]
            );

            let userId;

            if (existingUser.length > 0) {
                // المستخدم موجود — تحديث كلمة المرور
                userId = existingUser[0].id;
                await conn.query(
                    `UPDATE users SET password_hash = ? WHERE id = ?`,
                    [hashedPassword, userId]
                );
            } else {
                // إنشاء حساب جديد
                userId = uuid();
                await conn.query(
                    `INSERT INTO users (id, email, password_hash, role, is_active)
                     VALUES (?, ?, ?, 'teacher', 1)`,
                    [userId, invitation.email, hashedPassword]
                );
            }

            // إنشاء سجل teacher
            const teacherId = uuid();
            await conn.query(
                `INSERT INTO teachers (id, user_id, institution_id, first_name, last_name, subject, phone, teacher_type)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'institution')`,
                [teacherId, userId, invitation.institution_id,
                    invitation.first_name, invitation.last_name,
                    invitation.subject, invitation.phone]
            );

            // تحديث حالة الدعوة
            await conn.query(
                `UPDATE teacher_invitations SET status = 'accepted' WHERE id = ?`,
                [invitation.id]
            );

            await conn.commit();
        } catch (txErr) {
            await conn.rollback();
            throw txErr;
        }

        res.json({
            message: 'تم قبول الدعوة بنجاح! يمكنك الآن تسجيل الدخول',
            email: invitation.email,
        });
    } catch (err) {
        console.error('Accept invitation error:', err);
        res.status(500).json({ message: 'فشل في قبول الدعوة' });
    } finally {
        conn.release();
    }
};

// ===============================
// التحقق من رمز الدعوة (قبل العرض)
// ===============================
const verifyInvitationToken = async (req, res) => {
    const { token } = req.params;

    try {
        const [[invitation]] = await db.query(
            `SELECT ti.first_name, ti.last_name, ti.email, ti.subject,
                    i.name as institution_name, ti.expires_at, ti.status
             FROM teacher_invitations ti
             JOIN institutions i ON i.id = ti.institution_id
             WHERE ti.token = ?`,
            [token]
        );

        if (!invitation) {
            return res.status(404).json({ message: 'رمز الدعوة غير صالح' });
        }
        if (invitation.status === 'accepted') {
            return res.status(409).json({ message: 'تم قبول هذه الدعوة مسبقاً' });
        }
        if (invitation.status === 'expired' || new Date() > new Date(invitation.expires_at)) {
            return res.status(410).json({ message: 'انتهت صلاحية الدعوة' });
        }

        res.json({
            firstName: invitation.first_name,
            lastName: invitation.last_name,
            email: invitation.email,
            subject: invitation.subject,
            institutionName: invitation.institution_name,
            expiresAt: invitation.expires_at,
        });
    } catch (err) {
        console.error('Verify token error:', err);
        res.status(500).json({ message: 'فشل في التحقق من الدعوة' });
    }
};

module.exports = {
    inviteTeacher,
    getInstitutionInvitations,
    cancelInvitation,
    acceptInvitation,
    verifyInvitationToken,
};
