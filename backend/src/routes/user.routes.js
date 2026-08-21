const router = require('express').Router();
const { me, atualizarMe, alterarSenha, listar, buscarPorId, atualizar, remover, importar, limparNaoAdmins, buscarParceiros } = require('../controllers/user.controller');
const { protect, adminOnly, masterOnly } = require('../middleware/auth');

router.get('/me', protect, me);
router.get('/search', protect, buscarParceiros);
router.put('/me', protect, atualizarMe);
router.put('/me/password', protect, alterarSenha);
router.get('/', protect, adminOnly, listar);
router.post('/importar', protect, masterOnly, importar);
router.delete('/limpar', protect, masterOnly, limparNaoAdmins);
router.get('/:id', protect, adminOnly, buscarPorId);
router.put('/:id', protect, adminOnly, atualizar);
router.delete('/:id', protect, masterOnly, remover);

module.exports = router;
