/* ═══════════════════════════════════════════
   MAIN.JS — Shared scripts across all pages
   ═══════════════════════════════════════════ */

// ── Preloader ──────────────────────────────
window.addEventListener('load', () => {
  setTimeout(() => {
    const pre = document.getElementById('preloader');
    if (pre) pre.classList.add('hidden');
  }, 1800);
});

// ── Nav scroll ────────────────────────────
const nav = document.getElementById('mainNav');
if (nav) {
  // If nav already starts scrolled (e.g. painel page), keep it always scrolled
  const alwaysScrolled = nav.classList.contains('scrolled');
  if (!alwaysScrolled) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    });
  }
}

// ── Mobile menu ───────────────────────────
function toggleMenu() {
  const menu = document.getElementById('mobileMenu');
  const toggle = document.getElementById('menuToggle');
  if (!menu || !toggle) return;
  const open = menu.classList.toggle('open');
  toggle.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}

// ── Reveal on scroll ──────────────────────
const reveals = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('vis');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
reveals.forEach(el => revealObserver.observe(el));

// ── Count up ──────────────────────────────
function countUp(el, target, suffix = '') {
  let start = 0;
  const dur = 1600;
  const step = dur / 60;
  const inc = target / 60;
  const timer = setInterval(() => {
    start += inc;
    if (start >= target) { start = target; clearInterval(timer); }
    el.textContent = Math.floor(start) + (suffix || '');
  }, step);
}
const numObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const el = e.target;
      const target = parseInt(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      if (!isNaN(target)) countUp(el, target, suffix);
      numObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('[data-target]').forEach(el => numObserver.observe(el));

// ── Smooth anchor links ────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href === '#') return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// ── Active nav link ───────────────────────
function setActiveNavLink() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === path.split('/').pop() || (path.endsWith('index.html') && a.getAttribute('href') === 'index.html'));
  });
}
setActiveNavLink();

// ── Toast ─────────────────────────────────
function showToast(msg, type = 'success') {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    toast.innerHTML = '<span class="toast-icon"></span><span class="toast-text"></span>';
    document.body.appendChild(toast);
  }
  toast.querySelector('.toast-icon').innerHTML = type === 'success' ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>`;
  toast.querySelector('.toast-text').textContent = msg;
  toast.className = `toast ${type}`;
  requestAnimationFrame(() => {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3200);
  });
}

// ── Logo injection (from base64 stored in localStorage or passed) ──
function injectLogo(src) {
  document.querySelectorAll('[data-logo]').forEach(el => {
    el.src = src;
  });
}

// Exportar globais
window.toggleMenu = toggleMenu;
window.showToast  = showToast;
window.injectLogo = injectLogo;

(function () {
  const grid = document.querySelector('.hero-grid');
  if (!grid) return;
  const base = [
    ['2px','.5','7s','0s','10%','-310px','16px'],
    ['1px','.3','9s','-2s','19%','-270px','-12px'],
    ['2px','.4','6.5s','-4s','29%','-340px','20px'],
    ['1px','.25','11s','-1s','39%','-295px','-8px'],
    ['2px','.55','8s','-5s','49%','-370px','14px'],
    ['1px','.35','7.5s','-3s','57%','-255px','-17px'],
    ['3px','.3','10s','-6s','66%','-330px','10px'],
    ['2px','.45','9.5s','-1.5s','75%','-285px','-15px'],
    ['1px','.35','7s','-7s','83%','-355px','21px'],
    ['2px','.25','12s','-2.5s','91%','-305px','-8px'],
  ];
  const r = (v, range) => (parseFloat(v) + (Math.random() * range * 2 - range));
  for (let i = 0; i < 48; i++) {
    const [sz, op, dur, del, lft, ry, rx] = base[i % base.length];
    const el = document.createElement('div');
    el.className = 'sand-particle';
    el.style.cssText = `--sz:${sz};--op:${op};--dur:${r(dur,1.5).toFixed(1)}s;--del:${r(del,5).toFixed(1)}s;--lft:${r(lft,5).toFixed(1)}%;--ry:${r(ry,55).toFixed(0)}px;--rx:${r(rx,10).toFixed(0)}px`;
    grid.appendChild(el);
  }
})();