const RESERVATION_REVENUE_STATUSES = new Set(['confirmada', 'concluida', 'cancelada']);
const EVENT_REVENUE_STATUSES = new Set(['confirmada', 'concluida']);

function pad(value) {
  return String(value).padStart(2, '0');
}

function parseIsoParts(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  const [, year, month, day] = match;
  return { year: Number(year), month: Number(month), day: Number(day) };
}

export function lastTwelveMonthsRange(todayIso) {
  const parts = parseIsoParts(todayIso);
  if (!parts) return { start: '', end: '' };

  const targetYear = parts.year - 1;
  const lastDay = new Date(targetYear, parts.month, 0, 12).getDate();
  const startDay = Math.min(parts.day, lastDay);

  return {
    start: `${targetYear}-${pad(parts.month)}-${pad(startDay)}`,
    end: todayIso,
  };
}

export function calendarMonthRange(dateIso) {
  const parts = parseIsoParts(dateIso);
  if (!parts) return { start: '', end: '' };
  const lastDay = new Date(parts.year, parts.month, 0, 12).getDate();
  return {
    start: `${parts.year}-${pad(parts.month)}-01`,
    end: `${parts.year}-${pad(parts.month)}-${pad(lastDay)}`,
  };
}

export function calendarYearRange(dateIso) {
  const parts = parseIsoParts(dateIso);
  if (!parts) return { start: '', end: '' };
  return {
    start: `${parts.year}-01-01`,
    end: `${parts.year}-12-31`,
  };
}

export function isPaidFinancialTransaction(transaction) {
  const value = Number(transaction?.valor);
  const validStatuses = transaction?.tipo === 'reserva'
    ? RESERVATION_REVENUE_STATUSES
    : EVENT_REVENUE_STATUSES;
  return (
    validStatuses.has(transaction?.status)
    && Number.isFinite(value)
    && value > 0
  );
}

export function isTransactionWithinPeriod(transaction, start, end) {
  const date = String(transaction?.data || '').slice(0, 10);
  if (!parseIsoParts(date)) return false;
  return (!start || date >= start) && (!end || date <= end);
}

export function calculateFinancialSummary(transactions, start, end) {
  const paidTransactions = (transactions || []).filter(
    (transaction) => (
      isPaidFinancialTransaction(transaction)
      && isTransactionWithinPeriod(transaction, start, end)
    ),
  );

  const reservations = paidTransactions
    .filter((transaction) => transaction.tipo === 'reserva')
    .reduce((total, transaction) => total + Number(transaction.valor), 0);

  const events = paidTransactions
    .filter((transaction) => transaction.tipo === 'evento')
    .reduce((total, transaction) => total + Number(transaction.valor), 0);

  const total = reservations + events;
  const count = paidTransactions.length;
  const averageTicket = count ? total / count : 0;
  const reservationShare = total > 0 ? Math.round((reservations / total) * 100) : 0;

  return {
    paidTransactions,
    count,
    reservations,
    events,
    total,
    averageTicket,
    reservationShare,
    eventShare: total > 0 ? 100 - reservationShare : 0,
  };
}
