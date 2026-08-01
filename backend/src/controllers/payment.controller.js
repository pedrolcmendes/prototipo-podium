const crypto = require('crypto');
const PaymentModel = require('../models/Payment');
const Booking = require('../models/Booking');
const Registration = require('../models/Registration');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { broadcast } = require('../utils/live');
const { enviarEmailReservaConfirmada } = require('../utils/email');
const { cancelarReferenciaPendente } = require('../services/paymentReference.service');
const { cancelarPagamentosPendentes } = require('../services/paymentCancellation.service');
const { paymentExpirationDate } = require('../utils/paymentTimeout');
const { MercadoPagoConfig, Payment: MpAPI, Preference } = require('mercadopago');

function validarAssinaturaMP(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // sem secret configurado, pula validação

  const xSignature = req.headers['x-signature'];
  const xRequestId = req.headers['x-request-id'];
  if (!xSignature) return false;

  const parts = Object.fromEntries(xSignature.split(',').map(p => p.split('=')));
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const dataId = req.body?.data?.id ?? '';
  const manifest = `id:${dataId};request-id:${xRequestId ?? ''};ts:${ts}`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(v1);
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const mpApi = new MpAPI(mpClient);
const mpPreference = new Preference(mpClient);

const validarConfiguracaoMP = (res) => {
  if (process.env.MP_ACCESS_TOKEN) return true;
  res.status(503).json({ message: 'Mercado Pago não está configurado neste ambiente.' });
  return false;
};

const resolvePaymentExpiration = async (referencia) => {
  if (referencia.paymentExpiresAt) return new Date(referencia.paymentExpiresAt);
  const settings = await Settings.findById('global').select('paymentTimeoutMinutes');
  return paymentExpirationDate(settings);
};

const getReferenciaAndValor = async (tipo, referenciaId, userId) => {
  if (tipo === 'booking') {
    const b = await Booking.findById(referenciaId);
    if (!b) return { error: { status: 404, message: 'Reserva não encontrada' } };
    if (b.userId.toString() !== userId.toString()) return { error: { status: 403, message: 'Sem permissão' } };
    if (b.status !== 'pendente_pagamento') return { error: { status: 400, message: 'Reserva não está pendente de pagamento' } };
    const valorLiquido = b.total - (b.creditosAplicados || 0);
    if (valorLiquido <= 0) return { error: { status: 400, message: 'Reserva já coberta por créditos Arena' } };
    if (!Number.isFinite(valorLiquido) || valorLiquido <= 0) {
      return { error: { status: 400, message: 'Valor de pagamento inválido' } };
    }
    return { referencia: b, valor: valorLiquido, descricao: 'Reserva Podium Arena' };
  }
  const r = await Registration.findById(referenciaId);
  if (!r) return { error: { status: 404, message: 'Inscrição não encontrada' } };
  if (r.userId.toString() !== userId.toString()) return { error: { status: 403, message: 'Sem permissão' } };
  if (r.status !== 'pendente_pagamento') return { error: { status: 400, message: 'Inscrição não está pendente de pagamento' } };
  const valor = Number(r.valorTotal ?? r.precoDupla ?? r.preco) - (r.creditosAplicados || 0);
  if (!Number.isFinite(valor) || valor <= 0) {
    return { error: { status: 400, message: 'Valor de pagamento inválido' } };
  }
  return { referencia: r, valor, descricao: `Inscrição — ${r.eventNome}` };
};

const confirmarReferencia = async (tipo, referenciaId, userId) => {
  if (tipo === 'booking') {
    const booking = await Booking.findOneAndUpdate(
      { _id: referenciaId, status: 'pendente_pagamento' },
      { $set: { status: 'confirmada', foiPago: true, paymentExpiresAt: null } },
      { new: true },
    );
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
    const registration = await Registration.findOneAndUpdate(
      { _id: referenciaId, status: 'pendente_pagamento' },
      { $set: { status: 'confirmada', paymentExpiresAt: null } },
      { new: true },
    );
    if (registration) broadcast('registrations');
  }
};

const PAYMENT_METHOD_FILTERS = {
  pix:     { excluded_payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }, { id: 'prepaid_card' }, { id: 'atm' }] },
  credito: { excluded_payment_types: [{ id: 'bank_transfer' }, { id: 'debit_card' }, { id: 'ticket' }, { id: 'atm' }] },
};

const criarPagamentoPix = async (req, res) => {
  if (!validarConfiguracaoMP(res)) return;
  const { tipo, referenciaId } = req.body;
  if (!['booking', 'registration'].includes(tipo)) {
    return res.status(400).json({ message: 'Tipo inválido' });
  }

  const { error, referencia, valor, descricao } = await getReferenciaAndValor(tipo, referenciaId, req.user._id);
  if (error) return res.status(error.status).json({ message: error.message });

  let pagamentoPendente = await PaymentModel.findOne({
    tipo,
    referenciaId,
    metodo: 'pix',
    status: 'pendente',
  });
  if (pagamentoPendente?.mpPaymentId) {
    try {
      const mpResult = await mpApi.get({ id: pagamentoPendente.mpPaymentId });
      if (mpResult.status === 'pending' && new Date() <= pagamentoPendente.expiresAt) {
        // PIX ainda válido — devolve QR code existente para o usuário continuar
        const txData = mpResult.point_of_interaction?.transaction_data;
        return res.json({
          paymentId: pagamentoPendente._id,
          mpPaymentId: pagamentoPendente.mpPaymentId,
          qrCode: txData?.qr_code,
          qrCodeBase64: txData?.qr_code_base64,
          expiresAt: pagamentoPendente.expiresAt.toISOString(),
        });
      }
      if (mpResult.status === 'approved') {
        pagamentoPendente.status = 'aprovado';
        pagamentoPendente.paidAt ||= new Date();
        await pagamentoPendente.save();
        await confirmarReferencia(tipo, referenciaId, req.user._id);
        return res.json({
          paymentId: pagamentoPendente._id,
          mpPaymentId: pagamentoPendente.mpPaymentId,
          status: 'aprovado',
        });
      }
      const expirado = ['cancelled', 'rejected', 'refunded', 'charged_back'].includes(mpResult.status)
        || new Date() > pagamentoPendente.expiresAt;
      if (!expirado) {
        return res.status(409).json({ message: 'Já existe um pagamento em processamento para esta reserva.' });
      }
      if (mpResult.status === 'pending') {
        await cancelarPagamentosPendentes(tipo, referenciaId);
        pagamentoPendente.status = 'expirado';
        await pagamentoPendente.save();
      } else {
        pagamentoPendente.status = 'expirado';
        await pagamentoPendente.save();
      }
      await cancelarReferenciaPendente(tipo, referenciaId);
      return res.status(410).json({ message: 'O PIX anterior expirou. Inicie uma nova reserva para tentar novamente.' });
    } catch (e) {
      console.warn('Erro ao verificar PIX existente no MP:', e.message);
      return res.status(503).json({ message: 'Não foi possível consultar o PIX existente. Tente novamente em instantes.' });
    }
  }

  if (!req.user.cpf) {
    return res.status(400).json({ message: 'Cadastre seu CPF no perfil antes de pagar via PIX.' });
  }

  const expiresAt = await resolvePaymentExpiration(referencia);

  try {
    if (!pagamentoPendente) {
      const tentativa = await PaymentModel.countDocuments({ tipo, referenciaId, metodo: 'pix' });
      const idempotencyKey = crypto
        .createHash('sha256')
        .update(`pix:${tipo}:${referenciaId}:${tentativa}`)
        .digest('hex');

      try {
        pagamentoPendente = await PaymentModel.create({
          userId: req.user._id,
          tipo,
          referenciaId,
          valor,
          metodo: 'pix',
          idempotencyKey,
          expiresAt,
        });
      } catch (errorCriacao) {
        if (errorCriacao?.code !== 11000) throw errorCriacao;
        pagamentoPendente = await PaymentModel.findOne({ idempotencyKey });
      }
    }

    const nomes = req.user.nome.split(' ');
    const payerBody = {
      email: `pix.${req.user._id}@podiumarena.com.br`,
      first_name: nomes[0],
      last_name: nomes.slice(1).join(' ') || 'Usuário',
      identification: { type: 'CPF', number: req.user.cpf.replace(/\D/g, '') },
    };

    const mpResult = await mpApi.create({
      body: {
        transaction_amount: Number(valor),
        payment_method_id: 'pix',
        description: descricao,
        external_reference: `${tipo}:${referenciaId}`,
        payer: payerBody,
        date_of_expiration: expiresAt.toISOString(),
      },
      requestOptions: { idempotencyKey: pagamentoPendente.idempotencyKey },
    });

    pagamentoPendente.mpPaymentId = String(mpResult.id);
    pagamentoPendente.expiresAt = expiresAt;
    await pagamentoPendente.save();

    if (tipo === 'booking') await Booking.findByIdAndUpdate(referenciaId, { paymentId: pagamentoPendente._id });
    else await Registration.findByIdAndUpdate(referenciaId, { paymentId: pagamentoPendente._id });

    const txData = mpResult.point_of_interaction?.transaction_data;
    return res.status(201).json({
      paymentId: pagamentoPendente._id,
      mpPaymentId: String(mpResult.id),
      qrCode: txData?.qr_code,
      qrCodeBase64: txData?.qr_code_base64,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('MP PIX error:', JSON.stringify(err?.cause ?? err, null, 2));
    return res.status(502).json({ message: 'Erro ao gerar PIX. Sua reserva continua pendente; tente novamente.' });
  }
};

const criarPreferencia = async (req, res) => {
  if (!validarConfiguracaoMP(res)) return;
  const { tipo, referenciaId, metodo } = req.body;
  if (!['booking', 'registration'].includes(tipo)) {
    return res.status(400).json({ message: 'Tipo inválido' });
  }

  const { error, referencia, valor, descricao } = await getReferenciaAndValor(tipo, referenciaId, req.user._id);
  if (error) return res.status(error.status).json({ message: error.message });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  const expiresAt = await resolvePaymentExpiration(referencia);
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
    return res.status(502).json({ message: 'Erro ao iniciar pagamento. Sua reserva continua pendente.' });
  }
};

const getStatus = async (req, res) => {
  const payment = await PaymentModel.findById(req.params.id);
  if (!payment) return res.status(404).json({ message: 'Pagamento não encontrado' });
  if (payment.userId.toString() !== req.user._id.toString() && !req.user.admin) {
    return res.status(403).json({ message: 'Sem permissão' });
  }

  if (payment.status === 'pendente' && new Date() > payment.expiresAt) {
    try {
      await cancelarPagamentosPendentes(payment.tipo, payment.referenciaId);
      payment.status = 'expirado';
      await payment.save();
    } catch (error) {
      console.error('Erro ao expirar cobrança no Mercado Pago:', error.message);
      return res.status(error.status || 502).json({
        message: 'Não foi possível encerrar a cobrança expirada. Tente novamente.',
      });
    }
    await cancelarReferenciaPendente(payment.tipo, payment.referenciaId);
  }

  return res.json({ status: payment.status, expiresAt: payment.expiresAt, valor: payment.valor });
};

const webhook = async (req, res) => {
  if (!process.env.MP_ACCESS_TOKEN) return res.sendStatus(503);
  if (!validarAssinaturaMP(req)) {
    return res.sendStatus(401);
  }
  res.sendStatus(200);
  try {
    const { type, data } = req.body;
    if (type !== 'payment' || !data?.id) return;

    const mpResult = await mpApi.get({ id: String(data.id) });
    // Busca pelo mpPaymentId ou, para Checkout Pro, pelo external_reference
    let payment = await PaymentModel.findOne({ mpPaymentId: String(data.id) });

    if (!payment && mpResult.external_reference) {
      const [tipo, referenciaId] = mpResult.external_reference.split(':');
      payment = await PaymentModel.findOne({ tipo, referenciaId, status: 'pendente' });
    }

    if (!payment || payment.status !== 'pendente') return;

    payment.mpPaymentId = String(data.id);
    if (mpResult.status === 'approved') {
      payment.status = 'aprovado';
      payment.paidAt ||= new Date();
      await payment.save();
      await confirmarReferencia(payment.tipo, payment.referenciaId, payment.userId);
    } else if (['cancelled', 'rejected', 'refunded', 'charged_back'].includes(mpResult.status)) {
      payment.status = 'cancelado';
      await payment.save();
      await cancelarReferenciaPendente(payment.tipo, payment.referenciaId);
    }
  } catch (err) {
    console.error('Webhook error:', err?.message);
  }
};

const DECLINE_MESSAGES = {
  cc_rejected_bad_filled_card_number: 'Verifique o número do cartão.',
  cc_rejected_bad_filled_date: 'Verifique a data de validade.',
  cc_rejected_bad_filled_security_code: 'Verifique o código de segurança (CVV).',
  cc_rejected_blacklist: 'Cartão com restrição. Entre em contato com seu banco.',
  cc_rejected_call_for_authorize: 'Ligue para o banco para autorizar este pagamento.',
  cc_rejected_card_disabled: 'Cartão bloqueado ou desabilitado.',
  cc_rejected_duplicated_payment: 'Pagamento duplicado detectado.',
  cc_rejected_high_risk: 'Transação recusada por segurança.',
  cc_rejected_insufficient_amount: 'Saldo ou limite insuficiente.',
  cc_rejected_invalid_installments: 'Número de parcelas inválido.',
  cc_rejected_max_attempts: 'Limite de tentativas atingido. Tente novamente amanhã.',
};

const criarPagamentoCartao = async (req, res) => {
  if (!validarConfiguracaoMP(res)) return;
  const { tipo, referenciaId, token, paymentMethodId, installments, issuerId, payerIdentification } = req.body;
  if (!['booking', 'registration'].includes(tipo)) return res.status(400).json({ message: 'Tipo inválido' });
  if (!token || !paymentMethodId) return res.status(400).json({ message: 'Dados do cartão inválidos' });

  const { error, referencia, valor, descricao } = await getReferenciaAndValor(tipo, referenciaId, req.user._id);
  if (error) return res.status(error.status).json({ message: error.message });

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  const isLocalhost = backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1');
  const nomes = req.user.nome.split(' ');
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`card:${tipo}:${referenciaId}:${token}`)
    .digest('hex');

  const mpBody = {
    transaction_amount: Number(valor),
    token,
    description: descricao,
    installments: Number(installments) || 1,
    payment_method_id: paymentMethodId,
    ...(issuerId ? { issuer_id: issuerId } : {}),
    three_d_secure_mode: 'optional',
    external_reference: `${tipo}:${referenciaId}`,
    ...(!isLocalhost ? { notification_url: `${backendUrl}/api/pagamentos/webhook` } : {}),
    payer: {
      email: req.user.email,
      first_name: nomes[0],
      last_name: nomes.slice(1).join(' ') || 'Usuário',
      identification: payerIdentification?.number
        ? payerIdentification
        : req.user.cpf
          ? { type: 'CPF', number: req.user.cpf.replace(/\D/g, '') }
          : undefined,
    },
  };

  try {
    const mpResult = await mpApi.create({
      body: mpBody,
      requestOptions: { idempotencyKey },
    });

    const mpStatus = mpResult.status;
    const approved = mpStatus === 'approved';
    const rejected = mpStatus === 'rejected';

    const payment = await PaymentModel.findOneAndUpdate(
      { idempotencyKey },
      {
        $setOnInsert: {
          userId: req.user._id,
          tipo,
          referenciaId,
          valor,
          metodo: 'cartao',
          idempotencyKey,
          expiresAt: await resolvePaymentExpiration(referencia),
        },
        $set: {
          mpPaymentId: String(mpResult.id),
          status: approved ? 'aprovado' : rejected ? 'cancelado' : 'pendente',
          ...(approved ? { paidAt: new Date() } : {}),
        },
      },
      { upsert: true, new: true, runValidators: true },
    );

    if (tipo === 'booking') await Booking.findByIdAndUpdate(referenciaId, { paymentId: payment._id });
    else await Registration.findByIdAndUpdate(referenciaId, { paymentId: payment._id });

    if (approved) {
      await confirmarReferencia(tipo, referenciaId, req.user._id);
    }

    const declineMsg = rejected
      ? (DECLINE_MESSAGES[mpResult.status_detail] || 'Pagamento recusado. Verifique os dados ou tente outro cartão.')
      : null;

    return res.status(201).json({
      status: mpStatus,
      statusDetail: mpResult.status_detail,
      mpPaymentId: String(mpResult.id),
      declineMessage: declineMsg,
    });
  } catch (err) {
    const errDetail = err?.cause ?? err;
    console.error('MP Card error:', JSON.stringify(errDetail, null, 2));
    return res.status(502).json({ message: 'Erro ao processar o cartão. Sua reserva continua pendente; tente novamente.' });
  }
};

const syncPagamento = async (req, res) => {
  if (!validarConfiguracaoMP(res)) return;
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
    if (payment.userId.toString() !== req.user._id.toString() && !req.user.admin) {
      return res.status(403).json({ message: 'Sem permissão' });
    }

    if (mpResult.status === 'approved' && payment.status === 'pendente') {
      payment.mpPaymentId = String(mpPaymentId);
      payment.status = 'aprovado';
      payment.paidAt ||= new Date();
      await payment.save();
      await confirmarReferencia(payment.tipo, payment.referenciaId, payment.userId);
    } else if (['cancelled', 'rejected', 'refunded', 'charged_back'].includes(mpResult.status) && payment.status === 'pendente') {
      payment.status = 'cancelado';
      await payment.save();
      await cancelarReferenciaPendente(payment.tipo, payment.referenciaId);
    }

    return res.json({ status: payment.status });
  } catch (err) {
    console.error('Sync error:', err?.message);
    return res.status(500).json({ message: 'Erro ao sincronizar pagamento' });
  }
};

module.exports = { criarPagamentoPix, criarPreferencia, criarPagamentoCartao, getStatus, syncPagamento, webhook };
