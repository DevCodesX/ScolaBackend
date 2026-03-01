const db = require('../config/db.js');
const { randomUUID: uuid } = require('crypto');

const getInstitutions = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT i.*, u.email AS admin_email 
             FROM institutions i
             JOIN users u ON u.id = i.owner_user_id
             ORDER BY i.created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error("Error fetching institutions:", err);
        res.status(500).json({ error: err.message });
    }
};

const createInstitution = async (req, res) => {
    try {
        const { name, owner_user_id } = req.body;

        if (!name || !owner_user_id) {
            return res.status(400).json({ error: "name and owner_user_id are required" });
        }

        const id = uuid();
        await db.query(
            "INSERT INTO institutions (id, name, owner_user_id) VALUES (?, ?, ?)",
            [id, name, owner_user_id]
        );

        res.status(201).json({ id, name, owner_user_id });
    } catch (err) {
        console.error("Error creating institution:", err);
        res.status(500).json({ error: err.message });
    }
};

const deleteInstitution = async (req, res) => {
    try {
        const { id } = req.params;
        // Deleting institution — the owner user still exists but loses their institution
        await db.query("DELETE FROM institutions WHERE id = ?", [id]);
        res.sendStatus(204);
    } catch (err) {
        console.error("Error deleting institution:", err);
        res.status(500).json({ error: err.message });
    }
};

// ─── Get MY Institution (auth required) ─────────────────────
const getMyInstitution = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [rows] = await db.query(
            `SELECT i.*, u.email AS admin_email 
             FROM institutions i
             JOIN users u ON u.id = i.owner_user_id
             WHERE i.owner_user_id = ?`,
            [userId]
        );
        if (!rows.length) {
            return res.status(404).json({ message: "لم يتم العثور على مؤسسة" });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error("Error fetching my institution:", err);
        res.status(500).json({ error: err.message });
    }
};

// ─── Update MY Institution (auth required) ──────────────────
const updateMyInstitution = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: "اسم المؤسسة مطلوب" });
        }

        const [result] = await db.query(
            "UPDATE institutions SET name = ? WHERE owner_user_id = ?",
            [name, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "لم يتم العثور على مؤسسة" });
        }

        res.json({ message: "تم تحديث بيانات المؤسسة بنجاح" });
    } catch (err) {
        console.error("Error updating institution:", err);
        res.status(500).json({ error: err.message });
    }
};

// ─── Get MY Profile (auth required) ─────────────────────────
const getMyProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [rows] = await db.query(
            "SELECT id, email, role, is_active, created_at FROM users WHERE id = ?",
            [userId]
        );
        if (!rows.length) {
            return res.status(404).json({ message: "المستخدم غير موجود" });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error("Error fetching profile:", err);
        res.status(500).json({ error: err.message });
    }
};

// ─── Update MY Profile (auth required) ──────────────────────
const updateMyProfile = async (req, res) => {
    const bcrypt = require('bcrypt');
    try {
        const userId = req.user.userId;
        const { email, currentPassword, newPassword } = req.body;

        // If changing password, verify current password first
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: "كلمة المرور الحالية مطلوبة" });
            }

            const [users] = await db.query("SELECT password_hash FROM users WHERE id = ?", [userId]);
            if (!users.length) {
                return res.status(404).json({ message: "المستخدم غير موجود" });
            }

            const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
            if (!isMatch) {
                return res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 12);
            await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashedPassword, userId]);
        }

        // If changing email
        if (email) {
            const [existing] = await db.query("SELECT id FROM users WHERE email = ? AND id != ?", [email, userId]);
            if (existing.length) {
                return res.status(400).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
            }
            await db.query("UPDATE users SET email = ? WHERE id = ?", [email, userId]);
        }

        res.json({ message: "تم تحديث الملف الشخصي بنجاح" });
    } catch (err) {
        console.error("Error updating profile:", err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getInstitutions,
    createInstitution,
    deleteInstitution,
    getMyInstitution,
    updateMyInstitution,
    getMyProfile,
    updateMyProfile
};
