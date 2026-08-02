const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tipo: { type: String, enum: ['booking', 'registration'], required: true },
  referenciaId: { type: mongoose.Schema.Types.ObjectId, required: true },
  valor: { type: Number, required: true },
  metodo: { type: String, enum: ['pix', 'credito', 'debito', 'checkout_pro', 'cartao'], required: true },
  status: {
    type: String,
    enum: [
      'pendente',
      'aprovado',
      'cancelado',
      'expirado',
      'estornado',
      'chargeback',
      'em_mediacao',
      'estornado_creditos',
    ],
    default: 'pendente',
  },
  mpPaymentId: { type: String, default: null },
  mpStatus: { type: String, default: null },
  statusDetail: { type: String, default: null },
  lastSyncedAt: { type: Date, default: null },
  mpPreferenceId: { type: String, default: null },
  checkoutUrl: { type: String, default: null },
  sandboxUrl: { type: String, default: null },
  idempotencyKey: { type: String, default: null },
  processingStartedAt: { type: Date, default: null },
  requiresAction: { type: Boolean, default: false },
  threeDsInfo: {
    externalResourceURL: { type: String, default: null },
    creq: { type: String, default: null },
  },
  paymentTypeId: { type: String, enum: ['credit_card', 'debit_card', 'prepaid_card', null], default: null },
  cardBrand: { type: String, default: null },
  cardLastFour: { type: String, default: null },
  expiresAt: { type: Date, required: true },
  paidAt: { type: Date, default: null },
  refundedAt: { type: Date, default: null },
  chargedBackAt: { type: Date, default: null },
  arenaCreditsRefundedAt: { type: Date, default: null },
  arenaCreditsRefundedValue: { type: Number, default: 0 },
  financialReviewRequired: { type: Boolean, default: false, index: true },
  financialReviewReason: { type: String, default: null },
  financialReviewedAt: { type: Date, default: null },
  financialReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

paymentSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  },
);

module.exports = mongoose.model('Payment', paymentSchema);
