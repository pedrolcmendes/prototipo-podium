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

module.exports = { enviarEmailResetSenha, enviarEmailSenhaAlterada };
