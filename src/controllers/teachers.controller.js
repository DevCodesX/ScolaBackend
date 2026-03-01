const db = require('../config/db.js');
const bcrypt = require('bcrypt');
const { randomUUID: uuid } = require('crypto');

// ─── Helper: get institution_id for the logged-in admin ─────
const getInstitutionId = async (req) => {
    if (req.user.institutionId) return req.user.institutionId;
    // Fallback: lookup from DB
    const [rows] = await db.query(
        "SELECT id FROM institutions WHERE owner_user_id = ?",
        [req.user.userId]
    );
    return rows.length ? rows[0].id : null;
};

// Get all teachers for the institution
const getAllTeachers = async (req, res) => {
    try {
        const institutionId = await getInstitutionId(req);
        if (!institutionId) {
            return res.status(404).json({ message: "Institution not found" });
        }

        const [rows] = await db.query(
            `SELECT t.id, t.first_name, t.last_name, 
                    CONCAT(t.first_name, ' ', t.last_name) AS name,
                    u.email, t.phone, t.subject, t.qualification, t.created_at
             FROM teachers t
             JOIN users u ON u.id = t.user_id
             WHERE t.institution_id = ?
             ORDER BY t.first_name`,
            [institutionId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch teachers" });
    }
};

// Alias for getAllTeachers
const getTeachers = getAllTeachers;

// Add a teacher to the institution (admin creates teacher account)
const addTeacher = async (req, res) => {
    const { first_name, last_name, email, phone, subject, qualification, password } = req.body;

    if (!first_name || !last_name || !email || !subject) {
        return res.status(400).json({ message: "first_name, last_name, email, and subject are required" });
    }

    const conn = await db.getConnection();

    try {
        const institutionId = await getInstitutionId(req);
        if (!institutionId) {
            conn.release();
            return res.status(404).json({ message: "Institution not found" });
        }

        // Check if email already exists
        const [existing] = await conn.query(
            "SELECT id FROM users WHERE email = ?", [email]
        );
        if (existing.length) {
            conn.release();
            return res.status(400).json({ message: "Email already registered" });
        }

        const userId = uuid();
        const teacherId = uuid();
        const hashedPassword = await bcrypt.hash(password || 'changeme123', 12);

        await conn.beginTransaction();

        try {
            // 1. Create user account
            await conn.query(
                `INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'teacher')`,
                [userId, email, hashedPassword]
            );

            // 2. Create teacher profile (linked to this institution)
            await conn.query(
                `INSERT INTO teachers (id, user_id, institution_id, first_name, last_name, qualification, subject, phone)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [teacherId, userId, institutionId, first_name, last_name, qualification || null, subject, phone || null]
            );

            await conn.commit();
        } catch (txErr) {
            await conn.rollback();
            throw txErr;
        }

        res.status(201).json({
            id: teacherId,
            name: `${first_name} ${last_name}`,
            first_name,
            last_name,
            email,
            phone,
            subject,
            qualification,
            institution_id: institutionId,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to add teacher" });
    } finally {
        conn.release();
    }
};

// Update teacher
const updateTeacher = async (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, phone, subject, qualification } = req.body;

    try {
        const [result] = await db.query(
            `UPDATE teachers 
             SET first_name = COALESCE(?, first_name), 
                 last_name = COALESCE(?, last_name), 
                 phone = COALESCE(?, phone), 
                 subject = COALESCE(?, subject), 
                 qualification = COALESCE(?, qualification)
             WHERE id = ?`,
            [first_name, last_name, phone, subject, qualification, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        const [rows] = await db.query(
            `SELECT t.id, t.first_name, t.last_name, 
                    CONCAT(t.first_name, ' ', t.last_name) AS name,
                    u.email, t.phone, t.subject, t.qualification
             FROM teachers t
             JOIN users u ON u.id = t.user_id
             WHERE t.id = ?`,
            [id]
        );

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update teacher" });
    }
};

// Delete teacher (and their user account)
const deleteTeacher = async (req, res) => {
    const { id } = req.params;

    try {
        // Find user_id first
        const [teacher] = await db.query("SELECT user_id FROM teachers WHERE id = ?", [id]);
        if (!teacher.length) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        // Deleting the user will cascade-delete the teacher record
        await db.query("DELETE FROM users WHERE id = ?", [teacher[0].user_id]);
        res.sendStatus(204);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete teacher" });
    }
};

// Bulk add teachers to the institution
const bulkAddTeachers = async (req, res) => {
    const { teachers: teacherList, sendInvitations } = req.body;

    if (!Array.isArray(teacherList) || teacherList.length === 0) {
        return res.status(400).json({ message: 'يرجى توفير قائمة بالمعلمين' });
    }

    if (teacherList.length > 100) {
        return res.status(400).json({ message: 'الحد الأقصى 100 معلم في المرة الواحدة' });
    }

    try {
        const institutionId = await getInstitutionId(req);
        if (!institutionId) {
            return res.status(404).json({ message: 'المؤسسة غير موجودة' });
        }

        const added = [];
        const failed = [];
        const duplicates = [];

        for (const teacher of teacherList) {
            const { first_name, last_name, email, phone, subject } = teacher;

            // Validate required fields
            if (!first_name || !email) {
                failed.push({
                    email: email || 'غير محدد',
                    reason: 'الاسم الأول والبريد الإلكتروني مطلوبان',
                });
                continue;
            }

            // Check if email already exists
            const [existing] = await db.query(
                'SELECT id FROM users WHERE email = ?', [email]
            );
            if (existing.length > 0) {
                duplicates.push({
                    email,
                    reason: 'البريد الإلكتروني مسجل مسبقاً',
                });
                continue;
            }

            const conn = await db.getConnection();
            try {
                const userId = uuid();
                const teacherId = uuid();
                const hashedPassword = await bcrypt.hash('changeme123', 12);

                await conn.beginTransaction();

                await conn.query(
                    `INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'teacher')`,
                    [userId, email, hashedPassword]
                );

                await conn.query(
                    `INSERT INTO teachers (id, user_id, institution_id, first_name, last_name, subject, phone)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [teacherId, userId, institutionId, first_name, last_name || null, subject || null, phone || null]
                );

                await conn.commit();
                added.push({ email, name: `${first_name} ${last_name || ''}`.trim() });
            } catch (txErr) {
                await conn.rollback();
                failed.push({ email, reason: txErr.message || 'خطأ في الإضافة' });
            } finally {
                conn.release();
            }
        }

        res.status(201).json({
            total: teacherList.length,
            added,
            failed,
            duplicates,
        });
    } catch (err) {
        console.error('Bulk add teachers error:', err);
        res.status(500).json({ message: 'فشل في إضافة المعلمين' });
    }
};

module.exports = {
    getAllTeachers,
    getTeachers,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    bulkAddTeachers,
};
