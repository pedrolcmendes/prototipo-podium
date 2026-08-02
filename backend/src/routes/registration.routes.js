const router = require('express').Router();
const { minhasInscricoes, listar, porEvento, inscrever, cancelar } = require('../controllers/registration.controller');
const { protect, adminOnly } = require('../middleware/auth');
const { ensurePaymentsFresh } = require('../jobs/expirePayments');

router.get('/', protect, adminOnly, ensurePaymentsFresh, listar);
router.get('/me', protect, ensurePaymentsFresh, minhasInscricoes);
router.get('/minhas', protect, ensurePaymentsFresh, minhasInscricoes);
router.get('/evento/:eventId', protect, adminOnly, porEvento);
router.post('/evento/:eventId', protect, ensurePaymentsFresh, inscrever);
router.patch('/:id/cancelar', protect, cancelar);

module.exports = router;
