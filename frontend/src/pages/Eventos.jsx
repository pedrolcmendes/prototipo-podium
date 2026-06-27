import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import AuthModal from '../components/AuthModal';
import Footer from '../components/Footer';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function catIcon(cat) {
  const d = {
    'Beach Tennis': <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>,
    'Futevôlei': <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>,
    'Vôlei': <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2v20"/></svg>,
    'Pickleball': <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>,
    'Geral': <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
  };
  return d[cat] || d['Geral'];
}

function statusClass(s) {
  if (s === 'aberto') return 'event-status open';
  if (s === 'esgotado') return 'event-status last';
  return 'event-status closed';
}
function statusLabel(s) {
  if (s === 'aberto') return 'Inscrições Abertas';
  if (s === 'esgotado') return 'Últimas vagas';
  return 'Encerrado';
}

export default function Eventos() {
  const { user } = useAuth();
  const toast = useToast();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvt, setSelectedEvt] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [inscLoading, setInscLoading] = useState(false);
  const [userRegs, setUserRegs] = useState([]);

  useEffect(() => {
    api.get('/events').then(r => setEventos(r.data.data || r.data || [])).catch(() => {}).finally(() => setLoading(false));
    if (user) {
      api.get('/registrations/me').then(r => setUserRegs((r.data.data || r.data || []).map(x => x.eventId?._id || x.eventId))).catch(() => {});
    }
  }, [user]);

  const handleInscrever = async () => {
    if (!user) { setAuthOpen(true); return; }
    if (!selectedEvt) return;
    setInscLoading(true);
    try {
      await api.post('/registrations', { eventId: selectedEvt._id });
      toast('Inscrição realizada!', 'success');
      setUserRegs(prev => [...prev, selectedEvt._id]);
      setEventos(prev => prev.map(e => e._id === selectedEvt._id ? { ...e, vagasOcupadas: (e.vagasOcupadas || 0) + 1 } : e));
    } catch (ex) {
      toast(ex.response?.data?.message || 'Erro ao inscrever', 'error');
    } finally {
      setInscLoading(false);
    }
  };

  const isInscrito = selectedEvt && userRegs.includes(selectedEvt._id);

  return (
    <>
      <style>{`
        .page-hero{padding:3rem 2rem 2rem;max-width:var(--max-w);margin:0 auto}
        .page-hero .section-eyebrow{margin-bottom:.5rem}
        .page-hero h1{font-family:var(--font-display);font-size:clamp(2rem,5vw,3.5rem);letter-spacing:2px;line-height:1;margin-bottom:1rem}
        .page-hero p{color:var(--gray);font-size:1rem;max-width:600px}
        .events-wrap{max-width:var(--max-w);margin:0 auto;padding:1rem 2rem 5rem}
        .events-list{display:flex;flex-direction:column;gap:1px;background:var(--border)}
        .event-card{background:var(--card);display:grid;grid-template-columns:160px 1fr;cursor:pointer;border-bottom:1px solid transparent;transition:all var(--trans-med)}
        .event-card:hover{background:rgba(197,160,40,.04);border-bottom-color:rgba(197,160,40,.2)}
        .event-card-left{background:var(--dark);padding:2rem 1.5rem;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.8rem;border-right:1px solid var(--border)}
        .event-icon{font-size:2.5rem}
        .event-date-block{text-align:center}
        .event-day{font-family:var(--font-display);font-size:3.2rem;line-height:1;color:var(--gold)}
        .event-month{font-family:var(--font-cond);font-size:.72rem;letter-spacing:3px;text-transform:uppercase;color:var(--gray)}
        .event-card-body{padding:2rem}
        .event-card-top{display:flex;justify-content:space-between;gap:2rem;margin-bottom:1.2rem;flex-wrap:wrap}
        .event-card-modal{font-family:var(--font-cond);font-size:.72rem;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:.4rem}
        .event-card-name{font-family:var(--font-cond);font-size:1.4rem;font-weight:700;letter-spacing:1px;margin-bottom:.4rem}
        .event-card-meta{font-size:.85rem;color:var(--gray);display:flex;gap:1.2rem;flex-wrap:wrap}
        .event-card-status-wrap{display:flex;flex-direction:column;align-items:flex-end;gap:.5rem;flex-shrink:0}
        .event-status{font-family:var(--font-cond);font-size:.7rem;letter-spacing:2px;text-transform:uppercase;border:1px solid var(--gold);color:var(--gold);padding:.35rem .9rem;white-space:nowrap}
        .event-status.open{background:rgba(197,160,40,.1)}
        .event-status.closed{border-color:var(--gray);color:var(--gray)}
        .event-status.last{border-color:var(--amber);color:var(--amber);background:rgba(245,158,11,.1)}
        .event-price{font-family:var(--font-display);font-size:1.5rem;color:var(--white)}
        .event-price small{font-family:var(--font-cond);font-size:.75rem;color:var(--gray)}
        .event-progress-wrap{display:flex;flex-direction:column;gap:.4rem}
        .event-progress-bar{height:3px;background:var(--border);border-radius:2px;overflow:hidden}
        .event-progress-fill{height:100%;background:linear-gradient(90deg,var(--gold-dark),var(--gold));border-radius:2px;transition:width .6s}
        .event-progress-label{font-family:var(--font-cond);font-size:.75rem;letter-spacing:1px;color:var(--gray)}
        .evt-overlay{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.88);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;padding:1.5rem;overflow-y:auto}
        .evt-modal{background:var(--card);border:1px solid var(--border);max-width:560px;width:100%;position:relative;margin:auto}
        .evt-modal-header{position:relative;padding:2.5rem;border-bottom:1px solid var(--border)}
        .evt-modal-icon{font-size:3rem;margin-bottom:.8rem}
        .evt-modal-modal{font-family:var(--font-cond);font-size:.72rem;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:.4rem}
        .evt-modal-title{font-family:var(--font-display);font-size:2rem;letter-spacing:2px;line-height:1}
        .evt-modal-body{padding:2rem 2.5rem}
        .evt-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;margin-bottom:1.8rem}
        .evt-detail-item label{font-family:var(--font-cond);font-size:.72rem;letter-spacing:3px;text-transform:uppercase;color:var(--gray);display:block;margin-bottom:.3rem}
        .evt-detail-item span{font-family:var(--font-cond);font-size:.98rem;font-weight:600}
        .evt-desc{font-size:.92rem;color:var(--gray);line-height:1.8;margin-bottom:1.8rem}
        .evt-modal-footer{padding:1.5rem 2.5rem;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
        .evt-modal-price{font-family:var(--font-display);font-size:2rem;color:var(--gold)}
        .evt-modal-price small{font-family:var(--font-cond);font-size:.75rem;color:var(--gray);display:block}
        @media(max-width:700px){.event-card{grid-template-columns:1fr}.event-card-left{flex-direction:row;justify-content:flex-start;padding:1.2rem 1.5rem;border-right:none;border-bottom:1px solid var(--border)}.evt-detail-grid{grid-template-columns:1fr}.evt-modal-footer{flex-direction:column}}
      `}</style>

      <div className="page-hero">
        <p className="section-eyebrow">Podium Arena</p>
        <h1>EVENTOS <span style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold),var(--gold-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>& TORNEIOS</span></h1>
        <p>Campeonatos, ligas e eventos de beach sports. Inscreva-se e faça parte da arena.</p>
      </div>

      <div className="events-wrap">
        {loading && <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-cond)', letterSpacing: '1px' }}>Carregando eventos…</p>}
        {!loading && eventos.length === 0 && (
          <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-cond)', letterSpacing: '1px' }}>Nenhum evento disponível no momento.</p>
        )}
        <div className="events-list">
          {eventos.map(ev => {
            const d = new Date(ev.data + 'T12:00:00');
            const pct = ev.vagas > 0 ? Math.round(((ev.vagasOcupadas || 0) / ev.vagas) * 100) : 0;
            return (
              <div key={ev._id} className="event-card" onClick={() => setSelectedEvt(ev)}>
                <div className="event-card-left">
                  <div className="event-icon">{catIcon(ev.categoria)}</div>
                  <div className="event-date-block">
                    <div className="event-day">{String(d.getDate()).padStart(2,'0')}</div>
                    <div className="event-month">{MESES[d.getMonth()]} {d.getFullYear()}</div>
                  </div>
                </div>
                <div className="event-card-body">
                  <div className="event-card-top">
                    <div>
                      <div className="event-card-modal">{ev.categoria}</div>
                      <div className="event-card-name">{ev.nome}</div>
                      <div className="event-card-meta">
                        <span>📍 {ev.local}</span>
                        <span>🕐 {ev.hora}</span>
                        {ev.nivel && <span>🏆 {ev.nivel}</span>}
                      </div>
                    </div>
                    <div className="event-card-status-wrap">
                      <span className={statusClass(ev.status)}>{statusLabel(ev.status)}</span>
                      <div className="event-price">
                        {ev.preco > 0 ? `R$ ${ev.preco}` : 'Gratuito'}
                        {ev.preco > 0 && <small>por pessoa</small>}
                      </div>
                    </div>
                  </div>
                  {ev.vagas > 0 && (
                    <div className="event-progress-wrap">
                      <div className="event-progress-bar">
                        <div className="event-progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="event-progress-label">{ev.vagasOcupadas || 0} / {ev.vagas} inscritos</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL EVENTO */}
      {selectedEvt && (
        <div className="evt-overlay" onClick={(e) => e.target.className === 'evt-overlay' && setSelectedEvt(null)}>
          <div className="evt-modal">
            <button className="modal-close" onClick={() => setSelectedEvt(null)} style={{ top: '1rem', right: '1rem' }}>&#x2715;</button>
            <div className="evt-modal-header">
              <div className="evt-modal-icon">{catIcon(selectedEvt.categoria)}</div>
              <div className="evt-modal-modal">{selectedEvt.categoria}</div>
              <div className="evt-modal-title">{selectedEvt.nome}</div>
            </div>
            <div className="evt-modal-body">
              <div className="evt-detail-grid">
                <div className="evt-detail-item"><label>Data</label><span>{(() => { const d = new Date(selectedEvt.data + 'T12:00:00'); return `${String(d.getDate()).padStart(2,'0')} de ${MESES_FULL[d.getMonth()]} de ${d.getFullYear()}`; })()}</span></div>
                <div className="evt-detail-item"><label>Horário</label><span>{selectedEvt.hora}</span></div>
                <div className="evt-detail-item"><label>Local</label><span>{selectedEvt.local}</span></div>
                <div className="evt-detail-item"><label>Nível</label><span>{selectedEvt.nivel || '—'}</span></div>
                {selectedEvt.vagas > 0 && <div className="evt-detail-item"><label>Vagas</label><span>{selectedEvt.vagas - (selectedEvt.vagasOcupadas||0)} restantes</span></div>}
                <div className="evt-detail-item"><label>Status</label><span className={statusClass(selectedEvt.status)}>{statusLabel(selectedEvt.status)}</span></div>
              </div>
              {selectedEvt.desc && <p className="evt-desc">{selectedEvt.desc}</p>}
            </div>
            <div className="evt-modal-footer">
              <div className="evt-modal-price">
                {selectedEvt.preco > 0 ? `R$ ${selectedEvt.preco}` : 'Gratuito'}
                <small>inscrição</small>
              </div>
              {isInscrito ? (
                <button className="btn-outline" disabled style={{ opacity: .6 }}>Já inscrito ✓</button>
              ) : (
                <button className="btn-gold" disabled={selectedEvt.status !== 'aberto' || inscLoading} onClick={handleInscrever}>
                  {inscLoading ? 'Inscrevendo…' : 'Inscrever-se'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {authOpen && <AuthModal initialTab="login" onClose={() => setAuthOpen(false)} />}
      <Footer />
    </>
  );
}
