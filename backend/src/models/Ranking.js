const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  pos: { type: Number, required: true },
  nome: { type: String, required: true },
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userId2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  clube: { type: String, default: '' },
  pts: { type: Number, default: 0 },
  v: { type: Number, default: 0 },
  d: { type: Number, default: 0 },
  pj: { type: Number, default: 0 },
}, { _id: false });

const rankingSchema = new mongoose.Schema({
  esporte: {
    type: String,
    enum: ['futevolei', 'beachtennis'],
    required: true,
  },
  genero: {
    type: String,
    enum: ['masculino', 'feminino'],
    required: true,
  },
  entries: [entrySchema],
}, { timestamps: true });

rankingSchema.index({ esporte: 1, genero: 1 }, { unique: true });

module.exports = mongoose.model('Ranking', rankingSchema);
