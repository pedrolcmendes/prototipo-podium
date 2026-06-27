const mongoose = require('mongoose');

const blockedSlotSchema = new mongoose.Schema({
  courtId: { type: String, required: true },
  date: { type: String, required: true },
  hour: { type: Number, required: true },
  motivo: { type: String, default: '' },
}, { timestamps: true });

blockedSlotSchema.index({ courtId: 1, date: 1, hour: 1 }, { unique: true });

module.exports = mongoose.model('BlockedSlot', blockedSlotSchema);
