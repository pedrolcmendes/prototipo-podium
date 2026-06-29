import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Footer from '../components/Footer';

function useCountUp(ref, target, suffix = '') {
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let start = 0;
      const step = Math.ceil(target / 40);
      const timer = setInterval(() => {
        start = Math.min(start + step, target);
        if (ref.current) ref.current.textContent = start + suffix;
        if (start >= target) clearInterval(timer);
      }, 30);
    }, { threshold: 0.5 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, target, suffix]);
}

function useReveal() {
  useEffect(() => {
    const items = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); observer.unobserve(e.target); } });
    }, { threshold: 0.1 });
    items.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

export default function Home() {
  const [eventos, setEventos] = useState([]);
  const ref6 = useRef(null);
  const ref7 = useRef(null);
  const ref50 = useRef(null);

  useReveal();
  useCountUp(ref6, 6);
  useCountUp(ref7, 7);
  useCountUp(ref50, 50, '+');

  useEffect(() => {
    api.get('/events?limit=3&status=aberto').then(r => setEventos(r.data.data || r.data || [])).catch(() => {});
  }, []);

  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  return (
    <>
      {/* HERO */}
      <div className="hero" id="home" style={{ marginTop: 0, paddingTop: 'calc(var(--nav-h) + 3rem)' }}>
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="hero-lines" />
        <div className="hero-content">
          <div className="hero-badge"><span className="hero-badge-dot" />Complexo Esportivo · Telêmaco Borba — PR</div>
          <div className="hero-logo">
            <img src="/img/logo.png" alt="Podium Arena" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
          </div>
          <h1 className="hero-title">PODIUM <span>ARENA</span></h1>
          <p className="hero-sub">Beach Sports · Academia · Taekwondo · Gastronomia</p>
          <div className="hero-btns">
            <Link to="/reservas" className="btn-gold">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Reservar Quadra
            </Link>
            <a href="#modalidades" className="btn-outline">Ver Modalidades</a>
          </div>
        </div>
        <div className="hero-scroll" onClick={() => document.getElementById('strip')?.scrollIntoView({ behavior: 'smooth' })}>
          <span>Role para baixo</span>
          <div className="scroll-line" />
        </div>
      </div>

      {/* NUMBERS STRIP */}
      <div className="numbers-strip" id="strip">
        <div className="numbers-inner">
          <div className="num-item reveal">
            <div className="num-value" ref={ref6}>0</div>
            <div className="num-label">Quadras de Areia</div>
          </div>
          <div className="num-item reveal reveal-delay-1">
            <div className="num-value" ref={ref7}>0</div>
            <div className="num-label">Modalidades</div>
          </div>
          <div className="num-item reveal reveal-delay-2">
            <div className="num-value" ref={ref50}>0</div>
            <div className="num-label">Eventos por Ano</div>
          </div>
          <div className="num-item reveal reveal-delay-3">
            <div className="num-value">6h–23h</div>
            <div className="num-label">Seg. a Sáb.</div>
          </div>
        </div>
      </div>

      {/* SOBRE */}
      <section id="sobre" className="section-wrap">
        <div className="about-grid">
          <div className="about-img-wrap reveal">
            <div className="about-img-frame">
              <img src="/img/espaco-podium.png" alt="Podium Arena — Quadras" />
              <div className="about-img-overlay" />
              <div className="about-img-deco" />
              <div className="about-img-deco2" />
            </div>
          </div>
          <div className="reveal reveal-delay-1">
            <p className="section-eyebrow">Sobre Nós</p>
            <h2 className="section-title">MAIS QUE UMA <span style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold),var(--gold-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>ARENA</span></h2>
            <div className="section-divider" />
            <div className="about-text">
              <p>A Podium Arena é o espaço esportivo premium de Telêmaco Borba, criada para quem vive a competição com paixão. Localizada na Rua Manaus, 321, oferecemos quadras de areia profissional, estrutura de alto nível e uma comunidade que respira esporte.</p>
              <p>Aqui você encontra Beach Tennis, Futevôlei, Vôlei de Praia, Pickleball, Academia de Musculação, Taekwondo e um Espaço Gastronômico completo — tudo em um único lugar.</p>
            </div>
            <ul className="feature-list">
              <li>Quadras de areia com iluminação LED profissional</li>
              <li>Estrutura completa para torneios e eventos</li>
              <li>Academia de musculação e funcional</li>
              <li>Taekwondo com professores especializados</li>
              <li>Espaço gastronômico integrado à arena</li>
              <li>Estacionamento amplo e gratuito</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="sep"><div className="sep-line" /></div>

      {/* MODALIDADES */}
      <section id="modalidades" className="section-wrap">
        <p className="section-eyebrow reveal">Modalidades</p>
        <h2 className="section-title reveal">O QUE OFERECEMOS</h2>
        <div className="section-divider reveal" />
        <div className="mod-grid">
          {[
            { n: '01', nome: 'Beach Tennis', img: '/img/beach2-podium.jpg', desc: 'Quadras de areia profissional com redes oficiais, iluminação LED e marcação regulamentada. Aulas, treinos e campeonatos.', link: '/reservas', cta: 'Reservar horário' },
            { n: '02', nome: 'Futevôlei', img: '/img/futvolei-podium.jpg', desc: 'A combinação explosiva entre futebol e vôlei. Quadras na areia prontas para grupos, ligas e campeonatos regulares.', link: '/reservas', cta: 'Reservar horário' },
            { n: '03', nome: 'Vôlei de Praia', img: '/img/volei-podium.png', desc: 'Estrutura olímpica para treinos e competições. Ideal para atletas que buscam evolução técnica e física na areia.', link: '/reservas', cta: 'Reservar horário' },
            { n: '04', nome: 'Pickleball', img: '/img/beach1-podium.jpg', desc: 'O esporte que mais cresce no Brasil. A Podium Arena traz a experiência completa de Pickleball para Telêmaco Borba.', link: '/reservas', cta: 'Reservar horário' },
            { n: '05', nome: 'Academia', img: '/img/garagefit-podium.png', desc: 'Academia completa de musculação e treinamento funcional para complementar sua performance esportiva na arena.', link: '#contato', cta: 'Saiba mais' },
            { n: '06', nome: 'Taekwondo', img: '/img/taekwondo-podium.png', desc: 'Academia de Taekwondo com professores qualificados. Turmas para todas as idades e níveis, do iniciante ao competidor.', link: '#contato', cta: 'Saiba mais' },
            { n: '07', nome: 'Kutz Studio', img: '/img/kutz-studio-podium.jpg', desc: 'Barbearia premium dentro da arena. Cortes, barba e cuidados masculinos para você chegar ou sair impecável de qualquer partida.', link: '#contato', cta: 'Saiba mais' },
            { n: '08', nome: 'Hermanos Chopp', img: '/img/hermanos-chopp-podium.jpg', desc: 'Bar e chopperia para curtir com a turma depois do jogo. Ambiente descontraído com chopp gelado e petiscos.', link: '#contato', cta: 'Saiba mais' },
          ].map((m, i) => (
            <div key={m.n} className={`mod-card reveal${i % 3 === 1 ? ' reveal-delay-1' : i % 3 === 2 ? ' reveal-delay-2' : ''}`}>
              <div className="mod-img-wrap">
                <img className="mod-img" src={m.img} alt={`${m.nome} — Podium Arena`} />
              </div>
              <div className="mod-body">
                <div className="mod-num">{m.n}</div>
                <div className="mod-name">{m.nome}</div>
                <p className="mod-desc">{m.desc}</p>
                {m.link.startsWith('/') ? (
                  <Link to={m.link} className="mod-link">{m.cta}</Link>
                ) : (
                  <a href={m.link} className="mod-link">{m.cta}</a>
                )}
              </div>
            </div>
          ))}

          <div className="mod-card reveal mod-span">
            <div className="mod-span-inner">
              <div className="mod-img-wrap">
                <img className="mod-img" src="/img/restaurante-podium.png" alt="Espaço Gastronômico — Podium Arena" />
              </div>
              <div className="mod-body">
                <div className="mod-num">09</div>
                <div className="mod-name">Espaço Gastronômico</div>
                <p className="mod-desc">Restaurante e lanchonete integrados à arena para você recarregar as energias antes ou depois dos treinos. O espaço ideal para confraternizações e eventos.</p>
                <a href="#contato" className="mod-link">Reservar espaço</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="sep"><div className="sep-line" /></div>

      {/* GALERIA */}
      <section className="section-wrap">
        <p className="section-eyebrow reveal">Galeria</p>
        <h2 className="section-title reveal">A ATMOSFERA DA ARENA</h2>
        <div className="section-divider reveal" />
        <div className="gallery-grid reveal">
          <div className="g-item gc-1"><img src="/img/frente-podium-new.jpg" alt="Podium Arena — Entrada" /><div className="g-overlay"><span className="g-label">Nossa Arena</span></div></div>
          <div className="g-item"><img src="/img/beach3-podium.jpg" alt="Beach Tennis Podium Arena" /><div className="g-overlay"><span className="g-label">Beach Tennis</span></div></div>
          <div className="g-item"><img src="/img/futvolei-podium.jpg" alt="Futevôlei Podium Arena" /><div className="g-overlay"><span className="g-label">Futevôlei</span></div></div>
          <div className="g-item"><img src="/img/trofeus-podium.jpg" alt="Troféus Podium Arena" /><div className="g-overlay"><span className="g-label">Competição</span></div></div>
          <div className="g-item"><img src="/img/estacionamento-podium.png" alt="Estacionamento Podium Arena" /><div className="g-overlay"><span className="g-label">Estacionamento</span></div></div>
          <div className="g-item"><img src="/img/arena-coberta-podium.jpg" alt="Arena Coberta Podium Arena" /><div className="g-overlay"><span className="g-label">Estrutura</span></div></div>
        </div>
      </section>

      <div className="sep"><div className="sep-line" /></div>

      {/* DIFERENCIAIS */}
      <div className="diff-section reveal" id="estrutura">
        <div className="diff-inner">
          <p className="section-eyebrow">Diferenciais</p>
          <h2 className="section-title">POR QUE A PODIUM?</h2>
          <div className="section-divider" style={{ marginBottom: '3.5rem' }} />
          <div className="diff-grid">
            {[
              { title: 'Iluminação LED', text: 'Sistema profissional em todas as quadras para jogar a qualquer hora do dia ou da noite.', icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" x2="12" y1="1" y2="3"/><line x1="12" x2="12" y1="21" y2="23"/><line x1="4.22" x2="5.64" y1="4.22" y2="5.64"/><line x1="18.36" x2="19.78" y1="18.36" y2="19.78"/><line x1="1" x2="3" y1="12" y2="12"/><line x1="21" x2="23" y1="12" y2="12"/><line x1="4.22" x2="5.64" y1="19.78" y2="18.36"/><line x1="18.36" x2="19.78" y1="5.64" y2="4.22"/></svg> },
              { title: 'Eventos & Torneios', text: 'Infraestrutura completa para receber campeonatos, ligas e eventos de todos os portes.', icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg> },
              { title: 'Reserva Online', text: 'Agende sua quadra em segundos pelo sistema online com calendário em tempo real.', icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/></svg> },
              { title: 'Estacionamento', text: 'Estacionamento amplo e gratuito para atletas e visitantes com total comodidade.', icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg> },
              { title: 'Quadras Cobertas', text: 'Cobertura garantindo conforto para prática em qualquer condição climática.', icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
              { title: 'Ranking Oficial', text: 'Sistema de ranking para Futevôlei e Beach Tennis com classificação atualizada.', icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg> },
              { title: 'Alimentação', text: 'Espaço gastronômico completo com opções saudáveis para recarregar energia.', icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 21h10"/><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9z"/></svg> },
              { title: 'Vestiários', text: 'Vestiários masculino e feminino com chuveiros e armários para sua comodidade.', icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h1.5L12 14.5 18.5 4H20"/><path d="M12 14.5V20"/><path d="M9 20h6"/></svg> },
            ].map((d, i) => (
              <div key={d.title} className={`diff-item reveal${i % 4 === 1 ? ' reveal-delay-1' : i % 4 === 2 ? ' reveal-delay-2' : i % 4 === 3 ? ' reveal-delay-3' : ''}`}>
                <div className="diff-icon-wrap">{d.icon}</div>
                <h3 className="diff-title">{d.title}</h3>
                <p className="diff-text">{d.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sep"><div className="sep-line" /></div>

      {/* PARCEIROS */}
      <section id="parceiros" className="section-wrap">
        <p className="section-eyebrow reveal">Parcerias</p>
        <h2 className="section-title reveal">PARCEIROS &amp; PATROCINADORES</h2>
        <div className="section-divider reveal" />
        <p className="reveal" style={{ color: 'var(--gray)', maxWidth: '640px', marginBottom: '3rem' }}>A Podium Arena conta com marcas parceiras que enriquecem a experiência dentro e fora das quadras.</p>
        <div className="partners-grid reveal">
          <div className="partner-card"><div className="partner-logo-ph">KUTZ<br />STUDIO</div><div className="partner-name">Kutz Studio</div><div className="partner-tag">Barbearia</div></div>
          <div className="partner-card"><div className="partner-logo-ph">HERMANOS<br />CHOPP</div><div className="partner-name">Hermanos Chopp</div><div className="partner-tag">Bar &amp; Chopperia</div></div>
          <div className="partner-card partner-card-empty"><div className="partner-logo-ph ph-empty">+</div><div className="partner-name">Sua marca aqui</div><div className="partner-tag">Seja um parceiro</div></div>
          <div className="partner-card partner-card-empty"><div className="partner-logo-ph ph-empty">+</div><div className="partner-name">Sua marca aqui</div><div className="partner-tag">Seja um parceiro</div></div>
        </div>
        <div className="reveal" style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <a href="#contato" className="btn-ghost">Quero ser parceiro →</a>
        </div>
      </section>

      <div className="sep"><div className="sep-line" /></div>

      {/* EVENTOS */}
      <section id="eventos" className="section-wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p className="section-eyebrow reveal">Agenda</p>
            <h2 className="section-title reveal" style={{ marginBottom: 0 }}>PRÓXIMOS EVENTOS</h2>
          </div>
          <Link to="/eventos" className="btn-ghost reveal">Ver todos →</Link>
        </div>
        <div className="events-grid reveal" id="homeEventsGrid">
          {eventos.length === 0 && (
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-cond)', letterSpacing: '1px', gridColumn: '1/-1' }}>Nenhum evento disponível no momento.</p>
          )}
          {eventos.map(ev => {
            const d = new Date(ev.data);
            return (
              <Link to="/eventos" key={ev._id} className="ev-card">
                <div className="ev-card-top">
                  <div className="ev-date-block">
                    <span className="ev-day">{String(d.getDate()).padStart(2, '0')}</span>
                    <span className="ev-month">{MESES[d.getMonth()]}</span>
                  </div>
                  {ev.categoria && <span className="ev-cat">{ev.categoria}</span>}
                </div>
                <div className="ev-card-body">
                  <div className="ev-title">{ev.nome}</div>
                  <div className="ev-meta">{[ev.local, ev.hora].filter(Boolean).join(' · ')}</div>
                </div>
                <div className="ev-card-footer">
                  <span>Ver detalhes</span>
                  <span className="ev-arrow">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <div className="cta-banner" id="contato">
        <div className="cta-bg" />
        <div className="cta-bg-lines" />
        <div className="cta-content reveal">
          <p className="section-eyebrow" style={{ justifyContent: 'center' }}>Reserve Agora</p>
          <h2 className="cta-title">PRONTO PARA <em>COMPETIR?</em></h2>
          <p className="cta-sub">Reserve sua quadra ou inscreva-se em um evento agora mesmo</p>
          <div className="cta-btns">
            <Link to="/reservas" className="btn-gold">Reservar Quadra</Link>
            <a href="https://wa.me/5543999999999" className="btn-wpp" target="_blank" rel="noreferrer">WhatsApp</a>
            <Link to="/eventos" className="btn-outline">Ver Eventos</Link>
          </div>
        </div>
      </div>

      {/* LOCALIZAÇÃO */}
      <section className="location-section" id="localizacao">
        <div className="location-inner">
          <div className="location-info reveal">
            <div>
              <p className="section-eyebrow" style={{ marginBottom: '1.2rem' }}>Como Chegar</p>
              <div className="location-address">
                <div className="street">RUA MANAUS, 321</div>
                <div className="city">Telêmaco Borba · Paraná · Brasil</div>
              </div>
            </div>
            <div className="location-details">
              <div className="location-detail-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <div><strong>Horários</strong> Seg a Sex: 06h – 23h &nbsp;·&nbsp; Sáb: 06h – 22h<br />Dom e Feriados: Consultar</div>
              </div>
              <div className="location-detail-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                <div><strong>Estacionamento</strong> Amplo e gratuito para atletas e visitantes</div>
              </div>
              <div className="location-detail-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                <div><strong>WhatsApp</strong> <a href="https://wa.me/5543999999999" style={{ color: 'var(--gray)', textDecoration: 'none' }}>(43) 9 9999-9999</a></div>
              </div>
            </div>
            <a href="https://maps.google.com/?q=Podium+Arena+Telemaco+Borba" target="_blank" rel="noreferrer" className="location-cta-link">
              Abrir no Google Maps
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
            </a>
          </div>
          <div className="location-map-wrap">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3635.3285580101124!2d-50.6059812!3d-24.335045100000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94e983a619b0d2f7%3A0xe5b91f9a81dd464b!2sPodium%20Arena!5e0!3m2!1sen!2sbr!4v1780151613503!5m2!1sen!2sbr"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              title="Podium Arena - Localização"
            />
            <div className="location-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              Podium Arena
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
