const test = require('node:test');
const assert = require('node:assert/strict');

function mockModule(request, exports) {
  const modulePath = require.resolve(request);
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

test('cancelamento de inscrição confirmada estorna o valor integral em Créditos Arena', async () => {
  const registration = {
    _id: 'registration-1',
    userId: { toString: () => 'user-1' },
    status: 'confirmada',
    valorTotal: 40,
    creditosEstornados: 0,
    save: async () => registration,
  };
  const creditUpdates = [];
  const broadcasts = [];

  mockModule('mongoose', {
    startSession: async () => ({
      withTransaction: async (callback) => callback(),
      endSession: async () => {},
    }),
  });
  mockModule('../src/models/Registration', {
    findById: async () => registration,
    findOne: () => ({ session: async () => registration }),
  });
  mockModule('../src/models/Event', {});
  mockModule('../src/models/User', {
    findByIdAndUpdate: async (...args) => {
      creditUpdates.push(args);
      return {};
    },
  });
  mockModule('../src/utils/live', { broadcast: (topic) => broadcasts.push(topic) });
  mockModule('../src/services/paymentReference.service', { cancelarReferenciaPendente: async () => ({}) });
  mockModule('../src/services/paymentCancellation.service', { cancelarPagamentosPendentes: async () => {} });

  const { cancelar } = require('../src/controllers/registration.controller');
  let statusCode = 200;
  let responseBody;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  await cancelar(
    { params: { id: registration._id }, user: { _id: { toString: () => 'user-1' }, admin: false } },
    response,
  );

  assert.equal(statusCode, 200);
  assert.equal(registration.status, 'cancelada');
  assert.equal(registration.creditosEstornados, 40);
  assert.deepEqual(creditUpdates[0][1], { $inc: { creditos: 40 } });
  assert.equal(responseBody.creditosEstornados, 40);
  assert.match(responseBody.message, /Créditos Arena/);
  assert.deepEqual(broadcasts, ['registrations', 'users']);
});
