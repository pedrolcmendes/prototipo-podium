const test = require('node:test');
const assert = require('node:assert/strict');

const state = {
  payments: [],
  cancelResult: null,
  cancelError: null,
  getResult: null,
  cancelCalls: [],
  updateCalls: [],
};

const paymentModelPath = require.resolve('../src/models/Payment');
require.cache[paymentModelPath] = {
  id: paymentModelPath,
  filename: paymentModelPath,
  loaded: true,
  exports: {
    findOne: async () => state.approvedPayment,
    find: async () => state.payments,
    updateMany: async (...args) => {
      state.updateCalls.push(args);
      return { modifiedCount: state.payments.length };
    },
  },
};

const mercadoPagoPath = require.resolve('mercadopago');
require.cache[mercadoPagoPath] = {
  id: mercadoPagoPath,
  filename: mercadoPagoPath,
  loaded: true,
  exports: {
    MercadoPagoConfig: class MercadoPagoConfig {},
    Payment: class Payment {
      async cancel({ id }) {
        state.cancelCalls.push(id);
        if (state.cancelError) throw state.cancelError;
        return state.cancelResult;
      }

      async get() {
        return state.getResult;
      }
    },
  },
};

const { cancelarPagamentosPendentes } = require('../src/services/paymentCancellation.service');

function resetState() {
  state.payments = [];
  state.approvedPayment = null;
  state.cancelResult = null;
  state.cancelError = null;
  state.getResult = null;
  state.cancelCalls = [];
  state.updateCalls = [];
  process.env.MP_ACCESS_TOKEN = 'TEST_TOKEN';
}

test.beforeEach(resetState);

test('cancela localmente pagamento que ainda não foi enviado ao Mercado Pago', async () => {
  state.payments = [{ _id: 'local', mpPaymentId: null }];

  await cancelarPagamentosPendentes('booking', 'booking-1');

  assert.deepEqual(state.cancelCalls, []);
  assert.equal(state.updateCalls.length, 1);
});

test('cancela a cobrança no Mercado Pago antes de alterar o banco local', async () => {
  state.payments = [{ _id: 'pix', mpPaymentId: 'mp-123' }];

  await cancelarPagamentosPendentes('booking', 'booking-1');

  assert.deepEqual(state.cancelCalls, ['mp-123']);
  assert.equal(state.updateCalls.length, 1);
});

test('não cancela a referência quando o pagamento já foi aprovado', async () => {
  state.payments = [{ _id: 'pix', mpPaymentId: 'mp-123' }];
  state.cancelError = new Error('estado inválido');
  state.getResult = { status: 'approved' };

  await assert.rejects(
    cancelarPagamentosPendentes('booking', 'booking-1'),
    (error) => error.status === 409,
  );
  assert.equal(state.updateCalls.length, 0);
});

test('preserva a referência quando o banco local já registrou aprovação', async () => {
  state.approvedPayment = { _id: 'approved' };

  await assert.rejects(
    cancelarPagamentosPendentes('booking', 'booking-1'),
    (error) => error.status === 409,
  );
  assert.deepEqual(state.cancelCalls, []);
  assert.equal(state.updateCalls.length, 0);
});

test('concilia localmente uma cobrança que já estava cancelada no Mercado Pago', async () => {
  state.payments = [{ _id: 'pix', mpPaymentId: 'mp-123' }];
  state.cancelError = new Error('estado inválido');
  state.getResult = { status: 'cancelled' };

  await cancelarPagamentosPendentes('registration', 'registration-1');

  assert.equal(state.updateCalls.length, 1);
});
