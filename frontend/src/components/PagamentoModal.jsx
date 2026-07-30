import { useEffect, useState } from 'react';
import api from '../services/api';

const fmtReal = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function PagamentoModal({ tipo, referenciaId, valor, onClose }) {
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    api.post('/pagamentos/preferencia', { tipo, referenciaId })
      .then(({ data }) => {
        const url = import.meta.env.DEV ? data.sandboxUrl : data.checkoutUrl;
        window.location.href = url;
      })
      .catch(err => {
        setErrorMsg(err.response?.data?.message || 'Erro ao iniciar pagamento. Reserva cancelada.');
      });
  }, []);

  return (
    <>
      <style>{`
        .pag-overlay{position:fixed;inset:0;z-index:9800;background:rgba(0,0,0,.93);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:1.5rem}
        .pag-modal{background:var(--card);border:1px solid var(--border);max-width:440px;width:100%;display:flex;flex-direction:column}
        .pag-header{padding:1.4rem 2rem;border-bottom:1px solid var(--border);background:linear-gradient(135deg,rgba(224,172,107,.07),transparent);display:flex;align-items:center;justify-content:space-between}
        .pag-eyebrow{font-family:var(--font-cond);font-size:.62rem;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:.2rem}
        .pag-title{font-family:var(--font-display);font-size:1.5rem;letter-spacing:2px;line-height:1}
        .pag-valor{font-family:var(--font-display);font-size:1.9rem;color:var(--gold)}
        .pag-body{padding:2.5rem 2rem;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2rem;min-height:200px;text-align:center}
        .pag-spinner{width:36px;height:36px;border:2px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:pag-spin .8s linear infinite;flex-shrink:0}
        @keyframes pag-spin{to{transform:rotate(360deg)}}
        .pag-body p{font-family:var(--font-cond);font-size:.85rem;color:var(--gray);letter-spacing:1px;line-height:1.5}
        .pag-mp-logo{display:flex;align-items:center;gap:.5rem;font-family:var(--font-cond);font-size:.72rem;letter-spacing:1.5px;color:var(--muted);margin-top:.4rem}
        .pag-icon-err{width:56px;height:56px;border-radius:50%;background:rgba(239,68,68,.08);border:1.5px solid rgba(239,68,68,.3);display:flex;align-items:center;justify-content:center}
        .pag-icon-err svg{stroke:#ef4444}
        .pag-err-title{font-family:var(--font-cond);font-size:1.1rem;letter-spacing:1px;color:var(--white)}
        .pag-footer{padding:1rem 2rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end}
        .pag-cancel-btn{background:none;border:1px solid var(--border);color:var(--gray);padding:.45rem .9rem;font-family:var(--font-cond);font-size:.72rem;font-weight:700;letter-spacing:1.5px;cursor:pointer;transition:all var(--trans-fast)}
        .pag-cancel-btn:hover{border-color:#ef4444;color:#ef4444}
      `}</style>

      <div className="pag-overlay">
        <div className="pag-modal">
          <div className="pag-header">
            <div>
              <p className="pag-eyebrow">Mercado Pago</p>
              <h2 className="pag-title">PAGAMENTO</h2>
            </div>
            <div className="pag-valor">{fmtReal(valor)}</div>
          </div>

          <div className="pag-body">
            {!errorMsg ? (
              <>
                <div className="pag-spinner" />
                <p>Redirecionando para o Mercado Pago…</p>
                <span className="pag-mp-logo">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Pagamento seguro · SSL
                </span>
              </>
            ) : (
              <>
                <div className="pag-icon-err">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                </div>
                <p className="pag-err-title">Erro no Pagamento</p>
                <p>{errorMsg}</p>
              </>
            )}
          </div>

          {errorMsg && (
            <div className="pag-footer">
              <button className="pag-cancel-btn" onClick={onClose}>Fechar</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
