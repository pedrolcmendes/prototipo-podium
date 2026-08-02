const router = require('express').Router();
const { listarMinhas, listar, criar, atualizar, cancelar, horariosOcupados, importar } = require('../controllers/booking.controller');
const { protect, masterOnly } = require('../middleware/auth');
const { ensurePaymentsFresh } = require('../jobs/expirePayments');

router.get('/me', protect, ensurePaymentsFresh, listarMinhas);
router.get('/horarios-ocupados', ensurePaymentsFresh, horariosOcupados);
router.get('/', protect, ensurePaymentsFresh, listar);
router.post('/', protect, ensurePaymentsFresh, criar);
router.post('/importar', protect, masterOnly, importar);
router.put('/:id', protect, atualizar);
router.patch('/:id/cancelar', protect, cancelar);

module.exports = router;
