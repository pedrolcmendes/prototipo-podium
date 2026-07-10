import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import LogoutModal from '../components/LogoutModal';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import api from '../services/api';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const QUADRA_LABEL = {
  // IDs atuais
  'coberta-1': 'Quadra 1',
  'coberta-2': 'Quadra 2',
  'areia-1':   'Quadra 3',
  'areia-2':   'Quadra 4',
  'areia-3':   'Quadra 5',
  'PKB-DU':    'Pickleball',
  // IDs legados (formato antigo)
  'BT-1': 'Quadra 1',
  'BT-2': 'Quadra 2',
  'FV-1': 'Quadra 1',
  'FV-2': 'Quadra 2',
  'VB-1': 'Quadra 1',
  'VB-2': 'Quadra 2',
};
function quadraLabel(id) {
  if (!id) return 'Quadra';
  if (QUADRA_LABEL[id]) return QUADRA_LABEL[id];
  // Fallback: extrai número do final do ID (ex: 'bt-3' → 'Quadra 3')
  const m = id.match(/(\d+)$/);
  return m ? `Quadra ${m[1]}` : id;
}

function modColor(mod) {
  const m = (mod || '').toLowerCase().replace(/-/g, '');
  if (m.includes('beach') || m.includes('tennis')) return 'var(--gold)';
  if (m.includes('futev')) return 'var(--green)';
  if (m.includes('volei') || m.includes('vôlei')) return '#60a5fa';
  if (m.includes('pickle')) return '#c084fc';
  return 'var(--gold)';
}
function modSoft(mod) {
  const m = (mod || '').toLowerCase().replace(/-/g, '');
  if (m.includes('beach') || m.includes('tennis')) return 'rgba(224,172,107,.15)';
  if (m.includes('futev')) return 'rgba(34,197,94,.15)';
  if (m.includes('volei') || m.includes('vôlei')) return 'rgba(96,165,250,.15)';
  if (m.includes('pickle')) return 'rgba(192,132,252,.15)';
  return 'rgba(224,172,107,.15)';
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d.includes('T') ? d : d + 'T12:00:00');
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}

function fmtMoney(v) {
  return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function resolveStatus(r) {
  if (!r.date || r.status === 'cancelada') return r.status;
  if (new Date(r.date + 'T23:59:00') < new Date()) return 'concluida';
  return r.status;
}

function StatusBadge({ status }) {
  const map = { confirmada: 'Confirmada', pendente: 'Pendente', cancelada: 'Cancelada', concluida: 'Concluída' };
  return <span className={`status-badge ${status}`}>{map[status] || status}</span>;
}

const IcoHome = () => <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IcoCal = () => <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
const IcoTrophy = () => <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>;
const IcoBar = () => <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>;
const IcoWallet = () => <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>;
const IcoUser = () => <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcoTrash = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IcoBan = () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>;
const IcoLogout = () => <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>;
const IcoClock = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

function NavGroup({ label, children }) {
  return (
    <div className="pnav-group">
      <span className="pnav-label">{label}</span>
      {children}
    </div>
  );
}

function NavItem({ id, label, icon, activeTab, onSelect }) {
  return (
    <button
      className={`painel-nav-item${activeTab === id ? ' active' : ''}`}
      onClick={() => onSelect(id)}
    >
      {icon}{label}
    </button>
  );
}

export default function Painel() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [tab, setTab] = useState('inicio');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reservaFilter, setReservaFilter] = useState('proximas');

  // trava o scroll do fundo enquanto a sidebar mobile estiver aberta
  useBodyScrollLock(sidebarOpen);

  const [reservas, setReservas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [meuRanking, setMeuRanking] = useState([]);
  const [cancelId, setCancelId] = useState(null);
  const [cancelInfo, setCancelInfo] = useState('');
  const [cancelWindow, setCancelWindow] = useState(24);

  const [perfil, setPerfil] = useState({ nome: '', email: '', telefone: '', dataNascimento: '' });
  const [senhaData, setSenhaData] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    document.body.classList.add('painel-page');
    setPerfil({
      nome: user.nome || '',
      email: user.email || '',
      telefone: user.tel || '',
      dataNascimento: user.nasc || '',
    });
    loadData();
    return () => document.body.classList.remove('painel-page');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = () => {
    api.get('/bookings/me').then(r => setReservas(r.data.data || r.data || [])).catch(() => {});
    api.get('/events').then(r => setEventos(r.data.data || r.data || [])).catch(() => {});
    api.get('/users/me').then(r => updateUser(r.data.data || r.data)).catch(() => {});
    api.get('/settings').then(r => setCancelWindow((r.data.data || r.data)?.cancelWindow || 24)).catch(() => {});
    loadMeuRanking();
  };

  const loadMeuRanking = async () => {
    if (!user?._id) return;
    const combos = [
      ['beachtennis', 'masculino', 'Beach Tennis', 'Masculino'],
      ['beachtennis', 'feminino',  'Beach Tennis', 'Feminino'],
      ['futevolei',   'masculino', 'Futevôlei',    'Masculino'],
      ['futevolei',   'feminino',  'Futevôlei',    'Feminino'],
    ];
    const uid = user._id.toString();
    const posicoes = [];
    await Promise.all(combos.map(async ([esporte, genero, esporteLabel, generoLabel]) => {
      try {
        const { data } = await api.get(`/ranking?esporte=${esporte}&genero=${genero}`);
        const found = Array.isArray(data) ? data[0] : data;
        if (!found?.entries?.length) return;
        const idx = found.entries.findIndex(e =>
          e.userId?.toString() === uid || e.userId2?.toString() === uid
        );
        if (idx === -1) return;
        const entry = found.entries[idx];
        const start = Math.max(0, idx - 2);
        const end = Math.min(found.entries.length, idx + 3);
        const contextRows = found.entries.slice(start, end).map(e => ({
          ...e,
          isUser: e.userId?.toString() === uid || e.userId2?.toString() === uid,
        }));
        posicoes.push({ esporte: esporteLabel, genero: generoLabel, userEntry: entry, contextRows });
      } catch {}
    }));
    setMeuRanking(posicoes.sort((a, b) => a.userEntry.pos - b.userEntry.pos));
  };

  const initials = user?.nome
    ? user.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const proximas = reservas.filter(r => r.status !== 'cancelada' && r.date && new Date(r.date + 'T12:00:00') >= hoje);
  const anteriores = reservas.filter(r => r.date && new Date(r.date + 'T12:00:00') < hoje);
  const reservasFiltradas = reservaFilter === 'proximas' ? proximas
    : reservaFilter === 'anteriores' ? anteriores
    : reservas;
  const proximaReserva = [...proximas].sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  const extrato = [...reservas]
    .filter(r => r.total > 0)
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
    .map(r => ({
      id: r._id,
      tipo: r.status === 'cancelada' ? 'credito' : 'debito',
      desc: r.status === 'cancelada' ? `Estorno — ${r.modalidade || '—'}` : `Reserva — ${r.modalidade || '—'}`,
      data: r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-BR') : fmtDate(r.date),
      valor: r.total,
    }));

  const handleCancelar = async () => {
    if (!cancelId) return;
    try {
      const res = await api.patch(`/bookings/${cancelId}/cancelar`);
      const creditos = res.data?.creditosEstornados;
      const msg = creditos > 0
        ? `Reserva cancelada. ${fmtMoney(creditos)} creditados na sua carteira.`
        : 'Reserva cancelada.';
      toast(msg, 'success');
      setReservas(prev => prev.map(r => r._id === cancelId ? { ...r, status: 'cancelada' } : r));
      api.get('/users/me').then(r => updateUser(r.data.data || r.data)).catch(() => {});
    } catch (ex) {
      toast(ex.response?.data?.message || 'Erro ao cancelar', 'error');
    } finally {
      setCancelId(null);
    }
  };

  const handleSavePerfil = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/users/me', { nome: perfil.nome, tel: perfil.telefone, nasc: perfil.dataNascimento });
      updateUser(res.data.data || res.data);
      toast('Perfil atualizado!', 'success');
    } catch (ex) {
      toast(ex.response?.data?.message || 'Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSenha = async (e) => {
    e.preventDefault();
    if (senhaData.novaSenha !== senhaData.confirmar) { toast('Senhas não coincidem', 'error'); return; }
    if (senhaData.novaSenha.length < 6) { toast('Mínimo 6 caracteres', 'error'); return; }
    setSaving(true);
    try {
      await api.put('/users/me/password', { senhaAtual: senhaData.senhaAtual, novaSenha: senhaData.novaSenha });
      toast('Senha alterada!', 'success');
      setSenhaData({ senhaAtual: '', novaSenha: '', confirmar: '' });
    } catch (ex) {
      toast(ex.response?.data?.message || 'Erro ao alterar senha', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleNavSelect = (id) => { setTab(id); setSidebarOpen(false); };

  return (
    <>
      {/* TOPBAR */}
      <header className="painel-topbar">
        <Link to="/" className="painel-topbar-logo">
          <img src="/img/logo.png" alt="Podium Arena" />
          <span>PODIUM ARENA</span>
        </Link>

        <div className="painel-topbar-right">
          <button className="ptopbar-wallet" onClick={() => handleNavSelect('carteira')}>
            <IcoWallet />
            <span>{fmtMoney(user?.creditos)}</span>
          </button>
          <div className="painel-topbar-user">
            <div className="painel-topbar-avatar">{initials}</div>
            <div className="painel-topbar-info">
              <span className="painel-topbar-name">{user?.nome?.split(' ')[0]}</span>
              <span className="painel-topbar-badge">Membro Arena</span>
            </div>
          </div>
          <button className="ptopbar-logout-btn" onClick={() => setLogoutOpen(true)} title="Sair">
            <IcoLogout />
          </button>
        </div>

        <button
          className={`painel-topbar-hamburger${sidebarOpen ? ' open' : ''}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <span /><span /><span />
        </button>
      </header>

      <div className="painel-layout">
        {/* SIDEBAR */}
        <aside className={`painel-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="painel-user-card">
            <div
              className="painel-avatar"
              onClick={() => handleNavSelect('perfil')}
              title="Editar perfil"
              style={{ cursor: 'pointer' }}
            >
              {initials}
              <div className="painel-avatar-edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              </div>
            </div>
            <div className="painel-name">{user?.nome}</div>
            <div className="painel-email">{user?.email}</div>
            <span className="painel-member-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="rgba(197,160,40,.3)" stroke="#C5A028" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Membro Arena
            </span>
          </div>

          <nav className="painel-nav">
            <NavGroup label="Principal">
              <NavItem id="inicio" label="Início" icon={<IcoHome />} activeTab={tab} onSelect={handleNavSelect} />
            </NavGroup>
            <NavGroup label="Jogar">
              <NavItem id="reservas" label="Minhas Reservas" icon={<IcoCal />} activeTab={tab} onSelect={handleNavSelect} />
            </NavGroup>
            <NavGroup label="Comunidade">
              <NavItem id="eventos" label="Eventos" icon={<IcoTrophy />} activeTab={tab} onSelect={handleNavSelect} />
              <NavItem id="ranking" label="Ranking" icon={<IcoBar />} activeTab={tab} onSelect={handleNavSelect} />
            </NavGroup>
            <NavGroup label="Conta">
              <NavItem id="carteira" label="Carteira" icon={<IcoWallet />} activeTab={tab} onSelect={handleNavSelect} />
              <NavItem id="perfil" label="Perfil" icon={<IcoUser />} activeTab={tab} onSelect={handleNavSelect} />
            </NavGroup>
          </nav>

          <div className="painel-sidebar-logout">
            <Link to="/" className="painel-sidebar-link">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Ver site
            </Link>
            <button onClick={() => setLogoutOpen(true)}>
              <IcoLogout />
              Sair da Conta
            </button>
          </div>
        </aside>

        {sidebarOpen && <div className="painel-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* CONTENT */}
        <main className="painel-content">

          {/* ── INÍCIO ── */}
          {tab === 'inicio' && (
            <section className="painel-section active">
              <div className="painel-section-header">
                <div>
                  <p className="painel-eyebrow">Bem-vindo de volta</p>
                  <h2 className="painel-section-title-h2">{user?.nome?.split(' ')[0]?.toUpperCase()}'S PAINEL</h2>
                </div>
                <Link to="/reservas" className="btn-gold-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  Nova Reserva
                </Link>
              </div>

              {/* KPI grid */}
              <div className="stats-grid stats-4">
                <div className="stat-card stat-card-credit" onClick={() => handleNavSelect('carteira')} style={{ cursor: 'pointer' }}>
                  <IcoWallet />
                  <div className="stat-value">{fmtMoney(user?.creditos)}</div>
                  <div className="stat-label">Saldo Carteira</div>
                </div>
                <div className="stat-card">
                  <IcoCal />
                  <div className="stat-value">{proximaReserva ? fmtDate(proximaReserva.date) : '—'}</div>
                  <div className="stat-label">Próxima Reserva</div>
                </div>
                <div className="stat-card">
                  <IcoClock />
                  <div className="stat-value">{proximas.length}</div>
                  <div className="stat-label">Reservas Ativas</div>
                </div>
                <div className="stat-card">
                  <IcoBar />
                  <div className="stat-value">{meuRanking.length > 0 ? `${meuRanking[0].userEntry.pos}º` : '—'}</div>
                  <div className="stat-label">Melhor Ranking</div>
                </div>
              </div>

              {/* Próxima partida hero */}
              {proximaReserva && (() => {
                const dt = new Date(proximaReserva.date + 'T12:00:00');
                const DIAS_S = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
                const diffDias = Math.round((dt - hoje) / 86400000);
                const diasLabel = diffDias === 0 ? 'Hoje' : diffDias === 1 ? 'Amanhã' : `Em ${diffDias} dias`;
                const slots = (proximaReserva.slots || []).slice().sort((a, b) => a - b);
                const modalidade = (proximaReserva.modalidade || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                return (
                  <div className="prox-hero">
                    <div className="prox-hero-glow" />
                    <div className="prox-hero-date">
                      <div className="prox-hero-day">{String(dt.getDate()).padStart(2, '0')}</div>
                      <div className="prox-hero-month">{MESES[dt.getMonth()]}</div>
                      <div className="prox-hero-dow">{DIAS_S[dt.getDay()]}</div>
                    </div>
                    <div className="prox-hero-info">
                      <div className="prox-hero-eyebrow">Próxima Partida</div>
                      <div className="prox-hero-title">{modalidade}</div>
                      <div className="prox-hero-meta">
                        <span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                          {quadraLabel(proximaReserva.quadraId)}
                        </span>
                        {slots.length > 0 && (
                          <span>
                            <IcoClock />
                            {slots.map(h => `${String(h).padStart(2,'0')}h`).join(' · ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="prox-hero-right">
                      <div className="prox-hero-dias">{diasLabel}</div>
                      <StatusBadge status={resolveStatus(proximaReserva)} />
                    </div>
                  </div>
                );
              })()}

              {/* Últimas reservas */}
              {reservas.length > 0 && (
                <div className="painel-card">
                  <div className="painel-card-header">
                    <h3>Últimas Reservas</h3>
                    <button onClick={() => handleNavSelect('reservas')}>Ver todas →</button>
                  </div>
                  {[...reservas].slice(0, 4).map(r => {
                    const dt = r.date ? new Date(r.date + 'T12:00:00') : null;
                    return (
                      <div key={r._id} className={`booking-item ${resolveStatus(r)}`}>
                        <div className="booking-date-block">
                          <div className="booking-day">{dt ? String(dt.getDate()).padStart(2,'0') : '—'}</div>
                          <div className="booking-month">{dt ? MESES[dt.getMonth()] : '—'}</div>
                        </div>
                        <div>
                          <div className="booking-info-name">{quadraLabel(r.quadraId)} · {(r.modalidade || '—').replace(/-/g,' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                          <div className="booking-info-meta">
                            {r.slots?.sort((a, b) => a - b).map(h => `${String(h).padStart(2,'0')}h`).join(' · ') || '—'}
                          </div>
                        </div>
                        <div className="booking-actions">
                          <StatusBadge status={resolveStatus(r)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ── RESERVAS ── */}
          {tab === 'reservas' && (
            <section className="painel-section active">
              <div className="painel-section-header">
                <div>
                  <p className="painel-eyebrow">Minhas</p>
                  <h2 className="painel-section-title-h2">RESERVAS</h2>
                </div>
                <Link to="/reservas" className="btn-gold-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  Nova Reserva
                </Link>
              </div>

              {/* Filtro segmentado */}
              <div className="res-seg">
                {[
                  { key: 'proximas',   label: 'Próximas',   count: proximas.length },
                  { key: 'anteriores', label: 'Anteriores', count: anteriores.length },
                  { key: 'todas',      label: 'Todas',      count: reservas.length },
                ].map(f => (
                  <button
                    key={f.key}
                    className={`res-seg-btn${reservaFilter === f.key ? ' active' : ''}`}
                    onClick={() => setReservaFilter(f.key)}
                  >
                    {f.label}
                    <span className="res-seg-count">{f.count}</span>
                  </button>
                ))}
              </div>

              {/* Lista de cards */}
              {reservasFiltradas.length === 0 ? (
                <div className="res-empty">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>
                  <div className="res-empty-title">Nenhuma reserva</div>
                  <div className="res-empty-sub">Você não tem reservas {reservaFilter === 'proximas' ? 'próximas' : reservaFilter === 'anteriores' ? 'anteriores' : ''}.</div>
                  {reservaFilter !== 'anteriores' && <Link to="/reservas" className="btn-gold-sm" style={{ marginTop: '1rem' }}>Reservar Quadra</Link>}
                </div>
              ) : (
                <div className="res-list">
                  {reservasFiltradas.map(r => {
                    const dt = r.date ? new Date(r.date + 'T12:00:00') : null;
                    const displaySt = resolveStatus(r);
                    const podeCancel = displaySt !== 'cancelada' && displaySt !== 'concluida';
                    const slots = r.slots?.slice().sort((a, b) => a - b) || [];
                    const horaInicio = slots.length > 0 ? `${String(slots[0]).padStart(2,'0')}:00` : '—';
                    const horaFim   = slots.length > 0 ? `${String(slots[slots.length-1]+1).padStart(2,'0')}:00` : '';
                    const horaRange = horaFim ? `${horaInicio} – ${horaFim}` : horaInicio;
                    const dataLabel = dt ? `${DIAS_SEMANA[dt.getDay()]}, ${dt.getDate()} ${MESES[dt.getMonth()]}` : '—';
                    const mc = modColor(r.modalidade);
                    const ms = modSoft(r.modalidade);
                    const statusLabel = { confirmada: 'Confirmada', pendente: 'Pendente', cancelada: 'Cancelada', concluida: 'Concluída' }[displaySt] || displaySt;
                    return (
                      <div key={r._id} className="res-card">
                        {/* Ícone de modalidade */}
                        <div className="res-card-icon" style={{ background: ms, color: mc }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20"/></svg>
                        </div>

                        {/* Info */}
                        <div className="res-card-info">
                          <div className="res-card-title">
                            {quadraLabel(r.quadraId)} · {(r.modalidade || '—').replace(/-/g,' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          <div className="res-card-meta">
                            <span>
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
                              {dataLabel}
                            </span>
                            <span>
                              <IcoClock />
                              {horaRange}
                            </span>
                            {r.total > 0 && <span>{fmtMoney(r.total)}</span>}
                          </div>
                        </div>

                        {/* Status + cancelar */}
                        <div className="res-card-actions">
                          <span className={`res-status-pill ${displaySt}`}>{statusLabel}</span>
                          {podeCancel && (
                            <button
                              className="res-cancel-btn"
                              title="Cancelar reserva"
                              onClick={() => {
                                const firstSlot = r.slots?.length > 0 ? Math.min(...r.slots) : 8;
                                const bookingDateTime = new Date(`${r.date}T${String(firstSlot).padStart(2,'0')}:00:00`);
                                const horasAte = (bookingDateTime.getTime() - Date.now()) / 3600000;
                                if (horasAte < cancelWindow) {
                                  toast(`Cancelamento não permitido. É necessário cancelar com pelo menos ${cancelWindow}h de antecedência.`, 'error');
                                  return;
                                }
                                setCancelId(r._id);
                                setCancelInfo(`${r.modalidade} — ${fmtDate(r.date)}`);
                              }}
                            >
                              <IcoBan />
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ── EVENTOS ── */}
          {tab === 'eventos' && (
            <section className="painel-section active">
              <div className="painel-section-header">
                <div>
                  <p className="painel-eyebrow">Calendário</p>
                  <h2 className="painel-section-title-h2">EVENTOS</h2>
                </div>
                <Link to="/eventos" className="btn-ghost">Ver todos →</Link>
              </div>

              {eventos.length === 0 ? (
                <div className="painel-card">
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                    </div>
                    <h4>Nenhum evento</h4>
                    <p>Não há eventos disponíveis no momento.</p>
                  </div>
                </div>
              ) : (
                <div className="eventos-grid">
                  {eventos.map(ev => {
                    const dt = ev.data ? new Date(ev.data.includes('T') ? ev.data : ev.data + 'T12:00:00') : null;
                    return (
                      <div key={ev._id} className="evento-card">
                        {ev.imagem && (
                          <div className="evento-card-img">
                            <img src={ev.imagem} alt={ev.nome} />
                          </div>
                        )}
                        <div className="evento-card-body">
                          <div className="evento-card-top">
                            {dt && (
                              <div className="evento-card-date">
                                <span className="evento-card-day">{String(dt.getDate()).padStart(2,'0')}</span>
                                <span className="evento-card-month">{MESES[dt.getMonth()]}</span>
                              </div>
                            )}
                            <span className="evento-card-tag">{ev.modalidade || ev.tipo || 'Evento'}</span>
                          </div>
                          <div className="evento-card-name">{ev.nome}</div>
                          {ev.local && <div className="evento-card-local">{ev.local}</div>}
                          {ev.preco > 0 && <div className="evento-card-price">{fmtMoney(ev.preco)}</div>}
                          <Link to="/eventos" className="btn-gold-sm" style={{ marginTop: 'auto', paddingTop: '.75rem', display: 'inline-flex' }}>
                            Ver detalhes
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ── RANKING ── */}
          {tab === 'ranking' && (
            <section className="painel-section active">
              <div className="painel-section-header">
                <div>
                  <p className="painel-eyebrow">Classificação</p>
                  <h2 className="painel-section-title-h2">MEU RANKING</h2>
                </div>
                <Link to="/ranking" className="btn-ghost">Ver Ranking Completo →</Link>
              </div>

              {meuRanking.length === 0 ? (
                <div className="painel-empty">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
                  <p>Sem ranking</p>
                  <span>Você ainda não aparece em nenhum ranking. O administrador da arena irá adicioná-lo após suas primeiras partidas.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {meuRanking.map((r, i) => (
                    <div key={i} className="painel-card">
                      <div className="painel-card-header">
                        <h3>{r.esporte} · {r.genero}</h3>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--gold)' }}>
                          {r.userEntry.pos}º lugar
                        </span>
                      </div>
                      <div className="ranking-mini">
                        {r.contextRows.map((row, j) => {
                          const posClass = row.pos === 1 ? ' gold' : row.pos === 2 ? ' silver' : row.pos === 3 ? ' bronze' : '';
                          return (
                            <div key={j} className={`ranking-mini-row${row.isUser ? ' highlight' : ''}`}>
                              <div className={`ranking-mini-pos${posClass}`}>{row.pos}º</div>
                              <div>
                                <div className="ranking-mini-name">{row.nome || '—'}</div>
                                {row.isUser && <span className="ranking-mini-you">Você</span>}
                              </div>
                              <div className="ranking-mini-pts">{row.pts ?? 0}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── CARTEIRA ── */}
          {tab === 'carteira' && (
            <section className="painel-section active">
              <div className="painel-section-header">
                <div>
                  <p className="painel-eyebrow">Minha</p>
                  <h2 className="painel-section-title-h2">CARTEIRA</h2>
                </div>
              </div>

              <div className="carteira-grid">
                {/* Esquerda: cartão físico */}
                <div className="wallet-card">
                  <div className="wallet-card-deco1" />
                  <div className="wallet-card-deco2" />
                  <div className="wallet-card-top">
                    <div className="wallet-card-brand">
                      <img src="/img/logo.png" alt="Podium" />
                      <span>PODIUM ARENA</span>
                    </div>
                    <IcoWallet />
                  </div>
                  <div className="wallet-card-balance-label">Saldo disponível</div>
                  <div className="wallet-card-balance">{fmtMoney(user?.creditos)}</div>
                  <div className="wallet-card-footer">
                    <div>
                      <div className="wallet-card-footer-label">Titular</div>
                      <div className="wallet-card-footer-value">{user?.nome?.toUpperCase()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="wallet-card-footer-label">Tipo</div>
                      <div className="wallet-card-footer-value">ARENA CREDITS</div>
                    </div>
                  </div>
                </div>

                {/* Direita: extrato */}
                <div className="painel-card" style={{ marginBottom: 0 }}>
                  <div className="painel-card-header">
                    <h3>Extrato</h3>
                    <span style={{ fontFamily: 'var(--font-cond)', fontSize: '.72rem', letterSpacing: '2px', color: 'var(--gray)', textTransform: 'uppercase' }}>
                      {extrato.length} transaç{extrato.length !== 1 ? 'ões' : 'ão'}
                    </span>
                  </div>
                  {extrato.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                      </div>
                      <h4>Sem movimentações</h4>
                      <p>Nenhuma transação encontrada.</p>
                    </div>
                  ) : (
                    <div className="extrato-scroll">
                      {extrato.map(t => (
                        <div key={t.id} className="extrato-item">
                          <div className={`extrato-dot ${t.tipo}`} />
                          <div className="extrato-info">
                            <div className="extrato-desc">{t.desc}</div>
                            <div className="extrato-date">{t.data}</div>
                          </div>
                          <div className={`extrato-valor ${t.tipo}`}>
                            {t.tipo === 'credito' ? '+' : '-'}{fmtMoney(t.valor)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── PERFIL ── */}
          {tab === 'perfil' && (
            <section className="painel-section active">
              <div className="painel-section-header">
                <div>
                  <p className="painel-eyebrow">Minha Conta</p>
                  <h2 className="painel-section-title-h2">PERFIL</h2>
                </div>
              </div>

              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem 1.8rem', display: 'flex', alignItems: 'center', gap: '1.4rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
                <div className="painel-avatar" style={{ width: 68, height: 68, fontSize: '1.5rem', flexShrink: 0, cursor: 'default' }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-cond)', fontSize: '1.15rem', color: 'var(--white)', fontWeight: 700, letterSpacing: '1px' }}>{user?.nome}</div>
                  <div style={{ fontSize: '.83rem', color: 'var(--gray)', marginTop: '.2rem' }}>{user?.email}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginTop: '.55rem', flexWrap: 'wrap' }}>
                    <span className="painel-member-badge">
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="rgba(197,160,40,.3)" stroke="#C5A028" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      Membro Arena
                    </span>
                    {user?.googleId && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', fontFamily: 'var(--font-cond)', fontSize: '.68rem', letterSpacing: '1.5px', color: 'var(--gray)', background: 'var(--dark)', border: '1px solid var(--border)', borderRadius: 20, padding: '.2rem .6rem' }}>
                        <svg viewBox="0 0 24 24" fill="none" width="11" height="11"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        Conta Google
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <form className="profile-form" style={{ borderRadius: 14, overflow: 'hidden', marginBottom: '1.2rem' }} onSubmit={handleSavePerfil}>
                <div className="profile-form-section">
                  <h3>Dados Pessoais</h3>
                  <div className="profile-grid" style={{ marginTop: '1.2rem' }}>
                    <div className="field">
                      <label>Nome completo</label>
                      <input type="text" placeholder="Seu nome" value={perfil.nome} onChange={e => setPerfil({ ...perfil, nome: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>E-mail</label>
                      <input type="email" value={perfil.email} disabled style={{ opacity: .45, cursor: 'not-allowed' }} />
                    </div>
                    <div className="field">
                      <label>Telefone</label>
                      <input type="tel" placeholder="(43) 9 9000-0000" value={perfil.telefone} onChange={e => setPerfil({ ...perfil, telefone: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Data de Nascimento</label>
                      <input type="date" value={perfil.dataNascimento} onChange={e => setPerfil({ ...perfil, dataNascimento: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="profile-save" style={{ padding: '1rem 1.8rem', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '.78rem', color: 'var(--gray)' }}>E-mail não pode ser alterado</span>
                  <button type="submit" className="btn-gold" disabled={saving}>{saving ? 'Salvando…' : 'Salvar Alterações'}</button>
                </div>
              </form>

              {user?.googleId ? (
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.4rem 1.8rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gray)" strokeWidth="1.5" strokeLinecap="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <div>
                    <div style={{ fontFamily: 'var(--font-cond)', fontSize: '.82rem', color: 'var(--gray-light)', letterSpacing: '1px' }}>Senha não configurada</div>
                    <div style={{ fontSize: '.76rem', color: 'var(--gray)', marginTop: '.2rem' }}>Sua conta foi criada via Google. O acesso é feito pelo botão "Continuar com Google".</div>
                  </div>
                </div>
              ) : (
                <form className="profile-form" style={{ borderRadius: 14, overflow: 'hidden' }} onSubmit={handleSaveSenha}>
                  <div className="profile-form-section">
                    <h3>Alterar Senha</h3>
                    <div className="profile-grid" style={{ marginTop: '1.2rem' }}>
                      <div className="field" style={{ gridColumn: '1 / -1' }}>
                        <label>Senha atual</label>
                        <input type="password" placeholder="••••••••" value={senhaData.senhaAtual} onChange={e => setSenhaData({ ...senhaData, senhaAtual: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Nova senha</label>
                        <input type="password" placeholder="Mín. 6 caracteres" value={senhaData.novaSenha} onChange={e => setSenhaData({ ...senhaData, novaSenha: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Confirmar nova senha</label>
                        <input type="password" placeholder="Repetir senha" value={senhaData.confirmar} onChange={e => setSenhaData({ ...senhaData, confirmar: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <div className="profile-save" style={{ padding: '1rem 1.8rem', borderTop: '1px solid var(--border)' }}>
                    <button type="submit" className="btn-outline" disabled={saving}>{saving ? 'Salvando…' : 'Alterar Senha'}</button>
                  </div>
                </form>
              )}
            </section>
          )}

        </main>
      </div>

      {/* BOTTOM TABS MOBILE — escondidas enquanto a sidebar está aberta */}
      <div className={`painel-bottom-tabs${sidebarOpen ? ' drawer-open' : ''}`}>
        {[
          { id: 'inicio',   label: 'Início',   icon: <IcoHome /> },
          { id: 'reservas', label: 'Reservas',  icon: <IcoCal /> },
          { id: 'eventos',  label: 'Eventos',   icon: <IcoTrophy /> },
          { id: 'ranking',  label: 'Ranking',   icon: <IcoBar /> },
          { id: 'perfil',   label: 'Perfil',    icon: <IcoUser /> },
        ].map(t => (
          <button key={t.id} className={`painel-bottom-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* MODAL CANCELAR */}
      {cancelId && (
        <div className="cancel-modal-overlay">
          <div className="cancel-modal">
            <div className="cancel-icon-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <h3 className="cancel-modal-title">Cancelar Reserva?</h3>
            <p className="cancel-modal-sub">O valor pago será creditado na sua carteira Podium — não é devolvido ao banco.</p>
            <div className="cancel-modal-info-box"><span>{cancelInfo}</span></div>
            <div className="cancel-modal-actions">
              <button className="cancel-modal-btn-keep" onClick={() => setCancelId(null)}>Manter Reserva</button>
              <button className="cancel-modal-btn-confirm" onClick={handleCancelar}>Sim, Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {logoutOpen && <LogoutModal onClose={() => setLogoutOpen(false)} />}
    </>
  );
}
