const { Router } = require('express');
const {
    getInstitutions,
    createInstitution,
    deleteInstitution,
} = require('../controllers/institutions.controller.js');

const router = Router();

router.get("/", getInstitutions);
router.post("/", createInstitution);
router.delete("/:id", deleteInstitution);

module.exports = router;
