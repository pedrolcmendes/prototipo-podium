/* ═══════════════════════════════════════════
   RANKING-STORE.JS — Fonte única de dados de ranking
   Compartilhado entre o site público (ranking.js)
   e o painel administrativo (admin.js).
   ═══════════════════════════════════════════ */

const RANKING_DEFAULT = {
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

function getRanking() {
  const stored = localStorage.getItem('podium_ranking');
  if (stored) return JSON.parse(stored);
  saveRanking(RANKING_DEFAULT);
  return RANKING_DEFAULT;
}

function saveRanking(ranking) {
  localStorage.setItem('podium_ranking', JSON.stringify(ranking));
}

window.RANKING_DEFAULT = RANKING_DEFAULT;
window.getRanking       = getRanking;
window.saveRanking      = saveRanking;
