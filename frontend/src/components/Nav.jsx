import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import LogoutModal from './LogoutModal';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

export default function Nav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [ddOpen, setDdOpen] = useState(false);
  const pillRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // fecha o dropdown ao tocar fora (necessário em telas touch, onde não há hover)
  useEffect(() => {
    if (!ddOpen) return;
    const onDocClick = (e) => {
      if (pillRef.current && !pillRef.current.contains(e.target)) setDdOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [ddOpen]);

  // fecha ao navegar
  useEffect(() => { setDdOpen(false); }, [location.pathname]);

  // trava o scroll do site enquanto o drawer estiver aberto (inclusive iOS)
  useBodyScrollLock(menuOpen);

  // rola até uma seção da home (navegando pra lá primeiro, se preciso)
  const goSection = (id) => {
    setMenuOpen(false);
    if (location.pathname === '/') {
      // espera o drawer destravar o scroll do body antes de rolar
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 60);
    } else {
      navigate(`/#${id}`);
    }
  };

  const initials = user?.nome ? user.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '';

  const openAuth = (tab = 'login') => {
    setAuthTab(tab);
    setAuthOpen(true);
    setMenuOpen(false);
  };

  return (
    <>
      {/* MOBILE DRAWER */}
      <div
        className={`mobile-menu ${menuOpen ? 'open' : ''}`}
        onClick={(e) => { if (e.target === e.currentTarget) setMenuOpen(false); }}
      >
        <div className="mm-user">
          <div className="mm-avatar">
            {user ? initials : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            )}
          </div>
          <div className="mm-user-info">
            <div className="mm-user-name">{user ? user.nome : 'Bem-vindo'}</div>
            <div className="mm-user-email">{user ? user.email : 'Entre para reservar quadras'}</div>
          </div>
        </div>

        <div className="mm-group">
          <span className="mm-label">Navegação</span>
          <Link className={`mm-item${location.pathname === '/' && !location.hash ? ' active' : ''}`} to="/" onClick={() => setMenuOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z"/></svg>
            Início
          </Link>
          <button className="mm-item" onClick={() => goSection('sobre')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            Sobre
          </button>
          <button className="mm-item" onClick={() => goSection('modalidades')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Modalidades
          </button>
          <button className="mm-item" onClick={() => goSection('parceiros')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Parceiros
          </button>
          <Link className={`mm-item${location.pathname === '/eventos' ? ' active' : ''}`} to="/eventos" onClick={() => setMenuOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Eventos
          </Link>
          <Link className={`mm-item${location.pathname === '/ranking' ? ' active' : ''}`} to="/ranking" onClick={() => setMenuOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
            Ranking
          </Link>
        </div>

        <div className="mm-group">
          <span className="mm-label">Sua Conta</span>
          <div className="mm-account">
            {user ? (
              <>
                <Link className={`mm-btn${location.pathname === '/painel' ? ' active' : ''}`} to="/painel" onClick={() => setMenuOpen(false)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Meu Painel
                </Link>
                {user.admin && (
                  <Link className={`mm-btn${location.pathname === '/admin' ? ' active' : ''}`} to="/admin" onClick={() => setMenuOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    Admin
                  </Link>
                )}
              </>
            ) : (
              <button className="mm-btn" onClick={() => openAuth('login')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                Entrar / Criar Conta
              </button>
            )}
          </div>
        </div>

        <div className="mm-cta-wrap">
          <Link className="mm-cta" to="/reservas" onClick={() => setMenuOpen(false)}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
            Reservar Quadra
          </Link>
        </div>
      </div>

      {/* NAV */}
      <nav id="mainNav" className={scrolled ? 'scrolled' : ''}>
        <Link to="/" className="nav-logo">
          <img src="/img/logo.png" alt="Podium Arena" />
        </Link>

        <ul className="nav-links">
          <li><button className="nav-link-btn" onClick={() => goSection('sobre')}>Sobre</button></li>
          <li><button className="nav-link-btn" onClick={() => goSection('modalidades')}>Modalidades</button></li>
          <li><button className="nav-link-btn" onClick={() => goSection('parceiros')}>Parceiros</button></li>
          <li><Link to="/eventos" className={location.pathname === '/eventos' ? 'active' : ''}>Eventos</Link></li>
          <li><Link to="/ranking" className={location.pathname === '/ranking' ? 'active' : ''}>Ranking</Link></li>
          <li><Link to="/reservas" className={location.pathname === '/reservas' ? 'active' : ''}>Reservas</Link></li>
        </ul>

        <div className="nav-right">
          {user ? (
            <div className="user-avatar-pill" ref={pillRef} onClick={() => setDdOpen(o => !o)}>
              <div className="user-avatar-circle">{initials}</div>
              <span className="user-avatar-name">{user.nome?.split(' ')[0]}</span>
              <svg className="user-avatar-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <div className={`user-dropdown${ddOpen ? ' open' : ''}`}>
                <div className="user-dropdown-header">
                  <div className="user-dropdown-avatar">{initials}</div>
                  <div>
                    <div className="user-dropdown-name">{user.nome}</div>
                    <div className="user-dropdown-email">{user.email}</div>
                  </div>
                </div>
                <div className="divider" />
                <Link to="/painel">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                  Meu Painel
                </Link>
                <Link to="/reservas">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Reservar Quadra
                </Link>
                {user.admin && (
                  <Link to="/admin">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    Admin
                  </Link>
                )}
                <div className="divider" />
                <button className="user-dropdown-logout" onClick={() => setLogoutOpen(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sair
                </button>
              </div>
            </div>
          ) : (
            <button className="nav-login-btn" onClick={() => openAuth('login')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Entrar
            </button>
          )}
          <Link to="/reservas" className="nav-cta">Reservar</Link>
        </div>

        <button
          className={`mobile-toggle ${menuOpen ? 'open' : ''}`}
          id="menuToggle"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span /><span /><span />
        </button>
      </nav>

      {authOpen && <AuthModal initialTab={authTab} onClose={() => setAuthOpen(false)} />}
      {logoutOpen && <LogoutModal onClose={() => setLogoutOpen(false)} />}
    </>
  );
}
