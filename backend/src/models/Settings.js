const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  cancelWindow: { type: Number, default: 24 },   // horas de antecedência mínima para cancelar
  maxAdvanceDays: { type: Number, default: 30 },  // dias máximos de antecedência para reservar
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
