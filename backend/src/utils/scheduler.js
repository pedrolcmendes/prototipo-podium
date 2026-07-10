/*
  Tarefas automáticas do sistema (rodam a cada 5 minutos):
    - Lembrete 2h antes da reserva (e-mail + WhatsApp se o Twilio estiver configurado)
    - Resumo semanal para o admin (toda segunda-feira)
  Obs.: o servidor do Render roda em UTC, então todos os cálculos de "agora"
  usam o horário de Brasília (America/Sao_Paulo) via Intl.
*/

const Booking = require('../models/Booking');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { enviarEmailLembreteReserva, enviarEmailResumoSemanal } = require('./email');
const { enviarWhatsApp } = require('./whatsapp');

const TZ = 'America/Sao_Paulo';

// "2026-07-10T14:35" no fuso de Brasília
const agoraBrasilia = () => {
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  return fmt.format(new Date()).replace(' ', 'T');
};

// Diferença em minutos entre dois horários "de parede" (YYYY-MM-DDTHH:MM)
const diffMinutos = (a, b) => (Date.parse(`${a}:00Z`) - Date.parse(`${b}:00Z`)) / 60000;

const fmtSlots = (slots = []) =>
  [...slots].sort((x, y) => x - y).map((h) => `${String(h).padStart(2, '0')}h`).join(', ');

const enviarLembretes = async (settings) => {
  const agora = agoraBrasilia();
  const hoje = agora.slice(0, 10);
  const amanha = new Date(Date.parse(`${hoje}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);

  const reservas = await Booking.find({
    status: 'confirmada',
    reminderSent: { $ne: true },
    dayUse: { $ne: true },
    date: { $in: [hoje, amanha] },
  }).populate('userId', 'nome email tel');

  for (const r of reservas) {
    if (!r.slots?.length || !r.userId) continue;
    const primeiroSlot = Math.min(...r.slots);
    const inicio = `${r.date}T${String(primeiroSlot).padStart(2, '0')}:00`;
    const minutosAte = diffMinutos(inicio, agora);

    if (minutosAte <= 0) {
      // horário já passou sem lembrete — marca para não reprocessar
      r.reminderSent = true;
      await r.save();
      continue;
    }
    if (minutosAte > 120) continue; // ainda falta mais de 2h

    const msg = `⏰ Podium Arena: lembrete! Sua reserva de ${r.modalidade} é hoje às ${fmtSlots(r.slots)}. Bom jogo! 🎾`;
    try {
      await Promise.allSettled([
        enviarEmailLembreteReserva({ destinatario: r.userId.email, nome: r.userId.nome, reserva: r }),
        enviarWhatsApp({ para: r.userId.tel, mensagem: msg }),
      ]);
      r.reminderSent = true;
      await r.save();
      console.log(`Lembrete enviado: ${r.userId.email} (${r.date} ${fmtSlots(r.slots)})`);
    } catch (e) {
      console.warn('Falha ao enviar lembrete:', e.message);
    }
  }
};

const enviarResumoSemanal = async (settings) => {
  const agora = agoraBrasilia();
  const hoje = agora.slice(0, 10);
  const diaSemana = new Date(`${hoje}T12:00:00Z`).getUTCDay();
  if (diaSemana !== 1) return;                       // só segunda-feira
  if (settings.lastWeeklySummary === hoje) return;   // já enviado hoje

  const fimMs = Date.parse(`${hoje}T00:00:00Z`);
  const inicioMs = fimMs - 7 * 86400000;
  const inicio = new Date(inicioMs).toISOString().slice(0, 10);
  const fim = new Date(fimMs - 86400000).toISOString().slice(0, 10);

  const [reservasSemana, novosUsuarios] = await Promise.all([
    Booking.find({ date: { $gte: inicio, $lte: fim } }),
    User.countDocuments({ createdAt: { $gte: new Date(inicioMs - 3 * 3600000), $lt: new Date(fimMs - 3 * 3600000) } }),
  ]);

  const ativas = reservasSemana.filter((r) => r.status !== 'cancelada');
  const resumo = {
    inicio: inicio.split('-').reverse().join('/'),
    fim: fim.split('-').reverse().join('/'),
    totalReservas: ativas.length,
    canceladas: reservasSemana.length - ativas.length,
    novosUsuarios,
    receita: ativas.reduce((a, r) => a + Number(r.total || 0), 0),
  };

  await enviarEmailResumoSemanal({ destinatario: settings.email || process.env.EMAIL_USER, resumo });
  await Settings.findByIdAndUpdate('global', { lastWeeklySummary: hoje });
  console.log(`Resumo semanal enviado (${resumo.inicio} a ${resumo.fim})`);
};

const executar = async () => {
  try {
    const settings = await Settings.findById('global');
    if (!settings) return;
    if (settings.notifReminder) await enviarLembretes(settings);
    if (settings.notifWeeklySummary) await enviarResumoSemanal(settings);
  } catch (e) {
    console.warn('Erro no scheduler:', e.message);
  }
};

const iniciarScheduler = () => {
  executar();
  setInterval(executar, 5 * 60 * 1000);
  console.log('Scheduler de notificações iniciado (a cada 5 min)');
};

module.exports = { iniciarScheduler };
