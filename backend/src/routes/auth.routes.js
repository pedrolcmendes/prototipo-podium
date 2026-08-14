const router = require('express').Router();
const {
  register,
  login,
  googleAuth,
  me,
  enviarResetSenha,
  solicitarResetSenha,
  redefinirSenha,
} = require('../controllers/auth.controller');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/esqueci-senha', solicitarResetSenha);
router.get('/me', protect, me);
router.post('/enviar-reset-senha', protect, adminOnly, enviarResetSenha);
router.post('/redefinir-senha', redefinirSenha);

module.exports = router;
