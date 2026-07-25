const COURTS = {
  'coberta-1': { id: 'coberta-1', name: 'Quadra 1', type: 'coberta' },
  'coberta-2': { id: 'coberta-2', name: 'Quadra 2', type: 'coberta' },
  'areia-1': { id: 'areia-1', name: 'Quadra 3', type: 'descoberta' },
  'areia-2': { id: 'areia-2', name: 'Quadra 4', type: 'descoberta' },
  'areia-3': { id: 'areia-3', name: 'Quadra 5', type: 'descoberta' },
  'PKB-DU': { id: 'PKB-DU', name: 'Pickleball', type: 'pickleball' },
};

const pad = (value) => String(value).padStart(2, '0');
const toDate = (dateStr) => new Date(`${dateStr}T12:00:00.000Z`);
const toDateStr = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const addDays = (date, amount) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
};

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function brazilianHolidays(year) {
  const fixed = [
    ['01-01', 'Confraternização Universal'],
    ['04-21', 'Tiradentes'],
    ['05-01', 'Dia do Trabalho'],
    ['09-07', 'Independência do Brasil'],
    ['10-12', 'Nossa Senhora Aparecida'],
    ['11-02', 'Finados'],
    ['11-15', 'Proclamação da República'],
    ['11-20', 'Consciência Negra'],
    ['12-25', 'Natal'],
  ];
  const result = new Map(fixed.map(([md, name]) => [`${year}-${md}`, name]));
  const easter = easterSunday(year);
  [
    [-48, 'Carnaval'],
    [-47, 'Carnaval'],
    [-2, 'Sexta-feira Santa'],
    [0, 'Páscoa'],
    [60, 'Corpus Christi'],
  ].forEach(([offset, name]) => result.set(toDateStr(addDays(easter, offset)), name));
  return result;
}

function generateDates({ startDate, endDate, recurrence }) {
  const start = toDate(startDate);
  const end = toDate(endDate);
  const dates = [];
  if (recurrence.type === 'daily') {
    const interval = Math.max(1, Number(recurrence.dailyInterval) || 1);
    for (let date = start; date <= end; date = addDays(date, interval)) {
      dates.push(toDateStr(date));
      if (dates.length > 500) throw new Error('A temporada não pode ultrapassar 500 reservas');
    }
    return dates;
  }

  const weekdays = new Set((recurrence.weekdays || []).map(Number));
  const interval = Math.max(1, Number(recurrence.weeklyInterval) || 1);
  if (!weekdays.size) throw new Error('Selecione pelo menos um dia da semana');
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const daysFromStart = Math.floor((date - start) / 86400000);
    const weekIndex = Math.floor(daysFromStart / 7);
    if (weekIndex % interval === 0 && weekdays.has(date.getUTCDay())) dates.push(toDateStr(date));
    if (dates.length > 500) throw new Error('A temporada não pode ultrapassar 500 reservas');
  }
  return dates;
}

function priceForHour(hour, courtType, dateStr) {
  if (courtType === 'pickleball') return 25;
  const weekend = [0, 6].includes(toDate(dateStr).getUTCDay());
  const covered = courtType === 'coberta';
  if (weekend) {
    if (hour < 11) return covered ? 80 : 60;
    if (hour < 14) return covered ? 60 : 50;
    return covered ? 100 : 80;
  }
  if (hour < 16) return covered ? 60 : 50;
  if (hour < 18) return covered ? 80 : 60;
  if (hour < 21) return covered ? 100 : 80;
  return covered ? 80 : 60;
}

function normalizeDiscount(input = {}, base, allowCode = false) {
  const type = input.type === 'fixed' ? 'fixed' : 'percent';
  const value = Math.max(0, Number(input.value) || 0);
  const rawAmount = type === 'percent' ? base * Math.min(value, 100) / 100 : value;
  const amount = Math.min(base, rawAmount);
  return {
    ...(allowCode ? { code: String(input.code || '').trim().toUpperCase() } : {}),
    type,
    value,
    amount: Number(amount.toFixed(2)),
  };
}

module.exports = {
  COURTS,
  brazilianHolidays,
  generateDates,
  normalizeDiscount,
  priceForHour,
  toDate,
};
