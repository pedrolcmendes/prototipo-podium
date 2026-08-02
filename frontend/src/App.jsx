import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ToastProvider } from './components/Toast';
import Nav from './components/Nav';
import CompletePerfilModal from './components/CompletePerfilModal';

const Home = lazy(() => import('./pages/Home'));
const Eventos = lazy(() => import('./pages/Eventos'));
const Ranking = lazy(() => import('./pages/Ranking'));
const Reservas = lazy(() => import('./pages/Reservas'));
const Painel = lazy(() => import('./pages/Painel'));
const Admin = lazy(() => import('./pages/Admin'));
const Privacidade = lazy(() => import('./pages/Privacidade'));
const RedefinirSenha = lazy(() => import('./pages/RedefinirSenha'));
const PagamentoRetorno = lazy(() => import('./pages/PagamentoRetorno'));
const NotFound = lazy(() => import('./pages/NotFound'));

/* Páginas que têm seu próprio topbar e não devem exibir o Nav global */
const NO_NAV_PATHS = ['/painel', '/admin'];

/* Rola até a seção do hash (ex.: /#sobre) ou para o topo ao trocar de página */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const t = setTimeout(() => {
        const el = document.getElementById(hash.slice(1));
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 60);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function Layout() {
  const loc = useLocation();
  const hideNav = NO_NAV_PATHS.some(p => loc.pathname.startsWith(p));

  return (
    <>
      <ScrollManager />
      {!hideNav && <Nav />}
      <CompletePerfilModal />
      <Suspense fallback={<div className="route-loading" role="status">Carregando</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/eventos" element={<Eventos />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/reservas" element={<Reservas />} />
          <Route path="/painel" element={<Painel />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/redefinir-senha/:token" element={<RedefinirSenha />} />
          <Route path="/pagamento/retorno" element={<PagamentoRetorno />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <ToastProvider>
            <Layout />
          </ToastProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
