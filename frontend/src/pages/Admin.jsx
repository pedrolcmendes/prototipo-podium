import { useState, useEffect, useCallback, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import api from '../services/api';

// ── helpers ──────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
const fmtMoney = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const getInitials = (nome) => nome ? nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?';
const STATUS_CLS = {
  confirmada: 'badge-green', pendente: 'badge-amber', cancelada: 'badge-red', concluida: 'badge-gray',
  ativo: 'badge-green', bloqueado: 'badge-red', inativo: 'badge-gray',
  aberto: 'badge-green', encerrado: 'badge-red', breve: 'badge-amber',
};

const QUADRAS_ALL = [
  { id: 'BT-1', nome: 'Quadra BT 1' }, { id: 'BT-2', nome: 'Quadra BT 2' },
  { id: 'BT-3', nome: 'Quadra BT 3' }, { id: 'BT-4', nome: 'Quadra BT 4' },
  { id: 'FV-1', nome: 'Quadra FV 1' }, { id: 'FV-2', nome: 'Quadra FV 2' },
  { id: 'VB-1', nome: 'Quadra VB 1' }, { id: 'VB-2', nome: 'Quadra VB 2' },
];
const HOURS = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22];
const MOD_COLOR = { 'beach-tennis': '#e0ac6b', 'futevolei': '#60a5fa', 'volei': '#34d399', 'pickleball': '#f472b6' };

// ── Grade de Ocupação constants ───────────────────────────────
const COURTS_GRADE = [
  { id: 'BT-1', label: 'Quadra BT 1', tipo: 'coberta', tag: 'Beach Tennis' },
  { id: 'BT-2', label: 'Quadra BT 2', tipo: 'coberta', tag: 'Beach Tennis' },
  { id: 'BT-3', label: 'Quadra BT 3', tipo: 'areia',   tag: 'Beach Tennis' },
  { id: 'BT-4', label: 'Quadra BT 4', tipo: 'areia',   tag: 'Beach Tennis' },
  { id: 'FV-1', label: 'Quadra FV 1', tipo: 'coberta', tag: 'Futevôlei' },
  { id: 'FV-2', label: 'Quadra FV 2', tipo: 'areia',   tag: 'Futevôlei' },
  { id: 'VB-1', label: 'Quadra VB 1', tipo: 'coberta', tag: 'Vôlei' },
  { id: 'VB-2', label: 'Quadra VB 2', tipo: 'areia',   tag: 'Vôlei' },
];
const GRADE_HOURS_LIST = Array.from({ length: 16 }, (_, i) => 7 + i); // 7h–22h
const MOD_CLS = { 'beach-tennis': 'bt', futevolei: 'fv', volei: 'vl', pickleball: 'pb' };
const MODALIDADE_LABELS = { 'beach-tennis': 'Beach Tennis', futevolei: 'Futevôlei', volei: 'Vôlei', pickleball: 'Pickleball' };
const WEEKDAYS_S = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const WEEKDAYS_L = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const MONTHS_L  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const GRADE_STATUS_LABEL = { concluida:'Concluído', andamento:'Em quadra', confirmada:'Confirmada', bloqueado:'Bloqueado', livre:'Disponível' };
const GRADE_STATUS_BADGE = { concluida:'badge-green', andamento:'badge-gold', confirmada:'badge-gold', bloqueado:'badge-red', livre:'badge-gray' };

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function weekRangeStart(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return d.toISOString().slice(0, 10);
}

// ── Gate ────────────────────────────────────────────────────
function AdminGate({ onSuccess }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(email, senha);
      if (!u?.admin) { setError('Acesso restrito a administradores.'); return; }
      onSuccess();
    } catch (ex) {
      setError(ex.response?.data?.message || 'E-mail ou senha incorretos');
    } finally { setLoading(false); }
  };

  return (
    <div className="admin-gate" id="adminGate">
      <div className="admin-gate-card">
        <div className="admin-gate-logo"><img src="/img/logo.png" alt="Podium Arena" /></div>
        <p className="admin-gate-eyebrow">Painel Administrativo</p>
        <h1 className="admin-gate-title">ACESSO RESTRITO</h1>
        <p className="admin-gate-sub">Entre com sua conta de administrador para continuar.</p>
        <form className="admin-gate-form" noValidate onSubmit={handleSubmit}>
          <div className="admin-field" style={{ marginBottom: '.9rem' }}>
            <label>E-mail</label>
            <input type="email" placeholder="admin@email.com" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="admin-field" style={{ marginBottom: '.4rem' }}>
            <label>Senha</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password" required style={{ paddingRight: '2.6rem' }} value={senha} onChange={e => setSenha(e.target.value)} />
              <button type="button" className="admin-gate-pw-toggle" aria-label="Mostrar senha" onClick={() => setShowPw(!showPw)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          {error && (
            <div className="admin-gate-error" style={{ display: 'flex' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              <span>{error}</span>
            </div>
          )}
          <button type="submit" className="btn-admin-primary admin-gate-submit" disabled={loading}>{loading ? 'Verificando...' : 'Entrar no Painel'}</button>
        </form>
        <Link to="/" className="admin-gate-back">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Voltar ao site
        </Link>
      </div>
    </div>
  );
}

// ── Modal base ────────────────────────────────────────────────
function AdminModal({ open, onClose, title, eyebrow, maxWidth, footer, children, bodyStyle }) {
  if (!open) return null;
  return (
    <div className="admin-modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal" style={maxWidth ? { maxWidth } : {}}>
        <div className="admin-modal-header">
          <div>{eyebrow && <p className="admin-eyebrow" style={{ marginBottom: '.2rem' }}>{eyebrow}</p>}<h3>{title}</h3></div>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="admin-modal-body" style={bodyStyle}>{children}</div>
        {footer && <div className="admin-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ── MiniBarChart ─────────────────────────────────────────────
function MiniBarChart({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="mini-bar-chart">
      {data.map((d, i) => (
        <div key={i} className="mini-bar-wrap">
          <div className="mini-bar" style={{ height: `${Math.max(4, Math.round((d.value / max) * 56))}px` }} title={fmtMoney(d.value)} />
          <div className="mini-bar-label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── GradeOcupacao ─────────────────────────────────────────────
function GradeOcupacao({ reservas, toast }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [view, setView] = useState('dia');
  const [navDate, setNavDate] = useState(todayStr);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [tooltip, setTooltip] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    api.get('/blocked-slots').then(r => setBlockedSlots(r.data)).catch(() => {});
  }, []);

  const getCellStatus = (courtId, dateStr, hour) => {
    const booking = reservas.find(r =>
      r.status !== 'cancelada' && r.date === dateStr && r.quadraId === courtId &&
      (r.slots || []).map(Number).includes(hour)
    );
    if (booking) {
      let status;
      if (dateStr < todayStr) status = 'concluida';
      else if (dateStr > todayStr) status = 'confirmada';
      else {
        const nowHour = new Date().getHours();
        status = hour < nowHour ? 'concluida' : hour === nowHour ? 'andamento' : 'confirmada';
      }
      return { status, booking };
    }
    const blocked = blockedSlots.find(s => s.courtId === courtId && s.date === dateStr && s.hour === hour);
    if (blocked) return { status: 'bloqueado', blocked };
    return { status: 'livre' };
  };

  const handleCellClick = async (courtId, dateStr, hour) => {
    const { status, blocked } = getCellStatus(courtId, dateStr, hour);
    if (status === 'bloqueado' && blocked) {
      try {
        await api.delete(`/blocked-slots/${blocked._id}`);
        setBlockedSlots(prev => prev.filter(s => s._id !== blocked._id));
        toast('Horário desbloqueado', 'success');
      } catch { toast('Erro ao desbloquear', 'error'); }
    } else if (status === 'livre' && dateStr >= todayStr) {
      try {
        const { data } = await api.post('/blocked-slots', { courtId, date: dateStr, hour });
        setBlockedSlots(prev => [...prev, data]);
        toast('Horário bloqueado', 'success');
      } catch (ex) {
        toast(ex.response?.data?.message || 'Erro ao bloquear', 'error');
      }
    }
  };

  const handleLockRow = async (courtId, dateStr) => {
    const freeHours = GRADE_HOURS_LIST.filter(h => getCellStatus(courtId, dateStr, h).status === 'livre');
    if (!freeHours.length) { toast('Nenhum horário livre para bloquear', 'info'); return; }
    try {
      const results = await Promise.all(freeHours.map(h =>
        api.post('/blocked-slots', { courtId, date: dateStr, hour: h }).catch(() => null)
      ));
      const newSlots = results.filter(Boolean).map(r => r.data);
      setBlockedSlots(prev => [...prev, ...newSlots]);
      toast(`${newSlots.length} horário(s) bloqueado(s)`, 'success');
    } catch { toast('Erro ao bloquear linha', 'error'); }
  };

  const navigate = (dir) => {
    setNavDate(prev => {
      const d = new Date(prev + 'T12:00:00');
      if (view === 'dia') d.setDate(d.getDate() + dir);
      else if (view === 'semana') d.setDate(d.getDate() + dir * 7);
      else d.setMonth(d.getMonth() + dir);
      return d.toISOString().slice(0, 10);
    });
  };

  const getNavLabel = () => {
    const d = new Date(navDate + 'T12:00:00');
    if (view === 'semana') {
      const ws = weekRangeStart(navDate);
      const dS = new Date(ws + 'T12:00:00'), dE = new Date(addDays(ws, 6) + 'T12:00:00');
      return `${dS.getDate()} – ${dE.getDate()} de ${MONTHS_L[dE.getMonth()]}`;
    }
    if (view === 'mes') return `${MONTHS_L[d.getMonth()]} de ${d.getFullYear()}`;
    return `${WEEKDAYS_L[d.getDay()]} · ${d.getDate()} de ${MONTHS_L[d.getMonth()]}`;
  };

  const IconCheck  = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
  const IconPlay   = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20"/></svg>;
  const IconLock   = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;

  const renderDia = () => (
    <div className="grade-grid" style={{ gridTemplateColumns: `170px repeat(${GRADE_HOURS_LIST.length}, 1fr)` }}>
      <div className="grade-corner" />
      {GRADE_HOURS_LIST.map(h => <div key={h} className="grade-hour-head">{h}h</div>)}
      {COURTS_GRADE.map(court => (
        <Fragment key={court.id}>
          <div className="grade-row-label">
            <button className="grade-lock-btn" title="Bloquear horários livres da quadra" onClick={() => handleLockRow(court.id, navDate)}>
              <IconLock />
            </button>
            <div><strong>{court.label}</strong><span>{court.tag.toUpperCase()}</span></div>
          </div>
          {GRADE_HOURS_LIST.map(hour => {
            const { status, booking } = getCellStatus(court.id, navDate, hour);
            const modCls = booking ? ` mod-${MOD_CLS[booking.modalidade] || 'bt'}` : '';
            const cellCls = booking ? `grade-cell${modCls} st-${status}` : `grade-cell st-${status}`;
            return (
              <div
                key={hour}
                className={cellCls}
                onClick={() => handleCellClick(court.id, navDate, hour)}
                onMouseEnter={(e) => { setTooltip({ court, dateStr: navDate, hour, status, booking }); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setTooltip(null)}
              >
                {status === 'concluida' && <IconCheck />}
                {status === 'andamento' && <IconPlay />}
                {status === 'bloqueado' && <IconLock />}
              </div>
            );
          })}
        </Fragment>
      ))}
    </div>
  );

  const renderSemana = () => {
    const ws = weekRangeStart(navDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    return (
      <div className="grade-grid" style={{ gridTemplateColumns: '170px repeat(7, 1fr)' }}>
        <div className="grade-corner" />
        {days.map(d => {
          const dt = new Date(d + 'T12:00:00');
          return (
            <div key={d} className={`grade-hour-head${d === todayStr ? ' is-today' : ''}`}>
              {WEEKDAYS_S[dt.getDay()]}<br /><span>{dt.getDate()}</span>
            </div>
          );
        })}
        {COURTS_GRADE.map(court => (
          <Fragment key={court.id}>
            <div className="grade-row-label">
              <div><strong>{court.label}</strong><span>{court.tag.toUpperCase()}</span></div>
            </div>
            {days.map(d => {
              const booked = GRADE_HOURS_LIST.filter(h => {
                const { status } = getCellStatus(court.id, d, h);
                return status !== 'livre' && status !== 'bloqueado';
              }).length;
              const pct = Math.round((booked / GRADE_HOURS_LIST.length) * 100);
              const op = (pct / 100 * 0.55 + 0.04).toFixed(2);
              return (
                <div
                  key={d}
                  className="grade-cell grade-cell-heat"
                  style={{ background: `rgba(224,172,107,${op})` }}
                  onClick={() => { setView('dia'); setNavDate(d); }}
                  title={`${pct}% ocupado`}
                >
                  <span>{pct}%</span>
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    );
  };

  const renderMes = () => {
    const d = new Date(navDate + 'T12:00:00');
    const year = d.getFullYear(), month = d.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(<div key={`e${i}`} className="grade-month-cell empty" />);
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const booked = COURTS_GRADE.reduce((sum, court) =>
        sum + GRADE_HOURS_LIST.filter(h => {
          const { status } = getCellStatus(court.id, dateStr, h);
          return status !== 'livre' && status !== 'bloqueado';
        }).length, 0);
      const pct = Math.round((booked / (COURTS_GRADE.length * GRADE_HOURS_LIST.length)) * 100);
      cells.push(
        <div key={dateStr} className={`grade-month-cell${dateStr === todayStr ? ' is-today' : ''}`} onClick={() => { setView('dia'); setNavDate(dateStr); }}>
          <span className="gm-num">{day}</span>
          {pct > 0 && <span className="gm-pct">{pct}%</span>}
        </div>
      );
    }
    return (
      <>
        <div className="grade-month-head">{WEEKDAYS_S.map(w => <div key={w}>{w}</div>)}</div>
        <div className="grade-month-grid">{cells}</div>
      </>
    );
  };

  const tooltipEl = tooltip ? createPortal(
    (() => {
      const gap = 10;
      const tipW = 215, tipH = 170;
      const tx = tooltipPos.x + gap + tipW > window.innerWidth
        ? tooltipPos.x - tipW - gap
        : tooltipPos.x + gap;
      const ty = tooltipPos.y + gap + tipH > window.innerHeight
        ? tooltipPos.y - tipH - gap
        : tooltipPos.y + gap;
      return (
        <div className="grade-tooltip show" style={{ position: 'fixed', left: tx, top: ty, pointerEvents: 'none', zIndex: 9999 }}>
          <div className="grade-tip-time">{String(tooltip.hour).padStart(2, '0')}H–{String(tooltip.hour + 1).padStart(2, '0')}H</div>
          <span className={`badge ${GRADE_STATUS_BADGE[tooltip.status] || 'badge-gray'}`}>{GRADE_STATUS_LABEL[tooltip.status] || tooltip.status}</span>
          <div className="grade-tip-court">{tooltip.court.label} · {tooltip.court.tag}</div>
          {tooltip.booking && (
            <>
              <div className="grade-tip-row"><span>Cliente</span><strong>{tooltip.booking.userName || '—'}</strong></div>
              <div className="grade-tip-row"><span>Modalidade</span><strong>{MODALIDADE_LABELS[tooltip.booking.modalidade] || '—'}</strong></div>
              {tooltip.booking.total != null && <div className="grade-tip-row"><span>Valor</span><strong>{fmtMoney(tooltip.booking.total)}</strong></div>}
              <p className="grade-tip-note">{tooltip.status === 'concluida' ? 'Sessão finalizada.' : tooltip.status === 'andamento' ? 'Em andamento agora.' : 'Reserva confirmada.'}</p>
            </>
          )}
          {tooltip.status === 'bloqueado' && <p className="grade-tip-note">Bloqueado pelo administrador.</p>}
          {tooltip.status === 'livre' && <p className="grade-tip-note">Disponível para reserva.</p>}
        </div>
      );
    })(),
    document.body
  ) : null;

  return (
    <>
      <div className="grade-header">
        <div className="grade-header-left">
          <span className="grade-live-dot" />
          <h3>Grade de Ocupação</h3>
        </div>
        <div className="grade-view-toggle">
          {['dia','semana','mes'].map(v => (
            <button key={v} className={`grade-view-btn${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="grade-legend">
        <span className="grade-legend-title">Modalidades</span>
        <span className="grade-legend-item"><i className="grade-dot mod-bt" />Beach Tennis</span>
        <span className="grade-legend-item"><i className="grade-dot mod-fv" />Futevôlei</span>
        <span className="grade-legend-item"><i className="grade-dot mod-vl" />Vôlei</span>
        <span className="grade-legend-item"><i className="grade-dot mod-pb" />Pickleball</span>
        <span className="grade-legend-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          {' '}Concluído
        </span>
        <span className="grade-legend-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20"/></svg>
          {' '}Em quadra
        </span>
        <span className="grade-legend-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          {' '}Bloqueado
        </span>
      </div>
      <p className="grade-hint">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        {' '}Passe o cursor sobre um horário para ver os dados. Clique num horário livre para bloqueá-lo, ou use o cadeado para bloquear todos os livres da quadra.
      </p>
      <div className="grade-nav">
        <button className="grade-nav-btn" onClick={() => navigate(-1)}>‹</button>
        <div className="grade-nav-date">{getNavLabel()}</div>
        {view === 'dia' && navDate === todayStr && <span className="badge badge-gold">HOJE</span>}
        <button className="grade-nav-btn" onClick={() => navigate(1)}>›</button>
        <button className="btn-admin-secondary" style={{ padding: '.45rem 1rem' }} onClick={() => setNavDate(todayStr)}>Hoje</button>
      </div>
      <div className="grade-body">
        {view === 'dia' && renderDia()}
        {view === 'semana' && renderSemana()}
        {view === 'mes' && renderMes()}
      </div>
      {tooltipEl}
    </>
  );
}

// ── UserSearchInput ───────────────────────────────────────────
function UserSearchInput({ nome, userId, placeholder, usuarios, onChange }) {
  const [query, setQuery] = useState(nome || '');
  const [open, setOpen] = useState(false);

  useEffect(() => { setQuery(nome || ''); }, [nome]);

  const filtered = query.length >= 1
    ? usuarios.filter(u => u.nome?.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  const handleSelect = (u) => {
    onChange({ nome: u.nome, userId: u._id });
    setQuery(u.nome);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({ nome: '', userId: null });
    setQuery('');
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        <input
          className="rank-entry-input"
          placeholder={placeholder}
          value={query}
          onChange={ev => { setQuery(ev.target.value); setOpen(true); if (!ev.target.value) onChange({ nome: '', userId: null }); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 160)}
          style={{ paddingRight: userId ? '1.4rem' : undefined }}
        />
        {userId && (
          <span title="Usuário vinculado ao sistema" style={{ position: 'absolute', right: '0.35rem', width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
        )}
      </div>
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, zIndex: 200, boxShadow: '0 6px 18px rgba(0,0,0,.4)', marginTop: 2 }}>
          {filtered.map(u => (
            <div
              key={u._id}
              onMouseDown={() => handleSelect(u)}
              style={{ display: 'flex', flexDirection: 'column', padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '.8rem' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ color: 'var(--white)', fontWeight: 600 }}>{u.nome}</span>
              <span style={{ color: 'var(--gray)', fontSize: '.72rem' }}>{u.email}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Paginação ─────────────────────────────────────────────────
function Pagination({ page, total, perPage, onChange }) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  return (
    <div className="admin-pagination">
      <div className="admin-pagination-info">{start}–{end} de {total}</div>
      <div className="admin-pagination-btns">
        <button className="admin-page-btn" disabled={page === 1} onClick={() => onChange(page - 1)}>‹</button>
        {Array.from({ length: pages }, (_, i) => (
          <button key={i} className={`admin-page-btn${page === i + 1 ? ' active' : ''}`} onClick={() => onChange(i + 1)}>{i + 1}</button>
        ))}
        <button className="admin-page-btn" disabled={page === pages} onClick={() => onChange(page + 1)}>›</button>
      </div>
    </div>
  );
}

// ── MAIN ADMIN ────────────────────────────────────────────────
export default function Admin() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(!user?.admin);

  // Data
  const [usuarios, setUsuarios] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [inscricoes, setInscricoes] = useState([]);
  const [rankings, setRankings] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters — Reservas
  const [resSearch, setResSearch] = useState('');
  const [resStatus, setResStatus] = useState('todas');
  const [resPage, setResPage] = useState(1);
  const PER_PAGE = 10;

  // Filters — Usuários
  const [usrSearch, setUsrSearch] = useState('');
  const [usrStatus, setUsrStatus] = useState('todos');
  const [usrPage, setUsrPage] = useState(1);

  // Filters — Eventos
  const [evtSearch, setEvtSearch] = useState('');
  const [evtStatus, setEvtStatus] = useState('todos');

  const today = new Date().toISOString().split('T')[0];

  // Modals
  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ nome: '', tel: '', genero: '' });
  const [eventoModal, setEventoModal] = useState(null);
  const [eventoForm, setEventoForm] = useState({ nome: '', data: '', hora: '08h–19h', local: 'Podium Arena', vagas: 32, preco: 0, categoria: 'beachtennis', status: 'aberto', nivel: 'Todos os níveis', desc: '' });
  const [detalhesRes, setDetalhesRes] = useState(null);
  const [editRes, setEditRes] = useState(null);
  const [editResForm, setEditResForm] = useState({});
  const [inscricoesModal, setInscricoesModal] = useState(null);
  const [rankingModal, setRankingModal] = useState(false);
  const [rankForm, setRankForm] = useState({ modalidade: 'beachtennis', categoria: 'masculino', entries: [] });
  const newRankEntry = () => ({ pos: 0, userId1: null, nome1: '', userId2: null, nome2: '', pts: 0, v: 0, d: 0 });
  const [creditoModal, setCreditoModal] = useState(null);
  const [creditoForm, setCreditoForm] = useState({ valor: '', motivo: 'cancelamento', obs: '' });
  const [confirmModal, setConfirmModal] = useState(null);
  const [novaResModal, setNovaResModal] = useState(false);
  const [novaResForm, setNovaResForm] = useState({ userId: '', userName: '', quadraId: 'BT-1', modalidade: 'beach-tennis', date: '', slots: [9], payment: 'pix', total: 80, status: 'confirmada' });

  useEffect(() => {
    document.body.classList.add('admin-page');
    return () => {
      document.body.classList.remove('admin-page');
      document.body.classList.remove('gate-active');
    };
  }, []);

  useEffect(() => {
    if (gateOpen) document.body.classList.add('gate-active');
    else document.body.classList.remove('gate-active');
  }, [gateOpen]);

  const loadRankings = async () => {
    const combos = [['beachtennis','masculino'],['beachtennis','feminino'],['futevolei','masculino'],['futevolei','feminino']];
    const results = {};
    await Promise.all(combos.map(async ([esporte, genero]) => {
      try {
        const { data } = await api.get(`/ranking?esporte=${esporte}&genero=${genero}`);
        const found = Array.isArray(data) ? data[0] : data;
        results[`${esporte}_${genero}`] = found?.entries || [];
      } catch { results[`${esporte}_${genero}`] = []; }
    }));
    setRankings(results);
  };

  const loadData = useCallback(async () => {
    if (!user?.admin) return;
    setLoading(true);
    try {
      const [u, b, e] = await Promise.all([api.get('/users'), api.get('/bookings'), api.get('/events')]);
      setUsuarios(u.data);
      setReservas(b.data);
      setEventos(e.data);
      const allInsc = await Promise.all(e.data.map(ev => api.get(`/registrations/evento/${ev._id}`).then(r => r.data).catch(() => [])));
      setInscricoes(allInsc.flat());
      await loadRankings();
    } catch { toast('Erro ao carregar dados', 'error'); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { if (!gateOpen) loadData(); }, [gateOpen]);

  // ── Stats ──
  const hoje = today;
  const mesAtual = hoje.slice(0, 7);
  const reservasHoje = reservas.filter(r => r.date === hoje && r.status !== 'cancelada');
  const reservasMes = reservas.filter(r => r.date?.startsWith(mesAtual) && r.status !== 'cancelada');
  const receitaMes = reservasMes.reduce((a, r) => a + Number(r.total || 0), 0);
  const receitaTotal = reservas.filter(r => r.status !== 'cancelada').reduce((a, r) => a + Number(r.total || 0), 0);
  const usuariosAtivos = usuarios.filter(u => u.status === 'ativo').length;
  const totalSlots = QUADRAS_ALL.length * HOURS.length;
  const ocupados = reservasHoje.reduce((a, r) => a + (r.slots?.length || 0), 0);
  const ocupacao = Math.round((ocupados / totalSlots) * 100);

  // ── Revenue chart data (last 7 months) ──
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (6 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const value = reservas.filter(r => r.date?.startsWith(key) && r.status !== 'cancelada').reduce((a, r) => a + Number(r.total || 0), 0);
    return { label: d.toLocaleString('pt-BR', { month: 'short' }), value };
  });

  // ── Filtered Reservas ──
  const filteredRes = reservas.filter(r => {
    const q = resSearch.toLowerCase();
    const matchSearch = !q || (r.userName || '').toLowerCase().includes(q) || (r.quadraId || '').toLowerCase().includes(q);
    const matchStatus = resStatus === 'todas' || r.status === resStatus || (resStatus === 'proximas' && r.date >= hoje && r.status !== 'cancelada') || (resStatus === 'concluidas' && r.date < hoje) || (resStatus === 'canceladas' && r.status === 'cancelada');
    return matchSearch && matchStatus;
  });
  const pagedRes = filteredRes.slice((resPage - 1) * PER_PAGE, resPage * PER_PAGE);

  // ── Filtered Usuários ──
  const filteredUsr = usuarios.filter(u => {
    const q = usrSearch.toLowerCase();
    const matchSearch = !q || (u.nome || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.cpf || '').includes(q);
    const matchStatus = usrStatus === 'todos' || u.status === usrStatus || (usrStatus === 'ativos' && u.status === 'ativo') || (usrStatus === 'pendentes' && u.status === 'pendente') || (usrStatus === 'bloqueados' && u.status === 'bloqueado') || (usrStatus === 'inativos' && u.status === 'inativo');
    return matchSearch && matchStatus;
  });
  const pagedUsr = filteredUsr.slice((usrPage - 1) * PER_PAGE, usrPage * PER_PAGE);

  // ── Filtered Eventos ──
  const filteredEvt = eventos.filter(e => {
    const q = evtSearch.toLowerCase();
    const matchSearch = !q || (e.nome || '').toLowerCase().includes(q);
    const matchStatus = evtStatus === 'todos' || e.status === evtStatus;
    return matchSearch && matchStatus;
  });

  // ── Actions ──
  const cancelarReserva = (id) => {
    setConfirmModal({
      title: 'Cancelar reserva?', text: 'Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await api.patch(`/bookings/${id}/cancelar`);
          setReservas(prev => prev.map(r => r._id === id ? { ...r, status: 'cancelada' } : r));
          toast('Reserva cancelada', 'success');
        } catch { toast('Erro ao cancelar', 'error'); }
        setConfirmModal(null);
      }
    });
  };

  const salvarEditUser = async () => {
    try {
      await api.put(`/users/${editUser._id}`, { nome: editUserForm.nome, tel: editUserForm.tel, genero: editUserForm.genero });
      setUsuarios(prev => prev.map(u => u._id === editUser._id ? { ...u, ...editUserForm } : u));
      toast('Usuário atualizado', 'success');
      setEditUser(null);
    } catch { toast('Erro ao salvar', 'error'); }
  };

  const mudarStatusUser = async (id, status) => {
    try {
      await api.put(`/users/${id}`, { status });
      setUsuarios(prev => prev.map(u => u._id === id ? { ...u, status } : u));
      toast('Status atualizado', 'success');
    } catch { toast('Erro ao atualizar', 'error'); }
  };

  const salvarEvento = async () => {
    try {
      if (eventoModal?._id) {
        const { data } = await api.put(`/events/${eventoModal._id}`, eventoForm);
        setEventos(prev => prev.map(e => e._id === data._id ? data : e));
        toast('Evento atualizado', 'success');
      } else {
        const { data } = await api.post('/events', eventoForm);
        setEventos(prev => [data, ...prev]);
        toast('Evento criado', 'success');
      }
      setEventoModal(null);
    } catch (ex) { toast(ex.response?.data?.message || 'Erro ao salvar evento', 'error'); }
  };

  const removerEvento = (id) => {
    setConfirmModal({
      title: 'Remover evento?', text: 'Todas as inscrições serão removidas.',
      onConfirm: async () => {
        try {
          await api.delete(`/events/${id}`);
          setEventos(prev => prev.filter(e => e._id !== id));
          toast('Evento removido', 'info');
        } catch { toast('Erro ao remover', 'error'); }
        setConfirmModal(null);
      }
    });
  };

  const salvarEditRes = async () => {
    try {
      await api.put(`/bookings/${editRes._id}`, { status: editResForm.status, total: editResForm.total, payment: editResForm.payment });
      setReservas(prev => prev.map(r => r._id === editRes._id ? { ...r, ...editResForm } : r));
      toast('Reserva atualizada', 'success');
      setEditRes(null);
    } catch { toast('Erro ao salvar', 'error'); }
  };

  const salvarNovaRes = async () => {
    try {
      const { data } = await api.post('/bookings', novaResForm);
      setReservas(prev => [data, ...prev]);
      toast('Reserva criada', 'success');
      setNovaResModal(false);
    } catch (ex) { toast(ex.response?.data?.message || 'Erro ao criar reserva', 'error'); }
  };

  const adicionarCredito = async () => {
    try {
      const novoCredito = (usuarios.find(u => u._id === creditoModal)?.creditos || 0) + Number(creditoForm.valor);
      await api.put(`/users/${creditoModal}`, { creditos: novoCredito });
      setUsuarios(prev => prev.map(u => u._id === creditoModal ? { ...u, creditos: novoCredito } : u));
      toast('Crédito adicionado', 'success');
      setCreditoModal(null);
      setCreditoForm({ valor: '', motivo: 'cancelamento', obs: '' });
    } catch { toast('Erro ao adicionar crédito', 'error'); }
  };

  const loadRanking = async (esporte, genero) => {
    try {
      const { data } = await api.get(`/ranking?esporte=${esporte}&genero=${genero}`);
      const found = Array.isArray(data) ? data[0] : data;
      if (found?.entries?.length) {
        const parsed = found.entries.map(e => {
          const parts = (e.nome || '').split(' / ');
          return {
            ...e,
            userId1: e.userId || null,
            nome1: parts[0]?.trim() || '',
            userId2: e.userId2 || null,
            nome2: parts[1]?.trim() || '',
          };
        });
        setRankForm(prev => ({ ...prev, entries: parsed }));
      }
    } catch {}
  };

  const salvarRanking = async () => {
    const vazio = rankForm.entries.find(e => !e.nome1?.trim());
    if (vazio) { toast('Selecione ao menos o Jogador 1 em todas as linhas', 'error'); return; }
    try {
      const sorted = [...rankForm.entries].sort((a, b) => (Number(b.pts) || 0) - (Number(a.pts) || 0));
      const entries = sorted.map((e, i) => {
        const nome = e.nome2?.trim()
          ? `${e.nome1.trim()} / ${e.nome2.trim()}`
          : e.nome1.trim();
        return {
          pos: i + 1,
          nome,
          ...(e.userId1 && { userId: e.userId1 }),
          ...(e.userId2 && { userId2: e.userId2 }),
          clube: e.clube || '',
          pts: Number(e.pts) || 0,
          v: Number(e.v) || 0,
          d: Number(e.d) || 0,
          pj: (Number(e.v) || 0) + (Number(e.d) || 0),
        };
      });
      await api.put('/ranking', { esporte: rankForm.modalidade, genero: rankForm.categoria, entries });
      toast('Ranking atualizado com sucesso!', 'success');
      setRankingModal(false);
      loadRankings();
    } catch (ex) {
      toast(ex.response?.data?.message || ex.message || 'Erro ao salvar ranking', 'error');
    }
  };

  const handleLogout = () => { logout(); setGateOpen(true); };

  const adminTab = (t) => { setTab(t); setSidebarOpen(false); };

  return (
    <>

      {/* ── GATE ── */}
      <AdminGate onSuccess={() => setGateOpen(false)} />

      {/* ── MODAIS ── */}

      {/* Confirm */}
      {confirmModal && (
        <div className="admin-modal-overlay open">
          <div className="admin-modal" style={{ maxWidth: 400 }}>
            <div className="admin-modal-header"><h3>{confirmModal.title}</h3><button className="admin-modal-close" onClick={() => setConfirmModal(null)}>✕</button></div>
            <div className="admin-modal-body"><p style={{ color: 'var(--gray)', fontSize: '.9rem', lineHeight: 1.7 }}>{confirmModal.text}</p></div>
            <div className="admin-modal-footer">
              <button className="btn-admin-secondary" onClick={() => setConfirmModal(null)}>Cancelar</button>
              <button className="btn-admin-danger" onClick={confirmModal.onConfirm}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Ver usuário */}
      {viewUser && (() => {
        const u = viewUser;
        const uReservas = reservas.filter(r => r.userId?._id === u._id || r.userId === u._id);
        const uInsc = inscricoes.filter(i => i.userId === u._id || i.userId?._id === u._id);
        const uGasto = uReservas.filter(r => r.status !== 'cancelada').reduce((a, r) => a + Number(r.total || 0), 0);
        return (
          <div className="admin-modal-overlay open" onClick={e => e.target === e.currentTarget && setViewUser(null)}>
            <div className="admin-modal" style={{ maxWidth: 620 }}>
              <div className="admin-modal-header">
                <div><p className="admin-eyebrow" style={{ marginBottom: '.2rem' }}>Gestão</p><h3>PERFIL DO CLIENTE</h3></div>
                <button className="admin-modal-close" onClick={() => setViewUser(null)}>✕</button>
              </div>
              <div className="admin-modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
                  <div className="admin-avatar-mini" style={{ width: 52, height: 52, fontSize: '1.1rem' }}>{getInitials(u.nome)}</div>
                  <div><div className="admin-table-name" style={{ fontSize: '1.1rem' }}>{u.nome}</div><div className="admin-table-sub">{u.email}</div></div>
                  <div style={{ marginLeft: 'auto' }}><span className={`badge ${STATUS_CLS[u.status]}`}>{u.status}</span></div>
                </div>
                <div className="admin-profile-stats">
                  <div className="admin-profile-stat"><strong>{uReservas.length}</strong><span>Reservas</span></div>
                  <div className="admin-profile-stat"><strong>{uInsc.length}</strong><span>Eventos</span></div>
                  <div className="admin-profile-stat"><strong>{fmtMoney(uGasto)}</strong><span>Gasto</span></div>
                  <div className="admin-profile-stat credit"><strong>{fmtMoney(u.creditos)}</strong><span>Crédito</span></div>
                </div>
                <div className="admin-grid-2" style={{ marginBottom: '.5rem' }}>
                  <div className="admin-field" style={{ margin: 0 }}><label>Nome completo</label><input type="text" defaultValue={u.nome} /></div>
                  <div className="admin-field" style={{ margin: 0 }}><label>E-mail</label><input type="text" defaultValue={u.email} readOnly style={{ opacity: .55, cursor: 'not-allowed' }} /></div>
                  <div className="admin-field" style={{ margin: 0 }}><label>Telefone</label><input type="text" defaultValue={u.tel} /></div>
                  <div className="admin-field" style={{ margin: 0 }}><label>CPF</label><input type="text" defaultValue={u.cpf} readOnly style={{ opacity: .7, cursor: 'not-allowed' }} /></div>
                </div>
                <div className="admin-field" style={{ marginBottom: 0 }}>
                  <label>Situação da conta</label>
                  <div className="admin-statusgrp">
                    {['ativo', 'pendente', 'inativo', 'bloqueado'].map(s => (
                      <button key={s} className={u.status === s ? 'is-on' : ''} onClick={() => mudarStatusUser(u._id, s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: '1.4rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-cond)', fontSize: '.78rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gray-light)', marginBottom: '.6rem' }}>Reservas ({uReservas.length})</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                    {uReservas.slice(0, 5).map(r => (
                      <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '.5rem .7rem', background: 'var(--dark)', fontSize: '.82rem' }}>
                        <span>{fmtDate(r.date)} · {r.quadraId}</span>
                        <span className={`badge ${STATUS_CLS[r.status]}`}>{r.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button className="btn-admin-secondary" onClick={() => { setCreditoModal(u._id); setViewUser(null); }}>Adicionar Crédito</button>
                <div style={{ flex: 1 }} />
                <button className="btn-admin-secondary" onClick={() => setViewUser(null)}>Fechar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Editar usuário */}
      <AdminModal open={!!editUser} onClose={() => setEditUser(null)} title="Editar Usuário"
        footer={<><button className="btn-admin-secondary" onClick={() => setEditUser(null)}>Cancelar</button><button className="btn-admin-primary" onClick={salvarEditUser}>Salvar Alterações</button></>}>
        <div className="admin-grid-2">
          <div className="admin-field" style={{ gridColumn: '1/-1' }}>
            <label>Nome completo</label>
            <input type="text" value={editUserForm.nome} onChange={e => setEditUserForm({ ...editUserForm, nome: e.target.value })} />
          </div>
          <div className="admin-field">
            <label>Telefone</label>
            <input type="tel" value={editUserForm.tel} onChange={e => setEditUserForm({ ...editUserForm, tel: e.target.value })} />
          </div>
          <div className="admin-field">
            <label>Gênero</label>
            <select value={editUserForm.genero} onChange={e => setEditUserForm({ ...editUserForm, genero: e.target.value })}>
              <option value="">Não informado</option>
              <option value="feminino">Feminino</option>
              <option value="masculino">Masculino</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>
      </AdminModal>

      {/* Evento modal */}
      <AdminModal open={eventoModal !== null} onClose={() => setEventoModal(null)} title={eventoModal?._id ? 'Editar Evento' : 'Novo Evento'} maxWidth={560}
        footer={<><button className="btn-admin-secondary" onClick={() => setEventoModal(null)}>Cancelar</button><button className="btn-admin-primary" onClick={salvarEvento}>Salvar Evento</button></>}>
        <div className="admin-grid-2">
          <div className="admin-field" style={{ gridColumn: '1/-1' }}><label>Nome do Evento *</label><input type="text" value={eventoForm.nome} onChange={e => setEventoForm({ ...eventoForm, nome: e.target.value })} placeholder="Ex: Copa Podium Arena" /></div>
          <div className="admin-field"><label>Data *</label><input type="date" value={eventoForm.data} onChange={e => setEventoForm({ ...eventoForm, data: e.target.value })} /></div>
          <div className="admin-field"><label>Horário</label><input type="text" value={eventoForm.hora} onChange={e => setEventoForm({ ...eventoForm, hora: e.target.value })} placeholder="08h–19h" /></div>
          <div className="admin-field"><label>Local</label><input type="text" value={eventoForm.local} onChange={e => setEventoForm({ ...eventoForm, local: e.target.value })} /></div>
          <div className="admin-field"><label>Vagas</label><input type="number" value={eventoForm.vagas} onChange={e => setEventoForm({ ...eventoForm, vagas: Number(e.target.value) })} /></div>
          <div className="admin-field"><label>Preço (R$)</label><input type="number" value={eventoForm.preco} onChange={e => setEventoForm({ ...eventoForm, preco: Number(e.target.value) })} step="0.01" /></div>
          <div className="admin-field">
            <label>Categoria</label>
            <select value={eventoForm.categoria} onChange={e => setEventoForm({ ...eventoForm, categoria: e.target.value })}>
              {['beachtennis','futevolei','volei','pickleball','taekwondo','geral'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="admin-field">
            <label>Status</label>
            <select value={eventoForm.status} onChange={e => setEventoForm({ ...eventoForm, status: e.target.value })}>
              <option value="aberto">Inscrições Abertas</option>
              <option value="breve">Em Breve</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </div>
          <div className="admin-field" style={{ gridColumn: '1/-1' }}><label>Nível</label><input type="text" value={eventoForm.nivel} onChange={e => setEventoForm({ ...eventoForm, nivel: e.target.value })} /></div>
          <div className="admin-field" style={{ gridColumn: '1/-1' }}><label>Descrição</label><textarea value={eventoForm.desc} onChange={e => setEventoForm({ ...eventoForm, desc: e.target.value })} style={{ minHeight: 80, resize: 'vertical' }} /></div>
        </div>
      </AdminModal>

      {/* Detalhes reserva */}
      {detalhesRes && (
        <div className="admin-modal-overlay open" onClick={e => e.target === e.currentTarget && setDetalhesRes(null)}>
          <div className="admin-modal" style={{ maxWidth: 520 }}>
            <div className="admin-modal-header">
              <div><p className="admin-eyebrow" style={{ marginBottom: '.2rem' }}>#{detalhesRes._id?.slice(-6).toUpperCase()}</p><h3>DETALHES DA RESERVA</h3></div>
              <button className="admin-modal-close" onClick={() => setDetalhesRes(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '.9rem', padding: '.9rem', background: 'var(--dark)', border: '1px solid var(--border-soft)', marginBottom: '1.1rem' }}>
                <div className="admin-avatar-mini" style={{ width: 44, height: 44, fontSize: '1rem' }}>{getInitials(detalhesRes.userName)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="admin-table-name">{detalhesRes.userName}</div>
                  <div className="admin-table-sub">{detalhesRes.modalidade}</div>
                </div>
                <span className={`badge ${STATUS_CLS[detalhesRes.status]}`}>{detalhesRes.status}</span>
              </div>
              <div className="admin-grid-2" style={{ marginBottom: '1.1rem' }}>
                <div><div className="admin-chips-label" style={{ display: 'block', marginBottom: '.25rem' }}>Data</div><div style={{ fontSize: '.9rem', fontWeight: 600 }}>{fmtDate(detalhesRes.date)}</div></div>
                <div><div className="admin-chips-label" style={{ display: 'block', marginBottom: '.25rem' }}>Horário</div><div style={{ fontSize: '.9rem', fontWeight: 600 }}>{detalhesRes.slots?.map(h => `${h}h`).join(', ')}</div></div>
                <div><div className="admin-chips-label" style={{ display: 'block', marginBottom: '.25rem' }}>Quadra</div><div style={{ fontSize: '.9rem', fontWeight: 600 }}>{detalhesRes.quadraId}</div></div>
                <div><div className="admin-chips-label" style={{ display: 'block', marginBottom: '.25rem' }}>Pagamento</div><div style={{ fontSize: '.9rem', fontWeight: 600 }}>{detalhesRes.payment}</div></div>
              </div>
              <div className="admin-balance-box" style={{ marginBottom: 0 }}>
                <span>Valor Total</span>
                <strong style={{ fontSize: '1.4rem' }}>{fmtMoney(detalhesRes.total)}</strong>
              </div>
            </div>
            <div className="admin-modal-footer">
              {detalhesRes.status !== 'cancelada' && <button className="btn-admin-danger" onClick={() => { cancelarReserva(detalhesRes._id); setDetalhesRes(null); }}>Cancelar Reserva</button>}
              <div style={{ flex: 1 }} />
              <button className="btn-admin-secondary" onClick={() => setDetalhesRes(null)}>Fechar</button>
              <button className="btn-admin-primary" onClick={() => { setEditResForm({ status: detalhesRes.status, total: detalhesRes.total, payment: detalhesRes.payment }); setEditRes(detalhesRes); setDetalhesRes(null); }}>Editar</button>
            </div>
          </div>
        </div>
      )}

      {/* Editar reserva */}
      <AdminModal open={!!editRes} onClose={() => setEditRes(null)} eyebrow={`#${editRes?._id?.slice(-6).toUpperCase()}`} title="EDITAR RESERVA" maxWidth={560}
        footer={<><button className="btn-admin-danger" onClick={() => { cancelarReserva(editRes._id); setEditRes(null); }}>Cancelar Reserva</button><div style={{ flex: 1 }} /><button className="btn-admin-secondary" onClick={() => setEditRes(null)}>Voltar</button><button className="btn-admin-primary" onClick={salvarEditRes}>Salvar</button></>}>
        {editRes && (
          <div className="admin-grid-2">
            <div className="admin-field">
              <label>Status</label>
              <select value={editResForm.status} onChange={e => setEditResForm({ ...editResForm, status: e.target.value })}>
                <option value="confirmada">Confirmada</option>
                <option value="pendente">Pendente</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div className="admin-field">
              <label>Pagamento</label>
              <select value={editResForm.payment} onChange={e => setEditResForm({ ...editResForm, payment: e.target.value })}>
                <option value="pix">PIX</option>
                <option value="credito">Crédito</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
            </div>
            <div className="admin-field" style={{ gridColumn: '1/-1' }}>
              <label>Valor (R$)</label>
              <input type="number" value={editResForm.total} onChange={e => setEditResForm({ ...editResForm, total: Number(e.target.value) })} step="0.01" />
            </div>
          </div>
        )}
      </AdminModal>

      {/* Nova reserva */}
      <AdminModal open={novaResModal} onClose={() => setNovaResModal(false)} eyebrow="Reserva Interna" title="NOVA RESERVA" maxWidth={560}
        footer={<><button className="btn-admin-secondary" onClick={() => setNovaResModal(false)}>Cancelar</button><button className="btn-admin-primary" onClick={salvarNovaRes}>Criar Reserva</button></>}>
        <div className="admin-grid-2">
          <div className="admin-field" style={{ gridColumn: '1/-1' }}>
            <label>Cliente</label>
            <select value={novaResForm.userId} onChange={e => {
              const u = usuarios.find(x => x._id === e.target.value);
              setNovaResForm({ ...novaResForm, userId: e.target.value, userName: u?.nome || '' });
            }}>
              <option value="">Selecione...</option>
              {usuarios.map(u => <option key={u._id} value={u._id}>{u.nome}</option>)}
            </select>
          </div>
          <div className="admin-field">
            <label>Quadra</label>
            <select value={novaResForm.quadraId} onChange={e => setNovaResForm({ ...novaResForm, quadraId: e.target.value })}>
              {QUADRAS_ALL.map(q => <option key={q.id} value={q.id}>{q.nome}</option>)}
            </select>
          </div>
          <div className="admin-field">
            <label>Modalidade</label>
            <select value={novaResForm.modalidade} onChange={e => setNovaResForm({ ...novaResForm, modalidade: e.target.value })}>
              <option value="beach-tennis">Beach Tennis</option>
              <option value="futevolei">Futevôlei</option>
              <option value="volei">Vôlei</option>
              <option value="pickleball">Pickleball</option>
            </select>
          </div>
          <div className="admin-field"><label>Data</label><input type="date" value={novaResForm.date} onChange={e => setNovaResForm({ ...novaResForm, date: e.target.value })} /></div>
          <div className="admin-field"><label>Valor (R$)</label><input type="number" value={novaResForm.total} onChange={e => setNovaResForm({ ...novaResForm, total: Number(e.target.value) })} step="0.01" /></div>
          <div className="admin-field">
            <label>Pagamento</label>
            <select value={novaResForm.payment} onChange={e => setNovaResForm({ ...novaResForm, payment: e.target.value })}>
              <option value="pix">PIX</option>
              <option value="credito">Crédito</option>
              <option value="dinheiro">Dinheiro</option>
            </select>
          </div>
          <div className="admin-field">
            <label>Status</label>
            <select value={novaResForm.status} onChange={e => setNovaResForm({ ...novaResForm, status: e.target.value })}>
              <option value="confirmada">Confirmada</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>
        </div>
      </AdminModal>

      {/* Inscrições modal */}
      {inscricoesModal && (
        <div className="admin-modal-overlay open" onClick={e => e.target === e.currentTarget && setInscricoesModal(null)}>
          <div className="admin-modal">
            <div className="admin-modal-header"><h3>{inscricoesModal.nome}</h3><button className="admin-modal-close" onClick={() => setInscricoesModal(null)}>✕</button></div>
            <div className="admin-modal-body" style={{ maxHeight: 360, overflowY: 'auto' }}>
              {inscricoes.filter(i => i.eventId === inscricoesModal._id || i.eventId?._id === inscricoesModal._id).map(i => (
                <div key={i._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '.5rem .7rem', background: 'var(--dark)', marginBottom: '.3rem', fontSize: '.85rem' }}>
                  <span>{i.userId?.nome || i.userName || '—'}</span>
                  <span className={`badge ${STATUS_CLS[i.status]}`}>{i.status}</span>
                </div>
              ))}
            </div>
            <div className="admin-modal-footer"><button className="btn-admin-secondary" onClick={() => setInscricoesModal(null)}>Fechar</button></div>
          </div>
        </div>
      )}

      {/* Ranking modal */}
      {rankingModal && (
        <div className="admin-modal-overlay open" onClick={e => e.target === e.currentTarget && setRankingModal(false)}>
          <div className="admin-modal" style={{ maxWidth: 680, width: '95vw' }}>
            <div className="admin-modal-header">
              <div>
                <p className="admin-eyebrow" style={{ marginBottom: '.2rem' }}>Gestão</p>
                <h3>RANKING</h3>
              </div>
              <button className="admin-modal-close" onClick={() => setRankingModal(false)}>✕</button>
            </div>

            {/* Seletores */}
            <div style={{ padding: '1.2rem 1.5rem .8rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="admin-field" style={{ margin: 0 }}>
                  <label>Modalidade</label>
                  <select value={rankForm.modalidade} onChange={e => {
                    const mod = e.target.value;
                    setRankForm(prev => ({ ...prev, modalidade: mod, entries: [] }));
                    loadRanking(mod, rankForm.categoria);
                  }}>
                    <option value="beachtennis">Beach Tennis</option>
                    <option value="futevolei">Futevôlei</option>
                  </select>
                </div>
                <div className="admin-field" style={{ margin: 0 }}>
                  <label>Categoria</label>
                  <select value={rankForm.categoria} onChange={e => {
                    const cat = e.target.value;
                    setRankForm(prev => ({ ...prev, categoria: cat, entries: [] }));
                    loadRanking(rankForm.modalidade, cat);
                  }}>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cabeçalho — 7 colunas: # | J1 | J2 | Pts | V | D | del */}
            <div className="rank-entries-header" style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 64px 44px 44px 28px', gap: '.5rem', padding: '.5rem 1.7rem', margin: 0 }}>
              <span style={{ textAlign: 'center' }}>#</span>
              <span>Jogador 1 *</span>
              <span>Jogador 2</span>
              <span style={{ textAlign: 'center' }}>Pts</span>
              <span style={{ textAlign: 'center' }}>V</span>
              <span style={{ textAlign: 'center' }}>D</span>
              <span />
            </div>

            {/* Lista de entries */}
            <div className="ranking-modal-entries" style={{ overflowY: 'auto', maxHeight: 340, padding: '0 1.5rem .5rem' }}>
              {rankForm.entries.length === 0 && (
                <div style={{ padding: '2.5rem 0', textAlign: 'center', color: 'var(--gray)', fontSize: '.78rem', letterSpacing: '2px', fontFamily: 'var(--font-cond)', textTransform: 'uppercase' }}>
                  Nenhuma dupla — clique em "+ Adicionar" abaixo
                </div>
              )}
              {rankForm.entries.map((e, i) => {
                const upd = (field, val) => setRankForm(prev => ({
                  ...prev,
                  entries: prev.entries.map((x, j) => j === i ? { ...x, [field]: val } : x),
                }));
                const posClass = i === 0 ? 'pos-1' : i === 1 ? 'pos-2' : i === 2 ? 'pos-3' : '';
                return (
                  <div key={i} className="rank-entry-row" style={{ gridTemplateColumns: '32px 1fr 1fr 64px 44px 44px 28px' }}>
                    <span className={`rank-entry-num ${posClass}`}>{i + 1}</span>
                    <UserSearchInput
                      nome={e.nome1}
                      userId={e.userId1}
                      placeholder="Jogador 1 *"
                      usuarios={usuarios}
                      onChange={({ nome, userId }) => { upd('nome1', nome); upd('userId1', userId); }}
                    />
                    <UserSearchInput
                      nome={e.nome2}
                      userId={e.userId2}
                      placeholder="Jogador 2"
                      usuarios={usuarios}
                      onChange={({ nome, userId }) => { upd('nome2', nome); upd('userId2', userId); }}
                    />
                    <input className="rank-entry-input num-input" type="number" min="0" value={e.pts} onChange={ev => upd('pts', Number(ev.target.value))} />
                    <input className="rank-entry-input num-input" type="number" min="0" value={e.v} onChange={ev => upd('v', Number(ev.target.value))} />
                    <input className="rank-entry-input num-input" type="number" min="0" value={e.d} onChange={ev => upd('d', Number(ev.target.value))} />
                    <button className="rank-entry-del" title="Remover" onClick={() =>
                      setRankForm(prev => ({ ...prev, entries: prev.entries.filter((_, j) => j !== i) }))
                    }>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                );
              })}
              <button className="rank-add-btn" onClick={() =>
                setRankForm(prev => ({ ...prev, entries: [...prev.entries, newRankEntry()] }))
              }>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                Adicionar Dupla
              </button>
            </div>

            <div className="admin-modal-footer" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: '.74rem', color: 'var(--gray)', fontFamily: 'var(--font-body)', letterSpacing: '1px', alignSelf: 'center' }}>
                {rankForm.entries.length} dupla{rankForm.entries.length !== 1 ? 's' : ''}
              </span>
              <div style={{ display: 'flex', gap: '.7rem' }}>
                <button className="btn-admin-secondary" onClick={() => setRankingModal(false)}>Cancelar</button>
                <button className="btn-admin-primary" onClick={salvarRanking}>Salvar Ranking</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crédito modal */}
      <AdminModal open={!!creditoModal} onClose={() => setCreditoModal(null)} eyebrow="Carteira" title="ADICIONAR CRÉDITO" maxWidth={480}
        footer={<><button className="btn-admin-secondary" onClick={() => setCreditoModal(null)}>Cancelar</button><button className="btn-admin-primary" onClick={adicionarCredito}>Adicionar crédito</button></>}>
        <div className="admin-notice">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <p>Cancelamentos dentro de 24h viram crédito automático na carteira do cliente.</p>
        </div>
        <div className="admin-field">
          <label>Cliente</label>
          <select value={creditoModal || ''} onChange={e => setCreditoModal(e.target.value)}>
            {usuarios.map(u => <option key={u._id} value={u._id}>{u.nome} — Saldo: {fmtMoney(u.creditos)}</option>)}
          </select>
        </div>
        <div className="admin-balance-box">
          <span>Saldo atual</span>
          <strong>{fmtMoney(usuarios.find(u => u._id === creditoModal)?.creditos)}</strong>
        </div>
        <div className="admin-grid-2">
          <div className="admin-field" style={{ margin: 0 }}><label>Valor (R$)</label><input type="number" value={creditoForm.valor} onChange={e => setCreditoForm({ ...creditoForm, valor: e.target.value })} placeholder="0,00" step="0.01" /></div>
          <div className="admin-field" style={{ margin: 0 }}>
            <label>Motivo</label>
            <select value={creditoForm.motivo} onChange={e => setCreditoForm({ ...creditoForm, motivo: e.target.value })}>
              <option value="cancelamento">Cancelamento &lt; 24h</option>
              <option value="bonus">Bônus promocional</option>
              <option value="ajuste">Ajuste manual</option>
              <option value="estorno">Estorno</option>
            </select>
          </div>
        </div>
        <div className="admin-field" style={{ marginBottom: 0 }}><label>Observação</label><input type="text" value={creditoForm.obs} onChange={e => setCreditoForm({ ...creditoForm, obs: e.target.value })} placeholder="Opcional..." /></div>
      </AdminModal>

      {/* ── TOPBAR ── */}
      <header className="admin-topbar">
        <Link to="/" className="admin-topbar-logo">
          <img src="/img/logo.png" alt="Podium Arena" />
          <div className="admin-topbar-logo-text"><strong>PODIUM ARENA</strong><span>Administração</span></div>
        </Link>
        <div className="admin-topbar-right">
          <div className="admin-topbar-user">
            <div className="admin-topbar-avatar">{getInitials(user?.nome)}</div>
            <span className="admin-topbar-name">{user?.nome?.split(' ')[0] || 'Admin'}</span>
          </div>
          <Link to="/" className="admin-topbar-site">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Ver site
          </Link>
          <button className="admin-topbar-logout" onClick={handleLogout}>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            Sair
          </button>
        </div>
        <button className={`admin-hamburger${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <span /><span /><span />
        </button>
      </header>

      {/* ── LAYOUT ── */}
      <div className="admin-layout">

        {/* SIDEBAR */}
        <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`} id="adminSidebar">
          <div className="admin-sidebar-section">
            <div className="admin-sidebar-label">Visão Geral</div>
            <button className={`admin-nav-item${tab === 'dashboard' ? ' active' : ''}`} onClick={() => adminTab('dashboard')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
              Dashboard
            </button>
          </div>
          <div className="admin-sidebar-section">
            <div className="admin-sidebar-label">Gestão</div>
            {[
              { id: 'reservas', label: 'Reservas', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg> },
              { id: 'usuarios', label: 'Usuários', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
              { id: 'eventos', label: 'Eventos', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg> },
              { id: 'ranking', label: 'Ranking', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg> },
            ].map(({ id, label, icon }) => (
              <button key={id} className={`admin-nav-item${tab === id ? ' active' : ''}`} onClick={() => adminTab(id)}>{icon}{label}</button>
            ))}
          </div>
          <div className="admin-sidebar-section">
            <div className="admin-sidebar-label">Financeiro</div>
            <button className={`admin-nav-item${tab === 'financeiro' ? ' active' : ''}`} onClick={() => adminTab('financeiro')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="12" x2="12" y1="1" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Financeiro
            </button>
          </div>
          <div className="admin-sidebar-section">
            <div className="admin-sidebar-label">Sistema</div>
            <button className={`admin-nav-item${tab === 'config' ? ' active' : ''}`} onClick={() => adminTab('config')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              Configurações
            </button>
          </div>
          <div className="admin-sidebar-footer">
            <Link to="/painel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Meu Painel
            </Link>
            <button onClick={handleLogout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
              Sair
            </button>
          </div>
        </aside>

        {sidebarOpen && <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* ── CONTEÚDO ── */}
        <main className="admin-content">

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font-cond)', fontSize: '1rem', color: 'var(--gray)', letterSpacing: '3px' }}>
              CARREGANDO...
            </div>
          )}

          {/* DASHBOARD */}
          <section className={`admin-section${tab === 'dashboard' ? ' active' : ''}`}>
            <div className="admin-section-header">
              <div><p className="admin-eyebrow">Visão geral</p><h2 className="admin-section-h2">DASHBOARD</h2></div>
              <div className="admin-greeting">
                <div className="admin-greeting-name">Olá, {user?.nome?.split(' ')[0] || 'Admin'}</div>
                <div className="admin-greeting-sub">Bem-vindo de volta ao Painel Admin</div>
              </div>
            </div>

            <div className="admin-stats">
              {[
                { label: 'Receita do Mês', value: fmtMoney(receitaMes), icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="12" x2="12" y1="1" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, cls: '' },
                { label: 'Reservas Hoje', value: reservasHoje.length, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>, cls: 'icon-blue' },
                { label: 'Taxa de Ocupação', value: `${ocupacao}%`, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg>, cls: '' },
                { label: 'Usuários Ativos', value: usuariosAtivos, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, cls: 'icon-green' },
              ].map(({ label, value, icon, cls }) => (
                <div key={label} className="admin-stat">
                  <div className="admin-stat-top"><div className={`admin-stat-icon ${cls}`}>{icon}</div></div>
                  <div className="admin-stat-value">{value}</div>
                  <div className="admin-stat-label">{label}</div>
                </div>
              ))}
            </div>

            {/* Grade de Ocupação */}
            <div className="admin-card grade-card" style={{ marginBottom: '1.5rem' }}>
              <GradeOcupacao reservas={reservas} toast={toast} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="admin-card">
                <div className="admin-card-header"><h3>Receita — Últimos 7 Meses</h3></div>
                <div style={{ padding: '.8rem 0' }}><MiniBarChart data={chartData} /></div>
              </div>
              <div className="admin-card">
                <div className="admin-card-header"><h3>Ações Rápidas</h3></div>
                <div style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
                  <button className="btn-admin-primary" style={{ justifyContent: 'center' }} onClick={() => adminTab('reservas')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    Gerenciar Reservas
                  </button>
                  <button className="btn-admin-secondary" style={{ justifyContent: 'center' }} onClick={() => setCreditoModal(usuarios[0]?._id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                    Adicionar Crédito
                  </button>
                  <button className="btn-admin-secondary" style={{ justifyContent: 'center' }} onClick={() => adminTab('financeiro')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="12" x2="12" y1="1" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    Relatório Financeiro
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="admin-card">
                <div className="admin-card-header"><h3>Últimas Reservas</h3><button className="admin-card-link" onClick={() => adminTab('reservas')}>Ver todas →</button></div>
                {reservas.slice(0, 5).map(r => (
                  <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.7rem 1.2rem', borderBottom: '1px solid var(--border)', fontSize: '.83rem' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-cond)', letterSpacing: '1px', color: 'var(--white)' }}>{r.userName}</div>
                      <div style={{ color: 'var(--gray)', fontSize: '.78rem' }}>{r.quadraId} · {fmtDate(r.date)}</div>
                    </div>
                    <span className={`badge ${STATUS_CLS[r.status]}`}>{r.status}</span>
                  </div>
                ))}
              </div>
              <div className="admin-card">
                <div className="admin-card-header"><h3>Últimos Cadastros</h3><button className="admin-card-link" onClick={() => adminTab('usuarios')}>Ver todos →</button></div>
                {usuarios.slice(0, 5).map(u => (
                  <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '.8rem', padding: '.7rem 1.2rem', borderBottom: '1px solid var(--border)' }}>
                    <div className="admin-avatar-mini" style={{ width: 32, height: 32, fontSize: '.75rem' }}>{getInitials(u.nome)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="admin-table-name" style={{ fontSize: '.85rem' }}>{u.nome}</div>
                      <div className="admin-table-sub" style={{ fontSize: '.75rem' }}>{u.email}</div>
                    </div>
                    <span className={`badge ${STATUS_CLS[u.status]}`}>{u.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* RESERVAS */}
          <section className={`admin-section${tab === 'reservas' ? ' active' : ''}`}>
            <div className="admin-section-header">
              <div><p className="admin-eyebrow">Gestão</p><h2 className="admin-section-h2">RESERVAS</h2></div>
              <button className="btn-admin-primary" onClick={() => setNovaResModal(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                Nova Reserva
              </button>
            </div>
            <div className="admin-card">
              <div className="admin-card-header">
                <h3>Todas as Reservas</h3>
                <div className="admin-card-toolbar">
                  <div className="admin-search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input type="text" placeholder="Buscar usuário ou quadra…" value={resSearch} onChange={e => { setResSearch(e.target.value); setResPage(1); }} />
                  </div>
                  <select className="admin-filter-select" value={resStatus} onChange={e => { setResStatus(e.target.value); setResPage(1); }}>
                    <option value="todas">Todas</option>
                    <option value="confirmada">Confirmadas</option>
                    <option value="proximas">Próximas</option>
                    <option value="concluidas">Concluídas</option>
                    <option value="canceladas">Canceladas</option>
                  </select>
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>ID</th><th>Usuário / Data</th><th>Quadra</th><th>Horário</th><th>Valor</th><th>Status</th><th style={{ textAlign: 'right' }}>Ações</th></tr>
                  </thead>
                  <tbody>
                    {pagedRes.map(r => (
                      <tr key={r._id}>
                        <td className="muted" style={{ fontSize: '.75rem' }}>#{r._id?.slice(-6).toUpperCase()}</td>
                        <td>
                          <div className="admin-table-name">{r.userName || r.userId?.nome || '—'}</div>
                          <div className="admin-table-sub">{fmtDate(r.date)}</div>
                        </td>
                        <td>{r.quadraId}</td>
                        <td className="muted">{r.slots?.map(h => `${h}h`).join(', ')}</td>
                        <td>{fmtMoney(r.total)}</td>
                        <td><span className={`badge ${STATUS_CLS[r.status]}`}>{r.status}</span></td>
                        <td>
                          <div className="admin-row-actions">
                            <button className="admin-action-btn" title="Ver detalhes" onClick={() => setDetalhesRes(r)}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                            <button className="admin-action-btn" title="Editar" onClick={() => { setEditResForm({ status: r.status, total: r.total, payment: r.payment }); setEditRes(r); }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                            </button>
                            {r.status !== 'cancelada' && (
                              <button className="admin-action-btn danger" title="Cancelar" onClick={() => cancelarReserva(r._id)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pagedRes.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>Nenhuma reserva encontrada</td></tr>}
                  </tbody>
                </table>
              </div>
              <Pagination page={resPage} total={filteredRes.length} perPage={PER_PAGE} onChange={setResPage} />
            </div>
          </section>

          {/* USUÁRIOS */}
          <section className={`admin-section${tab === 'usuarios' ? ' active' : ''}`}>
            <div className="admin-section-header">
              <div><p className="admin-eyebrow">Gestão</p><h2 className="admin-section-h2">USUÁRIOS</h2></div>
            </div>
            <div className="admin-card">
              <div className="admin-card-header">
                <h3>Base de Usuários</h3>
                <div className="admin-card-toolbar">
                  <div className="admin-search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input type="text" placeholder="Buscar nome, e-mail ou CPF…" value={usrSearch} onChange={e => { setUsrSearch(e.target.value); setUsrPage(1); }} />
                  </div>
                  <select className="admin-filter-select" value={usrStatus} onChange={e => { setUsrStatus(e.target.value); setUsrPage(1); }}>
                    <option value="todos">Todos</option>
                    <option value="ativos">Ativos</option>
                    <option value="pendentes">Pendentes</option>
                    <option value="bloqueados">Bloqueados</option>
                    <option value="inativos">Inativos</option>
                  </select>
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Usuário</th><th>Telefone</th><th>Cadastro</th><th>Reservas</th><th>Status</th><th style={{ textAlign: 'right' }}>Ações</th></tr>
                  </thead>
                  <tbody>
                    {pagedUsr.map(u => (
                      <tr key={u._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem' }}>
                            <div className="admin-avatar-mini">{getInitials(u.nome)}</div>
                            <div>
                              <div className="admin-table-name">{u.nome}</div>
                              <div className="admin-table-sub">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="muted">{u.tel || '—'}</td>
                        <td className="muted">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—'}</td>
                        <td>{reservas.filter(r => r.userId === u._id || r.userId?._id === u._id).length}</td>
                        <td><span className={`badge ${STATUS_CLS[u.status]}`}>{u.status}</span></td>
                        <td>
                          <div className="admin-row-actions">
                            <button className="admin-action-btn" title="Ver perfil" onClick={() => setViewUser(u)}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                            <button className="admin-action-btn" title="Editar" onClick={() => { setEditUser(u); setEditUserForm({ nome: u.nome, tel: u.tel || '', genero: u.genero || '' }); }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                            </button>
                            <button className="admin-action-btn" title="Adicionar crédito" onClick={() => setCreditoModal(u._id)}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pagedUsr.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>Nenhum usuário encontrado</td></tr>}
                  </tbody>
                </table>
              </div>
              <Pagination page={usrPage} total={filteredUsr.length} perPage={PER_PAGE} onChange={setUsrPage} />
            </div>
          </section>

          {/* EVENTOS */}
          <section className={`admin-section${tab === 'eventos' ? ' active' : ''}`}>
            <div className="admin-section-header">
              <div><p className="admin-eyebrow">Gestão</p><h2 className="admin-section-h2">EVENTOS</h2></div>
              <button className="btn-admin-primary" onClick={() => { setEventoModal({}); setEventoForm({ nome: '', data: '', hora: '08h–19h', local: 'Podium Arena', vagas: 32, preco: 0, categoria: 'beachtennis', status: 'aberto', nivel: 'Todos os níveis', desc: '' }); }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                Novo Evento
              </button>
            </div>
            <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-card-header">
                <h3>Agenda de Eventos</h3>
                <div className="admin-card-toolbar">
                  <div className="admin-search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input type="text" placeholder="Buscar evento…" value={evtSearch} onChange={e => setEvtSearch(e.target.value)} />
                  </div>
                  <select className="admin-filter-select" value={evtStatus} onChange={e => setEvtStatus(e.target.value)}>
                    <option value="todos">Todos</option>
                    <option value="aberto">Abertos</option>
                    <option value="breve">Em Breve</option>
                    <option value="encerrado">Encerrados</option>
                  </select>
                </div>
              </div>
              <div style={{ padding: '1.2rem' }}>
                <div className="admin-event-grid">
                  {filteredEvt.map(ev => {
                    const evInsc = inscricoes.filter(i => i.eventId === ev._id || i.eventId?._id === ev._id);
                    const pct = Math.min(100, Math.round((evInsc.length / (ev.vagas || 1)) * 100));
                    return (
                      <div key={ev._id} className="admin-event-card">
                        <div className="admin-event-banner">
                          <span className="admin-event-cat">{ev.categoria}</span>
                          <span className={`badge ${STATUS_CLS[ev.status]}`}>{ev.status}</span>
                        </div>
                        <div className="admin-event-body">
                          <div className="admin-event-name">{ev.nome}</div>
                          <div className="admin-event-meta">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                            {fmtDate(ev.data)} · {ev.hora}
                          </div>
                          <div className="admin-event-meta">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                            {ev.local}
                          </div>
                          <div className="admin-event-progress-row">
                            <span>{evInsc.length}<b>/{ev.vagas}</b> inscritos</span>
                            <b>{pct}%</b>
                          </div>
                          <div className="admin-event-progress">
                            <span style={{ width: `${pct}%` }} />
                          </div>
                          <div className="admin-event-actions">
                            <button className="btn-admin-secondary" style={{ fontSize: '.77rem', padding: '.45rem' }} onClick={() => setInscricoesModal(ev)}>Ver inscrições</button>
                            <button className="admin-action-btn" title="Editar" onClick={() => { setEventoModal(ev); setEventoForm({ nome: ev.nome, data: ev.data, hora: ev.hora, local: ev.local, vagas: ev.vagas, preco: ev.preco, categoria: ev.categoria, status: ev.status, nivel: ev.nivel || '', desc: ev.desc || '' }); }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                            </button>
                            <button className="admin-action-btn danger" title="Remover" onClick={() => removerEvento(ev._id)}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredEvt.length === 0 && <p style={{ color: 'var(--gray)', fontSize: '.85rem' }}>Nenhum evento encontrado.</p>}
                </div>
              </div>
            </div>
            <div className="admin-card">
              <div className="admin-card-header"><h3>Inscrições Recentes</h3></div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Atleta</th><th>Evento / Data</th><th>Valor</th><th>Status</th></tr></thead>
                  <tbody>
                    {inscricoes.slice(0, 15).map(i => (
                      <tr key={i._id}>
                        <td><div className="admin-table-name">{i.userId?.nome || i.userName || '—'}</div></td>
                        <td><div className="admin-table-name" style={{ fontSize: '.85rem' }}>{i.eventId?.nome || '—'}</div><div className="admin-table-sub">{fmtDate(i.eventId?.data)}</div></td>
                        <td>{fmtMoney(i.eventId?.preco)}</td>
                        <td><span className={`badge ${STATUS_CLS[i.status] || 'badge-success'}`}>{i.status || 'confirmada'}</span></td>
                      </tr>
                    ))}
                    {inscricoes.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>Sem inscrições</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* FINANCEIRO */}
          <section className={`admin-section${tab === 'financeiro' ? ' active' : ''}`}>
            <div className="admin-section-header"><div><p className="admin-eyebrow">Relatório</p><h2 className="admin-section-h2">FINANCEIRO</h2></div></div>
            <div className="admin-stats" style={{ marginBottom: '1.5rem' }}>
              {[
                { label: 'Receita Total', value: fmtMoney(receitaTotal) },
                { label: 'Receita Reservas', value: fmtMoney(reservas.filter(r => r.status !== 'cancelada').reduce((a, r) => a + Number(r.total || 0), 0)) },
                { label: 'Receita Eventos', value: fmtMoney(inscricoes.reduce((a, i) => a + Number(i.eventId?.preco || 0), 0)) },
                { label: 'Mês Atual', value: fmtMoney(receitaMes) },
              ].map(({ label, value }) => (
                <div key={label} className="admin-stat">
                  <div className="admin-stat-value">{value}</div>
                  <div className="admin-stat-label">{label}</div>
                </div>
              ))}
            </div>
            <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-card-header"><h3>Receita — Últimos 7 Meses</h3></div>
              <div style={{ padding: '.8rem 0' }}><MiniBarChart data={chartData} /></div>
            </div>
            <div className="admin-card">
              <div className="admin-card-header"><h3>Todas as Transações</h3></div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Cliente</th><th>Tipo</th><th>Data</th><th>Pagamento</th><th>Valor</th><th>Status</th></tr></thead>
                  <tbody>
                    {reservas.map(r => (
                      <tr key={r._id}>
                        <td><div className="admin-table-name">{r.userName || '—'}</div></td>
                        <td><span style={{ fontFamily: 'var(--font-cond)', fontSize: '.78rem', letterSpacing: '1px', color: 'var(--gray-light)' }}>RESERVA · {r.modalidade}</span></td>
                        <td className="muted">{fmtDate(r.date)}</td>
                        <td className="muted">{r.payment}</td>
                        <td>{fmtMoney(r.total)}</td>
                        <td><span className={`badge ${STATUS_CLS[r.status]}`}>{r.status}</span></td>
                      </tr>
                    ))}
                    {reservas.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>Sem transações</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* RANKING */}
          <section className={`admin-section${tab === 'ranking' ? ' active' : ''}`}>
            <div className="admin-section-header">
              <div><p className="admin-eyebrow">Gestão</p><h2 className="admin-section-h2">RANKING</h2></div>
              <button className="btn-admin-primary" onClick={() => { setRankForm({ modalidade: 'beachtennis', categoria: 'masculino', entries: [] }); setRankingModal(true); loadRanking('beachtennis', 'masculino'); }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                Atualizar Ranking
              </button>
            </div>
            <div className="admin-rank-grid">
              {[['beachtennis', 'masculino'], ['beachtennis', 'feminino'], ['futevolei', 'masculino'], ['futevolei', 'feminino']].map(([mod, cat]) => {
                const entries = rankings[`${mod}_${cat}`] || [];
                return (
                  <div key={`${mod}-${cat}`} className="admin-card">
                    <div className="rank-admin-card-header">
                      <h3>{mod === 'beachtennis' ? 'Beach Tennis' : 'Futevôlei'} — {cat === 'masculino' ? 'Masculino' : 'Feminino'}</h3>
                      <button className="btn-rank-edit" onClick={() => { setRankForm({ modalidade: mod, categoria: cat, entries: [] }); setRankingModal(true); loadRanking(mod, cat); }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        Editar
                      </button>
                    </div>
                    {entries.length === 0 ? (
                      <div style={{ padding: '1rem 1.2rem', color: 'var(--gray)', fontSize: '.85rem' }}>Sem dados — clique em Editar para adicionar.</div>
                    ) : entries.map((p, i) => (
                      <div key={i} className="rank-admin-row">
                        <div className={`rank-admin-pos${i === 0 ? ' p1' : i === 1 ? ' p2' : i === 2 ? ' p3' : ''}`}>{p.pos}</div>
                        <div>
                          <div className="rank-admin-name">{p.nome}</div>
                          {p.clube && <div className="rank-admin-club">{p.clube}</div>}
                        </div>
                        <div className="rank-admin-stats">
                          <div className="rank-admin-pts">{p.pts}</div>
                          <div className="rank-admin-vd">{p.v}V {p.d}D</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>

          {/* CONFIGURAÇÕES */}
          <section className={`admin-section${tab === 'config' ? ' active' : ''}`}>
            <div className="admin-section-header">
              <div><p className="admin-eyebrow">Sistema</p><h2 className="admin-section-h2">CONFIGURAÇÕES GERAIS</h2></div>
              <button className="btn-admin-primary" onClick={() => toast('Configurações salvas', 'success')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Salvar Alterações
              </button>
            </div>
            <div className="admin-config-wrap">
              <div className="admin-card admin-config-card">
                <div className="admin-config-card-head">
                  <div className="admin-config-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg></div>
                  <div><h3>Dados da Arena</h3><p>Informações exibidas para os clientes</p></div>
                </div>
                <div className="admin-field"><label>Nome do estabelecimento</label><input type="text" defaultValue="Podium Arena" className="cfg-input" /></div>
                <div className="admin-config-row2">
                  <div className="admin-field"><label>CNPJ</label><input type="text" className="cfg-input" /></div>
                  <div className="admin-field"><label>Telefone / WhatsApp</label><input type="text" className="cfg-input" /></div>
                </div>
                <div className="admin-field"><label>Endereço</label><input type="text" defaultValue="Telêmaco Borba — PR" className="cfg-input" /></div>
                <div className="admin-field" style={{ marginBottom: 0 }}><label>E-mail de contato</label><input type="text" defaultValue="contato@podiumarena.com.br" className="cfg-input" /></div>
              </div>

              <div className="admin-config-2col">
                <div className="admin-card admin-config-card">
                  <div className="admin-config-card-head">
                    <div className="admin-config-card-icon blue"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                    <div><h3>Funcionamento</h3><p>Janela disponível para reservas</p></div>
                  </div>
                  <div className="admin-config-row2">
                    <div className="admin-field"><label>Abertura</label><input type="text" defaultValue="06:00" className="cfg-input" /></div>
                    <div className="admin-field"><label>Fechamento</label><input type="text" defaultValue="23:00" className="cfg-input" /></div>
                  </div>
                </div>
                <div className="admin-card admin-config-card">
                  <div className="admin-config-card-head">
                    <div className="admin-config-card-icon green"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                    <div><h3>Regras de Reserva</h3><p>Limites aplicados ao reservar</p></div>
                  </div>
                  <div className="admin-config-row2">
                    <div className="admin-field"><label>Antecedência máx. (dias)</label><input type="number" defaultValue="14" className="cfg-input" /></div>
                    <div className="admin-field"><label>Cancelamento até (h)</label><input type="number" defaultValue="6" className="cfg-input" /></div>
                  </div>
                </div>
              </div>

              <div className="admin-card admin-config-card">
                <div className="admin-config-card-head">
                  <div className="admin-config-card-icon amber"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></div>
                  <div><h3>Notificações</h3><p>Avisos automáticos do sistema</p></div>
                </div>
                {[
                  { label: 'Confirmação por e-mail', sub: 'Enviar comprovante ao confirmar uma reserva' },
                  { label: 'Lembrete por WhatsApp', sub: 'Avisar o cliente 2h antes do horário reservado' },
                  { label: 'Alerta de cancelamento', sub: 'Notificar o admin quando uma reserva for cancelada' },
                  { label: 'Resumo semanal', sub: 'Relatório de ocupação e receita toda segunda-feira' },
                ].map(({ label, sub }) => (
                  <div key={label} className="admin-switch-row">
                    <div><strong>{label}</strong><p>{sub}</p></div>
                    <button className="admin-switch is-on" />
                  </div>
                ))}
              </div>
            </div>
          </section>

        </main>
      </div>
    </>
  );
}
