const PaymentModel = require('../models/Payment');
const { cancelarReferenciaPendente } = require('../services/paymentReference.service');
const { cancelarPagamentosPendentes } = require('../services/paymentCancellation.service');

const expirePayments = async () => {
  const expired = await PaymentModel.find({
    status: 'pendente',
    expiresAt: { $lte: new Date() },
  });

  for (const payment of expired) {
    try {
      await cancelarPagamentosPendentes(payment.tipo, payment.referenciaId);
      await PaymentModel.findByIdAndUpdate(payment._id, { $set: { status: 'expirado' } });
      await cancelarReferenciaPendente(payment.tipo, payment.referenciaId);
    } catch (error) {
      console.error(`[jobs] Falha ao expirar pagamento ${payment._id}:`, error.message);
    }
  }

  if (expired.length > 0) console.log(`[jobs] ${expired.length} pagamento(s) expirado(s)`);
};

const startExpireJob = () => {
  setInterval(async () => {
    try { await expirePayments(); }
    catch (e) { console.error('[jobs] Erro ao expirar pagamentos:', e.message); }
  }, 60_000);
};

module.exports = { startExpireJob };
