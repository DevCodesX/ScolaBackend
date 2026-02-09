const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../db.js');

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (!rows.length) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                institution_id: user.institution_id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                institution_id: user.institution_id
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Login failed" });
    }
};

// Register a new user (for testing/setup)
const register = async (req, res) => {
    const { email, password, institution_id, role = 'admin' } = req.body;

    try {
        // Check if user already exists
        const [existing] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existing.length) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate UUID
        const { v4: uuid } = require('uuid');
        const id = uuid();

        await db.query(
            `INSERT INTO users (id, email, password, institution_id, role) 
             VALUES (?, ?, ?, ?, ?)`,
            [id, email, hashedPassword, institution_id, role]
        );

        res.status(201).json({
            message: "User created successfully",
            userId: id
        });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ message: "Registration failed" });
    }
};

module.exports = { login, register };
