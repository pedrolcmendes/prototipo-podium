import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';

const fmtReal = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function formatTime(ms) {
  if (ms === null) return '--:--';
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function PagamentoModal({ tipo, referenciaId, metodo, valor, creditosAplicados = 0, onClose }) {
  const isCreditos = metodo === 'creditos';
  const [phase, setPhase] = useState(isCreditos ? 'choose' : 'loading');
  const [metodoEmAndamento, setMetodoEmAndamento] = useState(isCreditos ? null : metodo);
  const [pixData, setPixData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const pollRef = useRef(null);
  const timerRef = useRef(null);
  const calledRef = useRef(false);

  const iniciarPagamento = useCallback((metodoSelecionado) => {
    if (calledRef.current) return;
    calledRef.current = true;
    setMetodoEmAndamento(metodoSelecionado);
    setPhase('loading');

    if (metodoSelecionado === 'pix') {
      api.post('/pagamentos/pix', { tipo, referenciaId })
        .then(({ data }) => {
          setPixData(data);
          setPhase('pix');
          pollRef.current = setInterval(async () => {
            try {
              const { data: sync } = await api.get(`/pagamentos/sync?mpPaymentId=${data.mpPaymentId}`);
              if (sync.status === 'aprovado') {
                clearInterval(pollRef.current);
                window.location.href = `/pagamento/retorno?collection_id=${data.mpPaymentId}&collection_status=approved`;
              }
            } catch { /* ignora */ }
          }, 3000);
        })
        .catch(err => {
          setErrorMsg(err.response?.data?.message || 'Erro ao gerar PIX. Reserva cancelada.');
          setPhase('error');
        });
    } else {
      api.post('/pagamentos/preferencia', { tipo, referenciaId, metodo: metodoSelecionado })
        .then(({ data }) => {
          const url = import.meta.env.DEV ? data.sandboxUrl : data.checkoutUrl;
          window.location.href = url;
        })
        .catch(err => {
          setErrorMsg(err.response?.data?.message || 'Erro ao iniciar pagamento. Reserva cancelada.');
          setPhase('error');
        });
    }
  }, [tipo, referenciaId]);

  useEffect(() => {
    if (!isCreditos) {
      iniciarPagamento(metodo);
    }
    return () => { clearInterval(pollRef.current); clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (!pixData?.expiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, new Date(pixData.expiresAt) - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timerRef.current);
        clearInterval(pollRef.current);
        setPhase('expired');
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [pixData]);

  const copiarPix = () => {
    navigator.clipboard.writeText(pixData.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const cancelarPix = async () => {
    clearInterval(pollRef.current);
    clearInterval(timerRef.current);
    try { await api.patch(`/bookings/${referenciaId}/cancelar`); } catch { /* ignora */ }
    onClose();
  };

  const timerUrgente = timeLeft !== null && timeLeft < 5 * 60 * 1000;

  const headerLabel = isCreditos
    ? 'Créditos Arena'
    : { pix: 'PIX', credito: 'Cartão de Crédito', debito: 'Cartão de Débito' }[metodo] || 'Mercado Pago';

  const canClose = phase === 'choose' || phase === 'pix' || phase === 'expired';

  return (
    <>
      <style>{`
        .pag-overlay{position:fixed;inset:0;z-index:9800;background:rgba(0,0,0,.93);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:1.5rem}
        .pag-modal{background:var(--card);border:1px solid var(--border);max-width:460px;width:100%;display:flex;flex-direction:column}
        .pag-header{padding:1.4rem 2rem;border-bottom:1px solid var(--border);background:linear-gradient(135deg,rgba(224,172,107,.07),transparent);display:flex;align-items:center;justify-content:space-between;gap:1rem}
        .pag-header-left{display:flex;flex-direction:column}
        .pag-header-right{display:flex;align-items:center;gap:.75rem;flex-shrink:0}
        .pag-eyebrow{font-family:var(--font-cond);font-size:.62rem;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:.2rem}
        .pag-title{font-family:var(--font-display);font-size:1.5rem;letter-spacing:2px;line-height:1}
        .pag-valor{font-family:var(--font-display);font-size:1.9rem;color:var(--gold)}
        .pag-close-x{background:none;border:none;color:var(--muted);cursor:pointer;padding:.2rem;display:flex;align-items:center;transition:color .15s;line-height:0}
        .pag-close-x:hover{color:var(--white)}
        .pag-body{padding:2rem;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2rem;min-height:200px;text-align:center}
        .pag-spinner{width:36px;height:36px;border:2px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:pag-spin .8s linear infinite;flex-shrink:0}
        .pag-spinner-sm{width:14px;height:14px;border-width:1.5px}
        @keyframes pag-spin{to{transform:rotate(360deg)}}
        .pag-body p{font-family:var(--font-cond);font-size:.85rem;color:var(--gray);letter-spacing:1px;line-height:1.5}
        .pag-mp-logo{display:flex;align-items:center;gap:.5rem;font-family:var(--font-cond);font-size:.72rem;letter-spacing:1.5px;color:var(--muted);margin-top:.4rem}
        .pag-icon-err{width:56px;height:56px;border-radius:50%;background:rgba(239,68,68,.08);border:1.5px solid rgba(239,68,68,.3);display:flex;align-items:center;justify-content:center}
        .pag-icon-err svg{stroke:#ef4444}
        .pag-icon-warn{width:56px;height:56px;border-radius:50%;background:rgba(245,158,11,.08);border:1.5px solid rgba(245,158,11,.3);display:flex;align-items:center;justify-content:center}
        .pag-icon-warn svg{stroke:#f59e0b}
        .pag-err-title{font-family:var(--font-cond);font-size:1.1rem;letter-spacing:1px;color:var(--white)}
        .pag-footer{padding:1rem 2rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end}
        .pag-cancel-btn{background:none;border:1px solid var(--border);color:var(--gray);padding:.45rem .9rem;font-family:var(--font-cond);font-size:.72rem;font-weight:700;letter-spacing:1.5px;cursor:pointer;transition:all var(--trans-fast)}
        .pag-cancel-btn:hover{border-color:#ef4444;color:#ef4444}
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
        .pag-credits-info{background:rgba(224,172,107,.06);border:1px solid rgba(224,172,107,.2);padding:.75rem 1.1rem;width:100%;max-width:380px;display:flex;flex-direction:column;gap:.35rem}
        .pag-credits-row{display:flex;justify-content:space-between;font-family:var(--font-cond);font-size:.75rem;letter-spacing:.5px;color:var(--gray)}
        .pag-credits-row span:last-child{color:var(--gold)}
        .pag-choose-label{font-family:var(--font-cond);font-size:.72rem;letter-spacing:3px;text-transform:uppercase;color:var(--gray)}
        .pag-choose-methods{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;width:100%;max-width:380px}
        .pag-choose-btn{display:flex;flex-direction:column;align-items:center;gap:.6rem;border:1px solid var(--border);background:var(--dark);padding:1.2rem 1rem;cursor:pointer;transition:all var(--trans-fast);font-family:var(--font-cond)}
        .pag-choose-btn:hover{border-color:var(--gold);background:var(--gold-faint)}
        .pag-choose-btn svg{stroke:var(--gray);transition:stroke var(--trans-fast)}
        .pag-choose-btn:hover svg{stroke:var(--gold)}
        .pag-choose-btn-name{font-size:.88rem;font-weight:700;letter-spacing:.5px;color:var(--white)}
        .pag-choose-btn-sub{font-size:.68rem;color:var(--gray);letter-spacing:.5px}
      `}</style>

      <div className="pag-overlay">
        <div className="pag-modal">
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
                <button className="pag-close-x" onClick={onClose} title="Fechar — você pode retomar depois em Minhas Reservas">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>
          </div>

          <div className="pag-body">
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
                  <button className="pag-choose-btn" onClick={() => iniciarPagamento('pix')}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="5" y="5" width="3" height="3"/>
                      <rect x="16" y="5" width="3" height="3"/><rect x="5" y="16" width="3" height="3"/>
                      <path d="M14 14h3v3"/><path d="M17 17h3v3"/><path d="M14 20h1"/>
                    </svg>
                    <div className="pag-choose-btn-name">PIX</div>
                    <div className="pag-choose-btn-sub">QR Code na hora</div>
                  </button>
                  <button className="pag-choose-btn" onClick={() => iniciarPagamento('credito')}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="2"/>
                      <line x1="2" y1="10" x2="22" y2="10"/>
                      <line x1="6" y1="15" x2="9" y2="15"/>
                    </svg>
                    <div className="pag-choose-btn-name">Cartão de Crédito</div>
                    <div className="pag-choose-btn-sub">Via Mercado Pago</div>
                  </button>
                </div>
              </>
            )}

            {phase === 'loading' && (
              <>
                <div className="pag-spinner" />
                <p>{metodoEmAndamento === 'pix' ? 'Gerando QR Code PIX…' : 'Redirecionando para o Mercado Pago…'}</p>
                <span className="pag-mp-logo">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Pagamento seguro · SSL
                </span>
              </>
            )}

            {phase === 'pix' && pixData && (
              <>
                {pixData.qrCodeBase64 && (
                  <img className="pag-pix-qr" src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="QR Code PIX" />
                )}
                <p className="pag-pix-label">Escaneie o QR code ou copie a chave PIX:</p>
                <div className="pag-pix-copy">
                  <div className="pag-pix-key">{pixData.qrCode}</div>
                  <button className="pag-pix-btn" onClick={copiarPix}>
                    {copied ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
                <div className="pag-pix-waiting">
                  <div className="pag-spinner pag-spinner-sm" />
                  Aguardando pagamento — confirmação automática
                </div>
                <div className={`pag-pix-timer${timerUrgente ? ' urgente' : ''}`}>
                  Expira em <strong>{formatTime(timeLeft)}</strong>
                </div>
                <button className="pag-cancel-btn" onClick={cancelarPix}>
                  Cancelar pagamento
                </button>
              </>
            )}

            {phase === 'expired' && (
              <>
                <div className="pag-icon-warn">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <p className="pag-err-title">PIX Expirado</p>
                <p>O tempo para pagamento encerrou. Sua reserva será cancelada em breve — você pode fazer uma nova reserva quando quiser.</p>
              </>
            )}

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

          {(phase === 'error' || phase === 'expired') && (
            <div className="pag-footer">
              <button className="pag-cancel-btn" onClick={onClose}>Fechar</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
