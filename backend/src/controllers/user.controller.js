const User = require('../models/User');

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

module.exports = { me, atualizarMe, alterarSenha, listar, buscarPorId, atualizar, remover };
