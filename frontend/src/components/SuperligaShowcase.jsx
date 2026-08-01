import { useMemo, useState } from 'react';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import '../styles/superliga.css';

const INSTAGRAM_POST = 'https://www.instagram.com/p/Da5dIxUkTYY/';
const INSTAGRAM_INFO = 'https://www.instagram.com/p/DbLupX0knEi/';

const STAGES = [
  { date: '2026-07-25', endDate: '2026-07-25', day: '25', month: 'JUL', color: 'Laranja', tone: '#ff7a00', round: '1ª etapa', categories: 'Masculino e Feminino', hero: 'Aquaman' },
  { date: '2026-08-08', endDate: '2026-08-08', day: '08', month: 'AGO', color: 'Azul', tone: '#168cff', round: '1ª etapa', categories: 'Kids e Misto', hero: 'Capitão América' },
  { date: '2026-08-22', endDate: '2026-08-22', day: '22', month: 'AGO', color: 'Verde', tone: '#00cf55', round: '2ª etapa', categories: 'Masculino e Feminino', hero: 'Hulk' },
  { date: '2026-09-12', endDate: '2026-09-12', day: '12', month: 'SET', color: 'Vermelho', tone: '#ff3030', round: '2ª etapa', categories: 'Kids e Misto', hero: 'Homem-Aranha' },
  { date: '2026-09-26', endDate: '2026-09-26', day: '26', month: 'SET', color: 'Preto', tone: '#777777', round: '3ª etapa', categories: 'Masculino e Feminino', hero: 'Batman' },
  { date: '2026-10-10', endDate: '2026-10-10', day: '10', month: 'OUT', color: 'Amarelo', tone: '#ffd400', round: '3ª etapa', categories: 'Kids e Misto', hero: 'Wolverine' },
  { date: '2026-10-23', endDate: '2026-10-25', day: '23–25', month: 'OUT', color: 'Open', tone: '#ffffff', round: '4ª etapa', categories: 'Masc. · Fem. · Misto · Kids', hero: 'Open BT' },
  { date: '2026-11-07', endDate: '2026-11-07', day: '07', month: 'NOV', color: 'Azul', tone: '#168cff', round: '5ª etapa', categories: 'Masculino e Feminino', hero: 'Homem de Ferro' },
  { date: '2026-11-21', endDate: '2026-11-21', day: '21', month: 'NOV', color: 'Azul e Vermelho', tone: '#e63232', round: '5ª etapa', categories: 'Misto e Kids', hero: 'Super-Homem e Mulher-Maravilha' },
  { date: '2026-12-05', endDate: '2026-12-05', day: '05', month: 'DEZ', color: 'Roxo', tone: '#bf36e8', round: '6ª etapa', categories: 'Masculino e Feminino', hero: 'Dr. Estranho' },
  { date: '2026-12-12', endDate: '2026-12-12', day: '12', month: 'DEZ', color: 'Preto e Branco', tone: '#e8e8e8', round: '6ª etapa', categories: 'Misto e Kids', hero: 'Viúva Negra' },
  { date: '2026-12-13', endDate: '2026-12-13', day: '13', month: 'DEZ', color: 'Final', tone: '#f6c344', round: 'Encerramento', categories: 'Celebração da temporada', hero: 'Podium Arena' },
];

const ARTS = [
  { src: '/events/superliga-2026/programacao-julho-agosto.png', alt: 'Programação da Superliga em julho e agosto', label: 'Julho e agosto' },
  { src: '/events/superliga-2026/programacao-setembro-outubro.png', alt: 'Programação da Superliga em setembro e outubro', label: 'Setembro e outubro' },
  { src: '/events/superliga-2026/programacao-open-novembro.png', alt: 'Programação do Open BT e etapas de novembro', label: 'Open BT e novembro' },
  { src: '/events/superliga-2026/programacao-dezembro.png', alt: 'Programação da Superliga em dezembro e encerramento', label: 'Dezembro e final' },
  { src: '/events/superliga-2026/primeira-etapa-aquaman.png', alt: 'Horários e categorias da primeira etapa Aquaman', label: '1ª etapa · Aquaman' },
];

const dayValue = (isoDate) => new Date(`${isoDate}T12:00:00`).getTime();

function ExternalArrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7" /><path d="M7 7h10v10" />
    </svg>
  );
}

export default function SuperligaShowcase({ registrationEvent = null, onRegister = null }) {
  const [zoomArt, setZoomArt] = useState(null);
  useBodyScrollLock(Boolean(zoomArt));

  const timeline = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayValue = today.getTime();
    const nextIndex = STAGES.findIndex((stage) => dayValue(stage.endDate) >= todayValue);

    return STAGES.map((stage, index) => {
      const start = dayValue(stage.date);
      const end = dayValue(stage.endDate);
      const isLive = todayValue >= start && todayValue <= end;
      const isPast = todayValue > end;
      return {
        ...stage,
        state: isLive ? 'live' : isPast ? 'past' : index === nextIndex ? 'next' : 'future',
      };
    });
  }, []);

  const nextStage = timeline.find((stage) => stage.state === 'live' || stage.state === 'next');

  return (
    <section className="sl-shell" aria-labelledby="superliga-title">
      <div className="sl-comic-dots" aria-hidden="true" />
      <div className="sl-hero">
        <button className="sl-cover" type="button" onClick={() => setZoomArt({ src: '/events/superliga-2026/superliga-capa.png', alt: 'Capa da Superliga Beach Tennis Super-Heróis' })} aria-label="Ampliar arte principal da Superliga">
          <img src="/events/superliga-2026/superliga-capa.png" alt="Superliga Beach Tennis Super-Heróis da Podium Arena" fetchPriority="high" />
          <span className="sl-cover-hint">Clique para ampliar</span>
        </button>

        <div className="sl-hero-copy">
          <div className="sl-kicker"><span>Temporada 2026</span> Evento em destaque</div>
          <h2 id="superliga-title">SUPERLIGA <em>BEACH TENNIS</em></h2>
          <p className="sl-subtitle">A liga dos super-heróis invadiu a areia.</p>
          <p className="sl-intro">Uma temporada completa na Podium Arena, com etapas masculinas, femininas, mistas e kids — cada rodada inspirada em um novo herói.</p>

          <div className="sl-stats" aria-label="Resumo da temporada">
            <div><strong>12</strong><span>encontros</span></div>
            <div><strong>6 + Open</strong><span>etapas</span></div>
            <div><strong>JUL—DEZ</strong><span>temporada</span></div>
          </div>

          {nextStage ? (
            <div className="sl-next">
              <span className="sl-next-label">{nextStage.state === 'live' ? 'Acontecendo agora' : 'Próxima batalha'}</span>
              <strong>{nextStage.day} {nextStage.month} · {nextStage.hero}</strong>
              <small>{nextStage.round} · {nextStage.categories} · Cor {nextStage.color}</small>
            </div>
          ) : (
            <div className="sl-next sl-next-finished"><span className="sl-next-label">Temporada encerrada</span><strong>Obrigado, heróis!</strong></div>
          )}

          <div className="sl-actions">
            {registrationEvent && onRegister ? (
              <button className="sl-btn sl-btn-register" type="button" onClick={() => onRegister(registrationEvent)}>
                Inscrever-se agora
                <span>{registrationEvent.preco > 0 ? `R$ ${registrationEvent.preco}/atleta` : 'Gratuito'}</span>
              </button>
            ) : null}
            <a className="sl-btn sl-btn-primary" href={INSTAGRAM_POST} target="_blank" rel="noreferrer">Ver publicação <ExternalArrow /></a>
            <a className="sl-btn sl-btn-secondary" href={INSTAGRAM_INFO} target="_blank" rel="noreferrer">O que preciso saber <ExternalArrow /></a>
          </div>
        </div>
      </div>

      <div className="sl-section-head">
        <div><span className="sl-eyebrow">Cronograma oficial</span><h3>ESCOLHA SUA BATALHA</h3></div>
        <p>Do primeiro saque ao encerramento: confira datas, categorias, cores e os heróis de cada etapa.</p>
      </div>

      <ol className="sl-timeline">
        {timeline.map((stage) => (
          <li key={`${stage.date}-${stage.round}`} className={`sl-stage sl-stage-${stage.state}`} style={{ '--stage-color': stage.tone }}>
            <div className="sl-stage-date"><strong>{stage.day}</strong><span>{stage.month}</span></div>
            <div className="sl-stage-copy">
              <div className="sl-stage-topline"><span>{stage.round}</span><i>{stage.color}</i></div>
              <h4>{stage.hero}</h4>
              <p>{stage.categories}</p>
            </div>
            <span className="sl-stage-status">
              {stage.state === 'past' ? 'Concluída' : stage.state === 'live' ? 'Em andamento' : stage.state === 'next' ? 'Próxima' : 'Programada'}
            </span>
          </li>
        ))}
      </ol>

      <div className="sl-first-stage">
        <div className="sl-first-badge">1ª etapa</div>
        <div>
          <span className="sl-eyebrow">Aquaman · cor laranja</span>
          <h3>A abertura da temporada</h3>
          <p>Realizada em 25 de julho, com categorias femininas D/C e B/A, além de masculino C, B e A. A inscrição divulgada para a etapa foi de R$ 40.</p>
        </div>
        <button type="button" onClick={() => setZoomArt(ARTS[4])}>Ver horários da etapa <span aria-hidden="true">→</span></button>
      </div>

      <div className="sl-section-head sl-gallery-head">
        <div><span className="sl-eyebrow">Central de informações</span><h3>ARTES DA TEMPORADA</h3></div>
        <p>Abra cada publicação para consultar a programação original em tamanho completo.</p>
      </div>

      <div className="sl-gallery">
        {ARTS.map((art) => (
          <button key={art.src} className="sl-gallery-card" type="button" onClick={() => setZoomArt(art)} aria-label={`Ampliar ${art.label}`}>
            <img src={art.src} alt={art.alt} loading="lazy" />
            <span>{art.label}<i aria-hidden="true">↗</i></span>
          </button>
        ))}
      </div>

      {zoomArt ? (
        <div className="sl-lightbox" role="dialog" aria-modal="true" aria-label="Arte ampliada da Superliga" onClick={() => setZoomArt(null)}>
          <button type="button" className="sl-lightbox-close" onClick={() => setZoomArt(null)} aria-label="Fechar arte ampliada">×</button>
          <img src={zoomArt.src} alt={zoomArt.alt} onClick={(event) => event.stopPropagation()} />
        </div>
      ) : null}
    </section>
  );
}
