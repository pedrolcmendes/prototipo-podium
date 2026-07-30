import { useSearchParams, Link } from 'react-router-dom';
import Footer from '../components/Footer';

export default function PagamentoRetorno() {
  const [params] = useSearchParams();
  const status = params.get('collection_status') || params.get('status');

  const aprovado = status === 'approved';
  const pendente = status === 'pending' || status === 'in_process';

  return (
    <>
      <style>{`
        .ret-wrap{min-height:80vh;display:flex;align-items:center;justify-content:center;padding:2rem}
        .ret-card{background:var(--card);border:1px solid var(--border);max-width:480px;width:100%;padding:3rem 2.5rem;display:flex;flex-direction:column;align-items:center;gap:1.4rem;text-align:center}
        .ret-icon{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .ret-icon-ok{background:rgba(34,197,94,.08);border:1.5px solid rgba(34,197,94,.3)}
        .ret-icon-ok svg{stroke:#22c55e}
        .ret-icon-warn{background:rgba(245,158,11,.08);border:1.5px solid rgba(245,158,11,.3)}
        .ret-icon-warn svg{stroke:var(--amber,#f59e0b)}
        .ret-icon-err{background:rgba(239,68,68,.08);border:1.5px solid rgba(239,68,68,.3)}
        .ret-icon-err svg{stroke:#ef4444}
        .ret-title{font-family:var(--font-display);font-size:1.6rem;letter-spacing:2px}
        .ret-sub{font-family:var(--font-cond);font-size:.88rem;color:var(--gray);line-height:1.6;max-width:340px}
        .ret-actions{display:flex;gap:.8rem;flex-wrap:wrap;justify-content:center;margin-top:.5rem}
      `}</style>

      <div className="ret-wrap">
        <div className="ret-card">
          {aprovado && (
            <>
              <div className="ret-icon ret-icon-ok">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h1 className="ret-title">PAGAMENTO CONFIRMADO!</h1>
              <p className="ret-sub">
                Seu pagamento foi aprovado. Sua reserva está confirmada — nos vemos na arena!
              </p>
            </>
          )}

          {pendente && (
            <>
              <div className="ret-icon ret-icon-warn">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h1 className="ret-title">PAGAMENTO EM ANÁLISE</h1>
              <p className="ret-sub">
                Seu pagamento está sendo processado. Você receberá uma confirmação por e-mail assim que for aprovado.
              </p>
            </>
          )}

          {!aprovado && !pendente && (
            <>
              <div className="ret-icon ret-icon-err">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
              </div>
              <h1 className="ret-title">PAGAMENTO NÃO CONCLUÍDO</h1>
              <p className="ret-sub">
                O pagamento não foi realizado. Sua reserva foi cancelada. Você pode fazer uma nova reserva quando quiser.
              </p>
            </>
          )}

          <div className="ret-actions">
            <Link to="/reservas" className="btn-gold">Fazer nova reserva</Link>
            <Link to="/painel" className="btn-ghost">Meu painel</Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
