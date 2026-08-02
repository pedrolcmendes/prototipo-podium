const router = require('express').Router();
const { register, login, googleAuth, me, enviarResetSenha, redefinirSenha } = require('../controllers/auth.controller');
const { protect, adminOnly } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/google', asyncHandler(googleAuth));
router.get('/me', protect, asyncHandler(me));
router.post('/enviar-reset-senha', protect, adminOnly, asyncHandler(enviarResetSenha));
router.post('/redefinir-senha', asyncHandler(redefinirSenha));

module.exports = router;
