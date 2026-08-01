const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { criarPagamentoPix, criarPreferencia, criarPagamentoCartao, getStatus, syncPagamento, webhook } = require('../controllers/payment.controller');

router.post('/webhook', webhook);
router.post('/pix', protect, criarPagamentoPix);
router.post('/preferencia', protect, criarPreferencia);
router.post('/cartao', protect, criarPagamentoCartao);
router.get('/sync', protect, syncPagamento);
router.get('/:id/status', protect, getStatus);

module.exports = router;
