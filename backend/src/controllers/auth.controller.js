const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { enviarEmailResetSenha, enviarEmailSenhaAlterada } = require('../utils/email');

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

const googleAuth = async (req, res) => {
  const { access_token } = req.body;
  if (!access_token) return res.status(400).json({ message: 'Token Google não fornecido' });

  try {
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`
    );

    if (!response.ok) return res.status(401).json({ message: 'Token Google inválido' });

    const { sub: googleId, email, name: nome } = await response.json();

    if (!email) return res.status(401).json({ message: 'Não foi possível obter e-mail do Google' });

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      user = await User.create({ nome, email, googleId });
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    if (user.status === 'bloqueado') {
      return res.status(403).json({ message: 'Conta bloqueada. Entre em contato com o suporte.' });
    }

    res.json({ token: gerarToken(user._id), user: user.toPublic() });
  } catch {
    res.status(401).json({ message: 'Erro ao autenticar com Google' });
  }
};

const me = async (req, res) => {
  res.json(req.user.toPublic());
};

const enviarResetSenha = async (req, res) => {
  const { userId } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

  const token = crypto.randomBytes(32).toString('hex');
  user.resetToken = token;
  user.resetTokenExpires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h
  await user.save();

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${frontendUrl}/redefinir-senha/${token}`;

  try {
    await enviarEmailResetSenha({ destinatario: user.email, nome: user.nome, link });
    res.json({ message: 'Email enviado com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao enviar email. Verifique as configurações de EMAIL_USER e EMAIL_PASS no .env' });
  }
};

const redefinirSenha = async (req, res) => {
  const { token, novaSenha } = req.body;
  if (!token || !novaSenha) return res.status(400).json({ message: 'Token e nova senha são obrigatórios' });

  const user = await User.findOne({ resetToken: token, resetTokenExpires: { $gt: new Date() } });
  if (!user) return res.status(400).json({ message: 'Link inválido ou expirado' });

  user.senha = novaSenha;
  user.resetToken = null;
  user.resetTokenExpires = null;
  await user.save();

  enviarEmailSenhaAlterada({ destinatario: user.email, nome: user.nome }).catch(() => {});

  res.json({ message: 'Senha redefinida com sucesso' });
};

module.exports = { register, login, googleAuth, me, enviarResetSenha, redefinirSenha };
