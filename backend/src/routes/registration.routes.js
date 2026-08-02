const router = require('express').Router();
const { minhasInscricoes, listar, porEvento, inscrever, cancelar } = require('../controllers/registration.controller');
const { protect, adminOnly } = require('../middleware/auth');
const { ensurePaymentsFresh } = require('../jobs/expirePayments');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', protect, adminOnly, ensurePaymentsFresh, asyncHandler(listar));
router.get('/me', protect, ensurePaymentsFresh, asyncHandler(minhasInscricoes));
router.get('/minhas', protect, ensurePaymentsFresh, asyncHandler(minhasInscricoes));
router.get('/evento/:eventId', protect, adminOnly, asyncHandler(porEvento));
router.post('/evento/:eventId', protect, ensurePaymentsFresh, asyncHandler(inscrever));
router.patch('/:id/cancelar', protect, asyncHandler(cancelar));

module.exports = router;
