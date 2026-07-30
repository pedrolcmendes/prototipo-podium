const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { criarPreferencia, getStatus, syncPagamento, webhook } = require('../controllers/payment.controller');

router.post('/webhook', webhook);
router.post('/preferencia', protect, criarPreferencia);
router.get('/sync', syncPagamento);
router.get('/:id/status', protect, getStatus);

module.exports = router;
