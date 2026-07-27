const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { criarPix, criarCartao, getStatus, webhook } = require('../controllers/payment.controller');

router.post('/webhook', webhook);
router.post('/pix', protect, criarPix);
router.post('/cartao', protect, criarCartao);
router.get('/:id/status', protect, getStatus);

module.exports = router;
