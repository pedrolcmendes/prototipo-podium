const router = require('express').Router();
const { minhasInscricoes, porEvento, inscrever, cancelar } = require('../controllers/registration.controller');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/me', protect, minhasInscricoes);
router.get('/minhas', protect, minhasInscricoes);
router.get('/evento/:eventId', protect, adminOnly, porEvento);
router.post('/evento/:eventId', protect, inscrever);
router.patch('/:id/cancelar', protect, cancelar);

module.exports = router;
