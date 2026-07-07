import { flushSync } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LogoutModal({ onClose }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const confirm = () => {
    flushSync(() => {
      logout();
    });
    onClose();
    navigate('/');
  };

  return (
    <div className="logout-modal-overlay open" style={{ zIndex: 9999 }}>
      <div className="logout-modal">
        <div className="logout-modal-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>
        <h3 className="logout-modal-title">SAIR DA ARENA?</h3>
        <p className="logout-modal-sub">Você será desconectado da sua conta.</p>
        <div className="logout-modal-actions">
          <button className="logout-modal-btn-keep" onClick={onClose}>Cancelar</button>
          <button className="logout-modal-btn-confirm" onClick={confirm}>Sair</button>
        </div>
      </div>
    </div>
  );
}
