/* ═══════════════════════════════════════════
   RESERVAS.JS — Fluxo em 4 Etapas
   Podium Arena
   ═══════════════════════════════════════════ */

// PRICE_TABLE, isWeekend e getPriceForHour vêm de js/booking-utils.js
// (compartilhados com o painel admin), carregado antes deste script.

const MODALIDADES = [
  {
    id: 'beach-tennis',
    label: 'Beach Tennis',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M6.3 6.3a8 8 0 0 1 11.4 0"/><path d="M6.3 17.7a8 8 0 0 0 11.4 0"/><path d="M12 2v20"/></svg>`,
    desc: 'Quadra coberta ou descoberta',
    dayUseOnly: false,
  },
  {
    id: 'futevolei',
    label: 'Futevôlei',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
    desc: 'Quadra coberta ou descoberta',
    dayUseOnly: false,
  },
  {
    id: 'volei',
    label: 'Vôlei',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 12c-2-2.5-2-5.5 0-8"/><path d="M12 12c2.5-1.5 5-1 7.5.5"/><path d="M12 12c-.5 2.5-2.5 4.5-5 5.5"/></svg>`,
    desc: 'Quadra coberta ou descoberta',
    dayUseOnly: false,
  },
  {
    id: 'pickleball',
    label: 'Pickleball',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/><path d="M12 7a5 5 0 0 1 5 5"/></svg>`,
    desc: 'Somente Day Use · R$ 25/pessoa',
    dayUseOnly: true,
  },
];

// Cards da etapa 2 — uma quadra por card (COURTS vem de booking-utils.js).
// Pickleball não aparece aqui: é day-use e pula direto para o pagamento.
const QUADRA_ICONS = {
  coberta: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  descoberta: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`,
};
const QUADRAS = COURTS.filter(c => !c.dayUse).map(c => ({
  id: c.id,
  label: c.label,
  sub: c.tipo === 'coberta' ? 'Quadra coberta' : 'Quadra descoberta',
  icon: QUADRA_ICONS[c.tipo],
}));

// Eventos que bloqueiam dias
const EVENTS = {
  '2026-05-22': 'Torneio Aberto Beach Tennis',
  '2026-05-29': 'Liga Futevôlei — Etapa TB',
  '2026-06-06': 'Clínica Pickleball',
  '2026-06-15': 'Campeonato Master Vôlei',
  '2026-06-26': 'Torneio Taekwondo',
  '2026-07-04': 'Copa Podium Arena',
};

// ─── Estado global ────────────────────────
let state = {
  step: 1,
  modalidade: null,
  quadra: null,    // tipo: 'coberta' | 'descoberta'
  quadraId: null,  // id da quadra física (ver COURTS em booking-utils.js)
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  selectedDate: null,
  selectedSlots: [],   // array de horas ex: [9, 10]
  dayUse: false,
  payment: null,
  bookings: JSON.parse(localStorage.getItem('podium_bookings') || '[]'),
};

// ─── Utils ────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function todayKey() {
  const t = new Date();
  return dateKey(t.getFullYear(), t.getMonth(), t.getDate());
}
function formatDatePT(dateStr) {
  if (!dateStr) return '—';
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const [y, m, d] = dateStr.split('-');
  return `${d} ${months[parseInt(m) - 1]} ${y}`;
}
function formatDateLong(dateStr) {
  if (!dateStr) return '—';
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const [y, m, d] = dateStr.split('-');
  return `${d} de ${months[parseInt(m) - 1]} de ${y}`;
}

// Conflito de horários: ver js/booking-utils.js (getOccupiedHours, hasConflitoHorario),
// carregado antes deste script — lógica compartilhada com o painel admin.

// ─── Stepper ──────────────────────────────
function updateStepper() {
  document.querySelectorAll('.bk-step').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove('active', 'done');
    if (s === state.step) el.classList.add('active');
    if (s < state.step)  el.classList.add('done');
  });
  // conectores
  document.querySelectorAll('.bk-step-line').forEach(el => {
    const s = parseInt(el.dataset.after);
    el.classList.toggle('done', s < state.step);
  });
}

function goToStep(n) {
  if (n < 1 || n > 4) return;
  state.step = n;
  updateStepper();
  document.querySelectorAll('.bk-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('bk-panel-' + n)?.classList.add('active');
  if (n === 3) buildCalendar();
  if (n === 4) buildPaymentSummary();
  window.scrollTo({ top: document.querySelector('.bk-stepper-wrap')?.offsetTop - 90 || 0, behavior: 'smooth' });
}

// ─── ETAPA 1 – Modalidade ─────────────────
function renderModalidades() {
  const grid = document.getElementById('bk-modal-grid');
  if (!grid) return;
  grid.innerHTML = MODALIDADES.map(m => `
    <div class="bk-option-card ${m.dayUseOnly ? 'dayuse-only' : ''}" data-id="${m.id}" onclick="selectModalidade('${m.id}')">
      ${m.dayUseOnly ? '<div class="bk-badge-dayuse">Day Use</div>' : ''}
      <div class="bk-option-icon">${m.icon}</div>
      <div class="bk-option-name">${m.label}</div>
      <div class="bk-option-desc">${m.desc}</div>
    </div>
  `).join('');
}

function selectModalidade(id) {
  state.modalidade = id;
  state.quadra = null;
  state.quadraId = null;
  state.selectedDate = null;
  state.selectedSlots = [];
  state.dayUse = false;

  document.querySelectorAll('#bk-modal-grid .bk-option-card').forEach(c => {
    c.classList.toggle('active', c.dataset.id === id);
  });

  const pickNotice = document.getElementById('bk-pickleball-notice');
  pickNotice.style.display = id === 'pickleball' ? 'flex' : 'none';

  document.getElementById('bk-btn-modal-next').disabled = false;
}

// ─── ETAPA 2 – Quadra ─────────────────────
function renderQuadras() {
  const grid = document.getElementById('bk-quadra-grid');
  if (!grid) return;
  grid.innerHTML = QUADRAS.map(q => `
    <div class="bk-option-card" data-id="${q.id}" onclick="selectQuadra('${q.id}')">
      <div class="bk-option-icon">${q.icon}</div>
      <div class="bk-option-name">${q.label}</div>
      <div class="bk-option-desc">${q.sub}</div>
    </div>
  `).join('');
}

function selectQuadra(id) {
  const court = getCourtById(id);
  state.quadraId = id;
  state.quadra = court ? court.tipo : null;
  state.selectedDate = null;
  state.selectedSlots = [];

  document.querySelectorAll('#bk-quadra-grid .bk-option-card').forEach(c => {
    c.classList.toggle('active', c.dataset.id === id);
  });

  // Exibe tabela de preços
  const info = document.getElementById('bk-quadra-priceinfo');
  const table = PRICE_TABLE[state.quadra];
  info.innerHTML = `
    <div class="bk-price-table">
      <div class="bk-price-col">
        <div class="bk-price-col-title">Seg – Sex</div>
        ${table.weekday.map(b => `<div class="bk-price-row"><span>${pad(b.from)}h–${pad(b.to)}h</span><span>R$ ${b.price}/h</span></div>`).join('')}
      </div>
      <div class="bk-price-col">
        <div class="bk-price-col-title">Sáb · Dom · Feriados</div>
        ${table.weekend.map(b => `<div class="bk-price-row"><span>${pad(b.from)}h–${pad(b.to)}h</span><span>R$ ${b.price}/h</span></div>`).join('')}
      </div>
    </div>
  `;
  info.style.display = 'block';

  document.getElementById('bk-btn-quadra-next').disabled = false;
}

// ─── ETAPA 3 – Calendário + Horários ──────
function buildCalendar() {
  renderCalendar();
  renderTimeSlots();
  updateStep3Summary();
}

function renderCalendar() {
  const y = state.calYear, m = state.calMonth;
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  document.getElementById('bk-cal-title').textContent = `${months[m]} ${y}`;

  const firstDay    = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today       = todayKey();

  let html = '';
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-cell empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const key       = dateKey(y, m, d);
    const isPast    = key < today;
    const isToday   = key === today;
    const isSel     = key === state.selectedDate;
    const isEvt     = !!EVENTS[key];

    let cls = 'cal-cell';
    if (isPast)   cls += ' past';
    if (isEvt && !isPast)    cls += ' event-day';
    if (isToday)  cls += ' today';
    if (isSel)    cls += ' selected';

    const click = !isPast && !isEvt
      ? `onclick="selectDate('${key}')"`
      : isEvt && !isPast
        ? `onclick="showEventBanner('${key}')" title="${EVENTS[key]}"`
        : '';

    html += `<div class="${cls}" ${click}>${d}</div>`;
  }

  document.getElementById('bk-cal-grid').innerHTML = html;
}

function selectDate(key) {
  state.selectedDate = key;
  state.selectedSlots = [];
  renderCalendar();
  renderTimeSlots();
  updateStep3Summary();
}

function renderTimeSlots() {
  const grid = document.getElementById('bk-times-grid');
  const wrap = document.getElementById('bk-times-section');
  if (!grid) return;

  if (!state.selectedDate || !state.quadraId) {
    grid.innerHTML = '';
    wrap.style.display = 'none';
    return;
  }

  wrap.style.display = 'block';

  const weekend   = isWeekend(state.selectedDate);
  const today     = todayKey();
  const nowHour   = state.selectedDate === today ? new Date().getHours() : -1;
  const maxHour   = weekend ? 22 : 23;
  const occupied  = getOccupiedHours(state.quadraId, state.selectedDate);

  // Horário já reservado por outra pessoa não pode permanecer selecionado
  state.selectedSlots = state.selectedSlots.filter(h => !occupied.has(h));

  let html = '';
  for (let h = 8; h < maxHour; h++) {
    const price      = getPriceForHour(h, state.quadra, weekend);
    const isPast     = h <= nowHour;
    const isOccupied = occupied.has(h);
    const isBlocked  = isPast || isOccupied;
    const isSel      = state.selectedSlots.includes(h);
    let cls = 'time-slot';
    if (isBlocked) cls += ' taken';
    if (isSel)     cls += ' selected';
    const click = !isBlocked ? `onclick="toggleSlot(${h})"` : '';
    const title = isOccupied && !isPast ? 'title="Horário já reservado"' : '';
    html += `<div class="${cls}" ${click} ${title}><span class="ts-hour">${pad(h)}:00</span><span class="ts-price">R$${price}</span></div>`;
  }
  grid.innerHTML = html;
}

function toggleSlot(h) {
  const idx = state.selectedSlots.indexOf(h);
  if (idx === -1) state.selectedSlots.push(h);
  else            state.selectedSlots.splice(idx, 1);
  state.selectedSlots.sort((a, b) => a - b);
  renderTimeSlots();
  updateStep3Summary();
}

function toggleDayUse() {
  state.dayUse = !state.dayUse;
  const btn = document.getElementById('bk-dayuse-btn');
  btn.classList.toggle('active', state.dayUse);
  btn.querySelector('.bk-dayuse-check').textContent = state.dayUse ? '✓' : '';
  updateStep3Summary();
}

function updateStep3Summary() {
  const summary  = document.getElementById('bk-step3-summary');
  const rowsEl   = document.getElementById('bk-step3-rows');
  const totalEl  = document.getElementById('bk-step3-total');
  const nextBtn  = document.getElementById('bk-btn-time-next');

  const weekend   = state.selectedDate ? isWeekend(state.selectedDate) : false;
  let total = 0;
  let rows  = '';

  if (state.selectedDate) {
    rows += `<div class="bk-sum-row"><span class="bk-sum-label">Data</span><span class="bk-sum-val">${formatDatePT(state.selectedDate)}</span></div>`;
  }

  if (state.selectedSlots.length) {
    state.selectedSlots.forEach(h => {
      const price = getPriceForHour(h, state.quadra, weekend);
      total += price;
      rows += `<div class="bk-sum-row"><span class="bk-sum-label">${pad(h)}:00 – ${pad(h + 1)}:00</span><span class="bk-sum-val">R$ ${price}</span></div>`;
    });
  }

  if (state.dayUse) {
    total += 25;
    rows += `<div class="bk-sum-row"><span class="bk-sum-label">Day Use</span><span class="bk-sum-val">R$ 25</span></div>`;
  }

  const canProceed = state.selectedDate && state.selectedSlots.length > 0;
  nextBtn.disabled = !canProceed;

  if (!rows) { summary.style.display = 'none'; return; }
  rowsEl.innerHTML = rows;
  totalEl.textContent = `R$ ${total}`;
  summary.style.display = 'block';
}

function calcTotal() {
  if (!state.selectedDate || !state.quadra) return state.dayUse ? 25 : 0;
  const weekend = isWeekend(state.selectedDate);
  let total = 0;
  state.selectedSlots.forEach(h => { total += getPriceForHour(h, state.quadra, weekend); });
  if (state.dayUse || state.modalidade === 'pickleball') total += 25;
  return total;
}

// ─── ETAPA 4 – Pagamento ──────────────────
function buildPaymentSummary() {
  const rows  = document.getElementById('bk-pay-summary-rows');
  const total = document.getElementById('bk-pay-total');
  if (!rows) return;

  const modalLabels = { 'beach-tennis': 'Beach Tennis', futevolei: 'Futevôlei', volei: 'Vôlei', pickleball: 'Pickleball' };
  const weekend = state.selectedDate ? isWeekend(state.selectedDate) : false;

  let html = '';
  html += `<div class="bk-sum-row"><span class="bk-sum-label">Modalidade</span><span class="bk-sum-val">${modalLabels[state.modalidade] || '—'}</span></div>`;

  if (state.modalidade !== 'pickleball') {
    html += `<div class="bk-sum-row"><span class="bk-sum-label">Quadra</span><span class="bk-sum-val">${getCourtById(state.quadraId)?.label || '—'}</span></div>`;
    html += `<div class="bk-sum-row"><span class="bk-sum-label">Data</span><span class="bk-sum-val">${formatDatePT(state.selectedDate)}</span></div>`;
    if (state.selectedSlots.length) {
      const s = state.selectedSlots;
      html += `<div class="bk-sum-row"><span class="bk-sum-label">Horário</span><span class="bk-sum-val">${pad(s[0])}:00 – ${pad(s[s.length - 1] + 1)}:00</span></div>`;
      s.forEach(h => {
        const price = getPriceForHour(h, state.quadra, weekend);
        html += `<div class="bk-sum-row indent"><span class="bk-sum-label">${pad(h)}:00–${pad(h+1)}:00</span><span class="bk-sum-val">R$ ${price}</span></div>`;
      });
    }
  }

  if (state.dayUse || state.modalidade === 'pickleball') {
    html += `<div class="bk-sum-row"><span class="bk-sum-label">Day Use</span><span class="bk-sum-val">R$ 25</span></div>`;
  }

  rows.innerHTML = html;
  total.textContent = `R$ ${calcTotal()}`;
}

function selectPayment(method) {
  state.payment = method;
  document.querySelectorAll('.bk-pay-method').forEach(el => {
    el.classList.toggle('active', el.dataset.method === method);
  });
  document.getElementById('bk-pix-block').style.display   = method === 'pix'     ? 'block' : 'none';
  document.getElementById('bk-card-block').style.display  = (method === 'credito' || method === 'debito') ? 'block' : 'none';
  document.getElementById('bk-btn-confirmar').disabled = false;
}

// ─── Confirmar ────────────────────────────
function confirmarReserva() {
  const user = window.Auth?.getUser();
  if (!user) {
    window.openAuthModal?.('login');
    showToast('Faça login para confirmar sua reserva.', 'error');
    return;
  }

  // Revalida disponibilidade com os dados mais recentes (protege contra
  // outra reserva conflitante criada enquanto esta tela estava aberta).
  const isQuadraReal = state.quadraId && state.quadraId !== 'pickleball';
  if (isQuadraReal && hasConflitoHorario(state.quadraId, state.selectedDate, state.selectedSlots)) {
    showToast('Esse horário acabou de ser reservado. Escolha outro horário disponível.', 'error');
    goToStep(3);
    return;
  }

  const freshBookings = JSON.parse(localStorage.getItem('podium_bookings') || '[]');

  const booking = {
    id: Date.now().toString(),
    userId: user.id,
    userName: user.nome,
    modalidade: state.modalidade,
    quadra: state.quadra,
    quadraId: state.quadraId || 'pickleball',
    date: state.selectedDate,
    slots: [...state.selectedSlots],
    dayUse: state.dayUse,
    payment: state.payment,
    total: calcTotal(),
    status: 'confirmada',
    criadaEm: new Date().toISOString(),
  };

  freshBookings.push(booking);
  localStorage.setItem('podium_bookings', JSON.stringify(freshBookings));
  state.bookings = freshBookings;

  // Preenche modal de confirmação
  const modalLabels = { 'beach-tennis': 'Beach Tennis', futevolei: 'Futevôlei', volei: 'Vôlei', pickleball: 'Pickleball' };
  const payLabels = { pix: 'PIX', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro' };

  document.getElementById('confDate').textContent    = formatDateLong(state.selectedDate) || 'Day Use';
  document.getElementById('confTime').textContent    = state.selectedSlots.length
    ? `${pad(state.selectedSlots[0])}:00 – ${pad(state.selectedSlots[state.selectedSlots.length - 1] + 1)}:00`
    : 'Day Use';
  document.getElementById('confCourt').textContent   = getCourtById(state.quadraId)?.label || 'Pickleball';
  document.getElementById('confModality').textContent = modalLabels[state.modalidade];
  document.getElementById('confPrice').textContent   = `R$ ${calcTotal()},00`;
  document.getElementById('confPayment').textContent = payLabels[state.payment] || '—';
  document.getElementById('confId').textContent      = `#PD-${booking.id.slice(-6).toUpperCase()}`;
  document.getElementById('confOverlay').classList.add('open');

  resetBooking();
}

function resetBooking() {
  state.modalidade = null;
  state.quadra = null;
  state.quadraId = null;
  state.selectedDate = null;
  state.selectedSlots = [];
  state.dayUse = false;
  state.payment = null;
  goToStep(1);
  renderModalidades();
  renderQuadras();
}

// ─── Event banner ─────────────────────────
function showEventBanner(key) {
  const eventName = EVENTS[key];
  document.getElementById('eventBanner')?.remove();
  const banner = document.createElement('div');
  banner.id = 'eventBanner';
  banner.className = 'event-banner';
  banner.innerHTML = `
    <div class="event-banner-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
      </svg>
    </div>
    <div class="event-banner-text">
      <strong>${eventName}</strong>
      <span>${formatDatePT(key)} · Quadras reservadas para o evento</span>
    </div>
    <button class="event-banner-close" onclick="document.getElementById('eventBanner').remove()">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
  `;
  document.querySelector('.cal-wrap')?.insertAdjacentElement('afterend', banner);
  setTimeout(() => banner.remove(), 5000);
}
window.showEventBanner = showEventBanner;

// ─── Nav meses ────────────────────────────
function prevMonth() {
  state.calMonth--;
  if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
  renderCalendar();
}
function nextMonth() {
  state.calMonth++;
  if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
  renderCalendar();
}
window.prevMonth = prevMonth;
window.nextMonth = nextMonth;
window.selectDate = selectDate;

// ─── Init ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderModalidades();
  renderQuadras();
  updateStepper();

  // Nav meses
  document.getElementById('bk-prev-month')?.addEventListener('click', prevMonth);
  document.getElementById('bk-next-month')?.addEventListener('click', nextMonth);

  // Step 1 → 2
  document.getElementById('bk-btn-modal-next')?.addEventListener('click', () => {
    if (state.modalidade === 'pickleball') {
      // Pickleball: pula para pagamento
      state.quadra = 'n/a';
      state.quadraId = 'pickleball';
      state.dayUse = true;
      state.selectedDate = 'day-use';
      state.step = 3; // hack para ir ao 4 mostrando "done" nos anteriores
      goToStep(4);
      // marca steps 1,2,3 como done
      [1, 2, 3].forEach(s => {
        const el = document.getElementById('bk-step-' + s);
        if (el) { el.classList.remove('active'); el.classList.add('done'); }
      });
      const l1 = document.getElementById('bk-line-1');
      const l2 = document.getElementById('bk-line-2');
      const l3 = document.getElementById('bk-line-3');
      if (l1) l1.classList.add('done');
      if (l2) l2.classList.add('done');
      if (l3) l3.classList.add('done');
      document.getElementById('bk-step-4')?.classList.add('active');
    } else {
      goToStep(2);
    }
  });

  // Step 2 → 3
  document.getElementById('bk-btn-quadra-next')?.addEventListener('click', () => goToStep(3));
  document.getElementById('bk-btn-quadra-back')?.addEventListener('click', () => goToStep(1));

  // Step 3 → 4
  document.getElementById('bk-btn-time-next')?.addEventListener('click', () => goToStep(4));
  document.getElementById('bk-btn-time-back')?.addEventListener('click', () => goToStep(2));

  // Step 4
  document.getElementById('bk-btn-pay-back')?.addEventListener('click', () => {
    if (state.modalidade === 'pickleball') goToStep(1);
    else goToStep(3);
  });
  document.getElementById('bk-btn-confirmar')?.addEventListener('click', confirmarReserva);

  // Day Use toggle
  document.getElementById('bk-dayuse-btn')?.addEventListener('click', toggleDayUse);

  // Fechar modal confirmação
  document.getElementById('confOverlay')?.addEventListener('click', e => {
    if (e.target.id === 'confOverlay') e.target.classList.remove('open');
  });
  document.getElementById('btnFecharConf')?.addEventListener('click', () => {
    document.getElementById('confOverlay').classList.remove('open');
  });

  // Payment methods
  document.querySelectorAll('.bk-pay-method').forEach(el => {
    el.addEventListener('click', () => selectPayment(el.dataset.method));
  });
});

window.selectModalidade = selectModalidade;
window.selectQuadra = selectQuadra;
window.toggleSlot = toggleSlot;
window.toggleDayUse = toggleDayUse;
window.selectPayment = selectPayment;
window.confirmarReserva = confirmarReserva;