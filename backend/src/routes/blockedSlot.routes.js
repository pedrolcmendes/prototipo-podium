const router = require('express').Router();
const { listar, criar, remover } = require('../controllers/blockedSlot.controller');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', listar);
router.post('/', protect, adminOnly, criar);
router.delete('/:id', protect, adminOnly, remover);

module.exports = router;
