const ARENA_TIME_ZONE = 'America/Sao_Paulo';

const arenaDateTimeParts = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARENA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  };
};

const bookingScheduleStatus = (booking, value = new Date()) => {
  if (!booking?.date || !['confirmada', 'concluida'].includes(booking.status)) return booking?.status;

  const now = arenaDateTimeParts(value);
  if (booking.date < now.date) return 'concluida';
  if (booking.date > now.date) return 'confirmada';
  if (booking.dayUse) return booking.status;

  const slots = (booking.slots || []).map(Number).filter(Number.isInteger);
  if (!slots.length) return booking.status;
  return Math.max(...slots) + 1 <= now.hour ? 'concluida' : 'confirmada';
};

module.exports = { ARENA_TIME_ZONE, arenaDateTimeParts, bookingScheduleStatus };
