const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const {
    getInstitutions,
    createInstitution,
    deleteInstitution,
    getMyInstitution,
    updateMyInstitution,
    getMyProfile,
    updateMyProfile,
} = require('../controllers/institutions.controller.js');

const router = Router();

// Auth-required routes (must come before parameterized routes)
router.get("/me", requireAuth, getMyInstitution);
router.put("/me", requireAuth, updateMyInstitution);
router.get("/me/profile", requireAuth, getMyProfile);
router.put("/me/profile", requireAuth, updateMyProfile);

// Public/admin routes
router.get("/", getInstitutions);
router.post("/", createInstitution);
router.delete("/:id", deleteInstitution);

module.exports = router;
