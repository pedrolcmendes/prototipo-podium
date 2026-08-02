const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const BlockedSlot = require('../models/BlockedSlot');
const User = require('../models/User');
const Settings = require('../models/Settings');
const PaymentModel = require('../models/Payment');
const { cancelarReferenciaPendente } = require('../services/paymentReference.service');
const { cancelarPagamentosPendentes } = require('../services/paymentCancellation.service');
const { enviarEmailReservaConfirmada, enviarEmailCancelamentoAdmin } = require('../utils/email');
const { broadcast } = require('../utils/live');
const { isMasterAdmin, sanitizeBookingForAdmin } = require('../utils/adminPermissions');
const { arenaDateTimeParts, bookingScheduleStatus } = require('../utils/arenaDateTime');
const { paymentExpirationDate } = require('../utils/paymentTimeout');

const COURT_TYPE_BY_ID = {
  'coberta-1': 'coberta',
  'coberta-2': 'coberta',
  'areia-1': 'descoberta',
  'areia-2': 'descoberta',
  'areia-3': 'descoberta',
  'PKB-DU': 'pickleball',
  'teste-1': 'teste',
};
const BOOKING_MODALITIES = new Set(['beach-tennis', 'futevolei', 'volei', 'pickleball']);
const BOOKING_PAYMENTS = new Set(['pix', 'credito', 'creditos', 'cartao']);
const BOOKING_COURT_TYPES = new Set(['coberta', 'descoberta', 'areia', 'pickleball', 'teste']);

const DAY_USE_PRICE = 25;

function calcularPrecoSlot(hora, tipoQuadra, isFimDeSemana) {
  if (tipoQuadra === 'teste') return 1.00;
  const coberta = tipoQuadra === 'coberta';
  if (isFimDeSemana) {
    if (hora < 11) return coberta ? 80 : 60;
    if (hora < 14) return coberta ? 60 : 50;
    return coberta ? 100 : 80;
  }
  if (hora < 16) return coberta ? 60 : 50;
  if (hora < 18) return coberta ? 80 : 60;
  if (hora < 21) return coberta ? 100 : 80;
  return coberta ? 80 : 60;
}
const localDateIso = (date = new Date()) => arenaDateTimeParts(date).date;

const concluirReservasRealizadas = async () => {
  const now = new Date();
  const today = localDateIso(now);

  const pastResult = await Booking.updateMany(
    { status: 'confirmada', date: { $lt: today } },
    { $set: { status: 'concluida' } },
  );

  // Corrige reservas marcadas cedo demais por servidores configurados em UTC.
  const futureResult = await Booking.updateMany(
    { status: 'concluida', date: { $gt: today } },
    { $set: { status: 'confirmada' } },
  );

  const todayBookings = await Booking.find({
    status: { $in: ['confirmada', 'concluida'] },
    date: today,
    dayUse: false,
  }).select('_id date slots dayUse status');

  const corrections = todayBookings
    .map((booking) => ({ booking, status: bookingScheduleStatus(booking, now) }))
    .filter(({ booking, status }) => status !== booking.status)
    .map(({ booking, status }) => ({
      updateOne: {
        filter: { _id: booking._id, status: booking.status },
        update: { $set: { status } },
      },
    }));

  const todayResult = corrections.length
    ? await Booking.bulkWrite(corrections)
    : { modifiedCount: 0 };

  return (pastResult.modifiedCount || 0)
    + (futureResult.modifiedCount || 0)
    + (todayResult.modifiedCount || 0);
};

const verificarConflito = async (quadraId, date, slots, excludeId = null) => {
  const query = { quadraId, date, status: { $ne: 'cancelada' }, slots: { $in: slots } };
  if (excludeId) query._id = { $ne: excludeId };
  const conflito = await Booking.findOne(query);
  if (conflito) return true;

  const bloqueio = await BlockedSlot.findOne({ courtId: quadraId, date, hour: { $in: slots } });
  return !!bloqueio;
};

const listarMinhas = async (req, res) => {
  const concluidas = await concluirReservasRealizadas();
  const filtro = { userId: req.user._id };
  if (req.query.status) filtro.status = req.query.status;
  const bookings = await Booking.find(filtro)
    .populate('userId', 'nome email')
    .populate('paymentId', 'metodo status paidAt createdAt updatedAt')
    .sort({ createdAt: -1 }); // última reserva feita aparece primeiro
  if (concluidas) broadcast('bookings');
  res.json(bookings);
};

const listar = async (req, res) => {
  const concluidas = await concluirReservasRealizadas();
  const filtro = req.user.admin ? {} : { userId: req.user._id };

  if (req.query.status) filtro.status = req.query.status;
  if (req.query.quadra) filtro.quadra = req.query.quadra;
  if (req.query.date) filtro.date = req.query.date;

  const bookings = await Booking.find(filtro)
    .populate('userId', 'nome email')
    .sort({ createdAt: -1 }); // última reserva feita aparece primeiro
  if (concluidas) broadcast('bookings');
  res.json(req.user.admin
    ? bookings.map((booking) => sanitizeBookingForAdmin(booking, req.user))
    : bookings);
};

const criar = async (req, res) => {
  const { modalidade, quadra, quadraId, date, slots, dayUse, payment, userId: bodyUserId } = req.body;
  const isDayUse = Boolean(dayUse);
  const normalizedSlots = Array.isArray(slots)
    ? [...new Set(slots.map(Number).filter((slot) => Number.isInteger(slot) && slot >= 0 && slot <= 23))]
    : [];
  const resolvedQuadra = quadra || COURT_TYPE_BY_ID[quadraId];

  if (!BOOKING_MODALITIES.has(modalidade)) return res.status(400).json({ message: 'Modalidade inválida' });
  if (!BOOKING_PAYMENTS.has(payment)) return res.status(400).json({ message: 'Forma de pagamento inválida' });
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: 'Informe uma data válida' });
  if (date < localDateIso()) return res.status(400).json({ message: 'Não é possível criar reservas em datas passadas' });
  if (!quadraId || !BOOKING_COURT_TYPES.has(resolvedQuadra)) return res.status(400).json({ message: 'Informe uma quadra válida' });
  if (!isDayUse && normalizedSlots.length === 0) return res.status(400).json({ message: 'Selecione pelo menos um horário' });

  const isFimDeSemana = [0, 6].includes(new Date(`${date}T12:00:00`).getDay());
  const serverTotal = isDayUse
    ? DAY_USE_PRICE
    : normalizedSlots.reduce((acc, h) => acc + calcularPrecoSlot(h, resolvedQuadra, isFimDeSemana), 0);
  // No fluxo público, inclusive um administrador reserva para a própria conta
  // sem enviar userId. O campo só é obrigatório/validado quando o painel interno
  // escolhe explicitamente outro cliente.
  if (bodyUserId !== undefined && (!req.user.admin || !mongoose.isValidObjectId(bodyUserId))) {
    return res.status(400).json({ message: 'Selecione um cliente válido' });
  }

  if (!isDayUse && await verificarConflito(quadraId, date, normalizedSlots)) {
    return res.status(409).json({ message: 'Horário já reservado ou bloqueado' });
  }

  const settings = await Settings.findById('global');

  // Antecedência máxima de reserva (admin pode ignorar)
  if (!req.user.admin && date && settings?.maxAdvanceDays) {
    const limite = new Date(Date.now() + settings.maxAdvanceDays * 86400000);
    const limiteStr = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, '0')}-${String(limite.getDate()).padStart(2, '0')}`;
    if (date > limiteStr) {
      return res.status(400).json({ message: `Reservas permitidas com no máximo ${settings.maxAdvanceDays} dias de antecedência.` });
    }
  }

  const targetUserId = (req.user.admin && bodyUserId) ? bodyUserId : req.user._id;
  const targetUser = req.user.admin
    ? await User.findById(targetUserId).select('nome email creditos')
    : req.user;
  if (!targetUser) return res.status(404).json({ message: 'Cliente não encontrado' });

  const existePendente = await Booking.findOne({ userId: targetUserId, status: 'pendente_pagamento' });
  if (existePendente) {
    return res.status(409).json({ message: 'Você já tem uma reserva com pagamento pendente. Conclua ou cancele antes de criar uma nova.' });
  }

  const bookingData = {
    userId: targetUserId,
    userName: targetUser.nome,
    modalidade,
    quadra: resolvedQuadra,
    quadraId,
    date,
    slots: normalizedSlots,
    dayUse: isDayUse,
    payment,
    total: serverTotal,
    creditosAplicados: 0,
    paymentExpiresAt: paymentExpirationDate(settings),
    foiPago: false,
    status: 'pendente_pagamento',
  };

  let booking;
  let creditosAplicados = 0;
  let pagoComCreditos = false;

  if (payment === 'creditos') {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const freshUser = await User.findById(targetUserId).select('creditos').session(session);
        if (!freshUser) throw new Error('Cliente não encontrado');

        creditosAplicados = Math.min(freshUser.creditos || 0, serverTotal);
        pagoComCreditos = creditosAplicados === serverTotal;

        if (creditosAplicados > 0) {
          const debit = await User.updateOne(
            { _id: targetUserId, creditos: { $gte: creditosAplicados } },
            { $inc: { creditos: -creditosAplicados } },
            { session },
          );
          if (debit.modifiedCount !== 1) throw new Error('Saldo de créditos alterado. Tente novamente.');
        }

        [booking] = await Booking.create([{
          ...bookingData,
          creditosAplicados,
          paymentExpiresAt: pagoComCreditos ? null : bookingData.paymentExpiresAt,
          foiPago: pagoComCreditos,
          status: pagoComCreditos ? 'confirmada' : 'pendente_pagamento',
        }], { session });
      });
    } catch (error) {
      console.error('Erro ao aplicar créditos Arena:', error.message);
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
  } else {
    booking = await Booking.create(bookingData);
  }

  // Enviar e-mail para reservas confirmadas na hora (créditos totais)
  if (pagoComCreditos && settings?.notifEmailConfirm !== false) {
    User.findById(targetUserId).select('nome email')
      .then((u) => u && enviarEmailReservaConfirmada({ destinatario: u.email, nome: u.nome, reserva: booking }))
      .catch((e) => console.warn('Falha no e-mail de confirmação:', e.message));
  }

  broadcast('bookings');
  res.status(201).json(booking);
};

const atualizar = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Reserva não encontrada' });

  const ehDono = booking.userId.toString() === req.user._id.toString();
  if (!req.user.admin && !ehDono) {
    return res.status(403).json({ message: 'Sem permissão para editar esta reserva' });
  }

  const campos = req.user.admin
    ? (isMasterAdmin(req.user)
      ? ['status', 'payment', 'slots', 'quadraId', 'date', 'total']
      : ['status', 'slots', 'quadraId', 'date'])
    : ['payment'];

  campos.forEach((c) => { if (req.body[c] !== undefined) booking[c] = req.body[c]; });
  await booking.save();
  broadcast('bookings');
  res.json(booking);
};

const cancelar = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Reserva não encontrada' });
  if (booking.status === 'cancelada') {
    return res.json({ message: 'Reserva já estava cancelada', booking, creditosEstornados: 0 });
  }

  const ehDono = booking.userId.toString() === req.user._id.toString();
  if (!req.user.admin && !ehDono) {
    return res.status(403).json({ message: 'Sem permissão' });
  }

  if (booking.status === 'pendente_pagamento') {
    try {
      await cancelarPagamentosPendentes('booking', booking._id);
    } catch (error) {
      console.error('Erro ao cancelar cobrança pendente:', error.message);
      return res.status(error.status || 502).json({
        message: error.status === 409
          ? error.message
          : 'Não foi possível cancelar a cobrança no Mercado Pago. Tente novamente.',
      });
    }
    const cancelamento = await cancelarReferenciaPendente('booking', booking._id);
    return res.json({
      message: 'Reserva cancelada',
      booking: cancelamento.referencia || booking,
      creditosEstornados: cancelamento.creditosEstornados,
    });
  }

  // Reserva nunca paga pode ser cancelada a qualquer momento sem restrição de tempo
  // Cancelamento permitido até cancelWindow horas antes do horário da reserva
  if (!req.user.admin && booking.status !== 'pendente_pagamento') {
    const settings = await Settings.findById('global') || { cancelWindow: 24 };
    const firstSlot = booking.slots?.length > 0 ? Math.min(...booking.slots) : 8;
    const bookingDateTime = new Date(`${booking.date}T${String(firstSlot).padStart(2, '0')}:00:00`);
    const hoursUntilBooking = (bookingDateTime.getTime() - Date.now()) / 3600000;

    if (hoursUntilBooking < settings.cancelWindow) {
      return res.status(403).json({
        message: `Cancelamento não permitido. É necessário cancelar com pelo menos ${settings.cancelWindow}h de antecedência.`,
        cancelWindow: settings.cancelWindow,
      });
    }
  }

  const statusAnterior = booking.status;
  booking.status = 'cancelada';
  booking.paymentExpiresAt = null;
  await booking.save();

  // Bloqueia payment pendente para o webhook não reativar a reserva cancelada
  if (statusAnterior === 'pendente_pagamento' && booking.paymentId) {
    await PaymentModel.findByIdAndUpdate(booking.paymentId, { status: 'cancelado' }).catch(() => {});
  }

  // Créditos a devolver:
  // - reserva confirmada (paga): devolve o total completo como créditos
  // - reserva pendente com créditos aplicados: devolve só os créditos que foram debitados
  const paymentRecord = booking.paymentId
    ? await PaymentModel.findById(booking.paymentId).select('status')
    : null;
  const pagamentoExternoRevertido = ['estornado', 'chargeback', 'estornado_creditos']
    .includes(paymentRecord?.status);
  const creditosARefundar = statusAnterior === 'confirmada'
    ? (pagamentoExternoRevertido ? (booking.creditosAplicados || 0) : booking.total)
    : (booking.creditosAplicados || 0);

  if (creditosARefundar > 0) {
    await User.findByIdAndUpdate(booking.userId, { $inc: { creditos: creditosARefundar } });
    broadcast('users');
  }
  broadcast('bookings');

  // Alerta de cancelamento para o admin (sem bloquear a resposta)
  Settings.findById('global')
    .then((s) => {
      if (s?.notifCancelAlert === false) return;
      const destinatario = s?.email || process.env.EMAIL_USER;
      if (!destinatario) return;
      return enviarEmailCancelamentoAdmin({ destinatario, reserva: booking, canceladoPor: req.user.nome });
    })
    .catch((e) => console.warn('Falha no alerta de cancelamento:', e.message));

  res.json({ message: 'Reserva cancelada', booking, creditosEstornados: creditosARefundar });
};

const horariosOcupados = async (req, res) => {
  const { quadraId, date } = req.query;
  if (!quadraId || !date) {
    return res.status(400).json({ message: 'Informe quadraId e date' });
  }

  const reservas = await Booking.find({ quadraId, date, status: { $ne: 'cancelada' } }).select('slots');
  const bloqueios = await BlockedSlot.find({ courtId: quadraId, date }).select('hour');

  const ocupados = [
    ...reservas.flatMap((b) => b.slots),
    ...bloqueios.map((b) => b.hour),
  ];

  res.json([...new Set(ocupados)]);
};

const importar = async (req, res) => {
  const lista = req.body;
  if (!Array.isArray(lista) || lista.length === 0) {
    return res.status(400).json({ message: 'Envie um array de agendamentos' });
  }

  const docs = lista.map(({ _id, __v, createdAt, updatedAt, ...rest }) => rest);

  const result = await Booking.insertMany(docs, { ordered: false }).catch((err) => {
    if (err.insertedDocs) return { insertedCount: err.insertedDocs.length };
    throw err;
  });

  broadcast('bookings');
  res.status(201).json({ importados: result.insertedCount ?? result.length });
};

module.exports = { listarMinhas, listar, criar, atualizar, cancelar, horariosOcupados, importar };
