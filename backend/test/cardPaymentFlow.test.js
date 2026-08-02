const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const state = {
  payments: [],
  mpCreateResults: [],
  mpGetResult: null,
  mpCreateCalls: [],
  mpGetCalls: [],
  booking: null,
  bookingUpdates: [],
  events: [],
  saveError: null,
  userCredits: 0,
};

function paymentDocument(data) {
  return {
    _id: data._id || `payment-${state.payments.length + 1}`,
    status: 'pendente',
    mpPaymentId: null,
    paidAt: null,
    ...data,
    async save() {
      state.events.push('payment:save');
      if (state.saveError) throw state.saveError;
      return this;
    },
  };
}

const paymentModelPath = require.resolve('../src/models/Payment');
require.cache[paymentModelPath] = {
  id: paymentModelPath,
  filename: paymentModelPath,
  loaded: true,
  exports: {
    async findOne(query) {
      if (query.idempotencyKey) {
        return state.payments.find((payment) => payment.idempotencyKey === query.idempotencyKey) || null;
      }
      if (query.mpPaymentId) {
        return state.payments.find((payment) => payment.mpPaymentId === String(query.mpPaymentId)) || null;
      }
      return state.payments.find((payment) => (
        payment.tipo === query.tipo
        && String(payment.referenciaId) === String(query.referenciaId)
        && (!query.metodo || payment.metodo === query.metodo)
        && (!query.status || payment.status === query.status)
      )) || null;
    },
    async countDocuments(query) {
      return state.payments.filter((payment) => (
        payment.tipo === query.tipo
        && String(payment.referenciaId) === String(query.referenciaId)
        && payment.metodo === query.metodo
      )).length;
    },
    async create(data) {
      state.events.push('payment:create');
      const payment = paymentDocument(data);
      state.payments.push(payment);
      return payment;
    },
    async findOneAndUpdate(query, update) {
      const payment = state.payments.find((item) => (
        (!query._id || String(item._id) === String(query._id))
        && (!Object.hasOwn(query, 'arenaCreditsRefundedAt') || !item.arenaCreditsRefundedAt)
        && (!query.financialReviewRequired || item.financialReviewRequired)
      ));
      if (!payment) return null;
      Object.assign(payment, update.$set || {});
      return payment;
    },
  },
};

const bookingPath = require.resolve('../src/models/Booking');
require.cache[bookingPath] = {
  id: bookingPath,
  filename: bookingPath,
  loaded: true,
  exports: {
    async findById() {
      return state.booking;
    },
    async findByIdAndUpdate(id, update) {
      state.bookingUpdates.push({ id, update });
      if (update.paymentId) state.booking.paymentId = update.paymentId;
      return state.booking;
    },
    async findOneAndUpdate(query, update) {
      if (!state.booking || state.booking.status !== query.status) return null;
      Object.assign(state.booking, update.$set);
      state.events.push('booking:confirm');
      return state.booking;
    },
  },
};

const registrationPath = require.resolve('../src/models/Registration');
require.cache[registrationPath] = {
  id: registrationPath,
  filename: registrationPath,
  loaded: true,
  exports: {
    async findById() { return null; },
    async findByIdAndUpdate() { return null; },
    async findOneAndUpdate() { return null; },
  },
};

const userPath = require.resolve('../src/models/User');
require.cache[userPath] = {
  id: userPath,
  filename: userPath,
  loaded: true,
  exports: {
    findById() {
      return { select: async () => null };
    },
    async findByIdAndUpdate(id, update) {
      state.userCredits += Number(update?.$inc?.creditos || 0);
      return { _id: id, creditos: state.userCredits };
    },
  },
};

const mongoosePath = require.resolve('mongoose');
require.cache[mongoosePath] = {
  id: mongoosePath,
  filename: mongoosePath,
  loaded: true,
  exports: {
    async startSession() {
      return {
        async withTransaction(callback) { await callback(); },
        async endSession() {},
      };
    },
  },
};

const settingsPath = require.resolve('../src/models/Settings');
require.cache[settingsPath] = {
  id: settingsPath,
  filename: settingsPath,
  loaded: true,
  exports: {
    findById() {
      return {
        select: async () => ({ paymentTimeoutMinutes: 30 }),
        then(resolve) { return resolve({ notifEmailConfirm: false }); },
      };
    },
  },
};

for (const [relativePath, exports] of [
  ['../src/utils/live', { broadcast() {} }],
  ['../src/utils/email', { enviarEmailReservaConfirmada: async () => {} }],
  ['../src/services/paymentReference.service', { cancelarReferenciaPendente: async () => {} }],
  ['../src/services/paymentCancellation.service', { cancelarPagamentosPendentes: async () => {} }],
]) {
  const resolved = require.resolve(relativePath);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
}

const mercadoPagoPath = require.resolve('mercadopago');
require.cache[mercadoPagoPath] = {
  id: mercadoPagoPath,
  filename: mercadoPagoPath,
  loaded: true,
  exports: {
    MercadoPagoConfig: class MercadoPagoConfig {},
    Payment: class Payment {
      async create(args) {
        state.events.push('mp:create');
        state.mpCreateCalls.push(args);
        const result = state.mpCreateResults.shift();
        if (result instanceof Error) throw result;
        return result;
      }

      async get(args) {
        state.events.push('mp:get');
        state.mpGetCalls.push(args);
        if (state.mpGetResult instanceof Error) throw state.mpGetResult;
        return state.mpGetResult;
      }
    },
    PaymentMethod: class PaymentMethod {
      async get() {
        return [
          { id: 'master', status: 'active', payment_type_id: 'prepaid_card' },
          { id: 'master', status: 'active', payment_type_id: 'credit_card' },
          { id: 'debmaster', status: 'active', payment_type_id: 'debit_card' },
        ];
      }
    },
    Preference: class Preference {},
  },
};

process.env.MP_ACCESS_TOKEN = 'TEST_ACCESS_TOKEN';
process.env.MP_WEBHOOK_SECRET = 'TEST_WEBHOOK_SECRET';
process.env.BACKEND_URL = 'https://backend.example.com';

const { criarPagamentoCartao, syncPagamento, webhook } = require('../src/controllers/payment.controller');

function resetState() {
  state.payments = [];
  state.mpCreateResults = [];
  state.mpGetResult = null;
  state.mpCreateCalls = [];
  state.mpGetCalls = [];
  state.bookingUpdates = [];
  state.events = [];
  state.saveError = null;
  state.userCredits = 0;
  state.booking = {
    _id: 'booking-1',
    userId: 'user-1',
    userName: 'Cliente Teste',
    total: 100,
    creditosAplicados: 0,
    status: 'pendente_pagamento',
    paymentExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
  };
  process.env.MP_ACCESS_TOKEN = 'TEST_ACCESS_TOKEN';
  process.env.MP_WEBHOOK_SECRET = 'TEST_WEBHOOK_SECRET';
}

function request() {
  return {
    body: {
      tipo: 'booking',
      referenciaId: 'booking-1',
      token: 'card-token',
      paymentMethodId: 'master',
      paymentTypeId: 'credit_card',
      installments: 1,
      payerIdentification: { type: 'CPF', number: '12345678909' },
    },
    user: {
      _id: 'user-1',
      nome: 'Cliente Teste',
      email: 'cliente@example.com',
      cpf: '12345678909',
    },
  };
}

function response() {
  return {
    statusCode: 200,
    payload: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; state.events.push(`response:${this.statusCode}`); return this; },
    sendStatus(code) { this.statusCode = code; state.events.push(`response:${code}`); return this; },
  };
}

async function payWith(result) {
  state.mpCreateResults.push(result);
  const res = response();
  await criarPagamentoCartao(request(), res);
  return res;
}

test.beforeEach(resetState);

test('cartão aprovado persiste a tentativa antes de chamar o Mercado Pago', async () => {
  const res = await payWith({ id: 'mp-approved', status: 'approved', status_detail: 'accredited' });

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.status, 'approved');
  assert.equal(state.payments.length, 1);
  assert.equal(state.payments[0].status, 'aprovado');
  assert.equal(state.booking.status, 'confirmada');
  assert.ok(state.events.indexOf('payment:create') < state.events.indexOf('mp:create'));
  assert.equal(state.bookingUpdates[0].update.paymentId, state.payments[0]._id);
});

test('cartão recusado encerra somente a tentativa e permite uma nova tentativa', async () => {
  const res = await payWith({
    id: 'mp-rejected',
    status: 'rejected',
    status_detail: 'cc_rejected_insufficient_amount',
  });

  assert.equal(res.payload.status, 'rejected');
  assert.match(res.payload.declineMessage, /limite insuficiente/i);
  assert.equal(state.payments[0].status, 'cancelado');
  assert.equal(state.booking.status, 'pendente_pagamento');

  const firstKey = state.payments[0].idempotencyKey;
  const retryResponse = await payWith({ id: 'mp-approved-retry', status: 'approved' });
  assert.equal(retryResponse.payload.status, 'approved');
  assert.equal(state.payments.length, 2);
  assert.notEqual(state.payments[1].idempotencyKey, firstKey);
});

test('cartão em análise mantém pagamento e reserva pendentes', async () => {
  const res = await payWith({ id: 'mp-pending', status: 'in_process', status_detail: 'pending_contingency' });

  assert.equal(res.payload.status, 'in_process');
  assert.equal(state.payments[0].status, 'pendente');
  assert.equal(state.booking.status, 'pendente_pagamento');
});

test('cartão que exige 3DS devolve imediatamente os dados do Challenge', async () => {
  const res = await payWith({
    id: 'mp-3ds',
    status: 'pending',
    status_detail: 'pending_challenge',
    payment_type_id: 'credit_card',
    three_ds_info: {
      external_resource_url: 'https://bank.example.com/challenge',
      creq: 'challenge-request',
    },
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.requiresAction, true);
  assert.equal(res.payload.statusDetail, 'pending_challenge');
  assert.equal(res.payload.threeDsInfo.externalResourceURL, 'https://bank.example.com/challenge');
  assert.equal(state.payments[0].requiresAction, true);
});

test('backend recusa débito e parcelamento fora da regra antes de criar cobrança', async () => {
  const debitReq = request();
  debitReq.body.paymentTypeId = 'debit_card';
  debitReq.body.paymentMethodId = 'debmaster';
  const debitResponse = response();
  await criarPagamentoCartao(debitReq, debitResponse);

  const installmentsReq = request();
  installmentsReq.body.installments = 2;
  const installmentsResponse = response();
  await criarPagamentoCartao(installmentsReq, installmentsResponse);

  assert.equal(debitResponse.statusCode, 400);
  assert.match(debitResponse.payload.message, /somente cartão de crédito/i);
  assert.equal(installmentsResponse.statusCode, 400);
  assert.match(installmentsResponse.payload.message, /uma parcela/i);
  assert.equal(state.mpCreateCalls.length, 0);
  assert.equal(state.payments.length, 0);
});

test('timeout preserva a tentativa e reutiliza a mesma idempotência no reenvio', async () => {
  state.mpCreateResults.push(new Error('timeout'), { id: 'mp-after-timeout', status: 'approved' });

  const firstResponse = response();
  await criarPagamentoCartao(request(), firstResponse);
  const secondResponse = response();
  await criarPagamentoCartao(request(), secondResponse);

  assert.equal(firstResponse.statusCode, 502);
  assert.equal(secondResponse.payload.status, 'approved');
  assert.equal(state.payments.length, 1);
  assert.equal(state.mpCreateCalls.length, 2);
  assert.equal(
    state.mpCreateCalls[0].requestOptions.idempotencyKey,
    state.mpCreateCalls[1].requestOptions.idempotencyKey,
  );
});

test('envio duplicado consulta a cobrança existente sem criar outra', async () => {
  await payWith({ id: 'mp-existing', status: 'in_process' });
  state.mpGetResult = { id: 'mp-existing', status: 'approved', status_detail: 'accredited' };

  const duplicateResponse = response();
  await criarPagamentoCartao(request(), duplicateResponse);

  assert.equal(duplicateResponse.statusCode, 200);
  assert.equal(duplicateResponse.payload.status, 'approved');
  assert.equal(state.mpCreateCalls.length, 1);
  assert.equal(state.mpGetCalls.length, 1);
  assert.equal(state.payments.length, 1);
});

test('conciliação transforma cartão em análise em reserva confirmada', async () => {
  const payment = paymentDocument({
    userId: 'user-1',
    tipo: 'booking',
    referenciaId: 'booking-1',
    metodo: 'cartao',
    status: 'pendente',
    mpPaymentId: 'mp-pending',
  });
  state.payments.push(payment);
  state.mpGetResult = { id: 'mp-pending', status: 'approved', status_detail: 'accredited' };
  const res = response();

  await syncPagamento({ query: { mpPaymentId: 'mp-pending' }, user: { _id: 'user-1' } }, res);

  assert.equal(res.payload.status, 'aprovado');
  assert.equal(state.booking.status, 'confirmada');
});

test('conciliação informa recusa do cartão sem cancelar a reserva', async () => {
  const payment = paymentDocument({
    userId: 'user-1',
    tipo: 'booking',
    referenciaId: 'booking-1',
    metodo: 'cartao',
    status: 'pendente',
    mpPaymentId: 'mp-rejected-later',
  });
  state.payments.push(payment);
  state.mpGetResult = {
    id: 'mp-rejected-later',
    status: 'rejected',
    status_detail: 'cc_rejected_insufficient_amount',
  };
  const res = response();

  await syncPagamento({ query: { mpPaymentId: 'mp-rejected-later' }, user: { _id: 'user-1' } }, res);

  assert.equal(res.payload.status, 'cancelado');
  assert.match(res.payload.declineMessage, /limite insuficiente/i);
  assert.equal(state.booking.status, 'pendente_pagamento');
});

test('sincronização aplica a expiração mesmo sem depender do job em memória', async () => {
  const payment = paymentDocument({
    userId: 'user-1',
    tipo: 'booking',
    referenciaId: 'booking-1',
    metodo: 'cartao',
    status: 'pendente',
    mpPaymentId: 'mp-expired',
    expiresAt: new Date(Date.now() - 1_000),
  });
  state.payments.push(payment);
  state.mpGetResult = { id: 'mp-expired', status: 'pending', status_detail: 'pending_contingency' };
  const res = response();

  await syncPagamento({ query: { mpPaymentId: 'mp-expired' }, user: { _id: 'user-1' } }, res);

  assert.equal(res.payload.status, 'expirado');
  assert.equal(payment.status, 'expirado');
});

test('aprovação tardia após cancelamento credita uma única vez os Créditos Arena', async () => {
  const payment = paymentDocument({
    _id: 'payment-late',
    userId: 'user-1',
    tipo: 'booking',
    referenciaId: 'booking-1',
    metodo: 'cartao',
    status: 'cancelado',
    mpPaymentId: 'mp-late-approved',
    valor: 100,
    arenaCreditsRefundedAt: null,
  });
  state.payments.push(payment);
  state.booking.status = 'cancelada';
  state.mpGetResult = { id: 'mp-late-approved', status: 'approved', status_detail: 'accredited' };

  const first = response();
  await syncPagamento({ query: { mpPaymentId: 'mp-late-approved' }, user: { _id: 'user-1' } }, first);
  const second = response();
  await syncPagamento({ query: { mpPaymentId: 'mp-late-approved' }, user: { _id: 'user-1' } }, second);

  assert.equal(payment.status, 'estornado_creditos');
  assert.equal(state.userCredits, 100);
  assert.equal(first.payload.status, 'estornado_creditos');
  assert.equal(second.payload.status, 'estornado_creditos');
});

test('estorno e chargeback posteriores à aprovação viram revisão financeira', async () => {
  const refunded = paymentDocument({
    userId: 'user-1',
    tipo: 'booking',
    referenciaId: 'booking-1',
    metodo: 'cartao',
    status: 'aprovado',
    mpPaymentId: 'mp-refunded',
    valor: 100,
  });
  state.payments.push(refunded);
  state.booking.status = 'confirmada';
  state.mpGetResult = { id: 'mp-refunded', status: 'refunded', status_detail: 'refunded' };
  const refundResponse = response();
  await syncPagamento({ query: { mpPaymentId: 'mp-refunded' }, user: { _id: 'user-1' } }, refundResponse);

  assert.equal(refunded.status, 'estornado');
  assert.equal(refunded.financialReviewRequired, true);

  refunded.mpPaymentId = 'mp-chargeback';
  state.mpGetResult = { id: 'mp-chargeback', status: 'charged_back', status_detail: 'settled' };
  const chargebackResponse = response();
  await syncPagamento({ query: { mpPaymentId: 'mp-chargeback' }, user: { _id: 'user-1' } }, chargebackResponse);

  assert.equal(refunded.status, 'chargeback');
  assert.equal(refunded.financialReviewRequired, true);
  assert.match(refunded.financialReviewReason, /chargeback/i);
});

function webhookRequest(paymentId = 'mp-webhook') {
  const ts = String(Date.now());
  const requestId = 'request-1';
  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts}`;
  const signature = crypto
    .createHmac('sha256', process.env.MP_WEBHOOK_SECRET)
    .update(manifest)
    .digest('hex');

  return {
    query: { 'data.id': paymentId },
    headers: {
      'x-request-id': requestId,
      'x-signature': `ts=${ts},v1=${signature}`,
    },
    body: { type: 'payment', data: { id: paymentId } },
  };
}

test('webhook confirma e somente então responde sucesso', async () => {
  const payment = paymentDocument({
    _id: 'payment-webhook',
    userId: 'user-1',
    tipo: 'booking',
    referenciaId: 'booking-1',
    metodo: 'cartao',
    status: 'pendente',
    mpPaymentId: 'mp-webhook',
    idempotencyKey: 'stable-key',
  });
  state.payments.push(payment);
  state.mpGetResult = { id: 'mp-webhook', status: 'approved' };
  const res = response();

  await webhook(webhookRequest(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(payment.status, 'aprovado');
  assert.equal(state.booking.status, 'confirmada');
  assert.ok(state.events.indexOf('booking:confirm') < state.events.indexOf('response:200'));
});

test('webhook responde erro para permitir nova entrega quando a persistência falha', async () => {
  const payment = paymentDocument({
    userId: 'user-1',
    tipo: 'booking',
    referenciaId: 'booking-1',
    metodo: 'cartao',
    status: 'pendente',
    mpPaymentId: 'mp-webhook',
  });
  state.payments.push(payment);
  state.mpGetResult = { id: 'mp-webhook', status: 'approved' };
  state.saveError = new Error('database unavailable');
  const res = response();

  await webhook(webhookRequest(), res);

  assert.equal(res.statusCode, 500);
});

test('webhook falha fechado quando a assinatura secreta não está configurada', async () => {
  delete process.env.MP_WEBHOOK_SECRET;
  const res = response();

  await webhook({ headers: {}, query: {}, body: {} }, res);

  assert.equal(res.statusCode, 503);
});

test('webhook rejeita notificação com assinatura inválida', async () => {
  const req = webhookRequest();
  req.headers['x-signature'] = 'ts=123,v1=invalid';
  const res = response();

  await webhook(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(state.mpGetCalls.length, 0);
});

test('webhook rejeita assinatura válida porém antiga para impedir replay', async () => {
  const paymentId = 'mp-stale';
  const ts = String(Date.now() - 10 * 60 * 1000);
  const requestId = 'request-stale';
  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts}`;
  const signature = crypto
    .createHmac('sha256', process.env.MP_WEBHOOK_SECRET)
    .update(manifest)
    .digest('hex');
  const res = response();

  await webhook({
    query: { 'data.id': paymentId },
    headers: {
      'x-request-id': requestId,
      'x-signature': `ts=${ts},v1=${signature}`,
    },
    body: { type: 'payment', data: { id: paymentId } },
  }, res);

  assert.equal(res.statusCode, 401);
  assert.equal(state.mpGetCalls.length, 0);
});
