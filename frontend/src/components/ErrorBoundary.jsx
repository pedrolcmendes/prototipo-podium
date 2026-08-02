import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Falha inesperada na interface:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="status-page" role="alert">
        <div className="status-page__glow" aria-hidden="true" />
        <section className="status-card">
          <span className="status-card__code">Ops</span>
          <p className="section-eyebrow">Falha inesperada</p>
          <h1>Algo saiu da quadra.</h1>
          <p>
            Não conseguimos mostrar esta tela agora. Seus dados não foram alterados;
            recarregue a página para continuar.
          </p>
          <div className="status-card__actions">
            <button className="btn-gold" type="button" onClick={() => window.location.reload()}>
              Recarregar página
            </button>
            <button className="btn-outline" type="button" onClick={() => { window.location.href = '/'; }}>
              Ir para o início
            </button>
          </div>
        </section>
      </main>
    );
  }
}
