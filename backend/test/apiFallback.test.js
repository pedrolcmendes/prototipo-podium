const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

async function withServer(run) {
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  try {
    const { port } = server.address();
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('rota inexistente da API devolve erro JSON previsível', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/nao-existe`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.code, 'API_ROUTE_NOT_FOUND');
    assert.equal(typeof body.message, 'string');
  });
});

test('JSON inválido devolve 400 sem derrubar a API', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email":',
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.code, 'INVALID_JSON');
  });
});

test('health check informa o estado do banco em JSON', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();

    assert.ok([200, 503].includes(response.status));
    assert.ok(['ok', 'degraded'].includes(body.status));
    assert.ok(['connected', 'disconnected'].includes(body.database));
    assert.match(body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  });
});

test('origem não autorizada recebe 403 em JSON', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'https://origem-invalida.example' },
    });
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.code, 'CORS_ORIGIN_DENIED');
  });
});
