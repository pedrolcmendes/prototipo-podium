const test = require('node:test');
const assert = require('node:assert/strict');
const asyncHandler = require('../src/utils/asyncHandler');

test('encaminha rejeições assíncronas ao middleware de erro do Express', async () => {
  const expected = new Error('database unavailable');
  let forwarded;
  const wrapped = asyncHandler(async () => {
    throw expected;
  });

  await wrapped({}, {}, (error) => {
    forwarded = error;
  });

  assert.equal(forwarded, expected);
});
