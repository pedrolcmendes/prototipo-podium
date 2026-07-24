import { useEffect, useState } from 'react';
import api from '../services/api';
import Footer from '../components/Footer';
import useLive from '../hooks/useLive';

const SPORTS = [{ id: 'beachtennis', label: 'Beach Tennis' }, { id: 'futevolei', label: 'Futevôlei' }];
const CATEGORIAS = [{ id: 'masculino', label: 'Masculino' }, { id: 'feminino', label: 'Feminino' }, { id: 'misto', label: 'Misto' }];
const niveis = ['A', 'B', 'C', 'D'];
const anos = [2026, 2027, 2028];

function initials(nome) { return nome?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?'; }

export default function Ranking() {
  const [sport, setSport] = useState('beachtennis');
  const [categoria, setCategoria] = useState('masculino');
  const [nivel, setNivel] = useState('A');
  const [ano, setAno] = useState(2026);
  const [semestre, setSemestre] = useState(1);
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true); setRanking(null);
    api.get(`/ranking?esporte=${sport}&genero=${categoria}&nivel=${nivel}&ano=${ano}&semestre=${semestre}`)
      .then(({ data }) => setRanking(Array.isArray(data) ? data[0] : data))
      .catch(() => setRanking(null)).finally(() => setLoading(false));
  }, [sport, categoria, nivel, ano, semestre]);

  // tempo real: admin salvou o ranking → tabela atualiza sozinha
  useLive(['ranking'], () => {
    api.get(`/ranking?esporte=${sport}&genero=${genero}`)
      .then(r => {
        const list = r.data.data || r.data;
        setRanking(Array.isArray(list) ? list[0] : list);
      })
      .catch(() => {});
  });

  const entries = ranking?.entries || [];
  const etapas = ranking?.etapas || [];
  return <>
    <div className="ranking-hero"><div className="ranking-hero-inner">
      <p className="section-eyebrow">Podium Arena · Telêmaco Borba</p><h1 className="ranking-hero-title">RANKING <span className="ranking-hero-accent">OFICIAL</span></h1>
      <p className="ranking-hero-sub">Ranking individual: os pontos de cada etapa formam o total do semestre.</p>
    </div></div>
    <main className="ranking-page-wrap">
      <div className="ranking-tabs-nav">{SPORTS.map(item => <button key={item.id} className={`ranking-tab${sport === item.id ? ' active' : ''}`} onClick={() => setSport(item.id)}>{item.label}</button>)}</div>
      <div className="ranking-filters">
        <select value={categoria} onChange={e => setCategoria(e.target.value)} aria-label="Categoria">{CATEGORIAS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        <select value={nivel} onChange={e => setNivel(e.target.value)} aria-label="Nível">{niveis.map(item => <option key={item}>Nível {item}</option>)}</select>
        <select value={ano} onChange={e => setAno(Number(e.target.value))} aria-label="Ano">{anos.map(item => <option key={item}>{item}</option>)}</select>
        <select value={semestre} onChange={e => setSemestre(Number(e.target.value))} aria-label="Semestre"><option value={1}>1º semestre</option><option value={2}>2º semestre</option></select>
      </div>
      {loading ? <div className="ranking-loading">Carregando ranking…</div> : !entries.length ? <div className="ranking-empty"><p>Nenhum ranking disponível para estes filtros.</p><span>O ranking será publicado após as etapas.</span></div> : <>
        <div className="ranking-summary"><strong>{CATEGORIAS.find(c => c.id === categoria)?.label} · Nível {nivel}</strong><span>{semestre}º semestre de {ano} · {entries.length} atleta{entries.length !== 1 ? 's' : ''}</span></div>
        <div className="ranking-table-scroll"><div className="ranking-table-section ranking-stages-table">
          <div className="ranking-header-bar" style={{ gridTemplateColumns: `56px minmax(190px, 1fr) repeat(${etapas.length}, 90px) 90px` }}><div className="r-pos">Pos</div><div>Atleta</div>{etapas.map((etapa, i) => <div className="r-stat" key={i}>{etapa}</div>)}<div className="r-stat">Total</div></div>
          {entries.map((entry, index) => <div className={`ranking-row ${index < 3 ? `top-${index + 1}` : ''}`} key={entry._id || entry.userId || index} style={{ gridTemplateColumns: `56px minmax(190px, 1fr) repeat(${etapas.length}, 90px) 90px` }}>
            <div className={`r-pos ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''}`}>{entry.pos || index + 1}</div><div className="r-athlete"><div className="r-avatar">{initials(entry.nome)}</div><div className="r-info"><div className="r-name">{entry.nome}</div>{entry.clube && <div className="r-club">{entry.clube}</div>}</div></div>{etapas.map((_, etapaIndex) => <div className="r-stat" key={etapaIndex}>{entry.pontosPorEtapa?.[etapaIndex] || 0}</div>)}<div className="r-pts">{entry.pts || 0}</div>
          </div>)}
        </div></div>
        <p className="ranking-footer-note">Os pontos de cada etapa são somados automaticamente no total do atleta.</p>
      </>}
    </main><Footer />
  </>;
}
