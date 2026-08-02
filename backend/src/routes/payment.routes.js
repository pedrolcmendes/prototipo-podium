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
const asyncHandler = require('../utils/asyncHandler');

router.post('/webhook', asyncHandler(webhook));
router.post('/pix', protect, asyncHandler(criarPagamentoPix));
router.post('/preferencia', protect, asyncHandler(criarPreferencia));
router.post('/cartao', protect, cardPaymentRateLimit, asyncHandler(criarPagamentoCartao));
router.get('/sync', protect, asyncHandler(syncPagamento));
router.get('/revisoes-financeiras', protect, masterOnly, asyncHandler(listarRevisoesFinanceiras));
router.patch('/revisoes-financeiras/:id/resolver', protect, masterOnly, asyncHandler(resolverRevisaoFinanceira));
router.get('/:id/status', protect, asyncHandler(getStatus));

module.exports = router;
