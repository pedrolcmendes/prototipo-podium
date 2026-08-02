const { paymentExpirationDate } = require('./paymentTimeout');

function initialBookingPaymentState({ isAdminBooking, settings, now = new Date() }) {
  if (isAdminBooking) {
    return {
      paymentExpiresAt: null,
      foiPago: true,
      status: 'confirmada',
    };
  }

  return {
    paymentExpiresAt: paymentExpirationDate(settings, now),
    foiPago: false,
    status: 'pendente_pagamento',
  };
}

module.exports = { initialBookingPaymentState };
