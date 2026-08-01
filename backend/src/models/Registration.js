const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const registrationSchema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  eventNome: { type: String, required: true },
  preco: { type: Number, required: true },
  valorTotal: { type: Number, default: null },
  genero: {
    type: String,
    enum: ['masculino', 'feminino', null],
    default: null,
  },
  nivel: {
    type: String,
    enum: ['A', 'B', 'C', 'D', null],
    default: null,
  },
  parceiro: { type: String, default: null },
  precoDupla: { type: Number, default: null },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  status: {
    type: String,
    enum: ['confirmada', 'cancelada', 'pendente_pagamento'],
    default: 'confirmada',
  },
}, { timestamps: true });

registrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
