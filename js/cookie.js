/* ═══════════════════════════════════════════════════════
   COOKIE BANNER — Podium Arena
   LGPD · Lei 13.709/2018 | Marco Civil · Lei 12.965/2014
   Auto-injeta banner + modal de preferências + botão no footer
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const STORAGE_KEY  = 'podium_cookie_consent';
  const VERSION      = '1.0'; // bump para forçar novo consentimento

  /* ── Categorias de cookies ───────────────────────── */
  const CATEGORIES = {
    necessary: {
      key:         'necessary',
      label:       'Estritamente Necessários',
      description: 'Essenciais para o funcionamento básico do site: autenticação, sessão e segurança. Não podem ser desativados.',
      required:    true,
    },
    functional: {
      key:         'functional',
      label:       'Funcionais',
      description: 'Lembram preferências como idioma e configurações para personalizar sua experiência.',
      required:    false,
    },
    analytics: {
      key:         'analytics',
      label:       'Analíticos',
      description: 'Nos ajudam a entender como o site é usado para que possamos melhorá-lo continuamente.',
      required:    false,
    },
    marketing: {
      key:         'marketing',
      label:       'Marketing',
      description: 'Permitem exibir conteúdo relevante com base nos seus interesses dentro da arena.',
      required:    false,
    },
  };

  /* ── Ler / Gravar consentimento ─────────────────── */
  function getConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.version !== VERSION) return null; // versão mudou → pedir novamente
      return parsed;
    } catch { return null; }
  }

  function saveConsent(choices) {
    const payload = {
      version:  VERSION,
      date:     new Date().toISOString(),
      choices,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return payload;
  }

  /* ── API pública: verificar se categoria foi aceita ─ */
  window.CookieConsent = {
    has(category) {
      const c = getConsent();
      if (!c) return false;
      if (category === 'necessary') return true;
      return !!c.choices[category];
    },
    getAll() { return getConsent(); },
    reset()  { localStorage.removeItem(STORAGE_KEY); },
  };

  /* ── CSS dinâmico ────────────────────────────────── */
  function injectCSS() {
    if (document.getElementById('_cookie_css')) return;
    const style = document.createElement('style');
    style.id = '_cookie_css';
    style.textContent = `
/* ── Cookie Banner ── */
#_cookie_banner {
  position: fixed;
  bottom: 1.5rem; left: 50%;
  transform: translateX(-50%) translateY(120%);
  z-index: 10000;
  width: calc(100vw - 3rem);
  max-width: 780px;
  background: var(--card, #161616);
  border: 1px solid rgba(224,172,107,.25);
  box-shadow: 0 24px 60px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.04);
  padding: 1.4rem 1.6rem;
  display: flex;
  align-items: center;
  gap: 1.4rem;
  flex-wrap: wrap;
  transition: transform .55s cubic-bezier(0.16,1,0.3,1), opacity .4s ease;
  opacity: 0;
}
#_cookie_banner.visible {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}
#_cookie_banner.hiding {
  transform: translateX(-50%) translateY(130%);
  opacity: 0;
}
._cb-icon {
  width: 42px; height: 42px;
  background: rgba(224,172,107,.1);
  border: 1px solid rgba(224,172,107,.2);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  color: var(--gold, #E0AC6B);
}
._cb-body { flex: 1; min-width: 220px; }
._cb-title {
  font-family: var(--font-cond, 'Barlow Condensed', sans-serif);
  font-size: .88rem; font-weight: 700;
  letter-spacing: 2.5px; text-transform: uppercase;
  color: var(--white, #fff);
  margin-bottom: .3rem;
}
._cb-text {
  font-family: var(--font-body, 'Barlow', sans-serif);
  font-size: .8rem;
  color: var(--gray-light, #bcbcbc);
  line-height: 1.55;
}
._cb-text a {
  color: var(--gold, #E0AC6B);
  text-decoration: none;
}
._cb-text a:hover { opacity: .8; }
._cb-actions {
  display: flex; gap: .6rem; flex-shrink: 0; flex-wrap: wrap;
}
._cb-btn {
  font-family: var(--font-cond, 'Barlow Condensed', sans-serif);
  font-size: .78rem; font-weight: 700;
  letter-spacing: 2px; text-transform: uppercase;
  padding: .6rem 1.2rem;
  cursor: pointer;
  border: none;
  transition: all .2s;
  white-space: nowrap;
}
._cb-btn-all {
  background: linear-gradient(110deg, var(--gold-dark, #B8824A), var(--gold, #E0AC6B));
  color: var(--black, #080808);
}
._cb-btn-all:hover {
  box-shadow: 0 6px 20px rgba(224,172,107,.3);
  transform: translateY(-1px);
}
._cb-btn-nec {
  background: transparent;
  border: 1px solid var(--border, #242424) !important;
  color: var(--gray-light, #bcbcbc);
}
._cb-btn-nec:hover { border-color: rgba(224,172,107,.4) !important; color: var(--gold, #E0AC6B); }
._cb-btn-pref {
  background: transparent;
  border: 1px solid rgba(224,172,107,.25) !important;
  color: var(--gold, #E0AC6B);
}
._cb-btn-pref:hover { background: rgba(224,172,107,.08); }

/* ── Modal de Preferências ── */
#_cookie_modal_overlay {
  position: fixed; inset: 0; z-index: 10100;
  background: rgba(0,0,0,.88);
  backdrop-filter: blur(14px) saturate(.6);
  display: flex; align-items: center; justify-content: center;
  padding: 1.5rem;
  opacity: 0; visibility: hidden;
  transition: opacity .35s, visibility .35s;
}
#_cookie_modal_overlay.open { opacity: 1; visibility: visible; }
#_cookie_modal {
  background: var(--card, #161616);
  border: 1px solid var(--border, #242424);
  width: 100%; max-width: 560px;
  max-height: 90svh;
  display: flex; flex-direction: column;
  transform: translateY(20px) scale(.97);
  transition: transform .4s cubic-bezier(0.16,1,0.3,1);
  overflow: hidden;
}
#_cookie_modal_overlay.open #_cookie_modal { transform: none; }
._cm-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1.4rem 1.6rem;
  border-bottom: 1px solid var(--border, #242424);
  flex-shrink: 0;
}
._cm-header-left { display: flex; align-items: center; gap: .9rem; }
._cm-header-icon {
  width: 38px; height: 38px;
  background: rgba(224,172,107,.1);
  border: 1px solid rgba(224,172,107,.2);
  display: flex; align-items: center; justify-content: center;
  color: var(--gold, #E0AC6B);
  flex-shrink: 0;
}
._cm-title {
  font-family: var(--font-display, 'Bebas Neue', sans-serif);
  font-size: 1.3rem; letter-spacing: 2px;
  color: var(--white, #fff);
}
._cm-close {
  width: 32px; height: 32px;
  background: rgba(255,255,255,.05);
  border: 1px solid var(--border, #242424);
  color: var(--gray, #808080);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .2s;
  flex-shrink: 0;
}
._cm-close:hover { border-color: rgba(224,172,107,.3); color: var(--gold, #E0AC6B); }
._cm-body {
  padding: 1.4rem 1.6rem;
  overflow-y: auto;
  flex: 1;
  display: flex; flex-direction: column; gap: 1rem;
}
._cm-body::-webkit-scrollbar { width: 4px; }
._cm-body::-webkit-scrollbar-track { background: transparent; }
._cm-body::-webkit-scrollbar-thumb { background: var(--border, #242424); }
._cm-intro {
  font-family: var(--font-body, 'Barlow', sans-serif);
  font-size: .84rem;
  color: var(--gray-light, #bcbcbc);
  line-height: 1.65;
  padding-bottom: .8rem;
  border-bottom: 1px solid var(--border, #242424);
}
._cm-intro a { color: var(--gold, #E0AC6B); text-decoration: none; }

/* item de categoria */
._cm-cat {
  border: 1px solid var(--border, #242424);
  transition: border-color .2s;
}
._cm-cat:hover { border-color: rgba(224,172,107,.15); }
._cm-cat-header {
  display: flex; align-items: center;
  padding: .9rem 1rem;
  gap: .9rem;
  cursor: pointer;
  user-select: none;
}
._cm-cat-icon {
  width: 32px; height: 32px;
  background: rgba(255,255,255,.04);
  border: 1px solid var(--border, #242424);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  color: var(--gold, #E0AC6B);
}
._cm-cat-info { flex: 1; min-width: 0; }
._cm-cat-name {
  font-family: var(--font-cond, 'Barlow Condensed', sans-serif);
  font-size: .82rem; font-weight: 700;
  letter-spacing: 2px; text-transform: uppercase;
  color: var(--white, #fff);
  margin-bottom: .1rem;
  display: flex; align-items: center; gap: .5rem;
}
._cm-required-badge {
  font-size: .6rem; letter-spacing: 1.5px;
  padding: .15rem .5rem;
  background: rgba(224,172,107,.1);
  border: 1px solid rgba(224,172,107,.2);
  color: var(--gold, #E0AC6B);
  border-radius: 0;
}
._cm-cat-desc-short {
  font-size: .77rem;
  color: var(--gray, #808080);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
._cm-cat.expanded ._cm-cat-desc-short { display: none; }
._cm-cat-desc-full {
  display: none;
  font-size: .82rem;
  color: var(--gray-light, #bcbcbc);
  line-height: 1.65;
  padding: 0 1rem .9rem 3.1rem;
}
._cm-cat.expanded ._cm-cat-desc-full { display: block; }
._cm-chevron {
  color: var(--gray, #808080);
  transition: transform .25s;
  flex-shrink: 0;
}
._cm-cat.expanded ._cm-chevron { transform: rotate(180deg); }

/* toggle switch */
._cm-toggle {
  position: relative;
  width: 40px; height: 22px;
  flex-shrink: 0;
}
._cm-toggle input {
  opacity: 0; width: 0; height: 0; position: absolute;
}
._cm-toggle-track {
  position: absolute; inset: 0;
  background: var(--border, #242424);
  border: 1px solid rgba(255,255,255,.08);
  cursor: pointer;
  transition: background .25s, border-color .25s;
  border-radius: 2px;
}
._cm-toggle input:checked + ._cm-toggle-track {
  background: rgba(224,172,107,.2);
  border-color: var(--gold, #E0AC6B);
}
._cm-toggle-track::after {
  content: '';
  position: absolute;
  top: 2px; left: 2px;
  width: 16px; height: 16px;
  background: var(--gray, #808080);
  transition: transform .25s, background .25s;
}
._cm-toggle input:checked + ._cm-toggle-track::after {
  transform: translateX(18px);
  background: var(--gold, #E0AC6B);
}
._cm-toggle input:disabled + ._cm-toggle-track { cursor: not-allowed; opacity: .55; }

/* footer do modal */
._cm-footer {
  display: flex; align-items: center; justify-content: space-between;
  gap: .8rem; flex-wrap: wrap;
  padding: 1.1rem 1.6rem;
  border-top: 1px solid var(--border, #242424);
  flex-shrink: 0;
}
._cm-footer-left {
  font-family: var(--font-cond, 'Barlow Condensed', sans-serif);
  font-size: .72rem; letter-spacing: 1.5px;
  color: var(--gray, #808080);
}
._cm-footer-right { display: flex; gap: .6rem; }
._cm-btn-save {
  font-family: var(--font-cond, 'Barlow Condensed', sans-serif);
  font-size: .8rem; font-weight: 700;
  letter-spacing: 2px; text-transform: uppercase;
  background: linear-gradient(110deg, var(--gold-dark, #B8824A), var(--gold, #E0AC6B));
  color: var(--black, #080808);
  border: none; padding: .65rem 1.4rem;
  cursor: pointer;
  transition: all .2s;
}
._cm-btn-save:hover {
  box-shadow: 0 6px 20px rgba(224,172,107,.25);
  transform: translateY(-1px);
}
._cm-btn-cancel {
  font-family: var(--font-cond, 'Barlow Condensed', sans-serif);
  font-size: .8rem; font-weight: 700;
  letter-spacing: 2px; text-transform: uppercase;
  background: transparent;
  border: 1px solid var(--border, #242424);
  color: var(--gray-light, #bcbcbc);
  padding: .65rem 1.2rem;
  cursor: pointer;
  transition: all .2s;
}
._cm-btn-cancel:hover { border-color: rgba(224,172,107,.3); color: var(--gold, #E0AC6B); }

/* ── Botão flutuante no footer ── */
#_cookie_settings_btn {
  display: inline-flex; align-items: center; gap: .45rem;
  font-family: var(--font-cond, 'Barlow Condensed', sans-serif);
  font-size: .72rem; font-weight: 700;
  letter-spacing: 2px; text-transform: uppercase;
  color: var(--gray, #808080);
  background: none; border: none; cursor: pointer;
  padding: 0;
  transition: color .2s;
}
#_cookie_settings_btn:hover { color: var(--gold, #E0AC6B); }
#_cookie_settings_btn svg { flex-shrink: 0; }

/* ── Responsivo ── */
@media (max-width: 600px) {
  #_cookie_banner {
    bottom: 0; left: 0;
    transform: translateY(120%);
    width: 100%; max-width: 100%;
    border-radius: 0;
    border-left: none; border-right: none; border-bottom: none;
  }
  #_cookie_banner.visible { transform: translateY(0); }
  #_cookie_banner.hiding { transform: translateY(120%); }
  ._cb-icon { display: none; }
  ._cb-actions { width: 100%; }
  ._cb-btn { flex: 1; text-align: center; }
  #_cookie_modal { max-height: 96svh; }
}
    `;
    document.head.appendChild(style);
  }

  /* ── Ícones SVG reutilizáveis ────────────────────── */
  const ICONS = {
    cookie:  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/></svg>`,
    shield:  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    chart:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    star:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    target:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    settings:`<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
    chevron: `<svg class="_cm-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  };

  const CAT_ICONS = {
    necessary: ICONS.shield,
    functional: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>`,
    analytics: ICONS.chart,
    marketing: ICONS.target,
  };

  /* ── Banner ──────────────────────────────────────── */
  function showBanner() {
    if (document.getElementById('_cookie_banner')) return;

    const inPages = window.location.pathname.includes('/pages/');
    const privLink = inPages ? 'privacidade.html' : 'pages/privacidade.html';

    const banner = document.createElement('div');
    banner.id = '_cookie_banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Aviso de cookies');
    banner.innerHTML = `
      <div class="_cb-icon">${ICONS.cookie}</div>
      <div class="_cb-body">
        <p class="_cb-title">Cookies & Privacidade</p>
        <p class="_cb-text">
          Usamos cookies para melhorar sua experiência, analisar o desempenho e personalizar conteúdo.
          Ao clicar em <strong>"Aceitar Todos"</strong>, você concorda com o uso de todos os cookies.
          Veja nossa <a href="${privLink}">Política de Privacidade</a>.
        </p>
      </div>
      <div class="_cb-actions">
        <button class="_cb-btn _cb-btn-pref" id="_cb_pref">Preferências</button>
        <button class="_cb-btn _cb-btn-nec"  id="_cb_nec">Só Necessários</button>
        <button class="_cb-btn _cb-btn-all"  id="_cb_all">Aceitar Todos</button>
      </div>
    `;
    document.body.appendChild(banner);

    // animar entrada
    requestAnimationFrame(() => {
      requestAnimationFrame(() => banner.classList.add('visible'));
    });

    function hideBanner(cb) {
      banner.classList.add('hiding');
      setTimeout(() => { banner.remove(); cb && cb(); }, 500);
    }

    document.getElementById('_cb_all').addEventListener('click', () => {
      hideBanner(() => {
        const choices = {};
        Object.keys(CATEGORIES).forEach(k => choices[k] = true);
        saveConsent(choices);
        showToastCookie('Todos os cookies aceitos.', 'success');
      });
    });

    document.getElementById('_cb_nec').addEventListener('click', () => {
      hideBanner(() => {
        const choices = {};
        Object.keys(CATEGORIES).forEach(k => choices[k] = CATEGORIES[k].required);
        saveConsent(choices);
        showToastCookie('Apenas cookies essenciais ativados.', 'warn');
      });
    });

    document.getElementById('_cb_pref').addEventListener('click', () => {
      hideBanner(() => openModal());
    });
  }

  /* ── Modal de preferências ───────────────────────── */
  let _currentChoices = {};

  function buildModal() {
    if (document.getElementById('_cookie_modal_overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = '_cookie_modal_overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Preferências de cookies');

    const inPages = window.location.pathname.includes('/pages/');
    const privLink = inPages ? 'privacidade.html' : 'pages/privacidade.html';

    const catsHTML = Object.values(CATEGORIES).map(cat => `
      <div class="_cm-cat" data-cat="${cat.key}">
        <div class="_cm-cat-header">
          <div class="_cm-cat-icon">${CAT_ICONS[cat.key] || ICONS.cookie}</div>
          <div class="_cm-cat-info">
            <div class="_cm-cat-name">
              ${cat.label}
              ${cat.required ? '<span class="_cm-required-badge">Obrigatório</span>' : ''}
            </div>
            <div class="_cm-cat-desc-short">${cat.description}</div>
          </div>
          ${ICONS.chevron}
          <label class="_cm-toggle" onclick="event.stopPropagation()" title="${cat.required ? 'Obrigatório' : 'Ativar/desativar'}">
            <input type="checkbox" data-cat="${cat.key}" ${cat.required ? 'checked disabled' : ''}>
            <span class="_cm-toggle-track"></span>
          </label>
        </div>
        <div class="_cm-cat-desc-full">${cat.description}</div>
      </div>
    `).join('');

    overlay.innerHTML = `
      <div id="_cookie_modal">
        <div class="_cm-header">
          <div class="_cm-header-left">
            <div class="_cm-header-icon">${ICONS.cookie}</div>
            <span class="_cm-title">PREFERÊNCIAS DE COOKIES</span>
          </div>
          <button class="_cm-close" id="_cm_close_btn" aria-label="Fechar">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="_cm-body">
          <p class="_cm-intro">
            Utilizamos cookies para melhorar sua experiência na Podium Arena. Gerencie suas preferências abaixo.
            Os cookies essenciais são necessários para o funcionamento básico e não podem ser desativados.
            Saiba mais em nossa <a href="${privLink}">Política de Privacidade</a>.
          </p>
          ${catsHTML}
        </div>
        <div class="_cm-footer">
          <span class="_cm-footer-left">LGPD · Lei 13.709/2018</span>
          <div class="_cm-footer-right">
            <button class="_cm-btn-cancel" id="_cm_cancel_btn">Cancelar</button>
            <button class="_cm-btn-save"   id="_cm_save_btn">Salvar Preferências</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // expandir/colapsar ao clicar no header
    overlay.querySelectorAll('._cm-cat-header').forEach(header => {
      header.addEventListener('click', () => {
        header.closest('._cm-cat').classList.toggle('expanded');
      });
    });

    // fechar
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.getElementById('_cm_close_btn').addEventListener('click', closeModal);
    document.getElementById('_cm_cancel_btn').addEventListener('click', closeModal);

    // salvar
    document.getElementById('_cm_save_btn').addEventListener('click', () => {
      const choices = {};
      overlay.querySelectorAll('input[data-cat]').forEach(input => {
        choices[input.dataset.cat] = input.checked;
      });
      saveConsent(choices);
      closeModal();
      showToastCookie('Preferências de cookies salvas.', 'success');
    });
  }

  function openModal(restoreBanner) {
    buildModal();
    const consent = getConsent();
    const overlay = document.getElementById('_cookie_modal_overlay');
    if (!overlay) return;

    // preencher toggles com estado atual
    overlay.querySelectorAll('input[data-cat]').forEach(input => {
      const cat = input.dataset.cat;
      if (CATEGORIES[cat].required) { input.checked = true; return; }
      input.checked = consent ? !!consent.choices[cat] : false;
    });

    requestAnimationFrame(() => overlay.classList.add('open'));
    document.body.style.overflow = 'hidden';
    _currentChoices = consent ? { ...consent.choices } : {};
  }

  function closeModal() {
    const overlay = document.getElementById('_cookie_modal_overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    // se ainda não tem consentimento, mostra o banner novamente
    setTimeout(() => {
      if (!getConsent()) showBanner();
    }, 400);
  }

  /* ── Botão de configurações no footer ────────────── */
  function injectFooterButton() {
    const footerBottom = document.querySelector('.footer-bottom');
    if (!footerBottom || document.getElementById('_cookie_settings_btn')) return;

    const btn = document.createElement('button');
    btn.id = '_cookie_settings_btn';
    btn.title = 'Gerenciar preferências de cookies';
    btn.innerHTML = `${ICONS.settings} Cookies`;
    btn.addEventListener('click', () => openModal());

    // inserir antes do logo no footer-bottom
    const logoEl = footerBottom.querySelector('.footer-logo-small');
    if (logoEl) {
      footerBottom.insertBefore(btn, logoEl);
    } else {
      footerBottom.appendChild(btn);
    }
  }

  /* ── Toast ───────────────────────────────────────── */
  function showToastCookie(msg, type = 'success') {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
      return;
    }
    // fallback próprio
    let wrap = document.getElementById('_toast_wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = '_toast_wrap';
      wrap.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:.5rem;pointer-events:none';
      document.body.appendChild(wrap);
    }
    const colors = { success: '#E0AC6B', error: '#ef4444', warn: '#f59e0b' };
    const t = document.createElement('div');
    t.style.cssText = `display:flex;align-items:center;gap:.7rem;background:var(--card,#161616);border:1px solid rgba(224,172,107,.25);color:#fff;font-family:var(--font-cond,'Barlow Condensed',sans-serif);font-size:.85rem;letter-spacing:1px;padding:.85rem 1.3rem;min-width:220px;max-width:320px;box-shadow:0 12px 40px rgba(0,0,0,.5);opacity:0;transform:translateX(12px);transition:opacity .3s,transform .3s;pointer-events:auto`;
    t.innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background:${colors[type]||colors.success};flex-shrink:0;box-shadow:0 0 6px ${colors[type]||colors.success}"></span><span>${msg}</span>`;
    wrap.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'none'; });
    setTimeout(() => {
      t.style.opacity = '0'; t.style.transform = 'translateX(12px)';
      setTimeout(() => t.remove(), 350);
    }, 3000);
  }

  /* ── Init ────────────────────────────────────────── */
  function init() {
    injectCSS();
    injectFooterButton();
    if (!getConsent()) {
      // delay para não sobrecarregar o carregamento inicial
      setTimeout(showBanner, 1200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── Exportar abertura do modal ──────────────────── */
  window.openCookiePreferences = openModal;

})();
