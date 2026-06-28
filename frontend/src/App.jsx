import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import Nav from './components/Nav';
import CompletePerfilModal from './components/CompletePerfilModal';
import Home from './pages/Home';
import Eventos from './pages/Eventos';
import Ranking from './pages/Ranking';
import Reservas from './pages/Reservas';
import Painel from './pages/Painel';
import Admin from './pages/Admin';
import Privacidade from './pages/Privacidade';
import RedefinirSenha from './pages/RedefinirSenha';

/* Páginas que têm seu próprio topbar e não devem exibir o Nav global */
const NO_NAV_PATHS = ['/painel', '/admin'];

function Layout() {
  const loc = useLocation();
  const hideNav = NO_NAV_PATHS.some(p => loc.pathname.startsWith(p));

  return (
    <>
      {!hideNav && <Nav />}
      <CompletePerfilModal />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/eventos" element={<Eventos />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/reservas" element={<Reservas />} />
        <Route path="/painel" element={<Painel />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/redefinir-senha/:token" element={<RedefinirSenha />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Layout />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
