const PaymentModel = require('../models/Payment');
const Booking = require('../models/Booking');
const Registration = require('../models/Registration');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { broadcast } = require('../utils/live');
const { enviarEmailReservaConfirmada } = require('../utils/email');
const { MercadoPagoConfig, Payment: MpAPI } = require('mercadopago');

const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const mpApi = new MpAPI(mpClient);

const getReferenciaAndValor = async (tipo, referenciaId, userId) => {
  if (tipo === 'booking') {
    const b = await Booking.findById(referenciaId);
    if (!b) return { error: { status: 404, message: 'Reserva não encontrada' } };
    if (b.userId.toString() !== userId.toString()) return { error: { status: 403, message: 'Sem permissão' } };
    if (b.status !== 'pendente_pagamento') return { error: { status: 400, message: 'Reserva não está pendente de pagamento' } };
    return { referencia: b, valor: b.total, descricao: 'Reserva Podium Arena' };
  }
  const r = await Registration.findById(referenciaId);
  if (!r) return { error: { status: 404, message: 'Inscrição não encontrada' } };
  if (r.userId.toString() !== userId.toString()) return { error: { status: 403, message: 'Sem permissão' } };
  if (r.status !== 'pendente_pagamento') return { error: { status: 400, message: 'Inscrição não está pendente de pagamento' } };
  return { referencia: r, valor: r.precoDupla, descricao: `Inscrição — ${r.eventNome}` };
};

const confirmarReferencia = async (tipo, referenciaId, userId) => {
  if (tipo === 'booking') {
    const booking = await Booking.findByIdAndUpdate(referenciaId, { status: 'confirmada' }, { new: true });
    broadcast('bookings');
    if (booking) {
      const settings = await Settings.findById('global');
      if (settings?.notifEmailConfirm !== false) {
        User.findById(userId).select('nome email')
          .then(u => u && enviarEmailReservaConfirmada({ destinatario: u.email, nome: u.nome, reserva: booking }))
          .catch(e => console.warn('Email confirm error:', e.message));
      }
    }
  } else {
    await Registration.findByIdAndUpdate(referenciaId, { status: 'confirmada' });
    broadcast('registrations');
  }
};

const criarPix = async (req, res) => {
  const { tipo, referenciaId } = req.body;
  if (!['booking', 'registration'].includes(tipo)) {
    return res.status(400).json({ message: 'Tipo inválido' });
  }

  const { error, valor, descricao } = await getReferenciaAndValor(tipo, referenciaId, req.user._id);
  if (error) return res.status(error.status).json({ message: error.message });

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const nomeParts = (req.user.nome || 'Atleta Podium').split(' ');

  try {
    const mpResult = await mpApi.create({
      body: {
        transaction_amount: Number(valor),
        description: descricao,
        payment_method_id: 'pix',
        date_of_expiration: expiresAt.toISOString(),
        payer: {
          email: req.user.email,
          first_name: nomeParts[0],
          last_name: nomeParts.slice(1).join(' ') || nomeParts[0],
          ...(req.user.cpf ? { identification: { type: 'CPF', number: req.user.cpf.replace(/\D/g, '') } } : {}),
        },
      },
    });

    const payment = await PaymentModel.create({
      userId: req.user._id,
      tipo,
      referenciaId,
      valor,
      metodo: 'pix',
      mpPaymentId: String(mpResult.id),
      pixQrCode: mpResult.point_of_interaction?.transaction_data?.qr_code,
      pixQrCodeBase64: mpResult.point_of_interaction?.transaction_data?.qr_code_base64,
      expiresAt,
    });

    if (tipo === 'booking') await Booking.findByIdAndUpdate(referenciaId, { paymentId: payment._id });
    else await Registration.findByIdAndUpdate(referenciaId, { paymentId: payment._id });

    return res.status(201).json({
      paymentId: payment._id,
      pixQrCode: payment.pixQrCode,
      pixQrCodeBase64: payment.pixQrCodeBase64,
      expiresAt: payment.expiresAt,
      valor,
    });
  } catch (err) {
    console.error('MP Pix error:', err?.cause ?? err);
    return res.status(500).json({ message: 'Erro ao gerar Pix. Tente novamente.' });
  }
};

const criarCartao = async (req, res) => {
  const { tipo, referenciaId, token, paymentMethodId, issuerId, metodo } = req.body;
  if (!['booking', 'registration'].includes(tipo)) {
    return res.status(400).json({ message: 'Tipo inválido' });
  }
  if (!token || !paymentMethodId) {
    return res.status(400).json({ message: 'Dados do cartão inválidos' });
  }

  const { error, valor, descricao } = await getReferenciaAndValor(tipo, referenciaId, req.user._id);
  if (error) return res.status(error.status).json({ message: error.message });

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    const mpResult = await mpApi.create({
      body: {
        transaction_amount: Number(valor),
        token,
        description: descricao,
        installments: 1,
        payment_method_id: paymentMethodId,
        ...(issuerId ? { issuer_id: Number(issuerId) } : {}),
        payer: {
          email: req.user.email,
          ...(req.user.cpf ? { identification: { type: 'CPF', number: req.user.cpf.replace(/\D/g, '') } } : {}),
        },
      },
    });

    const aprovado = mpResult.status === 'approved';
    const paymentStatus = aprovado ? 'aprovado' : mpResult.status === 'rejected' ? 'cancelado' : 'pendente';

    const payment = await PaymentModel.create({
      userId: req.user._id,
      tipo,
      referenciaId,
      valor,
      metodo: metodo === 'debito' ? 'debito' : 'credito',
      mpPaymentId: String(mpResult.id),
      status: paymentStatus,
      expiresAt,
    });

    if (tipo === 'booking') await Booking.findByIdAndUpdate(referenciaId, { paymentId: payment._id });
    else await Registration.findByIdAndUpdate(referenciaId, { paymentId: payment._id });

    if (aprovado) await confirmarReferencia(tipo, referenciaId, req.user._id);

    return res.json({
      paymentId: payment._id,
      status: paymentStatus,
      statusDetail: mpResult.status_detail,
    });
  } catch (err) {
    console.error('MP Card error:', err?.cause ?? err);
    return res.status(500).json({ message: 'Erro ao processar pagamento. Tente novamente.' });
  }
};

const getStatus = async (req, res) => {
  const payment = await PaymentModel.findById(req.params.id);
  if (!payment) return res.status(404).json({ message: 'Pagamento não encontrado' });
  if (payment.userId.toString() !== req.user._id.toString() && !req.user.admin) {
    return res.status(403).json({ message: 'Sem permissão' });
  }

  if (payment.status === 'pendente' && new Date() > payment.expiresAt) {
    payment.status = 'expirado';
    await payment.save();
    if (payment.tipo === 'booking') {
      await Booking.findByIdAndUpdate(payment.referenciaId, { status: 'cancelada' });
      broadcast('bookings');
    } else {
      await Registration.findByIdAndUpdate(payment.referenciaId, { status: 'cancelada' });
      broadcast('registrations');
    }
  }

  return res.json({ status: payment.status, expiresAt: payment.expiresAt, valor: payment.valor });
};

const webhook = async (req, res) => {
  res.sendStatus(200);
  try {
    const { type, data } = req.body;
    if (type !== 'payment' || !data?.id) return;

    const mpResult = await mpApi.get({ id: String(data.id) });
    if (mpResult.status !== 'approved') return;

    const payment = await PaymentModel.findOne({ mpPaymentId: String(data.id) });
    if (!payment || payment.status !== 'pendente') return;

    payment.status = 'aprovado';
    await payment.save();
    await confirmarReferencia(payment.tipo, payment.referenciaId, payment.userId);
  } catch (err) {
    console.error('Webhook error:', err?.message);
  }
};

module.exports = { criarPix, criarCartao, getStatus, webhook };
