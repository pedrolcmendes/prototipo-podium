const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../src/models/User');
const { alterarSenha } = require('../src/controllers/user.controller');

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const fakeUser = ({ senha = null, googleId = null, senhaCorreta = true } = {}) => ({
  senha,
  googleId,
  resetToken: 'token-antigo',
  resetTokenExpires: new Date(Date.now() + 3600000),
  async verificarSenha() { return senhaCorreta; },
  async save() { this.saved = true; },
  toPublic() { return { googleId: this.googleId, hasPassword: Boolean(this.senha) }; },
});

test('conta Google autenticada pode cadastrar a primeira senha sem senha atual', async (t) => {
  const user = fakeUser({ googleId: 'google-123' });
  t.mock.method(User, 'findById', async () => user);
  const res = response();

  await alterarSenha({ user: { _id: 'user-1' }, body: { novaSenha: 'nova123' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(user.saved, true);
  assert.equal(user.resetToken, null);
  assert.equal(res.body.user.hasPassword, true);
});

test('conta com senha exige a senha atual correta', async (t) => {
  const user = fakeUser({ senha: 'hash-existente', senhaCorreta: false });
  t.mock.method(User, 'findById', async () => user);
  const res = response();

  await alterarSenha({ user: { _id: 'user-1' }, body: { senhaAtual: 'errada', novaSenha: 'nova123' } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Senha atual incorreta');
  assert.equal(user.saved, undefined);
});

test('rejeita uma nova senha com menos de seis caracteres', async () => {
  const res = response();
  await alterarSenha({ user: { _id: 'user-1' }, body: { novaSenha: '12345' } }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /pelo menos 6 caracteres/i);
});
