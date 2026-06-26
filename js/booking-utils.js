/* ═══════════════════════════════════════════
   BOOKING-UTILS.JS — Quadras, preços e regras de
   conflito/bloqueio de reservas.
   Compartilhado entre o site (reservas.js) e o
   painel administrativo (admin.js).
   ═══════════════════════════════════════════ */

// ─── Quadras físicas ──────────────────────
// `tipo` define a tabela de preço (coberta/descoberta) e os filtros
// já existentes no admin; `tag` é só rótulo de exibição.
const COURTS = [
  { id: 'coberta-1', label: 'Coberta 1', tipo: 'coberta',    tag: 'Multiesporte' },
  { id: 'coberta-2', label: 'Coberta 2', tipo: 'coberta',    tag: 'Multiesporte' },
  { id: 'areia-1',   label: 'Areia 1',   tipo: 'descoberta', tag: 'Multiesporte' },
  { id: 'areia-2',   label: 'Areia 2',   tipo: 'descoberta', tag: 'Multiesporte' },
  { id: 'areia-3',   label: 'Areia 3',   tipo: 'descoberta', tag: 'Multiesporte' },
  { id: 'pickleball',label: 'Pickleball',tipo: 'descoberta', tag: 'Pickleball', dayUse: true },
];
function getCourtById(id) { return COURTS.find(c => c.id === id) || null; }
function getCourtsByTipo(tipo) { return COURTS.filter(c => c.tipo === tipo && !c.dayUse); }

// ─── Tabela de preços ─────────────────────
const PRICE_TABLE = {
  coberta: {
    weekday: [
      { from: 8,  to: 16, price: 60 },
      { from: 16, to: 18, price: 80 },
      { from: 18, to: 21, price: 100 },
      { from: 21, to: 23, price: 80 },
    ],
    weekend: [
      { from: 8,  to: 11, price: 80 },
      { from: 11, to: 14, price: 60 },
      { from: 14, to: 22, price: 100 },
    ],
  },
  descoberta: {
    weekday: [
      { from: 8,  to: 16, price: 50 },
      { from: 16, to: 18, price: 60 },
      { from: 18, to: 21, price: 80 },
      { from: 21, to: 23, price: 60 },
    ],
    weekend: [
      { from: 8,  to: 11, price: 60 },
      { from: 11, to: 14, price: 50 },
      { from: 14, to: 22, price: 80 },
    ],
  },
};
function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}
function getPriceForHour(hour, quadraTipo, weekend) {
  const table = PRICE_TABLE[quadraTipo][weekend ? 'weekend' : 'weekday'];
  const band = table.find(b => hour >= b.from && hour < b.to);
  return band ? band.price : 0;
}

// ─── Bloqueios manuais (admin) ────────────
function getBlockedSlots() { return JSON.parse(localStorage.getItem('podium_blocked_slots') || '[]'); }
function saveBlockedSlots(d) { localStorage.setItem('podium_blocked_slots', JSON.stringify(d)); }
function isSlotBlocked(courtId, date, hour, allBlocked) {
  const all = allBlocked || getBlockedSlots();
  return all.some(b => b.courtId === courtId && b.date === date && b.hour === hour);
}
function blockSlot(courtId, date, hour) {
  const all = getBlockedSlots();
  if (!isSlotBlocked(courtId, date, hour, all)) {
    all.push({ courtId, date, hour });
    saveBlockedSlots(all);
  }
}
function unblockSlot(courtId, date, hour) {
  saveBlockedSlots(getBlockedSlots().filter(b => !(b.courtId === courtId && b.date === date && b.hour === hour)));
}

// ─── Resolução de quadra específica ───────
// Reservas antigas (mock/legado) só tinham `quadra` (tipo). Para exibi-las
// numa quadra específica na Grade de Ocupação sem perder a regra de
// conflito por tipo, atribuímos uma quadra compatível de forma estável
// (mesmo id de reserva → sempre a mesma quadra).
function resolveCourtId(booking) {
  if (booking.quadraId) return booking.quadraId;
  if (booking.dayUse && (!booking.quadra || booking.quadra === 'n/a')) return 'pickleball';
  const pool = getCourtsByTipo(booking.quadra);
  if (!pool.length) return null;
  const hash = String(booking.id || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return pool[hash % pool.length].id;
}

// ─── Disponibilidade / conflito ──────────
// Lê sempre direto do localStorage (não de uma cópia em memória) para
// refletir reservas feitas em outra aba/usuário/admin nesse meio-tempo.
function getActiveBookingsFor(courtId, date, allBookings) {
  const all = allBookings || JSON.parse(localStorage.getItem('podium_bookings') || '[]');
  return all.filter(b => b.status !== 'cancelada' && b.date === date && resolveCourtId(b) === courtId);
}

function getOccupiedHours(courtId, date, allBookings) {
  const occupied = new Set();
  if (!courtId || !date) return occupied;
  getActiveBookingsFor(courtId, date, allBookings).forEach(b => (b.slots || []).forEach(h => occupied.add(h)));
  getBlockedSlots().forEach(b => { if (b.courtId === courtId && b.date === date) occupied.add(b.hour); });
  return occupied;
}

// Toda reserva é composta por horas inteiras contíguas (slots), então duas
// reservas só se sobrepõem (mesmo parcialmente) se compartilharem ao menos
// uma hora em comum. Ex.: 18h-20h ([18,19]) e 19h-21h ([19,20]) compartilham
// a hora 19 → conflito.
function hasConflitoHorario(courtId, date, slots, excludeId, allBookings) {
  if (!courtId || !date || !slots?.length) return false;
  const bookingConflict = getActiveBookingsFor(courtId, date, allBookings).some(b =>
    b.id !== excludeId && (b.slots || []).some(h => slots.includes(h))
  );
  if (bookingConflict) return true;
  return getBlockedSlots().some(b => b.courtId === courtId && b.date === date && slots.includes(b.hour));
}

window.COURTS               = COURTS;
window.getCourtById         = getCourtById;
window.getCourtsByTipo      = getCourtsByTipo;
window.PRICE_TABLE          = PRICE_TABLE;
window.isWeekend            = isWeekend;
window.getPriceForHour      = getPriceForHour;
window.getBlockedSlots      = getBlockedSlots;
window.saveBlockedSlots     = saveBlockedSlots;
window.isSlotBlocked        = isSlotBlocked;
window.blockSlot            = blockSlot;
window.unblockSlot          = unblockSlot;
window.resolveCourtId       = resolveCourtId;
window.getActiveBookingsFor = getActiveBookingsFor;
window.getOccupiedHours     = getOccupiedHours;
window.hasConflitoHorario   = hasConflitoHorario;
