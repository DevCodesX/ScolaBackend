const pool = require('../config/db.js');

const getAdminDashboard = async (req, res) => {
    try {
        // Get institution_id from the logged-in admin
        let institutionId = req.user.institutionId;

        if (!institutionId) {
            const [rows] = await pool.query(
                "SELECT id FROM institutions WHERE owner_user_id = ?",
                [req.user.userId]
            );
            if (!rows.length) {
                return res.status(404).json({ message: "Institution not found" });
            }
            institutionId = rows[0].id;
        }

        const [[teachers]] = await pool.query(
            "SELECT COUNT(*) AS total FROM teachers WHERE institution_id = ?",
            [institutionId]
        );

        const [[students]] = await pool.query(
            "SELECT COUNT(*) AS total FROM students WHERE institution_id = ?",
            [institutionId]
        );

        const [[classes]] = await pool.query(
            "SELECT COUNT(*) AS total FROM classes WHERE institution_id = ?",
            [institutionId]
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
