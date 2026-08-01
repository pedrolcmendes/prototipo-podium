const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { broadcast } = require('../utils/live');
const { cancelarReferenciaPendente } = require('../services/paymentReference.service');
const { cancelarPagamentosPendentes } = require('../services/paymentCancellation.service');
const { sanitizeRegistrationForAdmin } = require('../utils/adminPermissions');
const { paymentExpirationDate } = require('../utils/paymentTimeout');

const minhasInscricoes = async (req, res) => {
  const registrations = await Registration.find({ userId: req.user._id })
    .populate('eventId', 'nome data hora local status categoria tipoInscricao imagem preco')
    .populate('paymentId', 'metodo status paidAt createdAt updatedAt')
    .sort({ createdAt: -1 });
  res.json(registrations);
};

const listar = async (req, res) => {
  const registrations = await Registration.find({})
    .populate('userId', 'nome email tel')
    .populate('eventId', 'nome data hora local status preco')
    .sort({ createdAt: -1 });
  res.json(registrations.map((registration) => sanitizeRegistrationForAdmin(registration, req.user)));
};

const porEvento = async (req, res) => {
  const registrations = await Registration.find({ eventId: req.params.eventId })
    .populate('userId', 'nome email tel')
    .sort({ createdAt: 1 });
  res.json(registrations.map((registration) => sanitizeRegistrationForAdmin(registration, req.user)));
};

const inscrever = async (req, res) => {
  const [event, settings] = await Promise.all([
    Event.findById(req.params.eventId),
    Settings.findById('global'),
  ]);
  if (!event) return res.status(404).json({ message: 'Evento não encontrado' });

  const individual = event.tipoInscricao !== 'dupla';
  const parceiro = req.body.parceiro?.trim() || null;
  const nivel = req.body.nivel?.toUpperCase() || null;
  const payment = req.body.payment || 'pix';
  const genero = ['masculino', 'feminino'].includes(req.user.genero) ? req.user.genero : null;

  if (!['pix', 'credito', 'cartao', 'creditos'].includes(payment)) {
    return res.status(400).json({ message: 'Forma de pagamento inválida' });
  }

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

  if (jaInscrito && (jaInscrito.status === 'confirmada' || jaInscrito.status === 'pendente_pagamento')) {
    return res.status(409).json({ message: jaInscrito.status === 'pendente_pagamento' ? 'Você já tem uma inscrição pendente de pagamento' : 'Você já está inscrito neste evento' });
  }

  const valorTotal = individual ? event.preco : event.preco * 2;
  const registrationData = {
    userId: req.user._id,
    userName: req.user.nome,
    eventId: event._id,
    eventNome: event.nome,
    preco: event.preco,
    valorTotal,
    genero: individual ? genero : null,
    nivel: individual ? nivel : null,
    parceiro: individual ? null : parceiro,
    precoDupla: individual ? null : event.preco * 2,
    creditosAplicados: 0,
    creditosEstornados: 0,
    paymentExpiresAt: paymentExpirationDate(settings),
    status: 'pendente_pagamento',
  };

  let registration;
  let creditosAplicados = 0;

  if (payment === 'creditos') {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const freshUser = await User.findById(req.user._id).select('creditos').session(session);
        if (!freshUser) throw new Error('Cliente não encontrado');

        creditosAplicados = Math.min(freshUser.creditos || 0, valorTotal);
        if (creditosAplicados > 0) {
          const debit = await User.updateOne(
            { _id: req.user._id, creditos: { $gte: creditosAplicados } },
            { $inc: { creditos: -creditosAplicados } },
            { session },
          );
          if (debit.modifiedCount !== 1) throw new Error('Saldo de créditos alterado. Tente novamente.');
        }

        const data = {
          ...registrationData,
          creditosAplicados,
          paymentExpiresAt: creditosAplicados === valorTotal ? null : registrationData.paymentExpiresAt,
          status: creditosAplicados === valorTotal ? 'confirmada' : 'pendente_pagamento',
        };

        if (jaInscrito) {
          registration = await Registration.findByIdAndUpdate(
            jaInscrito._id,
            { $set: data },
            { new: true, session, runValidators: true },
          );
        } else {
          [registration] = await Registration.create([data], { session });
        }
      });
    } catch (error) {
      console.error('Erro ao aplicar créditos Arena na inscrição:', error.message);
      const conflitoSaldo = error.message.includes('Saldo de créditos alterado');
      return res.status(conflitoSaldo ? 409 : 500).json({
        message: conflitoSaldo
          ? error.message
          : 'Não foi possível aplicar os créditos Arena. Nenhum crédito foi descontado.',
      });
    } finally {
      await session.endSession();
    }
    if (creditosAplicados > 0) broadcast('users');
  } else if (jaInscrito) {
    registration = await Registration.findByIdAndUpdate(
      jaInscrito._id,
      { $set: registrationData },
      { new: true, runValidators: true },
    );
  } else {
    registration = await Registration.create(registrationData);
  }

  broadcast('registrations');
  return res.status(jaInscrito ? 200 : 201).json(registration);
};

const cancelar = async (req, res) => {
  const registration = await Registration.findById(req.params.id);
  if (!registration) return res.status(404).json({ message: 'Inscrição não encontrada' });

  const ehDono = registration.userId.toString() === req.user._id.toString();
  if (!req.user.admin && !ehDono) {
    return res.status(403).json({ message: 'Sem permissão' });
  }

  if (registration.status === 'pendente_pagamento') {
    try {
      await cancelarPagamentosPendentes('registration', registration._id);
    } catch (error) {
      console.error('Erro ao cancelar cobrança pendente:', error.message);
      return res.status(error.status || 502).json({
        message: error.status === 409
          ? error.message
          : 'Não foi possível cancelar a cobrança no Mercado Pago. Tente novamente.',
      });
    }
    const { referencia, creditosEstornados } = await cancelarReferenciaPendente('registration', registration._id);
    return res.json({ message: 'Inscrição cancelada', registration: referencia || registration, creditosEstornados });
  }

  if (registration.status === 'confirmada') {
    const session = await mongoose.startSession();
    let inscricaoCancelada = null;
    let creditosEstornados = 0;
    try {
      await session.withTransaction(async () => {
        inscricaoCancelada = await Registration.findOne({
          _id: registration._id,
          status: 'confirmada',
        }).session(session);
        if (!inscricaoCancelada) return;

        const valorPago = Number(
          inscricaoCancelada.valorTotal
          ?? inscricaoCancelada.precoDupla
          ?? inscricaoCancelada.preco,
        );
        creditosEstornados = Math.max(
          0,
          valorPago - (inscricaoCancelada.creditosEstornados || 0),
        );

        inscricaoCancelada.status = 'cancelada';
        inscricaoCancelada.paymentExpiresAt = null;
        inscricaoCancelada.creditosEstornados = (
          inscricaoCancelada.creditosEstornados || 0
        ) + creditosEstornados;
        await inscricaoCancelada.save({ session });

        if (creditosEstornados > 0) {
          await User.findByIdAndUpdate(
            inscricaoCancelada.userId,
            { $inc: { creditos: creditosEstornados } },
            { session },
          );
        }
      });
    } catch (error) {
      console.error('Erro ao estornar inscrição em Créditos Arena:', error.message);
      return res.status(500).json({
        message: 'Não foi possível cancelar a inscrição. Nenhum crédito foi alterado.',
      });
    } finally {
      await session.endSession();
    }

    if (!inscricaoCancelada) {
      return res.status(409).json({ message: 'A inscrição já foi alterada. Atualize a página.' });
    }
    broadcast('registrations');
    if (creditosEstornados > 0) broadcast('users');
    return res.json({
      message: 'Inscrição cancelada. O estorno foi creditado em Créditos Arena.',
      registration: inscricaoCancelada,
      creditosEstornados,
    });
  }

  registration.status = 'cancelada';
  registration.paymentExpiresAt = null;
  await registration.save();
  broadcast('registrations');
  return res.json({ message: 'Inscrição cancelada', registration });
};

module.exports = { minhasInscricoes, listar, porEvento, inscrever, cancelar };
