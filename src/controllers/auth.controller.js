const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/db.js');

const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        // 1. Find user
        const [rows] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (!rows.length) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = rows[0];

        // Check if active
        if (!user.is_active) {
            return res.status(403).json({ message: "Account is deactivated" });
        }

        // 2. Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 3. Build JWT payload based on role
        const tokenPayload = {
            userId: user.id,
            role: user.role,
        };

        let responseData = {
            id: user.id,
            email: user.email,
            role: user.role,
        };

        if (user.role === 'institution_admin') {
            // Lookup institution
            const [institutions] = await db.query(
                "SELECT id, name FROM institutions WHERE owner_user_id = ?",
                [user.id]
            );
            if (institutions.length) {
                tokenPayload.institutionId = institutions[0].id;
                responseData.institutionId = institutions[0].id;
                responseData.institutionName = institutions[0].name;
            }
        } else if (user.role === 'teacher') {
            // Lookup teacher profile
            const [teachers] = await db.query(
                "SELECT id, institution_id, first_name, last_name, teacher_type FROM teachers WHERE user_id = ?",
                [user.id]
            );
            if (teachers.length) {
                tokenPayload.teacherId = teachers[0].id;
                tokenPayload.institutionId = teachers[0].institution_id;
                tokenPayload.teacherType = teachers[0].teacher_type;
                responseData.teacherId = teachers[0].id;
                responseData.institutionId = teachers[0].institution_id;
                responseData.teacherType = teachers[0].teacher_type;
                responseData.firstName = teachers[0].first_name;
                responseData.lastName = teachers[0].last_name;
            }
        }

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.json({ token, user: responseData });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Login failed" });
    }
};

module.exports = { login };
