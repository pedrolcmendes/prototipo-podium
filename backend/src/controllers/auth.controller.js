const jwt = require('jsonwebtoken');
const User = require('../models/User');

const gerarToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const register = async (req, res) => {
  const { nome, email, senha, cpf, nasc, tel, genero } = req.body;

  if (!nome || !email || !senha || !cpf) {
    return res.status(400).json({ message: 'Campos obrigatórios: nome, email, senha, cpf' });
  }

  const emailExistente = await User.findOne({ email });
  if (emailExistente) return res.status(409).json({ message: 'E-mail já cadastrado' });

  const cpfExistente = await User.findOne({ cpf });
  if (cpfExistente) return res.status(409).json({ message: 'CPF já cadastrado' });

  const user = await User.create({ nome, email, senha, cpf, nasc, tel, genero });

  res.status(201).json({ token: gerarToken(user._id), user: user.toPublic() });
};

const login = async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ message: 'Informe e-mail e senha' });
  }

  const user = await User.findOne({ email });
  if (!user || !(await user.verificarSenha(senha))) {
    return res.status(401).json({ message: 'E-mail ou senha incorretos' });
  }

  if (user.status === 'bloqueado') {
    return res.status(403).json({ message: 'Conta bloqueada. Entre em contato com o suporte.' });
  }

  if (user.status === 'inativo') {
    return res.status(403).json({ message: 'Conta inativa.' });
  }

  res.json({ token: gerarToken(user._id), user: user.toPublic() });
};

const me = async (req, res) => {
  res.json(req.user.toPublic());
};

module.exports = { register, login, me };
