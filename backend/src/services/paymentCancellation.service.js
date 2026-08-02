const PaymentModel = require('../models/Payment');
const { MercadoPagoConfig, Payment: MpAPI } = require('mercadopago');

const TERMINAL_NAO_APROVADO = new Set(['cancelled', 'rejected', 'refunded', 'charged_back']);
const PROCESSING_LOCK_MS = 2 * 60 * 1000;

function getMpApi() {
  if (!process.env.MP_ACCESS_TOKEN) {
    const error = new Error('Mercado Pago não está configurado neste ambiente.');
    error.status = 503;
    throw error;
  }
  return new MpAPI(new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN }));
}

async function cancelarPagamentosPendentes(tipo, referenciaId) {
  const pagamentoAprovado = await PaymentModel.findOne({
    tipo,
    referenciaId,
    status: 'aprovado',
  });
  if (pagamentoAprovado) {
    const error = new Error('O pagamento já foi aprovado e aguarda conciliação da reserva.');
    error.status = 409;
    throw error;
  }

  const payments = await PaymentModel.find({
    tipo,
    referenciaId,
    status: 'pendente',
  });

  const pagamentoEmProcessamento = payments.find((payment) => (
    payment.processingStartedAt
    && Date.now() - new Date(payment.processingStartedAt).getTime() < PROCESSING_LOCK_MS
  ));
  if (pagamentoEmProcessamento) {
    const error = new Error('O pagamento está sendo processado. Aguarde a confirmação antes de cancelar.');
    error.status = 409;
    throw error;
  }

  const pagamentosMercadoPago = payments.filter((payment) => payment.mpPaymentId);
  if (pagamentosMercadoPago.length > 0) {
    const mpApi = getMpApi();
    for (const payment of pagamentosMercadoPago) {
      try {
        await mpApi.cancel({ id: payment.mpPaymentId });
      } catch (cancelError) {
        try {
          const mpResult = await mpApi.get({ id: payment.mpPaymentId });
          if (TERMINAL_NAO_APROVADO.has(mpResult.status)) continue;
          if (mpResult.status === 'approved') {
            const error = new Error('O pagamento já foi aprovado e a reserva não pode ser cancelada como pendente.');
            error.status = 409;
            throw error;
          }
        } catch (statusError) {
          if (statusError.status === 409) throw statusError;
        }
        throw cancelError;
      }
    }
  }

  await PaymentModel.updateMany(
    { tipo, referenciaId, status: 'pendente' },
    { $set: { status: 'cancelado' } },
  );
}

module.exports = { cancelarPagamentosPendentes };
