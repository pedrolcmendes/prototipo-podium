const nodemailer = require('nodemailer');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'img', 'logo.png');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
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

const baseEmail = (conteudo) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#141414;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">

        <!-- Header -->
        <tr>
          <td style="background:#111;padding:28px 36px;border-bottom:2px solid #c5a028;text-align:center;">
            <img src="cid:logo@podiumarena" alt="Podium Arena" height="48" style="display:block;margin:0 auto;"/>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:36px 36px 20px;">${conteudo}</td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0d0d0d;padding:20px 36px;border-top:1px solid #1e1e1e;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;color:#444;letter-spacing:2px;">PODIUM ARENA</p>
            <p style="margin:0;font-size:11px;color:#333;">Este é um email automático, não responda a esta mensagem.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

const enviarEmailResetSenha = async ({ destinatario, nome, link }) => {
  const primeiroNome = nome.split(' ')[0];

  const corpo = `
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:3px;color:#c5a028;text-transform:uppercase;font-weight:700;">Segurança da conta</p>
    <h1 style="margin:0 0 20px;font-size:22px;color:#fff;letter-spacing:1px;font-weight:700;">Redefinição de Senha</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#ccc;line-height:1.6;">Olá, <strong style="color:#fff;">${primeiroNome}</strong>!</p>
    <p style="margin:0 0 28px;font-size:14px;color:#999;line-height:1.7;">
      Recebemos uma solicitação para redefinir a senha da sua conta na <strong style="color:#ccc;">Podium Arena</strong>. Clique no botão abaixo para criar uma nova senha.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
      <tr>
        <td align="center" style="background:#c5a028;border-radius:6px;">
          <a href="${link}" target="_blank" style="display:inline-block;padding:14px 36px;color:#000;font-weight:700;font-size:14px;letter-spacing:2px;text-decoration:none;text-transform:uppercase;">
            Redefinir Senha
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 4px;font-size:12px;color:#555;">Se o botão não funcionar, copie e cole este link no navegador:</p>
    <p style="margin:0 0 28px;font-size:11px;word-break:break-all;">
      <a href="${link}" style="color:#c5a028;text-decoration:none;">${link}</a>
    </p>

    <hr style="border:none;border-top:1px solid #2a2a2a;margin:0 0 24px;"/>

    <table cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-left:3px solid #c5a028;border-radius:0 6px 6px 0;width:100%;">
      <tr><td style="padding:14px 16px;font-size:13px;color:#888;line-height:1.6;">
        ⚠️ <strong style="color:#aaa;">Não foi você?</strong> Ignore este email — sua senha permanece a mesma e nenhuma alteração será feita.
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:#444;text-align:center;">Este link expira em <strong style="color:#666;">2 horas</strong>.</p>
  `;

  await transporter.sendMail({
    from: `"Podium Arena" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    replyTo: `noreply <${process.env.EMAIL_USER}>`,
    subject: 'Redefinição de senha — Podium Arena',
    html: baseEmail(corpo),
    attachments: [logoAttachment],
  });
};

const enviarEmailSenhaAlterada = async ({ destinatario, nome }) => {
  const primeiroNome = nome.split(' ')[0];
  const agora = new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' });

  const corpo = `
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:3px;color:#c5a028;text-transform:uppercase;font-weight:700;">Segurança da conta</p>
    <h1 style="margin:0 0 20px;font-size:22px;color:#fff;letter-spacing:1px;font-weight:700;">Senha Alterada</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#ccc;line-height:1.6;">Olá, <strong style="color:#fff;">${primeiroNome}</strong>!</p>
    <p style="margin:0 0 24px;font-size:14px;color:#999;line-height:1.7;">
      Sua senha na <strong style="color:#ccc;">Podium Arena</strong> foi alterada com sucesso.
    </p>

    <table cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:8px;width:100%;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:11px;color:#555;letter-spacing:2px;text-transform:uppercase;">Data e horário</p>
        <p style="margin:0;font-size:14px;color:#ccc;font-weight:600;">${agora}</p>
      </td></tr>
    </table>

    <hr style="border:none;border-top:1px solid #2a2a2a;margin:0 0 24px;"/>

    <table cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-left:3px solid #e05555;border-radius:0 6px 6px 0;width:100%;">
      <tr><td style="padding:14px 16px;font-size:13px;color:#888;line-height:1.6;">
        🔒 <strong style="color:#aaa;">Não foi você?</strong> Entre em contato com o suporte da Podium Arena imediatamente para proteger sua conta.
      </td></tr>
    </table>
  `;

  await transporter.sendMail({
    from: `"Podium Arena" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    replyTo: `noreply <${process.env.EMAIL_USER}>`,
    subject: 'Sua senha foi alterada — Podium Arena',
    html: baseEmail(corpo),
    attachments: [logoAttachment],
  });
};

const fmtSlots = (slots = []) => {
  if (!slots.length) return 'Day Use';
  return [...slots].sort((a, b) => a - b).map((h) => `${String(h).padStart(2, '0')}h`).join(', ');
};

const fmtData = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};

const blocoReserva = (reserva) => `
    <table cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:8px;width:100%;margin-bottom:24px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 10px;font-size:11px;color:#555;letter-spacing:2px;text-transform:uppercase;">Detalhes da reserva</p>
        <p style="margin:0 0 6px;font-size:14px;color:#ccc;"><strong style="color:#c5a028;">Modalidade:</strong> ${reserva.modalidade || '—'}</p>
        ${reserva.quadra ? `<p style="margin:0 0 6px;font-size:14px;color:#ccc;"><strong style="color:#c5a028;">Quadra:</strong> ${reserva.quadra}</p>` : ''}
        <p style="margin:0 0 6px;font-size:14px;color:#ccc;"><strong style="color:#c5a028;">Data:</strong> ${fmtData(reserva.date)}</p>
        <p style="margin:0 0 6px;font-size:14px;color:#ccc;"><strong style="color:#c5a028;">Horário:</strong> ${fmtSlots(reserva.slots)}</p>
        <p style="margin:0;font-size:14px;color:#ccc;"><strong style="color:#c5a028;">Total:</strong> R$ ${Number(reserva.total || 0).toFixed(2).replace('.', ',')}</p>
      </td></tr>
    </table>`;

const enviarEmailReservaConfirmada = async ({ destinatario, nome, reserva }) => {
  const primeiroNome = (nome || '').split(' ')[0];
  const corpo = `
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:3px;color:#c5a028;text-transform:uppercase;font-weight:700;">Reserva confirmada</p>
    <h1 style="margin:0 0 20px;font-size:22px;color:#fff;letter-spacing:1px;font-weight:700;">Nos vemos na quadra! 🏆</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#999;line-height:1.7;">
      Olá, <strong style="color:#fff;">${primeiroNome}</strong>! Sua reserva na <strong style="color:#ccc;">Podium Arena</strong> foi confirmada. Confira os detalhes abaixo.
    </p>
    ${blocoReserva(reserva)}
    <p style="margin:0;font-size:12px;color:#555;text-align:center;">Precisa cancelar ou alterar? Acesse <strong style="color:#888;">Meu Painel</strong> no site.</p>
  `;

  await transporter.sendMail({
    from: `"Podium Arena" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    replyTo: `noreply <${process.env.EMAIL_USER}>`,
    subject: 'Reserva confirmada — Podium Arena',
    html: baseEmail(corpo),
    attachments: [logoAttachment],
  });
};

const enviarEmailLembreteReserva = async ({ destinatario, nome, reserva }) => {
  const primeiroNome = (nome || '').split(' ')[0];
  const corpo = `
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:3px;color:#c5a028;text-transform:uppercase;font-weight:700;">Lembrete</p>
    <h1 style="margin:0 0 20px;font-size:22px;color:#fff;letter-spacing:1px;font-weight:700;">Sua reserva é daqui a pouco ⏰</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#999;line-height:1.7;">
      Olá, <strong style="color:#fff;">${primeiroNome}</strong>! Passando para lembrar que seu horário na <strong style="color:#ccc;">Podium Arena</strong> está chegando.
    </p>
    ${blocoReserva(reserva)}
    <p style="margin:0;font-size:12px;color:#555;text-align:center;">Chegue com alguns minutos de antecedência. Bom jogo! 🎾</p>
  `;

  await transporter.sendMail({
    from: `"Podium Arena" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    replyTo: `noreply <${process.env.EMAIL_USER}>`,
    subject: 'Lembrete: sua reserva é daqui a pouco — Podium Arena',
    html: baseEmail(corpo),
    attachments: [logoAttachment],
  });
};

const enviarEmailCancelamentoAdmin = async ({ destinatario, reserva, canceladoPor }) => {
  const corpo = `
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:3px;color:#e05555;text-transform:uppercase;font-weight:700;">Alerta de cancelamento</p>
    <h1 style="margin:0 0 20px;font-size:22px;color:#fff;letter-spacing:1px;font-weight:700;">Reserva Cancelada</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#999;line-height:1.7;">
      A reserva de <strong style="color:#fff;">${reserva.userName || '—'}</strong> foi cancelada${canceladoPor ? ` por <strong style="color:#ccc;">${canceladoPor}</strong>` : ''}. O horário voltou a ficar disponível.
    </p>
    ${blocoReserva(reserva)}
  `;

  await transporter.sendMail({
    from: `"Podium Arena" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    replyTo: `noreply <${process.env.EMAIL_USER}>`,
    subject: `Reserva cancelada — ${reserva.userName || 'cliente'} (${reserva.date || 'day use'})`,
    html: baseEmail(corpo),
    attachments: [logoAttachment],
  });
};

const enviarEmailResumoSemanal = async ({ destinatario, resumo }) => {
  const linha = (label, valor) => `
      <tr>
        <td style="padding:10px 20px;border-bottom:1px solid #222;font-size:13px;color:#999;">${label}</td>
        <td style="padding:10px 20px;border-bottom:1px solid #222;font-size:14px;color:#fff;font-weight:700;text-align:right;">${valor}</td>
      </tr>`;

  const corpo = `
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:3px;color:#c5a028;text-transform:uppercase;font-weight:700;">Resumo semanal</p>
    <h1 style="margin:0 0 20px;font-size:22px;color:#fff;letter-spacing:1px;font-weight:700;">Semana de ${resumo.inicio} a ${resumo.fim}</h1>
    <table cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:8px;width:100%;margin-bottom:24px;overflow:hidden;">
      ${linha('Reservas na semana', resumo.totalReservas)}
      ${linha('Reservas canceladas', resumo.canceladas)}
      ${linha('Novos usuários', resumo.novosUsuarios)}
      ${linha('Receita da semana', `R$ ${Number(resumo.receita || 0).toFixed(2).replace('.', ',')}`)}
    </table>
    <p style="margin:0;font-size:12px;color:#555;text-align:center;">Relatório automático enviado toda segunda-feira.</p>
  `;

  await transporter.sendMail({
    from: `"Podium Arena" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    replyTo: `noreply <${process.env.EMAIL_USER}>`,
    subject: `Resumo semanal — Podium Arena (${resumo.inicio} a ${resumo.fim})`,
    html: baseEmail(corpo),
    attachments: [logoAttachment],
  });
};

module.exports = {
  enviarEmailResetSenha,
  enviarEmailSenhaAlterada,
  enviarEmailReservaConfirmada,
  enviarEmailLembreteReserva,
  enviarEmailCancelamentoAdmin,
  enviarEmailResumoSemanal,
};
