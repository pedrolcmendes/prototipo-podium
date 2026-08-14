const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { enviarEmailSenhaAlterada } = require('../utils/email');
const { broadcast } = require('../utils/live');
const { isMasterAdmin, sanitizeUserForAdmin } = require('../utils/adminPermissions');

const me = async (req, res) => {
  res.json(req.user.toPublic());
};

const atualizarMe = async (req, res) => {
  const { nome, tel, nasc, genero, cpf } = req.body;
  const updates = {};
  if (nome !== undefined) updates.nome = nome;
  if (tel !== undefined) updates.tel = tel;
  if (nasc !== undefined) updates.nasc = nasc;
  if (genero !== undefined) updates.genero = genero;
  if (cpf !== undefined) updates.cpf = cpf ? String(cpf).replace(/\D/g, '') : null;
  try {
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    broadcast('users');
    res.json(user.toPublic());
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Este CPF já está cadastrado para outro usuário.' });
    throw err;
  }
};

const alterarSenha = async (req, res) => {
  const { senhaAtual, novaSenha } = req.body;
  if (!novaSenha) return res.status(400).json({ message: 'Informe a nova senha' });
  if (novaSenha.length < 6) return res.status(400).json({ message: 'A nova senha deve ter pelo menos 6 caracteres' });

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  const criandoPrimeiraSenha = !user.senha;

  // Contas criadas via Google não possuem senha inicial. Como a rota exige uma
  // sessão autenticada, o usuário pode cadastrar sua primeira senha no painel.
  if (user.senha) {
    if (!senhaAtual) return res.status(400).json({ message: 'Informe a senha atual' });
    const ok = await user.verificarSenha(senhaAtual);
    if (!ok) return res.status(400).json({ message: 'Senha atual incorreta' });
  }

  user.senha = novaSenha;
  user.resetToken = null;
  user.resetTokenExpires = null;
  await user.save();
  res.json({
    message: criandoPrimeiraSenha ? 'Senha configurada com sucesso' : 'Senha alterada com sucesso',
    user: user.toPublic(),
  });
};

const listar = async (req, res) => {
  const users = await User.find().select('-senha').sort({ createdAt: -1 });
  res.json(users.map((user) => sanitizeUserForAdmin(user, req.user)));
};

const buscarPorId = async (req, res) => {
  const user = await User.findById(req.params.id).select('-senha');
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  res.json(sanitizeUserForAdmin(user, req.user));
};

const atualizar = async (req, res) => {
  const ehMaster = isMasterAdmin(req.user);
  const ehProprioUsuario = req.user._id.toString() === req.params.id;

  const alvo = await User.findById(req.params.id);
  if (!alvo) return res.status(404).json({ message: 'Usuário não encontrado' });
  if (!ehMaster && isMasterAdmin(alvo)) {
    return res.status(403).json({ message: 'Apenas um Administrador Master pode editar outro Master' });
  }

  const camposPermitidos = ['nome', 'tel', 'nasc', 'genero'];
  camposPermitidos.push('status');
  if (ehMaster) camposPermitidos.push('creditos', 'admin', 'adminRole');

  const atualizacoes = {};
  camposPermitidos.forEach((campo) => {
    if (req.body[campo] !== undefined) atualizacoes[campo] = req.body[campo];
  });

  // admin não pode remover o próprio acesso (evita perder o painel sem querer)
  if ((atualizacoes.admin === false || atualizacoes.adminRole === 'admin') && ehProprioUsuario) {
    return res.status(400).json({ message: 'Você não pode remover seu próprio acesso admin' });
  }

  if (ehMaster && atualizacoes.admin !== undefined) {
    atualizacoes.adminRole = atualizacoes.admin
      ? (['admin', 'master'].includes(req.body.adminRole) ? req.body.adminRole : 'admin')
      : null;
  } else if (ehMaster && atualizacoes.adminRole !== undefined) {
    atualizacoes.admin = true;
  }

  if (req.body.senha) {
    alvo.senha = req.body.senha;
    await alvo.save();
    enviarEmailSenhaAlterada({ destinatario: alvo.email, nome: alvo.nome }).catch(() => {});
    delete atualizacoes.senha;
  }

  const user = await User.findByIdAndUpdate(req.params.id, atualizacoes, {
    new: true,
    runValidators: true,
  }).select('-senha');

  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  broadcast('users');
  res.json(sanitizeUserForAdmin(user, req.user));
};

const remover = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  broadcast('users');
  res.json({ message: 'Usuário removido' });
};

const importar = async (req, res) => {
  const lista = req.body;
  console.log('[importar] lista recebida:', Array.isArray(lista), lista?.length);
  console.log('[importar] primeiro item:', JSON.stringify(lista?.[0]));
  if (!Array.isArray(lista) || !lista.length) {
    return res.status(400).json({ message: 'Envie um array de usuários' });
  }

  // hash único para senha padrão compartilhada (evita N bcrypt calls)
  const senhasUnicas = [...new Set(lista.map(u => u.senha).filter(Boolean))];
  const hashMap = {};
  await Promise.all(senhasUnicas.map(async s => { hashMap[s] = await bcrypt.hash(s, 10); }));

  const GENEROS_VALIDOS = ['masculino', 'feminino', 'nao_informar', ''];
  const docs = lista
    .filter(u => u.nome && u.email)
    .map(u => {
      const doc = {
        nome: String(u.nome).trim(),
        email: String(u.email).toLowerCase().trim(),
        senha: u.senha ? hashMap[u.senha] : null,
        genero: GENEROS_VALIDOS.includes(u.genero) ? u.genero : '',
        status: ['ativo', 'pendente', 'bloqueado', 'inativo'].includes(u.status) ? u.status : 'ativo',
        creditos: Number(u.creditos) || 0,
      };
      // omitir campos opcionais sem valor — índice sparse do CPF só ignora
      // documentos que NÃO têm o campo; null explícito causaria conflito único
      const cpf = u.cpf ? String(u.cpf).replace(/\D/g, '') : '';
      if (cpf) doc.cpf = cpf;
      const tel = u.tel ? String(u.tel).replace(/\D/g, '') : '';
      if (tel) doc.tel = tel;
      if (u.nasc) doc.nasc = u.nasc;
      if (u.createdAt) {
        const d = new Date(u.createdAt);
        if (!isNaN(d)) { doc.createdAt = d; doc.updatedAt = d; }
      }
      return doc;
    });

  console.log('[importar] docs após filtro:', docs.length);
  console.log('[importar] primeiro doc:', JSON.stringify(docs[0]));

  let importados = 0;
  try {
    const result = await User.collection.insertMany(docs, { ordered: false });
    console.log('[importar] result:', JSON.stringify(result));
    importados = result.insertedCount;
  } catch (err) {
    console.error('[importar] erro:', err.code, err.message);
    console.error('[importar] nInserted:', err.result?.nInserted, 'insertedCount:', err.insertedCount);
    importados = err.result?.nInserted ?? err.insertedCount ?? 0;
  }

  console.log('[importar] importados:', importados, 'erros:', docs.length - importados);
  broadcast('users');
  res.json({ importados, erros: docs.length - importados });
};

const limparNaoAdmins = async (req, res) => {
  const result = await User.deleteMany({ admin: { $ne: true } });
  broadcast('users');
  res.json({ removidos: result.deletedCount });
};

module.exports = { me, atualizarMe, alterarSenha, listar, buscarPorId, atualizar, remover, importar, limparNaoAdmins };
