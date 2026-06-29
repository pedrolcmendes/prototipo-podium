const Booking = require('../models/Booking');
const BlockedSlot = require('../models/BlockedSlot');
const User = require('../models/User');
const Settings = require('../models/Settings');

const verificarConflito = async (quadraId, date, slots, excludeId = null) => {
  const query = { quadraId, date, status: { $ne: 'cancelada' }, slots: { $in: slots } };
  if (excludeId) query._id = { $ne: excludeId };
  const conflito = await Booking.findOne(query);
  if (conflito) return true;

  const bloqueio = await BlockedSlot.findOne({ courtId: quadraId, date, hour: { $in: slots } });
  return !!bloqueio;
};

const listarMinhas = async (req, res) => {
  const filtro = { userId: req.user._id };
  if (req.query.status) filtro.status = req.query.status;
  const bookings = await Booking.find(filtro)
    .populate('userId', 'nome email')
    .sort({ date: -1, createdAt: -1 });
  res.json(bookings);
};

const listar = async (req, res) => {
  const filtro = req.user.admin ? {} : { userId: req.user._id };

  if (req.query.status) filtro.status = req.query.status;
  if (req.query.quadra) filtro.quadra = req.query.quadra;
  if (req.query.date) filtro.date = req.query.date;

  const bookings = await Booking.find(filtro)
    .populate('userId', 'nome email')
    .sort({ date: -1, createdAt: -1 });
  res.json(bookings);
};

const criar = async (req, res) => {
  const { modalidade, quadra, quadraId, date, slots, dayUse, payment, total, userId: bodyUserId, userName: bodyUserName } = req.body;

  if (!dayUse && slots?.length && await verificarConflito(quadraId, date, slots)) {
    return res.status(409).json({ message: 'Horário já reservado ou bloqueado' });
  }

  const targetUserId = (req.user.admin && bodyUserId) ? bodyUserId : req.user._id;
  const targetUserName = (req.user.admin && bodyUserName) ? bodyUserName : req.user.nome;

  const booking = await Booking.create({
    userId: targetUserId,
    userName: targetUserName,
    modalidade,
    quadra,
    quadraId,
    date,
    slots,
    dayUse: dayUse || false,
    payment,
    total,
  });

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
  res.json(booking);
};

const cancelar = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Reserva não encontrada' });

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
  if (ehDono && booking.total > 0) {
    await User.findByIdAndUpdate(booking.userId, { $inc: { creditos: booking.total } });
  }

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

  res.status(201).json({ importados: result.insertedCount ?? result.length });
};

module.exports = { listarMinhas, listar, criar, atualizar, cancelar, horariosOcupados, importar };
