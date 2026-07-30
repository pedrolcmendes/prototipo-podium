import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import Footer from '../components/Footer';

export default function PagamentoRetorno() {
  const [params] = useSearchParams();
  const urlStatus = params.get('collection_status') || params.get('status');
  const mpPaymentId = params.get('collection_id') || params.get('payment_id');

  const [status, setStatus] = useState(urlStatus === 'approved' ? 'syncing' : (urlStatus || 'failure'));

  useEffect(() => {
    if (urlStatus === 'approved' && mpPaymentId) {
      api.get(`/pagamentos/sync?mpPaymentId=${mpPaymentId}`)
        .then(({ data }) => setStatus(data.status === 'aprovado' ? 'approved' : 'pending'))
        .catch(() => setStatus('approved')); // se sync falhar, confia no MP
    }
  }, []);

  const aprovado = status === 'approved' || status === 'aprovado';
  const pendente = status === 'pending' || status === 'syncing';

  return (
    <>
      <style>{`
        .ret-wrap{min-height:80vh;display:flex;align-items:center;justify-content:center;padding:2rem}
        .ret-card{background:var(--card);border:1px solid var(--border);max-width:480px;width:100%;padding:3rem 2.5rem;display:flex;flex-direction:column;align-items:center;gap:1.4rem;text-align:center}
        .ret-icon{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .ret-icon-ok{background:rgba(34,197,94,.08);border:1.5px solid rgba(34,197,94,.3)}
        .ret-icon-ok svg{stroke:#22c55e}
        .ret-icon-warn{background:rgba(245,158,11,.08);border:1.5px solid rgba(245,158,11,.3)}
        .ret-icon-warn svg{stroke:#f59e0b}
        .ret-icon-err{background:rgba(239,68,68,.08);border:1.5px solid rgba(239,68,68,.3)}
        .ret-icon-err svg{stroke:#ef4444}
        .ret-spinner{width:40px;height:40px;border:2px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:ret-spin .8s linear infinite}
        @keyframes ret-spin{to{transform:rotate(360deg)}}
        .ret-title{font-family:var(--font-display);font-size:1.6rem;letter-spacing:2px}
        .ret-sub{font-family:var(--font-cond);font-size:.88rem;color:var(--gray);line-height:1.6;max-width:340px}
        .ret-actions{display:flex;gap:.8rem;flex-wrap:wrap;justify-content:center;margin-top:.5rem}
      `}</style>

      <div className="ret-wrap">
        <div className="ret-card">

          {status === 'syncing' && (
            <>
              <div className="ret-spinner" />
              <p className="ret-sub">Confirmando seu pagamento…</p>
            </>
          )}

          {aprovado && (
            <>
              <div className="ret-icon ret-icon-ok">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h1 className="ret-title">PAGAMENTO CONFIRMADO!</h1>
              <p className="ret-sub">Sua reserva está confirmada — nos vemos na arena!</p>
              <div className="ret-actions">
                <Link to="/painel" className="btn-gold">Ver minha reserva</Link>
                <Link to="/reservas" className="btn-ghost">Nova reserva</Link>
              </div>
            </>
          )}

          {pendente && status !== 'syncing' && (
            <>
              <div className="ret-icon ret-icon-warn">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h1 className="ret-title">EM ANÁLISE</h1>
              <p className="ret-sub">Seu pagamento está sendo processado. Você receberá confirmação por e-mail em breve.</p>
              <div className="ret-actions">
                <Link to="/painel" className="btn-gold">Meu painel</Link>
              </div>
            </>
          )}

          {!aprovado && !pendente && status !== 'syncing' && (
            <>
              <div className="ret-icon ret-icon-err">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
              </div>
              <h1 className="ret-title">NÃO CONCLUÍDO</h1>
              <p className="ret-sub">O pagamento não foi realizado. Sua reserva foi cancelada. Tente novamente quando quiser.</p>
              <div className="ret-actions">
                <Link to="/reservas" className="btn-gold">Tentar novamente</Link>
                <Link to="/painel" className="btn-ghost">Meu painel</Link>
              </div>
            </>
          )}

        </div>
      </div>

      <Footer />
    </>
  );
}
