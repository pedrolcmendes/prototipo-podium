import { useState, useEffect } from 'react';
import api from '../services/api';
import Footer from '../components/Footer';

const SPORTS = [
  {
    id: 'beachtennis', label: 'Beach Tennis',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M6.3 6.3a8 8 0 0 1 11.4 0"/><path d="M6.3 17.7a8 8 0 0 0 11.4 0"/><path d="M12 2v20"/></svg>,
  },
  {
    id: 'futevolei', label: 'Futevôlei',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>,
  },
];

function initials(nome) {
  if (!nome) return '?';
  const parts = nome.split('/').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] || '') + (parts[1][0] || '');
  return (parts[0]?.[0] || '').toUpperCase();
}

export default function Ranking() {
  const [sport, setSport] = useState('beachtennis');
  const [genero, setGenero] = useState('masculino');
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setRanking(null);
    api.get(`/ranking?esporte=${sport}&genero=${genero}`)
      .then(r => {
        const list = r.data.data || r.data;
        setRanking(Array.isArray(list) ? list[0] : list);
      })
      .catch(() => setRanking(null))
      .finally(() => setLoading(false));
  }, [sport, genero]);

  const entries = ranking?.entries || [];
  const top3 = entries.slice(0, 3);
  // Podium display: 2nd | 1st | 3rd
  const podium = [
    { entry: top3[1], place: 2, height: 70 },
    { entry: top3[0], place: 1, height: 100 },
    { entry: top3[2], place: 3, height: 50 },
  ];
  const posClass = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
  const rowClass = (i) => i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';

  return (
    <>
      <div className="ranking-hero">
        <div className="ranking-hero-inner">
          <p className="section-eyebrow">Podium Arena · Telêmaco Borba</p>
          <h1 className="ranking-hero-title">
            RANKING{' '}
            <span className="ranking-hero-accent">OFICIAL</span>
          </h1>
          <p className="ranking-hero-sub">Classificação oficial das duplas de Futevôlei e Beach Tennis. Temporada 2026.</p>
        </div>
      </div>

      <div className="ranking-page-wrap">

        {/* Tabs de esporte */}
        <div className="ranking-tabs-nav">
          {SPORTS.map(s => (
            <button
              key={s.id}
              className={`ranking-tab${sport === s.id ? ' active' : ''}`}
              onClick={() => setSport(s.id)}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>

        {/* Toggle de gênero */}
        <div className="ranking-controls-bar">
          <div className="gender-toggle-bar">
            <button
              className={`gender-toggle${genero === 'masculino' ? ' active' : ''}`}
              onClick={() => setGenero('masculino')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="3"/><path d="M12 8v13"/><path d="M9 19h6"/></svg>
              Masculino
            </button>
            <button
              className={`gender-toggle${genero === 'feminino' ? ' active' : ''}`}
              onClick={() => setGenero('feminino')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="5"/><path d="M12 13v8"/><path d="M9 18h6"/></svg>
              Feminino
            </button>
          </div>
          <div className="ranking-season-badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Temporada 2026
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="ranking-loading">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}><line x1="12" x2="12" y1="2" y2="6"/><line x1="12" x2="12" y1="18" y2="22"/><line x1="4.93" x2="7.76" y1="4.93" y2="7.76"/><line x1="16.24" x2="19.07" y1="16.24" y2="19.07"/><line x1="2" x2="6" y1="12" y2="12"/><line x1="18" x2="22" y1="12" y2="12"/><line x1="4.93" x2="7.76" y1="19.07" y2="16.24"/><line x1="16.24" x2="7.76" y1="7.76" y2="4.93"/></svg>
            Carregando ranking…
          </div>
        )}

        {/* Vazio */}
        {!loading && !entries.length && (
          <div className="ranking-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
            <p>Nenhum ranking disponível para esta categoria ainda.</p>
            <span>Em breve as duplas serão classificadas.</span>
          </div>
        )}

        {/* Conteúdo */}
        {!loading && entries.length > 0 && (
          <>
            {/* ── Pódio top 3 ── */}
            {top3.length >= 2 && (
              <div className="podium-visual">
                {podium.map(({ entry, place, height }) => entry && (
                  <div key={place} className={`podium-place podium-p${place}`}>
                    <div className="podium-crown">
                      {place === 1 && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="var(--gold)" stroke="none"><path d="M2 20h20v2H2zM20 7l-5 5-3-7-3 7-5-5v9h16z"/></svg>
                      )}
                    </div>
                    <div className="podium-avatar">
                      {initials(entry.nome).toUpperCase()}
                    </div>
                    <div className="podium-name">{entry.nome}</div>
                    {entry.clube && <div className="podium-club">{entry.clube}</div>}
                    <div className="podium-pts">{entry.pts} <span>pts</span></div>
                    <div className="podium-block" style={{ height }}>
                      <span className="podium-block-num">{place}º</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Tabela ── */}
            <div className="ranking-table-section">
              {/* Header */}
              <div className="ranking-header-bar">
                <div className="r-pos">Pos</div>
                <div>Dupla / Atleta</div>
                <div className="r-stat r-col-pts">Pts</div>
                <div className="r-stat r-col-pj">PJ</div>
                <div className="r-stat r-col-v">V</div>
                <div className="r-stat r-col-d">D</div>
              </div>

              {/* Rows */}
              {entries.map((e, i) => (
                <div key={e._id || i} className={`ranking-row ${rowClass(i)}`}>
                  <div className={`r-pos ${posClass(i)}`}>{i + 1}</div>
                  <div className="r-athlete">
                    <div className="r-avatar">{initials(e.nome).toUpperCase()}</div>
                    <div className="r-info">
                      <div className="r-name">{e.nome}</div>
                      {e.clube && <div className="r-club">{e.clube}</div>}
                    </div>
                  </div>
                  <div className="r-pts r-col-pts">{e.pts ?? 0}</div>
                  <div className="r-stat r-col-pj">{e.pj ?? '—'}</div>
                  <div className="r-win r-col-v">{e.v ?? '—'}</div>
                  <div className="r-loss r-col-d">{e.d ?? '—'}</div>
                </div>
              ))}
            </div>

            <div className="ranking-footer-note">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              Ranking atualizado pelo administrador da arena. PJ = partidas jogadas · V = vitórias · D = derrotas
            </div>
          </>
        )}
      </div>

      <Footer />
    </>
  );
}
