/* ===================================
   P&G — Settings Component
   =================================== */

import { store } from '../store.js';
import { showToast, showModal } from '../ui.js';
import { router } from '../router.js';

// Inline logo for About section
const ABOUT_LOGO = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" width="48" height="48" style="margin:0 auto">
  <defs>
    <linearGradient id="bg-about" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2c3e6b"/>
      <stop offset="100%" stop-color="#1e2d52"/>
    </linearGradient>
    <linearGradient id="cross-about" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c49a55"/>
      <stop offset="100%" stop-color="#dab978"/>
    </linearGradient>
  </defs>
  <circle cx="256" cy="256" r="240" fill="url(#bg-about)"/>
  <rect x="240" y="100" width="32" height="280" rx="6" fill="url(#cross-about)"/>
  <rect x="176" y="172" width="160" height="28" rx="6" fill="url(#cross-about)"/>
  <ellipse cx="216" cy="350" rx="48" ry="32" fill="none" stroke="#c49a55" stroke-width="3.5" opacity="0.7" transform="rotate(-12, 216, 350)"/>
  <ellipse cx="296" cy="350" rx="48" ry="32" fill="none" stroke="#dab978" stroke-width="3.5" opacity="0.6" transform="rotate(12, 296, 350)"/>
</svg>`;

export function renderSettings() {
  const user = store.getUser();
  const partner = store.getPartner();
  if (!user) return '';

  const isDark = (store.state.theme || 'dark') !== 'light';

  const div = document.createElement('div');
  div.className = 'page-container';

  div.innerHTML = `
    <div class="page-header">
      <h1 class="page-header-title">⚙️ Configurações</h1>
    </div>

    <!-- Profile Card -->
    <div class="card" style="margin-bottom:var(--space-lg);text-align:center">
      <div class="avatar-pair" style="justify-content:center;margin-bottom:var(--space-base)">
        <div class="avatar avatar-xl" style="overflow:hidden;padding:0">
          <img src="${user.avatar}" alt="${user.name}" style="width:100%;height:100%;object-fit:cover" onerror="this.outerHTML='${user.name[0]}'" />
        </div>
        <div class="avatar avatar-xl" style="background:var(--gradient-warm);overflow:hidden;padding:0;margin-left:-12px;border:3px solid var(--bg-primary)">
          <img src="${partner.avatar}" alt="${partner.name}" style="width:100%;height:100%;object-fit:cover" onerror="this.outerHTML='${partner.name[0]}'" />
        </div>
      </div>
      <div class="heading-sm">${user.name} & ${partner.name}</div>
      <div class="text-sm text-secondary" style="margin-top:4px">
        ${store.state.streak || 0} dias de sequência 🔥
      </div>
      <div class="badge badge-primary" style="margin-top:var(--space-sm)">
        Logado como ${user.name}
      </div>
    </div>

    <!-- Settings List -->
    <div class="card flex-col" style="padding:var(--space-sm);margin-bottom:var(--space-lg)">
      <div class="settings-item" id="setting-theme">
        <div class="settings-icon">🌙</div>
        <div class="settings-info">
          <div class="settings-name">Modo Escuro</div>
          <div class="settings-desc">Alternar entre claro e escuro</div>
        </div>
        <div class="settings-toggle ${isDark ? 'active' : ''}" id="theme-toggle"></div>
      </div>

      <div class="settings-item" id="setting-switch-profile">
        <div class="settings-icon">🔄</div>
        <div class="settings-info">
          <div class="settings-name">Trocar Perfil</div>
          <div class="settings-desc">Entrar como ${partner.name}</div>
        </div>
        <span class="text-muted">→</span>
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="card flex-col" style="padding:var(--space-sm);margin-bottom:var(--space-lg)">
      <div class="settings-item" id="setting-reset">
        <div class="settings-icon" style="background:rgba(196,122,110,0.1)">🗑️</div>
        <div class="settings-info">
          <div class="settings-name" style="color:#c47a6e">Resetar Dados</div>
          <div class="settings-desc">Apagar todos os planos e progresso</div>
        </div>
      </div>
    </div>

    <!-- About -->
    <div class="card" style="text-align:center">
      <div style="margin-bottom:var(--space-sm)">${ABOUT_LOGO}</div>
      <div class="heading-sm"><span class="text-gradient">P&G</span></div>
      <div class="text-sm text-muted" style="margin-top:4px">v2.1.0 · Feito com amor</div>
      <div class="text-xs text-muted" style="margin-top:var(--space-sm)">
        Pedro & Gabi · Cresçam juntos em fé, saúde e amor
      </div>
      <div class="text-xs text-secondary" style="margin-top:var(--space-xs);font-style:italic;opacity:0.7">
        Santa Zélia e São Luís Martin, rogai por nós ✝️
      </div>
      <div class="text-xs text-muted" style="margin-top:var(--space-xs)">
        🟢 Sincronizado via Firebase
      </div>
    </div>
  `;

  setTimeout(() => {
    // Theme toggle
    div.querySelector('#setting-theme')?.addEventListener('click', () => {
      const newTheme = (store.state.theme || 'dark') === 'light' ? 'dark' : 'light';
      store.set('theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      div.querySelector('#theme-toggle')?.classList.toggle('active', newTheme === 'dark');
      showToast(newTheme === 'dark' ? 'Modo escuro 🌙' : 'Modo claro ☀️');
    });

    // Switch profile → go back to profile selection
    div.querySelector('#setting-switch-profile')?.addEventListener('click', () => {
      localStorage.removeItem('pg_current_profile');
      router.navigate('/profile');
    });

    // Reset
    div.querySelector('#setting-reset')?.addEventListener('click', async () => {
      await showModal('Resetar Dados?', `
        <div class="flex-col gap-lg" style="text-align:center">
          <div style="font-size:3rem">⚠️</div>
          <p class="text-secondary">Tem certeza? Todos os planos e progresso serão perdidos.</p>
          <div class="flex gap-sm">
            <button class="btn btn-secondary btn-full" id="cancel-reset">Cancelar</button>
            <button class="btn btn-danger btn-full" id="confirm-reset">Resetar</button>
          </div>
        </div>
      `, {
        onMount: (overlay, close) => {
          overlay.querySelector('#cancel-reset')?.addEventListener('click', () => close());
          overlay.querySelector('#confirm-reset')?.addEventListener('click', () => {
            store.resetAll();
            document.documentElement.setAttribute('data-theme', 'dark');
            close();
            showToast('Dados resetados', '🗑️');
            window.location.hash = '#/profile';
            window.location.reload();
          });
        }
      });
    });
  }, 100);

  return div;
}
