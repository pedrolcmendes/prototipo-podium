const mongoose = require('mongoose');
const { reservationKeysFor } = require('../utils/bookingSlots');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  modalidade: {
    type: String,
    enum: ['beach-tennis', 'futevolei', 'volei', 'pickleball'],
    required: true,
  },
  quadra: {
    type: String,
    enum: ['coberta', 'descoberta', 'areia', 'pickleball', 'teste'],
    required: function () { return !this.dayUse; },
  },
  quadraId: { type: String, required: function () { return !this.dayUse; } },
  date: { type: String, required: function () { return !this.dayUse; } },
  slots: { type: [Number], default: [] },
  dayUse: { type: Boolean, default: false },
  payment: {
    type: String,
    enum: ['pix', 'credito', 'debito', 'dinheiro', 'creditos', 'cartao'],
    required: true,
  },
  creditosAplicados: { type: Number, default: 0 },
  creditosEstornados: { type: Number, default: 0 },
  total: { type: Number, required: true },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season', default: null, index: true },
  seasonCode: { type: String, default: null, index: true },
  status: {
    type: String,
    enum: ['confirmada', 'cancelada', 'concluida', 'pendente_pagamento'],
    default: 'confirmada',
  },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  paymentExpiresAt: { type: Date, default: null },
  foiPago: { type: Boolean, default: false },
  reminderSent: { type: Boolean, default: false }, // lembrete de 2h antes já enviado
  // Uma chave por quadra/data/hora. O índice único fecha a janela de corrida
  // entre a consulta de disponibilidade e a criação da reserva.
  reservationKeys: { type: [String], default: undefined, select: false },
}, { timestamps: true });

bookingSchema.pre('validate', function keepReservationKeysInSync() {
  this.reservationKeys = reservationKeysFor(this);
});

bookingSchema.index(
  { reservationKeys: 1 },
  { unique: true, sparse: true, name: 'unique_active_booking_slots' },
);

module.exports = mongoose.model('Booking', bookingSchema);
