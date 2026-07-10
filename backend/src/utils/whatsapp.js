/*
  Envio de WhatsApp via Twilio (API oficial do WhatsApp Business).
  Só ativa quando as variáveis de ambiente estiverem configuradas no Render:
    TWILIO_ACCOUNT_SID   — SID da conta Twilio
    TWILIO_AUTH_TOKEN    — token de autenticação
    TWILIO_WHATSAPP_FROM — número remetente, ex: whatsapp:+14155238886
  Sem elas, enviarWhatsApp retorna false e o sistema usa apenas e-mail.
*/

const configurado = () =>
  !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);

const enviarWhatsApp = async ({ para, mensagem }) => {
  if (!configurado()) return false;

  const digits = String(para || '').replace(/\D/g, '');
  if (digits.length < 10) return false;
  const to = `whatsapp:+${digits.startsWith('55') ? digits : `55${digits}`}`;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');

  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: process.env.TWILIO_WHATSAPP_FROM,
      To: to,
      Body: mensagem,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => '');
    console.warn('Falha ao enviar WhatsApp:', resp.status, err.slice(0, 200));
    return false;
  }
  return true;
};

module.exports = { enviarWhatsApp, whatsappConfigurado: configurado };
