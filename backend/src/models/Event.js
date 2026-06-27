const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  data: { type: String, required: true },
  hora: { type: String, required: true },
  local: { type: String, required: true },
  vagas: { type: Number, required: true },
  categoria: {
    type: String,
    enum: ['beachtennis', 'futevolei', 'volei', 'pickleball', 'taekwondo', 'geral'],
    required: true,
  },
  preco: { type: Number, required: true },
  status: {
    type: String,
    enum: ['aberto', 'encerrado', 'breve'],
    default: 'aberto',
  },
  nivel: { type: String, default: 'Todos os níveis' },
  desc: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
