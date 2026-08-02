const router = require('express').Router();
const { me, atualizarMe, alterarSenha, listar, buscarPorId, atualizar, remover, importar, limparNaoAdmins } = require('../controllers/user.controller');
const { protect, adminOnly, masterOnly } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/me', protect, asyncHandler(me));
router.put('/me', protect, asyncHandler(atualizarMe));
router.put('/me/password', protect, asyncHandler(alterarSenha));
router.get('/', protect, adminOnly, asyncHandler(listar));
router.post('/importar', protect, masterOnly, asyncHandler(importar));
router.delete('/limpar', protect, masterOnly, asyncHandler(limparNaoAdmins));
router.get('/:id', protect, adminOnly, asyncHandler(buscarPorId));
router.put('/:id', protect, adminOnly, asyncHandler(atualizar));
router.delete('/:id', protect, masterOnly, asyncHandler(remover));

module.exports = router;
