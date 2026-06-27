import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer>
      <div className="footer-top">
        <div className="footer-brand">
          <img src="/img/logo.png" alt="Podium Arena" />
          <p>A arena de Beach Sports premium de Telêmaco Borba. Beach Tennis, Futevôlei, Vôlei, Pickleball, Academia, Taekwondo e Gastronomia — tudo em um lugar.</p>
          <div className="footer-social">
            <a href="https://www.instagram.com/podiumarena/" className="soc-link" target="_blank" rel="noreferrer">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
            <a href="https://wa.me/5543999999999" className="soc-link" target="_blank" rel="noreferrer">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
            </a>
            <a href="https://linktr.ee/podiumarena" className="soc-link" target="_blank" rel="noreferrer">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </a>
          </div>
        </div>
        <div className="footer-col">
          <h4>Modalidades</h4>
          <ul>
            <li><a href="#modalidades">Beach Tennis</a></li>
            <li><a href="#modalidades">Futevôlei</a></li>
            <li><a href="#modalidades">Vôlei de Praia</a></li>
            <li><a href="#modalidades">Pickleball</a></li>
            <li><a href="#modalidades">Academia</a></li>
            <li><a href="#modalidades">Taekwondo</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Horários</h4>
          <ul>
            <li><a>Seg a Sex: 06h – 23h</a></li>
            <li><a>Sábado: 06h – 22h</a></li>
            <li><a>Domingo: Consultar</a></li>
            <li><a>Feriados: Consultar</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Contato</h4>
          <div className="footer-contact-item">
            <span className="icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span>
            <p>Rua Manaus, 321<br />Telêmaco Borba – PR</p>
          </div>
          <div className="footer-contact-item">
            <span className="icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.91 6.91l.44-.44a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>
            <p><a href="https://wa.me/5543999999999">(43) 9 9999-9999</a></p>
          </div>
          <div className="footer-contact-item">
            <span className="icon"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg></span>
            <p><a href="https://instagram.com/podiumarena">@podiumarena</a></p>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p className="footer-copy">
          © 2026 Podium Arena · Rua Manaus, 321 · Telêmaco Borba – PR &nbsp;·&nbsp;{' '}
          <Link to="/privacidade" style={{ color: 'var(--gray)', transition: 'color .2s' }}>Privacidade</Link>
        </p>
      </div>
    </footer>
  );
}
