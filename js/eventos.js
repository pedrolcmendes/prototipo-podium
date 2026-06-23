/* ═══════════════════════════════════════════
   EVENTOS.JS — Lista de Eventos + Inscrição
   ═══════════════════════════════════════════ */

// Dados vêm de js/eventos-store.js (getEventos), a mesma fonte que o
// painel admin gerencia em admin.html → aba Eventos.
let activeFilter = 'todos';

// Monta o "view model" de exibição a partir do evento bruto salvo pelo
// admin, derivando inscritos/modalidade/ícone em vez de duplicar dados.
function toViewModel(ev) {
  return {
    ...ev,
    inscritos:  contarInscritos(ev.nome),
    modalidade: CATEGORIA_LABELS[ev.categoria] || 'Geral',
    icon:       CATEGORIA_ICONS[ev.categoria] || 'trophy',
    nivel:      ev.nivel || 'Todos os níveis',
  };
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return { day: d, month: months[parseInt(m)-1], year: y };
}

function vagasPercent(inscritos, vagas) { return Math.min((inscritos / (vagas||1)) * 100, 100); }

function statusLabel(evt) {
  if (evt.status === 'encerrado') return { text:'Encerrado', cls:'closed' };
  if (evt.status === 'breve')     return { text:'Em Breve',  cls:'' };
  if (evt.inscritos >= evt.vagas) return { text:'Esgotado',  cls:'closed' };
  const pct = vagasPercent(evt.inscritos, evt.vagas);
  if (pct >= 90) return { text:'Últimas vagas', cls:'last' };
  return { text:'Inscrições Abertas', cls:'open' };
}
function inscricoesFechadas(evt) {
  return evt.status === 'encerrado' || evt.status === 'breve' || evt.inscritos >= evt.vagas;
}

function renderEvents(filter) {
  const container = document.getElementById('eventsList');
  if (!container) return;

  const all = getEventos().map(toViewModel);
  const filtered = filter === 'todos'
    ? all
    : all.filter(e => e.categoria === filter);

  container.innerHTML = filtered.map(evt => {
    const date = formatDate(evt.data);
    const sl = statusLabel(evt);
    const pct = vagasPercent(evt.inscritos, evt.vagas);
    const restantes = evt.vagas - evt.inscritos;

    return `
      <div class="event-card reveal" onclick="openEventModal('${evt.id}')">
        <div class="event-card-left">
          <div class="event-icon">${evt.icon}</div>
          <div class="event-date-block">
            <div class="event-day">${date.day}</div>
            <div class="event-month">${date.month}</div>
          </div>
        </div>
        <div class="event-card-body">
          <div class="event-card-top">
            <div>
              <div class="event-card-modal">${evt.modalidade}</div>
              <div class="event-card-name">${evt.nome}</div>
              <div class="event-card-meta">
                <span style="display:inline-flex;align-items:center;gap:.3rem"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${evt.hora}</span>
                <span style="display:inline-flex;align-items:center;gap:.3rem"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> ${evt.local}</span>
                <span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> ${evt.nivel}</span>
              </div>
            </div>
            <div class="event-card-status-wrap">
              <div class="event-status ${sl.cls}">${sl.text}</div>
              <div class="event-price">R$ ${evt.preco}<small>/atleta</small></div>
            </div>
          </div>
          <div class="event-progress-wrap">
            <div class="event-progress-bar">
              <div class="event-progress-fill" style="width:${pct}%"></div>
            </div>
            <div class="event-progress-label">${evt.inscritos} / ${evt.vagas} vagas${evt.status !== 'esgotado' ? ` • ${restantes} disponíveis` : ''}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Re-trigger reveal
  document.querySelectorAll('.event-card.reveal').forEach(el => {
    setTimeout(() => el.classList.add('vis'), 50);
  });
}

function openEventModal(id) {
  const ev = getEventos().find(e => e.id === id);
  if (!ev) return;
  const evt = toViewModel(ev);

  const date = formatDate(evt.data);
  const sl = statusLabel(evt);
  const pct = vagasPercent(evt.inscritos, evt.vagas);
  const fechado = inscricoesFechadas(evt);

  document.getElementById('evtModalTitle').textContent = evt.nome;
  document.getElementById('evtModalIcon').textContent = evt.icon;
  document.getElementById('evtModalDate').textContent = `${date.day} de ${date.month} de ${date.year}`;
  document.getElementById('evtModalHora').textContent = evt.hora;
  document.getElementById('evtModalLocal').textContent = evt.local;
  document.getElementById('evtModalNivel').textContent = evt.nivel;
  document.getElementById('evtModalModal').textContent = evt.modalidade;
  document.getElementById('evtModalDesc').textContent = evt.desc;
  document.getElementById('evtModalVagas').textContent = `${evt.inscritos} / ${evt.vagas}`;
  document.getElementById('evtModalFill').style.width = pct + '%';
  document.getElementById('evtModalPreco').textContent = `R$ ${evt.preco},00`;

  const btn = document.getElementById('btnInscrever');
  if (btn) {
    btn.disabled = fechado;
    btn.textContent = fechado ? sl.text : 'Inscrever-se';
    btn.onclick = () => inscreverEvento(id);
  }

  document.getElementById('evtOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeEventModal() {
  document.getElementById('evtOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function inscreverEvento(id) {
  const user = window.Auth?.getUser();
  if (!user) {
    closeEventModal();
    window.openAuthModal?.('login');
    showToast('Faça login para se inscrever no evento.', 'error');
    return;
  }

  const ev = getEventos().find(e => e.id === id);
  if (!ev) return;
  const evt = toViewModel(ev);
  if (inscricoesFechadas(evt)) return;

  // Verificar se já inscrito
  const inscricoes = JSON.parse(localStorage.getItem('podium_inscricoes') || '[]');
  if (inscricoes.find(i => i.userId === user.id && i.eventId === id)) {
    showToast('Você já está inscrito neste evento!', 'error');
    closeEventModal();
    return;
  }

  const inscricao = {
    id: Date.now().toString(),
    userId: user.id,
    userName: user.nome,
    eventId: id,
    eventNome: evt.nome,
    eventData: evt.data,
    categoria: evt.categoria,
    preco: evt.preco,
    status: 'confirmada',
    criadaEm: new Date().toISOString()
  };
  inscricoes.push(inscricao);
  localStorage.setItem('podium_inscricoes', JSON.stringify(inscricoes));

  closeEventModal();
  showToast(`Inscrição confirmada em "${evt.nome}"!`);
  renderEvents(activeFilter);
}

document.addEventListener('DOMContentLoaded', () => {
  renderEvents('todos');

  // Filtros
  document.querySelectorAll('.filter-btn[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-cat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.cat;
      renderEvents(activeFilter);
    });
  });

  // Fechar modal evento
  document.getElementById('evtOverlay')?.addEventListener('click', e => {
    if (e.target.id === 'evtOverlay') closeEventModal();
  });
  document.getElementById('btnFecharEvt')?.addEventListener('click', closeEventModal);
});

window.openEventModal  = openEventModal;
window.closeEventModal = closeEventModal;
window.inscreverEvento = inscreverEvento;
