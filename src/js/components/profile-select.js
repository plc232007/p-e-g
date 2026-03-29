/* ===================================
   P&G — Profile Selection
   Fixed Pedro & Gabi profiles
   =================================== */

import { store, PROFILES } from '../store.js';
import { router } from '../router.js';

export function renderProfileSelect() {
  const div = document.createElement('div');
  div.className = 'page-container';
  div.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100dvh;padding:var(--space-xl)';

  div.innerHTML = `
    <div style="text-align:center;margin-bottom:var(--space-2xl)">
      <div style="font-size:2.5rem;margin-bottom:var(--space-sm)" class="heart-beat">💜</div>
      <h1 class="heading-lg">
        <span class="text-gradient">P&G</span>
      </h1>
      <p class="text-secondary text-sm" style="margin-top:var(--space-sm)">Quem está acessando?</p>
    </div>

    <div style="display:flex;gap:var(--space-xl);width:100%;max-width:360px;justify-content:center">
      <!-- Pedro -->
      <div class="profile-card" data-role="user1" id="select-pedro">
        <div class="profile-avatar-wrapper">
          <img src="/images/pedro.png" alt="Pedro" class="profile-avatar-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
          <div class="profile-avatar-fallback" style="display:none">P</div>
        </div>
        <div class="profile-name">Pedro</div>
        <div class="profile-saint text-xs text-muted">São José</div>
      </div>

      <!-- Gabi -->
      <div class="profile-card" data-role="user2" id="select-gabi">
        <div class="profile-avatar-wrapper">
          <img src="/images/gabi.png" alt="Gabi" class="profile-avatar-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
          <div class="profile-avatar-fallback" style="display:none">G</div>
        </div>
        <div class="profile-name">Gabi</div>
        <div class="profile-saint text-xs text-muted">Nossa Senhora</div>
      </div>
    </div>

    <style>
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
        border-color: rgba(124, 58, 237, 0.4);
        box-shadow: 0 12px 40px rgba(124, 58, 237, 0.2);
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
        border-color: #7c3aed;
      }

      .profile-card[data-role="user2"]:hover .profile-avatar-wrapper {
        border-color: #ec4899;
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
        background: linear-gradient(135deg, #ec4899, #f59e0b);
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
  // Refresh the page to re-render with profile
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('profilechanged'));
  }, 100);
}
