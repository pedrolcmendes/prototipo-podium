const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  senha: { type: String, default: null },
  googleId: { type: String, default: null },
  cpf: { type: String, trim: true, default: null },
  nasc: { type: String },
  tel: { type: String },
  genero: { type: String, enum: ['masculino', 'feminino', 'nao_informar', ''], default: '' },
  status: { type: String, enum: ['ativo', 'pendente', 'bloqueado', 'inativo'], default: 'ativo' },
  creditos: { type: Number, default: 0 },
  admin: { type: Boolean, default: false },
  resetToken: { type: String, default: null },
  resetTokenExpires: { type: Date, default: null },
}, { timestamps: true });

// sparse: true permite múltiplos documentos com cpf null sem violar o unique
userSchema.index({ cpf: 1 }, { unique: true, sparse: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('senha') || !this.senha) return next();
  this.senha = await bcrypt.hash(this.senha, 10);
  next();
});

userSchema.methods.verificarSenha = function (senha) {
  if (!this.senha) return Promise.resolve(false);
  return bcrypt.compare(senha, this.senha);
};

userSchema.methods.toPublic = function () {
  const obj = this.toObject();
  delete obj.senha;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
