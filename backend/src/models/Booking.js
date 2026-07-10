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
    enum: ['coberta', 'descoberta', 'areia', 'pickleball'],
    required: function () { return !this.dayUse; },
  },
  quadraId: { type: String, required: function () { return !this.dayUse; } },
  date: { type: String, required: function () { return !this.dayUse; } },
  slots: { type: [Number], default: [] },
  dayUse: { type: Boolean, default: false },
  payment: {
    type: String,
    enum: ['pix', 'credito', 'debito', 'dinheiro'],
    required: true,
  },
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['confirmada', 'cancelada', 'concluida'],
    default: 'confirmada',
  },
  reminderSent: { type: Boolean, default: false }, // lembrete de 2h antes já enviado
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
