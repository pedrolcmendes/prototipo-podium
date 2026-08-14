const test = require('node:test');
const assert = require('node:assert/strict');

process.env.EMAIL_JSON_TRANSPORT = 'true';
process.env.EMAIL_USER = 'contato@podiumarena.com.br';

const {
  enviarEmailContaCriada,
  enviarEmailResetSenha,
  enviarEmailReservaConfirmada,
  enviarEmailReservaCancelada,
  enviarEmailInscricaoConfirmada,
  enviarEmailLembreteReserva,
} = require('../src/utils/email');

const destinatario = 'atleta@example.com';
const reserva = {
  modalidade: 'beach-tennis',
  quadra: 'coberta',
  date: '2026-08-20',
  slots: [19],
  total: 80,
};
const inscricao = {
  eventNome: 'Open Podium Arena',
  nivel: 'B',
  valorTotal: 120,
};
const evento = {
  nome: 'Open Podium Arena',
  data: '2026-09-12',
  hora: '08:00',
  local: 'Podium Arena',
};

const mensagem = (info) => JSON.parse(info.message.toString());

test('gera os seis e-mails transacionais com destinatário e assunto corretos', async () => {
  const infos = await Promise.all([
    enviarEmailContaCriada({ destinatario, nome: 'Pedro Mendes' }),
    enviarEmailResetSenha({ destinatario, nome: 'Pedro Mendes', link: 'https://podium.test/redefinir/token' }),
    enviarEmailReservaConfirmada({ destinatario, nome: 'Pedro Mendes', reserva }),
    enviarEmailReservaCancelada({ destinatario, nome: 'Pedro Mendes', reserva, creditosEstornados: 80 }),
    enviarEmailInscricaoConfirmada({ destinatario, nome: 'Pedro Mendes', inscricao, evento }),
    enviarEmailLembreteReserva({ destinatario, nome: 'Pedro Mendes', reserva }),
  ]);

  const mensagens = infos.map(mensagem);
  assert.deepEqual(
    mensagens.map((item) => item.to[0].address),
    Array(6).fill(destinatario),
  );
  assert.deepEqual(mensagens.map((item) => item.subject), [
    'Conta criada com sucesso — Podium Arena',
    'Redefinição de senha — Podium Arena',
    'Reserva confirmada — Podium Arena',
    'Reserva cancelada — Podium Arena',
    'Inscrição confirmada — Open Podium Arena',
    'Lembrete: sua reserva começa em 1 hora — Podium Arena',
  ]);
  mensagens.forEach((item) => assert.match(item.html, /Podium Arena/));
});
