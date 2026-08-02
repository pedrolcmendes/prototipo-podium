const test = require('node:test');
const assert = require('node:assert/strict');
const { cardPaymentRateLimit } = require('../src/middleware/paymentRateLimit');

test('limita rajadas de tentativas de cartão por usuário e IP', () => {
  const req = { user: { _id: `user-${Date.now()}` }, ip: '127.0.0.55' };
  let nextCalls = 0;
  let responseStatus = null;
  const res = {
    headers: {},
    set(name, value) { this.headers[name] = value; },
    status(code) { responseStatus = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };

  for (let index = 0; index < 8; index += 1) {
    cardPaymentRateLimit(req, res, () => { nextCalls += 1; });
  }
  cardPaymentRateLimit(req, res, () => { nextCalls += 1; });

  assert.equal(nextCalls, 8);
  assert.equal(responseStatus, 429);
  assert.match(res.payload.message, /muitas tentativas/i);
  assert.ok(Number(res.headers['Retry-After']) > 0);
});
