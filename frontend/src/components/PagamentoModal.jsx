import { useState, useEffect, useRef, useCallback } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import api from '../services/api';

initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, { locale: 'pt-BR' });

const fmtReal = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function Countdown({ expiresAt, onExpire }) {
  const calcSecs = () => Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
  const [secs, setSecs] = useState(calcSecs);

  useEffect(() => {
    if (secs <= 0) { onExpire?.(); return; }
    const t = setInterval(() => setSecs(s => {
      if (s <= 1) { clearInterval(t); onExpire?.(); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, []);

  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return <span className={`pag-countdown${secs < 60 ? ' urgent' : ''}`}>{m}:{s}</span>;
}

export default function PagamentoModal({ tipo, referenciaId, metodo, valor, onSuccess, onClose }) {
  const [phase, setPhase] = useState('loading');
  const [pixData, setPixData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    if (metodo === 'pix') {
      initPix();
    } else {
      setPhase('cartao_form');
    }
    return () => clearInterval(pollRef.current);
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

  const handleCardSubmit = async ({ formData }) => {
    setCardLoading(true);
    setErrorMsg('');
    try {
      const { data } = await api.post('/pagamentos/cartao', {
        tipo,
        referenciaId,
        metodo,
        token: formData.token,
        paymentMethodId: formData.payment_method_id,
        issuerId: formData.issuer_id,
      });
      if (data.status === 'aprovado') {
        setPhase('aprovado');
        setTimeout(() => onSuccess?.(), 2500);
      } else {
        setErrorMsg('Pagamento recusado. Verifique os dados do cartão.');
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

  const metodoLabel = { pix: 'PIX', credito: 'Cartão de Crédito', debito: 'Cartão de Débito' }[metodo] || metodo;

  return (
    <>
      <style>{`
        .pag-overlay{position:fixed;inset:0;z-index:9800;background:rgba(0,0,0,.92);backdrop-filter:blur(18px);display:flex;align-items:center;justify-content:center;padding:1.5rem;overflow-y:auto}
        .pag-modal{background:var(--card);border:1px solid var(--border);max-width:500px;width:100%;margin:auto;display:flex;flex-direction:column}
        .pag-header{padding:1.5rem 2rem;border-bottom:1px solid var(--border);background:linear-gradient(135deg,rgba(224,172,107,.06),transparent);display:flex;align-items:center;justify-content:space-between}
        .pag-eyebrow{font-family:var(--font-cond);font-size:.65rem;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:.25rem}
        .pag-title{font-family:var(--font-display);font-size:1.6rem;letter-spacing:2px;line-height:1}
        .pag-valor{font-family:var(--font-display);font-size:2rem;color:var(--gold)}
        .pag-body{padding:2rem;flex:1;display:flex;flex-direction:column;gap:1.5rem;min-height:260px}
        .pag-center{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:1rem;flex:1;min-height:200px}
        .pag-spinner{width:36px;height:36px;border:2px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:spin .8s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .pag-center p,.pag-center h3{font-family:var(--font-cond);letter-spacing:1px}
        .pag-center h3{font-size:1.3rem}
        .pag-center p{color:var(--gray);font-size:.9rem;max-width:300px;line-height:1.5}
        .pag-icon-wrap{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center}
        .pag-icon-ok{background:rgba(34,197,94,.08);border:1.5px solid rgba(34,197,94,.3)}
        .pag-icon-ok svg{stroke:var(--green)}
        .pag-icon-err{background:rgba(239,68,68,.08);border:1.5px solid rgba(239,68,68,.3)}
        .pag-icon-err svg{stroke:#ef4444}
        .pag-icon-warn{background:rgba(245,158,11,.08);border:1.5px solid rgba(245,158,11,.3)}
        .pag-icon-warn svg{stroke:var(--amber)}
        .pag-pix-wrap{display:flex;flex-direction:column;align-items:center;gap:1.2rem}
        .pag-pix-timer-row{display:flex;align-items:center;gap:.6rem;font-family:var(--font-cond);font-size:.72rem;letter-spacing:2px;text-transform:uppercase;color:var(--gray)}
        .pag-countdown{font-family:var(--font-display);font-size:1.4rem;color:var(--gold);letter-spacing:2px}
        .pag-countdown.urgent{color:#ef4444}
        .pag-pix-qr-wrap{padding:.75rem;background:var(--white);border-radius:4px}
        .pag-pix-qr-img{width:190px;height:190px;display:block}
        .pag-pix-qr-placeholder{width:190px;height:190px;background:var(--border);display:flex;align-items:center;justify-content:center;font-family:var(--font-cond);font-size:.75rem;color:var(--gray);letter-spacing:1px}
        .pag-pix-inst{font-size:.83rem;color:var(--gray);text-align:center;max-width:300px;line-height:1.5}
        .pag-copy-btn{background:var(--dark);border:1px solid var(--border);color:var(--white);padding:.65rem 1.4rem;font-family:var(--font-cond);font-size:.8rem;font-weight:700;letter-spacing:1.5px;cursor:pointer;transition:all var(--trans-fast)}
        .pag-copy-btn:hover{border-color:var(--gold);color:var(--gold)}
        .pag-pix-note{font-size:.75rem;color:var(--muted);text-align:center}
        .pag-card-wrap{width:100%}
        .pag-card-loading{text-align:center;font-family:var(--font-cond);font-size:.8rem;letter-spacing:1px;color:var(--gray);padding:1rem}
        .pag-footer{padding:1.2rem 2rem;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
        .pag-mp-badge{font-family:var(--font-cond);font-size:.65rem;letter-spacing:1.5px;color:var(--muted)}
        .pag-cancel-btn{background:none;border:1px solid var(--border);color:var(--gray);padding:.5rem 1rem;font-family:var(--font-cond);font-size:.75rem;font-weight:700;letter-spacing:1.5px;cursor:pointer;transition:all var(--trans-fast)}
        .pag-cancel-btn:hover{border-color:#ef4444;color:#ef4444}
        @media(max-width:540px){.pag-modal{max-width:100%}.pag-header{padding:1.2rem 1.2rem}.pag-body{padding:1.5rem 1.2rem}.pag-footer{padding:1rem 1.2rem}}
      `}</style>

      <div className="pag-overlay">
        <div className="pag-modal">
          <div className="pag-header">
            <div>
              <p className="pag-eyebrow">{metodoLabel}</p>
              <h2 className="pag-title">PAGAMENTO</h2>
            </div>
            <div className="pag-valor">{fmtReal(valor)}</div>
          </div>

          <div className="pag-body">
            {phase === 'loading' && (
              <div className="pag-center">
                <div className="pag-spinner" />
                <p>Gerando pagamento…</p>
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
                    : <div className="pag-pix-qr-placeholder">Gerando QR…</div>}
                </div>
                <p className="pag-pix-inst">Abra seu banco, acesse o PIX e escaneie o QR Code acima</p>
                <button className="pag-copy-btn" onClick={copyPix}>
                  {copied ? '✓ Copiado!' : 'Copiar código PIX (copia e cola)'}
                </button>
                <p className="pag-pix-note">Aguardando confirmação do pagamento…</p>
              </div>
            )}

            {phase === 'cartao_form' && (
              <div className="pag-card-wrap">
                <CardPayment
                  initialization={{ amount: Number(valor) }}
                  customization={{ paymentMethods: { maxInstallments: 1 } }}
                  onSubmit={handleCardSubmit}
                  onError={(e) => console.error('CardPayment error:', e)}
                />
                {cardLoading && <div className="pag-card-loading">Processando pagamento…</div>}
              </div>
            )}

            {phase === 'aprovado' && (
              <div className="pag-center pag-success">
                <div className="pag-icon-wrap pag-icon-ok">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <h3>Pagamento Confirmado!</h3>
                <p>{tipo === 'booking' ? 'Sua reserva está confirmada. Nos vemos na arena!' : 'Sua inscrição está confirmada. Bora jogar!'}</p>
              </div>
            )}

            {(phase === 'rejeitado' || phase === 'erro') && (
              <div className="pag-center pag-fail">
                <div className="pag-icon-wrap pag-icon-err">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                </div>
                <h3>{phase === 'rejeitado' ? 'Pagamento Recusado' : 'Erro no Pagamento'}</h3>
                <p>{errorMsg}</p>
                {phase === 'rejeitado' && (
                  <button className="btn-ghost" onClick={() => { setPhase('cartao_form'); setErrorMsg(''); }}>Tentar novamente</button>
                )}
              </div>
            )}

            {phase === 'expirado' && (
              <div className="pag-center">
                <div className="pag-icon-wrap pag-icon-warn">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <h3>Tempo Esgotado</h3>
                <p>O prazo de 15 minutos expirou. {tipo === 'booking' ? 'Sua reserva foi cancelada.' : 'Sua inscrição foi cancelada.'}</p>
              </div>
            )}
          </div>

          <div className="pag-footer">
            <span className="pag-mp-badge">Pagamento seguro via Mercado Pago</span>
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
