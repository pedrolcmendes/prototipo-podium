import Footer from '../components/Footer';
import { useSettings } from '../contexts/SettingsContext';

export default function Privacidade() {
  const { settings } = useSettings();
  return (
    <>
      <style>{`
        .priv-header {
          text-align: center;
          padding: 3rem 1.5rem 2.5rem;
          border-bottom: 1px solid var(--border);
          background: var(--dark);
        }
        .priv-header h1 {
          font-family: var(--font-display);
          font-size: clamp(2rem, 6vw, 3rem);
          letter-spacing: 2px;
          color: var(--gold);
          margin-bottom: .4rem;
        }
        .priv-header p {
          font-family: var(--font-cond);
          font-size: .85rem;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--gray);
        }
        .priv-content {
          max-width: 760px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem 4rem;
          line-height: 1.75;
          color: var(--gray-light);
        }
        .priv-content h2 {
          font-family: var(--font-cond);
          font-size: 1.15rem;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--off-white);
          margin: 2rem 0 .6rem;
          padding-top: 1.2rem;
          border-top: 1px solid var(--border);
        }
        .priv-content p { margin-bottom: .8rem; font-size: .95rem; }
        .priv-content strong { color: var(--gold); font-weight: 600; }
        .priv-content ul {
          list-style: disc;
          padding-left: 1.4rem;
          margin-bottom: .8rem;
        }
        .priv-content li { margin-bottom: .3rem; font-size: .95rem; }
      `}</style>
      <main className="privacidade-page">
        <div className="priv-header">
          <h1>Política de Privacidade</h1>
          <p>Como tratamos seus dados — conforme a LGPD</p>
        </div>
        <div className="priv-content">
          <p>Esta Política de Privacidade descreve como o <strong>Podium Arena</strong> coleta, usa e protege suas informações pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).</p>

          <h2>1. Dados coletados</h2>
          <p>Coletamos: nome completo, e-mail, CPF, telefone, data de nascimento e gênero, fornecidos no cadastro, além de dados de uso da plataforma.</p>

          <h2>2. Finalidade</h2>
          <ul>
            <li>Gestão de reservas e eventos</li>
            <li>Comunicação sobre agendamentos</li>
            <li>Emissão de cobranças</li>
            <li>Melhoria dos serviços</li>
          </ul>

          <h2>3. Compartilhamento</h2>
          <p>Seus dados não são vendidos ou compartilhados com terceiros, exceto quando exigido por lei.</p>

          <h2>4. Seus direitos</h2>
          <p>Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pelo e-mail <strong>{settings.email}</strong>.</p>

          <h2>5. Segurança</h2>
          <p>Utilizamos criptografia e boas práticas de segurança para proteger suas informações.</p>

          <h2>6. Contato</h2>
          <p>Dúvidas sobre esta política: <strong>{settings.email}</strong></p>
        </div>
      </main>
      <Footer />
    </>
  );
}
