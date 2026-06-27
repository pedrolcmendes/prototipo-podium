/* ═══════════════════════════════════════════
   PAINEL.JS — Dashboard do Usuário
   ═══════════════════════════════════════════ */

// ─── SVG Icons ────────────────────────────────
const SVG = {
  clock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  money: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
  hash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>`,
  cal: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
  trophy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  medal1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#C5A028" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M9 11l2 2 4-4"/></svg>`,
  medal2: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#C0C0C0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M9 11l2 2 4-4"/></svg>`,
  medal3: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#CD7F32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M9 11l2 2 4-4"/></svg>`,
  tennis: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M6.3 6.3a8 8 0 0 1 11.4 0"/><path d="M6.3 17.7a8 8 0 0 0 11.4 0"/><path d="M12 2v20"/></svg>`,
  soccer: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
  volleyball: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 12c-2-2.5-2-5.5 0-8"/><path d="M12 12c2.5-1.5 5-1 7.5.5"/><path d="M12 12c-.5 2.5-2.5 4.5-5 5.5"/></svg>`,
  pickleball: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/><path d="M12 7a5 5 0 0 1 5 5"/></svg>`,
  martial: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m8 12 3 3 5-5"/><circle cx="12" cy="12" r="10"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
};

// ─── Dados mockados de ranking ─────────────
const RANKING_MOCK = {
  futevolei: [
    "Carlos & Pedro",
    "Rafael & Thiago",
    "Lucas & Marcos",
    "André & Felipe",
    "Gustavo & Bruno",
    "Diego & Mateus",
    "Henrique & Leandro",
    "João & Victor",
    "Gabriel & Rodrigo",
    "Fábio & Daniel",
  ],
  beachtennis: [
    "Roberto & Sandro",
    "Vinícius & Eduardo",
    "Leandro & Ricardo",
    "Paulo & Wesley",
    "Alex & Renato",
    "Tiago & Murilo",
    "Marcelo & Flávio",
    "Ivan & Clayton",
    "Neto & Evandro",
    "Samuel & Adriano",
  ],
};

const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

// ─── Utilitários ──────────────────────────
function formatDateLabel(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d} ${MONTHS[parseInt(m) - 1]} ${y}`;
}

function timeAgo(isoStr) {
  if (!isoStr) return "";
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

function getInitials(nome) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ─── Busca usuário completo do localStorage ──
function getUserFull() {
  const session = Auth.getUser();
  if (!session) return null;
  const users = JSON.parse(localStorage.getItem("podium_users") || "[]");
  return users.find((u) => u.id === session.id) || null;
}

// ─── Navegação entre abas ──────────────────
function switchPainelTab(tab) {
  document.querySelectorAll(".painel-nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.tab === tab);
  });
  document.querySelectorAll(".painel-section").forEach((el) => {
    el.classList.toggle("active", el.id === `painel-${tab}`);
  });
  history.replaceState(null, "", `?aba=${tab}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ─── Dashboard ────────────────────────────
function renderDashboard(user) {
  const bookings = JSON.parse(
    localStorage.getItem("podium_bookings") || "[]",
  ).filter((b) => b.userId === user.id);
  const inscricoes = JSON.parse(
    localStorage.getItem("podium_inscricoes") || "[]",
  ).filter((i) => i.userId === user.id);
  const now = new Date().toISOString().slice(0, 10);

  const proximas = bookings
    .filter((b) => b.date >= now && b.status === "confirmada")
    .sort((a, b) => a.date.localeCompare(b.date));
  const concluidas = bookings.filter(
    (b) => b.date < now || b.status === "concluida",
  );

  // Stats
  document.getElementById("statReservas").textContent = bookings.length;
  document.getElementById("statProximas").textContent = proximas.length;
  document.getElementById("statEventos").textContent = inscricoes.length;
  document.getElementById("statConcluidas").textContent = concluidas.length;

  // Crédito em carteira
  const credito = user.credito || 0;
  const creditoFmt = "R$ " + credito.toFixed(2).replace(".", ",");
  const statCred = document.getElementById("statCredito");
  if (statCred) statCred.textContent = creditoFmt;

  // Saldo carteira (wallet card)
  const walletSaldo = document.getElementById("walletSaldo");
  if (walletSaldo) walletSaldo.textContent = creditoFmt;

  // Banner: próxima reserva
  const bannerEl = document.getElementById("dashBannerProxima");
  if (bannerEl) {
    if (proximas.length > 0) {
      const b = proximas[0];
      const [y, m, d] = (b.date || "").split("-");
      const mon = MONTHS[parseInt(m) - 1] || "";
      bannerEl.innerHTML = `
        <div class="prox-banner">
          <div class="prox-banner-date">
            <div class="prox-banner-day">${d}</div>
            <div class="prox-banner-month">${mon} ${y}</div>
          </div>
          <div class="prox-banner-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          </div>
          <div>
            <div class="prox-banner-eyebrow">Próxima Reserva</div>
            <div class="prox-banner-title">${b.courtName || "Quadra"}</div>
            <div class="prox-banner-meta">
              <span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${b.time || "—"}</span>
              <span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>R$ ${b.price || 0},00</span>
              ${b.modality ? `<span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>${b.modality}</span>` : ""}
            </div>
          </div>
        </div>`;
    } else {
      bannerEl.innerHTML = "";
    }
  }

  // Título personalizado
  const titulo = document.getElementById("dashTitulo");
  if (titulo) {
    const nome = (user.nome || "").split(" ")[0].toUpperCase();
    titulo.textContent = nome ? `OLÁ, ${nome}` : "SEU PAINEL";
  }

  // Lista de próximas reservas
  const proxEl = document.getElementById("dashProximas");
  proxEl.innerHTML =
    proximas.length === 0
      ? emptyState(
          SVG.cal,
          "Nenhuma reserva agendada",
          "Reserve uma quadra e apareça aqui.",
          "reservas.html",
          "Reservar agora",
        )
      : proximas
          .slice(0, 3)
          .map((b) => bookingItemHTML(b, false))
          .join("");

  const evtsEl = document.getElementById("dashEventos");
  evtsEl.innerHTML =
    inscricoes.length === 0
      ? emptyState(
          SVG.trophy,
          "Nenhuma inscrição",
          "Inscreva-se em um evento e apareça aqui.",
          "eventos.html",
          "Ver eventos",
        )
      : inscricoes
          .slice(0, 2)
          .map((i) => evtItemHTML(i))
          .join("");

  const activities = buildActivityFeed(bookings, inscricoes);
  const actEl = document.getElementById("dashActivity");
  actEl.innerHTML =
    activities.length === 0
      ? `<div class="empty-state"><p style="padding:1.5rem;color:var(--gray)">Nenhuma atividade recente.</p></div>`
      : `<div class="activity-list">${activities.slice(0, 6).map(activityItemHTML).join("")}</div>`;
}

function buildActivityFeed(bookings, inscricoes) {
  const items = [
    ...bookings.map((b) => ({
      label: `Reservou <strong>${b.courtName}</strong> para ${formatDateLabel(b.date)} às ${b.time}`,
      date: b.criadaEm,
      dot: b.status === "cancelada" ? "red" : "green",
    })),
    ...inscricoes.map((i) => ({
      label: `Inscreveu-se em <strong>${i.eventNome}</strong>`,
      date: i.criadaEm,
      dot: "gold",
    })),
  ];
  return items.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function activityItemHTML(act) {
  return `
    <div class="activity-item">
      <div class="activity-dot ${act.dot}"></div>
      <div class="activity-text">${act.label}</div>
      <div class="activity-time">${timeAgo(act.date)}</div>
    </div>`;
}

// ─── Reservas ─────────────────────────────
function renderReservas(user) {
  const bookings = JSON.parse(
    localStorage.getItem("podium_bookings") || "[]",
  ).filter((b) => b.userId === user.id);
  const now = new Date().toISOString().slice(0, 10);
  bookings.forEach((b) => {
    if (b.date < now && b.status === "confirmada") b.status = "concluida";
  });

  const proximas = bookings
    .filter((b) => b.date >= now && b.status !== "cancelada")
    .sort((a, b) => a.date.localeCompare(b.date));
  const historico = bookings
    .filter((b) => b.date < now || b.status === "cancelada")
    .sort((a, b) => b.date.localeCompare(a.date));

  document.getElementById("reservasProximas").innerHTML =
    proximas.length === 0
      ? emptyState(
          SVG.cal,
          "Nenhuma reserva próxima",
          "Agende uma quadra para aparecer aqui.",
          "../pages/reservas.html",
          "Reservar agora",
        )
      : proximas.map((b) => bookingItemHTML(b, true)).join("");

  document.getElementById("reservasHistorico").innerHTML =
    historico.length === 0
      ? `<div class="empty-state"><div class="empty-state-icon">${SVG.clock}</div><p>Sem histórico ainda.</p></div>`
      : historico.map((b) => bookingItemHTML(b, false)).join("");
}

function bookingItemHTML(b, showCancel) {
  const [y, m, d] = (b.date || "").split("-");
  const mon = MONTHS[parseInt(m) - 1] || "";
  const isPast = b.date < new Date().toISOString().slice(0, 10);
  const statusClass = b.status || "confirmada";

  return `
    <div class="booking-item" id="booking-${b.id}">
      <div class="booking-date-block">
        <div class="booking-day">${d || "—"}</div>
        <div class="booking-month">${mon}</div>
      </div>
      <div>
        <div class="booking-info-name">${b.courtName || "—"}</div>
        <div class="booking-info-meta">
          <span class="booking-meta-item">${SVG.clock} ${b.time || "—"}</span>
          <span class="booking-meta-item">${SVG.money} R$ ${b.price || 0},00</span>
          <span class="booking-meta-item" style="opacity:.4;font-family:var(--font-cond);font-size:.7rem;letter-spacing:1px">
            ${SVG.hash} PD-${(b.id || "").slice(-6).toUpperCase()}
          </span>
        </div>
      </div>
      <div class="booking-actions">
        <span class="status-badge ${statusClass}">${statusClass.charAt(0).toUpperCase() + statusClass.slice(1)}</span>
        ${
          showCancel && !isPast && b.status === "confirmada"
            ? `<button class="btn-cancel" onclick="cancelarReserva('${b.id}')">Cancelar</button>`
            : ""
        }
      </div>
    </div>`;
}

function cancelarReserva(id) {
  document.getElementById("cancelReservaId").value = id;

  const bookings = JSON.parse(localStorage.getItem("podium_bookings") || "[]");
  const b = bookings.find((b) => b.id === id);
  if (b) {
    const [y, m, d] = b.date.split("-");
    document.getElementById("cancelReservaInfo").textContent =
      `${b.courtName} · ${d} ${MONTHS[parseInt(m) - 1]} ${y} às ${b.time}`;
  }

  document.getElementById("cancelModal").classList.add("open");
}

function executarCancelamento() {
  const id = document.getElementById("cancelReservaId").value;
  const bookings = JSON.parse(localStorage.getItem("podium_bookings") || "[]");
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx !== -1) {
    bookings[idx].status = "cancelada";
    localStorage.setItem("podium_bookings", JSON.stringify(bookings));
    fecharCancelModal();
    showToast("Reserva cancelada.", "success");
    renderReservas(Auth.getUser());
    renderDashboard(Auth.getUser());
  }
}

function fecharCancelModal() {
  document.getElementById("cancelModal").classList.remove("open");
}

window.fecharCancelModal = fecharCancelModal;
window.executarCancelamento = executarCancelamento;

// ─── Inscrições ───────────────────────────
function renderInscricoes(user) {
  const inscricoes = JSON.parse(
    localStorage.getItem("podium_inscricoes") || "[]",
  ).filter((i) => i.userId === user.id);
  const now = new Date().toISOString().slice(0, 10);

  const proximas = inscricoes
    .filter((i) => i.eventData >= now)
    .sort((a, b) => a.eventData.localeCompare(b.eventData));
  const passadas = inscricoes
    .filter((i) => i.eventData < now)
    .sort((a, b) => b.eventData.localeCompare(a.eventData));

  document.getElementById("insc-proximas").innerHTML =
    proximas.length === 0
      ? emptyState(
          SVG.trophy,
          "Nenhuma inscrição próxima",
          "Inscreva-se em um evento da Podium Arena.",
          "../pages/eventos.html",
          "Ver eventos",
        )
      : proximas.map((i) => evtItemHTML(i)).join("");

  document.getElementById("insc-historico").innerHTML =
    passadas.length === 0
      ? `<div class="empty-state"><div class="empty-state-icon">${SVG.clock}</div><p>Sem histórico de eventos.</p></div>`
      : passadas.map((i) => evtItemHTML(i, true)).join("");
}

function evtItemHTML(i, past = false) {
  const ICONS = {
    beachtennis: SVG.tennis,
    futevolei: SVG.soccer,
    volei: SVG.volleyball,
    pickleball: SVG.pickleball,
    taekwondo: SVG.martial,
  };
  const icon = ICONS[i.categoria] || SVG.trophy;
  return `
    <div class="evt-item">
      <div class="evt-item-icon">${icon}</div>
      <div>
        <div class="evt-item-name">${i.eventNome}</div>
        <div class="evt-item-meta">
          <span class="evt-meta-item">${SVG.cal} ${formatDateLabel(i.eventData)}</span>
          <span class="evt-meta-item">${SVG.money} R$ ${i.preco || 0},00</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.4rem">
        <span class="status-badge inscrito">${past ? "Concluído" : "Inscrito"}</span>
      </div>
    </div>`;
}

// ─── Ranking ──────────────────────────────
function renderRankingPainel(user) {
  ["futevolei", "beachtennis"].forEach((sport) => {
    const list = RANKING_MOCK[sport];
    const container = document.getElementById(`ranking-${sport}`);
    if (!container) return;

    const firstName = user.nome?.split(" ")[0]?.toLowerCase() || "xxx";
    const userPos =
      list.findIndex((n) => n.toLowerCase().includes(firstName)) + 1 || null;
    const pts = [2100, 1980, 1860, 1730, 1610, 1490, 1360, 1240, 1120, 1000];

    const MEDALS = [SVG.medal1, SVG.medal2, SVG.medal3];

    container.innerHTML = list
      .slice(0, 5)
      .map((name, i) => {
        const pos = i + 1;
        const posContent =
          pos <= 3
            ? `<span style="display:inline-flex;align-items:center;justify-content:center">${MEDALS[i]}</span>`
            : `<span style="font-family:var(--font-display);font-size:1.5rem;color:var(--gray)">${pos}</span>`;
        const posClass =
          pos === 1 ? "gold" : pos === 2 ? "silver" : pos === 3 ? "bronze" : "";
        const isYou = userPos && pos === userPos;

        return `
        <div class="ranking-mini-row ${isYou ? "highlight" : ""}">
          <div class="ranking-mini-pos ${posClass}">${posContent}</div>
          <div>
            <div class="ranking-mini-name">${name}</div>
            ${isYou ? '<div class="ranking-mini-you">Você</div>' : ""}
          </div>
          <div class="ranking-mini-pts">${pts[i]}</div>
        </div>`;
      })
      .join("");

    if (userPos && userPos > 5) {
      container.innerHTML += `
        <div style="padding:.6rem 1.5rem;font-family:var(--font-cond);font-size:.75rem;letter-spacing:2px;color:var(--gray);text-align:center;background:var(--dark)">
          ··· você está em <strong style="color:var(--gold)">${userPos}º lugar</strong> com ${pts[userPos - 1]} pts ···
        </div>`;
    } else if (!userPos) {
      container.innerHTML += `
        <div style="padding:.8rem 1.5rem;font-family:var(--font-cond);font-size:.75rem;letter-spacing:2px;color:var(--gray);text-align:center;background:var(--dark)">
          Participe de torneios para entrar no ranking
        </div>`;
    }
  });
}

// ─── Perfil ───────────────────────────────
function renderPerfil(userFull) {
  if (!userFull) return;
  const fields = {
    profNome: "nome",
    profEmail: "email",
    profTel: "tel",
    profNasc: "nasc",
    profCPF: "cpf",
  };
  Object.entries(fields).forEach(([elId, key]) => {
    const el = document.getElementById(elId);
    if (el) el.value = userFull[key] || "";
  });
  const avatarEl = document.getElementById("profAvatarBig");
  if (avatarEl) avatarEl.textContent = getInitials(userFull.nome || "??");
  const memberSince = document.getElementById("memberSince");
  if (memberSince && userFull.criadoEm)
    memberSince.textContent = formatDateLabel(userFull.criadoEm.slice(0, 10));
}

function salvarPerfil(e) {
  e.preventDefault();
  const session = Auth.getUser();
  if (!session) return;

  const users = JSON.parse(localStorage.getItem("podium_users") || "[]");
  const idx = users.findIndex((u) => u.id === session.id);
  if (idx === -1) return;

  const nome = document.getElementById("profNome")?.value.trim();
  const tel = document.getElementById("profTel")?.value.trim();
  const nasc = document.getElementById("profNasc")?.value;

  if (!nome || nome.length < 3) {
    showToast("Nome muito curto.", "error");
    return;
  }

  users[idx].nome = nome;
  users[idx].tel = tel;
  users[idx].nasc = nasc;
  localStorage.setItem("podium_users", JSON.stringify(users));
  Auth.saveUser({ ...session, nome });
  updateNavUser(Auth.getUser());

  const notice = document.getElementById("saveNotice");
  if (notice) {
    notice.classList.add("show");
    setTimeout(() => notice.classList.remove("show"), 2500);
  }
  showToast("Perfil atualizado com sucesso!");

  document.getElementById("sidebarAvatar").textContent = getInitials(nome);
  document.getElementById("sidebarName").textContent = nome;
  document.getElementById("profAvatarBig").textContent = getInitials(nome);
}

function salvarSenha(e) {
  e.preventDefault();
  const session = Auth.getUser();
  if (!session) return;

  const atual = document.getElementById("senhaAtual")?.value;
  const nova = document.getElementById("senhaNova")?.value;
  const conf = document.getElementById("senhaConf")?.value;

  const users = JSON.parse(localStorage.getItem("podium_users") || "[]");
  const idx = users.findIndex((u) => u.id === session.id);
  if (idx === -1) return;

  if (users[idx].senha !== btoa(atual)) {
    showToast("Senha atual incorreta.", "error");
    return;
  }
  if (!nova || nova.length < 8) {
    showToast("Nova senha deve ter mínimo 6 caracteres.", "error");
    return;
  }
  if (nova !== conf) {
    showToast("As senhas não conferem.", "error");
    return;
  }

  users[idx].senha = btoa(nova);
  localStorage.setItem("podium_users", JSON.stringify(users));
  showToast("Senha alterada com sucesso!");

  ["senhaAtual", "senhaNova", "senhaConf"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

// ─── Empty state ──────────────────────────
function emptyState(iconSvg, title, text, href, btnText) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${iconSvg}</div>
      <h4>${title}</h4>
      <p>${text}</p>
      <a href="${href}" class="btn-gold" style="display:inline-flex;justify-content:center">${btnText}</a>
    </div>`;
}

// ─── Inicialização ────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const session = Auth.getUser();
  if (!session) {
    window.location.href = "../index.html";
    return;
  }

  const userFull = getUserFull() || session;

  document.getElementById("sidebarAvatar").textContent = getInitials(
    userFull.nome || "??",
  );
  document.getElementById("sidebarName").textContent = userFull.nome || "—";
  document.getElementById("sidebarEmail").textContent = userFull.email || "—";

  document.querySelectorAll(".painel-nav-item").forEach((item) => {
    item.addEventListener("click", () => switchPainelTab(item.dataset.tab));
  });

  // Botão logout abre modal de confirmação
  document.getElementById("btnLogout")?.addEventListener("click", () => {
    abrirModalLogout();
  });

  document
    .getElementById("formPerfil")
    ?.addEventListener("submit", salvarPerfil);
  document.getElementById("formSenha")?.addEventListener("submit", salvarSenha);

  // Máscara telefone
  const telInput = document.getElementById("profTel");
  if (telInput) {
    telInput.addEventListener("input", function () {
      let v = this.value.replace(/\D/g, "");
      v = v.replace(/(\d{2})(\d)/, "($1) $2");
      v = v.replace(/(\d{5})(\d{4})$/, "$1-$2");
      this.value = v.substring(0, 15);
    });
  }

  renderDashboard(session);
  renderReservas(session);
  renderInscricoes(session);
  renderRankingPainel(session);
  renderPerfil(userFull);

  const params = new URLSearchParams(window.location.search);
  switchPainelTab(params.get("aba") || "dashboard");
});

// ─── Modal de Logout ──────────────────────
function abrirModalLogout() {
  let modal = document.getElementById("logoutModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "logoutModal";
    modal.className = "logout-modal-overlay";
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
        <p class="logout-modal-sub">Você será desconectado da sua conta Podium Arena.</p>
        <div class="logout-modal-actions">
          <button class="logout-modal-btn-keep" onclick="fecharModalLogout()">Cancelar</button>
          <button class="logout-modal-btn-confirm" onclick="confirmarLogout()">Sair</button>
        </div>
      </div>
    `;
    modal.addEventListener("click", (e) => {
      if (e.target === modal) fecharModalLogout();
    });
    document.body.appendChild(modal);
  }
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function fecharModalLogout() {
  const modal = document.getElementById("logoutModal");
  if (modal) modal.classList.remove("open");
  document.body.style.overflow = "";
}

function confirmarLogout() {
  fecharModalLogout();
  Auth.logout();
  window.location.replace("../index.html");
}

window.cancelarReserva = cancelarReserva;
window.switchPainelTab = switchPainelTab;
window.getUserFull     = getUserFull;
window.renderPerfil    = renderPerfil;
window.abrirModalLogout  = abrirModalLogout;
window.fecharModalLogout = fecharModalLogout;
window.confirmarLogout   = confirmarLogout;