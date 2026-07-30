const PaymentModel = require('../models/Payment');
const Booking = require('../models/Booking');
const Registration = require('../models/Registration');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { broadcast } = require('../utils/live');
const { enviarEmailReservaConfirmada } = require('../utils/email');
const { MercadoPagoConfig, Payment: MpAPI, Preference } = require('mercadopago');

const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const mpApi = new MpAPI(mpClient);
const mpPreference = new Preference(mpClient);

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

const cancelarReferencia = async (tipo, referenciaId) => {
  try {
    if (tipo === 'booking') {
      await Booking.findByIdAndUpdate(referenciaId, { status: 'cancelada' });
      broadcast('bookings');
    } else {
      await Registration.findByIdAndUpdate(referenciaId, { status: 'cancelada' });
      broadcast('registrations');
    }
  } catch (e) {
    console.warn('Erro ao cancelar após falha de pagamento:', e.message);
  }
};

const PAYMENT_METHOD_FILTERS = {
  pix:     { excluded_payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }, { id: 'prepaid_card' }, { id: 'atm' }] },
  credito: { excluded_payment_types: [{ id: 'bank_transfer' }, { id: 'debit_card' }, { id: 'ticket' }, { id: 'atm' }] },
  debito:  { excluded_payment_types: [{ id: 'bank_transfer' }, { id: 'credit_card' }, { id: 'ticket' }, { id: 'atm' }] },
};

const criarPagamentoPix = async (req, res) => {
  const { tipo, referenciaId } = req.body;
  if (!['booking', 'registration'].includes(tipo)) {
    return res.status(400).json({ message: 'Tipo inválido' });
  }

  const { error, valor, descricao } = await getReferenciaAndValor(tipo, referenciaId, req.user._id);
  if (error) return res.status(error.status).json({ message: error.message });

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  try {
    const mpResult = await mpApi.create({
      body: {
        transaction_amount: Number(valor),
        payment_method_id: 'pix',
        description: descricao,
        external_reference: `${tipo}:${referenciaId}`,
        payer: {
          email: req.user.email,
          first_name: req.user.nome.split(' ')[0],
          last_name: req.user.nome.split(' ').slice(1).join(' ') || 'Usuário',
        },
        date_of_expiration: expiresAt.toISOString(),
      },
    });

    const payment = await PaymentModel.create({
      userId: req.user._id,
      tipo,
      referenciaId,
      valor,
      metodo: 'pix',
      mpPaymentId: String(mpResult.id),
      expiresAt,
    });

    if (tipo === 'booking') await Booking.findByIdAndUpdate(referenciaId, { paymentId: payment._id });
    else await Registration.findByIdAndUpdate(referenciaId, { paymentId: payment._id });

    const txData = mpResult.point_of_interaction?.transaction_data;
    return res.status(201).json({
      paymentId: payment._id,
      mpPaymentId: String(mpResult.id),
      qrCode: txData?.qr_code,
      qrCodeBase64: txData?.qr_code_base64,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('MP PIX error:', JSON.stringify(err?.cause ?? err, null, 2));
    await cancelarReferencia(tipo, referenciaId);
    return res.status(500).json({ message: 'Erro ao gerar PIX. Reserva cancelada.' });
  }
};

const criarPreferencia = async (req, res) => {
  const { tipo, referenciaId, metodo } = req.body;
  if (!['booking', 'registration'].includes(tipo)) {
    return res.status(400).json({ message: 'Tipo inválido' });
  }

  const { error, valor, descricao } = await getReferenciaAndValor(tipo, referenciaId, req.user._id);
  if (error) return res.status(error.status).json({ message: error.message });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const paymentMethods = PAYMENT_METHOD_FILTERS[metodo] || {};

  try {
    const pref = await mpPreference.create({
      body: {
        items: [{
          title: descricao,
          quantity: 1,
          unit_price: Number(valor),
          currency_id: 'BRL',
        }],
        payer: {
          name: req.user.nome,
          email: req.user.email,
        },
        back_urls: {
          success: `${frontendUrl}/pagamento/retorno`,
          failure: `${frontendUrl}/pagamento/retorno`,
          pending: `${frontendUrl}/pagamento/retorno`,
        },
        ...(frontendUrl.startsWith('https') ? { auto_return: 'approved' } : {}),
        external_reference: `${tipo}:${referenciaId}`,
        notification_url: `${backendUrl}/api/pagamentos/webhook`,
        expires: true,
        expiration_date_to: expiresAt.toISOString(),
        ...(Object.keys(paymentMethods).length ? { payment_methods: paymentMethods } : {}),
      },
    });

    const payment = await PaymentModel.create({
      userId: req.user._id,
      tipo,
      referenciaId,
      valor,
      metodo: 'checkout_pro',
      mpPreferenceId: pref.id,
      checkoutUrl: pref.init_point,
      sandboxUrl: pref.sandbox_init_point,
      expiresAt,
    });

    if (tipo === 'booking') await Booking.findByIdAndUpdate(referenciaId, { paymentId: payment._id });
    else await Registration.findByIdAndUpdate(referenciaId, { paymentId: payment._id });

    return res.status(201).json({
      paymentId: payment._id,
      checkoutUrl: pref.init_point,
      sandboxUrl: pref.sandbox_init_point,
    });
  } catch (err) {
    console.error('MP Preference error:', JSON.stringify(err?.cause ?? err, null, 2));
    await cancelarReferencia(tipo, referenciaId);
    return res.status(500).json({ message: 'Erro ao iniciar pagamento. Reserva cancelada.' });
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
    await cancelarReferencia(payment.tipo, payment.referenciaId);
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

    // Busca pelo mpPaymentId ou, para Checkout Pro, pelo external_reference
    let payment = await PaymentModel.findOne({ mpPaymentId: String(data.id) });

    if (!payment && mpResult.external_reference) {
      const [tipo, referenciaId] = mpResult.external_reference.split(':');
      payment = await PaymentModel.findOne({ tipo, referenciaId, status: 'pendente' });
    }

    if (!payment || payment.status !== 'pendente') return;

    payment.mpPaymentId = String(data.id);
    payment.status = 'aprovado';
    await payment.save();
    await confirmarReferencia(payment.tipo, payment.referenciaId, payment.userId);
  } catch (err) {
    console.error('Webhook error:', err?.message);
  }
};

const syncPagamento = async (req, res) => {
  const { mpPaymentId } = req.query;
  if (!mpPaymentId) return res.status(400).json({ message: 'mpPaymentId obrigatório' });

  try {
    const mpResult = await mpApi.get({ id: String(mpPaymentId) });

    let payment = await PaymentModel.findOne({ mpPaymentId: String(mpPaymentId) });

    if (!payment && mpResult.external_reference) {
      const [tipo, referenciaId] = mpResult.external_reference.split(':');
      payment = await PaymentModel.findOne({ tipo, referenciaId, status: 'pendente' });
    }

    if (!payment) return res.json({ status: 'not_found' });

    if (mpResult.status === 'approved' && payment.status === 'pendente') {
      payment.mpPaymentId = String(mpPaymentId);
      payment.status = 'aprovado';
      await payment.save();
      await confirmarReferencia(payment.tipo, payment.referenciaId, payment.userId);
    }

    return res.json({ status: payment.status });
  } catch (err) {
    console.error('Sync error:', err?.message);
    return res.status(500).json({ message: 'Erro ao sincronizar pagamento' });
  }
};

module.exports = { criarPagamentoPix, criarPreferencia, getStatus, syncPagamento, webhook };
