const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const {
    subscribe,
    getMySubscriptions,
    cancelSubscription
} = require('../controllers/subscriptions.controller.js');

const router = Router();

// Subscribe to a course
router.post("/", requireAuth, subscribe);

// Get my subscriptions
router.get("/", requireAuth, getMySubscriptions);

// Cancel a subscription
router.put("/:id/cancel", requireAuth, cancelSubscription);

module.exports = router;
