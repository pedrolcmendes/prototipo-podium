const router = require('express').Router();
const { listar, buscarPorId, criar, atualizar, remover } = require('../controllers/event.controller');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', listar);
router.get('/:id', buscarPorId);
router.post('/', protect, adminOnly, criar);
router.put('/:id', protect, adminOnly, atualizar);
router.delete('/:id', protect, adminOnly, remover);

module.exports = router;
