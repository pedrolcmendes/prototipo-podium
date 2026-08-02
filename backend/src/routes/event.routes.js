const router = require('express').Router();
const { listar, buscarPorId, criar, atualizar, remover } = require('../controllers/event.controller');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../utils/upload');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', asyncHandler(listar));
router.get('/:id', asyncHandler(buscarPorId));
router.post('/', protect, adminOnly, upload.single('imagem'), asyncHandler(criar));
router.put('/:id', protect, adminOnly, upload.single('imagem'), asyncHandler(atualizar));
router.delete('/:id', protect, adminOnly, asyncHandler(remover));

module.exports = router;
