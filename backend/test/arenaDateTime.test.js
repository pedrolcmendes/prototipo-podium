const test = require('node:test');
const assert = require('node:assert/strict');
const { arenaDateTimeParts, bookingScheduleStatus } = require('../src/utils/arenaDateTime');

test('converte o relógio do servidor para a data e hora da arena', () => {
  const instant = new Date('2026-08-01T19:32:00.000Z');
  assert.deepEqual(arenaDateTimeParts(instant), {
    date: '2026-08-01',
    hour: 16,
    minute: 32,
  });
});

test('reserva das 18h continua confirmada antes do término em São Paulo', () => {
  const booking = { date: '2026-08-01', slots: [18], status: 'concluida', dayUse: false };
  const beforeEnd = new Date('2026-08-01T19:32:00.000Z'); // 16:32 em São Paulo
  assert.equal(bookingScheduleStatus(booking, beforeEnd), 'confirmada');
});

test('reserva das 18h é concluída somente a partir das 19h em São Paulo', () => {
  const booking = { date: '2026-08-01', slots: [18], status: 'confirmada', dayUse: false };
  const atEnd = new Date('2026-08-01T22:00:00.000Z'); // 19:00 em São Paulo
  assert.equal(bookingScheduleStatus(booking, atEnd), 'concluida');
});

test('corrige status concluído gravado antecipadamente em data futura', () => {
  const booking = { date: '2026-08-02', slots: [8], status: 'concluida', dayUse: false };
  const now = new Date('2026-08-01T19:32:00.000Z');
  assert.equal(bookingScheduleStatus(booking, now), 'confirmada');
});
