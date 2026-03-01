const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware.js');
const { requireOneOfRoles } = require('../middlewares/role.middleware.js');
const {
    inviteTeacher,
    getInstitutionInvitations,
    cancelInvitation,
    acceptInvitation,
    verifyInvitationToken,
} = require('../controllers/teacherInvitations.controller.js');

const router = Router();

// ✅ Public — التحقق من رمز الدعوة (لصفحة القبول)
router.get('/verify/:token', verifyInvitationToken);

// ✅ Public — قبول الدعوة وتعيين كلمة المرور
router.post('/accept', acceptInvitation);

// 🔒 Institution Admin — إدارة الدعوات
router.post('/', requireAuth, requireOneOfRoles('institution_admin', 'admin'), inviteTeacher);
router.get('/', requireAuth, requireOneOfRoles('institution_admin', 'admin'), getInstitutionInvitations);
router.delete('/:id', requireAuth, requireOneOfRoles('institution_admin', 'admin'), cancelInvitation);

module.exports = router;
