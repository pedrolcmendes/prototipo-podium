/* ═══════════════════════════════════════════
   RANKING.JS — Dados e renderização do ranking
   ═══════════════════════════════════════════ */

const RANKING_DATA = {
  futevolei: {
    masculino: [
      { pos:1,  nome:'Carlos & Pedro',    clube:'Podium Academy', pts:1840, v:22, d:3,  pj:25 },
      { pos:2,  nome:'Rafael & Thiago',   clube:'Elite Beach TB',  pts:1720, v:19, d:5,  pj:24 },
      { pos:3,  nome:'Lucas & Marcos',    clube:'Arena Pro',       pts:1610, v:18, d:7,  pj:25 },
      { pos:4,  nome:'André & Felipe',    clube:'TB Sports Club',  pts:1490, v:16, d:8,  pj:24 },
      { pos:5,  nome:'Gustavo & Bruno',   clube:'Podium Arena',    pts:1380, v:15, d:9,  pj:24 },
      { pos:6,  nome:'Diego & Mateus',    clube:'Beach Pro TB',    pts:1270, v:13, d:10, pj:23 },
      { pos:7,  nome:'Henrique & Leandro',clube:'Elite Volei',     pts:1150, v:12, d:11, pj:23 },
      { pos:8,  nome:'João & Victor',     clube:'Podium Arena',    pts:1040, v:11, d:12, pj:23 },
      { pos:9,  nome:'Gabriel & Rodrigo', clube:'TB Futevolei',    pts: 930, v:10, d:13, pj:23 },
      { pos:10, nome:'Fábio & Daniel',    clube:'Arena Beach',     pts: 820, v:9,  d:14, pj:23 },
    ],
    feminino: [
      { pos:1,  nome:'Ana & Julia',       clube:'Podium Academy', pts:1760, v:21, d:3,  pj:24 },
      { pos:2,  nome:'Beatriz & Camila',  clube:'Elite Beach TB',  pts:1650, v:19, d:4,  pj:23 },
      { pos:3,  nome:'Laura & Fernanda',  clube:'Podium Arena',    pts:1540, v:17, d:6,  pj:23 },
      { pos:4,  nome:'Mariana & Priscila',clube:'TB Sports Club',  pts:1410, v:15, d:7,  pj:22 },
      { pos:5,  nome:'Amanda & Letícia',  clube:'Arena Pro',       pts:1300, v:14, d:8,  pj:22 },
      { pos:6,  nome:'Patrícia & Rebeca', clube:'Beach Elite',     pts:1190, v:13, d:9,  pj:22 },
      { pos:7,  nome:'Sofia & Isabela',   clube:'Podium Academy',  pts:1080, v:12, d:10, pj:22 },
      { pos:8,  nome:'Clara & Vitória',   clube:'TB Volei',        pts: 960, v:10, d:11, pj:21 },
    ]
  },
  beachtennis: {
    masculino: [
      { pos:1,  nome:'Roberto & Sandro',  clube:'TB Beach Masters', pts:2100, v:24, d:2,  pj:26 },
      { pos:2,  nome:'Vinícius & Eduardo',clube:'Podium Academy',   pts:1980, v:22, d:4,  pj:26 },
      { pos:3,  nome:'Leandro & Ricardo', clube:'Elite Beach',      pts:1860, v:20, d:5,  pj:25 },
      { pos:4,  nome:'Paulo & Wesley',    clube:'Podium Arena',     pts:1730, v:18, d:7,  pj:25 },
      { pos:5,  nome:'Alex & Renato',     clube:'TB Tennis Club',   pts:1610, v:17, d:8,  pj:25 },
      { pos:6,  nome:'Tiago & Murilo',    clube:'Beach Pro',        pts:1490, v:15, d:9,  pj:24 },
      { pos:7,  nome:'Marcelo & Flávio',  clube:'Arena Beach TB',   pts:1360, v:14, d:10, pj:24 },
      { pos:8,  nome:'Ivan & Clayton',    clube:'Podium Arena',     pts:1240, v:12, d:11, pj:23 },
      { pos:9,  nome:'Neto & Evandro',    clube:'Masters TB',       pts:1120, v:11, d:12, pj:23 },
      { pos:10, nome:'Samuel & Adriano',  clube:'Elite Beach',      pts:1000, v:9,  d:13, pj:22 },
    ],
    feminino: [
      { pos:1,  nome:'Rafaela & Débora',  clube:'Podium Academy',  pts:2020, v:23, d:2,  pj:25 },
      { pos:2,  nome:'Monique & Aline',   clube:'TB Beach Elite',   pts:1900, v:21, d:3,  pj:24 },
      { pos:3,  nome:'Sabrina & Talita',  clube:'Podium Arena',     pts:1780, v:19, d:5,  pj:24 },
      { pos:4,  nome:'Renata & Cris',     clube:'Beach Masters',    pts:1650, v:17, d:6,  pj:23 },
      { pos:5,  nome:'Bruna & Giovana',   clube:'Elite Tennis',     pts:1520, v:16, d:7,  pj:23 },
      { pos:6,  nome:'Kelly & Vanessa',   clube:'Podium Arena',     pts:1390, v:14, d:8,  pj:22 },
      { pos:7,  nome:'Cristiane & Elaine',clube:'TB Beach Club',    pts:1260, v:13, d:9,  pj:22 },
      { pos:8,  nome:'Jéssica & Natália', clube:'Arena Pro',        pts:1130, v:11, d:10, pj:21 },
    ]
  }
};

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
  const data = RANKING_DATA[sport]?.[gender] || [];
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
