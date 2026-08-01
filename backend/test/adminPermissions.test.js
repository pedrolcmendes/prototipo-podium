const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isMasterAdmin,
  sanitizeUserForAdmin,
  sanitizeBookingForAdmin,
  sanitizeRegistrationForAdmin,
} = require('../src/utils/adminPermissions');

test('administrador legado e perfil master possuem acesso Master', () => {
  assert.equal(isMasterAdmin({ admin: true, adminRole: null }), true);
  assert.equal(isMasterAdmin({ admin: true, adminRole: 'master' }), true);
  assert.equal(isMasterAdmin({ admin: true, adminRole: 'admin' }), false);
  assert.equal(isMasterAdmin({ admin: false, adminRole: 'master' }), false);
});

test('admin operacional não recebe saldos ou valores financeiros', () => {
  const requester = { admin: true, adminRole: 'admin' };
  const user = sanitizeUserForAdmin({ nome: 'Cliente', creditos: 80 }, requester);
  const booking = sanitizeBookingForAdmin({ date: '2026-08-01', total: 100, payment: 'pix', creditosAplicados: 20 }, requester);
  const registration = sanitizeRegistrationForAdmin({ nivel: 'B', valorTotal: 40, preco: 40, creditosAplicados: 10 }, requester);

  assert.equal(user.creditos, undefined);
  assert.equal(booking.total, undefined);
  assert.equal(booking.payment, undefined);
  assert.equal(booking.date, '2026-08-01');
  assert.equal(registration.valorTotal, undefined);
  assert.equal(registration.nivel, 'B');
});

test('Master recebe os dados financeiros necessários para gestão', () => {
  const requester = { admin: true, adminRole: 'master' };
  assert.equal(sanitizeUserForAdmin({ creditos: 80 }, requester).creditos, 80);
  assert.equal(sanitizeBookingForAdmin({ total: 100 }, requester).total, 100);
  assert.equal(sanitizeRegistrationForAdmin({ valorTotal: 40 }, requester).valorTotal, 40);
});
