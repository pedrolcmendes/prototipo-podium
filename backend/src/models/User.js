const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  senha: { type: String, required: true, minlength: 6 },
  cpf: { type: String, required: true, unique: true },
  nasc: { type: String },
  tel: { type: String },
  genero: { type: String, enum: ['masculino', 'feminino', 'outro', ''], default: '' },
  status: { type: String, enum: ['ativo', 'pendente', 'bloqueado', 'inativo'], default: 'ativo' },
  creditos: { type: Number, default: 0 },
  admin: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('senha')) return next();
  this.senha = await bcrypt.hash(this.senha, 10);
  next();
});

userSchema.methods.verificarSenha = function (senha) {
  return bcrypt.compare(senha, this.senha);
};

userSchema.methods.toPublic = function () {
  const obj = this.toObject();
  delete obj.senha;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
