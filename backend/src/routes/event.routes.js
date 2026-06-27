const router = require('express').Router();
const { listar, buscarPorId, criar, atualizar, remover } = require('../controllers/event.controller');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../utils/upload');

router.get('/', listar);
router.get('/:id', buscarPorId);
router.post('/', protect, adminOnly, upload.single('imagem'), criar);
router.put('/:id', protect, adminOnly, upload.single('imagem'), atualizar);
router.delete('/:id', protect, adminOnly, remover);

module.exports = router;
