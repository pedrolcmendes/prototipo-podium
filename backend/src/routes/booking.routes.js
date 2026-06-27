const router = require('express').Router();
const { listar, criar, atualizar, cancelar, horariosOcupados, importar } = require('../controllers/booking.controller');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/me', protect, listar);
router.get('/horarios-ocupados', horariosOcupados);
router.get('/', protect, listar);
router.post('/', protect, criar);
router.post('/importar', protect, adminOnly, importar);
router.put('/:id', protect, atualizar);
router.patch('/:id/cancelar', protect, cancelar);

module.exports = router;
