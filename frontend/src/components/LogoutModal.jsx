import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LogoutModal({ onClose }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const confirm = () => {
    logout();
    onClose();
    navigate('/');
  };

  return (
    <div className="modal-overlay open" style={{ zIndex: 9999 }} onClick={(e) => e.target.className.includes('modal-overlay') && onClose()}>
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        padding: '2.5rem',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
      }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', letterSpacing: '2px', marginBottom: '.8rem' }}>
          SAIR DA ARENA?
        </h3>
        <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-cond)', fontSize: '.9rem', letterSpacing: '1px', marginBottom: '2rem' }}>
          Você será desconectado da sua conta.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn-outline" onClick={onClose} style={{ padding: '.75rem 2rem' }}>Cancelar</button>
          <button className="btn-gold" onClick={confirm} style={{ padding: '.75rem 2rem' }}>Sair</button>
        </div>
      </div>
    </div>
  );
}
