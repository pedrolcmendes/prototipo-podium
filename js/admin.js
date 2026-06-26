/* ═══════════════════════════════════════════
   ADMIN.JS — Painel Administrativo Podium Arena
   ═══════════════════════════════════════════ */

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTHS_LONG = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEKDAYS_LONG = ['Domingo','Segunda-Feira','Terça-Feira','Quarta-Feira','Quinta-Feira','Sexta-Feira','Sábado'];
const WEEKDAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

// ─── Tema (claro/escuro, só no painel admin) ──
function toggleAdminTheme() {
  const light = document.body.classList.toggle('theme-light');
  localStorage.setItem('podium_admin_theme', light ? 'light' : 'dark');
}

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
function calcAge(nasc) {
  if (!nasc) return null;
  const birth = new Date(nasc + 'T00:00:00');
  if (isNaN(birth)) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const aindaNaoFezAniversario = (today.getMonth() < birth.getMonth()) ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (aindaNaoFezAniversario) age--;
  return age;
}
const GENERO_LABELS = { masculino:'Masculino', feminino:'Feminino', outro:'Outro', nao_informado:'Não informado' };
// Deriva o status canônico, com fallback para o antigo campo booleano `ativo`
// (usuários criados antes desta versão não tinham `status`).
function userStatus(u) {
  return u.status || (u.ativo === false ? 'bloqueado' : 'ativo');
}
function statusBadgeHTML(status) {
  const map = {
    ativo:     '<span class="badge badge-green">Ativo</span>',
    pendente:  '<span class="badge badge-amber">Pendente</span>',
    bloqueado: '<span class="badge badge-red">Bloqueado</span>',
    inativo:   '<span class="badge badge-gray">Inativo</span>',
  };
  return map[status] || map.ativo;
}
// Migra usuários antigos (sem status/genero/creditos) uma única vez
function migrarUsuarios() {
  const users = getUsers();
  let changed = false;
  users.forEach(u => {
    if (!u.status)              { u.status = userStatus(u); changed = true; }
    if (u.genero === undefined)   { u.genero = 'nao_informado'; changed = true; }
    if (u.creditos === undefined) { u.creditos = 0; changed = true; }
  });
  if (changed) saveUsers(users);
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

// ─── Exibição de reservas ──────────────────
// Reservas reais (criadas em reservas.js) usam quadra/modalidade/slots/total;
// mantemos fallback para o formato antigo (courtName/time/price) por segurança.
const MODALIDADE_LABELS = { 'beach-tennis':'Beach Tennis', futevolei:'Futevôlei', volei:'Vôlei', pickleball:'Pickleball' };
const QUADRA_LABELS     = { coberta:'Coberta', descoberta:'Descoberta' };

function bookingLabel(b) {
  if (b.courtName) return b.courtName;
  if (b.dayUse && (!b.quadra || b.quadra === 'n/a')) return `${MODALIDADE_LABELS[b.modalidade]||'Day Use'} (Day Use)`;
  return `${QUADRA_LABELS[b.quadra]||'—'} · ${MODALIDADE_LABELS[b.modalidade]||'—'}`;
}
function bookingTimeRange(b) {
  if (b.time) return b.time;
  if (Array.isArray(b.slots) && b.slots.length) {
    const s = [...b.slots].sort((a,c)=>a-c);
    return `${String(s[0]).padStart(2,'0')}:00–${String(s[s.length-1]+1).padStart(2,'0')}:00`;
  }
  return '—';
}
function bookingPrice(b) { return b.total ?? b.price ?? 0; }

// Status "ao vivo": uma vez que o horário da reserva passa, ela é
// automaticamente tratada como concluída em toda a UI — não existe um botão
// de "marcar concluída" manual.
const MODALIDADE_COLOR_VAR = { 'beach-tennis':'mod-bt', futevolei:'mod-fv', volei:'mod-vl', pickleball:'mod-pb' };
function efetivoStatusReserva(b) {
  if (b.status === 'cancelada' || b.status === 'concluida') return b.status;
  const endHour = Array.isArray(b.slots) && b.slots.length ? Math.max(...b.slots) + 1 : 24;
  const endTs = new Date(`${b.date}T${String(endHour).padStart(2,'0')}:00:00`).getTime();
  if (!isNaN(endTs) && endTs <= Date.now()) return 'concluida';
  return b.status;
}
function bookingHourRange(b) {
  if (Array.isArray(b.slots) && b.slots.length) {
    const s = [...b.slots].sort((a,c)=>a-c);
    return `${String(s[0]).padStart(2,'0')}h–${String(s[s.length-1]+1).padStart(2,'0')}h`;
  }
  return b.time || '—';
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
  // auth.js já garante a existência do usuário admin antes deste ponto;
  // aqui só completamos com clientes de demonstração, se nenhum existir ainda.
  if (!users.some(u => !u.admin)) {
    const mockClients = [
      { id:'u1', nome:'Carlos Pereira',  email:'carlos@email.com', cpf:'111.111.111-11', tel:'(43) 9 9111-1111', nasc:'1990-05-12', genero:'masculino', creditos:0,  senha: btoa('senha123'), criadoEm:'2025-11-10T10:00:00Z', ultimoAcessoEm:'2026-06-18T14:30:00Z', status:'ativo' },
      { id:'u2', nome:'Ana Beatriz Lima',email:'ana@email.com',    cpf:'222.222.222-22', tel:'(43) 9 9222-2222', nasc:'1995-08-20', genero:'feminino',  creditos:40, senha: btoa('senha123'), criadoEm:'2025-12-01T09:00:00Z', ultimoAcessoEm:'2026-06-20T09:10:00Z', status:'ativo' },
      { id:'u3', nome:'Rafael Souza',    email:'rafael@email.com', cpf:'333.333.333-33', tel:'(43) 9 9333-3333', nasc:'1988-03-15', genero:'masculino', creditos:0,  senha: btoa('senha123'), criadoEm:'2026-01-05T08:00:00Z', ultimoAcessoEm:'2026-06-21T19:00:00Z', status:'ativo' },
      { id:'u4', nome:'Fernanda Costa',  email:'fernanda@email.com',cpf:'444.444.444-44', tel:'(43) 9 9444-4444', nasc:'1993-11-30', genero:'feminino',  creditos:0,  senha: btoa('senha123'), criadoEm:'2026-02-14T11:00:00Z', ultimoAcessoEm:'2026-04-02T08:00:00Z', status:'bloqueado' },
      { id:'u5', nome:'Lucas Martins',   email:'lucas@email.com',  cpf:'555.555.555-55', tel:'(43) 9 9555-5555', nasc:'1997-07-07', genero:'masculino', creditos:15, senha: btoa('senha123'), criadoEm:'2026-03-20T15:00:00Z', ultimoAcessoEm:'2026-06-15T17:45:00Z', status:'ativo' },
      { id:'u6', nome:'Beatriz Nogueira',email:'beatriz@email.com',cpf:'666.666.666-66', tel:'(43) 9 9666-6666', nasc:'2000-02-18', genero:'feminino',  creditos:0,  senha: btoa('senha123'), criadoEm:'2026-06-19T10:00:00Z', ultimoAcessoEm:null, status:'pendente' },
      { id:'u7', nome:'Otávio Ramalho',  email:'otavio@email.com', cpf:'777.777.777-77', tel:'(43) 9 9777-7777', nasc:'1985-09-09', genero:'masculino', creditos:0,  senha: btoa('senha123'), criadoEm:'2025-08-10T10:00:00Z', ultimoAcessoEm:'2025-09-01T10:00:00Z', status:'inativo' },
    ];
    saveUsers([...users, ...mockClients]);
  }

  const bookings = getBookings();
  if (bookings.length === 0) {
    const today = new Date();
    const dd = (n) => new Date(today.getTime() + n*86400000).toISOString().slice(0,10);
    // Mesmo formato gerado por reservas.js (quadra = tipo, quadraId = quadra física, slots = horas inteiras)
    const mockBookings = [
      { id:'b1', userId:'u1', userName:'Carlos Pereira',   modalidade:'beach-tennis', quadra:'coberta',    quadraId:'coberta-1', date: dd(2),  slots:[14,15], dayUse:false, payment:'pix',      total:160, status:'confirmada', criadaEm: dd(-5)+'T10:00:00Z' },
      { id:'b2', userId:'u2', userName:'Ana Beatriz Lima', modalidade:'futevolei',    quadra:'descoberta', quadraId:'areia-1',   date: dd(3),  slots:[19],    dayUse:false, payment:'credito',  total:60,  status:'confirmada', criadaEm: dd(-4)+'T09:00:00Z' },
      { id:'b3', userId:'u3', userName:'Rafael Souza',     modalidade:'beach-tennis', quadra:'coberta',    quadraId:'coberta-2', date: dd(5),  slots:[8,9],   dayUse:false, payment:'dinheiro', total:120, status:'confirmada', criadaEm: dd(-3)+'T08:00:00Z' },
      { id:'b4', userId:'u5', userName:'Lucas Martins',    modalidade:'volei',        quadra:'descoberta', quadraId:'areia-2',   date: dd(1),  slots:[10],    dayUse:false, payment:'pix',      total:50,  status:'confirmada', criadaEm: dd(-2)+'T07:00:00Z' },
      { id:'b5', userId:'u1', userName:'Carlos Pereira',   modalidade:'pickleball',   quadra:'n/a',        quadraId:'pickleball',date: dd(-2), slots:[],      dayUse:true,  payment:'debito',   total:25,  status:'concluida',  criadaEm: dd(-10)+'T12:00:00Z'},
      { id:'b6', userId:'u4', userName:'Fernanda Costa',   modalidade:'futevolei',    quadra:'descoberta', quadraId:'areia-3',   date: dd(-5), slots:[18],    dayUse:false, payment:'pix',      total:60,  status:'cancelada',  criadaEm: dd(-12)+'T11:00:00Z'},
      { id:'b7', userId:'u2', userName:'Ana Beatriz Lima', modalidade:'beach-tennis', quadra:'coberta',    quadraId:'coberta-1', date: dd(-1), slots:[7],     dayUse:false, payment:'pix',      total:60,  status:'concluida',  criadaEm: dd(-8)+'T10:00:00Z' },
      { id:'b8', userId:'u3', userName:'Rafael Souza',     modalidade:'volei',        quadra:'descoberta', quadraId:'areia-1',   date: dd(7),  slots:[9],     dayUse:false, payment:'credito',  total:50,  status:'confirmada', criadaEm: dd(-1)+'T09:00:00Z' },
      { id:'b9', userId:'u5', userName:'Lucas Martins',    modalidade:'beach-tennis', quadra:'coberta',    quadraId:'coberta-2', date: dd(0),  slots:[9,10],  dayUse:false, payment:'pix',      total:120, status:'confirmada', criadaEm: dd(-6)+'T08:00:00Z' },
      { id:'b10',userId:'u4', userName:'Fernanda Costa',   modalidade:'futevolei',    quadra:'descoberta', quadraId:'areia-3',   date: dd(0),  slots:[16],    dayUse:false, payment:'pix',      total:60,  status:'confirmada', criadaEm: dd(-3)+'T09:00:00Z' },
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
  reservas: { page: 1, filter: 'todas', search: '', quadra: 'todas', modalidade: 'todas', de: '', ate: '', dow: 'all' },
  usuarios: { page: 1, filter: 'todos', search: '' },
  eventos:  { page: 1, filter: 'todos', search: '' },
  grade:    { view: 'dia', date: hojeISO() },
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
function calcReceitaMensal(bookings) {
  const now = new Date().toISOString().slice(0,10);
  const thisMonth = now.slice(0,7);
  const lastMonth = (() => { const d = new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })();
  const rec = b => b.status !== 'cancelada';
  const mesAtual   = bookings.filter(b=>rec(b)&&(b.criadaEm||'').startsWith(thisMonth)).reduce((s,b)=>s+bookingPrice(b),0);
  const mesPassado = bookings.filter(b=>rec(b)&&(b.criadaEm||'').startsWith(lastMonth)).reduce((s,b)=>s+bookingPrice(b),0);
  const delta = mesPassado > 0 ? Math.round((mesAtual-mesPassado)/mesPassado*100) : (mesAtual>0 ? 100 : 0);
  return { mesAtual, mesPassado, delta };
}
function calcReservasHoje(bookings) {
  const hoje = hojeISO();
  const nowHour = new Date().getHours();
  const doDia = bookings.filter(b => b.date === hoje && b.status !== 'cancelada');
  const concluidas = doDia.filter(b => Array.isArray(b.slots) && b.slots.length && Math.max(...b.slots) + 1 <= nowHour).length;
  return { total: doDia.length, concluidas };
}
function calcOcupacaoPct(dateStr) {
  const max = maxHourFor(dateStr);
  const total = COURTS.length * (max - 8);
  if (total <= 0) return 0;
  let occ = 0;
  COURTS.forEach(c => getOccupiedHours(c.id, dateStr).forEach(h => { if (h >= 8 && h < max) occ++; }));
  return Math.round(occ / total * 100);
}
function setDelta(id, value, suffix='', countOnly=false) {
  const el = document.getElementById(id);
  if (!el) return;
  const arrow = countOnly || value >= 0 ? '▲' : '▼';
  const sign  = countOnly || value < 0 ? '' : '+';
  el.textContent = `${arrow} ${sign}${value}${suffix}`;
  el.classList.toggle('neg', !countOnly && value < 0);
}

function renderDashboard() {
  const users    = getUsers();
  const bookings = getBookings();

  const { mesAtual, delta: receitaDelta } = calcReceitaMensal(bookings);
  const { total: reservasHoje, concluidas: concluidasHoje } = calcReservasHoje(bookings);
  const ocupHoje  = calcOcupacaoPct(hojeISO());
  const ocupOntem = calcOcupacaoPct(ontemISO());
  const ativos    = users.filter(u => userStatus(u) === 'ativo').length;
  const trintaDiasAtras = new Date(); trintaDiasAtras.setDate(trintaDiasAtras.getDate()-30);
  const novosUsuarios = users.filter(u => u.criadoEm && new Date(u.criadoEm) >= trintaDiasAtras).length;

  set('dashReceitaMes', fmtMoney(mesAtual));
  setDelta('dashReceitaDelta', receitaDelta, '%');
  set('dashReservasHoje', reservasHoje);
  set('dashReservasSub', `${concluidasHoje} concluída${concluidasHoje===1?'':'s'}`);
  set('dashOcupacao', ocupHoje + '%');
  setDelta('dashOcupacaoDelta', ocupHoje - ocupOntem, ' pts');
  set('dashUsuarios', ativos);
  setDelta('dashUsuariosDelta', novosUsuarios, '', true);

  // Mini gráfico de barras — últimos 7 meses
  renderMiniChart();
  renderGradeOcupacao();

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
            <div class="finance-desc">${bookingLabel(b)}</div>
            <div class="finance-meta">${u.nome||'Usuário'} · ${fmtDate(b.date)} às ${bookingTimeRange(b)}</div>
          </div>
          <div style="text-align:right">
            <div class="finance-value">${fmtMoney(bookingPrice(b))}</div>
            <div style="margin-top:.2rem">${badgeHTML(efetivoStatusReserva(b))}</div>
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
      <div>${statusBadgeHTML(userStatus(u))}</div>
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
                          .reduce((s,b)=>s+bookingPrice(b),0);
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
// GRADE DE OCUPAÇÃO
// ══════════════════════════════════════════
function hojeISO() { return new Date().toISOString().slice(0,10); }
function ontemISO() { return new Date(Date.now() - 86400000).toISOString().slice(0,10); }
function maxHourFor(dateStr) { return isWeekend(dateStr) ? 22 : 23; }
const GRADE_HOURS = Array.from({ length: 16 }, (_, i) => 7 + i); // 7h–22h
const MODALIDADE_KEY = { 'beach-tennis': 'bt', futevolei: 'fv', volei: 'vl', pickleball: 'pb' };
const ICON_CHECK_SM = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_PLAY_SM  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20"/></svg>`;
const ICON_LOCK_SM  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

function weekRange(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d); monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  const iso = x => x.toISOString().slice(0,10);
  return { start: iso(monday), end: iso(sunday) };
}

function gradeDateLabel() {
  const d = new Date(state.grade.date + 'T12:00:00');
  if (state.grade.view === 'semana') {
    const { start, end } = weekRange(state.grade.date);
    const ds = new Date(start + 'T12:00:00'), de = new Date(end + 'T12:00:00');
    return `${ds.getDate()} – ${de.getDate()} de ${MONTHS_LONG[de.getMonth()]}`;
  }
  if (state.grade.view === 'mes') return `${MONTHS_LONG[d.getMonth()]} de ${d.getFullYear()}`;
  return `${WEEKDAYS_LONG[d.getDay()]} · ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`;
}

function setGradeView(view) {
  state.grade.view = view;
  document.querySelectorAll('.grade-view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  renderGradeOcupacao();
}
function gradePrev() {
  const d = new Date(state.grade.date + 'T12:00:00');
  if (state.grade.view === 'semana') d.setDate(d.getDate() - 7);
  else if (state.grade.view === 'mes') d.setMonth(d.getMonth() - 1);
  else d.setDate(d.getDate() - 1);
  state.grade.date = d.toISOString().slice(0,10);
  renderGradeOcupacao();
}
function gradeNext() {
  const d = new Date(state.grade.date + 'T12:00:00');
  if (state.grade.view === 'semana') d.setDate(d.getDate() + 7);
  else if (state.grade.view === 'mes') d.setMonth(d.getMonth() + 1);
  else d.setDate(d.getDate() + 1);
  state.grade.date = d.toISOString().slice(0,10);
  renderGradeOcupacao();
}
function gradeHoje() { state.grade.date = hojeISO(); renderGradeOcupacao(); }
function gradeGoToDate(dateStr) {
  state.grade.view = 'dia';
  state.grade.date = dateStr;
  document.querySelectorAll('.grade-view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'dia'));
  renderGradeOcupacao();
}

function renderGradeOcupacao() {
  set('gradeDateLabel', gradeDateLabel());
  const badge = document.getElementById('gradeTodayBadge');
  if (badge) badge.style.display = (state.grade.view === 'dia' && state.grade.date === hojeISO()) ? '' : 'none';
  const body = document.getElementById('gradeBody');
  if (!body) return;
  if (state.grade.view === 'semana') renderGradeSemana(body);
  else if (state.grade.view === 'mes') renderGradeMes(body);
  else renderGradeDia(body);
}

function gradeCellStatus(courtId, dateStr, hour) {
  const booking = getBookings().find(b =>
    b.status !== 'cancelada' && b.date === dateStr && resolveCourtId(b) === courtId && (b.slots || []).includes(hour)
  );
  if (booking) {
    const today = hojeISO();
    let status;
    if (dateStr < today) status = 'concluida';
    else if (dateStr > today) status = 'confirmada';
    else {
      const nowHour = new Date().getHours();
      status = hour < nowHour ? 'concluida' : hour === nowHour ? 'andamento' : 'confirmada';
    }
    return { status, booking };
  }
  if (isSlotBlocked(courtId, dateStr, hour)) return { status: 'bloqueado' };
  return { status: 'livre' };
}

function renderGradeDia(body) {
  const dateStr = state.grade.date;
  const isPastDate = dateStr < hojeISO();

  let html = `<div class="grade-grid" style="grid-template-columns:170px repeat(${GRADE_HOURS.length},1fr)">`;
  html += `<div class="grade-corner"></div>`;
  GRADE_HOURS.forEach(h => html += `<div class="grade-hour-head">${h}h</div>`);

  COURTS.forEach(court => {
    html += `<div class="grade-row-label">
      <button class="grade-lock-btn" title="Bloquear/desbloquear horários livres" onclick="toggleBloqueioLinha('${court.id}')">${ICON_LOCK_SM}</button>
      <div><strong>${court.label}</strong><span>${court.tag.toUpperCase()}</span></div>
    </div>`;

    GRADE_HOURS.forEach(hour => {
      const { status, booking } = gradeCellStatus(court.id, dateStr, hour);
      let cls = 'grade-cell', inner = '', click = '';
      if (booking) {
        cls += ` mod-${MODALIDADE_KEY[booking.modalidade] || 'bt'} st-${status}`;
        inner = status === 'concluida' ? ICON_CHECK_SM : status === 'andamento' ? ICON_PLAY_SM : '';
      } else if (status === 'bloqueado') {
        cls += ' st-bloqueado';
        inner = ICON_LOCK_SM;
        click = `onclick="unblockSlotAdmin('${court.id}','${dateStr}',${hour})"`;
      } else {
        cls += ' st-livre';
        click = isPastDate ? '' : `onclick="blockSlotAdmin('${court.id}','${dateStr}',${hour})"`;
      }
      html += `<div class="${cls}" data-court="${court.id}" data-hour="${hour}" ${click}>${inner}</div>`;
    });
  });
  html += `</div>`;
  body.innerHTML = html;

  body.querySelectorAll('.grade-cell').forEach(cell => {
    cell.addEventListener('mouseenter', showGradeTooltip);
    cell.addEventListener('mousemove', positionGradeTooltip);
    cell.addEventListener('mouseleave', hideGradeTooltip);
  });
}

function renderGradeSemana(body) {
  const { start } = weekRange(state.grade.date);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start + 'T12:00:00'); d.setDate(d.getDate() + i);
    return d.toISOString().slice(0,10);
  });

  let html = `<div class="grade-grid" style="grid-template-columns:170px repeat(7,1fr)">`;
  html += `<div class="grade-corner"></div>`;
  days.forEach(d => {
    const dt = new Date(d + 'T12:00:00');
    html += `<div class="grade-hour-head ${d === hojeISO() ? 'is-today' : ''}">${WEEKDAYS_SHORT[dt.getDay()]}<br><span>${dt.getDate()}</span></div>`;
  });

  COURTS.forEach(court => {
    html += `<div class="grade-row-label"><div><strong>${court.label}</strong><span>${court.tag.toUpperCase()}</span></div></div>`;
    days.forEach(d => {
      const max = maxHourFor(d);
      const total = max - 8;
      let occ = 0;
      getOccupiedHours(court.id, d).forEach(h => { if (h >= 8 && h < max) occ++; });
      const pct = total > 0 ? Math.round(occ / total * 100) : 0;
      const op = (pct / 100 * 0.55 + 0.04).toFixed(2);
      html += `<div class="grade-cell grade-cell-heat" style="background:rgba(224,172,107,${op})" onclick="gradeGoToDate('${d}')" title="${pct}% ocupado"><span>${pct}%</span></div>`;
    });
  });
  html += `</div>`;
  body.innerHTML = html;
}

function renderGradeMes(body) {
  const d = new Date(state.grade.date + 'T12:00:00');
  const year = d.getFullYear(), month = d.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = `<div class="grade-month-head">${WEEKDAYS_SHORT.map(w => `<div>${w}</div>`).join('')}</div>`;
  html += `<div class="grade-month-grid">`;
  for (let i = 0; i < firstDow; i++) html += `<div class="grade-month-cell empty"></div>`;
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
    const max = maxHourFor(dateStr);
    const total = COURTS.length * (max - 8);
    let occ = 0;
    COURTS.forEach(c => getOccupiedHours(c.id, dateStr).forEach(h => { if (h >= 8 && h < max) occ++; }));
    const pct = total > 0 ? Math.round(occ / total * 100) : 0;
    html += `<div class="grade-month-cell ${dateStr === hojeISO() ? 'is-today' : ''}" onclick="gradeGoToDate('${dateStr}')">
      <span class="gm-num">${dayNum}</span>
      ${pct > 0 ? `<span class="gm-pct">${pct}%</span>` : ''}
    </div>`;
  }
  html += `</div>`;
  body.innerHTML = html;
}

const GRADE_STATUS_LABEL = { concluida:'Concluído', andamento:'Em quadra', confirmada:'Confirmada', bloqueado:'Bloqueado', livre:'Disponível' };
const GRADE_STATUS_BADGE = { concluida:'badge-green', andamento:'badge-gold', confirmada:'badge-gold', bloqueado:'badge-red', livre:'badge-gray' };

function showGradeTooltip(e) {
  const cell = e.currentTarget;
  const courtId = cell.dataset.court;
  const hour = parseInt(cell.dataset.hour);
  const dateStr = state.grade.date;
  const court = getCourtById(courtId);
  const { status, booking } = gradeCellStatus(courtId, dateStr, hour);
  const tip = document.getElementById('gradeTooltip');
  if (!tip) return;

  let html = `<div class="grade-tip-time">${String(hour).padStart(2,'0')}H–${String(hour+1).padStart(2,'0')}H</div>
    <span class="badge ${GRADE_STATUS_BADGE[status]}">${GRADE_STATUS_LABEL[status]}</span>
    <div class="grade-tip-court">${court.label} · ${court.tag}</div>`;

  if (booking) {
    const u = getUsers().find(x => x.id === booking.userId);
    const modKey = MODALIDADE_KEY[booking.modalidade] || 'bt';
    const price = getPriceForHour(hour, court.tipo, isWeekend(dateStr));
    const note = status === 'concluida' ? 'Sessão finalizada.' : status === 'andamento' ? 'Em andamento agora.' : 'Reserva confirmada.';
    html += `
      <div class="grade-tip-row"><span>Cliente</span><strong>${u?.nome || booking.userName || '—'}</strong></div>
      <div class="grade-tip-row"><span>Modalidade</span><strong><i class="grade-dot mod-${modKey}"></i>${MODALIDADE_LABELS[booking.modalidade] || '—'}</strong></div>
      <div class="grade-tip-row"><span>Valor</span><strong>${fmtMoney(price)}</strong></div>
      <p class="grade-tip-note">${note}</p>`;
  } else if (status === 'bloqueado') {
    html += `<p class="grade-tip-note">Bloqueado pelo administrador.</p>`;
  } else {
    html += `<p class="grade-tip-note">Disponível para reserva.</p>`;
  }

  tip.innerHTML = html;
  tip.classList.add('show');
  positionGradeTooltip(e);
}
function positionGradeTooltip(e) {
  const tip = document.getElementById('gradeTooltip');
  if (!tip || !tip.classList.contains('show')) return;
  const gap = 14;
  let x = e.clientX + gap, y = e.clientY + gap;
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  if (x + tw > window.innerWidth - 10) x = e.clientX - tw - gap;
  if (y + th > window.innerHeight - 10) y = e.clientY - th - gap;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}
function hideGradeTooltip() { document.getElementById('gradeTooltip')?.classList.remove('show'); }

function blockSlotAdmin(courtId, dateStr, hour) {
  blockSlot(courtId, dateStr, hour);
  hideGradeTooltip();
  renderDashboard();
}
function unblockSlotAdmin(courtId, dateStr, hour) {
  unblockSlot(courtId, dateStr, hour);
  hideGradeTooltip();
  renderDashboard();
}
function toggleBloqueioLinha(courtId) {
  const dateStr = state.grade.date;
  const court = getCourtById(courtId);
  if (!court) return;
  const bookedHours = new Set();
  getBookings().filter(b => b.status !== 'cancelada' && b.date === dateStr && resolveCourtId(b) === courtId)
    .forEach(b => (b.slots || []).forEach(h => bookedHours.add(h)));
  const blockedNow = getBlockedSlots().filter(b => b.courtId === courtId && b.date === dateStr);
  const freeHours = GRADE_HOURS.filter(h => !bookedHours.has(h) && !blockedNow.some(b => b.hour === h));

  if (freeHours.length) {
    freeHours.forEach(h => blockSlot(courtId, dateStr, h));
    adminToast(`${court.label}: horários livres bloqueados.`, 'warn');
  } else if (blockedNow.length) {
    blockedNow.forEach(b => unblockSlot(courtId, dateStr, b.hour));
    adminToast(`${court.label}: bloqueios removidos.`);
  }
  renderDashboard();
}

// ══════════════════════════════════════════
// CARTEIRA — ADICIONAR CRÉDITO
// ══════════════════════════════════════════
function userCode(u) {
  const idx = getUsers().findIndex(x => x.id === u.id);
  return '#U-' + String(idx + 1).padStart(3, '0');
}
function abrirModalCredito(preselectUserId) {
  const users = getUsers();
  const sel = document.getElementById('credCliente');
  if (sel) {
    sel.innerHTML = users.map(u => `<option value="${u.id}">${u.nome} — ${userCode(u)}</option>`).join('');
    if (preselectUserId) sel.value = preselectUserId;
  }
  set('credValor', '', 'v');
  set('credObs', '', 'v');
  set('credMotivo', 'cancelamento', 'v');
  atualizarSaldoCredito();
  openModal('modalAddCredito');
}
function atualizarSaldoCredito() {
  const id = document.getElementById('credCliente')?.value;
  const u = getUsers().find(x => x.id === id);
  set('credSaldoAtual', fmtMoney(u?.creditos || 0));
}
function salvarCredito() {
  const id     = document.getElementById('credCliente')?.value;
  const valor  = parseFloat(document.getElementById('credValor')?.value);
  const motivo = document.getElementById('credMotivo')?.value;
  const obs    = document.getElementById('credObs')?.value.trim();
  if (!id) { adminToast('Selecione um cliente.', 'error'); return; }
  if (!valor || valor <= 0) { adminToast('Informe um valor válido.', 'error'); return; }

  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return;
  users[idx].creditos = (users[idx].creditos || 0) + valor;
  saveUsers(users);

  const log = JSON.parse(localStorage.getItem('podium_credit_log') || '[]');
  log.push({ id: 'cr_' + Date.now(), userId: id, valor, motivo, obs, criadaEm: new Date().toISOString(), saldoApos: users[idx].creditos });
  localStorage.setItem('podium_credit_log', JSON.stringify(log));

  adminToast(`Crédito de ${fmtMoney(valor)} adicionado para ${users[idx].nome}.`);
  closeModal('modalAddCredito');
  renderDashboard();
  renderUsuarios();
  if (document.getElementById('modalViewUser')?.classList.contains('open')) verPerfilUsuario(id);
}

// ══════════════════════════════════════════
// RESERVAS
// ══════════════════════════════════════════
const DOW_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function renderReservasDayStrip() {
  const strip = document.getElementById('reservasDayStrip');
  if (!strip) return;
  strip.querySelectorAll('.admin-daychip').forEach(el => el.remove());
  const todayDow = new Date().getDay();
  for (let dow = 1; dow <= 7; dow++) {
    const d = dow % 7; // 1..6,0 → Seg..Dom
    const btn = document.createElement('button');
    btn.className = 'admin-daychip' + (String(d) === state.reservas.dow ? ' is-on' : '') + (d === todayDow ? ' is-today' : '');
    btn.dataset.dow = String(d);
    btn.onclick = () => onDayFilter(String(d));
    btn.innerHTML = `<span class="dc-ab">${DOW_SHORT[d]}</span><span class="dc-dot"></span>`;
    strip.appendChild(btn);
  }
}
function onDayFilter(dow) {
  state.reservas.dow = dow;
  state.reservas.page = 1;
  document.querySelectorAll('#reservasDayStrip .admin-chip, #reservasDayStrip .admin-daychip').forEach(el => {
    el.classList.toggle('is-on', (el.dataset.dow || 'all') === dow);
  });
  renderReservas();
}

function renderReservas() {
  const { filter, search, page, quadra, modalidade, de, ate, dow } = state.reservas;
  let data = getBookings();
  const now = new Date().toISOString().slice(0,10);
  const usersMap = Object.fromEntries(getUsers().map(u=>[u.id,u]));

  // Enriquece com nome
  data = data.map(b => ({ ...b, _userName: usersMap[b.userId]?.nome || b.userName || 'Usuário' }));

  // Filtro status
  if (filter === 'proximas')   data = data.filter(b => b.date >= now && b.status !== 'cancelada');
  if (filter === 'concluidas') data = data.filter(b => b.date < now  || b.status === 'concluida');
  if (filter === 'canceladas') data = data.filter(b => b.status === 'cancelada');

  // Filtro quadra / modalidade
  if (quadra && quadra !== 'todas')         data = data.filter(b => b.quadra === quadra);
  if (modalidade && modalidade !== 'todas') data = data.filter(b => b.modalidade === modalidade);

  // Filtro período
  if (de)  data = data.filter(b => b.date >= de);
  if (ate) data = data.filter(b => b.date <= ate);

  // Filtro dia da semana
  if (dow && dow !== 'all') data = data.filter(b => String(new Date(b.date + 'T12:00:00').getDay()) === dow);

  // Busca
  if (search) {
    const q = search.toLowerCase();
    data = data.filter(b => b._userName.toLowerCase().includes(q) || bookingLabel(b).toLowerCase().includes(q));
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
    : slice.map(b => {
        const court  = getCourtById(resolveCourtId(b));
        const modVar = MODALIDADE_COLOR_VAR[b.modalidade];
        return `
      <tr>
        <td><span style="font-family:var(--font-body);font-size:.78rem;color:var(--gray)">#R-${String(b.id||'').slice(-4)}</span></td>
        <td>
          <div class="admin-avatar-cell">
            <div class="admin-avatar-mini">${initials(b._userName)}</div>
            <div>
              <div class="admin-table-name">${b._userName}</div>
              <div class="admin-table-sub">${fmtDate(b.date)}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="admin-table-name">${court ? court.label : bookingLabel(b)}</div>
          <div class="admin-table-sub" style="color:var(--${modVar||'gray'})">${MODALIDADE_LABELS[b.modalidade]||'—'}</div>
        </td>
        <td><span style="color:var(--gray-light)">${bookingHourRange(b)}</span></td>
        <td>${fmtMoney(bookingPrice(b))}</td>
        <td>${badgeHTML(efetivoStatusReserva(b))}</td>
        <td><div class="admin-row-actions">
          <button class="btn-admin-secondary sm" onclick="abrirEditarReserva('${b.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>Editar</button>
          <button class="btn-admin-secondary sm" onclick="verDetalhesReserva('${b.id}')">Detalhes</button>
        </div></td>
      </tr>`;
      }).join('');

  renderPagination('reservasPag', cur, pages, total, (p) => {
    state.reservas.page = p;
    renderReservas();
  });
  renderReservasDayStrip();
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
// RESERVAS — Nova / Detalhes / Editar
// ══════════════════════════════════════════
const PAY_LABELS_ADMIN = { pix:'PIX', credito:'Crédito do cliente', debito:'Débito', dinheiro:'Dinheiro' };

function courtOptionsHTML(selectedId) {
  return COURTS.filter(c => !c.dayUse)
    .map(c => `<option value="${c.id}" ${c.id===selectedId?'selected':''}>${c.label}</option>`).join('');
}

function abrirNovaReserva() {
  const users = getUsers();
  const sel = document.getElementById('nrCliente');
  if (sel) sel.innerHTML = users.map(u => `<option value="${u.id}">${u.nome} — ${userCode(u)}</option>`).join('');
  document.getElementById('nrQuadra').innerHTML = courtOptionsHTML();
  set('nrData', hojeISO(), 'v');
  set('nrInicio', '09:00', 'v');
  set('nrDuracao', '1', 'v');
  set('nrValor', '', 'v');
  set('nrModalidade', 'beach-tennis', 'v');
  set('nrPagamento', 'pix', 'v');
  set('nrStatus', 'confirmada', 'v');
  set('nrObs', '', 'v');
  openModal('modalNovaReserva');
}

function salvarNovaReserva() {
  const userId   = document.getElementById('nrCliente')?.value;
  const quadraId = document.getElementById('nrQuadra')?.value;
  const modalidade = document.getElementById('nrModalidade')?.value;
  const data     = document.getElementById('nrData')?.value;
  const inicio   = document.getElementById('nrInicio')?.value;
  const duracao  = parseInt(document.getElementById('nrDuracao')?.value) || 1;
  const valor    = parseFloat(document.getElementById('nrValor')?.value) || 0;
  const pagamento = document.getElementById('nrPagamento')?.value;
  const status   = document.getElementById('nrStatus')?.value;
  const obs      = document.getElementById('nrObs')?.value.trim();

  if (!userId)  { adminToast('Selecione um cliente.', 'error'); return; }
  if (!quadraId){ adminToast('Selecione uma quadra.', 'error'); return; }
  if (!data)    { adminToast('Informe a data.', 'error'); return; }

  const startHour = parseInt((inicio||'09:00').split(':')[0], 10);
  const slots = Array.from({ length: duracao }, (_, i) => startHour + i);
  const court = getCourtById(quadraId);

  if (hasConflitoHorario(quadraId, data, slots)) {
    adminToast('Esse horário já está ocupado nessa quadra.', 'error');
    return;
  }

  const user = getUsers().find(u => u.id === userId);
  const bookings = getBookings();
  bookings.push({
    id: Date.now().toString(),
    userId, userName: user?.nome || 'Usuário',
    modalidade, quadra: court.tipo, quadraId,
    date: data, slots, dayUse: false,
    payment: pagamento, total: valor, status, obs,
    criadaEm: new Date().toISOString(),
  });
  saveBookings(bookings);

  adminToast('Reserva criada com sucesso!');
  closeModal('modalNovaReserva');
  renderDashboard();
  renderReservas();
}

function verDetalhesReserva(id) {
  const b = getBookings().find(x => x.id === id);
  if (!b) return;
  const u = getUsers().find(x => x.id === b.userId);
  const court = getCourtById(resolveCourtId(b));

  set('drId', id, 'v');
  set('drCodigo', `Reserva #PD-${id.slice(-6).toUpperCase()}`);
  set('drTitulo', bookingLabel(b));
  set('drAvatar', initials(u?.nome || b.userName || '?'));
  set('drNome', u?.nome || b.userName || 'Usuário');
  set('drContato', [u?.email, u?.tel].filter(Boolean).join(' · ') || '—');
  document.getElementById('drStatus').innerHTML = badgeHTML(efetivoStatusReserva(b));
  set('drData', fmtDate(b.date));
  set('drHorario', bookingTimeRange(b));
  set('drQuadra', court ? `${court.label} · ${court.tag}` : bookingLabel(b));
  set('drPagamento', PAY_LABELS_ADMIN[b.payment] || '—');
  set('drValor', fmtMoney(bookingPrice(b)));

  const cancelBtn = document.getElementById('drCancelBtn');
  const stReal = efetivoStatusReserva(b);
  if (cancelBtn) cancelBtn.style.display = (stReal === 'cancelada' || stReal === 'concluida') ? 'none' : '';

  openModal('modalDetalhesReserva');
}

function abrirEditarReserva(id) {
  const b = getBookings().find(x => x.id === id);
  if (!b) return;
  const u = getUsers().find(x => x.id === b.userId);

  set('erId', id, 'v');
  set('erCodigo', `Reserva #PD-${id.slice(-6).toUpperCase()}`);
  set('erAvatar', initials(u?.nome || b.userName || '?'));
  set('erNome', u?.nome || b.userName || 'Usuário');
  set('erContato', [u?.email, u?.tel].filter(Boolean).join(' · ') || '—');
  document.getElementById('erStatus').innerHTML = badgeHTML(efetivoStatusReserva(b));

  document.getElementById('erQuadra').innerHTML = courtOptionsHTML(resolveCourtId(b));
  set('erModalidade', b.modalidade, 'v');
  set('erData', b.date, 'v');
  const slots = Array.isArray(b.slots) && b.slots.length ? [...b.slots].sort((a,c)=>a-c) : [9];
  set('erInicio', `${String(slots[0]).padStart(2,'0')}:00`, 'v');
  set('erDuracao', String(slots.length || 1), 'v');
  set('erValor', bookingPrice(b), 'v');
  set('erPagamento', b.payment || 'pix', 'v');
  set('erStatusSelect', b.status || 'confirmada', 'v');
  set('erObs', b.obs || '', 'v');

  openModal('modalEditarReserva');
}

function salvarEdicaoReserva() {
  const id = document.getElementById('erId')?.value;
  const bookings = getBookings();
  const idx = bookings.findIndex(b => b.id === id);
  if (idx === -1) return;

  const quadraId = document.getElementById('erQuadra')?.value;
  const modalidade = document.getElementById('erModalidade')?.value;
  const data = document.getElementById('erData')?.value;
  const inicio = document.getElementById('erInicio')?.value;
  const duracao = parseInt(document.getElementById('erDuracao')?.value) || 1;
  const valor = parseFloat(document.getElementById('erValor')?.value) || 0;
  const pagamento = document.getElementById('erPagamento')?.value;
  const status = document.getElementById('erStatusSelect')?.value;
  const obs = document.getElementById('erObs')?.value.trim();

  const startHour = parseInt((inicio||'09:00').split(':')[0], 10);
  const slots = Array.from({ length: duracao }, (_, i) => startHour + i);
  const court = getCourtById(quadraId);

  if (status !== 'cancelada' && hasConflitoHorario(quadraId, data, slots, id)) {
    adminToast('Esse horário já está ocupado nessa quadra.', 'error');
    return;
  }

  bookings[idx] = {
    ...bookings[idx],
    modalidade, quadra: court.tipo, quadraId,
    date: data, slots, payment: pagamento, total: valor, status, obs,
  };
  saveBookings(bookings);

  adminToast('Reserva atualizada com sucesso!');
  closeModal('modalEditarReserva');
  renderDashboard();
  renderReservas();
}

// ══════════════════════════════════════════
// USUÁRIOS
// ══════════════════════════════════════════
function renderUsuarios() {
  const { filter, search, page } = state.usuarios;
  let data = getUsers();

  if (filter !== 'todos') {
    const wanted = filter.slice(0, -1); // 'ativos' -> 'ativo', 'pendentes' -> 'pendente' etc.
    data = data.filter(u => userStatus(u) === wanted);
  }

  if (search) {
    const q = search.toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    data = data.filter(u =>
      u.nome?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      (qDigits && u.cpf?.replace(/\D/g,'').includes(qDigits)) ||
      (qDigits && u.tel?.replace(/\D/g,'').includes(qDigits))
    );
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

  // Próxima ação de status sugerida para o botão principal da linha
  const NEXT_ACTION = {
    pendente:  { status:'ativo',     title:'Aprovar',     cls:'success' },
    ativo:     { status:'bloqueado', title:'Bloquear',    cls:'danger'  },
    bloqueado: { status:'ativo',     title:'Desbloquear', cls:'success' },
    inativo:   { status:'ativo',     title:'Reativar',    cls:'success' },
  };
  const ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const ICON_BAN   = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" x2="19.07" y1="4.93" y2="19.07"/></svg>`;

  tbody.innerHTML = slice.length === 0
    ? `<tr><td colspan="6"><div class="admin-empty"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><h4>Nenhum usuário</h4><p>Tente outro filtro.</p></div></td></tr>`
    : slice.map(u => {
        const nRes   = bookings.filter(b=>b.userId===u.id).length;
        const nEv    = inscricoes.filter(i=>i.userId===u.id).length;
        const status = userStatus(u);
        const action = NEXT_ACTION[status];
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
          <td>
            <span style="font-family:var(--font-cond);font-size:.8rem;color:var(--gray)">${fmtDate(u.criadoEm?.slice(0,10))}</span>
            <div class="admin-table-sub">${u.ultimoAcessoEm ? 'Acesso: '+fmtDate(u.ultimoAcessoEm.slice(0,10)) : 'Nunca acessou'}</div>
          </td>
          <td>
            <span style="font-family:var(--font-cond);font-size:.8rem">${nRes} res. · ${nEv} ev.</span>
          </td>
          <td>${statusBadgeHTML(status)}</td>
          <td><div class="admin-row-actions">
            <button class="admin-action-btn" title="Ver perfil" onclick="verPerfilUsuario('${u.id}')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button>
            <button class="admin-action-btn" title="Editar" onclick="editarUsuario('${u.id}')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
            <button class="admin-action-btn ${action.cls}" title="${action.title}" onclick="setUsuarioStatus('${u.id}','${action.status}')">
              ${action.status==='ativo' ? ICON_CHECK : ICON_BAN}
            </button>
          </div></td>
        </tr>`;
      }).join('');

  renderPagination('usuariosPag', cur, pages, total, (p) => {
    state.usuarios.page = p;
    renderUsuarios();
  });
}

function setUsuarioStatus(id, status) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return;
  users[idx].status = status;
  users[idx].ativo  = status !== 'bloqueado'; // mantém compat com qualquer leitura antiga de `ativo`
  saveUsers(users);
  const msgs = {
    ativo:     'Usuário ativado com sucesso.',
    bloqueado: 'Usuário bloqueado.',
    inativo:   'Usuário marcado como inativo.',
    pendente:  'Usuário marcado como pendente.',
  };
  const types = { ativo:'success', bloqueado:'error', inativo:'warn', pendente:'warn' };
  adminToast(msgs[status] || 'Status atualizado.', types[status] || 'success');
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
  set('editGenero',  u.genero || 'nao_informado', 'v');
  openModal('modalEditUser');
}

function verPerfilUsuario(id) {
  const u = getUsers().find(u => u.id === id);
  if (!u) return;
  const status = userStatus(u);
  const idade = calcAge(u.nasc);

  set('vuUserId', id, 'v');
  set('vuAvatar', initials(u.nome));
  set('vuNome', u.nome || '—');
  set('vuEmail', u.email || '—');
  document.getElementById('vuStatus').innerHTML = statusBadgeHTML(status);
  set('vuCPF', u.cpf || '—', 'v');
  set('vuTel', u.tel || '', 'v');
  set('vuNasc', u.nasc ? `${fmtDate(u.nasc)}${idade!==null ? ' · '+idade+' anos' : ''}` : '—', 'v');
  set('vuCadastro', u.criadoEm ? fmtDate(u.criadoEm.slice(0,10)) : '—', 'v');
  set('vuUltimoAcesso', u.ultimoAcessoEm ? fmtDate(u.ultimoAcessoEm.slice(0,10)) : 'Nunca acessou', 'v');
  set('vuNomeInput', u.nome || '', 'v');
  set('vuEmailInput', u.email || '', 'v');
  set('vuGeneroInput', u.genero || 'nao_informado', 'v');
  set('vuNovaSenha', '', 'v');
  set('vuConfirmaSenha', '', 'v');

  const bookings  = getBookings().filter(b => b.userId === id && b.status !== 'cancelada');
  const inscritos = getInscricoes().filter(i => i.userId === id);
  const gasto = bookings.reduce((s,b)=>s+bookingPrice(b),0) + inscritos.reduce((s,i)=>s+(i.preco||0),0);
  set('vuStatReservas', getBookings().filter(b=>b.userId===id).length);
  set('vuStatEventos', inscritos.length);
  set('vuStatGasto', fmtMoney(gasto));
  set('vuStatCredito', fmtMoney(u.creditos||0));

  document.querySelectorAll('#vuStatusGrp button').forEach(b => b.classList.toggle('is-on', b.dataset.st === status));

  const reservas = getBookings().filter(b => b.userId === id).sort((a,b) => b.date.localeCompare(a.date));
  set('vuResCount', reservas.length);
  const resEl = document.getElementById('vuReservasList');
  if (resEl) resEl.innerHTML = reservas.length === 0
    ? '<p style="color:var(--gray);font-size:.85rem">Nenhuma reserva.</p>'
    : reservas.map(b => `
      <div class="finance-row" style="padding:.6rem 0">
        <div class="finance-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg></div>
        <div>
          <div class="finance-desc">${bookingLabel(b)}</div>
          <div class="finance-meta">${fmtDate(b.date)} às ${bookingTimeRange(b)}</div>
        </div>
        <div style="text-align:right">
          <div class="finance-value">${fmtMoney(bookingPrice(b))}</div>
          <div style="margin-top:.2rem">${badgeHTML(efetivoStatusReserva(b))}</div>
        </div>
      </div>`).join('');

  const eventos = getInscricoes().filter(i => i.userId === id).sort((a,b) => (b.eventData||'').localeCompare(a.eventData||''));
  set('vuEvCount', eventos.length);
  const evEl = document.getElementById('vuEventosList');
  if (evEl) evEl.innerHTML = eventos.length === 0
    ? '<p style="color:var(--gray);font-size:.85rem">Nenhuma inscrição.</p>'
    : eventos.map(i => `
      <div class="finance-row" style="padding:.6rem 0">
        <div class="finance-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></div>
        <div>
          <div class="finance-desc">${i.eventNome||'—'}</div>
          <div class="finance-meta">${fmtDate(i.eventData)}</div>
        </div>
        <div style="text-align:right">
          <div class="finance-value">${fmtMoney(i.preco)}</div>
          <div style="margin-top:.2rem"><span class="badge badge-gold">Inscrito</span></div>
        </div>
      </div>`).join('');

  openModal('modalViewUser');
}

function salvarEdicaoUsuario() {
  const id     = document.getElementById('editUserId')?.value;
  const nome   = document.getElementById('editNome')?.value.trim();
  const tel    = document.getElementById('editTel')?.value.trim();
  const genero = document.getElementById('editGenero')?.value;
  if (!nome) { adminToast('Nome obrigatório.','error'); return; }
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return;
  users[idx].nome   = nome;
  users[idx].tel    = tel;
  users[idx].genero = genero;
  saveUsers(users);
  closeModal('modalEditUser');
  adminToast('Usuário atualizado com sucesso.');
  renderUsuarios();
}

// Segmented control de status + edição completa, direto no modal "Ver Perfil"
function onStatusPick(e) {
  const grp = e.currentTarget.parentElement;
  grp.querySelectorAll('button').forEach(b => b.classList.toggle('is-on', b === e.currentTarget));
}

function salvarPerfilUsuario() {
  const id     = document.getElementById('vuUserId')?.value;
  const nome   = document.getElementById('vuNomeInput')?.value.trim();
  const tel    = document.getElementById('vuTel')?.value.trim();
  const genero = document.getElementById('vuGeneroInput')?.value;
  const statusBtn = document.querySelector('#vuStatusGrp button.is-on');
  const status = statusBtn?.dataset.st || 'ativo';
  if (!nome) { adminToast('Nome obrigatório.', 'error'); return; }

  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return;
  users[idx].nome   = nome;
  users[idx].tel    = tel;
  users[idx].genero = genero;
  users[idx].status = status;
  users[idx].ativo  = status !== 'bloqueado';
  saveUsers(users);

  adminToast('Perfil atualizado com sucesso.');
  closeModal('modalViewUser');
  renderUsuarios();
  renderDashboard();
}

function definirNovaSenha() {
  const id = document.getElementById('vuUserId')?.value;
  const nova = document.getElementById('vuNovaSenha')?.value;
  const conf = document.getElementById('vuConfirmaSenha')?.value;
  if (!nova || nova.length < 6) { adminToast('A senha precisa ter ao menos 6 caracteres.', 'error'); return; }
  if (nova !== conf) { adminToast('As senhas não coincidem.', 'error'); return; }

  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return;
  users[idx].senha = btoa(nova);
  saveUsers(users);

  set('vuNovaSenha', '', 'v');
  set('vuConfirmaSenha', '', 'v');
  adminToast(`Senha redefinida para ${users[idx].nome}.`);
}

function enviarLinkSenha() {
  adminToast('Em um app real, um link de redefinição seria enviado por e-mail.', 'warn');
}

// ══════════════════════════════════════════
// EVENTOS E INSCRIÇÕES
// (getEventos/saveEventos vêm de js/eventos-store.js — fonte única
//  compartilhada com o site público, ver pages/eventos.html e index.html)
// ══════════════════════════════════════════
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

  // Cards de eventos
  const evEl = document.getElementById('eventosCardGrid');
  if (evEl) {
    evEl.innerHTML = eventos.length === 0
      ? adminEmptyHTML('Nenhum evento encontrado')
      : eventos.map(ev => {
      const nInsc = insc.filter(i => i.eventNome === ev.nome).length;
      const pct   = Math.min(100, Math.round(nInsc/ev.vagas*100));
      const statusBadge = ev.status==='aberto'
        ? '<span class="badge badge-green">Inscrições Abertas</span>'
        : ev.status==='encerrado'
          ? '<span class="badge badge-gray">Encerrado</span>'
          : '<span class="badge badge-amber">Em Breve</span>';
      return `
      <div class="admin-event-card">
        <div class="admin-event-banner">
          ${statusBadge}
          <span class="admin-event-cat">${CATEGORIA_LABELS[ev.categoria] || 'Geral'}</span>
        </div>
        <div class="admin-event-body">
          <div class="admin-event-name">${ev.nome}</div>
          <div class="admin-event-meta">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            ${fmtDate(ev.data)} · ${ev.local}
          </div>
          <div class="admin-event-progress-row"><span>${nInsc}/${ev.vagas} vagas</span><b>${fmtMoney(ev.preco)}</b></div>
          <div class="admin-event-progress"><span style="width:${pct}%"></span></div>
          <div class="admin-event-actions">
            <button class="btn-admin-secondary" onclick="verInscricoes('${ev.id}','${ev.nome}')">Inscrições</button>
            <button class="btn-admin-secondary" onclick="editarEvento('${ev.id}')">Editar</button>
            <button class="admin-action-btn danger" title="Excluir evento" onclick="excluirEvento('${ev.id}')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
          </div>
        </div>
      </div>`;
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
            <td><div class="admin-row-actions">
              <button class="admin-action-btn danger" title="Remover inscrição" onclick="removerInscricao('${i.id}')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
            </div></td>
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

  const rec  = b => b.status !== 'cancelada';
  const total      = bookings.filter(rec).reduce((s,b)=>s+bookingPrice(b),0);
  const totalInsc  = insc.reduce((s,i)=>s+(i.preco||0),0);
  const { mesAtual, delta } = calcReceitaMensal(bookings);

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
  const catNorm = c => ({ beachtennis:'beach-tennis' }[c] || c);
  const reservasRec = bookings.map(b=>({...b, _type:'reserva', _user: usersMap[b.userId]?.nome||'Usuário', _date: b.criadaEm, _label: bookingLabel(b), _price: bookingPrice(b),
    _cat: `reserva ${b.dayUse ? 'dayuse' : catNorm(b.modalidade)}` }));
  const inscRec     = insc.map(i=>({...i, _type:'evento', _user: usersMap[i.userId]?.nome||'Usuário', _date: i.criadaEm, _label: i.eventNome, _price: i.preco, status:'inscrito',
    _cat: `evento ${catNorm(i.categoria)}` }));
  const all = [...reservasRec, ...inscRec]
    .sort((a,b)=>(b._date||'').localeCompare(a._date||''))
    .slice(0,12);

  const el = document.getElementById('finTransacoes');
  if (el) {
    el.innerHTML = all.length === 0
      ? adminEmptyHTML('Nenhuma transação')
      : all.map(t => {
          const stReal = t._type === 'reserva' ? efetivoStatusReserva(t) : t.status;
          const isCanceled = stReal === 'cancelada';
          return `
          <div class="finance-row" data-cat="${t._cat}">
            <div class="finance-icon">
              ${t._type==='evento'
                ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`
              }
            </div>
            <div>
              <div class="finance-desc">${t._label||'—'}</div>
              <div class="finance-meta">${t._user} · ${fmtDate((t._date||'').slice(0,10))}</div>
            </div>
            <div style="text-align:right">
              <div class="finance-value ${isCanceled?'neg':''}">${isCanceled?'-':''}${fmtMoney(t._price)}</div>
              <div style="margin-top:.2rem">${badgeHTML(stReal)}</div>
            </div>
          </div>`;
        }).join('');
  }
}

function onFinFilter(fil) {
  document.querySelectorAll('#finChipsRow .admin-chip').forEach(el => el.classList.toggle('is-on', el.dataset.fil === fil));
  document.querySelectorAll('#finTransacoes .finance-row').forEach(row => {
    const cats = (row.dataset.cat || '').split(' ');
    row.style.display = (fil === 'tudo' || cats.includes(fil)) ? '' : 'none';
  });
}

// ══════════════════════════════════════════
// CONFIGURAÇÕES
// ══════════════════════════════════════════
const CONFIG_DEFAULT = {
  nome: 'Podium Arena',
  cnpj: '',
  telefone: '(43) 9 9999-9999',
  endereco: 'Rua Manaus, 321 — Telêmaco Borba/PR',
  email: 'contato@podium.com',
  abertura: '08:00',
  fechamento: '23:00',
  dias: [0,1,2,3,4,5], // Seg..Sáb ligados, Dom desligado
  antecedencia: 14,
  cancelamento: 6,
  duracaoSlot: '60 min',
  valorPadrao: 'R$ 90,00',
  notifEmail: true,
  notifWhatsapp: true,
  notifCancelamento: false,
  notifResumo: true,
};
function getConfig() {
  const stored = localStorage.getItem('podium_config');
  return stored ? { ...CONFIG_DEFAULT, ...JSON.parse(stored) } : { ...CONFIG_DEFAULT };
}
function saveConfig(cfg) { localStorage.setItem('podium_config', JSON.stringify(cfg)); }

function toggleChip(el) { el.classList.toggle('is-on'); }
function toggleSwitch(el) { el.classList.toggle('is-on'); }

function renderConfiguracoes() {
  const cfg = getConfig();
  set('cfgNome', cfg.nome, 'v');
  set('cfgCnpj', cfg.cnpj, 'v');
  set('cfgTelefone', cfg.telefone, 'v');
  set('cfgEndereco', cfg.endereco, 'v');
  set('cfgEmail', cfg.email, 'v');
  set('cfgAbertura', cfg.abertura, 'v');
  set('cfgFechamento', cfg.fechamento, 'v');
  set('cfgAntecedencia', cfg.antecedencia, 'v');
  set('cfgCancelamento', cfg.cancelamento, 'v');
  set('cfgDuracaoSlot', cfg.duracaoSlot, 'v');
  set('cfgValorPadrao', cfg.valorPadrao, 'v');

  document.querySelectorAll('#cfgDiasGrp .admin-daychip').forEach(el => {
    el.classList.toggle('is-on', cfg.dias.includes(parseInt(el.dataset.day, 10)));
  });
  document.querySelectorAll('.admin-switch[data-cfg]').forEach(el => {
    el.classList.toggle('is-on', !!cfg[el.dataset.cfg]);
  });
}

function salvarConfiguracoes() {
  const dias = [...document.querySelectorAll('#cfgDiasGrp .admin-daychip.is-on')].map(el => parseInt(el.dataset.day, 10));
  const cfg = {
    nome: document.getElementById('cfgNome')?.value.trim(),
    cnpj: document.getElementById('cfgCnpj')?.value.trim(),
    telefone: document.getElementById('cfgTelefone')?.value.trim(),
    endereco: document.getElementById('cfgEndereco')?.value.trim(),
    email: document.getElementById('cfgEmail')?.value.trim(),
    abertura: document.getElementById('cfgAbertura')?.value.trim(),
    fechamento: document.getElementById('cfgFechamento')?.value.trim(),
    dias,
    antecedencia: parseInt(document.getElementById('cfgAntecedencia')?.value) || 0,
    cancelamento: parseInt(document.getElementById('cfgCancelamento')?.value) || 0,
    duracaoSlot: document.getElementById('cfgDuracaoSlot')?.value.trim(),
    valorPadrao: document.getElementById('cfgValorPadrao')?.value.trim(),
    notifEmail: document.querySelector('.admin-switch[data-cfg="notifEmail"]')?.classList.contains('is-on') || false,
    notifWhatsapp: document.querySelector('.admin-switch[data-cfg="notifWhatsapp"]')?.classList.contains('is-on') || false,
    notifCancelamento: document.querySelector('.admin-switch[data-cfg="notifCancelamento"]')?.classList.contains('is-on') || false,
    notifResumo: document.querySelector('.admin-switch[data-cfg="notifResumo"]')?.classList.contains('is-on') || false,
  };
  saveConfig(cfg);
  adminToast('Configurações salvas com sucesso!');
}

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════
function badgeHTML(status) {
  const map = {
    confirmada: 'badge-gold',
    pendente:   'badge-amber',
    concluida:  'badge-green',
    cancelada:  'badge-red',
    inscrito:   'badge-gold',
  };
  const label = { confirmada:'Confirmada', pendente:'Pendente', concluida:'Concluída', cancelada:'Cancelada', inscrito:'Inscrito' };
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

// ── Backup (exportar / importar) ─────────
const BACKUP_KEYS = ['podium_users', 'podium_bookings', 'podium_inscricoes', 'podium_eventos', 'podium_ranking', 'podium_blocked_slots', 'podium_credit_log'];

function exportarBackupAdmin() {
  const data = { _exportadoEm: new Date().toISOString() };
  BACKUP_KEYS.forEach(k => {
    const v = localStorage.getItem(k);
    if (v !== null) data[k] = JSON.parse(v);
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `podium-arena-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  adminToast('Backup exportado com sucesso.');
}

function importarBackupAdmin(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try { data = JSON.parse(reader.result); }
    catch { adminToast('Arquivo de backup inválido.', 'error'); return; }

    openConfirmModal(
      'Restaurar backup?',
      'Isso vai sobrescrever todos os dados atuais (usuários, reservas, eventos, ranking). Esta ação não pode ser desfeita.',
      () => {
        BACKUP_KEYS.forEach(k => {
          if (data[k] !== undefined) localStorage.setItem(k, JSON.stringify(data[k]));
        });
        adminToast('Backup restaurado. Recarregando...');
        setTimeout(() => location.reload(), 900);
      }
    );
  };
  reader.readAsText(file);
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
// GATE — ACESSO ADMINISTRATIVO
// (separado do login público: ver pages/admin.html#adminGate.
//  Mesma base de usuários, mas a sessão só dá acesso ao painel
//  se for validada aqui, mesmo que já exista login no site público.)
// ══════════════════════════════════════════
function isValidAdminSession() {
  const session = typeof Auth !== 'undefined' ? Auth.getUser() : null;
  if (!session) return null;
  const me = getUsers().find(u => u.id === session.id);
  if (!me?.admin || userStatus(me) === 'bloqueado') return null;
  return { session, me };
}

function showAdminGate() {
  document.body.classList.add('gate-active');
}
function hideAdminGate() {
  document.body.classList.remove('gate-active');
  document.getElementById('gateError').style.display = 'none';
  document.getElementById('gateForm')?.reset();
}
function showGateError(msg) {
  const el = document.getElementById('gateError');
  if (!el) return;
  el.querySelector('span').textContent = msg;
  el.style.display = 'flex';
}

function handleAdminGateLogin(e) {
  e.preventDefault();
  const email = document.getElementById('gateEmail')?.value.trim();
  const senha = document.getElementById('gateSenha')?.value;
  document.getElementById('gateError').style.display = 'none';

  const users = getUsers();
  const user = users.find(u => u.email === email && u.senha === btoa(senha || ''));
  if (!user) { showGateError('E-mail ou senha incorretos.'); return; }
  if (!user.admin) { showGateError('Esta conta não tem permissão de administrador.'); return; }
  if (userStatus(user) === 'bloqueado') { showGateError('Esta conta está bloqueada.'); return; }

  user.ultimoAcessoEm = new Date().toISOString();
  saveUsers(users);
  Auth.saveUser({ email: user.email, nome: user.nome, id: user.id, admin: true });

  hideAdminGate();
  initAdminApp({ email: user.email, nome: user.nome, id: user.id, admin: true });
}

function bootAdmin() {
  const valid = isValidAdminSession();
  if (!valid) { showAdminGate(); return; }
  document.body.classList.remove('gate-active');
  initAdminApp(valid.session);
}

// ══════════════════════════════════════════
// INICIALIZAÇÃO DO PAINEL (pós-login)
// ══════════════════════════════════════════
function initAdminApp(session) {
  // Topbar
  const ini = initials(session.nome||'A');
  set('adminTopbarAvatar', ini);
  set('adminTopbarName',   session.nome||'Admin');

  // Saudação do Dashboard ("Bom dia, Nome" conforme a hora atual)
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const primeiroNome = (session.nome || 'Admin').split(' ')[0];
  set('dashGreetingName', `${saudacao}, ${primeiroNome}`);

  // Logout
  document.getElementById('btnAdminLogout')?.addEventListener('click', () => {
    abrirModalLogoutAdmin();
  });

  // Nav
  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      adminTab(item.dataset.tab);
      // Só fecha o menu mobile se ele estiver aberto (evita "embaçar" a tela no desktop)
      if (document.getElementById('adminSidebar')?.classList.contains('open')) {
        toggleAdminMenu();
      }
    });
  });

  // Seeds + render inicial
  seedMockData();
  migrarUsuarios();
  renderDashboard();
  renderReservas();
  renderUsuarios();
  renderEventos();
  renderFinanceiro();
  renderRankingAdmin();
  renderConfiguracoes();

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
  document.getElementById('reservasQuadraFilter')?.addEventListener('change', e => {
    state.reservas.quadra = e.target.value; state.reservas.page = 1; renderReservas();
  });
  document.getElementById('reservasModalidadeFilter')?.addEventListener('change', e => {
    state.reservas.modalidade = e.target.value; state.reservas.page = 1; renderReservas();
  });
  document.getElementById('reservasDataDe')?.addEventListener('change', e => {
    state.reservas.de = e.target.value; state.reservas.page = 1; renderReservas();
  });
  document.getElementById('reservasDataAte')?.addEventListener('change', e => {
    state.reservas.ate = e.target.value; state.reservas.page = 1; renderReservas();
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
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('gateForm')?.addEventListener('submit', handleAdminGateLogin);
  // O tooltip usa position:fixed, mas .admin-section.active deixa um
  // transform residual (fill-mode:forwards da animação de entrada) que cria
  // um novo containing block — isso fazia o tooltip "fugir" do cursor.
  // Reparentar pro <body> evita esse problema independente de qualquer
  // transform/filter em ancestrais.
  const tip = document.getElementById('gradeTooltip');
  if (tip) document.body.appendChild(tip);
  bootAdmin();
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
window.cancelarReservaAdmin = cancelarReservaAdmin;
window.setUsuarioStatus  = setUsuarioStatus;
window.editarUsuario     = editarUsuario;
window.verPerfilUsuario  = verPerfilUsuario;
window.salvarEdicaoUsuario = salvarEdicaoUsuario;
window.onStatusPick      = onStatusPick;
window.salvarPerfilUsuario = salvarPerfilUsuario;
window.definirNovaSenha  = definirNovaSenha;
window.enviarLinkSenha   = enviarLinkSenha;
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
window.exportarBackupAdmin = exportarBackupAdmin;
window.importarBackupAdmin = importarBackupAdmin;
window.toggleAdminTheme  = toggleAdminTheme;
window.setGradeView      = setGradeView;
window.gradePrev         = gradePrev;
window.gradeNext         = gradeNext;
window.gradeHoje         = gradeHoje;
window.gradeGoToDate     = gradeGoToDate;
window.blockSlotAdmin    = blockSlotAdmin;
window.unblockSlotAdmin  = unblockSlotAdmin;
window.toggleBloqueioLinha = toggleBloqueioLinha;
window.abrirModalCredito    = abrirModalCredito;
window.atualizarSaldoCredito = atualizarSaldoCredito;
window.salvarCredito     = salvarCredito;
window.onDayFilter       = onDayFilter;
window.abrirNovaReserva  = abrirNovaReserva;
window.salvarNovaReserva = salvarNovaReserva;
window.verDetalhesReserva = verDetalhesReserva;
window.abrirEditarReserva = abrirEditarReserva;
window.salvarEdicaoReserva = salvarEdicaoReserva;
window.onFinFilter       = onFinFilter;
window.toggleChip        = toggleChip;
window.toggleSwitch      = toggleSwitch;
window.salvarConfiguracoes = salvarConfiguracoes;

// ══════════════════════════════════════════
// NOVO EVENTO / EDITAR EVENTO
// ══════════════════════════════════════════
function abrirNovoEvento() {
  document.getElementById('novoEventoTitle').textContent = 'Novo Evento';
  document.getElementById('editEventoId').value = '';
  ['evNome','evData','evHora','evLocal','evDesc','evNivel'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
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
  document.getElementById('evNivel').value  = ev.nivel || '';
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
    nivel:     document.getElementById('evNivel').value.trim() || 'Todos os níveis',
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
// (getRanking/saveRanking vêm de js/ranking-store.js — fonte única
//  compartilhada com o site público, ver pages/ranking.html)
// ══════════════════════════════════════════
const RANKING_MOD_LABELS = { beachtennis: 'Beach Tennis', futevolei: 'Futevôlei' };
const RANKING_CAT_LABELS = { masculino: 'Masculino', feminino: 'Feminino' };
const RANKING_COMBOS = [
  ['beachtennis','masculino'], ['beachtennis','feminino'],
  ['futevolei','masculino'],   ['futevolei','feminino'],
];

function renderRankingAdmin() {
  const data = getRanking();
  const posClass = i => i===0?'p1':i===1?'p2':i===2?'p3':'';
  const grid = document.getElementById('rankingCardGrid');
  if (!grid) return;

  grid.innerHTML = RANKING_COMBOS.map(([mod, cat]) => {
    const entries = data[mod]?.[cat] || [];
    const list = entries.length === 0
      ? '<div style="padding:1rem 1.2rem;color:var(--gray);font-size:.85rem">Sem dados — clique em Editar para adicionar.</div>'
      : entries.map((p,i) => `
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
    return `
      <div class="admin-card">
        <div class="rank-admin-card-header">
          <h3>${RANKING_MOD_LABELS[mod]} — ${RANKING_CAT_LABELS[cat]}</h3>
          <button class="btn-rank-edit" onclick="abrirModalRanking('${mod}','${cat}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            Editar
          </button>
        </div>
        ${list}
      </div>`;
  }).join('');
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
  const data = getRanking();
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

  const data = getRanking();
  if (!data[mod]) data[mod] = {};
  data[mod][cat] = entries;
  saveRanking(data);
  adminToast('Ranking atualizado com sucesso!');
  closeModal('modalRanking');
  renderRankingAdmin();
}