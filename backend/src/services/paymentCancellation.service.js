const PaymentModel = require('../models/Payment');
const { MercadoPagoConfig, Payment: MpAPI } = require('mercadopago');

const TERMINAL_NAO_APROVADO = new Set(['cancelled', 'rejected', 'refunded', 'charged_back']);

function getMpApi() {
  if (!process.env.MP_ACCESS_TOKEN) {
    const error = new Error('Mercado Pago não está configurado neste ambiente.');
    error.status = 503;
    throw error;
  }
  return new MpAPI(new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN }));
}

async function cancelarPagamentosPendentes(tipo, referenciaId) {
  const payments = await PaymentModel.find({
    tipo,
    referenciaId,
    status: 'pendente',
  });

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
