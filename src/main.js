/* ===================================
   P&G — Main App
   Entry point & initialization
   =================================== */

import './css/index.css';
import './css/components.css';
import './css/animations.css';

import { store } from './js/store.js';
import { router } from './js/router.js';
import { renderBottomNav } from './js/ui.js';

// Components
import { renderProfileSelect } from './js/components/profile-select.js';
import { renderDashboard } from './js/components/dashboard.js';
import { renderPlanList } from './js/components/plan-list.js';
import { renderPlanDetail } from './js/components/plan-detail.js';
import { renderProgress } from './js/components/progress.js';
import { renderSettings } from './js/components/settings.js';
import { renderSavings } from './js/components/savings.js';

// === Initialize App ===
async function init() {
  const app = document.getElementById('app');

  // Apply saved theme
  document.documentElement.setAttribute('data-theme', store.state.theme || 'dark');

  // Background decoration
  const bgDecoration = document.createElement('div');
  bgDecoration.className = 'bg-decoration';
  app.prepend(bgDecoration);

  // Confetti canvas
  const confettiCanvas = document.createElement('canvas');
  confettiCanvas.id = 'confetti-canvas';
  document.body.appendChild(confettiCanvas);

  // Initialize Firebase sync
  try {
    await store.initSync();
  } catch (err) {
    console.warn('Firebase sync init failed, using local data:', err);
  }

  // Check if profile is selected
  const hasProfile = store.currentProfile !== null;

  // Register routes
  router.register('/profile', () => {
    hideNav();
    return renderProfileSelect();
  });

  router.register('/', () => {
    if (!store.currentProfile) { hideNav(); return renderProfileSelect(); }
    showNav();
    return renderDashboard();
  });

  router.register('/plans', (params) => {
    if (!store.currentProfile) return renderProfileSelect();
    showNav();
    return renderPlanList(params);
  });

  router.register('/plan', (params) => {
    if (!store.currentProfile) return renderProfileSelect();
    showNav();
    return renderPlanDetail(params);
  });

  router.register('/progress', () => {
    if (!store.currentProfile) return renderProfileSelect();
    showNav();
    return renderProgress();
  });

  router.register('/savings', () => {
    if (!store.currentProfile) return renderProfileSelect();
    showNav();
    return renderSavings();
  });

  router.register('/settings', () => {
    if (!store.currentProfile) return renderProfileSelect();
    showNav();
    return renderSettings();
  });

  // Initialize router
  router.init('page-content');

  // Bottom navigation
  const nav = renderBottomNav();
  app.appendChild(nav);

  // Hide nav if no profile selected
  if (!hasProfile) {
    hideNav();
  }

  // Update streak
  if (hasProfile) {
    store.updateStreak();
  }

  // Listen for profile changes
  window.addEventListener('profilechanged', () => {
    showNav();
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

function showNav() {
  const nav = document.getElementById('bottom-nav');
  if (nav) nav.style.display = 'flex';
}

function hideNav() {
  const nav = document.getElementById('bottom-nav');
  if (nav) nav.style.display = 'none';
}

// Boot
document.addEventListener('DOMContentLoaded', init);
