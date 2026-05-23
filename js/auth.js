/* ═══════════════════════════════════════════
   AUTH.JS — Login / Cadastro / Sessão
   ═══════════════════════════════════════════ */

// ─── Toast global seguro (fallback para páginas sem main.js) ──
if (typeof window.showToast !== 'function') {
  window.showToast = function(msg, type = 'success') {
    // Cria container se não existir
    let wrap = document.getElementById('_toast_wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = '_toast_wrap';
      wrap.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:.5rem;pointer-events:none';
      document.body.appendChild(wrap);
    }
    const colors = { success: '#22c55e', error: '#ef4444', warn: '#f59e0b' };
    const t = document.createElement('div');
    t.style.cssText = `display:flex;align-items:center;gap:.7rem;background:var(--card,#1a1a1a);border:1px solid var(--border,#333);color:#fff;font-family:var(--font-cond,"Barlow Condensed",sans-serif);font-size:.88rem;letter-spacing:1px;padding:.8rem 1.2rem;min-width:220px;max-width:320px;box-shadow:0 8px 24px rgba(0,0,0,.4);opacity:0;transform:translateX(12px);transition:opacity .3s,transform .3s;pointer-events:auto`;
    t.innerHTML = `<span style="width:7px;height:7px;border-radius:50%;background:${colors[type]||colors.success};flex-shrink:0"></span><span>${msg}</span>`;
    wrap.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateX(0)'; });
    setTimeout(() => {
      t.style.opacity = '0'; t.style.transform = 'translateX(12px)';
      setTimeout(() => t.remove(), 350);
    }, 3200);
  };
}

// ─── Gerenciamento de sessão ───────────────
const Auth = {
  STORAGE_KEY: "podium_user",

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY));
    } catch {
      return null;
    }
  },

  saveUser(user) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem(this.STORAGE_KEY);
    if (typeof updateNavUser === 'function') {
      try { updateNavUser(null); } catch(e) {}
    }
    if (typeof window.showToast === 'function') {
      showToast("Você saiu da sua conta.", "success");
    }
  },

  isLoggedIn() {
    return !!this.getUser();
  },
};

// ─── Modal de confirmação de logout ───────
function abrirModalLogoutNav() {
  let modal = document.getElementById("logoutModalNav");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "logoutModalNav";
    modal.className = "logout-modal-overlay";
    modal.innerHTML = `
      <div class="logout-modal">
        <div class="logout-modal-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" x2="9" y1="12" y2="12"/>
          </svg>
        </div>
        <h3 class="logout-modal-title">Sair da Conta?</h3>
        <p class="logout-modal-sub">Você será desconectado da sua conta Podium Arena.</p>
        <div class="logout-modal-actions">
          <button class="logout-modal-btn-keep" onclick="fecharModalLogoutNav()">Cancelar</button>
          <button class="logout-modal-btn-confirm" onclick="confirmarLogoutNav()">Sair</button>
        </div>
      </div>
    `;
    modal.addEventListener("click", (e) => {
      if (e.target === modal) fecharModalLogoutNav();
    });
    document.body.appendChild(modal);
  }
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function fecharModalLogoutNav() {
  const modal = document.getElementById("logoutModalNav");
  if (modal) modal.classList.remove("open");
  document.body.style.overflow = "";
}

function confirmarLogoutNav() {
  fecharModalLogoutNav();
  Auth.logout();
  const target = window.location.pathname.includes("/pages/")
    ? "../index.html"
    : "index.html";
  window.location.replace(target);
}

// ─── Atualizar nav com usuário ─────────────
function updateNavUser(user) {
  const navRight = document.querySelector(".nav-right");
  if (!navRight) return;

  const existing = document.getElementById("navUserBtn");
  if (existing) existing.remove();

  if (user) {
    const initials = (user.nome || user.email).substring(0, 2).toUpperCase();
    const wrap = document.createElement("div");
    wrap.id = "navUserBtn";
    wrap.className = "user-avatar-pill";
    const inPages = window.location.pathname.includes("/pages/");
    const base = inPages ? "" : "pages/";
    const icoHome = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
    const icoCal = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`;
    const icoTrophy = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
    const icoRanking = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/></svg>`;
    const icoUser = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    const icoLogout = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`;
    const firstName = (user.nome || user.email).split(" ")[0];
    wrap.innerHTML = `
      <div class="user-avatar-circle">${initials}</div>
      <span class="user-avatar-name">${firstName}</span>
      <svg class="user-avatar-chevron" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      <div class="user-dropdown">
        <div class="user-dropdown-header">
          <div class="user-dropdown-avatar">${initials}</div>
          <div>
            <div class="user-dropdown-name">${user.nome || user.email}</div>
            <div class="user-dropdown-email">${user.email}</div>
          </div>
        </div>
        <div class="divider"></div>
        ${user.admin ? `
          <a href="${base}admin.html">${icoHome} Meu Painel</a>
          <a href="${base}admin.html?aba=reservas">${icoCal} Reservas</a>
          <a href="${base}ranking.html">${icoRanking} Ranking</a>
          <a href="${base}admin.html?aba=usuarios">${icoUser} Gerenciamento</a>
        ` : `
          <a href="${base}painel.html">${icoHome} Meu Painel</a>
          <a href="${base}painel.html?aba=reservas">${icoCal} Minhas Reservas</a>
          <a href="${base}ranking.html">${icoRanking} Ranking</a>
          <div class="divider"></div>
          <a href="${base}painel.html?aba=perfil">${icoUser} Meu Perfil</a>
        `}
        <div class="divider"></div>
        <a href="#" onclick="event.preventDefault();abrirModalLogoutNav()" style="color:var(--red)">${icoLogout} Sair</a>
      </div>
    `;
    navRight.prepend(wrap);
  } else {
    const btn = document.createElement("button");
    btn.id = "navUserBtn";
    btn.className = "nav-login-btn";
    btn.title = "Entrar / Cadastrar";
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Login`;
    btn.addEventListener("click", openAuthModal);
    navRight.prepend(btn);
  }
}

// ─── Modal de auth ────────────────────────
function openAuthModal(defaultTab = "login") {
  const overlay = document.getElementById("authOverlay");
  if (!overlay) return;
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
  switchTab(defaultTab);
}

function closeAuthModal() {
  const overlay = document.getElementById("authOverlay");
  if (!overlay) return;
  overlay.classList.remove("open");
  document.body.style.overflow = "";
}

function switchTab(tab) {
  document
    .querySelectorAll(".auth-tab")
    .forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
  document
    .querySelectorAll(".auth-panel")
    .forEach((p) => p.classList.toggle("active", p.id === `panel-${tab}`));
}

// ─── Validação ────────────────────────────
function validateEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
function validateCPF(cpf) {
  return cpf.replace(/\D/g, "").length === 11;
}

function fieldError(id, msg) {
  const field = document.getElementById(id)?.closest(".field");
  if (!field) return;
  field.classList.add("error");
  const err = field.querySelector(".field-error");
  if (err) err.textContent = msg;
}
function clearErrors() {
  document
    .querySelectorAll(".field.error")
    .forEach((f) => f.classList.remove("error"));
}

// ─── Login ────────────────────────────────
function handleLogin(e) {
  e.preventDefault();
  clearErrors();
  const email = document.getElementById("loginEmail")?.value.trim();
  const senha = document.getElementById("loginSenha")?.value;
  let valid = true;

  if (!validateEmail(email)) {
    fieldError("loginEmail", "E-mail inválido");
    valid = false;
  }
  if (!senha || senha.length < 6) {
    fieldError("loginSenha", "Senha muito curta");
    valid = false;
  }
  if (!valid) return;

  const users = JSON.parse(localStorage.getItem("podium_users") || "[]");
  const user = users.find((u) => u.email === email && u.senha === btoa(senha));

  if (!user) {
    fieldError("loginEmail", "E-mail ou senha incorretos");
    return;
  }

  Auth.saveUser({
    email: user.email,
    nome: user.nome,
    id: user.id,
    admin: !!user.admin,
  });
  closeAuthModal();
  updateNavUser(Auth.getUser());
  showToast(`Bem-vindo de volta, ${user.nome.split(" ")[0]}!`);

  // Redireciona admin automaticamente após login
  if (user.admin) {
    setTimeout(() => {
      const inPages = window.location.pathname.includes("/pages/");
      window.location.href = inPages ? "admin.html" : "pages/admin.html";
    }, 800);
  }
}

// ─── Cadastro ─────────────────────────────
function handleCadastro(e) {
  e.preventDefault();
  clearErrors();

  const nome = document.getElementById("cadNome")?.value.trim();
  const email = document.getElementById("cadEmail")?.value.trim();
  const cpf = document.getElementById("cadCPF")?.value.trim();
  const nasc = document.getElementById("cadNasc")?.value;
  const tel = document.getElementById("cadTel")?.value.trim();
  const senha = document.getElementById("cadSenha")?.value;
  const conf = document.getElementById("cadConf")?.value;
  let valid = true;

  if (!nome || nome.length < 3) {
    fieldError("cadNome", "Nome muito curto");
    valid = false;
  }
  if (!validateEmail(email)) {
    fieldError("cadEmail", "E-mail inválido");
    valid = false;
  }
  if (!validateCPF(cpf)) {
    fieldError("cadCPF", "CPF inválido (11 dígitos)");
    valid = false;
  }
  if (!nasc) {
    fieldError("cadNasc", "Informe sua data de nascimento");
    valid = false;
  }
  if (!senha || senha.length < 8) {
    fieldError("cadSenha", "Mínimo 8 caracteres");
    valid = false;
  }
  if (senha !== conf) {
    fieldError("cadConf", "Senhas não conferem");
    valid = false;
  }
  if (!valid) return;

  const users = JSON.parse(localStorage.getItem("podium_users") || "[]");
  if (users.find((u) => u.email === email)) {
    fieldError("cadEmail", "E-mail já cadastrado");
    return;
  }

  const newUser = {
    id: Date.now().toString(),
    nome,
    email,
    cpf,
    nasc,
    tel,
    senha: btoa(senha),
    criadoEm: new Date().toISOString(),
    reservas: [],
    inscricoes: [],
  };
  users.push(newUser);
  localStorage.setItem("podium_users", JSON.stringify(users));

  Auth.saveUser({ email: newUser.email, nome: newUser.nome, id: newUser.id, admin: false });
  closeAuthModal();
  updateNavUser(Auth.getUser());
  showToast(`Cadastro realizado! Seja bem-vindo(a), ${nome.split(" ")[0]}!`);
}

// ─── Toggle senha visível ─────────────────
function togglePw(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
}

// ─── Inicialização ────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("authOverlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeAuthModal();
    });
  }

  updateNavUser(Auth.getUser());

  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  const loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  const cadForm = document.getElementById("cadForm");
  if (cadForm) cadForm.addEventListener("submit", handleCadastro);

  // Máscara CPF
  const cpfInput = document.getElementById("cadCPF");
  if (cpfInput) {
    cpfInput.addEventListener("input", function () {
      let v = this.value.replace(/\D/g, "");
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      this.value = v.substring(0, 14);
    });
  }

  // Máscara Telefone
  const telInput = document.getElementById("cadTel");
  if (telInput) {
    telInput.addEventListener("input", function () {
      let v = this.value.replace(/\D/g, "");
      v = v.replace(/(\d{2})(\d)/, "($1) $2");
      v = v.replace(/(\d{5})(\d{4})$/, "$1-$2");
      this.value = v.substring(0, 15);
    });
  }
});

// Exportar
window.Auth = Auth;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchTab = switchTab;
window.togglePw = togglePw;
window.updateNavUser = updateNavUser;
window.abrirModalLogoutNav  = abrirModalLogoutNav;
window.fecharModalLogoutNav = fecharModalLogoutNav;
window.confirmarLogoutNav   = confirmarLogoutNav;