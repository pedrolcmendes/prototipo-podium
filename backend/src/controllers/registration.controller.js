const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { broadcast } = require('../utils/live');

const minhasInscricoes = async (req, res) => {
  const registrations = await Registration.find({ userId: req.user._id })
    .populate('eventId', 'nome data hora local status')
    .sort({ createdAt: -1 });
  res.json(registrations);
};

const listar = async (req, res) => {
  const registrations = await Registration.find({})
    .populate('userId', 'nome email tel')
    .populate('eventId', 'nome data hora local status preco')
    .sort({ createdAt: -1 });
  res.json(registrations);
};

const porEvento = async (req, res) => {
  const registrations = await Registration.find({ eventId: req.params.eventId })
    .populate('userId', 'nome email tel')
    .sort({ createdAt: 1 });
  res.json(registrations);
};

const inscrever = async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) return res.status(404).json({ message: 'Evento não encontrado' });

  const individual = event.tipoInscricao !== 'dupla';
  const parceiro = req.body.parceiro?.trim() || null;
  const nivel = req.body.nivel?.toUpperCase() || null;
  const genero = ['masculino', 'feminino'].includes(req.user.genero) ? req.user.genero : null;

  if (individual && !['A', 'B', 'C', 'D'].includes(nivel)) {
    return res.status(400).json({ message: 'Selecione o nível A, B, C ou D' });
  }
  if (individual && !genero) {
    return res.status(400).json({ message: 'Informe masculino ou feminino no seu perfil antes de se inscrever' });
  }
  if (!individual && !parceiro) {
    return res.status(400).json({ message: 'Informe o nome do(a) parceiro(a)' });
  }

  if (event.status !== 'aberto') {
    return res.status(400).json({ message: 'Inscrições encerradas para este evento' });
  }

  const inscritos = await Registration.countDocuments({
    eventId: event._id,
    status: { $in: ['confirmada', 'pendente_pagamento'] },
  });

  if (inscritos >= event.vagas) {
    return res.status(409).json({ message: 'Evento sem vagas disponíveis' });
  }

  const jaInscrito = await Registration.findOne({
    userId: req.user._id,
    eventId: event._id,
  });

  if (jaInscrito) {
    if (jaInscrito.status === 'confirmada' || jaInscrito.status === 'pendente_pagamento') {
      return res.status(409).json({ message: jaInscrito.status === 'pendente_pagamento' ? 'Você já tem uma inscrição pendente de pagamento' : 'Você já está inscrito neste evento' });
    }
    jaInscrito.status = 'pendente_pagamento';
    jaInscrito.preco = event.preco;
    jaInscrito.valorTotal = individual ? event.preco : event.preco * 2;
    jaInscrito.genero = individual ? genero : null;
    jaInscrito.nivel = individual ? nivel : null;
    jaInscrito.parceiro = individual ? null : parceiro;
    jaInscrito.precoDupla = individual ? null : event.preco * 2;
    await jaInscrito.save();
    broadcast('registrations');
    return res.json(jaInscrito);
  }

  const registration = await Registration.create({
    userId: req.user._id,
    userName: req.user.nome,
    eventId: event._id,
    eventNome: event.nome,
    preco: event.preco,
    valorTotal: individual ? event.preco : event.preco * 2,
    genero: individual ? genero : null,
    nivel: individual ? nivel : null,
    parceiro: individual ? null : parceiro,
    precoDupla: individual ? null : event.preco * 2,
    status: 'pendente_pagamento',
  });

  broadcast('registrations');
  res.status(201).json(registration);
};

const cancelar = async (req, res) => {
  const registration = await Registration.findById(req.params.id);
  if (!registration) return res.status(404).json({ message: 'Inscrição não encontrada' });

  const ehDono = registration.userId.toString() === req.user._id.toString();
  if (!req.user.admin && !ehDono) {
    return res.status(403).json({ message: 'Sem permissão' });
  }

  registration.status = 'cancelada';
  await registration.save();
  broadcast('registrations');
  res.json({ message: 'Inscrição cancelada', registration });
};

module.exports = { minhasInscricoes, listar, porEvento, inscrever, cancelar };
