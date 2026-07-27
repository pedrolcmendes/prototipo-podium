const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tipo: { type: String, enum: ['booking', 'registration'], required: true },
  referenciaId: { type: mongoose.Schema.Types.ObjectId, required: true },
  valor: { type: Number, required: true },
  metodo: { type: String, enum: ['pix', 'credito', 'debito'], required: true },
  status: { type: String, enum: ['pendente', 'aprovado', 'cancelado', 'expirado'], default: 'pendente' },
  mpPaymentId: { type: String, default: null },
  pixQrCode: { type: String, default: null },
  pixQrCodeBase64: { type: String, default: null },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
