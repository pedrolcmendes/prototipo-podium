const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  eventNome: { type: String, required: true },
  preco: { type: Number, required: true },
  status: {
    type: String,
    enum: ['confirmada', 'cancelada'],
    default: 'confirmada',
  },
}, { timestamps: true });

registrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
