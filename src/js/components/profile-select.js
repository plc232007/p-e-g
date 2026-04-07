/* ===================================
   P&G — Profile Selection
   Fixed Pedro & Gabi profiles
   Santa Zélia & São Luís Martin
   =================================== */

import { store } from '../store.js';
import { router } from '../router.js';

// App logo SVG inline
const APP_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" width="72" height="72" style="display:block;margin:0 auto">
  <defs>
    <linearGradient id="bg-logo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2c3e6b"/>
      <stop offset="100%" stop-color="#1e2d52"/>
    </linearGradient>
    <linearGradient id="cross-logo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c49a55"/>
      <stop offset="100%" stop-color="#dab978"/>
    </linearGradient>
  </defs>
  <circle cx="256" cy="256" r="240" fill="url(#bg-logo)"/>
  <rect x="240" y="100" width="32" height="280" rx="6" fill="url(#cross-logo)"/>
  <rect x="176" y="172" width="160" height="28" rx="6" fill="url(#cross-logo)"/>
  <ellipse cx="216" cy="350" rx="48" ry="32" fill="none" stroke="#c49a55" stroke-width="3.5" opacity="0.7" transform="rotate(-12, 216, 350)"/>
  <ellipse cx="296" cy="350" rx="48" ry="32" fill="none" stroke="#dab978" stroke-width="3.5" opacity="0.6" transform="rotate(12, 296, 350)"/>
  <circle cx="256" cy="256" r="238" fill="none" stroke="rgba(196,154,85,0.15)" stroke-width="2"/>
</svg>`;

export function renderProfileSelect() {
  const div = document.createElement('div');
  div.className = 'page-container profile-select-page';

  div.innerHTML = `
    <div class="profile-select-header">
      <div class="profile-logo">${APP_LOGO_SVG}</div>
      <h1 class="heading-lg">
        <span class="text-gradient">P&G</span>
      </h1>
      <p class="text-secondary text-xs profile-subtitle">
        Santa Zélia e São Luís Martin, rogai por nós
      </p>
      <p class="text-secondary text-sm" style="margin-top:var(--space-base)">Quem está acessando?</p>
    </div>

    <div class="profile-cards-row">
      <!-- Pedro -->
      <div class="profile-card" data-role="user1" id="select-pedro">
        <div class="profile-avatar-wrapper">
          <img src="/images/pedro.png" alt="São Luís Martin — Pedro" class="profile-avatar-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
          <div class="profile-avatar-fallback" style="display:none">P</div>
        </div>
        <div class="profile-name">Pedro</div>
        <div class="profile-saint text-xs text-muted">São Luís Martin</div>
      </div>

      <!-- Gabi -->
      <div class="profile-card" data-role="user2" id="select-gabi">
        <div class="profile-avatar-wrapper">
          <img src="/images/gabi.png" alt="Santa Zélia Martin — Gabi" class="profile-avatar-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
          <div class="profile-avatar-fallback" style="display:none">G</div>
        </div>
        <div class="profile-name">Gabi</div>
        <div class="profile-saint text-xs text-muted">Santa Zélia</div>
      </div>
    </div>

    <style>
      .profile-select-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100dvh;
        padding: var(--space-xl);
      }

      .profile-select-header {
        text-align: center;
        margin-bottom: var(--space-2xl);
      }

      .profile-logo {
        display: flex;
        justify-content: center;
        margin-bottom: var(--space-base);
      }

      .profile-subtitle {
        margin-top: var(--space-xs);
        opacity: 0.7;
        font-style: italic;
      }

      .profile-cards-row {
        display: flex;
        gap: var(--space-xl);
        width: 100%;
        max-width: 360px;
        justify-content: center;
      }

      .profile-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-md);
        padding: var(--space-lg) var(--space-xl);
        background: var(--bg-card-glass);
        backdrop-filter: blur(var(--glass-blur));
        -webkit-backdrop-filter: blur(var(--glass-blur));
        border: 2px solid var(--glass-border);
        border-radius: var(--radius-2xl);
        cursor: pointer;
        transition: all 300ms var(--ease-spring);
        flex: 1;
        max-width: 160px;
      }

      .profile-card:hover {
        transform: translateY(-4px) scale(1.03);
        border-color: rgba(44, 62, 107, 0.4);
        box-shadow: 0 12px 40px rgba(44, 62, 107, 0.2);
      }

      .profile-card:active {
        transform: scale(0.97);
      }

      .profile-avatar-wrapper {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        overflow: hidden;
        border: 3px solid var(--glass-border);
        transition: border-color 300ms var(--ease-out);
        position: relative;
      }

      .profile-card:hover .profile-avatar-wrapper {
        border-color: #2c3e6b;
      }

      .profile-card[data-role="user2"]:hover .profile-avatar-wrapper {
        border-color: #c49a55;
      }

      .profile-avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .profile-avatar-fallback {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-display);
        font-size: 2.5rem;
        font-weight: var(--fw-extrabold);
        color: #fff;
      }

      .profile-card[data-role="user1"] .profile-avatar-fallback {
        background: var(--gradient-primary);
      }

      .profile-card[data-role="user2"] .profile-avatar-fallback {
        background: var(--gradient-warm);
      }

      .profile-name {
        font-family: var(--font-display);
        font-weight: var(--fw-bold);
        font-size: var(--fs-lg);
      }

      .profile-saint {
        opacity: 0.7;
      }
    </style>
  `;

  // Setup clicks
  setTimeout(() => {
    div.querySelector('#select-pedro')?.addEventListener('click', () => selectProfile('user1'));
    div.querySelector('#select-gabi')?.addEventListener('click', () => selectProfile('user2'));
  }, 50);

  return div;
}

function selectProfile(role) {
  store.currentProfile = role;
  store.updateStreak();
  router.navigate('/');
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('profilechanged'));
  }, 100);
}
