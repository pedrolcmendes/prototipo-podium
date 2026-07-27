const PaymentModel = require('../models/Payment');
const Booking = require('../models/Booking');
const Registration = require('../models/Registration');
const { broadcast } = require('../utils/live');

const expirePayments = async () => {
  const expired = await PaymentModel.find({
    status: 'pendente',
    expiresAt: { $lte: new Date() },
  });

  for (const payment of expired) {
    payment.status = 'expirado';
    await payment.save();

    if (payment.tipo === 'booking') {
      await Booking.findByIdAndUpdate(payment.referenciaId, { status: 'cancelada' });
      broadcast('bookings');
    } else {
      await Registration.findByIdAndUpdate(payment.referenciaId, { status: 'cancelada' });
      broadcast('registrations');
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
