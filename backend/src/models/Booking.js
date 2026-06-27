const mongoose = require('mongoose');

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
    enum: ['coberta', 'areia', 'pickleball'],
    required: true,
  },
  quadraId: { type: String, required: true },
  date: { type: String, required: true },
  slots: { type: [Number], required: true },
  dayUse: { type: Boolean, default: false },
  payment: {
    type: String,
    enum: ['pix', 'credito', 'dinheiro'],
    required: true,
  },
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['confirmada', 'cancelada', 'concluida'],
    default: 'confirmada',
  },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
