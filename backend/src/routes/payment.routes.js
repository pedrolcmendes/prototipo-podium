const express = require('express');
const router = express.Router();
const { protect, masterOnly } = require('../middleware/auth');
const { cardPaymentRateLimit } = require('../middleware/paymentRateLimit');
const {
  criarPagamentoPix,
  criarPreferencia,
  criarPagamentoCartao,
  getStatus,
  syncPagamento,
  webhook,
  listarRevisoesFinanceiras,
  resolverRevisaoFinanceira,
} = require('../controllers/payment.controller');

router.post('/webhook', webhook);
router.post('/pix', protect, criarPagamentoPix);
router.post('/preferencia', protect, criarPreferencia);
router.post('/cartao', protect, cardPaymentRateLimit, criarPagamentoCartao);
router.get('/sync', protect, syncPagamento);
router.get('/revisoes-financeiras', protect, masterOnly, listarRevisoesFinanceiras);
router.patch('/revisoes-financeiras/:id/resolver', protect, masterOnly, resolverRevisaoFinanceira);
router.get('/:id/status', protect, getStatus);

module.exports = router;
