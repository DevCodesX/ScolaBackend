const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { randomUUID: uuid } = require('crypto');
const db = require('../config/db.js');
const { sendVerificationEmail } = require('../services/email.service.js');

// ─── Helper: get institution_id for the logged-in admin ─────
const getAdminInstitutionId = async (userId) => {
    const [rows] = await db.query(
        "SELECT id FROM institutions WHERE owner_user_id = ?",
        [userId]
    );
    return rows.length ? rows[0].id : null;
};

// ─── Teacher Registration (Public — always free teacher) ────
const registerTeacher = async (req, res) => {
    const { first_name, last_name, email, password, qualification, subject } = req.body;

    // Validation
    if (!first_name || !last_name || !email || !password || !subject) {
        return res.status(400).json({
            message: 'All required fields must be provided',
            message_ar: 'يجب ملء جميع الحقول المطلوبة'
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            message: 'Please provide a valid email address',
            message_ar: 'يرجى إدخال بريد إلكتروني صحيح'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            message: 'Password must be at least 6 characters',
            message_ar: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
        });
    }

    const conn = await db.getConnection();

    try {
        // Check if email already exists
        const [existing] = await conn.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existing.length) {
            conn.release();
            return res.status(400).json({
                message: 'Email already registered',
                message_ar: 'البريد الإلكتروني مسجل مسبقاً'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        const userId = uuid();
        const teacherId = uuid();

        // ── Transaction: create user + teacher ──
        await conn.beginTransaction();

        try {
            // 1. Insert user
            await conn.query(
                `INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'teacher')`,
                [userId, email, hashedPassword]
            );

            // 2. Insert teacher (free — no institution_id)
            await conn.query(
                `INSERT INTO teachers (id, user_id, first_name, last_name, qualification, subject, teacher_type)
                 VALUES (?, ?, ?, ?, ?, ?, 'free')`,
                [teacherId, userId, first_name, last_name, qualification || null, subject]
            );

            await conn.commit();
        } catch (txErr) {
            await conn.rollback();
            throw txErr;
        }

        // Email verification (non-critical)
        try {
            const verificationToken = uuid();
            const tokenId = uuid();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

            await db.query(
                `INSERT INTO email_verification_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
                [tokenId, userId, verificationToken, expiresAt]
            );

            const fullName = `${first_name} ${last_name}`;
            sendVerificationEmail(email, verificationToken, fullName);
        } catch (tokenErr) {
            console.warn('⚠️ Email verification failed (non-critical):', tokenErr.message);
        }

        res.status(201).json({
            message: 'Registration successful. Please check your email to verify your account.',
            message_ar: 'تم التسجيل بنجاح. يرجى التحقق من بريدك الإلكتروني لتفعيل حسابك.',
            userId,
            teacherId
        });
    } catch (err) {
        console.error("Teacher registration error:", err.message);

        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                message: 'This email is already registered',
                message_ar: 'هذا البريد الإلكتروني مسجل مسبقاً'
            });
        }

        res.status(500).json({
            message: 'Registration failed. Please try again.',
            message_ar: 'فشل التسجيل. يرجى المحاولة مرة أخرى.'
        });
    } finally {
        conn.release();
    }
};

// ─── Email Verification ─────────────────────────────────────
const verifyEmail = async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({
            message: 'Verification token is required',
            message_ar: 'رمز التحقق مطلوب'
        });
    }

    try {
        const [tokens] = await db.query(
            "SELECT * FROM email_verification_tokens WHERE token = ?",
            [token]
        );

        if (!tokens.length) {
            return res.status(400).json({
                message: 'Invalid or expired verification token',
                message_ar: 'رمز التحقق غير صالح أو منتهي الصلاحية'
            });
        }

        const tokenRecord = tokens[0];

        if (new Date(tokenRecord.expires_at) < new Date()) {
            await db.query("DELETE FROM email_verification_tokens WHERE id = ?", [tokenRecord.id]);
            return res.status(400).json({
                message: 'Verification token has expired. Please register again.',
                message_ar: 'انتهت صلاحية رمز التحقق. يرجى التسجيل مرة أخرى.'
            });
        }

        // Mark user as active
        await db.query(
            "UPDATE users SET is_active = TRUE WHERE id = ?",
            [tokenRecord.user_id]
        );

        // Delete used token
        await db.query("DELETE FROM email_verification_tokens WHERE id = ?", [tokenRecord.id]);

        res.json({
            message: 'Email verified successfully. You can now log in.',
            message_ar: 'تم تفعيل البريد الإلكتروني بنجاح. يمكنك الآن تسجيل الدخول.'
        });
    } catch (err) {
        console.error("Email verification error:", err);
        res.status(500).json({
            message: 'Verification failed',
            message_ar: 'فشل التحقق'
        });
    }
};

// ─── Institution Registration ───────────────────────────────
const registerInstitution = async (req, res) => {
    const { institution_name, admin_name, admin_email, admin_password } = req.body;

    if (!institution_name || !admin_name || !admin_email || !admin_password) {
        return res.status(400).json({
            message: 'All fields are required',
            message_ar: 'جميع الحقول مطلوبة'
        });
    }

    if (admin_password.length < 6) {
        return res.status(400).json({
            message: 'Password must be at least 6 characters',
            message_ar: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
        });
    }

    const conn = await db.getConnection();

    try {
        // Check if email already exists
        const [existing] = await conn.query(
            "SELECT id FROM users WHERE email = ?",
            [admin_email]
        );

        if (existing.length) {
            conn.release();
            return res.status(400).json({
                message: 'Email already registered',
                message_ar: 'البريد الإلكتروني مسجل مسبقاً'
            });
        }

        const hashedPassword = await bcrypt.hash(admin_password, 12);
        const userId = uuid();
        const institutionId = uuid();

        // ── Transaction: create user + institution ──
        await conn.beginTransaction();

        try {
            // 1. Create admin user
            await conn.query(
                `INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'institution_admin')`,
                [userId, admin_email, hashedPassword]
            );

            // 2. Create institution
            await conn.query(
                `INSERT INTO institutions (id, name, owner_user_id) VALUES (?, ?, ?)`,
                [institutionId, institution_name, userId]
            );

            await conn.commit();
        } catch (txErr) {
            await conn.rollback();
            throw txErr;
        }

        // Email verification (non-critical)
        try {
            const verificationToken = uuid();
            const tokenId = uuid();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

            await db.query(
                `INSERT INTO email_verification_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
                [tokenId, userId, verificationToken, expiresAt]
            );

            sendVerificationEmail(admin_email, verificationToken, admin_name);
        } catch (tokenErr) {
            console.warn('⚠️ Email verification failed (non-critical):', tokenErr.message);
        }

        res.status(201).json({
            message: 'Institution registered successfully. Please check your email to verify.',
            message_ar: 'تم تسجيل المؤسسة بنجاح. يرجى التحقق من بريدك الإلكتروني للتفعيل.',
            institutionId,
            userId
        });
    } catch (err) {
        console.error("Institution registration error:", err);
        res.status(500).json({
            message: 'Registration failed',
            message_ar: 'فشل التسجيل'
        });
    } finally {
        conn.release();
    }
};

// ─── Institution Dashboard Stats ─────────────────────────────
const getDashboardStats = async (req, res) => {
    try {
        // Get institution_id from the logged-in admin
        const institutionId = await getAdminInstitutionId(req.user.userId);

        if (!institutionId) {
            return res.status(404).json({ message: 'Institution not found' });
        }

        const [teacherCount] = await db.query(
            "SELECT COUNT(*) as count FROM teachers WHERE institution_id = ?",
            [institutionId]
        );

        const [studentCount] = await db.query(
            "SELECT COUNT(*) as count FROM students WHERE institution_id = ?",
            [institutionId]
        );

        const [classCount] = await db.query(
            "SELECT COUNT(*) as count FROM classes WHERE institution_id = ?",
            [institutionId]
        );

        // Get teachers list (JOIN users for email)
        const [teachers] = await db.query(
            `SELECT t.id, CONCAT(t.first_name, ' ', t.last_name) AS name, 
                    u.email, t.phone, t.subject 
             FROM teachers t
             JOIN users u ON u.id = t.user_id
             WHERE t.institution_id = ? 
             ORDER BY t.first_name`,
            [institutionId]
        );

        const [recentStudents] = await db.query(
            "SELECT id, name, email FROM students WHERE institution_id = ? ORDER BY created_at DESC LIMIT 10",
            [institutionId]
        );

        res.json({
            teacherCount: teacherCount[0].count,
            studentCount: studentCount[0].count,
            classCount: classCount[0].count,
            teachers,
            recentStudents
        });
    } catch (err) {
        console.error("Dashboard stats error:", err);
        res.status(500).json({
            message: 'Failed to fetch dashboard stats',
            message_ar: 'فشل في جلب إحصائيات لوحة التحكم'
        });
    }
};

// ─── Export Reports ──────────────────────────────────────────
const exportReport = async (req, res) => {
    const format = req.query.format || 'excel';

    try {
        const institutionId = await getAdminInstitutionId(req.user.userId);

        if (!institutionId) {
            return res.status(404).json({ message: 'Institution not found' });
        }

        // Fetch teachers (JOIN users for email)
        const [teachers] = await db.query(
            `SELECT CONCAT(t.first_name, ' ', t.last_name) AS name, 
                    u.email, t.phone, t.subject 
             FROM teachers t
             JOIN users u ON u.id = t.user_id
             WHERE t.institution_id = ?`,
            [institutionId]
        );

        const [students] = await db.query(
            `SELECT s.name, s.email, c.name as class_name 
             FROM students s 
             LEFT JOIN classes c ON s.class_id = c.id 
             WHERE s.institution_id = ?`,
            [institutionId]
        );

        if (format === 'excel') {
            const ExcelJS = require('exceljs');
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Scola';
            workbook.created = new Date();

            const teacherSheet = workbook.addWorksheet('المعلمون - Teachers');
            teacherSheet.columns = [
                { header: 'الاسم / Name', key: 'name', width: 25 },
                { header: 'البريد الإلكتروني / Email', key: 'email', width: 30 },
                { header: 'الهاتف / Phone', key: 'phone', width: 20 },
                { header: 'المادة / Subject', key: 'subject', width: 20 },
            ];
            teacherSheet.getRow(1).font = { bold: true, size: 12 };
            teacherSheet.getRow(1).fill = {
                type: 'pattern', pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            teacherSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            teachers.forEach(t => teacherSheet.addRow(t));

            const studentSheet = workbook.addWorksheet('الطلاب - Students');
            studentSheet.columns = [
                { header: 'الاسم / Name', key: 'name', width: 25 },
                { header: 'البريد الإلكتروني / Email', key: 'email', width: 30 },
                { header: 'الصف / Class', key: 'class_name', width: 20 },
            ];
            studentSheet.getRow(1).font = { bold: true, size: 12 };
            studentSheet.getRow(1).fill = {
                type: 'pattern', pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            studentSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            students.forEach(s => studentSheet.addRow(s));

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=scola-report.xlsx');
            await workbook.xlsx.write(res);
            res.end();
        } else if (format === 'pdf') {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ margin: 50, size: 'A4' });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=scola-report.pdf');
            doc.pipe(res);

            doc.fontSize(22).font('Helvetica-Bold').text('Scola Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
            doc.moveDown(2);

            doc.fontSize(16).font('Helvetica-Bold').text('Teachers', { underline: true });
            doc.moveDown();

            if (teachers.length === 0) {
                doc.fontSize(11).font('Helvetica').text('No teachers found.');
            } else {
                teachers.forEach((t, i) => {
                    doc.fontSize(11).font('Helvetica')
                        .text(`${i + 1}. ${t.name} | ${t.email} | ${t.subject || 'N/A'}`);
                });
            }

            doc.moveDown(2);

            doc.fontSize(16).font('Helvetica-Bold').text('Students', { underline: true });
            doc.moveDown();

            if (students.length === 0) {
                doc.fontSize(11).font('Helvetica').text('No students found.');
            } else {
                students.forEach((s, i) => {
                    doc.fontSize(11).font('Helvetica')
                        .text(`${i + 1}. ${s.name} | ${s.email} | Class: ${s.class_name || 'N/A'}`);
                });
            }

            doc.end();
        } else {
            res.status(400).json({ message: 'Invalid format. Use "excel" or "pdf".' });
        }
    } catch (err) {
        console.error("Export error:", err);
        res.status(500).json({
            message: 'Export failed',
            message_ar: 'فشل التصدير'
        });
    }
};

module.exports = {
    registerTeacher,
    verifyEmail,
    registerInstitution,
    getDashboardStats,
    exportReport
};
