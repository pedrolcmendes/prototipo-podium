const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const BlockedSlot = require('../models/BlockedSlot');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { enviarEmailReservaConfirmada, enviarEmailCancelamentoAdmin } = require('../utils/email');
const { broadcast } = require('../utils/live');

const COURT_TYPE_BY_ID = {
  'coberta-1': 'coberta',
  'coberta-2': 'coberta',
  'areia-1': 'descoberta',
  'areia-2': 'descoberta',
  'areia-3': 'descoberta',
  'PKB-DU': 'pickleball',
};
const BOOKING_MODALITIES = new Set(['beach-tennis', 'futevolei', 'volei', 'pickleball']);
const BOOKING_PAYMENTS = new Set(['pix', 'credito', 'debito', 'dinheiro']);
const BOOKING_COURT_TYPES = new Set(['coberta', 'descoberta', 'areia', 'pickleball']);
const localDateIso = (date = new Date()) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

const concluirReservasRealizadas = async () => {
  const now = new Date();
  const today = localDateIso(now);
  const currentHour = now.getHours();

  const pastResult = await Booking.updateMany(
    { status: 'confirmada', date: { $lt: today } },
    { $set: { status: 'concluida' } },
  );

  const todayBookings = await Booking.find({
    status: 'confirmada',
    date: today,
    dayUse: false,
  }).select('_id slots');

  const completedTodayIds = todayBookings
    .filter((booking) => {
      const slots = (booking.slots || []).map(Number).filter(Number.isFinite);
      return slots.length > 0 && Math.max(...slots) + 1 <= currentHour;
    })
    .map((booking) => booking._id);

  let todayModified = 0;
  if (completedTodayIds.length) {
    const todayResult = await Booking.updateMany(
      { _id: { $in: completedTodayIds }, status: 'confirmada' },
      { $set: { status: 'concluida' } },
    );
    todayModified = todayResult.modifiedCount || 0;
  }

  return (pastResult.modifiedCount || 0) + todayModified;
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
  res.json(bookings);
};

const criar = async (req, res) => {
  const { modalidade, quadra, quadraId, date, slots, dayUse, payment, total, userId: bodyUserId } = req.body;
  const isDayUse = Boolean(dayUse);
  const normalizedSlots = Array.isArray(slots)
    ? [...new Set(slots.map(Number).filter((slot) => Number.isInteger(slot) && slot >= 0 && slot <= 23))]
    : [];
  const resolvedQuadra = quadra || COURT_TYPE_BY_ID[quadraId];
  const numericTotal = Number(total);

  if (!BOOKING_MODALITIES.has(modalidade)) return res.status(400).json({ message: 'Modalidade inválida' });
  if (!BOOKING_PAYMENTS.has(payment)) return res.status(400).json({ message: 'Forma de pagamento inválida' });
  if (!req.user.admin && payment === 'dinheiro') return res.status(400).json({ message: 'Selecione PIX, crédito ou débito para pagar online' });
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: 'Informe uma data válida' });
  if (date < localDateIso()) return res.status(400).json({ message: 'Não é possível criar reservas em datas passadas' });
  if (!quadraId || !BOOKING_COURT_TYPES.has(resolvedQuadra)) return res.status(400).json({ message: 'Informe uma quadra válida' });
  if (!isDayUse && normalizedSlots.length === 0) return res.status(400).json({ message: 'Selecione pelo menos um horário' });
  if (!Number.isFinite(numericTotal) || numericTotal < 0) return res.status(400).json({ message: 'Valor da reserva inválido' });
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
    ? await User.findById(targetUserId).select('nome email')
    : req.user;
  if (!targetUser) return res.status(404).json({ message: 'Cliente não encontrado' });

  const isAdmin = req.user.admin;
  const booking = await Booking.create({
    userId: targetUserId,
    userName: targetUser.nome,
    modalidade,
    quadra: resolvedQuadra,
    quadraId,
    date,
    slots: normalizedSlots,
    dayUse: isDayUse,
    payment,
    total: numericTotal,
    status: isAdmin ? 'confirmada' : 'pendente_pagamento',
  });

  // E-mail de confirmação só para reservas já confirmadas (admin)
  if (isAdmin && settings?.notifEmailConfirm !== false) {
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
    ? ['status', 'payment', 'slots', 'quadraId', 'date', 'total']
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

  // Cancelamento permitido até cancelWindow horas antes do horário da reserva
  if (!req.user.admin) {
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

  booking.status = 'cancelada';
  await booking.save();

  // Estorna como créditos no site (não devolve ao banco)
  if (booking.total > 0) {
    await User.findByIdAndUpdate(booking.userId, { $inc: { creditos: booking.total } });
    broadcast('users'); // saldo de créditos mudou
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

  res.json({ message: 'Reserva cancelada', booking, creditosEstornados: booking.total });
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
