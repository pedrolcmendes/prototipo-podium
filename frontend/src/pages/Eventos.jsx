import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import AuthModal from '../components/AuthModal';
import Footer from '../components/Footer';
import useLive from '../hooks/useLive';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_FULL = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const CAT_LABEL = { beachtennis: 'Beach Tennis', futevolei: 'Futevôlei', volei: 'Vôlei', pickleball: 'Pickleball', taekwondo: 'Taekwondo', geral: 'Geral' };
const catLabel = (c) => CAT_LABEL[c] || c || 'Evento';
// imagem com caminho morto (uploads antigos em disco) cai no fallback
const hideBroken = (e) => { e.currentTarget.style.display = 'none'; };

function catIcon(cat) {
  cat = catLabel(cat);
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
  if (s === 'aberto') return 'evt-status open';
  if (s === 'esgotado') return 'evt-status last';
  return 'evt-status closed';
}
function statusLabel(s) {
  if (s === 'aberto') return 'Inscrições Abertas';
  if (s === 'esgotado') return 'Últimas vagas';
  return 'Encerrado';
}

const IcoPin = () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcoClock = () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcoTrophy = () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>;
const IcoUsers = () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;

export default function Eventos() {
  const { user } = useAuth();
  const toast = useToast();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvt, setSelectedEvt] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [inscLoading, setInscLoading] = useState(false);
  const [userRegs, setUserRegs] = useState([]);
  const [posterZoom, setPosterZoom] = useState(false); // arte em tela cheia

  useBodyScrollLock(!!selectedEvt);

  useEffect(() => {
    api.get('/events').then(r => setEventos(r.data.data || r.data || [])).catch(() => {}).finally(() => setLoading(false));
    if (user) {
      api.get('/registrations/me').then(r => setUserRegs((r.data.data || r.data || []).map(x => x.eventId?._id || x.eventId))).catch(() => {});
    }
  }, [user]);

  // tempo real: vagas e novos eventos atualizam sem recarregar
  useLive(['events', 'registrations'], () => {
    api.get('/events').then(r => setEventos(r.data.data || r.data || [])).catch(() => {});
    if (user) {
      api.get('/registrations/me').then(r => setUserRegs((r.data.data || r.data || []).map(x => x.eventId?._id || x.eventId))).catch(() => {});
    }
  });

  const handleInscrever = async () => {
    if (!user) { setAuthOpen(true); return; }
    if (!selectedEvt) return;
    setInscLoading(true);
    try {
      await api.post(`/registrations/evento/${selectedEvt._id}`);
      toast('Inscrição realizada!', 'success');
      setUserRegs(prev => [...prev, selectedEvt._id]);
      setEventos(prev => prev.map(e => e._id === selectedEvt._id ? { ...e, inscritos: (e.inscritos || 0) + 1 } : e));
    } catch (ex) {
      toast(ex.response?.data?.message || 'Erro ao inscrever', 'error');
    } finally {
      setInscLoading(false);
    }
  };

  const isInscrito = selectedEvt && userRegs.includes(selectedEvt._id);
  const inscritosDe = (ev) => ev.inscritos ?? ev.vagasOcupadas ?? 0;

  return (
    <>
      <style>{`
        .page-hero{padding:3rem 2rem 2rem;max-width:var(--max-w);margin:0 auto}
        .page-hero .section-eyebrow{margin-bottom:.5rem}
        .page-hero h1{font-family:var(--font-display);font-size:clamp(2rem,5vw,3.5rem);letter-spacing:2px;line-height:1;margin-bottom:1rem}
        .page-hero p{color:var(--gray);font-size:1rem;max-width:600px}
        .events-wrap{max-width:var(--max-w);margin:0 auto;padding:1rem 2rem 5rem}

        /* ── Grade de cards estilo pôster ── */
        .evt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:1.6rem}
        .evt-card{background:var(--card);border:1px solid var(--border);cursor:pointer;display:flex;flex-direction:column;transition:transform var(--trans-med),border-color var(--trans-med),box-shadow var(--trans-med)}
        .evt-card:hover{transform:translateY(-4px);border-color:rgba(197,160,40,.45);box-shadow:0 14px 40px rgba(0,0,0,.45)}
        .evt-poster{position:relative;aspect-ratio:3/4;overflow:hidden;background:var(--dark)}
        .evt-poster img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s ease}
        .evt-card:hover .evt-poster img{transform:scale(1.04)}
        .evt-poster-fallback{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.9rem;color:var(--gold);background:radial-gradient(ellipse at 50% 30%,rgba(197,160,40,.14),transparent 65%),var(--dark)}
        .evt-poster-fallback span{font-family:var(--font-cond);font-size:.72rem;letter-spacing:3px;text-transform:uppercase;color:var(--gray)}
        .evt-chip-date{position:absolute;top:.8rem;left:.8rem;background:rgba(8,8,8,.82);backdrop-filter:blur(6px);border:1px solid rgba(197,160,40,.4);text-align:center;padding:.45rem .7rem .4rem;line-height:1}
        .evt-chip-date strong{display:block;font-family:var(--font-display);font-size:1.5rem;color:var(--gold)}
        .evt-chip-date span{font-family:var(--font-cond);font-size:.62rem;letter-spacing:2px;text-transform:uppercase;color:var(--white)}
        .evt-chip-status{position:absolute;top:.8rem;right:.8rem}
        .evt-status{font-family:var(--font-cond);font-size:.66rem;letter-spacing:2px;text-transform:uppercase;border:1px solid var(--gold);color:var(--gold);background:rgba(8,8,8,.82);backdrop-filter:blur(6px);padding:.35rem .7rem;white-space:nowrap}
        .evt-status.open{color:#4ade80;border-color:rgba(74,222,128,.6)}
        .evt-status.closed{border-color:var(--gray);color:var(--gray)}
        .evt-status.last{border-color:var(--amber);color:var(--amber)}
        .evt-body{padding:1.1rem 1.2rem 1.25rem;display:flex;flex-direction:column;gap:.55rem;flex:1}
        .evt-cat{font-family:var(--font-cond);font-size:.68rem;letter-spacing:3px;text-transform:uppercase;color:var(--gold)}
        .evt-name{font-family:var(--font-cond);font-size:1.15rem;font-weight:700;letter-spacing:.5px;line-height:1.25;color:var(--white)}
        .evt-meta{display:flex;flex-wrap:wrap;gap:.4rem 1rem;font-size:.8rem;color:var(--gray)}
        .evt-meta span{display:inline-flex;align-items:center;gap:.35rem}
        .evt-foot{margin-top:auto;padding-top:.7rem;border-top:1px solid var(--border);display:flex;align-items:flex-end;justify-content:space-between;gap:1rem}
        .evt-price{font-family:var(--font-display);font-size:1.35rem;color:var(--white);line-height:1}
        .evt-price small{display:block;font-family:var(--font-cond);font-size:.66rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--gray);margin-top:.25rem}
        .evt-slots{flex:1;max-width:150px}
        .evt-progress-bar{height:3px;background:var(--border);border-radius:2px;overflow:hidden;margin-bottom:.35rem}
        .evt-progress-fill{height:100%;background:linear-gradient(90deg,var(--gold-dark),var(--gold));border-radius:2px;transition:width .6s}
        .evt-progress-label{font-family:var(--font-cond);font-size:.68rem;letter-spacing:1px;color:var(--gray);text-align:right}

        /* ── Modal com pôster + informações ── */
        .evt-overlay{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.88);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;padding:1.5rem;overflow-y:auto}
        .evt-modal{background:var(--card);border:1px solid var(--border);max-width:920px;width:100%;position:relative;margin:auto;display:grid;grid-template-columns:minmax(300px,380px) 1fr}
        .evt-modal .modal-close{z-index:5}
        .evt-modal-poster{position:relative;background:var(--dark);border-right:1px solid var(--border);min-height:100%}
        .evt-modal-poster img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;cursor:zoom-in}
        .evt-modal-poster .evt-poster-fallback{position:absolute}
        .evt-modal-info{padding:2.2rem 2.4rem;display:flex;flex-direction:column;min-width:0}
        .evt-modal-cat{font-family:var(--font-cond);font-size:.72rem;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:.5rem}
        .evt-modal-title{font-family:var(--font-display);font-size:clamp(1.6rem,3vw,2.2rem);letter-spacing:2px;line-height:1.05;margin-bottom:1.4rem}
        .evt-highlights{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border);border:1px solid var(--border);margin-bottom:1.4rem}
        .evt-highlight{background:var(--dark);padding:1rem 1.2rem}
        .evt-highlight label{font-family:var(--font-cond);font-size:.66rem;letter-spacing:2.5px;text-transform:uppercase;color:var(--gray);display:block;margin-bottom:.35rem}
        .evt-highlight strong{font-family:var(--font-display);font-size:1.45rem;color:var(--gold);line-height:1}
        .evt-highlight span{display:block;font-family:var(--font-cond);font-size:.74rem;letter-spacing:1px;color:var(--gray);margin-top:.3rem}
        .evt-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem 1.4rem;margin-bottom:1.3rem}
        .evt-detail-item label{font-family:var(--font-cond);font-size:.68rem;letter-spacing:2.5px;text-transform:uppercase;color:var(--gray);display:flex;align-items:center;gap:.4rem;margin-bottom:.3rem}
        .evt-detail-item span{font-family:var(--font-cond);font-size:.95rem;font-weight:600}
        .evt-desc{font-size:.9rem;color:var(--gray);line-height:1.75;margin-bottom:1.3rem}
        .evt-modal-actions{margin-top:auto;padding-top:1.3rem;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:flex-end;gap:1rem;flex-wrap:wrap}
        .evt-modal-actions .btn-gold,.evt-modal-actions .btn-outline{white-space:nowrap}

        /* arte em tela cheia */
        .evt-zoom{position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.94);display:flex;align-items:center;justify-content:center;padding:2rem;cursor:zoom-out}
        .evt-zoom img{max-width:100%;max-height:100%;object-fit:contain;box-shadow:0 20px 80px rgba(0,0,0,.8)}

        @media(max-width:820px){
          .evt-modal{grid-template-columns:1fr;max-width:480px}
          .evt-modal-poster{border-right:none;border-bottom:1px solid var(--border);min-height:0;aspect-ratio:3/4;max-height:56vh}
          .evt-modal-poster img{position:absolute}
          .evt-modal-info{padding:1.6rem 1.4rem}
          .evt-modal-actions{justify-content:stretch}
          .evt-modal-actions .btn-gold,.evt-modal-actions .btn-outline{width:100%;justify-content:center;text-align:center}
        }
        @media(max-width:480px){
          .page-hero{padding:2rem 1rem 1.5rem}
          .events-wrap{padding:1rem 1rem 3rem}
          .evt-grid{grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:1.1rem}
          .evt-overlay{padding:.9rem}
          .evt-detail-grid{grid-template-columns:1fr 1fr;gap:.9rem 1rem}
        }
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
        <div className="evt-grid">
          {[...eventos]
            .sort((a, b) => {
              // inscrições abertas primeiro; encerrados por último; empate → data mais próxima
              const rank = (e) => e.status === 'aberto' ? 0 : e.status === 'esgotado' ? 1 : 2;
              return rank(a) - rank(b) || (a.data || '').localeCompare(b.data || '');
            })
            .map(ev => {
            const d = ev.data ? new Date(ev.data + 'T12:00:00') : null;
            const inscritos = inscritosDe(ev);
            const pct = ev.vagas > 0 ? Math.min(100, Math.round((inscritos / ev.vagas) * 100)) : 0;
            return (
              <article key={ev._id} className="evt-card" onClick={() => { setPosterZoom(false); setSelectedEvt(ev); }}>
                <div className="evt-poster">
                  <div className="evt-poster-fallback">{catIcon(ev.categoria)}<span>{catLabel(ev.categoria)}</span></div>
                  {ev.imagem && <img src={ev.imagem} alt={ev.nome} loading="lazy" onError={hideBroken} style={{ position: 'relative' }} />}
                  {d && (
                    <div className="evt-chip-date">
                      <strong>{String(d.getDate()).padStart(2, '0')}</strong>
                      <span>{MESES[d.getMonth()]}</span>
                    </div>
                  )}
                  <span className={`evt-chip-status ${statusClass(ev.status)}`}>{statusLabel(ev.status)}</span>
                </div>
                <div className="evt-body">
                  <div className="evt-cat">{catLabel(ev.categoria)}</div>
                  <h3 className="evt-name">{ev.nome}</h3>
                  <div className="evt-meta">
                    {ev.local && <span><IcoPin /> {ev.local}</span>}
                    {ev.hora && <span><IcoClock /> {ev.hora}</span>}
                  </div>
                  <div className="evt-foot">
                    <div className="evt-price">
                      {ev.preco > 0 ? `R$ ${ev.preco}` : 'Gratuito'}
                      {ev.preco > 0 && <small>por pessoa</small>}
                    </div>
                    {ev.vagas > 0 && (
                      <div className="evt-slots">
                        <div className="evt-progress-bar"><div className="evt-progress-fill" style={{ width: `${pct}%` }} /></div>
                        <div className="evt-progress-label">{inscritos}/{ev.vagas} inscritos</div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* MODAL EVENTO — pôster sempre visível ao lado das informações */}
      {selectedEvt && (() => {
        const d = selectedEvt.data ? new Date(selectedEvt.data + 'T12:00:00') : null;
        const inscritos = inscritosDe(selectedEvt);
        const restantes = selectedEvt.vagasRestantes ?? (selectedEvt.vagas > 0 ? selectedEvt.vagas - inscritos : null);
        return (
          <div className="evt-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedEvt(null); }}>
            <div className="evt-modal">
              <button className="modal-close" onClick={() => setSelectedEvt(null)} style={{ top: '1rem', right: '1rem' }}>&#x2715;</button>

              <div className="evt-modal-poster">
                <div className="evt-poster-fallback">{catIcon(selectedEvt.categoria)}<span>{catLabel(selectedEvt.categoria)}</span></div>
                {selectedEvt.imagem && <img src={selectedEvt.imagem} alt={selectedEvt.nome} title="Ver arte completa" onError={hideBroken} onClick={() => setPosterZoom(true)} />}
              </div>

              <div className="evt-modal-info">
                <div className="evt-modal-cat">{catLabel(selectedEvt.categoria)}</div>
                <div className="evt-modal-title">{selectedEvt.nome}</div>

                <div className="evt-highlights">
                  <div className="evt-highlight">
                    <label>Data do evento</label>
                    <strong>{d ? `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()].toUpperCase()}` : '—'}</strong>
                    <span>{d ? `${DIAS_FULL[d.getDay()]} · ${d.getFullYear()}` : ''}</span>
                  </div>
                  <div className="evt-highlight">
                    <label>Inscrição</label>
                    <strong>{selectedEvt.preco > 0 ? `R$ ${selectedEvt.preco}` : 'GRÁTIS'}</strong>
                    <span>{selectedEvt.preco > 0 ? 'por pessoa' : 'entrada livre'}</span>
                  </div>
                </div>

                <div className="evt-detail-grid">
                  <div className="evt-detail-item"><label><IcoClock /> Horário</label><span>{selectedEvt.hora || '—'}</span></div>
                  <div className="evt-detail-item"><label><IcoPin /> Local</label><span>{selectedEvt.local || '—'}</span></div>
                  <div className="evt-detail-item"><label><IcoTrophy /> Nível</label><span>{selectedEvt.nivel || 'Todos os níveis'}</span></div>
                  <div className="evt-detail-item">
                    <label><IcoUsers /> Vagas</label>
                    <span>{restantes != null ? `${restantes} restantes` : 'Livre'}</span>
                  </div>
                </div>

                {selectedEvt.desc && <p className="evt-desc">{selectedEvt.desc}</p>}

                <div className="evt-modal-actions">
                  <span className={statusClass(selectedEvt.status)}>{statusLabel(selectedEvt.status)}</span>
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
          </div>
        );
      })()}

      {/* Arte em tela cheia */}
      {posterZoom && selectedEvt?.imagem && (
        <div className="evt-zoom" onClick={() => setPosterZoom(false)}>
          <img src={selectedEvt.imagem} alt={selectedEvt.nome} />
        </div>
      )}

      {authOpen && <AuthModal initialTab="login" onClose={() => setAuthOpen(false)} />}
      <Footer />
    </>
  );
}
