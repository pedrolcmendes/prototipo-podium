import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

function formatCPF(v) {
  return v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').slice(0, 14);
}

function formatTel(v) {
  const n = v.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) return `(${n}`;
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

const EyeSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const VISUAL_IMGS = {
  login:    '/img/arena-login.jpeg',
  cadastro: '/img/arena-cadastro.jpeg',
};

export default function AuthModal({ initialTab = 'login', onClose }) {
  const { login, register, loginWithGoogle } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [visualImg, setVisualImg] = useState(VISUAL_IMGS[initialTab] ?? VISUAL_IMGS.login);
  const [visualOpacity, setVisualOpacity] = useState(1);

  const switchTab = (next) => {
    if (next === tab) return;
    setVisualOpacity(0);
    setTimeout(() => {
      setVisualImg(VISUAL_IMGS[next]);
      setVisualOpacity(1);
      setTab(next);
    }, 300);
  };

  const [loginData, setLoginData] = useState({ email: '', senha: '' });
  const [loginErr, setLoginErr] = useState({});
  const [showLoginPw, setShowLoginPw] = useState(false);

  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true);
    try {
      await loginWithGoogle(tokenResponse.access_token);
      toast('Login com Google realizado!', 'success');
      onClose();
    } catch (ex) {
      toast(ex.response?.data?.message || 'Erro ao entrar com Google', 'error');
    } finally { setLoading(false); }
  };

  const triggerGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => toast('Erro ao conectar com Google', 'error'),
  });

  const [cadData, setCadData] = useState({ nome: '', genero: '', email: '', tel: '', cpf: '', nasc: '', senha: '', conf: '' });
  const [cadErr, setCadErr] = useState({});
  const [showCadPw, setShowCadPw] = useState(false);
  const [showConfPw, setShowConfPw] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const err = {};
    if (!loginData.email || !/\S+@\S+\.\S+/.test(loginData.email)) err.email = 'E-mail inválido';
    if (!loginData.senha) err.senha = 'Informe a senha';
    if (Object.keys(err).length) { setLoginErr(err); return; }
    setLoginErr({});
    setLoading(true);
    try {
      await login(loginData.email, loginData.senha);
      toast('Login realizado!', 'success');
      onClose();
    } catch (ex) {
      setLoginErr({ senha: ex.response?.data?.message || 'E-mail ou senha incorretos' });
    } finally { setLoading(false); }
  };

  const handleCadSubmit = async (e) => {
    e.preventDefault();
    const err = {};
    if (!cadData.nome || cadData.nome.trim().length < 3) err.nome = 'Nome muito curto';
    if (!cadData.email || !/\S+@\S+\.\S+/.test(cadData.email)) err.email = 'E-mail inválido';
    if (!cadData.tel || cadData.tel.replace(/\D/g, '').length < 10) err.tel = 'Telefone inválido';
    if (!cadData.cpf || cadData.cpf.replace(/\D/g, '').length !== 11) err.cpf = 'CPF inválido (11 dígitos)';
    if (!cadData.nasc) err.nasc = 'Informe a data';
    if (!cadData.senha || cadData.senha.length < 6) err.senha = 'Mínimo 6 caracteres';
    if (cadData.senha !== cadData.conf) err.conf = 'Senhas não conferem';
    if (Object.keys(err).length) { setCadErr(err); return; }
    setCadErr({});
    setLoading(true);
    try {
      await register({
        nome: cadData.nome.trim(),
        email: cadData.email,
        cpf: cadData.cpf.replace(/\D/g, ''),
        nasc: cadData.nasc,
        tel: cadData.tel,
        genero: cadData.genero,
        senha: cadData.senha,
      });
      toast('Cadastro realizado!', 'success');
      onClose();
    } catch (ex) {
      setCadErr({ email: ex.response?.data?.message || 'Erro ao cadastrar' });
    } finally { setLoading(false); }
  };

  const tabIdx = tab === 'login' ? 0 : 1;

  return (
    <div className="modal-overlay open" id="authOverlay">
      <div className="auth-modal">

        {/* ESQUERDA — Visual */}
        <div className="auth-visual" style={{ '--auth-visual-img': `url('${visualImg}')`, opacity: visualOpacity }}>
          <svg className="visual-arcs" viewBox="0 0 400 600" preserveAspectRatio="none">
            <circle cx="200" cy="-80" r="260" strokeWidth="1" />
            <circle cx="200" cy="-80" r="340" strokeWidth=".5" />
            <circle cx="380" cy="700" r="300" strokeWidth=".7" />
          </svg>
          <div className="visual-glow-bl" />

          <div className="visual-brand">
            <div className="visual-logo-row">
              <div className="visual-logo-badge">
                <img src="/img/logo.png" alt="Podium Arena" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <span className="visual-arena-name">PODIUM ARENA</span>
            </div>
            <div className="visual-headline">
              SUA <em>VITÓRIA</em><br />COMEÇA<br />AQUI
            </div>
            <div className="visual-tags">
              <span className="visual-tag">Beach Tennis</span>
              <span className="visual-tag">Futevôlei</span>
              <span className="visual-tag">Pickleball</span>
              <span className="visual-tag">Academia</span>
              <span className="visual-tag">Taekwondo</span>
            </div>
          </div>
        </div>

        {/* DIREITA — Formulários */}
        <div className="auth-form-panel">

          {/* Abas + fechar */}
          <div className="auth-tabs">
            <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => switchTab('login')}>Entrar</button>
            <button className={`auth-tab${tab === 'cadastro' ? ' active' : ''}`} onClick={() => switchTab('cadastro')}>Cadastrar</button>
            <button className="auth-close" onClick={onClose} aria-label="Fechar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Slider de painéis */}
          <div className="auth-panels-track">
            <div className="auth-panels-inner" style={{ transform: `translateX(-${tabIdx * 100}%)` }}>

              {/* LOGIN */}
              <div className="auth-panel" id="panel-login">
                <div className="panel-heading">
                  <h2>ACESSO</h2>
                  <p>Bem-vindo de volta à arena</p>
                </div>

                <form noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }} onSubmit={handleLoginSubmit}>
                  <div className={`field${loginErr.email ? ' error' : ''}`} id="field-loginEmail">
                    <label>E-mail</label>
                    <input type="email" placeholder="seu@email.com" autoComplete="email"
                      value={loginData.email} onChange={e => setLoginData({ ...loginData, email: e.target.value })} />
                    <span className="field-error">{loginErr.email || 'E-mail inválido'}</span>
                  </div>

                  <div className={`field${loginErr.senha ? ' error' : ''}`} id="field-loginSenha">
                    <label>Senha</label>
                    <div className="field-pw">
                      <input type={showLoginPw ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password"
                        value={loginData.senha} onChange={e => setLoginData({ ...loginData, senha: e.target.value })} />
                      <button type="button" className="toggle-pw" aria-label="Mostrar senha" onClick={() => setShowLoginPw(!showLoginPw)}><EyeSvg /></button>
                    </div>
                    <span className="field-error">{loginErr.senha || 'Senha incorreta'}</span>
                  </div>

                  <div className="login-extras">
                    <label className="remember-label">
                      <input type="checkbox" /> Lembrar acesso
                    </label>
                    <a href="#" className="forgot-link" onClick={e => e.preventDefault()}>Esqueci a senha</a>
                  </div>

                  <button type="submit" className="btn-auth" disabled={loading}>{loading ? 'Entrando…' : 'Entrar na Arena'}</button>
                </form>

                <div className="auth-divider">ou</div>

                <button className="btn-google" disabled={loading} onClick={() => triggerGoogle()}>
                  <GoogleIcon />
                  Continuar com Google
                </button>

                <p className="auth-terms">
                  Ao entrar, você aceita os <a href="#">Termos de Uso</a> e a{' '}
                  <a href="#">Política de Privacidade</a> da Podium Arena.
                </p>
              </div>

              {/* CADASTRO */}
              <div className="auth-panel" id="panel-cadastro">
                <div className="panel-heading">
                  <h2>CADASTRO</h2>
                  <p>Junte-se à arena — é gratuito</p>
                </div>

                <form noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }} onSubmit={handleCadSubmit}>
                  <div className={`field${cadErr.nome ? ' error' : ''}`} id="field-cadNome">
                    <label>Nome Completo</label>
                    <input type="text" placeholder="João da Silva" autoComplete="name"
                      value={cadData.nome} onChange={e => setCadData({ ...cadData, nome: e.target.value })} />
                    <span className="field-error">{cadErr.nome || 'Nome muito curto'}</span>
                  </div>

                  <div className="field">
                    <label>Gênero</label>
                    <div style={{ display: 'flex', gap: '.4rem', marginTop: '.1rem' }}>
                      {[
                        { val: 'masculino',    label: 'Masculino', icon: '♂' },
                        { val: 'feminino',     label: 'Feminino',  icon: '♀' },
                        { val: 'nao_informar', label: 'Não dizer', icon: null },
                      ].map(({ val, label, icon }) => {
                        const active = cadData.genero === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setCadData({ ...cadData, genero: val })}
                            style={{
                              flex: '1',
                              minWidth: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.3rem',
                              padding: '.52rem .3rem',
                              background: active ? 'rgba(197,160,40,.12)' : 'rgba(255,255,255,.03)',
                              border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                              borderRadius: 8,
                              color: active ? 'var(--gold)' : 'var(--gray)',
                              fontFamily: 'var(--font-cond)',
                              fontSize: '.72rem',
                              letterSpacing: '1px',
                              cursor: 'pointer',
                              transition: 'all .18s',
                            }}
                          >
                            {icon && <span style={{ fontSize: '.85rem', lineHeight: 1 }}>{icon}</span>}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="field-row">
                    <div className={`field${cadErr.email ? ' error' : ''}`} id="field-cadEmail">
                      <label>E-mail</label>
                      <input type="email" placeholder="seu@email.com"
                        value={cadData.email} onChange={e => setCadData({ ...cadData, email: e.target.value })} />
                      <span className="field-error">{cadErr.email || 'E-mail inválido'}</span>
                    </div>
                    <div className={`field${cadErr.tel ? ' error' : ''}`} id="field-cadTel">
                      <label>Telefone</label>
                      <input type="tel" placeholder="(43) 9 9000-0000"
                        value={cadData.tel} onChange={e => setCadData({ ...cadData, tel: formatTel(e.target.value) })} />
                      <span className="field-error">{cadErr.tel || 'Telefone inválido'}</span>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className={`field${cadErr.cpf ? ' error' : ''}`} id="field-cadCPF">
                      <label>CPF</label>
                      <input type="text" placeholder="000.000.000-00" maxLength={14}
                        value={cadData.cpf} onChange={e => setCadData({ ...cadData, cpf: formatCPF(e.target.value) })} />
                      <span className="field-error">{cadErr.cpf || 'CPF inválido (11 dígitos)'}</span>
                    </div>
                    <div className={`field${cadErr.nasc ? ' error' : ''}`} id="field-cadNasc">
                      <label>Nascimento</label>
                      <input type="date" value={cadData.nasc} onChange={e => setCadData({ ...cadData, nasc: e.target.value })} />
                      <span className="field-error">{cadErr.nasc || 'Informe a data'}</span>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className={`field${cadErr.senha ? ' error' : ''}`} id="field-cadSenha">
                      <label>Senha</label>
                      <div className="field-pw">
                        <input type={showCadPw ? 'text' : 'password'} placeholder="Mín. 6"
                          value={cadData.senha} onChange={e => setCadData({ ...cadData, senha: e.target.value })} />
                        <button type="button" className="toggle-pw" aria-label="Mostrar senha" onClick={() => setShowCadPw(!showCadPw)}><EyeSvg /></button>
                      </div>
                      <span className="field-error">{cadErr.senha || 'Mínimo 6 caracteres'}</span>
                    </div>
                    <div className={`field${cadErr.conf ? ' error' : ''}`} id="field-cadConf">
                      <label>Confirmar</label>
                      <div className="field-pw">
                        <input type={showConfPw ? 'text' : 'password'} placeholder="Repetir senha"
                          value={cadData.conf} onChange={e => setCadData({ ...cadData, conf: e.target.value })} />
                        <button type="button" className="toggle-pw" aria-label="Mostrar senha" onClick={() => setShowConfPw(!showConfPw)}><EyeSvg /></button>
                      </div>
                      <span className="field-error">{cadErr.conf || 'Senhas não conferem'}</span>
                    </div>
                  </div>

                  <button type="submit" className="btn-auth" disabled={loading}>{loading ? 'Cadastrando…' : 'Criar Conta Grátis'}</button>
                </form>

                <div className="auth-divider">ou</div>

                <button className="btn-google" disabled={loading} onClick={() => triggerGoogle()}>
                  <GoogleIcon />
                  Cadastrar com Google
                </button>

                <p className="auth-terms">
                  Ao cadastrar, você aceita os <a href="#">Termos de Uso</a> e a{' '}
                  <a href="#">Política de Privacidade</a>.
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
