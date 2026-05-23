/* ═══════════════════════════════════════════
   RESERVAS.JS — Calendário + Agendamento
   ═══════════════════════════════════════════ */

// ─── Config ──────────────────────────────
const COURTS = [
  {
    id: "Q1",
    name: "Quadra 1",
    type: "Beach Tennis / Vôlei",
    icon: "tennis",
    price: 60,
  },
  {
    id: "Q2",
    name: "Quadra 2",
    type: "Beach Tennis / Vôlei",
    icon: "tennis",
    price: 60,
  },
  {
    id: "Q3",
    name: "Quadra 3",
    type: "Futevôlei / Vôlei",
    icon: "soccer",
    price: 55,
  },
  { id: "Q4", name: "Quadra 4", type: "Futevôlei", icon: "soccer", price: 55 },
  {
    id: "Q5",
    name: "Quadra 5",
    type: "Pickleball",
    icon: "pickleball",
    price: 50,
  },
  {
    id: "Q6",
    name: "Quadra 6",
    type: "Poliesportiva",
    icon: "volei",
    price: 50,
  },
];

// Eventos especiais (bloqueiam o dia)
const EVENTS = {
  "2026-05-22": "Torneio Aberto Beach Tennis",
  "2026-05-29": "Liga Futevôlei — Etapa TB",
  "2026-06-06": "Clínica Pickleball",
  "2026-06-15": "Campeonato Master Vôlei",
  "2026-06-26": "Torneio Taekwondo",
  "2026-07-04": "Copa Podium Arena",
};

const TIME_SLOTS = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

// ─── Estado ───────────────────────────────
let state = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  selectedDate: null,
  selectedTime: null,
  selectedCourt: COURTS[0],
  bookings: JSON.parse(localStorage.getItem("podium_bookings") || "[]"),
};

// ─── Utilitários ──────────────────────────
function pad(n) {
  return String(n).padStart(2, "0");
}
function dateKey(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function today() {
  const t = new Date();
  return dateKey(t.getFullYear(), t.getMonth(), t.getDate());
}
function isBooked(date, time, courtId) {
  return state.bookings.some(
    (b) => b.date === date && b.time === time && b.courtId === courtId,
  );
}
function isEvent(date) {
  return !!EVENTS[date];
}

// ─── Calendário ───────────────────────────
function renderCalendar() {
  const year = state.year,
    month = state.month;
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  document.getElementById("calTitle").textContent = `${months[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = today();

  let html = "";
  for (let i = 0; i < firstDay; i++)
    html += `<div class="cal-cell empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateKey(year, month, d);
    const isPast = key < todayKey;
    const isToday = key === todayKey;
    const isSelected = key === state.selectedDate;
    const isEventDay = isEvent(key);

    let cls = "cal-cell";
    if (isPast) cls += " past";
    else if (isEventDay) cls += " event-day";
    if (isToday) cls += " today";
    if (isSelected) cls += " selected";

    const click =
      !isPast && !isEventDay
        ? `onclick="selectDate('${key}')"`
        : isEventDay
          ? `title="${EVENTS[key]}" onclick="showEventBanner('${key}')"`
          : "";

    html += `<div class="${cls}" ${click}>${d}</div>`;
  }

  document.getElementById("calGrid").innerHTML = html;
}

function prevMonth() {
  state.month--;
  if (state.month < 0) {
    state.month = 11;
    state.year--;
  }
  renderCalendar();
}
function nextMonth() {
  state.month++;
  if (state.month > 11) {
    state.month = 0;
    state.year++;
  }
  renderCalendar();
}

// ─── Selecionar data ─────────────────────
function selectDate(dateKey) {
  state.selectedDate = dateKey;
  state.selectedTime = null;
  renderCalendar();
  renderTimeSlots();
  updateSummary();
  document.getElementById("timesSection")?.classList.remove("hidden");
}

// ─── Slots de horário ─────────────────────
function renderTimeSlots() {
  const container = document.getElementById("timesGrid");
  if (!container) return;
  if (!state.selectedDate) {
    container.innerHTML = "";
    return;
  }

  const todayKey = today();
  const now = new Date();
  const nowHour = now.getHours();

  container.innerHTML = TIME_SLOTS.map((t) => {
    const hour = parseInt(t);
    const isPast = state.selectedDate === todayKey && hour <= nowHour;
    const taken =
      isBooked(state.selectedDate, t, state.selectedCourt.id) || isPast;
    const selected = t === state.selectedTime;

    let cls = "time-slot";
    if (taken) cls += " taken";
    if (selected) cls += " selected";

    return `<div class="${cls}" ${!taken ? `onclick="selectTime('${t}')"` : ""}>${t}</div>`;
  }).join("");
}

// ─── Selecionar horário ───────────────────
function selectTime(time) {
  state.selectedTime = time;
  renderTimeSlots();
  updateSummary();
}

// ─── Selecionar quadra ────────────────────
function selectCourt(courtId) {
  state.selectedCourt = COURTS.find((c) => c.id === courtId) || COURTS[0];
  renderCourts();
  renderTimeSlots();
  updateSummary();
}

const COURT_ICONS = {
  tennis: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M6.3 6.3a8 8 0 0 1 11.4 0"/><path d="M6.3 17.7a8 8 0 0 0 11.4 0"/><path d="M12 2v20"/></svg>`,
  soccer: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
  pickleball: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/><path d="M12 7a5 5 0 0 1 5 5"/></svg>`,
  volei: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 12c-2-2.5-2-5.5 0-8"/><path d="M12 12c2.5-1.5 5-1 7.5.5"/><path d="M12 12c-.5 2.5-2.5 4.5-5 5.5"/></svg>`,
};

function renderCourts() {
  const container = document.getElementById("courtGrid");
  if (!container) return;

  container.innerHTML = COURTS.map((c) => {
    const active = c.id === state.selectedCourt.id;
    const icon = COURT_ICONS[c.icon] || COURT_ICONS.tennis;
    return `
      <div class="court-option ${active ? "active" : ""}" onclick="selectCourt('${c.id}')">
        <div class="court-icon">${icon}</div>
        <div class="court-info">
          <div class="court-name">${c.name}</div>
          <div class="court-type">${c.type}</div>
        </div>
        <div class="court-badge">R$ ${c.price}/h</div>
      </div>
    `;
  }).join("");
}

// ─── Atualizar resumo ─────────────────────
function updateSummary() {
  const d = document.getElementById("sumDate");
  const t = document.getElementById("sumTime");
  const c = document.getElementById("sumCourt");
  const p = document.getElementById("sumPrice");

  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];

  if (d)
    d.textContent = state.selectedDate
      ? (() => {
          const [y, m, day] = state.selectedDate.split("-");
          return `${day} ${months[parseInt(m) - 1]} ${y}`;
        })()
      : "—";
  if (t) t.textContent = state.selectedTime || "—";
  if (c) c.textContent = state.selectedCourt.name;
  if (p) p.textContent = `R$ ${state.selectedCourt.price},00`;

  const btn = document.getElementById("btnConfirmar");
  if (btn) btn.disabled = !(state.selectedDate && state.selectedTime);
}

// ─── Confirmar reserva ────────────────────
function confirmarReserva() {
  const user = window.Auth?.getUser();
  if (!user) {
    window.openAuthModal?.("login");
    showToast("Faça login para confirmar sua reserva.", "error");
    return;
  }
  if (!state.selectedDate || !state.selectedTime) return;

  const booking = {
    id: Date.now().toString(),
    userId: user.id,
    userName: user.nome,
    courtId: state.selectedCourt.id,
    courtName: state.selectedCourt.name,
    date: state.selectedDate,
    time: state.selectedTime,
    price: state.selectedCourt.price,
    status: "confirmada",
    criadaEm: new Date().toISOString(),
  };

  state.bookings.push(booking);
  localStorage.setItem("podium_bookings", JSON.stringify(state.bookings));

  // Mostrar modal de confirmação
  const [y, m, d] = state.selectedDate.split("-");
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  document.getElementById("confDate").textContent =
    `${d} de ${months[parseInt(m) - 1]} de ${y}`;
  document.getElementById("confTime").textContent = state.selectedTime;
  document.getElementById("confCourt").textContent = state.selectedCourt.name;
  document.getElementById("confPrice").textContent =
    `R$ ${state.selectedCourt.price},00`;
  document.getElementById("confId").textContent =
    `#PD-${booking.id.slice(-6).toUpperCase()}`;
  document.getElementById("confOverlay").classList.add("open");

  // Reset
  state.selectedDate = null;
  state.selectedTime = null;
  renderCalendar();
  renderTimeSlots();
  updateSummary();
}

// ─── Toast / Banner de evento ──────────────
function showEventBanner(dateKey) {
  const eventName = EVENTS[dateKey];
  const [y, m, d] = dateKey.split("-");
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const dateFormatted = `${d} de ${months[parseInt(m) - 1]} de ${y}`;

  // Remove banner anterior se existir
  document.getElementById("eventBanner")?.remove();

  const banner = document.createElement("div");
  banner.id = "eventBanner";
  banner.innerHTML = `
    <div class="event-banner-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <path d="M12 9v4"/><path d="M12 17h.01"/>
      </svg>
    </div>
    <div class="event-banner-text">
      <strong>${eventName}</strong>
      <span>${dateFormatted} · Quadras reservadas para o evento</span>
    </div>
    <button class="event-banner-close" onclick="document.getElementById('eventBanner').remove()">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 6 18M6 6l12 12"/>
      </svg>
    </button>
  `;
  banner.className = "event-banner";

  // Insere após o calendário
  const calWrap = document.querySelector(".cal-wrap");
  calWrap?.insertAdjacentElement("afterend", banner);

  // Remove automaticamente após 5s
  setTimeout(() => banner.remove(), 5000);
}
window.showEventBanner = showEventBanner;

// ─── Inicialização ────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderCalendar();
  renderCourts();
  updateSummary();

  document.getElementById("prevMonth")?.addEventListener("click", prevMonth);
  document.getElementById("nextMonth")?.addEventListener("click", nextMonth);
  document
    .getElementById("btnConfirmar")
    ?.addEventListener("click", confirmarReserva);

  document.getElementById("confOverlay")?.addEventListener("click", (e) => {
    if (e.target.id === "confOverlay") e.target.classList.remove("open");
  });
  document.getElementById("btnFecharConf")?.addEventListener("click", () => {
    document.getElementById("confOverlay").classList.remove("open");
  });
});

window.selectDate = selectDate;
window.selectTime = selectTime;
window.selectCourt = selectCourt;
window.prevMonth = prevMonth;
window.nextMonth = nextMonth;
window.confirmarReserva = confirmarReserva;