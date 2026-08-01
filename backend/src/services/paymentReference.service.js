const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Registration = require('../models/Registration');
const User = require('../models/User');
const { broadcast } = require('../utils/live');

async function cancelarReferenciaPendente(tipo, referenciaId) {
  if (tipo !== 'booking') {
    const session = await mongoose.startSession();
    let registration = null;
    let creditosEstornados = 0;

    try {
      await session.withTransaction(async () => {
        registration = await Registration.findOne({
          _id: referenciaId,
          status: 'pendente_pagamento',
        }).session(session);

        if (!registration) return;

        creditosEstornados = Math.max(
          0,
          (registration.creditosAplicados || 0) - (registration.creditosEstornados || 0),
        );
        registration.status = 'cancelada';
        registration.creditosEstornados = (registration.creditosEstornados || 0) + creditosEstornados;
        await registration.save({ session });

        if (creditosEstornados > 0) {
          await User.findByIdAndUpdate(
            registration.userId,
            { $inc: { creditos: creditosEstornados } },
            { session },
          );
        }
      });
    } finally {
      await session.endSession();
    }

    if (registration) {
      broadcast('registrations');
      if (creditosEstornados > 0) broadcast('users');
    }
    return { referencia: registration, creditosEstornados };
  }

  const session = await mongoose.startSession();
  let booking = null;
  let creditosEstornados = 0;

  try {
    await session.withTransaction(async () => {
      booking = await Booking.findOne({
        _id: referenciaId,
        status: 'pendente_pagamento',
      }).session(session);

      if (!booking) return;

      creditosEstornados = Math.max(
        0,
        (booking.creditosAplicados || 0) - (booking.creditosEstornados || 0),
      );

      booking.status = 'cancelada';
      booking.creditosEstornados = (booking.creditosEstornados || 0) + creditosEstornados;
      await booking.save({ session });

      if (creditosEstornados > 0) {
        await User.findByIdAndUpdate(
          booking.userId,
          { $inc: { creditos: creditosEstornados } },
          { session },
        );
      }
    });
  } finally {
    await session.endSession();
  }

  if (booking) {
    broadcast('bookings');
    if (creditosEstornados > 0) broadcast('users');
  }

  return { referencia: booking, creditosEstornados };
}

module.exports = { cancelarReferenciaPendente };
