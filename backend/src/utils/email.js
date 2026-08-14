const nodemailer = require('nodemailer');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'img', 'logo.png');

const transporter = process.env.EMAIL_JSON_TRANSPORT === 'true'
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

const logoAttachment = {
  filename: 'logo.png',
  path: LOGO_PATH,
  cid: 'logo@podiumarena',
};

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const primeiroNome = (nome = '') => escapeHtml(nome.trim().split(/\s+/)[0] || 'atleta');
const moeda = (valor) => Number(valor || 0).toFixed(2).replace('.', ',');

const baseEmail = (conteudo) => `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#141414;border-radius:0;overflow:hidden;border:1px solid #2a2a2a;">
        <tr><td style="background:#111;padding:28px 36px;border-bottom:2px solid #c5a028;text-align:center;">
          <img src="cid:logo@podiumarena" alt="Podium Arena" height="48" style="display:block;margin:0 auto;">
        </td></tr>
        <tr><td style="padding:36px 36px 20px;">${conteudo}</td></tr>
        <tr><td style="background:#0d0d0d;padding:20px 36px;border-top:1px solid #1e1e1e;text-align:center;">
          <p style="margin:0 0 4px;font-size:11px;color:#555;letter-spacing:2px;">PODIUM ARENA</p>
          <p style="margin:0;font-size:11px;color:#444;">Este é um e-mail automático. Não responda a esta mensagem.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const send = ({ destinatario, subject, corpo }) => transporter.sendMail({
  from: `"Podium Arena" <${process.env.EMAIL_USER}>`,
  to: destinatario,
  replyTo: `noreply <${process.env.EMAIL_USER}>`,
  subject,
  html: baseEmail(corpo),
  attachments: [logoAttachment],
});

const titulo = (rotulo, texto, cor = '#c5a028') => `
  <p style="margin:0 0 8px;font-size:13px;letter-spacing:3px;color:${cor};text-transform:uppercase;font-weight:700;">${rotulo}</p>
  <h1 style="margin:0 0 20px;font-size:22px;color:#fff;letter-spacing:1px;font-weight:700;">${texto}</h1>`;

const fmtSlots = (slots = []) => {
  if (!slots.length) return 'Day Use';
  return [...slots].sort((a, b) => a - b).map((h) => `${String(h).padStart(2, '0')}h`).join(', ');
};

const fmtData = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
};

const blocoReserva = (reserva) => `
  <table cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:0;width:100%;margin-bottom:24px;">
    <tr><td style="padding:18px 20px;">
      <p style="margin:0 0 10px;font-size:11px;color:#666;letter-spacing:2px;text-transform:uppercase;">Detalhes da reserva</p>
      <p style="margin:0 0 6px;font-size:14px;color:#ccc;"><strong style="color:#c5a028;">Modalidade:</strong> ${escapeHtml(reserva.modalidade || '—')}</p>
      ${reserva.quadra ? `<p style="margin:0 0 6px;font-size:14px;color:#ccc;"><strong style="color:#c5a028;">Quadra:</strong> ${escapeHtml(reserva.quadra)}</p>` : ''}
      <p style="margin:0 0 6px;font-size:14px;color:#ccc;"><strong style="color:#c5a028;">Data:</strong> ${fmtData(reserva.date)}</p>
      <p style="margin:0 0 6px;font-size:14px;color:#ccc;"><strong style="color:#c5a028;">Horário:</strong> ${fmtSlots(reserva.slots)}</p>
      <p style="margin:0;font-size:14px;color:#ccc;"><strong style="color:#c5a028;">Total:</strong> R$ ${moeda(reserva.total)}</p>
    </td></tr>
  </table>`;

const blocoInscricao = (inscricao, evento = {}) => `
  <table cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:0;width:100%;margin-bottom:24px;">
    <tr><td style="padding:18px 20px;">
      <p style="margin:0 0 10px;font-size:11px;color:#666;letter-spacing:2px;text-transform:uppercase;">Detalhes da inscrição</p>
      <p style="margin:0 0 6px;font-size:14px;color:#ccc;"><strong style="color:#c5a028;">Campeonato:</strong> ${escapeHtml(evento.nome || inscricao.eventNome || '—')}</p>
      ${evento.data ? `<p style="margin:0 0 6px;font-size:14px;color:#ccc;"><strong style="color:#c5a028;">Data:</strong> ${fmtData(evento.data)}</p>` : ''}
      ${evento.hora ? `<p style="margin:0 0 6px;font-size:14px;color:#ccc;"><strong style="color:#c5a028;">Horário:</strong> ${escapeHtml(evento.hora)}</p>` : ''}
      ${evento.local ? `<p style="margin:0 0 6px;font-size:14px;color:#ccc;"><strong style="color:#c5a028;">Local:</strong> ${escapeHtml(evento.local)}</p>` : ''}
      ${inscricao.nivel ? `<p style="margin:0 0 6px;font-size:14px;color:#ccc;"><strong style="color:#c5a028;">Nível:</strong> ${escapeHtml(inscricao.nivel)}</p>` : ''}
      ${inscricao.parceiro ? `<p style="margin:0 0 6px;font-size:14px;color:#ccc;"><strong style="color:#c5a028;">Dupla:</strong> ${escapeHtml(inscricao.parceiro)}</p>` : ''}
      <p style="margin:0;font-size:14px;color:#ccc;"><strong style="color:#c5a028;">Total:</strong> R$ ${moeda(inscricao.valorTotal ?? inscricao.precoDupla ?? inscricao.preco)}</p>
    </td></tr>
  </table>`;

const enviarEmailContaCriada = ({ destinatario, nome }) => send({
  destinatario,
  subject: 'Conta criada com sucesso — Podium Arena',
  corpo: `${titulo('Bem-vindo à arena', 'Conta criada com sucesso! 🏆')}
    <p style="margin:0 0 16px;font-size:15px;color:#ccc;line-height:1.6;">Olá, <strong style="color:#fff;">${primeiroNome(nome)}</strong>!</p>
    <p style="margin:0 0 24px;font-size:14px;color:#999;line-height:1.7;">Sua conta na <strong style="color:#ccc;">Podium Arena</strong> está pronta. Agora você pode reservar quadras, acompanhar seus horários e se inscrever nos campeonatos.</p>
    <p style="margin:0;font-size:13px;color:#777;text-align:center;">Nos vemos na quadra!</p>`,
});

const enviarEmailResetSenha = ({ destinatario, nome, link }) => {
  const safeLink = escapeHtml(link);
  return send({
    destinatario,
    subject: 'Redefinição de senha — Podium Arena',
    corpo: `${titulo('Segurança da conta', 'Redefinição de senha')}
      <p style="margin:0 0 16px;font-size:15px;color:#ccc;line-height:1.6;">Olá, <strong style="color:#fff;">${primeiroNome(nome)}</strong>!</p>
      <p style="margin:0 0 28px;font-size:14px;color:#999;line-height:1.7;">Recebemos uma solicitação para redefinir sua senha. Use o botão abaixo para criar uma nova.</p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;"><tr><td style="background:#c5a028;border-radius:0;">
        <a href="${safeLink}" target="_blank" style="display:inline-block;padding:14px 30px;color:#000;font-weight:700;font-size:14px;letter-spacing:2px;text-decoration:none;text-transform:uppercase;">Redefinir senha</a>
      </td></tr></table>
      <p style="margin:0 0 4px;font-size:12px;color:#666;">Se o botão não funcionar, copie este link:</p>
      <p style="margin:0 0 24px;font-size:11px;word-break:break-all;"><a href="${safeLink}" style="color:#c5a028;">${safeLink}</a></p>
      <p style="margin:0;font-size:12px;color:#666;text-align:center;">O link expira em 2 horas. Se não foi você, ignore este e-mail.</p>`,
  });
};

const enviarEmailSenhaAlterada = ({ destinatario, nome }) => send({
  destinatario,
  subject: 'Sua senha foi alterada — Podium Arena',
  corpo: `${titulo('Segurança da conta', 'Senha alterada')}
    <p style="margin:0 0 16px;font-size:15px;color:#ccc;line-height:1.6;">Olá, <strong style="color:#fff;">${primeiroNome(nome)}</strong>!</p>
    <p style="margin:0 0 24px;font-size:14px;color:#999;line-height:1.7;">Sua senha foi alterada com sucesso em ${new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })}.</p>
    <p style="margin:0;font-size:12px;color:#e07878;text-align:center;">Se não foi você, entre em contato com a Podium Arena imediatamente.</p>`,
});

const enviarEmailReservaConfirmada = ({ destinatario, nome, reserva }) => send({
  destinatario,
  subject: 'Reserva confirmada — Podium Arena',
  corpo: `${titulo('Reserva confirmada', 'Nos vemos na quadra! 🏆')}
    <p style="margin:0 0 24px;font-size:14px;color:#999;line-height:1.7;">Olá, <strong style="color:#fff;">${primeiroNome(nome)}</strong>! Sua reserva foi confirmada.</p>
    ${blocoReserva(reserva)}
    <p style="margin:0;font-size:12px;color:#666;text-align:center;">Para cancelar ou consultar, acesse Meu Painel no site.</p>`,
});

const enviarEmailLembreteReserva = ({ destinatario, nome, reserva }) => send({
  destinatario,
  subject: 'Lembrete: sua reserva começa em 1 hora — Podium Arena',
  corpo: `${titulo('Lembrete', 'Sua reserva é daqui a pouco ⏰')}
    <p style="margin:0 0 24px;font-size:14px;color:#999;line-height:1.7;">Olá, <strong style="color:#fff;">${primeiroNome(nome)}</strong>! Seu horário começa em aproximadamente 1 hora.</p>
    ${blocoReserva(reserva)}
    <p style="margin:0;font-size:12px;color:#666;text-align:center;">Chegue com alguns minutos de antecedência. Bom jogo!</p>`,
});

const enviarEmailReservaCancelada = ({ destinatario, nome, reserva, creditosEstornados = 0 }) => send({
  destinatario,
  subject: 'Reserva cancelada — Podium Arena',
  corpo: `${titulo('Reserva cancelada', 'Cancelamento confirmado', '#e05555')}
    <p style="margin:0 0 24px;font-size:14px;color:#999;line-height:1.7;">Olá, <strong style="color:#fff;">${primeiroNome(nome)}</strong>. Sua reserva foi cancelada.</p>
    ${blocoReserva(reserva)}
    ${Number(creditosEstornados) > 0 ? `<p style="margin:0;font-size:13px;color:#999;text-align:center;">Foram devolvidos <strong style="color:#c5a028;">R$ ${moeda(creditosEstornados)}</strong> em Créditos Arena.</p>` : ''}`,
});

const enviarEmailInscricaoConfirmada = ({ destinatario, nome, inscricao, evento }) => send({
  destinatario,
  subject: `Inscrição confirmada — ${evento?.nome || inscricao.eventNome || 'Podium Arena'}`,
  corpo: `${titulo('Inscrição confirmada', 'Você está no campeonato! 🏆')}
    <p style="margin:0 0 24px;font-size:14px;color:#999;line-height:1.7;">Olá, <strong style="color:#fff;">${primeiroNome(nome)}</strong>! Sua inscrição foi confirmada. Prepare-se para competir!</p>
    ${blocoInscricao(inscricao, evento)}
    <p style="margin:0;font-size:12px;color:#666;text-align:center;">Acompanhe eventuais atualizações pelo site da Podium Arena.</p>`,
});

const enviarEmailCancelamentoAdmin = ({ destinatario, reserva, canceladoPor }) => send({
  destinatario,
  subject: `Reserva cancelada — ${reserva.userName || 'cliente'} (${reserva.date || 'day use'})`,
  corpo: `${titulo('Alerta de cancelamento', 'Reserva cancelada', '#e05555')}
    <p style="margin:0 0 24px;font-size:14px;color:#999;line-height:1.7;">A reserva de <strong style="color:#fff;">${escapeHtml(reserva.userName || '—')}</strong> foi cancelada${canceladoPor ? ` por <strong style="color:#ccc;">${escapeHtml(canceladoPor)}</strong>` : ''}. O horário voltou a ficar disponível.</p>
    ${blocoReserva(reserva)}`,
});

const enviarEmailResumoSemanal = ({ destinatario, resumo }) => {
  const linha = (label, valor) => `<tr><td style="padding:10px 20px;border-bottom:1px solid #222;font-size:13px;color:#999;">${label}</td><td style="padding:10px 20px;border-bottom:1px solid #222;font-size:14px;color:#fff;font-weight:700;text-align:right;">${valor}</td></tr>`;
  return send({
    destinatario,
    subject: `Resumo semanal — Podium Arena (${resumo.inicio} a ${resumo.fim})`,
    corpo: `${titulo('Resumo semanal', `Semana de ${escapeHtml(resumo.inicio)} a ${escapeHtml(resumo.fim)}`)}
      <table cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:0;width:100%;margin-bottom:24px;overflow:hidden;">
        ${linha('Reservas na semana', resumo.totalReservas)}
        ${linha('Reservas canceladas', resumo.canceladas)}
        ${linha('Novos usuários', resumo.novosUsuarios)}
        ${linha('Receita da semana', `R$ ${moeda(resumo.receita)}`)}
      </table>`,
  });
};

module.exports = {
  enviarEmailContaCriada,
  enviarEmailResetSenha,
  enviarEmailSenhaAlterada,
  enviarEmailReservaConfirmada,
  enviarEmailLembreteReserva,
  enviarEmailReservaCancelada,
  enviarEmailInscricaoConfirmada,
  enviarEmailCancelamentoAdmin,
  enviarEmailResumoSemanal,
};
