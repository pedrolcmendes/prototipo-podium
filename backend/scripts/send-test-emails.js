require('dotenv').config();

const {
  enviarEmailContaCriada,
  enviarEmailResetSenha,
  enviarEmailReservaConfirmada,
  enviarEmailReservaCancelada,
  enviarEmailInscricaoConfirmada,
  enviarEmailLembreteReserva,
} = require('../src/utils/email');

const destinatario = process.argv[2];
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
if (!destinatario || !/^\S+@\S+\.\S+$/.test(destinatario)) {
  console.error('Uso: npm run test:emails -- email@destino.com');
  process.exit(1);
}
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('Configure EMAIL_USER e EMAIL_PASS antes do teste.');
  process.exit(1);
}

const reserva = {
  modalidade: 'beach-tennis',
  quadra: 'coberta',
  date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  slots: [19],
  total: 80,
};
const inscricao = {
  eventNome: 'Open Podium Arena — Teste',
  nivel: 'B',
  valorTotal: 120,
};
const evento = {
  nome: 'Open Podium Arena — Teste',
  data: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  hora: '08:00',
  local: 'Podium Arena',
};

const envios = [
  ['conta criada', () => enviarEmailContaCriada({ destinatario, nome: 'Pedro Mendes' })],
  ['esqueci minha senha', () => enviarEmailResetSenha({ destinatario, nome: 'Pedro Mendes', link: `${frontendUrl}/redefinir-senha/token-de-teste` })],
  ['reserva confirmada', () => enviarEmailReservaConfirmada({ destinatario, nome: 'Pedro Mendes', reserva })],
  ['reserva cancelada', () => enviarEmailReservaCancelada({ destinatario, nome: 'Pedro Mendes', reserva, creditosEstornados: 80 })],
  ['inscrição em campeonato', () => enviarEmailInscricaoConfirmada({ destinatario, nome: 'Pedro Mendes', inscricao, evento })],
  ['lembrete de 1 hora', () => enviarEmailLembreteReserva({ destinatario, nome: 'Pedro Mendes', reserva })],
];

(async () => {
  for (const [nome, enviar] of envios) {
    const info = await enviar();
    console.log(`OK: ${nome} (${info.messageId})`);
  }
  console.log(`Todos os ${envios.length} e-mails foram enviados para ${destinatario}.`);
})().catch((error) => {
  console.error('Falha no envio:', error.message);
  process.exit(1);
});
