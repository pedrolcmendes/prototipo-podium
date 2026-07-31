import { useEffect, useState, useRef } from 'react';
import api from '../services/api';

const fmtReal = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const METODO_LABEL = { pix: 'PIX', credito: 'Cartão de Crédito', debito: 'Cartão de Débito' };

export default function PagamentoModal({ tipo, referenciaId, metodo, valor, onClose }) {
  const [phase, setPhase] = useState('loading'); // 'loading' | 'pix' | 'error'
  const [pixData, setPixData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const pollRef = useRef(null);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (metodo === 'pix') {
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
            } catch { /* ignora erros de polling */ }
          }, 3000);
        })
        .catch(err => {
          setErrorMsg(err.response?.data?.message || 'Erro ao gerar PIX. Reserva cancelada.');
          setPhase('error');
        });
    } else {
      api.post('/pagamentos/preferencia', { tipo, referenciaId, metodo })
        .then(({ data }) => {
          const url = import.meta.env.DEV ? data.sandboxUrl : data.checkoutUrl;
          window.location.href = url;
        })
        .catch(err => {
          setErrorMsg(err.response?.data?.message || 'Erro ao iniciar pagamento. Reserva cancelada.');
          setPhase('error');
        });
    }
    return () => clearInterval(pollRef.current);
  }, []);

  const copiarPix = () => {
    navigator.clipboard.writeText(pixData.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <style>{`
        .pag-overlay{position:fixed;inset:0;z-index:9800;background:rgba(0,0,0,.93);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:1.5rem}
        .pag-modal{background:var(--card);border:1px solid var(--border);max-width:460px;width:100%;display:flex;flex-direction:column}
        .pag-header{padding:1.4rem 2rem;border-bottom:1px solid var(--border);background:linear-gradient(135deg,rgba(224,172,107,.07),transparent);display:flex;align-items:center;justify-content:space-between}
        .pag-eyebrow{font-family:var(--font-cond);font-size:.62rem;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:.2rem}
        .pag-title{font-family:var(--font-display);font-size:1.5rem;letter-spacing:2px;line-height:1}
        .pag-valor{font-family:var(--font-display);font-size:1.9rem;color:var(--gold)}
        .pag-body{padding:2rem;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2rem;min-height:200px;text-align:center}
        .pag-spinner{width:36px;height:36px;border:2px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:pag-spin .8s linear infinite;flex-shrink:0}
        .pag-spinner-sm{width:14px;height:14px;border-width:1.5px}
        @keyframes pag-spin{to{transform:rotate(360deg)}}
        .pag-body p{font-family:var(--font-cond);font-size:.85rem;color:var(--gray);letter-spacing:1px;line-height:1.5}
        .pag-mp-logo{display:flex;align-items:center;gap:.5rem;font-family:var(--font-cond);font-size:.72rem;letter-spacing:1.5px;color:var(--muted);margin-top:.4rem}
        .pag-icon-err{width:56px;height:56px;border-radius:50%;background:rgba(239,68,68,.08);border:1.5px solid rgba(239,68,68,.3);display:flex;align-items:center;justify-content:center}
        .pag-icon-err svg{stroke:#ef4444}
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
      `}</style>

      <div className="pag-overlay">
        <div className="pag-modal">
          <div className="pag-header">
            <div>
              <p className="pag-eyebrow">{METODO_LABEL[metodo] || 'Mercado Pago'}</p>
              <h2 className="pag-title">PAGAMENTO</h2>
            </div>
            <div className="pag-valor">{fmtReal(valor)}</div>
          </div>

          <div className="pag-body">
            {phase === 'loading' && (
              <>
                <div className="pag-spinner" />
                <p>{metodo === 'pix' ? 'Gerando QR Code PIX…' : 'Redirecionando para o Mercado Pago…'}</p>
                {metodo !== 'pix' && (
                  <span className="pag-mp-logo">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Pagamento seguro · SSL
                  </span>
                )}
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
                <button className="pag-cancel-btn" onClick={async () => {
                  clearInterval(pollRef.current);
                  try { await api.patch(`/bookings/${referenciaId}/cancelar`); } catch { /* ignora */ }
                  onClose();
                }}>
                  Cancelar pagamento
                </button>
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

          {phase === 'error' && (
            <div className="pag-footer">
              <button className="pag-cancel-btn" onClick={onClose}>Fechar</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
