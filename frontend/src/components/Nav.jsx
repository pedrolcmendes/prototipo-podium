import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import LogoutModal from './LogoutModal';

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

  const initials = user?.nome ? user.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '';

  const openAuth = (tab = 'login') => {
    setAuthTab(tab);
    setAuthOpen(true);
    setMenuOpen(false);
  };

  return (
    <>
      {/* MOBILE DRAWER */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <Link to="/" onClick={() => setMenuOpen(false)}>Início</Link>
        <Link to="/#sobre" onClick={() => setMenuOpen(false)}>Sobre</Link>
        <Link to="/#modalidades" onClick={() => setMenuOpen(false)}>Modalidades</Link>
        <Link to="/#parceiros" onClick={() => setMenuOpen(false)}>Parceiros</Link>
        <Link to="/eventos" onClick={() => setMenuOpen(false)}>Eventos</Link>
        <Link to="/ranking" onClick={() => setMenuOpen(false)}>Ranking</Link>
        <Link to="/reservas" onClick={() => setMenuOpen(false)}>Reservas</Link>
        <div className="mobile-actions">
          <Link to="/reservas" className="btn-gold" onClick={() => setMenuOpen(false)}>Reservar Quadra</Link>
          {user ? (
            <Link to="/painel" className="btn-outline" onClick={() => setMenuOpen(false)}>Meu Painel</Link>
          ) : (
            <button className="btn-outline" onClick={() => openAuth('login')}>Entrar</button>
          )}
        </div>
      </div>

      {/* NAV */}
      <nav id="mainNav" className={scrolled ? 'scrolled' : ''}>
        <Link to="/" className="nav-logo">
          <img src="/img/logo.png" alt="Podium Arena" />
        </Link>

        <ul className="nav-links">
          <li><a href="/#sobre">Sobre</a></li>
          <li><a href="/#modalidades">Modalidades</a></li>
          <li><a href="/#parceiros">Parceiros</a></li>
          <li><a href="/eventos" className={location.pathname === '/eventos' ? 'active' : ''}>Eventos</a></li>
          <li><a href="/ranking" className={location.pathname === '/ranking' ? 'active' : ''}>Ranking</a></li>
          <li><a href="/reservas" className={location.pathname === '/reservas' ? 'active' : ''}>Reservas</a></li>
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
