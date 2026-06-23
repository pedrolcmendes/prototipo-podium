/* ═══════════════════════════════════════════
   BOOKING-UTILS.JS — Regras de conflito de reservas
   Compartilhado entre o site (reservas.js) e o
   painel administrativo (admin.js).
   ═══════════════════════════════════════════ */

// Lê sempre direto do localStorage (não de uma cópia em memória) para
// refletir reservas feitas em outra aba/usuário/admin nesse meio-tempo.
function getActiveBookingsFor(quadra, date, allBookings) {
  const all = allBookings || JSON.parse(localStorage.getItem('podium_bookings') || '[]');
  return all.filter(b => b.status !== 'cancelada' && b.quadra === quadra && b.date === date);
}

function getOccupiedHours(quadra, date, allBookings) {
  const occupied = new Set();
  if (!quadra || !date) return occupied;
  getActiveBookingsFor(quadra, date, allBookings).forEach(b => (b.slots || []).forEach(h => occupied.add(h)));
  return occupied;
}

// Toda reserva é composta por horas inteiras contíguas (slots), então duas
// reservas só se sobrepõem (mesmo parcialmente) se compartilharem ao menos
// uma hora em comum. Ex.: 18h-20h ([18,19]) e 19h-21h ([19,20]) compartilham
// a hora 19 → conflito.
function hasConflitoHorario(quadra, date, slots, excludeId, allBookings) {
  if (!quadra || !date || !slots?.length) return false;
  return getActiveBookingsFor(quadra, date, allBookings).some(b =>
    b.id !== excludeId && (b.slots || []).some(h => slots.includes(h))
  );
}

window.getActiveBookingsFor  = getActiveBookingsFor;
window.getOccupiedHours      = getOccupiedHours;
window.hasConflitoHorario    = hasConflitoHorario;
