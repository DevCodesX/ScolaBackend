const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const { requireRole } = require('../middlewares/role.middleware.js');
const { registerLimiter } = require('../middlewares/rateLimit.middleware.js');
const {
    registerTeacher,
    verifyEmail,
    registerInstitution,
    getDashboardStats,
    exportReport
} = require('../controllers/iam.controller.js');

const router = Router();

/**
 * @swagger
 * /api/iam/teacher/register:
 *   post:
 *     summary: Register a new teacher
 *     tags: [IAM - Teacher]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TeacherRegister'
 *     responses:
 *       201:
 *         description: Teacher registered successfully
 *       400:
 *         description: Validation error or email already exists
 *       429:
 *         description: Too many registration attempts
 */
router.post('/teacher/register', registerLimiter, registerTeacher);

/**
 * @swagger
 * /api/iam/verify-email:
 *   get:
 *     summary: Verify email address
 *     tags: [IAM - Verification]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.get('/verify-email', verifyEmail);

/**
 * @swagger
 * /api/iam/institution/register:
 *   post:
 *     summary: Register a new educational institution
 *     tags: [IAM - Institution]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InstitutionRegister'
 *     responses:
 *       201:
 *         description: Institution registered successfully
 *       400:
 *         description: Validation error or email already exists
 */
router.post('/institution/register', registerLimiter, registerInstitution);

/**
 * @swagger
 * /api/iam/institution/dashboard:
 *   get:
 *     summary: Get institution dashboard statistics
 *     tags: [IAM - Institution]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardStats'
 */
router.get('/institution/dashboard', requireAuth, getDashboardStats);

/**
 * @swagger
 * /api/iam/institution/export:
 *   get:
 *     summary: Export institution report as Excel or PDF
 *     tags: [IAM - Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [excel, pdf]
 *           default: excel
 *     responses:
 *       200:
 *         description: File download
 */
router.get('/institution/export', requireAuth, exportReport);

module.exports = router;
