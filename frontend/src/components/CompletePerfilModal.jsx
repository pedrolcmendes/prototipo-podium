import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import api from '../services/api';

const fmtTel = (v) => {
  const n = v.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) return n.length ? `(${n}` : '';
  if (n.length <= 6) return `(${n.slice(0,2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;
  return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
};
const fmtCPF = (v) => {
  const n = v.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 6) return `${n.slice(0,3)}.${n.slice(3)}`;
  if (n.length <= 9) return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6)}`;
  return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-${n.slice(9)}`;
};

const GENERO_PILLS = [
  { value: 'masculino',    label: '♂ Masculino' },
  { value: 'feminino',     label: '♀ Feminino' },
  { value: 'nao_informar', label: 'Prefiro não dizer' },
];

export default function CompletePerfilModal() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [genero, setGenero] = useState('__unset__');
  const [tel, setTel] = useState('');
  const [nasc, setNasc] = useState('');
  const [cpf, setCpf] = useState('');

  if (!user || user.admin || dismissed) return null;

  // persiste o "pular" na sessão (clears quando o browser fecha)
  const skipKey = `perfil_skip_${user._id}`;
  if (sessionStorage.getItem(skipKey)) return null;

  const falta = {
    genero: !user.genero,
    tel:    !user.tel,
    nasc:   !user.nasc,
    cpf:    !user.cpf,
  };

  if (!Object.values(falta).some(Boolean)) return null;

  const handleSalvar = async () => {
    const payload = {};
    if (falta.genero && genero !== '__unset__') payload.genero = genero;
    if (falta.tel) { const t = tel.replace(/\D/g, ''); if (t.length >= 10) payload.tel = t; }
    if (falta.nasc && nasc) payload.nasc = nasc;
    if (falta.cpf) { const c = cpf.replace(/\D/g, ''); if (c.length === 11) payload.cpf = c; }

    if (!Object.keys(payload).length) {
      handlePular();
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.put('/users/me', payload);
      updateUser(data);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao salvar. Tente novamente.';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePular = () => {
    sessionStorage.setItem(skipKey, '1');
    setDismissed(true);
  };

  return (
    <div className="modal-overlay open" style={{ zIndex: 9998 }}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '2rem', width: '100%', maxWidth: 420,
        display: 'flex', flexDirection: 'column', gap: '1.3rem',
      }}>

        {/* header */}
        <div>
          <p style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '2px', color: 'var(--gold)', marginBottom: '.35rem' }}>
            SEU PERFIL
          </p>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 .35rem' }}>Complete suas informações</h2>
          <p style={{ fontSize: '.83rem', color: 'var(--gray)', lineHeight: 1.6, margin: 0 }}>
            Preencha os dados abaixo para aproveitar melhor a Podium Arena.
            Campos em branco serão pulados.
          </p>
        </div>

        {/* gênero */}
        {falta.genero && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            <label style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '1px', color: 'var(--gray)' }}>GÊNERO</label>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              {GENERO_PILLS.map(p => (
                <button key={p.value} onClick={() => setGenero(p.value)} style={{
                  flex: 1, padding: '.5rem .3rem', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${genero === p.value ? 'var(--gold)' : 'var(--border)'}`,
                  background: genero === p.value ? 'rgba(197,160,40,.12)' : 'rgba(255,255,255,.03)',
                  color: 'var(--text)', fontSize: '.76rem', fontFamily: 'var(--font-body)', transition: 'all .15s',
                }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* telefone */}
        {falta.tel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            <label style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '1px', color: 'var(--gray)' }}>TELEFONE / WHATSAPP</label>
            <input
              type="tel" placeholder="(42) 99999-9999" value={tel}
              onChange={e => setTel(fmtTel(e.target.value))}
              style={inputStyle}
            />
          </div>
        )}

        {/* data de nascimento */}
        {falta.nasc && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            <label style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '1px', color: 'var(--gray)' }}>DATA DE NASCIMENTO</label>
            <input
              type="date" value={nasc} onChange={e => setNasc(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              style={inputStyle}
            />
          </div>
        )}

        {/* CPF */}
        {falta.cpf && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            <label style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '1px', color: 'var(--gray)' }}>CPF</label>
            <input
              type="text" placeholder="000.000.000-00" value={cpf}
              onChange={e => setCpf(fmtCPF(e.target.value))}
              style={inputStyle}
            />
          </div>
        )}

        {/* botões */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.55rem', marginTop: '.2rem' }}>
          <button onClick={handleSalvar} disabled={loading} style={{
            background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 8,
            padding: '.75rem', fontWeight: 700, fontSize: '.9rem', cursor: 'pointer',
            opacity: loading ? .7 : 1, fontFamily: 'var(--font-body)',
          }}>
            {loading ? 'Salvando…' : 'Salvar e continuar'}
          </button>
          <button onClick={handlePular} style={{
            background: 'none', border: 'none', color: 'var(--gray)', fontSize: '.8rem',
            cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--font-body)',
          }}>
            Pular por agora
          </button>
        </div>

      </div>
    </div>
  );
}

const inputStyle = {
  background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '.65rem .9rem', color: 'var(--text)', fontSize: '.9rem',
  fontFamily: 'var(--font-body)', outline: 'none', width: '100%', boxSizing: 'border-box',
};
