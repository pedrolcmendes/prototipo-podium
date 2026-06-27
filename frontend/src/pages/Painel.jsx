import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import LogoutModal from '../components/LogoutModal';
import api from '../services/api';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d.includes('T') ? d : d + 'T12:00:00');
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}

function StatusBadge({ status }) {
  const label = { confirmada: 'Confirmada', pendente: 'Pendente', cancelada: 'Cancelada', concluida: 'Concluída' }[status] || status;
  return <span className={`status-badge ${status}`}>{label}</span>;
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

  const [tab, setTab] = useState('dashboard');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [reservas, setReservas] = useState([]);
  const [inscricoes, setInscricoes] = useState([]);
  const [meuRanking, setMeuRanking] = useState([]);
  const [cancelId, setCancelId] = useState(null);
  const [cancelInfo, setCancelInfo] = useState('');

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
  }, [user]);

  const loadData = () => {
    api.get('/bookings/me').then(r => setReservas(r.data.data || r.data || [])).catch(() => {});
    api.get('/registrations/me').then(r => setInscricoes(r.data.data || r.data || [])).catch(() => {});
    api.get('/users/me').then(r => updateUser(r.data.data || r.data)).catch(() => {});
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
        const entry = found.entries.find(e =>
          e.userId?.toString() === uid || e.userId2?.toString() === uid
        );
        if (entry) posicoes.push({ esporte: esporteLabel, genero: generoLabel, ...entry });
      } catch {}
    }));
    setMeuRanking(posicoes.sort((a, b) => a.pos - b.pos));
  };

  const initials = user?.nome ? user.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?';
  const proximas = reservas.filter(r => r.status !== 'cancelada' && r.date && new Date(r.date + 'T12:00:00') >= new Date());
  const concluidas = reservas.filter(r => r.date && new Date(r.date + 'T12:00:00') < new Date());
  const fmtCredito = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const handleCancelar = async () => {
    if (!cancelId) return;
    try {
      await api.patch(`/bookings/${cancelId}/cancelar`);
      toast('Reserva cancelada', 'success');
      setReservas(prev => prev.map(r => r._id === cancelId ? { ...r, status: 'cancelada' } : r));
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
        <Link to="/" className="painel-topbar-back">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          <span>Voltar ao site</span>
        </Link>
        <Link to="/" className="painel-topbar-logo">
          <img src="/img/logo.png" alt="Podium Arena" />
          <span>PODIUM ARENA</span>
        </Link>
        <div className="painel-topbar-right">
          <div className="painel-topbar-user">
            <div className="painel-topbar-avatar">{initials}</div>
            <div className="painel-topbar-info">
              <span className="painel-topbar-name">{user?.nome?.split(' ')[0]}</span>
              <span className="painel-topbar-badge">Membro Arena</span>
            </div>
          </div>
          <button className="painel-topbar-logout" onClick={() => setLogoutOpen(true)} title="Sair da conta">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            <span>Sair</span>
          </button>
        </div>
        <button className={`painel-topbar-hamburger${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <span /><span /><span />
        </button>
      </header>

      <div className="painel-layout">
        {/* SIDEBAR */}
        <aside className={`painel-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="painel-user-card">
            <div className="painel-avatar">
              {initials}
              <div className="painel-avatar-edit" onClick={() => { setTab('perfil'); setSidebarOpen(false); }} title="Editar perfil">
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
            <NavItem id="dashboard" label="Dashboard" activeTab={tab} onSelect={handleNavSelect} icon={<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>} />
            <NavItem id="reservas" label="Reservas" activeTab={tab} onSelect={handleNavSelect} icon={<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>} />
            <NavItem id="inscricoes" label="Inscrições" activeTab={tab} onSelect={handleNavSelect} icon={<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>} />
            <NavItem id="ranking" label="Ranking" activeTab={tab} onSelect={handleNavSelect} icon={<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>} />
            <NavItem id="perfil" label="Perfil" activeTab={tab} onSelect={handleNavSelect} icon={<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>} />
          </nav>

          <div className="painel-sidebar-links">
            <Link to="/reservas" className="painel-sidebar-link">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Nova Reserva
            </Link>
            <Link to="/eventos" className="painel-sidebar-link">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
              Ver Eventos
            </Link>
            <a href="https://wa.me/5543999999999" target="_blank" rel="noreferrer" className="painel-sidebar-link">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
              WhatsApp
            </a>
          </div>

          <div className="painel-sidebar-logout">
            <button onClick={() => setLogoutOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
              Sair da Conta
            </button>
          </div>
        </aside>

        {sidebarOpen && <div className="painel-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* CONTEÚDO */}
        <main className="painel-content">

          {/* ── DASHBOARD ── */}
          {tab === 'dashboard' && (
            <section className="painel-section active">
              <div className="painel-section-header">
                <div>
                  <p className="painel-eyebrow">Bem-vindo de volta</p>
                  <h2 className="painel-section-title-h2">{user?.nome?.split(' ')[0].toUpperCase()}'S PAINEL</h2>
                </div>
                <Link to="/reservas" className="btn-gold-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  Nova Reserva
                </Link>
              </div>

              <div className="stats-grid stats-5">
                {[
                  { icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>, val: reservas.length, label: 'Total Reservas' },
                  { icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, val: proximas.length, label: 'Próximas' },
                  { icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>, val: inscricoes.length, label: 'Eventos' },
                  { icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, val: concluidas.length, label: 'Concluídas' },
                  { icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>, val: fmtCredito(user?.creditos), label: 'Crédito em Carteira', credit: true },
                ].map((s, i) => (
                  <div key={i} className={`stat-card${s.credit ? ' stat-card-credit' : ''}`}>
                    {s.icon}
                    <div className="stat-value">{s.val}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="quick-actions">
                <Link to="/reservas" className="quick-action-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M12 8v4l2 2"/></svg>
                  <span>Reservar Quadra</span>
                </Link>
                <Link to="/eventos" className="quick-action-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                  <span>Ver Eventos</span>
                </Link>
                <Link to="/ranking" className="quick-action-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
                  <span>Ranking</span>
                </Link>
              </div>

              {proximas.length > 0 && (
                <div className="proxima-reserva-banner">
                  <div className="prb-label">Próxima Reserva</div>
                  <div className="prb-content">
                    <div className="prb-date">{fmtDate(proximas[0].date)}</div>
                    <div className="prb-info">{proximas[0].modalidade} · {proximas[0].quadraId || proximas[0].quadra} · {proximas[0].slots?.sort((a,b)=>a-b).map(h=>`${String(h).padStart(2,'0')}h`).join(', ')}</div>
                  </div>
                  <StatusBadge status={proximas[0].status} />
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

              <div className="painel-card">
                <div className="painel-card-header">
                  <h3>Histórico de Reservas</h3>
                  <span style={{ fontFamily: 'var(--font-cond)', fontSize: '.72rem', letterSpacing: '2px', color: 'var(--gray)', textTransform: 'uppercase' }}>{reservas.length} reserva{reservas.length !== 1 ? 's' : ''}</span>
                </div>

                {reservas.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    </div>
                    <h4>Nenhuma reserva</h4>
                    <p>Você ainda não fez nenhuma reserva.</p>
                    <Link to="/reservas" className="btn-gold">Reservar Quadra</Link>
                  </div>
                ) : (
                  reservas.map(r => {
                    const dateStr = r.date || '';
                    const dt = dateStr ? new Date(dateStr + 'T12:00:00') : null;
                    const podeCancel = r.status !== 'cancelada' && dt && dt >= new Date();
                    const horariosStr = r.slots?.sort((a, b) => a - b).map(h => `${String(h).padStart(2, '0')}h`).join(' · ') || '—';
                    return (
                      <div key={r._id} className={`booking-item ${r.status}`}>
                        <div className="booking-date-block">
                          <div className="booking-day">{dt ? String(dt.getDate()).padStart(2, '0') : '—'}</div>
                          <div className="booking-month">{dt ? MESES[dt.getMonth()] : '—'}</div>
                        </div>
                        <div>
                          <div className="booking-info-name">{(r.modalidade || '—').toUpperCase()} · {r.quadraId || r.quadra || '—'}</div>
                          <div className="booking-info-meta">
                            <span className="booking-meta-item">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                              {horariosStr}
                            </span>
                            <span className="booking-meta-item">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                              {r.payment || '—'}
                            </span>
                            {r.total > 0 && (
                              <span className="booking-meta-item">
                                R$ {Number(r.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="booking-actions">
                          <StatusBadge status={r.status} />
                          {podeCancel && (
                            <button className="btn-cancel" onClick={() => { setCancelId(r._id); setCancelInfo(`${r.modalidade} — ${fmtDate(dateStr)}`); }}>
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {/* ── INSCRIÇÕES ── */}
          {tab === 'inscricoes' && (
            <section className="painel-section active">
              <div className="painel-section-header">
                <div>
                  <p className="painel-eyebrow">Meus</p>
                  <h2 className="painel-section-title-h2">EVENTOS</h2>
                </div>
              </div>
              <div className="painel-card">
                <div className="painel-card-header">
                  <h3>Minhas Inscrições</h3>
                  <span style={{ fontFamily: 'var(--font-cond)', fontSize: '.72rem', letterSpacing: '2px', color: 'var(--gray)', textTransform: 'uppercase' }}>{inscricoes.length} inscrição{inscricoes.length !== 1 ? 'ões' : ''}</span>
                </div>
                {inscricoes.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                    </div>
                    <h4>Nenhuma inscrição</h4>
                    <p>Você ainda não se inscreveu em nenhum evento.</p>
                    <Link to="/eventos" className="btn-gold">Ver Eventos</Link>
                  </div>
                ) : (
                  inscricoes.map(i => (
                    <div key={i._id} className="evt-item">
                      <div className="evt-item-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                      </div>
                      <div>
                        <div className="evt-item-name">{i.eventId?.nome || '—'}</div>
                        <div className="evt-item-meta">
                          {i.eventId?.local && <span>{i.eventId.local}</span>}
                          {i.eventId?.data && <span>{fmtDate(i.eventId.data)}</span>}
                        </div>
                      </div>
                      <StatusBadge status={i.status || 'confirmada'} />
                    </div>
                  ))
                )}
              </div>
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
                  <p>Você ainda não aparece em nenhum ranking.</p>
                  <span style={{ fontSize: '.82rem', color: 'var(--gray)' }}>O administrador da arena irá adicioná-lo ao ranking após suas primeiras partidas.</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                  {meuRanking.map((r, i) => {
                    const posLabel = r.pos === 1 ? '🥇' : r.pos === 2 ? '🥈' : r.pos === 3 ? '🥉' : `${r.pos}º`;
                    const posColor = r.pos === 1 ? 'var(--gold)' : r.pos === 2 ? '#a0a0b0' : r.pos === 3 ? '#cd7f32' : 'var(--gray-light)';
                    return (
                      <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: '.7rem', fontFamily: 'var(--font-cond)', letterSpacing: '2px', color: 'var(--gray)', textTransform: 'uppercase', marginBottom: '.25rem' }}>{r.esporte} · {r.genero}</div>
                            <div style={{ fontFamily: 'var(--font-cond)', fontSize: '.9rem', color: 'var(--gray-light)', letterSpacing: '1px' }}>{r.nome}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.7rem', lineHeight: 1 }}>{posLabel}</div>
                            <div style={{ fontSize: '.72rem', color: posColor, fontWeight: 700, marginTop: '.15rem' }}>POSIÇÃO</div>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.4rem', paddingTop: '.8rem', borderTop: '1px solid var(--border)' }}>
                          {[['Pts', r.pts], ['PJ', r.pj ?? r.v + r.d], ['V', r.v], ['D', r.d]].map(([label, val]) => (
                            <div key={label} style={{ textAlign: 'center' }}>
                              <div style={{ fontFamily: 'var(--font-cond)', fontSize: '1.1rem', color: 'var(--white)', fontWeight: 700 }}>{val ?? 0}</div>
                              <div style={{ fontSize: '.68rem', color: 'var(--gray)', letterSpacing: '1px' }}>{label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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

              <div className="profile-wrap">
                <form className="profile-form" onSubmit={handleSavePerfil}>
                  <div className="profile-form-title">Dados Pessoais</div>
                  <div className="profile-grid">
                    <div className="field">
                      <label>Nome completo</label>
                      <input type="text" value={perfil.nome} onChange={e => setPerfil({...perfil, nome: e.target.value})} />
                    </div>
                    <div className="field">
                      <label>E-mail</label>
                      <input type="email" value={perfil.email} disabled style={{ opacity: .5, cursor: 'not-allowed' }} />
                    </div>
                    <div className="field">
                      <label>Telefone</label>
                      <input type="tel" value={perfil.telefone} onChange={e => setPerfil({...perfil, telefone: e.target.value})} />
                    </div>
                    <div className="field">
                      <label>Data de Nascimento</label>
                      <input type="date" value={perfil.dataNascimento} onChange={e => setPerfil({...perfil, dataNascimento: e.target.value})} />
                    </div>
                  </div>
                  <button type="submit" className="btn-gold" disabled={saving} style={{ marginTop: '1.5rem' }}>{saving ? 'Salvando…' : 'Salvar Alterações'}</button>
                </form>

                <form className="profile-form" onSubmit={handleSaveSenha} style={{ marginTop: '2rem' }}>
                  <div className="profile-form-title">Alterar Senha</div>
                  <div className="profile-grid">
                    <div className="field">
                      <label>Senha atual</label>
                      <input type="password" value={senhaData.senhaAtual} onChange={e => setSenhaData({...senhaData, senhaAtual: e.target.value})} />
                    </div>
                    <div className="field">
                      <label>Nova senha</label>
                      <input type="password" value={senhaData.novaSenha} onChange={e => setSenhaData({...senhaData, novaSenha: e.target.value})} />
                    </div>
                    <div className="field">
                      <label>Confirmar nova senha</label>
                      <input type="password" value={senhaData.confirmar} onChange={e => setSenhaData({...senhaData, confirmar: e.target.value})} />
                    </div>
                  </div>
                  <button type="submit" className="btn-outline" disabled={saving} style={{ marginTop: '1.5rem' }}>{saving ? 'Salvando…' : 'Alterar Senha'}</button>
                </form>
              </div>
            </section>
          )}

        </main>
      </div>

      {/* BOTTOM TABS MOBILE */}
      <div className="painel-bottom-tabs">
        {[
          { id: 'dashboard', label: 'Home', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
          { id: 'reservas', label: 'Reservas', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg> },
          { id: 'inscricoes', label: 'Eventos', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg> },
          { id: 'perfil', label: 'Perfil', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
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
            <p className="cancel-modal-sub">Esta ação não pode ser desfeita.</p>
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
