const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { enviarEmailSenhaAlterada } = require('../utils/email');

const me = async (req, res) => {
  res.json(req.user.toPublic());
};

const atualizarMe = async (req, res) => {
  const { nome, tel, nasc } = req.body;
  const updates = {};
  if (nome !== undefined) updates.nome = nome;
  if (tel !== undefined) updates.tel = tel;
  if (nasc !== undefined) updates.nasc = nasc;
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-senha');
  res.json(user);
};

const alterarSenha = async (req, res) => {
  const { senhaAtual, novaSenha } = req.body;
  if (!senhaAtual || !novaSenha) return res.status(400).json({ message: 'Informe senhaAtual e novaSenha' });
  const user = await User.findById(req.user._id);
  const ok = await user.verificarSenha(senhaAtual);
  if (!ok) return res.status(400).json({ message: 'Senha atual incorreta' });
  user.senha = novaSenha;
  await user.save();
  res.json({ message: 'Senha alterada com sucesso' });
};

const listar = async (req, res) => {
  const users = await User.find().select('-senha').sort({ createdAt: -1 });
  res.json(users);
};

const buscarPorId = async (req, res) => {
  const user = await User.findById(req.params.id).select('-senha');
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  res.json(user);
};

const atualizar = async (req, res) => {
  const ehAdmin = req.user.admin;
  const ehProprioUsuario = req.user._id.toString() === req.params.id;

  if (!ehAdmin && !ehProprioUsuario) {
    return res.status(403).json({ message: 'Sem permissão para editar este usuário' });
  }

  const camposPermitidos = ['nome', 'tel', 'nasc', 'genero'];
  if (ehAdmin) camposPermitidos.push('status', 'creditos', 'admin');

  const atualizacoes = {};
  camposPermitidos.forEach((campo) => {
    if (req.body[campo] !== undefined) atualizacoes[campo] = req.body[campo];
  });

  if (req.body.senha) {
    const user = await User.findById(req.params.id);
    user.senha = req.body.senha;
    await user.save();
    enviarEmailSenhaAlterada({ destinatario: user.email, nome: user.nome }).catch(() => {});
    delete atualizacoes.senha;
  }

  const user = await User.findByIdAndUpdate(req.params.id, atualizacoes, {
    new: true,
    runValidators: true,
  }).select('-senha');

  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  res.json(user);
};

const remover = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  res.json({ message: 'Usuário removido' });
};

const importar = async (req, res) => {
  const lista = req.body;
  if (!Array.isArray(lista) || !lista.length) {
    return res.status(400).json({ message: 'Envie um array de usuários' });
  }

  // hash único para senha padrão compartilhada (evita N bcrypt calls)
  const senhasUnicas = [...new Set(lista.map(u => u.senha).filter(Boolean))];
  const hashMap = {};
  await Promise.all(senhasUnicas.map(async s => { hashMap[s] = await bcrypt.hash(s, 10); }));

  const GENEROS_VALIDOS = ['masculino', 'feminino', ''];
  const docs = lista
    .filter(u => u.nome && u.email)
    .map(u => ({
      nome: String(u.nome).trim(),
      email: String(u.email).toLowerCase().trim(),
      senha: u.senha ? hashMap[u.senha] : null,
      cpf: u.cpf ? String(u.cpf).replace(/\D/g, '') || null : null,
      tel: u.tel ? String(u.tel).replace(/\D/g, '') || null : null,
      nasc: u.nasc || null,
      genero: GENEROS_VALIDOS.includes(u.genero) ? u.genero : '',
      status: ['ativo', 'pendente', 'bloqueado', 'inativo'].includes(u.status) ? u.status : 'ativo',
      creditos: Number(u.creditos) || 0,
    }));

  const result = await User.insertMany(docs, { ordered: false }).catch(err => {
    if (err.insertedDocs) return { insertedCount: err.insertedDocs.length };
    throw err;
  });

  const importados = result.insertedCount ?? result.length;
  res.json({ importados, erros: docs.length - importados });
};

module.exports = { me, atualizarMe, alterarSenha, listar, buscarPorId, atualizar, remover, importar };
