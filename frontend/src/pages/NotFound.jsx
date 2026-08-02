import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Página não encontrada | Podium Arena';
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <main className="status-page">
      <div className="status-page__glow" aria-hidden="true" />
      <section className="status-card">
        <span className="status-card__code">404</span>
        <p className="section-eyebrow">Fora de jogo</p>
        <h1>Página não encontrada.</h1>
        <p>
          O endereço pode ter sido digitado incorretamente ou a página não existe mais.
        </p>
        <div className="status-card__actions">
          <Link className="btn-gold" to="/">Voltar ao início</Link>
          <Link className="btn-outline" to="/reservas">Reservar uma quadra</Link>
        </div>
      </section>
    </main>
  );
}
