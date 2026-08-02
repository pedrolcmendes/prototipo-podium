const router = require('express').Router();
const { listar, criar, remover } = require('../controllers/blockedSlot.controller');
const { protect, adminOnly } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', asyncHandler(listar));
router.post('/', protect, adminOnly, asyncHandler(criar));
router.delete('/:id', protect, adminOnly, asyncHandler(remover));

module.exports = router;
