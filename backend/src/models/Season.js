const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  code: { type: String, trim: true, default: '' },
  type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
  value: { type: Number, min: 0, default: 0 },
  amount: { type: Number, min: 0, default: 0 },
}, { _id: false });

const seasonSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  courtId: { type: String, required: true },
  courtName: { type: String, required: true },
  courtType: {
    type: String,
    enum: ['coberta', 'descoberta', 'areia', 'pickleball'],
    required: true,
  },
  modalidade: {
    type: String,
    enum: ['beach-tennis', 'futevolei', 'volei', 'pickleball'],
    required: true,
  },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  startHour: { type: Number, required: true },
  endHour: { type: Number, required: true },
  slots: { type: [Number], required: true },
  recurrence: {
    type: { type: String, enum: ['daily', 'weekly'], required: true },
    dailyInterval: { type: Number, min: 1, default: 1 },
    weeklyInterval: { type: Number, min: 1, default: 1 },
    weekdays: { type: [Number], default: [] },
  },
  ignoreHolidays: { type: Boolean, default: false },
  payment: {
    type: String,
    enum: ['pix', 'credito', 'debito', 'dinheiro'],
    default: 'pix',
  },
  grossTotal: { type: Number, min: 0, required: true },
  coupon: { type: discountSchema, default: () => ({}) },
  manualDiscount: { type: discountSchema, default: () => ({}) },
  discountTotal: { type: Number, min: 0, default: 0 },
  finalTotal: { type: Number, min: 0, required: true },
  occurrencesGenerated: { type: Number, min: 0, default: 0 },
  conflictsCount: { type: Number, min: 0, default: 0 },
  skippedHolidays: { type: Number, min: 0, default: 0 },
  bookingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  status: {
    type: String,
    enum: ['active', 'cancelled'],
    default: 'active',
  },
  cancelledAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Season', seasonSchema);
