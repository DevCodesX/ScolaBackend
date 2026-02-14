const pool = require('../config/db.js');

const getAdminDashboard = async (req, res) => {
    try {
        const institution_id = req.user.institution_id;

        const [[teachers]] = await pool.query(
            "SELECT COUNT(*) AS total FROM teachers WHERE institution_id = ?",
            [institution_id]
        );

        const [[students]] = await pool.query(
            "SELECT COUNT(*) AS total FROM students WHERE institution_id = ?",
            [institution_id]
        );

        const [[classes]] = await pool.query(
            "SELECT COUNT(*) AS total FROM classes WHERE institution_id = ?",
            [institution_id]
        );

        res.json({
            teachers: teachers.total,
            students: students.total,
            classes: classes.total,
        });
    } catch (error) {
        console.error("Error fetching admin dashboard:", error);
        res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
};

module.exports = { getAdminDashboard };
