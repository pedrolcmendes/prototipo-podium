const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const BlockedSlot = require('../models/BlockedSlot');
const Season = require('../models/Season');
const User = require('../models/User');
const { broadcast } = require('../utils/live');
const {
  COURTS,
  brazilianHolidays,
  generateDates,
  normalizeDiscount,
  priceForHour,
  toDate,
} = require('../utils/season');

const MODALITIES = new Set(['beach-tennis', 'futevolei', 'volei', 'pickleball']);
const PAYMENTS = new Set(['pix', 'credito', 'debito', 'dinheiro']);

function validatePayload(body) {
  const court = COURTS[body.courtId];
  if (!body.userId) throw new Error('Selecione um cliente');
  if (!court) throw new Error('Selecione uma quadra válida');
  if (!MODALITIES.has(body.modalidade)) throw new Error('Selecione uma modalidade válida');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.startDate || '') || !/^\d{4}-\d{2}-\d{2}$/.test(body.endDate || '')) {
    throw new Error('Informe o período da temporada');
  }
  if (body.startDate > body.endDate) throw new Error('A data final deve ser posterior à inicial');
  if (Number.isNaN(toDate(body.startDate).getTime()) || Number.isNaN(toDate(body.endDate).getTime())) {
    throw new Error('Informe datas válidas');
  }
  const startHour = Number(body.startHour);
  const endHour = Number(body.endHour);
  if (!Number.isInteger(startHour) || !Number.isInteger(endHour) || startHour < 0 || endHour > 24 || endHour <= startHour) {
    throw new Error('Informe um horário válido em horas inteiras');
  }
  if (endHour - startHour > 12) throw new Error('A duração máxima por reserva é de 12 horas');
  if (!['daily', 'weekly'].includes(body.recurrence?.type)) throw new Error('Selecione a recorrência');
  return { court, startHour, endHour };
}

async function buildPreview(body) {
  const { court, startHour, endHour } = validatePayload(body);
  const user = await User.findById(body.userId).select('nome email status');
  if (!user) throw new Error('Cliente não encontrado');
  if (user.status === 'bloqueado' || user.status === 'inativo') throw new Error('O cliente não está ativo');

  const slots = Array.from({ length: endHour - startHour }, (_, index) => startHour + index);
  const generatedDates = generateDates(body);
  if (!generatedDates.length) throw new Error('A recorrência escolhida não gera nenhuma data no período');
  const holidayMaps = new Map();
  const holidayDates = [];
  const candidateDates = generatedDates.filter((dateStr) => {
    if (!body.ignoreHolidays) return true;
    const year = toDate(dateStr).getUTCFullYear();
    if (!holidayMaps.has(year)) holidayMaps.set(year, brazilianHolidays(year));
    const holiday = holidayMaps.get(year).get(dateStr);
    if (holiday) holidayDates.push({ date: dateStr, name: holiday });
    return !holiday;
  });

  const [bookings, blockedSlots] = await Promise.all([
    Booking.find({
      quadraId: court.id,
      date: { $in: candidateDates },
      status: { $ne: 'cancelada' },
      $or: [{ slots: { $in: slots } }, { dayUse: true }],
    }).select('date slots userName dayUse'),
    BlockedSlot.find({
      courtId: court.id,
      date: { $in: candidateDates },
      hour: { $in: slots },
    }).select('date hour motivo'),
  ]);

  const conflicts = [];
  const availableDates = [];
  candidateDates.forEach((date) => {
    const booking = bookings.find((item) => item.date === date && (item.dayUse || item.slots.some((slot) => slots.includes(slot))));
    const blocked = blockedSlots.find((item) => item.date === date && slots.includes(item.hour));
    if (booking || blocked) {
      conflicts.push({
        date,
        reason: booking ? `Reserva de ${booking.userName}` : `Horário bloqueado${blocked.motivo ? `: ${blocked.motivo}` : ''}`,
      });
    } else {
      availableDates.push(date);
    }
  });

  const occurrences = availableDates.map((date) => {
    const gross = slots.reduce((total, hour) => total + priceForHour(hour, court.type, date), 0);
    return { date, gross };
  });
  const grossTotal = occurrences.reduce((total, item) => total + item.gross, 0);
  const coupon = normalizeDiscount(body.coupon, grossTotal, true);
  const afterCoupon = Math.max(0, grossTotal - coupon.amount);
  const manualDiscount = normalizeDiscount(body.manualDiscount, afterCoupon);
  const discountTotal = Number((coupon.amount + manualDiscount.amount).toFixed(2));
  const finalTotal = Number(Math.max(0, grossTotal - discountTotal).toFixed(2));

  return {
    client: { id: user._id, name: user.nome, email: user.email },
    court,
    modalidade: body.modalidade,
    period: { startDate: body.startDate, endDate: body.endDate },
    hours: { startHour, endHour, duration: endHour - startHour, slots },
    recurrence: body.recurrence,
    ignoreHolidays: Boolean(body.ignoreHolidays),
    payment: PAYMENTS.has(body.payment) ? body.payment : 'pix',
    generatedDates,
    availableDates,
    occurrences,
    conflicts,
    holidayDates,
    counts: {
      generated: generatedDates.length,
      available: availableDates.length,
      conflicts: conflicts.length,
      holidaysSkipped: holidayDates.length,
    },
    financial: {
      grossTotal,
      coupon,
      manualDiscount,
      discountTotal,
      finalTotal,
    },
  };
}

function handleError(res, error) {
  const status = error.name === 'CastError' ? 400 : 400;
  return res.status(status).json({ message: error.message || 'Erro ao processar temporada' });
}

const preview = async (req, res) => {
  try {
    res.json(await buildPreview(req.body));
  } catch (error) {
    handleError(res, error);
  }
};

const create = async (req, res) => {
  let session;
  try {
    const result = await buildPreview(req.body);
    if (!result.availableDates.length) {
      return res.status(409).json({ message: 'Não há datas disponíveis para criar a temporada', preview: result });
    }

    session = await mongoose.startSession();
    let createdSeason;
    await session.withTransaction(async () => {
      const code = `TMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const [season] = await Season.create([{
        code,
        userId: result.client.id,
        userName: result.client.name,
        courtId: result.court.id,
        courtName: result.court.name,
        courtType: result.court.type,
        modalidade: result.modalidade,
        startDate: result.period.startDate,
        endDate: result.period.endDate,
        startHour: result.hours.startHour,
        endHour: result.hours.endHour,
        slots: result.hours.slots,
        recurrence: result.recurrence,
        ignoreHolidays: result.ignoreHolidays,
        payment: result.payment,
        grossTotal: result.financial.grossTotal,
        coupon: result.financial.coupon,
        manualDiscount: result.financial.manualDiscount,
        discountTotal: result.financial.discountTotal,
        finalTotal: result.financial.finalTotal,
        occurrencesGenerated: result.counts.available,
        conflictsCount: result.counts.conflicts,
        skippedHolidays: result.counts.holidaysSkipped,
        createdBy: req.user._id,
      }], { session });

      const ratio = result.financial.grossTotal > 0
        ? result.financial.finalTotal / result.financial.grossTotal
        : 0;
      let allocated = 0;
      const docs = result.occurrences.map((occurrence, index) => {
        const isLast = index === result.occurrences.length - 1;
        const remaining = Number(Math.max(0, result.financial.finalTotal - allocated).toFixed(2));
        const total = isLast
          ? remaining
          : Math.min(Number((occurrence.gross * ratio).toFixed(2)), remaining);
        allocated += total;
        return {
          userId: result.client.id,
          userName: result.client.name,
          modalidade: result.modalidade,
          quadra: result.court.type,
          quadraId: result.court.id,
          date: occurrence.date,
          slots: result.hours.slots,
          payment: result.payment,
          total: Math.max(0, total),
          seasonId: season._id,
          seasonCode: season.code,
        };
      });
      const bookings = await Booking.insertMany(docs, { session });
      season.bookingIds = bookings.map((booking) => booking._id);
      await season.save({ session });
      createdSeason = season;
    });

    broadcast('bookings');
    broadcast('seasons');
    res.status(201).json({
      season: createdSeason,
      created: result.counts.available,
      conflicts: result.conflicts,
      holidaysSkipped: result.holidayDates,
    });
  } catch (error) {
    handleError(res, error);
  } finally {
    if (session) await session.endSession();
  }
};

const list = async (req, res) => {
  try {
    const seasons = await Season.find()
      .populate('userId', 'nome email')
      .sort({ createdAt: -1 });
    res.json(seasons);
  } catch (error) {
    handleError(res, error);
  }
};

const getById = async (req, res) => {
  try {
    const season = await Season.findById(req.params.id)
      .populate('userId', 'nome email')
      .populate({ path: 'bookingIds', options: { sort: { date: 1 } } });
    if (!season) return res.status(404).json({ message: 'Temporada não encontrada' });
    res.json(season);
  } catch (error) {
    handleError(res, error);
  }
};

const cancel = async (req, res) => {
  try {
    const season = await Season.findById(req.params.id);
    if (!season) return res.status(404).json({ message: 'Temporada não encontrada' });
    if (season.status === 'cancelled') return res.json({ message: 'Temporada já cancelada', season });

    const activeBookings = await Booking.find({
      seasonId: season._id,
      status: { $ne: 'cancelada' },
    }).select('total');
    const creditTotal = Number(activeBookings
      .reduce((total, booking) => total + Number(booking.total || 0), 0)
      .toFixed(2));

    await Booking.updateMany(
      { seasonId: season._id, status: { $ne: 'cancelada' } },
      {
        $set: { status: 'cancelada' },
        $unset: { reservationKeys: '' },
      },
    );
    if (creditTotal > 0) {
      await User.findByIdAndUpdate(season.userId, { $inc: { creditos: creditTotal } });
      broadcast('users');
    }
    season.status = 'cancelled';
    season.cancelledAt = new Date();
    await season.save();
    broadcast('bookings');
    broadcast('seasons');
    res.json({
      message: 'Temporada e reservas vinculadas canceladas',
      season,
      creditosEstornados: creditTotal,
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { preview, create, list, getById, cancel };
