import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY;
const fmtReal = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const BRANDS = {
  visa:      { label: 'VISA',      bg: '#1A1F71', color: '#fff' },
  master:    { label: 'MASTER',    bg: '#252525', color: '#fff' },
  elo:       { label: 'ELO',       bg: '#FFD100', color: '#000' },
  amex:      { label: 'AMEX',      bg: '#007BC1', color: '#fff' },
  hipercard: { label: 'HIPERCARD', bg: '#B30000', color: '#fff' },
  hiper:     { label: 'HIPER',     bg: '#B30000', color: '#fff' },
  debmaster: { label: 'MASTER',    bg: '#252525', color: '#fff' },
};

function loadMpScript() {
  return new Promise((resolve) => {
    if (window.MercadoPago) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://sdk.mercadopago.com/js/v2';
    s.async = true;
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

function Countdown({ expiresAt, onExpire }) {
  const [secs, setSecs] = useState(() => Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000)));
  useEffect(() => {
    if (secs <= 0) { onExpire?.(); return; }
    const t = setInterval(() => setSecs(s => { if (s <= 1) { clearInterval(t); onExpire?.(); return 0; } return s - 1; }), 1000);
    return () => clearInterval(t);
  }, []);
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return <span className={`pag-countdown${secs < 60 ? ' urgent' : ''}`}>{m}:{s}</span>;
}

function PhaseAprovado({ tipo }) {
  return (
    <div className="pag-center" style={{ gap: '1rem' }}>
      <div className="pag-icon-wrap pag-icon-ok">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div>
      <h3 style={{ fontFamily: 'var(--font-cond)', fontSize: '1.3rem', letterSpacing: '1px' }}>Pagamento Confirmado!</h3>
      <p style={{ color: 'var(--gray)', fontSize: '.88rem', lineHeight: 1.5 }}>
        {tipo === 'booking' ? 'Sua reserva está confirmada. Nos vemos na arena!' : 'Inscrição confirmada. Bora jogar!'}
      </p>
    </div>
  );
}

function PhaseExpirado({ tipo }) {
  return (
    <div className="pag-center" style={{ gap: '1rem' }}>
      <div className="pag-icon-wrap pag-icon-warn">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      </div>
      <h3 style={{ fontFamily: 'var(--font-cond)', fontSize: '1.3rem', letterSpacing: '1px' }}>Tempo Esgotado</h3>
      <p style={{ color: 'var(--gray)', fontSize: '.88rem', lineHeight: 1.5 }}>
        O prazo de 10 minutos expirou. {tipo === 'booking' ? 'Sua reserva foi cancelada.' : 'Sua inscrição foi cancelada.'}
      </p>
    </div>
  );
}

function PhaseErro({ msg }) {
  return (
    <div className="pag-center" style={{ gap: '1rem' }}>
      <div className="pag-icon-wrap pag-icon-err">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
      </div>
      <h3 style={{ fontFamily: 'var(--font-cond)', fontSize: '1.3rem', letterSpacing: '1px' }}>Erro no Pagamento</h3>
      <p style={{ color: 'var(--gray)', fontSize: '.88rem', lineHeight: 1.5, maxWidth: 300, textAlign: 'center' }}>{msg}</p>
    </div>
  );
}

export default function PagamentoModal({ tipo, referenciaId, metodo, valor, onSuccess, onClose }) {
  const [phase, setPhase] = useState('loading');
  const [pixData, setPixData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [cardBrand, setCardBrand] = useState(null);
  const [paymentMethodId, setPaymentMethodId] = useState(null);
  const [cardName, setCardName] = useState('');
  const [focused, setFocused] = useState(null);
  const [fieldsReady, setFieldsReady] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = useRef(null);
  const mpRef = useRef(null);
  const fieldsRef = useRef({});

  useEffect(() => {
    if (metodo === 'pix') {
      initPix();
    } else {
      setupCardForm();
    }
    return () => {
      clearInterval(pollRef.current);
      Object.values(fieldsRef.current).forEach(f => { try { f.unmount(); } catch {} });
    };
  }, []);

  const initPix = async () => {
    try {
      const { data } = await api.post('/pagamentos/pix', { tipo, referenciaId });
      setPixData(data);
      setPhase('pix_aguardando');
      pollRef.current = setInterval(() => checkStatus(data.paymentId), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Erro ao gerar Pix. Tente novamente.');
      setPhase('erro');
    }
  };

  const checkStatus = useCallback(async (paymentId) => {
    try {
      const { data } = await api.get(`/pagamentos/${paymentId}/status`);
      if (data.status === 'aprovado') {
        clearInterval(pollRef.current);
        setPhase('aprovado');
        setTimeout(() => onSuccess?.(), 2500);
      } else if (data.status === 'expirado') {
        clearInterval(pollRef.current);
        setPhase('expirado');
      }
    } catch {}
  }, [onSuccess]);

  const setupCardForm = async () => {
    await loadMpScript();
    mpRef.current = new window.MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });

    const fieldStyle = {
      color: '#ffffff',
      'font-size': '15px',
      'font-family': '"Courier New", Courier, monospace',
      'font-weight': '500',
      'letter-spacing': '1px',
    };

    const mkField = (type, opts = {}) => {
      const f = mpRef.current.fields.create(type, { style: fieldStyle, ...opts });
      f.mount(`mp-${type}`);
      f.on('focus', () => setFocused(type));
      f.on('blur', () => setFocused(null));
      f.on('validityChange', ({ errorMessages }) => {
        f._hasError = errorMessages?.length > 0;
      });
      fieldsRef.current[type] = f;
      return f;
    };

    const cardNumber = mkField('cardNumber', { placeholder: '0000 0000 0000 0000' });
    cardNumber.on('binChange', async ({ bin }) => {
      if (bin?.length >= 6) {
        try {
          const { results } = await mpRef.current.getPaymentMethods({ bin });
          if (results?.length > 0) {
            setCardBrand(results[0].id);
            setPaymentMethodId(results[0].id);
          }
        } catch {}
      } else if (!bin) {
        setCardBrand(null);
        setPaymentMethodId(null);
      }
    });

    mkField('expirationDate', { placeholder: 'MM/AA' });
    mkField('securityCode', { placeholder: '•••' });

    setFieldsReady(true);
    setPhase('cartao_form');
  };

  const handleCardSubmit = async (e) => {
    e.preventDefault();
    if (!cardName.trim()) { setErrorMsg('Informe o nome como está no cartão'); return; }
    setCardLoading(true);
    setErrorMsg('');
    try {
      const token = await mpRef.current.fields.createCardToken({
        cardholderName: cardName.toUpperCase().trim(),
      });
      const { data } = await api.post('/pagamentos/cartao', {
        tipo, referenciaId, metodo,
        token: token.id,
        paymentMethodId,
      });
      if (data.status === 'aprovado') {
        setPhase('aprovado');
        setTimeout(() => onSuccess?.(), 2500);
      } else {
        setErrorMsg('Pagamento recusado. Verifique os dados e tente novamente.');
        setPhase('rejeitado');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Erro ao processar pagamento.');
      setPhase('rejeitado');
    } finally {
      setCardLoading(false);
    }
  };

  const copyPix = () => {
    if (!pixData?.pixQrCode) return;
    navigator.clipboard.writeText(pixData.pixQrCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const brand = BRANDS[cardBrand];
  const metodoLabel = { pix: 'PIX', credito: 'Cartão de Crédito', debito: 'Cartão de Débito' }[metodo] || metodo;

  return (
    <>
      <style>{`
        .pag-overlay{position:fixed;inset:0;z-index:9800;background:rgba(0,0,0,.93);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:1.5rem;overflow-y:auto}
        .pag-modal{background:var(--card);border:1px solid var(--border);max-width:480px;width:100%;margin:auto;display:flex;flex-direction:column}
        .pag-header{padding:1.4rem 2rem;border-bottom:1px solid var(--border);background:linear-gradient(135deg,rgba(224,172,107,.07),transparent);display:flex;align-items:center;justify-content:space-between}
        .pag-eyebrow{font-family:var(--font-cond);font-size:.62rem;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:.2rem}
        .pag-title{font-family:var(--font-display);font-size:1.5rem;letter-spacing:2px;line-height:1}
        .pag-valor{font-family:var(--font-display);font-size:1.9rem;color:var(--gold)}
        .pag-body{padding:1.8rem 2rem;flex:1;display:flex;flex-direction:column;gap:1.4rem}
        .pag-center{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:1rem;flex:1;min-height:220px}
        .pag-spinner{width:34px;height:34px;border:2px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:pag-spin .8s linear infinite}
        @keyframes pag-spin{to{transform:rotate(360deg)}}
        .pag-center p,.pag-center h3{font-family:var(--font-cond);letter-spacing:1px}
        .pag-center h3{font-size:1.3rem}
        .pag-center p{color:var(--gray);font-size:.88rem;max-width:300px;line-height:1.5}
        .pag-icon-wrap{width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .pag-icon-ok{background:rgba(34,197,94,.08);border:1.5px solid rgba(34,197,94,.3)}
        .pag-icon-ok svg{stroke:#22c55e}
        .pag-icon-err{background:rgba(239,68,68,.08);border:1.5px solid rgba(239,68,68,.3)}
        .pag-icon-err svg{stroke:#ef4444}
        .pag-icon-warn{background:rgba(245,158,11,.08);border:1.5px solid rgba(245,158,11,.3)}
        .pag-icon-warn svg{stroke:var(--amber)}

        /* ── Pix ── */
        .pag-pix-wrap{display:flex;flex-direction:column;align-items:center;gap:1.1rem}
        .pag-pix-timer-row{display:flex;align-items:center;gap:.6rem;font-family:var(--font-cond);font-size:.7rem;letter-spacing:2px;text-transform:uppercase;color:var(--gray)}
        .pag-countdown{font-family:var(--font-display);font-size:1.5rem;color:var(--gold);letter-spacing:2px}
        .pag-countdown.urgent{color:#ef4444}
        .pag-pix-qr-wrap{padding:.75rem;background:#fff;border-radius:4px}
        .pag-pix-qr-img{width:180px;height:180px;display:block}
        .pag-pix-qr-placeholder{width:180px;height:180px;background:var(--border);display:flex;align-items:center;justify-content:center;font-family:var(--font-cond);font-size:.75rem;color:var(--gray);letter-spacing:1px}
        .pag-pix-inst{font-size:.82rem;color:var(--gray);text-align:center;max-width:290px;line-height:1.5}
        .pag-copy-btn{background:var(--dark);border:1px solid var(--border);color:var(--white);padding:.6rem 1.4rem;font-family:var(--font-cond);font-size:.78rem;font-weight:700;letter-spacing:1.5px;cursor:pointer;transition:all var(--trans-fast);width:100%;max-width:260px}
        .pag-copy-btn:hover,.pag-copy-btn.copied{border-color:var(--gold);color:var(--gold)}
        .pag-pix-note{font-size:.73rem;color:var(--muted);text-align:center}

        /* ── Card Form ── */
        .pag-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem}
        .pag-card-header-label{font-family:var(--font-cond);font-size:.68rem;letter-spacing:2.5px;text-transform:uppercase;color:var(--gray)}
        .pag-brand-badge{font-family:var(--font-cond);font-size:.65rem;font-weight:700;letter-spacing:2px;padding:.25rem .7rem;border-radius:2px;transition:all .2s}
        .pag-brand-placeholder{width:54px;height:22px;background:var(--border);border-radius:2px;opacity:.4}
        .pag-field-group{display:flex;flex-direction:column;gap:.35rem}
        .pag-field-label{font-family:var(--font-cond);font-size:.65rem;letter-spacing:2.5px;text-transform:uppercase;color:var(--gray)}
        .pag-field-wrap{background:var(--dark);border:1px solid var(--border);height:48px;display:flex;align-items:center;padding:0 1rem;transition:border-color .15s}
        .pag-field-wrap.focused{border-color:var(--gold)}
        .pag-field-wrap > div{flex:1;height:100%;display:flex;align-items:center}
        .pag-field-row{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}
        .pag-name-input{background:transparent;border:none;outline:none;color:#fff;font-family:"Courier New",Courier,monospace;font-size:15px;font-weight:500;letter-spacing:1px;width:100%;text-transform:uppercase}
        .pag-name-input::placeholder{color:rgba(255,255,255,.25);text-transform:none}
        .pag-submit-btn{width:100%;padding:1rem;background:var(--gold);color:var(--black);font-family:var(--font-cond);font-size:.88rem;font-weight:700;letter-spacing:3px;text-transform:uppercase;border:none;cursor:pointer;transition:all var(--trans-fast);margin-top:.4rem;display:flex;align-items:center;justify-content:center;gap:.6rem}
        .pag-submit-btn:hover:not(:disabled){background:var(--gold-light)}
        .pag-submit-btn:disabled{opacity:.6;cursor:not-allowed}
        .pag-submit-spinner{width:16px;height:16px;border:2px solid rgba(0,0,0,.3);border-top-color:var(--black);border-radius:50%;animation:pag-spin .7s linear infinite}
        .pag-field-error{font-family:var(--font-cond);font-size:.7rem;color:#ef4444;letter-spacing:.5px;padding:.4rem .2rem}

        /* ── Overlays ── */
        .pag-overlay-layer{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;background:var(--card)}

        /* ── Footer ── */
        .pag-footer{padding:1rem 2rem;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
        .pag-mp-badge{font-family:var(--font-cond);font-size:.62rem;letter-spacing:1px;color:var(--muted);display:flex;align-items:center;gap:.4rem}
        .pag-cancel-btn{background:none;border:1px solid var(--border);color:var(--gray);padding:.45rem .9rem;font-family:var(--font-cond);font-size:.72rem;font-weight:700;letter-spacing:1.5px;cursor:pointer;transition:all var(--trans-fast)}
        .pag-cancel-btn:hover{border-color:#ef4444;color:#ef4444}

        @media(max-width:540px){.pag-modal{max-width:100%}.pag-header,.pag-body,.pag-footer{padding-left:1.2rem;padding-right:1.2rem}.pag-field-row{grid-template-columns:1fr 1fr}}
      `}</style>

      <div className="pag-overlay">
        <div className="pag-modal">

          {/* Header */}
          <div className="pag-header">
            <div>
              <p className="pag-eyebrow">{metodoLabel}</p>
              <h2 className="pag-title">PAGAMENTO</h2>
            </div>
            <div className="pag-valor">{fmtReal(valor)}</div>
          </div>

          {/* Body */}
          <div className="pag-body">

            {/* ═══════════════ PIX FLOW ═══════════════ */}
            {metodo === 'pix' && (
              <>
                {phase === 'loading' && (
                  <div className="pag-center">
                    <div className="pag-spinner" />
                    <p>Gerando QR Code PIX…</p>
                  </div>
                )}

                {phase === 'pix_aguardando' && pixData && (
                  <div className="pag-pix-wrap">
                    <div className="pag-pix-timer-row">
                      <span>Expira em</span>
                      <Countdown expiresAt={pixData.expiresAt} onExpire={() => { clearInterval(pollRef.current); setPhase('expirado'); }} />
                    </div>
                    <div className="pag-pix-qr-wrap">
                      {pixData.pixQrCodeBase64
                        ? <img src={`data:image/png;base64,${pixData.pixQrCodeBase64}`} alt="QR Code PIX" className="pag-pix-qr-img" />
                        : <div className="pag-pix-qr-placeholder">Gerando…</div>}
                    </div>
                    <p className="pag-pix-inst">Abra seu banco, acesse o PIX e escaneie o QR Code acima</p>
                    <button className={`pag-copy-btn${copied ? ' copied' : ''}`} onClick={copyPix}>
                      {copied ? '✓ Código copiado!' : 'Copiar código PIX (copia e cola)'}
                    </button>
                    <p className="pag-pix-note">Aguardando confirmação do pagamento…</p>
                  </div>
                )}

                {phase === 'aprovado' && <PhaseAprovado tipo={tipo} />}
                {phase === 'expirado' && <PhaseExpirado tipo={tipo} />}
                {(phase === 'erro') && <PhaseErro msg={errorMsg} />}
              </>
            )}

            {/* ═══════════════ CARD FLOW ═══════════════
                Form always in DOM so MP iframes keep their mount point.
                States are layered via absolute overlays.           */}
            {metodo !== 'pix' && (
              <div style={{ position: 'relative', minHeight: fieldsReady ? 0 : 240 }}>

                {/* Loading overlay */}
                {!fieldsReady && (
                  <div className="pag-overlay-layer">
                    <div className="pag-spinner" />
                    <p style={{ fontFamily: 'var(--font-cond)', fontSize: '.82rem', color: 'var(--gray)', letterSpacing: '1px' }}>Carregando formulário…</p>
                  </div>
                )}

                {/* Approved overlay */}
                {phase === 'aprovado' && (
                  <div className="pag-overlay-layer"><PhaseAprovado tipo={tipo} /></div>
                )}

                {/* Rejected / Error overlay */}
                {(phase === 'rejeitado' || phase === 'erro') && (
                  <div className="pag-overlay-layer">
                    <div className="pag-icon-wrap pag-icon-err">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-cond)', letterSpacing: '1px' }}>{phase === 'rejeitado' ? 'Pagamento Recusado' : 'Erro no Pagamento'}</h3>
                    <p style={{ color: 'var(--gray)', fontSize: '.88rem', maxWidth: 300, lineHeight: 1.5, textAlign: 'center' }}>{errorMsg}</p>
                    {phase === 'rejeitado' && (
                      <button className="btn-ghost" onClick={() => { setPhase('cartao_form'); setErrorMsg(''); }}>
                        Tentar novamente
                      </button>
                    )}
                  </div>
                )}

                {/* Card form — always rendered, visibility drives show/hide */}
                <form
                  onSubmit={handleCardSubmit}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: '1rem',
                    visibility: (fieldsReady && phase === 'cartao_form') ? 'visible' : 'hidden',
                    pointerEvents: (fieldsReady && phase === 'cartao_form') ? 'auto' : 'none',
                  }}
                >
                  <div className="pag-card-header">
                    <span className="pag-card-header-label">Dados do Cartão</span>
                    {brand
                      ? <span className="pag-brand-badge" style={{ background: brand.bg, color: brand.color }}>{brand.label}</span>
                      : <div className="pag-brand-placeholder" />}
                  </div>

                  <div className="pag-field-group">
                    <label className="pag-field-label">Número do Cartão</label>
                    <div className={`pag-field-wrap${focused === 'cardNumber' ? ' focused' : ''}`}>
                      <div id="mp-cardNumber" />
                    </div>
                  </div>

                  <div className="pag-field-row">
                    <div className="pag-field-group">
                      <label className="pag-field-label">Validade</label>
                      <div className={`pag-field-wrap${focused === 'expirationDate' ? ' focused' : ''}`}>
                        <div id="mp-expirationDate" />
                      </div>
                    </div>
                    <div className="pag-field-group">
                      <label className="pag-field-label">CVV</label>
                      <div className={`pag-field-wrap${focused === 'securityCode' ? ' focused' : ''}`}>
                        <div id="mp-securityCode" />
                      </div>
                    </div>
                  </div>

                  <div className="pag-field-group">
                    <label className="pag-field-label">Nome no Cartão</label>
                    <div className={`pag-field-wrap${focused === 'cardName' ? ' focused' : ''}`}>
                      <input
                        className="pag-name-input"
                        type="text"
                        placeholder="Como aparece no cartão"
                        value={cardName}
                        onChange={e => setCardName(e.target.value.toUpperCase())}
                        onFocus={() => setFocused('cardName')}
                        onBlur={() => setFocused(null)}
                        autoComplete="cc-name"
                      />
                    </div>
                  </div>

                  {errorMsg && phase === 'cartao_form' && <p className="pag-field-error">{errorMsg}</p>}

                  <button type="submit" className="pag-submit-btn" disabled={cardLoading}>
                    {cardLoading ? <><span className="pag-submit-spinner" /> Processando…</> : `Pagar ${fmtReal(valor)}`}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pag-footer">
            <span className="pag-mp-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Pagamento seguro · Mercado Pago
            </span>
            {phase !== 'aprovado' && phase !== 'loading' && (
              <button className="pag-cancel-btn" onClick={onClose}>
                {phase === 'pix_aguardando' ? 'Cancelar' : 'Fechar'}
              </button>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
