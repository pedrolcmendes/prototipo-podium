const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  pos: { type: Number, required: true },
  nome: { type: String, required: true },
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  clube: { type: String, default: '' },
  pts: { type: Number, default: 0 },
  pontosPorEtapa: [{ type: Number, default: 0 }],
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
    enum: ['masculino', 'feminino', 'misto'],
    required: true,
    validate: {
      validator(value) {
        const esporte = this.esporte || this.getQuery?.().esporte || this.getUpdate?.().esporte;
        return esporte !== 'futevolei' || value === 'masculino';
      },
      message: 'O ranking de futevôlei está disponível apenas no gênero masculino.',
    },
  },
  nivel: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'Ouro', 'Prata'],
    required: true,
    default: 'A',
    validate: {
      validator(value) {
        const esporte = this.esporte || this.getQuery?.().esporte || this.getUpdate?.().esporte;
        const categorias = esporte === 'futevolei' ? ['Ouro', 'Prata'] : ['A', 'B', 'C', 'D'];
        return categorias.includes(value);
      },
      message: 'Categoria inválida para a modalidade selecionada.',
    },
  },
  ano: { type: Number, required: true, default: () => new Date().getFullYear() },
  semestre: { type: Number, enum: [1, 2], required: true, default: 1 },
  etapas: [{ type: String, trim: true }],
  entries: [entrySchema],
}, { timestamps: true });

rankingSchema.index({ esporte: 1, genero: 1, nivel: 1, ano: 1, semestre: 1 }, { unique: true });

module.exports = mongoose.model('Ranking', rankingSchema);
