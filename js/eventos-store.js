/* ═══════════════════════════════════════════
   EVENTOS-STORE.JS — Fonte única de dados de eventos
   Compartilhado entre o site público (eventos.js, index.html)
   e o painel administrativo (admin.js).
   ═══════════════════════════════════════════ */

const CATEGORIA_LABELS = {
  beachtennis: 'Beach Tennis',
  futevolei:   'Futevôlei',
  volei:       'Vôlei de Praia',
  pickleball:  'Pickleball',
  taekwondo:   'Taekwondo',
  geral:       'Geral',
};

const CATEGORIA_ICONS = {
  beachtennis: 'tennis',
  futevolei:   'soccer',
  volei:       'volei',
  pickleball:  'pickleball',
  taekwondo:   'taekwondo',
  geral:       'trophy',
};

const EVENTOS_DEFAULT = [
  { id:'evt001', nome:'Torneio Aberto de Beach Tennis', data:'2026-05-22', hora:'14h–18h', local:'Quadras de Areia — Podium Arena', vagas:64,  categoria:'beachtennis', preco:80,  status:'aberto',    nivel:'Todos os níveis',          desc:'O maior torneio de Beach Tennis de Telêmaco Borba retorna! Categorias A, B e C para todos os níveis. Premiação para os três primeiros colocados de cada categoria.' },
  { id:'evt002', nome:'Liga Futevôlei — Etapa TB',       data:'2026-05-29', hora:'19h–22h', local:'Arena Central — Podium Arena',        vagas:32,  categoria:'futevolei',   preco:60,  status:'aberto',    nivel:'Intermediário / Avançado', desc:'A Liga Municipal de Futevôlei chega à sua 4ª etapa na Podium Arena. Duplas masculino e feminino. Pontos válidos para o ranking oficial.' },
  { id:'evt003', nome:'Clínica de Pickleball com Profissionais', data:'2026-06-06', hora:'09h–12h', local:'Quadra Premium — Podium Arena', vagas:40, categoria:'pickleball', preco:120, status:'aberto',    nivel:'Iniciante / Intermediário', desc:'Aprenda com campeões nacionais! A clínica cobre técnicas de saque, devolução, volleys e estratégia de jogo. Inclui material didático e lanche.' },
  { id:'evt004', nome:'Campeonato Master — Vôlei de Areia', data:'2026-06-15', hora:'10h–20h', local:'Arena Principal — Podium Arena',     vagas:128, categoria:'volei',      preco:90,  status:'encerrado', nivel:'Avançado (35+)',           desc:'O Campeonato Master reúne atletas acima de 35 anos para uma competição de alto nível. 32 duplas masculino + 32 duplas feminino.' },
  { id:'evt005', nome:'Torneio de Taekwondo — Região Norte PR', data:'2026-06-26', hora:'08h–17h', local:'Área Coberta — Podium Arena',    vagas:200, categoria:'taekwondo',  preco:50,  status:'aberto',    nivel:'Todas as categorias',      desc:'Torneio regional de Taekwondo com categorias por faixa etária e graduação. Evento validado pela Federação Paranaense de Taekwondo.' },
  { id:'evt006', nome:'Copa Podium Arena — Beach Tennis', data:'2026-07-04', hora:'08h–19h', local:'Todas as Quadras — Podium Arena',     vagas:96,  categoria:'beachtennis', preco:100, status:'aberto',    nivel:'Todos os níveis',          desc:'O grande evento anual da Podium Arena! Categorias A, B, C e D + infantil. Premiação de R$3.000 para a categoria A. Transmissão ao vivo.' },
];

function getEventos() {
  const stored = localStorage.getItem('podium_eventos');
  if (stored) return JSON.parse(stored);
  saveEventos(EVENTOS_DEFAULT);
  return EVENTOS_DEFAULT;
}

function saveEventos(eventos) {
  localStorage.setItem('podium_eventos', JSON.stringify(eventos));
}

// Conta inscrições reais (nunca um contador solto que possa desincronizar)
function contarInscritos(eventoNome) {
  const insc = JSON.parse(localStorage.getItem('podium_inscricoes') || '[]');
  return insc.filter(i => i.eventNome === eventoNome).length;
}

window.CATEGORIA_LABELS  = CATEGORIA_LABELS;
window.CATEGORIA_ICONS   = CATEGORIA_ICONS;
window.EVENTOS_DEFAULT   = EVENTOS_DEFAULT;
window.getEventos        = getEventos;
window.saveEventos       = saveEventos;
window.contarInscritos   = contarInscritos;
