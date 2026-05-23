/* ═══════════════════════════════════════════
   ADMIN.JS — Painel Administrativo Podium Arena
   ═══════════════════════════════════════════ */

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ─── Utilitários ──────────────────────────
function fmtDate(str) {
  if (!str) return '—';
  const [y,m,d] = str.slice(0,10).split('-');
  return `${d} ${MONTHS[parseInt(m)-1]} ${y}`;
}
function fmtMoney(v) {
  return 'R$ ' + Number(v||0).toLocaleString('pt-BR', {minimumFractionDigits:2});
}
function initials(nome) {
  return (nome||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
}
function adminToast(msg, type='success') {
  const wrap = document.getElementById('adminToastWrap');
  if (!wrap) return;
  const t = document.createElement('div');
  const color = type==='error'?'red':type==='warn'?'gold':'green';
  t.className = 'admin-toast';
  t.innerHTML = `<div class="admin-toast-dot ${color}"></div><span>${msg}</span>`;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(()=>t.remove(), 400); }, 3000);
}

// ─── Dados do localStorage ────────────────
function getUsers()     { return JSON.parse(localStorage.getItem('podium_users')     || '[]'); }
function getBookings()  { return JSON.parse(localStorage.getItem('podium_bookings')  || '[]'); }
function getInscricoes(){ return JSON.parse(localStorage.getItem('podium_inscricoes')|| '[]'); }
function saveUsers(d)    { localStorage.setItem('podium_users',    JSON.stringify(d)); }
function saveBookings(d) { localStorage.setItem('podium_bookings', JSON.stringify(d)); }

// Mock de dados para demo (só cria se não existir)
function seedMockData() {
  const users = getUsers();
  if (users.length === 0) {
    const mockUsers = [
      { id:'a1', nome:'Administrador',   email:'admin@email.com',   cpf:'000.000.000-00', tel:'(43) 9 9000-0000', nasc:'1990-01-01', senha: btoa('senha123'), criadoEm:'2025-10-01T12:00:00Z', ativo:true, admin:true },  
      { id:'u1', nome:'Carlos Pereira',  email:'carlos@email.com', cpf:'111.111.111-11', tel:'(43) 9 9111-1111', nasc:'1990-05-12', senha: btoa('senha123'), criadoEm:'2025-11-10T10:00:00Z', ativo:true },
      { id:'u2', nome:'Ana Beatriz Lima',email:'ana@email.com',    cpf:'222.222.222-22', tel:'(43) 9 9222-2222', nasc:'1995-08-20', senha: btoa('senha123'), criadoEm:'2025-12-01T09:00:00Z', ativo:true },
      { id:'u3', nome:'Rafael Souza',    email:'rafael@email.com', cpf:'333.333.333-33', tel:'(43) 9 9333-3333', nasc:'1988-03-15', senha: btoa('senha123'), criadoEm:'2026-01-05T08:00:00Z', ativo:true },
      { id:'u4', nome:'Fernanda Costa',  email:'fernanda@email.com',cpf:'444.444.444-44', tel:'(43) 9 9444-4444', nasc:'1993-11-30', senha: btoa('senha123'), criadoEm:'2026-02-14T11:00:00Z', ativo:false },
      { id:'u5', nome:'Lucas Martins',   email:'lucas@email.com',  cpf:'555.555.555-55', tel:'(43) 9 9555-5555', nasc:'1997-07-07', senha: btoa('senha123'), criadoEm:'2026-03-20T15:00:00Z', ativo:true },
    ];
    saveUsers(mockUsers);
  }

  const bookings = getBookings();
  if (bookings.length === 0) {
    const today = new Date();
    const dd = (n) => new Date(today.getTime() + n*86400000).toISOString().slice(0,10);
    const mockBookings = [
      { id:'b1', userId:'u1', courtName:'Quadra 01 — Beach Tennis', date: dd(2),  time:'14:00', price:80,  status:'confirmada', criadaEm: dd(-5)+'T10:00:00Z' },
      { id:'b2', userId:'u2', courtName:'Quadra 02 — Futevôlei',   date: dd(3),  time:'19:00', price:70,  status:'confirmada', criadaEm: dd(-4)+'T09:00:00Z' },
      { id:'b3', userId:'u3', courtName:'Quadra 01 — Beach Tennis', date: dd(5),  time:'08:00', price:80,  status:'confirmada', criadaEm: dd(-3)+'T08:00:00Z' },
      { id:'b4', userId:'u5', courtName:'Quadra 03 — Vôlei de Praia',date:dd(1), time:'10:00', price:60,  status:'confirmada', criadaEm: dd(-2)+'T07:00:00Z' },
      { id:'b5', userId:'u1', courtName:'Quadra 04 — Pickleball',  date: dd(-2), time:'16:00', price:65,  status:'concluida',  criadaEm: dd(-10)+'T12:00:00Z'},
      { id:'b6', userId:'u4', courtName:'Quadra 02 — Futevôlei',   date: dd(-5), time:'18:00', price:70,  status:'cancelada',  criadaEm: dd(-12)+'T11:00:00Z'},
      { id:'b7', userId:'u2', courtName:'Quadra 01 — Beach Tennis', date: dd(-1), time:'07:00', price:80,  status:'concluida',  criadaEm: dd(-8)+'T10:00:00Z' },
      { id:'b8', userId:'u3', courtName:'Quadra 03 — Vôlei de Praia',date:dd(7), time:'09:00', price:60,  status:'confirmada', criadaEm: dd(-1)+'T09:00:00Z' },
    ];
    saveBookings(mockBookings);
  }

  const insc = getInscricoes();
  if (insc.length === 0) {
    const today = new Date();
    const dd = (n) => new Date(today.getTime() + n*86400000).toISOString().slice(0,10);
    const mockInsc = [
      { id:'i1', userId:'u1', eventNome:'Torneio Aberto de Beach Tennis', eventData: dd(8),  categoria:'beachtennis', preco:50, criadaEm: dd(-3)+'T10:00:00Z' },
      { id:'i2', userId:'u2', eventNome:'Torneio Aberto de Beach Tennis', eventData: dd(8),  categoria:'beachtennis', preco:50, criadaEm: dd(-3)+'T11:00:00Z' },
      { id:'i3', userId:'u3', eventNome:'Liga de Futevôlei — Etapa TB',   eventData: dd(15), categoria:'futevolei',   preco:40, criadaEm: dd(-2)+'T09:00:00Z' },
      { id:'i4', userId:'u5', eventNome:'Copa Podium Arena — Beach Tennis',eventData: dd(51),categoria:'beachtennis', preco:80, criadaEm: dd(-1)+'T14:00:00Z' },
    ];
    localStorage.setItem('podium_inscricoes', JSON.stringify(mockInsc));
  }
}

// ─── Estado da paginação ──────────────────
const PAGE_SIZE = 8;
let state = {
  reservas: { page: 1, filter: 'todas', search: '' },
  usuarios: { page: 1, filter: 'todos', search: '' },
  eventos:  { page: 1, filter: 'todos', search: '' },
};

// ─── Navegação ────────────────────────────
function adminTab(tab) {
  document.querySelectorAll('.admin-nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.tab === tab)
  );
  document.querySelectorAll('.admin-section').forEach(el =>
    el.classList.toggle('active', el.id === `admin-${tab}`)
  );
  history.replaceState(null, '', `?aba=${tab}`);
}

// ══════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════
function renderDashboard() {
  const users    = getUsers();
  const bookings = getBookings();
  const insc     = getInscricoes();
  const now      = new Date().toISOString().slice(0,10);

  const totalRec = bookings.filter(b => b.status !== 'cancelada')
                           .reduce((s,b) => s + (b.price||0), 0);
  const proximas = bookings.filter(b => b.date >= now && b.status === 'confirmada').length;
  const ativos   = users.filter(u => u.ativo !== false).length;

  set('dashTotalRec',   fmtMoney(totalRec));
  set('dashReservas',   bookings.length);
  set('dashUsuarios',   ativos);
  set('dashEventosInsc',insc.length);

  // Mini gráfico de barras — últimos 7 meses
  renderMiniChart();

  // Últimas reservas
  const ultReservas = [...bookings]
    .sort((a,b) => b.criadaEm?.localeCompare(a.criadaEm||''))
    .slice(0,5);
  const usersMap = Object.fromEntries(getUsers().map(u=>[u.id,u]));

  const el = document.getElementById('dashLastBookings');
  if (el) el.innerHTML = ultReservas.length === 0
    ? adminEmptyHTML('Nenhuma reserva ainda')
    : ultReservas.map(b => {
        const u = usersMap[b.userId] || {};
        return `
        <div class="finance-row">
          <div class="finance-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg></div>
          <div>
            <div class="finance-desc">${b.courtName||'—'}</div>
            <div class="finance-meta">${u.nome||'Usuário'} · ${fmtDate(b.date)} às ${b.time||'—'}</div>
          </div>
          <div style="text-align:right">
            <div class="finance-value">${fmtMoney(b.price)}</div>
            <div style="margin-top:.2rem">${badgeHTML(b.status)}</div>
          </div>
        </div>`;
      }).join('');

  // Últimos usuários cadastrados
  const ultUsers = [...users].sort((a,b)=>b.criadoEm?.localeCompare(a.criadoEm||'')).slice(0,4);
  const ulEl = document.getElementById('dashLastUsers');
  if (ulEl) ulEl.innerHTML = ultUsers.map(u => `
    <div class="finance-row">
      <div class="admin-avatar-mini">${initials(u.nome)}</div>
      <div>
        <div class="finance-desc">${u.nome}</div>
        <div class="finance-meta">${u.email} · Desde ${fmtDate(u.criadoEm?.slice(0,10))}</div>
      </div>
      <div>${u.ativo===false ? '<span class="badge badge-red">Bloqueado</span>' : '<span class="badge badge-green">Ativo</span>'}</div>
    </div>`).join('');
}

function renderMiniChart() {
  const bookings = getBookings();
  const now = new Date();
  const bars = [];
  for (let i=6; i>=0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const total = bookings.filter(b => (b.criadaEm||'').startsWith(key) && b.status!=='cancelada')
                          .reduce((s,b)=>s+(b.price||0),0);
    bars.push({ label: MONTHS[d.getMonth()], value: total });
  }
  const max = Math.max(...bars.map(b=>b.value), 1);
  const el = document.getElementById('revenueChart');
  if (!el) return;
  el.innerHTML = bars.map(b => `
    <div class="mini-bar-wrap" title="${fmtMoney(b.value)}">
      <div class="mini-bar" style="height:${Math.max(4, Math.round(b.value/max*68))}px"></div>
      <div class="mini-bar-label">${b.label}</div>
    </div>`).join('');
}

// ══════════════════════════════════════════
// RESERVAS
// ══════════════════════════════════════════
function renderReservas() {
  const { filter, search, page } = state.reservas;
  let data = getBookings();
  const now = new Date().toISOString().slice(0,10);
  const usersMap = Object.fromEntries(getUsers().map(u=>[u.id,u]));

  // Enriquece com nome
  data = data.map(b => ({ ...b, _userName: usersMap[b.userId]?.nome || 'Usuário' }));

  // Filtro status
  if (filter === 'proximas')   data = data.filter(b => b.date >= now && b.status !== 'cancelada');
  if (filter === 'concluidas') data = data.filter(b => b.date < now  || b.status === 'concluida');
  if (filter === 'canceladas') data = data.filter(b => b.status === 'cancelada');

  // Busca
  if (search) {
    const q = search.toLowerCase();
    data = data.filter(b => b._userName.toLowerCase().includes(q) || (b.courtName||'').toLowerCase().includes(q));
  }

  // Ordena
  data.sort((a,b) => b.date.localeCompare(a.date));

  // Paginação
  const total = data.length;
  const pages = Math.max(1, Math.ceil(total/PAGE_SIZE));
  const cur   = Math.min(page, pages);
  const slice = data.slice((cur-1)*PAGE_SIZE, cur*PAGE_SIZE);

  const tbody = document.getElementById('reservasTableBody');
  if (!tbody) return;

  tbody.innerHTML = slice.length === 0
    ? `<tr><td colspan="7"><div class="admin-empty"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg><h4>Nenhuma reserva</h4><p>Tente outro filtro.</p></div></td></tr>`
    : slice.map(b => `
      <tr>
        <td><span style="font-family:var(--font-cond);font-size:.7rem;letter-spacing:1px;color:var(--gray)">PD-${(b.id||'').slice(-6).toUpperCase()}</span></td>
        <td>
          <div class="admin-avatar-cell">
            <div class="admin-avatar-mini">${initials(b._userName)}</div>
            <div>
              <div class="admin-table-name">${b._userName}</div>
              <div class="admin-table-sub">${fmtDate(b.date)} às ${b.time||'—'}</div>
            </div>
          </div>
        </td>
        <td>${b.courtName||'—'}</td>
        <td>${fmtMoney(b.price)}</td>
        <td>${badgeHTML(b.status)}</td>
        <td class="admin-row-actions">
          ${b.status==='confirmada' ? `<button class="admin-action-btn success" title="Confirmar" onclick="confirmarReserva('${b.id}')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>` : ''}
          ${b.status==='confirmada' ? `<button class="admin-action-btn danger" title="Cancelar" onclick="cancelarReservaAdmin('${b.id}')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg></button>` : ''}
        </td>
      </tr>`).join('');

  renderPagination('reservasPag', cur, pages, total, (p) => {
    state.reservas.page = p;
    renderReservas();
  });
}

function confirmarReserva(id) {
  const bookings = getBookings();
  const idx = bookings.findIndex(b => b.id === id);
  if (idx === -1) return;
  bookings[idx].status = 'concluida';
  saveBookings(bookings);
  adminToast('Reserva marcada como concluída.');
  renderReservas();
  renderDashboard();
}

function cancelarReservaAdmin(id) {
  openConfirmModal(
    'Cancelar Reserva?',
    'Esta ação não pode ser desfeita.',
    () => {
      const bookings = getBookings();
      const idx = bookings.findIndex(b => b.id === id);
      if (idx !== -1) { bookings[idx].status = 'cancelada'; saveBookings(bookings); }
      adminToast('Reserva cancelada.', 'error');
      renderReservas();
      renderDashboard();
    }
  );
}

// ══════════════════════════════════════════
// USUÁRIOS
// ══════════════════════════════════════════
function renderUsuarios() {
  const { filter, search, page } = state.usuarios;
  let data = getUsers();

  if (filter === 'ativos')    data = data.filter(u => u.ativo !== false);
  if (filter === 'bloqueados') data = data.filter(u => u.ativo === false);

  if (search) {
    const q = search.toLowerCase();
    data = data.filter(u => u.nome?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }

  data.sort((a,b) => (b.criadoEm||'').localeCompare(a.criadoEm||''));

  const total = data.length;
  const pages = Math.max(1, Math.ceil(total/PAGE_SIZE));
  const cur   = Math.min(page, pages);
  const slice = data.slice((cur-1)*PAGE_SIZE, cur*PAGE_SIZE);

  const bookings  = getBookings();
  const inscricoes = getInscricoes();

  const tbody = document.getElementById('usuariosTableBody');
  if (!tbody) return;

  tbody.innerHTML = slice.length === 0
    ? `<tr><td colspan="6"><div class="admin-empty"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><h4>Nenhum usuário</h4><p>Tente outro filtro.</p></div></td></tr>`
    : slice.map(u => {
        const nRes = bookings.filter(b=>b.userId===u.id).length;
        const nEv  = inscricoes.filter(i=>i.userId===u.id).length;
        const ativo = u.ativo !== false;
        return `
        <tr>
          <td>
            <div class="admin-avatar-cell">
              <div class="admin-avatar-mini">${initials(u.nome)}</div>
              <div>
                <div class="admin-table-name">${u.nome}</div>
                <div class="admin-table-sub">${u.email}</div>
              </div>
            </div>
          </td>
          <td><span style="font-family:var(--font-cond);font-size:.8rem;color:var(--gray)">${u.tel||'—'}</span></td>
          <td><span style="font-family:var(--font-cond);font-size:.8rem;color:var(--gray)">${fmtDate(u.criadoEm?.slice(0,10))}</span></td>
          <td>
            <span style="font-family:var(--font-cond);font-size:.8rem">${nRes} res. · ${nEv} ev.</span>
          </td>
          <td>${ativo ? '<span class="badge badge-green">Ativo</span>' : '<span class="badge badge-red">Bloqueado</span>'}</td>
          <td class="admin-row-actions">
            <button class="admin-action-btn" title="Editar" onclick="editarUsuario('${u.id}')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
            <button class="admin-action-btn ${ativo?'danger':'success'}" title="${ativo?'Bloquear':'Desbloquear'}" onclick="toggleUsuario('${u.id}')">
              ${ativo
                ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" x2="19.07" y1="4.93" y2="19.07"/></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`}
            </button>
          </td>
        </tr>`;
      }).join('');

  renderPagination('usuariosPag', cur, pages, total, (p) => {
    state.usuarios.page = p;
    renderUsuarios();
  });
}

function toggleUsuario(id) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return;
  const novoStatus = users[idx].ativo === false;
  users[idx].ativo = novoStatus;
  saveUsers(users);
  adminToast(novoStatus ? 'Usuário desbloqueado.' : 'Usuário bloqueado.', novoStatus ? 'success' : 'warn');
  renderUsuarios();
  renderDashboard();
}

function editarUsuario(id) {
  const users = getUsers();
  const u = users.find(u => u.id === id);
  if (!u) return;
  set('editUserId',  u.id,    'v');
  set('editNome',    u.nome,  'v');
  set('editEmail',   u.email, 'v');
  set('editTel',     u.tel||'','v');
  openModal('modalEditUser');
}

function salvarEdicaoUsuario() {
  const id    = document.getElementById('editUserId')?.value;
  const nome  = document.getElementById('editNome')?.value.trim();
  const tel   = document.getElementById('editTel')?.value.trim();
  if (!nome) { adminToast('Nome obrigatório.','error'); return; }
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return;
  users[idx].nome = nome;
  users[idx].tel  = tel;
  saveUsers(users);
  closeModal('modalEditUser');
  adminToast('Usuário atualizado com sucesso.');
  renderUsuarios();
}

// ══════════════════════════════════════════
// EVENTOS E INSCRIÇÕES
// ══════════════════════════════════════════
const EVENTOS_DEFAULT = [
  { id:'ev1', nome:'Torneio Aberto de Beach Tennis', data:'2026-05-22', hora:'14h–18h', local:'Quadras de Areia', vagas:64, categoria:'beachtennis', preco:50, status:'aberto', desc:'' },
  { id:'ev2', nome:'Liga de Futevôlei — Etapa TB',   data:'2026-05-29', hora:'19h–22h', local:'Arena Central',   vagas:32, categoria:'futevolei',   preco:40, status:'aberto', desc:'' },
  { id:'ev3', nome:'Clínica de Pickleball c/ Profissionais', data:'2026-06-06', hora:'09h–12h', local:'Quadra Premium', vagas:40, categoria:'pickleball', preco:60, status:'aberto', desc:'' },
  { id:'ev4', nome:'Copa Podium Arena — Beach Tennis',data:'2026-07-04', hora:'08h–19h', local:'Todas as Quadras', vagas:128, categoria:'beachtennis', preco:80, status:'breve', desc:'' },
];
function getEventos()    { const d = localStorage.getItem('podium_eventos'); return d ? JSON.parse(d) : EVENTOS_DEFAULT; }
function saveEventos(d)  { localStorage.setItem('podium_eventos', JSON.stringify(d)); }

function renderEventos() {
  const { filter, search, page } = state.eventos;
  const insc = getInscricoes();
  const usersMap = Object.fromEntries(getUsers().map(u=>[u.id,u]));

  let eventos = getEventos();
  if (filter !== 'todos') eventos = eventos.filter(e => e.status === filter);
  if (search) {
    const q = search.toLowerCase();
    eventos = eventos.filter(e => e.nome.toLowerCase().includes(q));
  }

  // Tabela de eventos
  const evEl = document.getElementById('eventosTableBody');
  if (evEl) {
    evEl.innerHTML = eventos.map(ev => {
      const nInsc = insc.filter(i => i.eventNome === ev.nome).length;
      const pct   = Math.round(nInsc/ev.vagas*100);
      return `
      <tr>
        <td>
          <div class="admin-table-name">${ev.nome}</div>
          <div class="admin-table-sub">${fmtDate(ev.data)} · ${ev.hora}</div>
        </td>
        <td><span style="font-family:var(--font-cond);font-size:.8rem;color:var(--gray)">${ev.local}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:.5rem">
            <div style="flex:1;height:4px;background:var(--border);max-width:80px">
              <div style="width:${pct}%;height:100%;background:var(--gold)"></div>
            </div>
            <span style="font-family:var(--font-cond);font-size:.78rem;color:var(--gray-light)">${nInsc}/${ev.vagas}</span>
          </div>
        </td>
        <td>${fmtMoney(ev.preco)}</td>
        <td>${ev.status==='aberto'
          ? '<span class="badge badge-green">Aberto</span>'
          : '<span class="badge badge-amber">Em Breve</span>'}</td>
        <td class="admin-row-actions">
          <button class="admin-action-btn" title="Ver inscrições" onclick="verInscricoes('${ev.id}','${ev.nome}')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="admin-action-btn" title="Editar evento" onclick="editarEvento('${ev.id}')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
          <button class="admin-action-btn danger" title="Excluir evento" onclick="excluirEvento('${ev.id}')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
        </td>
      </tr>`;
    }).join('');
  }

  // Inscrições recentes
  const inscRecentes = [...insc]
    .sort((a,b) => (b.criadaEm||'').localeCompare(a.criadaEm||''))
    .slice(0, 10);

  const total = inscRecentes.length;
  const pages = Math.max(1, Math.ceil(total/PAGE_SIZE));
  const cur   = Math.min(page, pages);
  const slice = inscRecentes.slice((cur-1)*PAGE_SIZE, cur*PAGE_SIZE);

  const iEl = document.getElementById('inscricoesTableBody');
  if (iEl) {
    iEl.innerHTML = slice.length === 0
      ? `<tr><td colspan="5"><div class="admin-empty"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg><h4>Nenhuma inscrição</h4><p>—</p></div></td></tr>`
      : slice.map(i => {
          const u = usersMap[i.userId] || {};
          return `
          <tr>
            <td>
              <div class="admin-avatar-cell">
                <div class="admin-avatar-mini">${initials(u.nome||'?')}</div>
                <div>
                  <div class="admin-table-name">${u.nome||'—'}</div>
                  <div class="admin-table-sub">${u.email||'—'}</div>
                </div>
              </div>
            </td>
            <td>
              <div class="admin-table-name" style="font-size:.88rem">${i.eventNome}</div>
              <div class="admin-table-sub">${fmtDate(i.eventData)}</div>
            </td>
            <td>${fmtMoney(i.preco)}</td>
            <td><span class="badge badge-gold">Inscrito</span></td>
            <td class="admin-row-actions">
              <button class="admin-action-btn danger" title="Remover inscrição" onclick="removerInscricao('${i.id}')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
            </td>
          </tr>`;
        }).join('');
  }

  renderPagination('inscricoesPag', cur, pages, total, (p) => {
    state.eventos.page = p;
    renderEventos();
  });
}

function verInscricoes(evId, evNome) {
  const insc = getInscricoes().filter(i => i.eventNome === evNome);
  const usersMap = Object.fromEntries(getUsers().map(u=>[u.id,u]));
  const el = document.getElementById('modalInscListBody');
  document.getElementById('modalInscTitle').textContent = evNome;
  if (el) {
    el.innerHTML = insc.length === 0
      ? '<p style="color:var(--gray);font-size:.88rem;padding:1rem 0">Nenhuma inscrição ainda.</p>'
      : insc.map(i => {
          const u = usersMap[i.userId]||{};
          return `<div style="display:flex;align-items:center;gap:.8rem;padding:.7rem 0;border-bottom:1px solid var(--border)">
            <div class="admin-avatar-mini">${initials(u.nome||'?')}</div>
            <div><div style="font-family:var(--font-cond);font-size:.9rem;font-weight:600">${u.nome||'—'}</div>
            <div style="font-size:.78rem;color:var(--gray)">${u.email||'—'}</div></div>
            <span class="badge badge-gold" style="margin-left:auto">Inscrito</span>
          </div>`;
        }).join('');
  }
  openModal('modalInscricoes');
}

function removerInscricao(id) {
  openConfirmModal('Remover inscrição?', 'O atleta será removido do evento.', () => {
    const insc = getInscricoes().filter(i => i.id !== id);
    localStorage.setItem('podium_inscricoes', JSON.stringify(insc));
    adminToast('Inscrição removida.', 'warn');
    renderEventos();
  });
}

// ══════════════════════════════════════════
// FINANCEIRO
// ══════════════════════════════════════════
function renderFinanceiro() {
  const bookings = getBookings();
  const insc     = getInscricoes();
  const now      = new Date().toISOString().slice(0,10);
  const thisMonth = now.slice(0,7);
  const lastMonth = (() => {
    const d = new Date(); d.setMonth(d.getMonth()-1);
    return d.toISOString().slice(0,7);
  })();

  const rec  = b => b.status !== 'cancelada';
  const total      = bookings.filter(rec).reduce((s,b)=>s+(b.price||0),0);
  const totalInsc  = insc.reduce((s,i)=>s+(i.preco||0),0);
  const mesAtual   = bookings.filter(b=>rec(b)&&(b.criadaEm||'').startsWith(thisMonth)).reduce((s,b)=>s+(b.price||0),0);
  const mesPassado = bookings.filter(b=>rec(b)&&(b.criadaEm||'').startsWith(lastMonth)).reduce((s,b)=>s+(b.price||0),0);
  const delta      = mesPassado > 0 ? Math.round((mesAtual-mesPassado)/mesPassado*100) : 0;

  set('finTotalGeral',  fmtMoney(total + totalInsc));
  set('finReservas',    fmtMoney(total));
  set('finEventos',     fmtMoney(totalInsc));
  set('finMesAtual',    fmtMoney(mesAtual));

  const deltaEl = document.getElementById('finDelta');
  if (deltaEl) {
    deltaEl.textContent = (delta >= 0 ? '+' : '') + delta + '% vs mês anterior';
    deltaEl.className = 'admin-stat-delta' + (delta < 0 ? ' neg' : '');
  }

  // Gráfico de barras
  renderMiniChart();
  const chartEl = document.getElementById('revenueChartFin');
  if (chartEl) {
    const mainChart = document.getElementById('revenueChart');
    if (mainChart) chartEl.innerHTML = mainChart.innerHTML;
  }

  // Transações recentes
  const usersMap = Object.fromEntries(getUsers().map(u=>[u.id,u]));
  const reservasRec = bookings.map(b=>({...b, _type:'reserva', _user: usersMap[b.userId]?.nome||'Usuário', _date: b.criadaEm}));
  const inscRec     = insc.map(i=>({...i, price: i.preco, _type:'evento', _user: usersMap[i.userId]?.nome||'Usuário', _date: i.criadaEm, courtName: i.eventNome, status:'inscrito'}));
  const all = [...reservasRec, ...inscRec]
    .sort((a,b)=>(b._date||'').localeCompare(a._date||''))
    .slice(0,12);

  const el = document.getElementById('finTransacoes');
  if (el) {
    el.innerHTML = all.length === 0
      ? adminEmptyHTML('Nenhuma transação')
      : all.map(t => {
          const isCanceled = t.status === 'cancelada';
          return `
          <div class="finance-row">
            <div class="finance-icon">
              ${t._type==='evento'
                ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`
              }
            </div>
            <div>
              <div class="finance-desc">${t.courtName||t.eventNome||'—'}</div>
              <div class="finance-meta">${t._user} · ${fmtDate((t._date||'').slice(0,10))}</div>
            </div>
            <div style="text-align:right">
              <div class="finance-value ${isCanceled?'neg':''}">${isCanceled?'-':''}${fmtMoney(t.price)}</div>
              <div style="margin-top:.2rem">${badgeHTML(t.status)}</div>
            </div>
          </div>`;
        }).join('');
  }
}

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════
function badgeHTML(status) {
  const map = {
    confirmada: 'badge-gold',
    concluida:  'badge-green',
    cancelada:  'badge-red',
    inscrito:   'badge-gold',
  };
  const label = { confirmada:'Confirmada', concluida:'Concluída', cancelada:'Cancelada', inscrito:'Inscrito' };
  return `<span class="badge ${map[status]||'badge-gray'}">${label[status]||status}</span>`;
}

function adminEmptyHTML(msg) {
  return `<div class="admin-empty"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg><h4>${msg}</h4></div>`;
}

function set(id, val, attr='textContent') {
  const el = document.getElementById(id);
  if (!el) return;
  if (attr === 'v') el.value = val;
  else el[attr] = val;
}

function renderPagination(containerId, cur, pages, total, onClick) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const start = ((cur-1)*PAGE_SIZE)+1;
  const end   = Math.min(cur*PAGE_SIZE, total);
  el.innerHTML = `
    <span class="admin-pagination-info">Mostrando ${total===0?0:start}–${end} de ${total}</span>
    <div class="admin-pagination-btns">
      <button class="admin-page-btn" ${cur<=1?'disabled':''} onclick="(${onClick.toString()})(${cur-1})">‹</button>
      ${Array.from({length:pages},(_,i)=>`<button class="admin-page-btn ${i+1===cur?'active':''}" onclick="(${onClick.toString()})(${i+1})">${i+1}</button>`).join('')}
      <button class="admin-page-btn" ${cur>=pages?'disabled':''} onclick="(${onClick.toString()})(${cur+1})">›</button>
    </div>`;
}

// ── Modais ──────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

let _confirmCallback = null;
function openConfirmModal(title, text, cb) {
  _confirmCallback = cb;
  set('confirmTitle', title);
  set('confirmText',  text);
  openModal('modalConfirm');
}
function confirmAction() {
  closeModal('modalConfirm');
  if (_confirmCallback) { _confirmCallback(); _confirmCallback = null; }
}

// ── Sidebar mobile ───────────────────────
function toggleAdminMenu() {
  const sidebar   = document.getElementById('adminSidebar');
  const overlay   = document.getElementById('adminOverlay');
  const hamburger = document.getElementById('adminHamburger');
  sidebar?.classList.toggle('open');
  overlay?.classList.toggle('open');
  hamburger?.classList.toggle('open');
}

// ══════════════════════════════════════════
// INICIALIZAÇÃO
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Guard: precisa estar logado e ter isAdmin
  const session = typeof Auth !== 'undefined' ? Auth.getUser() : null;
  if (!session) { window.location.href = '../index.html'; return; }

  const users  = getUsers();
  const me     = users.find(u => u.id === session.id);
    if (!me?.admin) {
    alert('Acesso restrito. Você não tem permissão de administrador.');
    window.location.href = '../index.html';
    return;
  }

  // Topbar
  const ini = initials(session.nome||'A');
  set('adminTopbarAvatar', ini);
  set('adminTopbarName',   session.nome||'Admin');

  // Logout
  document.getElementById('btnAdminLogout')?.addEventListener('click', () => {
    abrirModalLogoutAdmin();
  });

  // Nav
  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      adminTab(item.dataset.tab);
      toggleAdminMenu();
    });
  });

  // Seeds + render inicial
  seedMockData();
  renderDashboard();
  renderReservas();
  renderUsuarios();
  renderEventos();
  renderFinanceiro();
  renderRankingAdmin();

  // Aba inicial
  const params = new URLSearchParams(window.location.search);
  adminTab(params.get('aba') || 'dashboard');

  // Busca e filtros — Reservas
  document.getElementById('reservasSearch')?.addEventListener('input', e => {
    state.reservas.search = e.target.value; state.reservas.page = 1; renderReservas();
  });
  document.getElementById('reservasFilter')?.addEventListener('change', e => {
    state.reservas.filter = e.target.value; state.reservas.page = 1; renderReservas();
  });

  // Busca e filtros — Usuários
  document.getElementById('usuariosSearch')?.addEventListener('input', e => {
    state.usuarios.search = e.target.value; state.usuarios.page = 1; renderUsuarios();
  });
  document.getElementById('usuariosFilter')?.addEventListener('change', e => {
    state.usuarios.filter = e.target.value; state.usuarios.page = 1; renderUsuarios();
  });

  // Busca e filtros — Eventos
  document.getElementById('eventosSearch')?.addEventListener('input', e => {
    state.eventos.search = e.target.value; state.eventos.page = 1; renderEventos();
  });
  document.getElementById('eventosFilter')?.addEventListener('change', e => {
    state.eventos.filter = e.target.value; state.eventos.page = 1; renderEventos();
  });
});


// ─── Modal de Logout Admin ────────────────
function abrirModalLogoutAdmin() {
  let modal = document.getElementById('logoutModalAdmin');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'logoutModalAdmin';
    modal.className = 'logout-modal-overlay';
    modal.innerHTML = `
      <div class="logout-modal">
        <div class="logout-modal-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" x2="9" y1="12" y2="12"/>
          </svg>
        </div>
        <h3 class="logout-modal-title">Sair da Conta?</h3>
        <p class="logout-modal-sub">Você será desconectado do painel administrativo.</p>
        <div class="logout-modal-actions">
          <button class="logout-modal-btn-keep" onclick="fecharModalLogoutAdmin()">Cancelar</button>
          <button class="logout-modal-btn-confirm" onclick="confirmarLogoutAdmin()">Sair</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) fecharModalLogoutAdmin(); });
    document.body.appendChild(modal);
  }
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function fecharModalLogoutAdmin() {
  const modal = document.getElementById('logoutModalAdmin');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

function confirmarLogoutAdmin() {
  fecharModalLogoutAdmin();
  Auth.logout();
  window.location.replace('../index.html');
}

// Exports globais
window.adminTab          = adminTab;
window.toggleAdminMenu   = toggleAdminMenu;
window.confirmarReserva  = confirmarReserva;
window.cancelarReservaAdmin = cancelarReservaAdmin;
window.toggleUsuario     = toggleUsuario;
window.editarUsuario     = editarUsuario;
window.salvarEdicaoUsuario = salvarEdicaoUsuario;
window.removerInscricao  = removerInscricao;
window.verInscricoes     = verInscricoes;
window.openModal         = openModal;
window.closeModal        = closeModal;
window.confirmAction        = confirmAction;
window.abrirModalLogoutAdmin  = abrirModalLogoutAdmin;
window.fecharModalLogoutAdmin = fecharModalLogoutAdmin;
window.confirmarLogoutAdmin   = confirmarLogoutAdmin;
window.abrirNovoEvento   = abrirNovoEvento;
window.editarEvento      = editarEvento;
window.excluirEvento     = excluirEvento;
window.salvarEvento      = salvarEvento;
window.abrirModalRanking = abrirModalRanking;
window.salvarRanking     = salvarRanking;
window.addRankEntry      = addRankEntry;

// ══════════════════════════════════════════
// NOVO EVENTO / EDITAR EVENTO
// ══════════════════════════════════════════
function abrirNovoEvento() {
  document.getElementById('novoEventoTitle').textContent = 'Novo Evento';
  document.getElementById('editEventoId').value = '';
  ['evNome','evData','evHora','evLocal','evDesc'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  document.getElementById('evVagas').value = '';
  document.getElementById('evPreco').value = '';
  document.getElementById('evCategoria').value = 'beachtennis';
  document.getElementById('evStatus').value = 'aberto';
  openModal('modalNovoEvento');
}

function editarEvento(id) {
  const ev = getEventos().find(e => e.id === id);
  if (!ev) return;
  document.getElementById('novoEventoTitle').textContent = 'Editar Evento';
  document.getElementById('editEventoId').value = ev.id;
  document.getElementById('evNome').value   = ev.nome  || '';
  document.getElementById('evData').value   = ev.data  || '';
  document.getElementById('evHora').value   = ev.hora  || '';
  document.getElementById('evLocal').value  = ev.local || '';
  document.getElementById('evVagas').value  = ev.vagas || '';
  document.getElementById('evPreco').value  = ev.preco || '';
  document.getElementById('evCategoria').value = ev.categoria || 'beachtennis';
  document.getElementById('evStatus').value = ev.status || 'aberto';
  document.getElementById('evDesc').value   = ev.desc  || '';
  openModal('modalNovoEvento');
}

function salvarEvento() {
  const nome = (document.getElementById('evNome').value || '').trim();
  const data = document.getElementById('evData').value;
  if (!nome) { adminToast('Informe o nome do evento.','warn'); return; }
  if (!data) { adminToast('Informe a data do evento.','warn'); return; }

  const editId = document.getElementById('editEventoId').value;
  const eventos = getEventos();

  const payload = {
    nome,
    data,
    hora:      document.getElementById('evHora').value.trim(),
    local:     document.getElementById('evLocal').value.trim(),
    vagas:     parseInt(document.getElementById('evVagas').value) || 0,
    preco:     parseFloat(document.getElementById('evPreco').value) || 0,
    categoria: document.getElementById('evCategoria').value,
    status:    document.getElementById('evStatus').value,
    desc:      document.getElementById('evDesc').value.trim(),
  };

  if (editId) {
    const idx = eventos.findIndex(e => e.id === editId);
    if (idx !== -1) eventos[idx] = { ...eventos[idx], ...payload };
    adminToast('Evento atualizado com sucesso!');
  } else {
    payload.id = 'ev_' + Date.now();
    eventos.push(payload);
    adminToast('Evento criado com sucesso!');
  }

  saveEventos(eventos);
  closeModal('modalNovoEvento');
  renderEventos();
}

function excluirEvento(id) {
  openConfirmModal('Excluir Evento?', 'Esta ação não pode ser desfeita. O evento e suas inscrições serão removidos.', () => {
    const eventos = getEventos().filter(e => e.id !== id);
    saveEventos(eventos);
    adminToast('Evento excluído.', 'warn');
    renderEventos();
  });
}

// ══════════════════════════════════════════
// RANKING ADMIN
// ══════════════════════════════════════════
const RANKING_DEFAULT = {
  beachtennis: {
    masculino: [
      { pos:1, nome:'Roberto & Sandro',   clube:'TB Beach Masters', pts:2100, v:24, d:2, pj:26 },
      { pos:2, nome:'Vinícius & Eduardo', clube:'Podium Academy',   pts:1980, v:22, d:4, pj:26 },
      { pos:3, nome:'Leandro & Ricardo',  clube:'Elite Beach',      pts:1860, v:20, d:5, pj:25 },
      { pos:4, nome:'Paulo & Wesley',     clube:'Podium Arena',     pts:1730, v:18, d:7, pj:25 },
      { pos:5, nome:'Alex & Renato',      clube:'TB Tennis Club',   pts:1610, v:17, d:8, pj:25 },
    ],
    feminino: [
      { pos:1, nome:'Rafaela & Débora',  clube:'Podium Academy', pts:2020, v:23, d:2, pj:25 },
      { pos:2, nome:'Monique & Aline',   clube:'TB Beach Elite',  pts:1900, v:21, d:3, pj:24 },
      { pos:3, nome:'Sabrina & Talita',  clube:'Podium Arena',    pts:1780, v:19, d:5, pj:24 },
      { pos:4, nome:'Renata & Cris',     clube:'Beach Masters',   pts:1650, v:17, d:6, pj:23 },
      { pos:5, nome:'Bruna & Giovana',   clube:'Elite Tennis',    pts:1520, v:16, d:7, pj:23 },
    ],
  },
  futevolei: {
    masculino: [
      { pos:1, nome:'Carlos & Pedro',   clube:'Podium Academy', pts:1840, v:22, d:3, pj:25 },
      { pos:2, nome:'Rafael & Thiago',  clube:'Elite Beach TB',  pts:1720, v:19, d:5, pj:24 },
      { pos:3, nome:'Lucas & Marcos',   clube:'Arena Pro',       pts:1610, v:18, d:7, pj:25 },
      { pos:4, nome:'André & Felipe',   clube:'TB Sports Club',  pts:1490, v:16, d:8, pj:24 },
      { pos:5, nome:'Gustavo & Bruno',  clube:'Podium Arena',    pts:1380, v:15, d:9, pj:24 },
    ],
    feminino: [
      { pos:1, nome:'Ana & Julia',       clube:'Podium Academy', pts:1760, v:21, d:3, pj:24 },
      { pos:2, nome:'Beatriz & Camila',  clube:'Elite Beach TB',  pts:1650, v:19, d:4, pj:23 },
      { pos:3, nome:'Laura & Fernanda',  clube:'Podium Arena',    pts:1540, v:17, d:6, pj:23 },
      { pos:4, nome:'Mariana & Priscila',clube:'TB Sports Club',  pts:1410, v:15, d:7, pj:22 },
      { pos:5, nome:'Amanda & Letícia',  clube:'Arena Pro',       pts:1300, v:14, d:8, pj:22 },
    ],
  },
};

function getAdminRanking() {
  const d = localStorage.getItem('podium_ranking_admin');
  return d ? JSON.parse(d) : RANKING_DEFAULT;
}
function saveAdminRanking(d) { localStorage.setItem('podium_ranking_admin', JSON.stringify(d)); }

function renderRankingAdmin() {
  const data = getAdminRanking();
  const posClass = i => i===0?'p1':i===1?'p2':i===2?'p3':'';
  const renderList = (entries, elId) => {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!entries || entries.length === 0) {
      el.innerHTML = '<div style="padding:1rem 1.2rem;color:var(--gray);font-size:.85rem">Sem dados — clique em Editar para adicionar.</div>';
      return;
    }
    el.innerHTML = entries.map((p,i) => `
      <div class="rank-admin-row">
        <div class="rank-admin-pos ${posClass(i)}">${p.pos}</div>
        <div>
          <div class="rank-admin-name">${p.nome}</div>
          <div class="rank-admin-club">${p.clube}</div>
        </div>
        <div class="rank-admin-stats">
          <div class="rank-admin-pts">${p.pts}</div>
          <div class="rank-admin-vd">${p.v}V ${p.d}D</div>
        </div>
      </div>`).join('');
  };

  renderList(data.beachtennis?.masculino, 'rankBTMasc');
  renderList(data.beachtennis?.feminino,  'rankBTFem');
  renderList(data.futevolei?.masculino,   'rankFVMasc');
  renderList(data.futevolei?.feminino,    'rankFVFem');
}

function abrirModalRanking(mod = 'beachtennis', cat = 'masculino') {
  document.getElementById('rankModalidade').value = mod;
  document.getElementById('rankCategoria').value  = cat;
  carregarEntradasRanking();
  // update on select change
  document.getElementById('rankModalidade').onchange = carregarEntradasRanking;
  document.getElementById('rankCategoria').onchange  = carregarEntradasRanking;
  openModal('modalRanking');
}

function carregarEntradasRanking() {
  const mod = document.getElementById('rankModalidade').value;
  const cat = document.getElementById('rankCategoria').value;
  const data = getAdminRanking();
  const entries = data[mod]?.[cat] || [];
  const wrap = document.getElementById('rankEntradas');
  if (!wrap) return;
  wrap.innerHTML = '';
  entries.forEach((p, i) => addRankEntry(p));
}

function addRankEntry(p = {}) {
  const wrap = document.getElementById('rankEntradas');
  if (!wrap) return;
  const idx = wrap.children.length;
  const posC = idx===0?'pos-1':idx===1?'pos-2':idx===2?'pos-3':'';
  const row = document.createElement('div');
  row.className = 'rank-entry-row';
  row.innerHTML = `
    <span class="rank-entry-num ${posC}">${idx+1}</span>
    <input type="text" placeholder="Dupla (ex: João & Pedro)" value="${p.nome||''}" class="rank-entry-input rank-nome">
    <input type="text" placeholder="Clube" value="${p.clube||''}" class="rank-entry-input rank-clube">
    <input type="number" placeholder="0" value="${p.pts||''}" class="rank-entry-input num-input rank-pts">
    <input type="number" placeholder="0" value="${p.v||0}" class="rank-entry-input num-input rank-v">
    <input type="number" placeholder="0" value="${p.d||0}" class="rank-entry-input num-input rank-d">
    <button class="rank-entry-del" onclick="this.closest('.rank-entry-row').remove();renumerarRank()" title="Remover">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
    </button>
  `;
  wrap.appendChild(row);
}

function renumerarRank() {
  const posC = i => i===0?'pos-1':i===1?'pos-2':i===2?'pos-3':'';
  document.querySelectorAll('.rank-entry-row').forEach((row, i) => {
    const span = row.querySelector('.rank-entry-num');
    if (span) { span.textContent = i + 1; span.className = `rank-entry-num ${posC(i)}`; }
  });
}

function salvarRanking() {
  const mod = document.getElementById('rankModalidade').value;
  const cat = document.getElementById('rankCategoria').value;
  const rows = document.querySelectorAll('#rankEntradas > div');
  const entries = [];
  rows.forEach((row, i) => {
    const nome  = row.querySelector('.rank-nome')?.value.trim();
    const clube = row.querySelector('.rank-clube')?.value.trim();
    const pts   = parseInt(row.querySelector('.rank-pts')?.value) || 0;
    const v     = parseInt(row.querySelector('.rank-v')?.value)   || 0;
    const d     = parseInt(row.querySelector('.rank-d')?.value)   || 0;
    if (nome) entries.push({ pos: i+1, nome, clube: clube||'', pts, v, d, pj: v+d });
  });

  const data = getAdminRanking();
  if (!data[mod]) data[mod] = {};
  data[mod][cat] = entries;
  saveAdminRanking(data);
  adminToast('Ranking atualizado com sucesso!');
  closeModal('modalRanking');
  renderRankingAdmin();
}