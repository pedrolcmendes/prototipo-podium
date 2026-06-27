import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

/* ── CSS originais do projeto (copiados sem alteração) ── */
import './styles/vars.css';
import './styles/base.css';
import './styles/nav.css';
import './styles/auth.css';
import './styles/sections.css';
import './styles/footer.css';
import './styles/mobile.css';
import './styles/painel.css';
import './styles/admin.css';
import './styles/ranking.css';
import './styles/calendar.css';

/* ── Toast (único CSS novo, não sobrepõe nada) ── */
import './styles/toast.css';

import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
