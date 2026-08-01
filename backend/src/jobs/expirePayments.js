const PaymentModel = require('../models/Payment');
const Booking = require('../models/Booking');
const Registration = require('../models/Registration');
const { cancelarReferenciaPendente } = require('../services/paymentReference.service');
const { cancelarPagamentosPendentes } = require('../services/paymentCancellation.service');

const expirePayments = async () => {
  const now = new Date();
  const expired = await PaymentModel.find({
    status: 'pendente',
    expiresAt: { $lte: now },
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

  const legacyCutoff = new Date(now.getTime() - 30 * 60 * 1000);
  const holdFilter = {
    status: 'pendente_pagamento',
    $or: [
      { paymentExpiresAt: { $lte: now } },
      { paymentExpiresAt: null, createdAt: { $lte: legacyCutoff } },
    ],
  };
  const [expiredBookings, expiredRegistrations] = await Promise.all([
    Booking.find(holdFilter).select('_id'),
    Registration.find(holdFilter).select('_id'),
  ]);

  for (const reference of expiredBookings) {
    try {
      await cancelarPagamentosPendentes('booking', reference._id);
      await cancelarReferenciaPendente('booking', reference._id);
    } catch (error) {
      console.error(`[jobs] Falha ao liberar reserva pendente ${reference._id}:`, error.message);
    }
  }

  for (const reference of expiredRegistrations) {
    try {
      await cancelarPagamentosPendentes('registration', reference._id);
      await cancelarReferenciaPendente('registration', reference._id);
    } catch (error) {
      console.error(`[jobs] Falha ao liberar inscrição pendente ${reference._id}:`, error.message);
    }
  }

  const totalExpired = expired.length + expiredBookings.length + expiredRegistrations.length;
  if (totalExpired > 0) console.log(`[jobs] ${totalExpired} pagamento(s)/retenção(ões) expirado(s)`);
};

const startExpireJob = () => {
  setInterval(async () => {
    try { await expirePayments(); }
    catch (e) { console.error('[jobs] Erro ao expirar pagamentos:', e.message); }
  }, 60_000);
};

module.exports = { startExpireJob };
