const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const { requireRole } = require('../middlewares/role.middleware.js');
const { getAdminDashboard } = require('../controllers/admin.controller.js');

const router = Router();

// Admin dashboard - requires admin role
router.get("/dashboard", requireAuth, requireRole("admin"), getAdminDashboard);

module.exports = router;
