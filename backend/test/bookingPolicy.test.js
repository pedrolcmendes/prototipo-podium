const test = require('node:test');
const assert = require('node:assert/strict');
const { initialBookingPaymentState } = require('../src/utils/bookingPolicy');
const { reservationKeysFor, isReservationKeyConflict } = require('../src/utils/bookingSlots');

test('reserva criada pelo admin já nasce confirmada e sem expiração', () => {
  assert.deepEqual(initialBookingPaymentState({ isAdminBooking: true, settings: { paymentTimeoutMinutes: 30 } }), {
    paymentExpiresAt: null,
    foiPago: true,
    status: 'confirmada',
  });
});

test('reserva pública mantém o bloqueio temporário de pagamento', () => {
  const now = new Date('2026-08-02T12:00:00.000Z');
  const state = initialBookingPaymentState({
    isAdminBooking: false,
    settings: { paymentTimeoutMinutes: 30 },
    now,
  });

  assert.equal(state.status, 'pendente_pagamento');
  assert.equal(state.foiPago, false);
  assert.equal(state.paymentExpiresAt.toISOString(), '2026-08-02T12:30:00.000Z');
});

test('gera uma chave exclusiva para cada quadra, data e horário ativo', () => {
  assert.deepEqual(reservationKeysFor({
    quadraId: 'areia-1',
    date: '2026-08-10',
    slots: [18, 19, 18],
    dayUse: false,
    status: 'pendente_pagamento',
  }), [
    'areia-1|2026-08-10|18',
    'areia-1|2026-08-10|19',
  ]);
});

test('reserva cancelada libera as chaves de horário', () => {
  assert.equal(reservationKeysFor({
    quadraId: 'areia-1',
    date: '2026-08-10',
    slots: [18],
    dayUse: false,
    status: 'cancelada',
  }), undefined);
});

test('identifica conflito atômico devolvido pelo índice do MongoDB', () => {
  assert.ok(isReservationKeyConflict({
    code: 11000,
    keyPattern: { reservationKeys: 1 },
  }));
});
