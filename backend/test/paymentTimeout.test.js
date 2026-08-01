const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizePaymentTimeoutMinutes,
  paymentExpirationDate,
} = require('../src/utils/paymentTimeout');

test('mantém 30 minutos como limite padrão de pagamento', () => {
  assert.equal(normalizePaymentTimeoutMinutes(undefined), 30);
  assert.equal(normalizePaymentTimeoutMinutes('valor inválido'), 30);
});

test('respeita o limite configurado pelo Administrador Master', () => {
  const createdAt = new Date('2026-08-01T15:00:00.000Z');
  const expiresAt = paymentExpirationDate({ paymentTimeoutMinutes: 60 }, createdAt);
  assert.equal(expiresAt.toISOString(), '2026-08-01T16:00:00.000Z');
});

test('protege os limites aceitos pelo provedor e pela operação', () => {
  assert.equal(normalizePaymentTimeoutMinutes(10), 30);
  assert.equal(normalizePaymentTimeoutMinutes(2000), 1440);
});
