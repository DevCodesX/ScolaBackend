const { Router } = require('express');
const { login } = require('../controllers/auth.controller.js');
const { loginLimiter } = require('../middlewares/rateLimit.middleware.js');

const router = Router();

router.post("/login", loginLimiter, login);

module.exports = router;
