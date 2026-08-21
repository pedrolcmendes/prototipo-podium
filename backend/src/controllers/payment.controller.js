const crypto = require('crypto');
const PaymentModel = require('../models/Payment');
const Booking = require('../models/Booking');
const Registration = require('../models/Registration');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { broadcast } = require('../utils/live');
const {
  enviarEmailReservaConfirmada,
  enviarEmailInscricaoConfirmada,
} = require('../utils/email');
const { cancelarReferenciaPendente } = require('../services/paymentReference.service');
const { cancelarPagamentosPendentes } = require('../services/paymentCancellation.service');
const { paymentExpirationDate } = require('../utils/paymentTimeout');
const { MercadoPagoConfig, Payment: MpAPI, PaymentMethod: MpPaymentMethod } = require('mercadopago');

function validarAssinaturaMP(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;

  const xSignature = req.headers['x-signature'];
  const xRequestId = req.headers['x-request-id'];
  if (!xSignature) return false;

  const parts = Object.fromEntries(xSignature.split(',').map(p => p.split('=').map(s => s.trim())));
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  // Anti-replay: rejeita assinaturas antigas (MP envia ts em segundos; os
  // testes usam milissegundos — normaliza pelos dígitos)
  const tsNumber = Number(ts);
  if (!Number.isFinite(tsNumber)) return false;
  const tsMs = String(ts).length > 11 ? tsNumber : tsNumber * 1000;
  if (Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) return false;

  // O manifesto oficial do MP usa o data.id da QUERY STRING, em minúsculas
  // quando alfanumérico e com ';' final. Aceita também as variantes (id do
  // corpo, sem ';' final) — todas exigem HMAC válido com o secret.
  const queryId = req.query?.['data.id'];
  const bodyId = req.body?.data?.id;
  const candidateIds = [...new Set(
    [queryId, bodyId]
      .filter(v => v !== undefined && v !== null && v !== '')
      .map(String)
      .flatMap(v => [v, v.toLowerCase()]),
  )];
  if (candidateIds.length === 0) candidateIds.push('');

  const receivedBuffer = Buffer.from(v1);
  return candidateIds.some((dataId) => {
    const requestIdPart = xRequestId ? `request-id:${xRequestId};` : '';
    const manifests = [
      `id:${dataId};${requestIdPart}ts:${ts};`,
      `id:${dataId};request-id:${xRequestId ?? ''};ts:${ts}`,
    ];
    return manifests.some((manifest) => {
      const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
      const expectedBuffer = Buffer.from(expected);
      return expectedBuffer.length === receivedBuffer.length
        && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    });
  });
}

const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const mpApi = new MpAPI(mpClient);
const mpPaymentMethod = new MpPaymentMethod(mpClient);
let paymentMethodsCache = { expiresAt: 0, methods: [] };

const validarMetodoCartaoCredito = async (paymentMethodId) => {
  if (Date.now() >= paymentMethodsCache.expiresAt) {
    const raw = await mpPaymentMethod.get();
    const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.response) ? raw.response : []);
    paymentMethodsCache = {
      methods: list,
      expiresAt: Date.now() + 10 * 60 * 1000,
    };
  }
  // Uma mesma bandeira pode aparecer com mais de um payment_type_id;
  // aceita se QUALQUER entrada ativa do id for cartão de crédito.
  const entries = paymentMethodsCache.methods.filter((item) => item.id === paymentMethodId);
  // fail-open: se a lista estiver vazia ou o método não for encontrado, deixa o MP decidir
  if (entries.length === 0) return true;
  return entries.some((method) => method.status === 'active' && method.payment_type_id === 'credit_card');
};

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
    if (registration) {
      broadcast('registrations');
      const user = await User.findById(userId).select('nome email');
      if (user?.email) {
        enviarEmailInscricaoConfirmada({
          destinatario: user.email,
          nome: user.nome,
          inscricao: registration,
          evento: { nome: registration.eventNome },
        }).catch((error) => console.warn('Email registration error:', error.message));
      }
    }
  }
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

const DECLINE_MESSAGES = {
  cc_rejected_bad_filled_card_number: 'Verifique o número do cartão.',
  cc_rejected_bad_filled_date: 'Verifique a data de validade.',
  cc_rejected_bad_filled_security_code: 'Verifique o código de segurança (CVV).',
  cc_rejected_bad_filled_other: 'Verifique os dados do cartão.',
  cc_rejected_blacklist: 'Cartão com restrição. Entre em contato com seu banco.',
  cc_rejected_call_for_authorize: 'Ligue para o banco para autorizar este pagamento.',
  cc_rejected_card_disabled: 'Cartão bloqueado ou desabilitado.',
  cc_rejected_duplicated_payment: 'Pagamento duplicado detectado.',
  cc_rejected_high_risk: 'Transação recusada por segurança.',
  cc_rejected_insufficient_amount: 'Saldo ou limite insuficiente.',
  cc_rejected_invalid_installments: 'Número de parcelas inválido.',
  cc_rejected_max_attempts: 'Limite de tentativas atingido. Tente novamente mais tarde.',
};

const declineMessage = (statusDetail) =>
  DECLINE_MESSAGES[statusDetail] || 'Pagamento recusado. Verifique os dados ou tente outro cartão.';

const criarPagamentoCartao = async (req, res) => {
  if (!validarConfiguracaoMP(res)) return;
  const { tipo, referenciaId, token, paymentMethodId, paymentTypeId, installments, issuerId, cardLastFour } = req.body;
  if (!['booking', 'registration'].includes(tipo)) {
    return res.status(400).json({ message: 'Tipo inválido' });
  }
  if (!token || !paymentMethodId) {
    return res.status(400).json({ message: 'Dados do cartão inválidos' });
  }
  if (Number(installments) !== 1) {
    return res.status(400).json({ message: 'O pagamento com cartão deve ser feito em uma parcela.' });
  }
  if (paymentTypeId && paymentTypeId !== 'credit_card') {
    return res.status(400).json({ message: 'A Podium Arena aceita somente cartão de crédito.' });
  }
  if (!req.user.cpf) {
    return res.status(400).json({ message: 'Cadastre seu CPF no perfil antes de pagar com cartão.' });
  }

  try {
    if (!await validarMetodoCartaoCredito(paymentMethodId)) {
      return res.status(400).json({ message: 'A Podium Arena aceita somente cartão de crédito.' });
    }
  } catch (methodError) {
    console.error('MP payment methods error:', methodError?.message);
    return res.status(503).json({ message: 'Não foi possível validar o cartão agora. Tente novamente em instantes.' });
  }

  const { error, referencia, valor, descricao } = await getReferenciaAndValor(tipo, referenciaId, req.user._id);
  if (error) return res.status(error.status).json({ message: error.message });

  let pagamentoPendente = await PaymentModel.findOne({
    tipo,
    referenciaId,
    metodo: 'cartao',
    status: 'pendente',
  });
  if (pagamentoPendente?.mpPaymentId) {
    try {
      const mpResult = await mpApi.get({ id: pagamentoPendente.mpPaymentId });
      if (mpResult.status === 'approved') {
        pagamentoPendente.status = 'aprovado';
        pagamentoPendente.paidAt ||= new Date();
        await pagamentoPendente.save();
        await confirmarReferencia(tipo, referenciaId, req.user._id);
        return res.json({
          paymentId: pagamentoPendente._id,
          mpPaymentId: pagamentoPendente.mpPaymentId,
          status: 'approved',
        });
      }
      if (['pending', 'in_process', 'authorized'].includes(mpResult.status) && new Date() <= pagamentoPendente.expiresAt) {
        return res.status(409).json({ message: 'Já existe um pagamento em processamento para esta reserva.' });
      }
      // recusado, cancelado ou expirado — encerra a tentativa e permite uma nova
      pagamentoPendente.status = new Date() > pagamentoPendente.expiresAt ? 'expirado' : 'cancelado';
      pagamentoPendente.mpStatus = mpResult.status;
      pagamentoPendente.statusDetail = mpResult.status_detail || null;
      await pagamentoPendente.save();
      pagamentoPendente = null;
    } catch (e) {
      console.warn('Erro ao verificar cartão existente no MP:', e.message);
      return res.status(503).json({ message: 'Não foi possível consultar a tentativa anterior. Tente novamente em instantes.' });
    }
  }

  const expiresAt = await resolvePaymentExpiration(referencia);
  // chave por tentativa: token do Brick + contagem de tentativas. Uma tentativa
  // que sofreu timeout REUTILIZA a chave gravada (o MP devolve o resultado
  // original em vez de cobrar de novo); uma tentativa encerrada gera chave nova.
  const gerarChaveCartao = async () => {
    const tentativa = await PaymentModel.countDocuments({ tipo, referenciaId, metodo: 'cartao' });
    return crypto
      .createHash('sha256')
      .update(`card:${tipo}:${referenciaId}:${token}:${tentativa}`)
      .digest('hex');
  };

  let idempotencyKey;
  try {
    if (pagamentoPendente) {
      // registro de tentativa anterior que não chegou ao MP — mantém a chave original
      if (!pagamentoPendente.idempotencyKey) {
        pagamentoPendente.idempotencyKey = await gerarChaveCartao();
      }
      pagamentoPendente.valor = valor;
      pagamentoPendente.expiresAt = expiresAt;
      pagamentoPendente.processingStartedAt = new Date();
      await pagamentoPendente.save();
    } else {
      idempotencyKey = await gerarChaveCartao();
      try {
        pagamentoPendente = await PaymentModel.create({
          userId: req.user._id,
          tipo,
          referenciaId,
          valor,
          metodo: 'cartao',
          idempotencyKey,
          paymentTypeId: 'credit_card',
          cardBrand: paymentMethodId,
          cardLastFour: cardLastFour || null,
          processingStartedAt: new Date(),
          expiresAt,
        });
      } catch (errorCriacao) {
        if (errorCriacao?.code !== 11000) throw errorCriacao;
        pagamentoPendente = await PaymentModel.findOne({ idempotencyKey });
      }
    }
    idempotencyKey = pagamentoPendente.idempotencyKey;

    if (tipo === 'booking') await Booking.findByIdAndUpdate(referenciaId, { paymentId: pagamentoPendente._id });
    else await Registration.findByIdAndUpdate(referenciaId, { paymentId: pagamentoPendente._id });

    const nomes = req.user.nome.split(' ');
    const mpResult = await mpApi.create({
      body: {
        transaction_amount: Number(valor),
        token,
        installments: 1,
        payment_method_id: paymentMethodId,
        ...(issuerId ? { issuer_id: issuerId } : {}),
        description: descricao,
        external_reference: `${tipo}:${referenciaId}`,
        payer: {
          email: req.user.email,
          first_name: nomes[0],
          last_name: nomes.slice(1).join(' ') || 'Usuário',
          identification: { type: 'CPF', number: req.user.cpf.replace(/\D/g, '') },
        },
      },
      requestOptions: { idempotencyKey },
    });

    pagamentoPendente.mpPaymentId = String(mpResult.id);
    pagamentoPendente.mpStatus = mpResult.status;
    pagamentoPendente.statusDetail = mpResult.status_detail || null;
    pagamentoPendente.cardBrand = mpResult.payment_method_id || paymentMethodId;
    pagamentoPendente.cardLastFour = mpResult.card?.last_four_digits || cardLastFour || null;
    pagamentoPendente.lastSyncedAt = new Date();

    // 3DS Challenge exigido pelo emissor — devolve os dados para o front
    const threeDs = mpResult.three_ds_info;
    if (threeDs?.external_resource_url) {
      pagamentoPendente.requiresAction = true;
      pagamentoPendente.threeDsInfo = {
        externalResourceURL: threeDs.external_resource_url,
        creq: threeDs.creq || null,
      };
      await pagamentoPendente.save();
      return res.status(201).json({
        paymentId: pagamentoPendente._id,
        mpPaymentId: pagamentoPendente.mpPaymentId,
        status: mpResult.status,
        statusDetail: mpResult.status_detail || null,
        requiresAction: true,
        threeDsInfo: pagamentoPendente.threeDsInfo,
        expiresAt: expiresAt.toISOString(),
      });
    }

    if (mpResult.status === 'approved') {
      pagamentoPendente.status = 'aprovado';
      pagamentoPendente.paidAt ||= new Date();
      await pagamentoPendente.save();
      await confirmarReferencia(tipo, referenciaId, req.user._id);
      return res.status(201).json({
        paymentId: pagamentoPendente._id,
        mpPaymentId: pagamentoPendente.mpPaymentId,
        status: 'approved',
      });
    }

    if (['rejected', 'cancelled'].includes(mpResult.status)) {
      pagamentoPendente.status = 'cancelado';
      await pagamentoPendente.save();
      return res.status(201).json({
        paymentId: pagamentoPendente._id,
        mpPaymentId: pagamentoPendente.mpPaymentId,
        status: 'rejected',
        declineMessage: declineMessage(mpResult.status_detail),
      });
    }

    // pending / in_process — segue pendente; o modal acompanha via /sync
    await pagamentoPendente.save();
    return res.status(201).json({
      paymentId: pagamentoPendente._id,
      mpPaymentId: pagamentoPendente.mpPaymentId,
      status: mpResult.status,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('MP Card error:', JSON.stringify(err?.cause ?? err, null, 2));
    const httpStatus = Number(err?.status || err?.api_response?.status);
    if ([401, 403].includes(httpStatus)) {
      // recusa definitiva do MP (ex.: PA_UNAUTHORIZED_RESULT_FROM_POLICIES ou
      // credenciais inválidas) — encerra a tentativa para a próxima gerar chave nova
      if (pagamentoPendente) {
        pagamentoPendente.status = 'cancelado';
        pagamentoPendente.statusDetail = err?.cause?.[0]?.code || 'policy_unauthorized';
        await pagamentoPendente.save().catch(() => {});
      }
      return res.status(422).json({ message: 'O Mercado Pago recusou a transação por política de segurança. Tente novamente; se o erro persistir, verifique o MP_ACCESS_TOKEN e a public key do ambiente.' });
    }
    return res.status(502).json({ message: 'Erro ao processar o pagamento. Sua reserva continua pendente; tente novamente.' });
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

// Concilia o estado local com o estado do Mercado Pago. Compartilhada entre
// webhook e sync para os dois caminhos aplicarem exatamente as mesmas regras.
const aplicarStatusMP = async (payment, mpResult, mpPaymentId) => {
  if (mpResult.status === 'approved') {
    if (payment.status === 'pendente') {
      payment.mpPaymentId = mpPaymentId;
      payment.mpStatus = mpResult.status;
      payment.statusDetail = mpResult.status_detail || null;
      payment.status = 'aprovado';
      payment.paidAt ||= new Date();
      await payment.save();
      await confirmarReferencia(payment.tipo, payment.referenciaId, payment.userId);
      return { status: 'aprovado' };
    }
    if (['cancelado', 'expirado'].includes(payment.status)) {
      // Aprovação tardia (pagou depois da referência ser cancelada/expirada):
      // política da arena — converte o valor em Créditos Arena, uma única vez.
      const credited = await PaymentModel.findOneAndUpdate(
        { _id: payment._id, arenaCreditsRefundedAt: null },
        {
          $set: {
            status: 'estornado_creditos',
            arenaCreditsRefundedAt: new Date(),
            arenaCreditsRefundedValue: payment.valor,
            mpPaymentId,
            mpStatus: mpResult.status,
            statusDetail: mpResult.status_detail || null,
            paidAt: payment.paidAt || new Date(),
          },
        },
        { new: true },
      );
      if (credited) {
        await User.findByIdAndUpdate(payment.userId, { $inc: { creditos: payment.valor } });
        broadcast('users');
        broadcast('payments');
      }
      return { status: 'estornado_creditos' };
    }
    return { status: payment.status };
  }

  const isChargebackOuEstorno = ['refunded', 'charged_back'].includes(mpResult.status);
  const novoStatusFinanceiro = mpResult.status === 'charged_back' ? 'chargeback' : 'estornado';
  if (isChargebackOuEstorno
    && ['aprovado', 'estornado'].includes(payment.status)
    && payment.status !== novoStatusFinanceiro) {
    // Dinheiro saiu depois da aprovação — marca para revisão financeira manual
    const isChargeback = mpResult.status === 'charged_back';
    const updated = await PaymentModel.findOneAndUpdate(
      { _id: payment._id },
      {
        $set: {
          status: isChargeback ? 'chargeback' : 'estornado',
          [isChargeback ? 'chargedBackAt' : 'refundedAt']: new Date(),
          mpStatus: mpResult.status,
          statusDetail: mpResult.status_detail || null,
          financialReviewRequired: true,
          financialReviewReason: isChargeback
            ? `Chargeback registrado no Mercado Pago (pagamento ${mpPaymentId}).`
            : `Estorno registrado no Mercado Pago (pagamento ${mpPaymentId}).`,
        },
      },
      { new: true },
    );
    broadcast('payments');
    return { status: updated?.status || payment.status };
  }

  if (['cancelled', 'rejected', 'refunded', 'charged_back'].includes(mpResult.status) && payment.status === 'pendente') {
    payment.status = 'cancelado';
    payment.mpStatus = mpResult.status;
    payment.statusDetail = mpResult.status_detail || null;
    await payment.save();
    // Cartão recusado NÃO cancela a reserva — o cliente pode tentar outro
    // cartão. PIX cancelado no MP encerra a referência.
    if (payment.metodo === 'pix') {
      await cancelarReferenciaPendente(payment.tipo, payment.referenciaId);
    }
    const resultado = { status: 'cancelado' };
    if (mpResult.status === 'rejected') resultado.declineMessage = declineMessage(mpResult.status_detail);
    return resultado;
  }

  // MP ainda pendente porém o prazo local venceu — encerra a cobrança
  if (payment.status === 'pendente' && payment.expiresAt && new Date() > new Date(payment.expiresAt)) {
    await cancelarPagamentosPendentes(payment.tipo, payment.referenciaId);
    payment.status = 'expirado';
    await payment.save();
    await cancelarReferenciaPendente(payment.tipo, payment.referenciaId);
    return { status: 'expirado' };
  }

  return { status: payment.status };
};

const buscarPagamentoPorMp = async (mpPaymentId, mpResult) => {
  let payment = await PaymentModel.findOne({ mpPaymentId });
  if (!payment && mpResult.external_reference) {
    const [tipo, referenciaId] = mpResult.external_reference.split(':');
    payment = await PaymentModel.findOne({ tipo, referenciaId, status: 'pendente' });
  }
  return payment;
};

const webhook = async (req, res) => {
  if (!process.env.MP_ACCESS_TOKEN) return res.sendStatus(503);
  // fail-closed: sem o segredo configurado não há como autenticar a notificação
  if (!process.env.MP_WEBHOOK_SECRET) return res.sendStatus(503);
  if (!validarAssinaturaMP(req)) {
    return res.sendStatus(401);
  }
  try {
    const { type, data } = req.body ?? {};
    const dataId = data?.id ?? req.query?.['data.id'];
    if (type !== 'payment' || !dataId) return res.sendStatus(200);

    const mpResult = await mpApi.get({ id: String(dataId) });
    const payment = await buscarPagamentoPorMp(String(dataId), mpResult);
    if (!payment) return res.sendStatus(200);

    await aplicarStatusMP(payment, mpResult, String(dataId));
    // 200 somente após persistir — em falha o MP reentrega a notificação
    return res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err?.message);
    return res.sendStatus(500);
  }
};

const syncPagamento = async (req, res) => {
  if (!validarConfiguracaoMP(res)) return;
  const { mpPaymentId } = req.query;
  if (!mpPaymentId) return res.status(400).json({ message: 'mpPaymentId obrigatório' });

  try {
    const mpResult = await mpApi.get({ id: String(mpPaymentId) });
    const payment = await buscarPagamentoPorMp(String(mpPaymentId), mpResult);

    if (!payment) return res.json({ status: 'not_found' });
    if (payment.userId.toString() !== req.user._id.toString() && !req.user.admin) {
      return res.status(403).json({ message: 'Sem permissão' });
    }

    const resultado = await aplicarStatusMP(payment, mpResult, String(mpPaymentId));
    return res.json(resultado);
  } catch (err) {
    console.error('Sync error:', err?.message);
    return res.status(500).json({ message: 'Erro ao sincronizar pagamento' });
  }
};

const listarRevisoesFinanceiras = async (req, res) => {
  const payments = await PaymentModel.find({ financialReviewRequired: true })
    .sort({ updatedAt: -1 })
    .limit(100)
    .populate('userId', 'nome email');
  return res.json(payments);
};

const resolverRevisaoFinanceira = async (req, res) => {
  const payment = await PaymentModel.findOneAndUpdate(
    { _id: req.params.id, financialReviewRequired: true },
    { $set: { financialReviewRequired: false, financialReviewedAt: new Date(), financialReviewedBy: req.user._id } },
    { new: true },
  );
  if (!payment) return res.status(404).json({ message: 'Revisão financeira não encontrada.' });
  broadcast('payments');
  return res.json(payment);
};

module.exports = { criarPagamentoPix, criarPagamentoCartao, getStatus, syncPagamento, webhook, listarRevisoesFinanceiras, resolverRevisaoFinanceira };
