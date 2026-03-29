/* ===================================
   P&G — UI Helpers
   Rendering utilities & shared UI
   =================================== */

import { store, CATEGORIES } from './store.js';

// === Greeting based on time ===
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return { text: 'Boa madrugada', emoji: '🌙' };
  if (hour < 12) return { text: 'Bom dia', emoji: '☀️' };
  if (hour < 18) return { text: 'Boa tarde', emoji: '🌤️' };
  return { text: 'Boa noite', emoji: '🌙' };
}

// === Category helpers ===
export function getCategoryInfo(categoryId) {
  return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[CATEGORIES.length - 1];
}

// === Progress Ring (SVG) ===
export function createProgressRing(percent, size = 48, strokeWidth = 4) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const gradientId = `grad_${Math.random().toString(36).slice(2, 7)}`;

  return `
    <div class="progress-ring-container" style="width:${size}px;height:${size}px">
      <svg class="progress-ring" width="${size}" height="${size}">
        <defs>
          <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#7c3aed" />
            <stop offset="100%" style="stop-color:#ec4899" />
          </linearGradient>
        </defs>
        <circle class="progress-ring-bg" cx="${size/2}" cy="${size/2}" r="${radius}" stroke-width="${strokeWidth}" />
        <circle class="progress-ring-fill" cx="${size/2}" cy="${size/2}" r="${radius}" stroke-width="${strokeWidth}"
          stroke="url(#${gradientId})"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
        />
      </svg>
      <span class="progress-ring-text" style="font-size:${size * 0.22}px">${percent}%</span>
    </div>
  `;
}

// === Toast notifications ===
let toastContainer = null;

export function showToast(message, icon = '✅', duration = 3000) {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// === Confetti Explosion ===
export function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: canvas.width / 2, y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15 - 5,
      size: Math.random() * 8 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360, rotSpeed: (Math.random() - 0.5) * 10,
      life: 1, decay: Math.random() * 0.015 + 0.01,
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      if (p.life <= 0) continue;
      alive = true;
      p.x += p.vx; p.y += p.vy; p.vy += 0.3;
      p.rotation += p.rotSpeed; p.life -= p.decay;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (alive) requestAnimationFrame(animate);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  animate();
}

// === Bottom Navigation ===
export function renderBottomNav() {
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.id = 'bottom-nav';

  const items = [
    { route: '/', icon: '🏠', label: 'Início' },
    { route: '/plans', icon: '📋', label: 'Planos' },
    { route: '/savings', icon: '💰', label: 'Poupança' },
    { route: '/progress', icon: '📊', label: 'Progresso' },
    { route: '/settings', icon: '⚙️', label: 'Config' },
  ];

  nav.innerHTML = items.map(item => `
    <a class="nav-item ${getCurrentRoute() === item.route ? 'active' : ''}" 
       data-route="${item.route}" href="#${item.route}" id="nav-${item.route.slice(1) || 'home'}">
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
    </a>
  `).join('');

  window.addEventListener('routechange', (e) => {
    const route = e.detail.route;
    nav.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route);
    });
  });

  return nav;
}

function getCurrentRoute() {
  const hash = window.location.hash.slice(1) || '/';
  return '/' + (hash.split('/').filter(Boolean)[0] || '');
}

// === Modal ===
export function showModal(title, contentHTML, options = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          <button class="btn btn-icon btn-ghost modal-close" id="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">${contentHTML}</div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    const close = (result) => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
      resolve(result);
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });
    overlay.querySelector('.modal-close')?.addEventListener('click', () => close(null));
    overlay._close = close;

    if (options.onMount) options.onMount(overlay, close);
  });
}

// === Format date ===
export function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));
}
