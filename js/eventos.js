/* ═══════════════════════════════════════════
   EVENTOS.JS — Lista de Eventos + Inscrição
   ═══════════════════════════════════════════ */

const EVENTS_DATA = [
  {
    id: 'evt001',
    nome: 'Torneio Aberto de Beach Tennis',
    data: '2026-05-22',
    hora: '14h–18h',
    local: 'Quadras de Areia — Podium Arena',
    vagas: 64,
    inscritos: 48,
    preco: 80,
    modalidade: 'Beach Tennis',
    nivel: 'Todos os níveis',
    status: 'aberto',
    desc: 'O maior torneio de Beach Tennis de Telêmaco Borba retorna! Categorias A, B e C para todos os níveis. Premiação para os três primeiros colocados de cada categoria.',
    categoria: 'beachtennis',
    icon: 'tennis',
  },
  {
    id: 'evt002',
    nome: 'Liga Futevôlei — Etapa TB',
    data: '2026-05-29',
    hora: '19h–22h',
    local: 'Arena Central — Podium Arena',
    vagas: 32,
    inscritos: 20,
    preco: 60,
    modalidade: 'Futevôlei',
    nivel: 'Intermediário / Avançado',
    status: 'aberto',
    desc: 'A Liga Municipal de Futevôlei chega à sua 4ª etapa na Podium Arena. Duplas masculino e feminino. Pontos válidos para o ranking oficial.',
    categoria: 'futevolei',
    icon: 'soccer',
  },
  {
    id: 'evt003',
    nome: 'Clínica de Pickleball com Profissionais',
    data: '2026-06-06',
    hora: '09h–12h',
    local: 'Quadra Premium — Podium Arena',
    vagas: 40,
    inscritos: 35,
    preco: 120,
    modalidade: 'Pickleball',
    nivel: 'Iniciante / Intermediário',
    status: 'aberto',
    desc: 'Aprenda com campeões nacionais! A clínica cobre técnicas de saque, devolução, volleys e estratégia de jogo. Inclui material didático e lanche.',
    categoria: 'pickleball',
    icon: 'pickleball',
  },
  {
    id: 'evt004',
    nome: 'Campeonato Master — Vôlei de Areia',
    data: '2026-06-15',
    hora: '10h–20h',
    local: 'Arena Principal — Podium Arena',
    vagas: 128,
    inscritos: 128,
    preco: 90,
    modalidade: 'Vôlei de Praia',
    nivel: 'Avançado (35+)',
    status: 'esgotado',
    desc: 'O Campeonato Master reúne atletas acima de 35 anos para uma competição de alto nível. 32 duplas masculino + 32 duplas feminino.',
    categoria: 'volei',
    icon: 'volei',
  },
  {
    id: 'evt005',
    nome: 'Torneio de Taekwondo — Região Norte PR',
    data: '2026-06-26',
    hora: '08h–17h',
    local: 'Área Coberta — Podium Arena',
    vagas: 200,
    inscritos: 120,
    preco: 50,
    modalidade: 'Taekwondo',
    nivel: 'Todas as categorias',
    status: 'aberto',
    desc: 'Torneio regional de Taekwondo com categorias por faixa etária e graduação. Evento validado pela Federação Paranaense de Taekwondo.',
    categoria: 'taekwondo',
    icon: 'taekwondo',
  },
  {
    id: 'evt006',
    nome: 'Copa Podium Arena — Beach Tennis',
    data: '2026-07-04',
    hora: '08h–19h',
    local: 'Todas as Quadras — Podium Arena',
    vagas: 96,
    inscritos: 30,
    preco: 100,
    modalidade: 'Beach Tennis',
    nivel: 'Todos os níveis',
    status: 'aberto',
    desc: 'O grande evento anual da Podium Arena! Categorias A, B, C e D + infantil. Premiação de R$3.000 para a categoria A. Transmissão ao vivo.',
    categoria: 'beachtennis',
    icon: 'trophy',
  },
];

let activeFilter = 'todos';

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return { day: d, month: months[parseInt(m)-1], year: y };
}

function vagasPercent(inscritos, vagas) { return Math.min((inscritos / vagas) * 100, 100); }

function statusLabel(evt) {
  if (evt.status === 'esgotado') return { text:'Esgotado', cls:'closed' };
  const pct = vagasPercent(evt.inscritos, evt.vagas);
  if (pct >= 90) return { text:'Últimas vagas', cls:'last' };
  return { text:'Inscrições Abertas', cls:'open' };
}

function renderEvents(filter) {
  const container = document.getElementById('eventsList');
  if (!container) return;

  const filtered = filter === 'todos'
    ? EVENTS_DATA
    : EVENTS_DATA.filter(e => e.categoria === filter);

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
  const evt = EVENTS_DATA.find(e => e.id === id);
  if (!evt) return;

  const date = formatDate(evt.data);
  const sl = statusLabel(evt);
  const pct = vagasPercent(evt.inscritos, evt.vagas);

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
    btn.disabled = evt.status === 'esgotado';
    btn.textContent = evt.status === 'esgotado' ? 'Evento Esgotado' : 'Inscrever-se';
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

  const evt = EVENTS_DATA.find(e => e.id === id);
  if (!evt || evt.status === 'esgotado') return;

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
    preco: evt.preco,
    status: 'confirmada',
    criadaEm: new Date().toISOString()
  };
  inscricoes.push(inscricao);
  localStorage.setItem('podium_inscricoes', JSON.stringify(inscricoes));

  // Atualizar contador
  evt.inscritos = Math.min(evt.inscritos + 1, evt.vagas);
  if (evt.inscritos >= evt.vagas) evt.status = 'esgotado';

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
