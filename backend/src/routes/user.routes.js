const router = require('express').Router();
const { me, atualizarMe, alterarSenha, listar, buscarPorId, atualizar, remover, importar, limparNaoAdmins } = require('../controllers/user.controller');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/me', protect, me);
router.put('/me', protect, atualizarMe);
router.put('/me/password', protect, alterarSenha);
router.get('/', protect, adminOnly, listar);
router.post('/importar', protect, adminOnly, importar);
router.delete('/limpar', protect, adminOnly, limparNaoAdmins);
router.get('/:id', protect, buscarPorId);
router.put('/:id', protect, atualizar);
router.delete('/:id', protect, adminOnly, remover);

module.exports = router;
