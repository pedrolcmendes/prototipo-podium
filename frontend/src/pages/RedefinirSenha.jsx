import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function RedefinirSenha() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [status, setStatus] = useState(null); // 'ok' | 'erro'
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (novaSenha.length < 6) { setStatus('erro'); setMsg('A senha deve ter ao menos 6 caracteres'); return; }
    if (novaSenha !== confirmar) { setStatus('erro'); setMsg('As senhas não coincidem'); return; }
    setLoading(true);
    try {
      await api.post('/auth/redefinir-senha', { token, novaSenha });
      setStatus('ok');
      setMsg('Senha redefinida com sucesso! Redirecionando…');
      setTimeout(() => navigate('/'), 2500);
    } catch (ex) {
      setStatus('erro');
      setMsg(ex.response?.data?.message || 'Link inválido ou expirado');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: 'calc(100dvh - var(--nav-h))', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '2.5rem 2rem', width: '100%', maxWidth: 420 }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '.75rem', letterSpacing: '3px', color: 'var(--gold)', marginBottom: '.5rem' }}>PODIUM ARENA</p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', letterSpacing: '2px', marginBottom: '.5rem' }}>NOVA SENHA</h2>
        <p style={{ color: 'var(--gray)', fontSize: '.85rem', marginBottom: '1.8rem' }}>Digite e confirme sua nova senha.</p>

        {status === 'ok' ? (
          <div style={{ background: 'rgba(76,175,80,.1)', border: '1px solid rgba(76,175,80,.3)', borderRadius: 8, padding: '1rem', color: '#4caf50', fontSize: '.88rem', textAlign: 'center' }}>{msg}</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="field">
              <label>Nova Senha</label>
              <input type="password" placeholder="Mínimo 6 caracteres" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label>Confirmar Senha</label>
              <input type="password" placeholder="Repita a nova senha" value={confirmar} onChange={e => setConfirmar(e.target.value)} />
            </div>
            {status === 'erro' && (
              <div style={{ background: 'rgba(220,50,50,.1)', border: '1px solid rgba(220,50,50,.3)', borderRadius: 8, padding: '.8rem', color: 'var(--red)', fontSize: '.83rem' }}>{msg}</div>
            )}
            <button type="submit" className="btn-gold" disabled={loading} style={{ marginTop: '.4rem', padding: '.85rem', fontSize: '.85rem', letterSpacing: '1.5px' }}>
              {loading ? 'Salvando…' : 'REDEFINIR SENHA'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
