import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { CardPayment } from '@mercadopago/sdk-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const fmtReal = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtCPF = (v) => {
  const n = v.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 6) return `${n.slice(0,3)}.${n.slice(3)}`;
  if (n.length <= 9) return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6)}`;
  return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-${n.slice(9)}`;
};

function formatTime(ms) {
  if (ms === null) return '--:--';
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const CARD_METHODS = new Set(['credito', 'cartao']);

export default function PagamentoModal({ tipo, referenciaId, metodo, valor, creditosAplicados = 0, onClose }) {
  const { user, updateUser } = useAuth();
  const isCreditos = metodo === 'creditos';
  const isCard = CARD_METHODS.has(metodo);
  const cpfLimpo = user?.cpf ? user.cpf.replace(/\D/g, '') : '';

  const initialPhase = isCreditos ? 'choose' : isCard ? (cpfLimpo ? 'cartao' : 'sem_cpf') : 'loading';
  const [phase, setPhase] = useState(initialPhase);

  // PIX state
  const [pixData, setPixData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const pollRef = useRef(null);
  const timerRef = useRef(null);
  const pixCalledRef = useRef(false);
  const cardSubmittingRef = useRef(false);
  const cancellationCalledRef = useRef(false);

  // PIX cancel confirm state
  const [confirmCancelPix, setConfirmCancelPix] = useState(false);

  // Card state
  const [cardError, setCardError] = useState(null);
  const [cardBrickKey, setCardBrickKey] = useState(0); // remonta o brick ao tentar novamente

  // CPF state
  const [cpfInput, setCpfInput] = useState('');
  const [cpfSaving, setCpfSaving] = useState(false);
  const [cpfErr, setCpfErr] = useState('');

  // Generic error
  const [errorMsg, setErrorMsg] = useState(null);

  // ─── PIX ───────────────────────────────────────────────
  const iniciarPix = useCallback(() => {
    if (pixCalledRef.current) return;
    pixCalledRef.current = true;
    setPhase('loading');

    api.post('/pagamentos/pix', { tipo, referenciaId })
      .then(({ data }) => {
        if (data.status === 'aprovado') {
          window.location.href = `/pagamento/retorno?collection_id=${data.mpPaymentId}&collection_status=approved`;
          return;
        }
        setPixData(data);
        setPhase('pix');
        pollRef.current = setInterval(async () => {
          try {
            const { data: sync } = await api.get(`/pagamentos/sync?mpPaymentId=${data.mpPaymentId}`);
            if (sync.status === 'aprovado') {
              clearInterval(pollRef.current);
              window.location.href = `/pagamento/retorno?collection_id=${data.mpPaymentId}&collection_status=approved`;
            } else if (['cancelado', 'expirado'].includes(sync.status)) {
              clearInterval(pollRef.current);
              setPhase('expired');
            }
          } catch { /* ignora */ }
        }, 3000);
      })
      .catch(err => {
        const msg = err.code === 'ECONNABORTED'
          ? 'O servidor demorou para responder. Verifique sua conexão e tente novamente.'
          : err.response?.data?.message || 'Erro ao gerar PIX. Tente novamente.';
        setErrorMsg(msg);
        setPhase('error');
      });
  }, [tipo, referenciaId]);

  // Inicia PIX diretamente se metodo === 'pix'
  useEffect(() => {
    if (!isCreditos && !isCard) {
      iniciarPix();
    }
    return () => { clearInterval(pollRef.current); clearInterval(timerRef.current); };
  }, [isCreditos, isCard, iniciarPix]);

  const cancelarReferencia = useCallback(async () => {
    if (cancellationCalledRef.current) return;
    cancellationCalledRef.current = true;
    const resource = tipo === 'registration' ? 'registrations' : 'bookings';
    try {
      const { data } = await api.patch(`/${resource}/${referenciaId}/cancelar`);
      const estornados = Number(data?.creditosEstornados || 0);
      if (estornados > 0) {
        updateUser({ creditos: Number(user?.creditos || 0) + estornados });
      }
    } catch {
      cancellationCalledRef.current = false;
    }
  }, [tipo, referenciaId, updateUser, user?.creditos]);

  // Countdown do PIX
  useEffect(() => {
    if (!pixData?.expiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, new Date(pixData.expiresAt) - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timerRef.current);
        clearInterval(pollRef.current);
        setPhase('expired');
        void cancelarReferencia();
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [pixData, cancelarReferencia]);

  const copiarPix = async () => {
    try {
      await navigator.clipboard.writeText(pixData.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setErrorMsg('Não foi possível copiar automaticamente. Selecione a chave PIX e copie manualmente.');
    }
  };

  const cancelarPix = async () => {
    clearInterval(pollRef.current);
    clearInterval(timerRef.current);
    await cancelarReferencia();
    onClose();
  };

  const confirmarCancelPix = () => setConfirmCancelPix(true);
  const voltarPix = () => setConfirmCancelPix(false);

  const cancelarCartao = async () => {
    await cancelarReferencia();
    onClose();
  };

  // ─── CARTÃO ────────────────────────────────────────────
  const handleCardSubmit = useCallback(async (formData) => {
    if (cardSubmittingRef.current) return;
    cardSubmittingRef.current = true;
    try {
      const { data } = await api.post('/pagamentos/cartao', {
        tipo,
        referenciaId,
        token: formData.token,
        paymentMethodId: formData.payment_method_id,
        installments: formData.installments,
        issuerId: formData.issuer_id,
        payerIdentification: formData.payer?.identification,
      });

      if (data.status === 'approved') {
        window.location.href = `/pagamento/retorno?collection_id=${data.mpPaymentId}&collection_status=approved`;
      } else if (['in_process', 'pending', 'authorized'].includes(data.status)) {
        setPhase('cartao_pendente');
      } else {
        setCardError(data.declineMessage || 'Pagamento recusado. Verifique os dados ou tente outro cartão.');
        setPhase('cartao_erro');
        cardSubmittingRef.current = false;
      }
    } catch (err) {
      const msg = err.code === 'ECONNABORTED'
        ? 'O servidor demorou para responder. Verifique sua conexão e tente novamente.'
        : err.response?.data?.message || 'Erro ao processar o pagamento. Tente novamente.';
      setCardError(msg);
      setPhase('cartao_erro');
      cardSubmittingRef.current = false;
    }
  }, [tipo, referenciaId]);

  const brickInit = useMemo(() => ({
    amount: Number(valor),
    payer: {
      email: user?.email || '',
      identification: { type: 'CPF', number: cpfLimpo },
    },
  }), [valor, cpfLimpo, user?.email]);
  const brickCustomization = useMemo(() => ({
    visual: {
      style: {
        theme: 'dark',
        customVariables: {
          textPrimaryColor: '#f9fafb',
          textSecondaryColor: '#9ca3af',
          inputBackgroundColor: '#1a1a1a',
          formBackgroundColor: '#111111',
          baseColor: '#e0ac6b',
          baseColorFirstVariant: '#c8953a',
          baseColorSecondVariant: '#f0c07a',
          errorColor: '#ef4444',
          outlinePrimaryColor: '#e0ac6b',
          outlineSecondaryColor: '#2a2a2a',
          buttonTextColor: '#000000',
          borderRadiusFull: '0px',
          borderRadiusLarge: '0px',
          borderRadiusMedium: '0px',
          borderRadiusSmall: '0px',
        },
      },
    },
    paymentMethods: { maxInstallments: 1 },
  }), []);

  const handleBrickReady = useCallback(() => {
    if (!cpfLimpo) return;
    const container = document.getElementById('cardPaymentBrick_container');
    if (!container) return;
    const docInput = container.querySelector('input[name="DOCUMENT"], select[name="DOCUMENT"]');
    if (!docInput) return;
    let el = docInput.parentElement;
    while (el && el !== container) {
      if (el.querySelector('label')) { el.style.display = 'none'; return; }
      el = el.parentElement;
    }
    docInput.closest('div').style.display = 'none';
  }, [cpfLimpo]);

  const tentarPixNovamente = () => {
    pixCalledRef.current = false;
    setErrorMsg(null);
    iniciarPix();
  };

  const tentarNovamente = () => {
    cardSubmittingRef.current = false;
    setCardError(null);
    setCardBrickKey(k => k + 1);
    setPhase('cartao');
  };

  // ─── CPF ───────────────────────────────────────────────
  const salvarCpf = async () => {
    const raw = cpfInput.replace(/\D/g, '');
    if (raw.length !== 11) { setCpfErr('CPF inválido. Digite os 11 dígitos.'); return; }
    setCpfSaving(true);
    setCpfErr('');
    try {
      const { data } = await api.put('/users/me', { cpf: raw });
      updateUser(data);
      setPhase('cartao');
    } catch (err) {
      setCpfErr(err.response?.data?.message || 'Erro ao salvar. Tente novamente.');
    } finally {
      setCpfSaving(false);
    }
  };

  // ─── Choose (creditos parcial) ──────────────────────────
  const escolherPix = () => {
    iniciarPix();
  };

  const escolherCartao = () => {
    if (!cpfLimpo) { setPhase('sem_cpf'); return; }
    setPhase('cartao');
  };

  // ─── Helpers ───────────────────────────────────────────
  const timerUrgente = timeLeft !== null && timeLeft < 5 * 60 * 1000;
  const canClose = ['choose', 'pix', 'expired', 'cartao', 'cartao_erro', 'cartao_pendente', 'sem_cpf'].includes(phase);

  const headerLabel = {
    pix: 'PIX',
    credito: 'Cartão de Crédito',
    cartao: 'Cartão de Crédito',
    creditos: 'Créditos Arena',
  }[metodo] || 'Pagamento';

  return (
    <>
      <style>{`
        .pag-overlay{position:fixed;inset:0;z-index:9800;background:rgba(0,0,0,.93);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto}
        .pag-modal{background:var(--card);border:1px solid var(--border);max-width:500px;width:100%;display:flex;flex-direction:column;margin:auto}
        .pag-header{padding:1.4rem 2rem;border-bottom:1px solid var(--border);background:linear-gradient(135deg,rgba(224,172,107,.07),transparent);display:flex;align-items:center;justify-content:space-between;gap:1rem}
        .pag-header-left{display:flex;flex-direction:column}
        .pag-header-right{display:flex;align-items:center;gap:.75rem;flex-shrink:0}
        .pag-eyebrow{font-family:var(--font-cond);font-size:.62rem;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:.2rem}
        .pag-title{font-family:var(--font-display);font-size:1.5rem;letter-spacing:2px;line-height:1}
        .pag-valor{font-family:var(--font-display);font-size:1.9rem;color:var(--gold)}
        .pag-close-x{background:none;border:none;color:var(--muted);cursor:pointer;padding:.2rem;display:flex;align-items:center;transition:color .15s;line-height:0}
        .pag-close-x:hover{color:var(--white)}
        .pag-body{padding:2rem;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2rem;min-height:180px;text-align:center}
        .pag-spinner{width:36px;height:36px;border:2px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:pag-spin .8s linear infinite;flex-shrink:0}
        .pag-spinner-sm{width:14px;height:14px;border-width:1.5px}
        @keyframes pag-spin{to{transform:rotate(360deg)}}
        .pag-body p{font-family:var(--font-cond);font-size:.85rem;color:var(--gray);letter-spacing:1px;line-height:1.5}
        .pag-mp-logo{display:flex;align-items:center;gap:.5rem;font-family:var(--font-cond);font-size:.72rem;letter-spacing:1.5px;color:var(--muted)}
        .pag-icon-err{width:56px;height:56px;border-radius:50%;background:rgba(239,68,68,.08);border:1.5px solid rgba(239,68,68,.3);display:flex;align-items:center;justify-content:center}
        .pag-icon-err svg{stroke:#ef4444}
        .pag-icon-warn{width:56px;height:56px;border-radius:50%;background:rgba(245,158,11,.08);border:1.5px solid rgba(245,158,11,.3);display:flex;align-items:center;justify-content:center}
        .pag-icon-warn svg{stroke:#f59e0b}
        .pag-icon-ok{width:56px;height:56px;border-radius:50%;background:rgba(34,197,94,.08);border:1.5px solid rgba(34,197,94,.3);display:flex;align-items:center;justify-content:center}
        .pag-icon-ok svg{stroke:#22c55e}
        .pag-err-title{font-family:var(--font-cond);font-size:1.1rem;letter-spacing:1px;color:var(--white)}
        .pag-footer{padding:1rem 2rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:.6rem}
        .pag-cancel-btn{background:none;border:1px solid var(--border);color:var(--gray);padding:.45rem .9rem;font-family:var(--font-cond);font-size:.72rem;font-weight:700;letter-spacing:1.5px;cursor:pointer;transition:all var(--trans-fast)}
        .pag-cancel-btn:hover{border-color:#ef4444;color:#ef4444}
        .pag-retry-btn{background:var(--gold);color:#000;border:none;padding:.45rem 1.1rem;font-family:var(--font-cond);font-size:.72rem;font-weight:700;letter-spacing:1.5px;cursor:pointer;transition:opacity .15s}
        .pag-retry-btn:hover{opacity:.85}
        .pag-pix-qr{border:1px solid var(--border);background:#fff;padding:8px;width:200px;height:200px;object-fit:contain}
        .pag-pix-label{font-family:var(--font-cond);font-size:.8rem;color:var(--white);letter-spacing:1px}
        .pag-pix-copy{display:flex;gap:.5rem;width:100%;max-width:380px;align-items:stretch}
        .pag-pix-key{flex:1;font-family:monospace;font-size:.6rem;color:var(--gray);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:var(--dark);border:1px solid var(--border);padding:.55rem .75rem;text-align:left}
        .pag-pix-btn{background:var(--gold);color:#000;border:none;padding:.55rem 1.1rem;font-family:var(--font-cond);font-size:.72rem;font-weight:700;letter-spacing:1.5px;cursor:pointer;white-space:nowrap;transition:opacity .15s}
        .pag-pix-btn:hover{opacity:.85}
        .pag-pix-waiting{display:flex;align-items:center;gap:.5rem;font-family:var(--font-cond);font-size:.72rem;color:var(--muted);letter-spacing:.5px}
        .pag-pix-timer{font-family:var(--font-cond);font-size:.78rem;letter-spacing:.5px;color:var(--muted)}
        .pag-pix-timer.urgente{color:#f59e0b}
        .pag-pix-timer strong{font-size:.95rem}
        .pag-credits-info{background:rgba(224,172,107,.06);border:1px solid rgba(224,172,107,.2);padding:.75rem 1.1rem;width:100%;max-width:400px;display:flex;flex-direction:column;gap:.35rem}
        .pag-credits-row{display:flex;justify-content:space-between;font-family:var(--font-cond);font-size:.75rem;letter-spacing:.5px;color:var(--gray)}
        .pag-credits-row span:last-child{color:var(--gold)}
        .pag-choose-label{font-family:var(--font-cond);font-size:.72rem;letter-spacing:3px;text-transform:uppercase;color:var(--gray)}
        .pag-choose-methods{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;width:100%;max-width:400px}
        .pag-choose-btn{display:flex;flex-direction:column;align-items:center;gap:.6rem;border:1px solid var(--border);background:var(--dark);padding:1.2rem 1rem;cursor:pointer;transition:all var(--trans-fast);font-family:var(--font-cond)}
        .pag-choose-btn:hover{border-color:var(--gold);background:var(--gold-faint)}
        .pag-choose-btn svg{stroke:var(--gray);transition:stroke var(--trans-fast)}
        .pag-choose-btn:hover svg{stroke:var(--gold)}
        .pag-choose-btn-name{font-size:.88rem;font-weight:700;letter-spacing:.5px;color:var(--white)}
        .pag-choose-btn-sub{font-size:.68rem;color:var(--gray);letter-spacing:.5px}
        .pag-card-wrap{width:100%;padding:0 .5rem}
        .pag-card-wrap #cardPaymentBrick_container > div{background:transparent!important}
        .pag-refund-notice{margin:1rem 1.5rem 0;padding:.75rem .9rem;border:1px solid rgba(224,172,107,.35);background:rgba(224,172,107,.08);color:var(--gray);font-size:.72rem;line-height:1.45}
        .pag-refund-notice strong{color:var(--gold)}
      `}</style>

      <div className="pag-overlay">
        <div className="pag-modal">

          {/* HEADER */}
          <div className="pag-header">
            <div className="pag-header-left">
              <p className="pag-eyebrow">{headerLabel}</p>
              <h2 className="pag-title">PAGAMENTO</h2>
            </div>
            <div className="pag-header-right">
              {creditosAplicados > 0 ? (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-cond)', fontSize: '.62rem', letterSpacing: '1.5px', color: 'var(--gold)', opacity: .8, marginBottom: '.15rem' }}>
                    — {fmtReal(creditosAplicados)} créditos
                  </div>
                  <div className="pag-valor">{fmtReal(valor)}</div>
                </div>
              ) : (
                <div className="pag-valor">{fmtReal(valor)}</div>
              )}
              {canClose && (
                <button className="pag-close-x" onClick={onClose} title="Fechar">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>
          </div>

          <div className="pag-refund-notice" role="note">
            <strong>Política de cancelamento:</strong> em caso de cancelamento, o valor pago é convertido em <strong>Créditos Arena</strong> para uso futuro na Podium Arena.
          </div>

          {/* BODY */}
          <div className="pag-body">

            {/* ── Choose: PIX ou Cartão (créditos parcial) ── */}
            {phase === 'choose' && (
              <>
                {creditosAplicados > 0 && (
                  <div className="pag-credits-info">
                    <div className="pag-credits-row">
                      <span>Créditos Arena aplicados</span>
                      <span>— {fmtReal(creditosAplicados)}</span>
                    </div>
                    <div className="pag-credits-row">
                      <span>Restante a pagar</span>
                      <span style={{ color: 'var(--white)' }}>{fmtReal(valor)}</span>
                    </div>
                  </div>
                )}
                <p className="pag-choose-label">Como pagar o restante?</p>
                <div className="pag-choose-methods">
                  <button className="pag-choose-btn" onClick={escolherPix}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="5" y="5" width="3" height="3"/>
                      <rect x="16" y="5" width="3" height="3"/><rect x="5" y="16" width="3" height="3"/>
                      <path d="M14 14h3v3"/><path d="M17 17h3v3"/><path d="M14 20h1"/>
                    </svg>
                    <div className="pag-choose-btn-name">PIX</div>
                    <div className="pag-choose-btn-sub">QR Code na hora</div>
                  </button>
                  <button className="pag-choose-btn" onClick={escolherCartao}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="2"/>
                      <line x1="2" y1="10" x2="22" y2="10"/>
                      <line x1="6" y1="15" x2="9" y2="15"/>
                    </svg>
                    <div className="pag-choose-btn-name">Cartão de Crédito</div>
                    <div className="pag-choose-btn-sub">Preencha na próxima tela</div>
                  </button>
                </div>
              </>
            )}

            {/* ── Loading (gerando PIX) ── */}
            {phase === 'loading' && (
              <>
                <div className="pag-spinner" />
                <p>Gerando QR Code PIX…</p>
                <span className="pag-mp-logo">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Pagamento seguro · SSL
                </span>
              </>
            )}

            {/* ── PIX ── */}
            {phase === 'pix' && pixData && (
              <>
                {pixData.qrCodeBase64 && (
                  <img className="pag-pix-qr" src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="QR Code PIX" />
                )}
                <p className="pag-pix-label">Escaneie o QR code ou copie a chave PIX:</p>
                <div className="pag-pix-copy">
                  <div className="pag-pix-key">{pixData.qrCode}</div>
                  <button className="pag-pix-btn" onClick={copiarPix}>{copied ? '✓ Copiado' : 'Copiar'}</button>
                </div>
                <div className="pag-pix-waiting">
                  <div className="pag-spinner pag-spinner-sm" />
                  Aguardando pagamento — confirmação automática
                </div>
                <div className={`pag-pix-timer${timerUrgente ? ' urgente' : ''}`}>
                  Expira em <strong>{formatTime(timeLeft)}</strong>
                </div>
                {confirmCancelPix ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem', width: '100%' }}>
                    <p style={{ fontFamily: 'var(--font-cond)', fontSize: '.8rem', color: 'var(--white)', letterSpacing: '.5px', margin: 0 }}>Tem certeza que deseja cancelar?</p>
                    <div style={{ display: 'flex', gap: '.6rem' }}>
                      <button className="pag-cancel-btn" onClick={cancelarPix}>Sim, cancelar</button>
                      <button className="pag-retry-btn" onClick={voltarPix}>Voltar</button>
                    </div>
                  </div>
                ) : (
                  <button className="pag-cancel-btn" onClick={confirmarCancelPix}>Cancelar pagamento</button>
                )}
              </>
            )}

            {/* ── Cartão: Brick ── */}
            {phase === 'cartao' && (
              <>
                <div className="pag-card-wrap">
                  <CardPayment
                    key={cardBrickKey}
                    initialization={brickInit}
                    onSubmit={handleCardSubmit}
                    onReady={handleBrickReady}
                    customization={brickCustomization}
                  />
                </div>
                <button className="pag-cancel-btn" onClick={cancelarCartao}>Cancelar pagamento</button>
              </>
            )}

            {/* ── Cartão: pagamento em análise ── */}
            {phase === 'cartao_pendente' && (
              <>
                <div className="pag-icon-warn">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <p className="pag-err-title">Pagamento em Análise</p>
                <p>Seu pagamento está sendo processado pelo banco. Você receberá confirmação por e-mail em breve.</p>
              </>
            )}

            {/* ── Cartão: recusado ── */}
            {phase === 'cartao_erro' && (
              <>
                <div className="pag-icon-err">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                </div>
                <p className="pag-err-title">Pagamento Recusado</p>
                <p>{cardError}</p>
              </>
            )}

            {/* ── PIX expirado ── */}
            {phase === 'expired' && (
              <>
                <div className="pag-icon-warn">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <p className="pag-err-title">PIX Expirado</p>
                <p>O tempo para pagamento encerrou. Sua reserva será cancelada em breve.</p>
              </>
            )}

            {/* ── Sem CPF ── */}
            {phase === 'sem_cpf' && (
              <>
                <div className="pag-icon-warn">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <p className="pag-err-title">CPF necessário</p>
                <p>Informe seu CPF para pagar com cartão de crédito.</p>
                <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpfInput}
                    onChange={e => { setCpfErr(''); setCpfInput(fmtCPF(e.target.value)); }}
                    onKeyDown={e => e.key === 'Enter' && salvarCpf()}
                    style={{ background: 'rgba(255,255,255,.05)', border: `1px solid ${cpfErr ? '#ef4444' : 'var(--border)'}`, padding: '.65rem .9rem', color: 'var(--white)', fontSize: '.9rem', fontFamily: 'var(--font-cond)', outline: 'none', width: '100%', boxSizing: 'border-box', letterSpacing: '1px' }}
                  />
                  {cpfErr && <span style={{ color: '#ef4444', fontSize: '.72rem', letterSpacing: '.5px' }}>{cpfErr}</span>}
                  <button
                    className="pag-retry-btn"
                    onClick={salvarCpf}
                    disabled={cpfSaving}
                    style={{ width: '100%', padding: '.65rem', opacity: cpfSaving ? .7 : 1, cursor: cpfSaving ? 'not-allowed' : 'pointer' }}
                  >
                    {cpfSaving ? 'Salvando…' : 'Salvar e continuar'}
                  </button>
                </div>
              </>
            )}

            {/* ── Erro geral ── */}
            {phase === 'error' && (
              <>
                <div className="pag-icon-err">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                </div>
                <p className="pag-err-title">Erro no Pagamento</p>
                <p>{errorMsg}</p>
              </>
            )}

          </div>

          {/* FOOTER */}
          {(phase === 'expired' || phase === 'cartao_pendente') && (
            <div className="pag-footer">
              <button className="pag-cancel-btn" onClick={onClose}>Fechar</button>
            </div>
          )}
          {phase === 'error' && (
            <div className="pag-footer">
              <button className="pag-cancel-btn" onClick={onClose}>Fechar</button>
              <button className="pag-retry-btn" onClick={tentarPixNovamente}>Tentar novamente</button>
            </div>
          )}
          {phase === 'cartao_erro' && (
            <div className="pag-footer">
              <button className="pag-cancel-btn" onClick={onClose}>Cancelar</button>
              <button className="pag-retry-btn" onClick={tentarNovamente}>Tentar novamente</button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
