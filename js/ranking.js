/* ═══════════════════════════════════════════
   RANKING.JS — Dados e renderização do ranking
   ═══════════════════════════════════════════ */

// Dados vêm de js/ranking-store.js (getRanking), a mesma fonte que o
// painel admin gerencia em admin.html → aba Ranking.

// Renderizar linha do ranking
function renderRow(player, idx) {
  let posClass = '';
  let posLabel = player.pos;
  if (player.pos === 1) { posClass = 'gold'; posLabel = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C5A028" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M9 11l2 2 4-4"/></svg>'; }
  else if (player.pos === 2) { posClass = 'silver'; posLabel = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C0C0C0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M9 11l2 2 4-4"/></svg>'; }
  else if (player.pos === 3) { posClass = 'bronze'; posLabel = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#CD7F32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M9 11l2 2 4-4"/></svg>'; }

  const initials = player.nome.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
  const rowClass = ['top-1','top-2','top-3'][player.pos-1] || '';
  const winRate = ((player.v / player.pj) * 100).toFixed(0);

  return `
    <div class="ranking-row ${rowClass}">
      <div class="r-pos ${posClass}">${posLabel}</div>
      <div class="r-athlete">
        <div class="r-avatar">${initials}</div>
        <div>
          <div class="r-name">${player.nome}</div>
          <div class="r-club">${player.clube}</div>
        </div>
      </div>
      <div class="r-pts">${player.pts}</div>
      <div class="r-win">${player.v}V</div>
      <div class="r-loss">${player.d}D</div>
      <div class="r-stat">${winRate}%</div>
    </div>
  `;
}

// Renderizar pódio visual
function renderPodio(players) {
  const top = players.slice(0,3);
  // Ordem: 2º, 1º, 3º (estilo pódio)
  const order = [top[1], top[0], top[2]].filter(Boolean);
  const emojis = ['<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C0C0C0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M9 11l2 2 4-4"/></svg>','<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C5A028" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M9 11l2 2 4-4"/></svg>','<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#CD7F32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M9 11l2 2 4-4"/></svg>'];
  const orderIdx = [1, 0, 2];

  return `
    <div class="podium-visual">
      ${order.map((p, i) => `
        <div class="podium-place">
          <div class="podium-avatar">${emojis[i]}</div>
          <div class="podium-name">${p.nome}</div>
          <div class="podium-pts">${p.pts} pts</div>
        </div>
      `).join('')}
    </div>
  `;
}

// Carregar e renderizar ranking
function loadRanking(sport, gender) {
  const data = getRanking()[sport]?.[gender] || [];
  const container = document.getElementById('rankingList');
  if (!container) return;

  container.innerHTML = renderPodio(data) + `
    <div class="ranking-header-bar">
      <div class="r-pos">#</div>
      <div>Atleta / Dupla</div>
      <div class="r-stat">Pontos</div>
      <div class="r-stat">Vitórias</div>
      <div class="r-stat">Derrotas</div>
      <div class="r-stat">Win%</div>
    </div>
    ${data.map(renderRow).join('')}
  `;
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  let currentSport = 'futevolei';
  let currentGender = 'masculino';

  // Sport tabs
  document.querySelectorAll('.ranking-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ranking-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentSport = tab.dataset.sport;
      loadRanking(currentSport, currentGender);
    });
  });

  // Gender filter
  document.querySelectorAll('.gender-toggle[data-gender]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gender-toggle[data-gender]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentGender = btn.dataset.gender;
      loadRanking(currentSport, currentGender);
    });
  });

  loadRanking(currentSport, currentGender);
});
