const router = require('express').Router();
const { listarMinhas, listar, criar, atualizar, cancelar, horariosOcupados, importar } = require('../controllers/booking.controller');
const { protect, masterOnly } = require('../middleware/auth');
const { ensurePaymentsFresh } = require('../jobs/expirePayments');
const asyncHandler = require('../utils/asyncHandler');

router.get('/me', protect, ensurePaymentsFresh, asyncHandler(listarMinhas));
router.get('/horarios-ocupados', ensurePaymentsFresh, asyncHandler(horariosOcupados));
router.get('/', protect, ensurePaymentsFresh, asyncHandler(listar));
router.post('/', protect, ensurePaymentsFresh, asyncHandler(criar));
router.post('/importar', protect, masterOnly, asyncHandler(importar));
router.put('/:id', protect, asyncHandler(atualizar));
router.patch('/:id/cancelar', protect, asyncHandler(cancelar));

module.exports = router;
