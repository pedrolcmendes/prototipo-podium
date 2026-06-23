/* ═══════════════════════════════════════════
   HOME-EVENTOS.JS — "Próximos Eventos" na home
   Lê os mesmos dados que o admin gerencia (js/eventos-store.js)
   ═══════════════════════════════════════════ */

const HOME_EVT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const ICON_CLOCK  = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
const ICON_PIN    = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
const ICON_PEOPLE = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';

function renderHomeEventos() {
  const container = document.getElementById('homeEventsGrid');
  if (!container || typeof getEventos !== 'function') return;

  const today = new Date().toISOString().slice(0,10);
  const proximos = getEventos()
    .filter(e => e.status !== 'encerrado' && e.data >= today)
    .sort((a,b) => a.data.localeCompare(b.data))
    .slice(0, 4);

  if (proximos.length === 0) {
    container.innerHTML = '<p style="color:var(--gray);padding:2rem;text-align:center">Nenhum evento programado no momento.</p>';
    return;
  }

  container.innerHTML = proximos.map(ev => {
    const [y, m, d] = ev.data.split('-');
    const inscritos = contarInscritos(ev.nome);
    let statusHTML;
    if (ev.status === 'breve') {
      statusHTML = '<div class="event-status">Em Breve</div>';
    } else if (inscritos >= ev.vagas) {
      statusHTML = '<div class="event-status closed">Esgotado</div>';
    } else {
      statusHTML = '<div class="event-status open">Inscrições Abertas</div>';
    }
    return `
      <div class="event-row" onclick="location.href='pages/eventos.html'">
        <div class="event-date-block">
          <div class="event-day">${d}</div>
          <div class="event-month">${HOME_EVT_MONTHS[parseInt(m)-1]} ${y}</div>
        </div>
        <div class="event-info">
          <div class="event-name">${ev.nome}</div>
          <div class="event-meta">
            <span style="display:inline-flex;align-items:center;gap:.3rem">${ICON_CLOCK} ${ev.hora||'—'}</span>
            <span style="display:inline-flex;align-items:center;gap:.3rem">${ICON_PIN} ${ev.local||'—'}</span>
            <span style="display:inline-flex;align-items:center;gap:.3rem">${ICON_PEOPLE} ${ev.vagas||0} vagas</span>
          </div>
        </div>
        ${statusHTML}
      </div>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', renderHomeEventos);
