function reservationKeysFor({ quadraId, date, slots, dayUse, status }) {
  if (dayUse || status === 'cancelada' || !quadraId || !date || !Array.isArray(slots)) return undefined;

  const normalizedSlots = [...new Set(
    slots.map(Number).filter((slot) => Number.isInteger(slot) && slot >= 0 && slot <= 23),
  )];

  return normalizedSlots.length
    ? normalizedSlots.map((slot) => `${quadraId}|${date}|${slot}`)
    : undefined;
}

function isReservationKeyConflict(error) {
  return error?.code === 11000 && (
    error?.keyPattern?.reservationKeys
    || error?.keyValue?.reservationKeys
    || String(error?.message || '').includes('unique_active_booking_slots')
    || String(error?.message || '').includes('reservationKeys')
  );
}

module.exports = { reservationKeysFor, isReservationKeyConflict };
