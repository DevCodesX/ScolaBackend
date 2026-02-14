const db = require('../config/db.js');
const { v4: uuid } = require('uuid');

// Subscribe to a course
const subscribe = async (req, res) => {
    const { course_id } = req.body;

    try {
        // Check if already subscribed
        const [existing] = await db.query(
            "SELECT id FROM subscriptions WHERE student_id = ? AND course_id = ? AND status = 'active'",
            [req.user.userId, course_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: "Already subscribed to this course" });
        }

        const id = uuid();
        await db.query(
            `INSERT INTO subscriptions (id, student_id, course_id, status, expires_at) 
             VALUES (?, ?, ?, 'active', DATE_ADD(NOW(), INTERVAL 1 MONTH))`,
            [id, req.user.userId, course_id]
        );

        res.status(201).json({ message: "Subscribed successfully", subscriptionId: id });
    } catch (err) {
        console.error("Subscribe error:", err);
        res.status(500).json({ message: "Failed to subscribe" });
    }
};

// Get my subscriptions
const getMySubscriptions = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT s.*, c.title AS course_title, c.description AS course_description, c.price
             FROM subscriptions s
             JOIN courses c ON s.course_id = c.id
             WHERE s.student_id = ?
             ORDER BY s.created_at DESC`,
            [req.user.userId]
        );
        res.json(rows);
    } catch (err) {
        console.error("Get subscriptions error:", err);
        res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
};

// Cancel a subscription
const cancelSubscription = async (req, res) => {
    try {
        const [result] = await db.query(
            "UPDATE subscriptions SET status = 'cancelled' WHERE id = ? AND student_id = ?",
            [req.params.id, req.user.userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Subscription not found" });
        }

        res.json({ message: "Subscription cancelled" });
    } catch (err) {
        console.error("Cancel subscription error:", err);
        res.status(500).json({ message: "Failed to cancel subscription" });
    }
};

module.exports = {
    subscribe,
    getMySubscriptions,
    cancelSubscription
};
