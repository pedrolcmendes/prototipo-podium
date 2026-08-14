import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

const EyeIcon = ({ hidden }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {hidden && <path d="m3 3 18 18" />}
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3 5 6v5c0 4.7 2.8 8.2 7 10 4.2-1.8 7-5.3 7-10V6l-7-3Z" />
    <path d="m9.5 12 1.7 1.7 3.6-4" />
  </svg>
);

export default function RedefinirSenha() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrarNova, setMostrarNova] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [status, setStatus] = useState('form');
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);

  const tamanhoValido = novaSenha.length >= 6;
  const senhasIguais = Boolean(confirmar) && novaSenha === confirmar;

  useEffect(() => {
    if (status !== 'success') return undefined;
    const redirect = window.setTimeout(() => navigate('/', { replace: true }), 5000);
    return () => window.clearTimeout(redirect);
  }, [navigate, status]);

  const atualizarNovaSenha = (event) => {
    setNovaSenha(event.target.value);
    if (status === 'error') setStatus('form');
  };

  const atualizarConfirmacao = (event) => {
    setConfirmar(event.target.value);
    if (status === 'error') setStatus('form');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      setStatus('error');
      setMensagem('Este link de redefinição não é válido. Solicite um novo link.');
      return;
    }
    if (!tamanhoValido) {
      setStatus('error');
      setMensagem('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (!senhasIguais) {
      setStatus('error');
      setMensagem('As senhas não coincidem. Confira e tente novamente.');
      return;
    }

    setLoading(true);
    setStatus('form');
    try {
      await api.post('/auth/redefinir-senha', { token, novaSenha });
      setStatus('success');
      setMensagem('Sua senha foi alterada e já pode ser usada no acesso à arena.');
    } catch (error) {
      setStatus('error');
      setMensagem(error.response?.data?.message || 'Não foi possível redefinir a senha. Solicite um novo link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="reset-page">
      <section className="reset-shell" aria-labelledby="reset-title">
        <div className="reset-visual">
          <div className="reset-visual-shade" />
          <div className="reset-visual-grid" />
          <Link className="reset-brand" to="/" aria-label="Voltar para a página inicial da Podium Arena">
            <span className="reset-brand-mark"><img src="/img/logo.png" alt="" /></span>
            <span>PODIUM ARENA</span>
          </Link>

          <div className="reset-visual-copy">
            <span className="reset-kicker">SEGURANÇA DA CONTA</span>
            <h1>PROTEJA<br />SEU <em>JOGO.</em></h1>
            <p>Uma senha segura mantém seus dados, reservas e inscrições sempre protegidos.</p>
          </div>

          <div className="reset-visual-footer">
            <span>BEACH TENNIS</span><i /><span>FUTEVÔLEI</span><i /><span>PICKLEBALL</span>
          </div>
        </div>

        <div className="reset-panel">
          <Link className="reset-back" to="/">
            <span aria-hidden="true">←</span> Voltar para o início
          </Link>

          <div className="reset-form-wrap">
            {status === 'success' ? (
              <div className="reset-success" role="status" aria-live="polite">
                <span className="reset-success-icon"><ShieldIcon /></span>
                <p className="reset-eyebrow">TUDO CERTO</p>
                <h2 id="reset-title">SENHA ALTERADA!</h2>
                <p>{mensagem}</p>
                <button type="button" className="reset-submit" onClick={() => navigate('/', { replace: true })}>
                  IR PARA O LOGIN <span aria-hidden="true">→</span>
                </button>
                <small>Você será redirecionado automaticamente em alguns segundos.</small>
              </div>
            ) : (
              <>
                <div className="reset-heading">
                  <span className="reset-lock"><ShieldIcon /></span>
                  <p className="reset-eyebrow">REDEFINIÇÃO DE SENHA</p>
                  <h2 id="reset-title">CRIE UMA NOVA SENHA</h2>
                  <p>Escolha uma senha diferente da anterior para continuar acessando sua conta.</p>
                </div>

                <form className="reset-form" onSubmit={handleSubmit} noValidate>
                  <div className="reset-field">
                    <label htmlFor="new-password">Nova senha</label>
                    <div className="reset-input-wrap">
                      <input
                        id="new-password"
                        type={mostrarNova ? 'text' : 'password'}
                        value={novaSenha}
                        onChange={atualizarNovaSenha}
                        placeholder="Mínimo de 6 caracteres"
                        autoComplete="new-password"
                        autoFocus
                        disabled={loading}
                      />
                      <button type="button" onClick={() => setMostrarNova((value) => !value)} aria-label={mostrarNova ? 'Ocultar nova senha' : 'Mostrar nova senha'}>
                        <EyeIcon hidden={!mostrarNova} />
                      </button>
                    </div>
                  </div>

                  <div className="reset-field">
                    <label htmlFor="confirm-password">Confirme a nova senha</label>
                    <div className="reset-input-wrap">
                      <input
                        id="confirm-password"
                        type={mostrarConfirmacao ? 'text' : 'password'}
                        value={confirmar}
                        onChange={atualizarConfirmacao}
                        placeholder="Digite novamente"
                        autoComplete="new-password"
                        disabled={loading}
                      />
                      <button type="button" onClick={() => setMostrarConfirmacao((value) => !value)} aria-label={mostrarConfirmacao ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}>
                        <EyeIcon hidden={!mostrarConfirmacao} />
                      </button>
                    </div>
                  </div>

                  <div className="reset-rules" aria-label="Requisitos da senha">
                    <span className={tamanhoValido ? 'valid' : ''}><i>{tamanhoValido ? '✓' : ''}</i>Pelo menos 6 caracteres</span>
                    <span className={senhasIguais ? 'valid' : ''}><i>{senhasIguais ? '✓' : ''}</i>As duas senhas coincidem</span>
                  </div>

                  {status === 'error' && <div className="reset-alert" role="alert">{mensagem}</div>}

                  <button className="reset-submit" type="submit" disabled={loading}>
                    {loading ? <><span className="reset-spinner" /> SALVANDO...</> : <>REDEFINIR SENHA <span aria-hidden="true">→</span></>}
                  </button>
                </form>

                <p className="reset-help">O link expirou? Volte ao login e solicite uma nova redefinição.</p>
              </>
            )}
          </div>

          <p className="reset-copyright">© 2026 PODIUM ARENA · TELÊMACO BORBA</p>
        </div>
      </section>
    </main>
  );
}
