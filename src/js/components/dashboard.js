/* ===================================
   P&G — Dashboard Component
   Main home screen
   Santa Zélia & São Luís Martin Edition
   =================================== */

import { store, CATEGORIES } from '../store.js';
import { router } from '../router.js';
import { getGreeting, getCategoryInfo, createProgressRing } from '../ui.js';
import { renderSavingsCard } from './savings.js';

export function renderDashboard() {
  const user = store.getUser();
  const partner = store.getPartner();
  if (!user) { router.navigate('/profile'); return ''; }

  const greeting = getGreeting();
  const userRole = user.role;
  const partnerRole = store.getPartnerRole();
  const userProgress = store.getOverallProgress(userRole);
  const partnerProgress = store.getOverallProgress(partnerRole);
  const streak = store.state.streak || 0;

  const div = document.createElement('div');
  div.className = 'page-container';

  div.innerHTML = `
    <!-- Header -->
    <div class="flex-between" style="margin-bottom:var(--space-lg);padding-top:var(--space-sm)">
      <div>
        <div class="text-secondary text-sm" style="margin-bottom:2px">${greeting.text} ${greeting.emoji}</div>
        <h1 class="heading-md">${user.name} & ${partner.name}</h1>
      </div>
      <div class="flex gap-sm" style="align-items:center">
        ${streak > 0 ? `
          <div class="streak-badge">
            <span class="streak-fire">🔥</span>
            <span>${streak}</span>
          </div>
        ` : ''}
        <div class="avatar-pair">
          <div class="avatar" style="overflow:hidden;padding:0" id="dash-user-avatar"></div>
          <div class="avatar" style="background:var(--gradient-warm);overflow:hidden;padding:0" id="dash-partner-avatar"></div>
        </div>
      </div>
    </div>

    <!-- Overall Progress Card -->
    <div class="card" style="margin-bottom:var(--space-lg);background:var(--gradient-primary);border:none;position:relative;overflow:hidden">
      <div style="position:absolute;top:-30px;right:-30px;font-size:8rem;opacity:0.1">✝️</div>
      <div class="flex-between" style="position:relative;z-index:1">
        <div>
          <div style="font-size:var(--fs-sm);opacity:0.85;margin-bottom:4px;color:#fff">Seu Progresso</div>
          <div style="font-size:var(--fs-3xl);font-family:var(--font-display);font-weight:800;color:#fff">${userProgress}%</div>
          <div style="font-size:var(--fs-xs);opacity:0.75;margin-top:4px;color:#fff">
            ${store.getTodayCompletedCount(userRole)} de ${store.getTotalItems()} tarefas
          </div>
        </div>
        <div style="text-align:center">
          <div class="avatar" style="background:rgba(255,255,255,0.2);margin:0 auto 4px;overflow:hidden;padding:0" id="dash-partner-progress-avatar"></div>
          <div style="font-size:var(--fs-2xl);font-family:var(--font-display);font-weight:700;color:#fff">${partnerProgress}%</div>
          <div style="font-size:var(--fs-xs);opacity:0.75;color:#fff">${partner.name}</div>
        </div>
      </div>
      <!-- Progress bars -->
      <div style="margin-top:var(--space-base);display:flex;gap:var(--space-sm)">
        <div style="flex:1;background:rgba(255,255,255,0.2);border-radius:var(--radius-full);height:6px;overflow:hidden">
          <div style="width:${userProgress}%;height:100%;background:#fff;border-radius:var(--radius-full);transition:width 800ms var(--ease-out)"></div>
        </div>
        <div style="flex:1;background:rgba(255,255,255,0.2);border-radius:var(--radius-full);height:6px;overflow:hidden">
          <div style="width:${partnerProgress}%;height:100%;background:rgba(255,255,255,0.6);border-radius:var(--radius-full);transition:width 800ms var(--ease-out)"></div>
        </div>
      </div>
      <div class="flex-between text-xs" style="margin-top:var(--space-xs);opacity:0.6;color:#fff">
        <span>${user.name}</span>
        <span>${partner.name}</span>
      </div>
    </div>

    <!-- Savings Card -->
    ${renderSavingsCard()}

    <!-- Categories Section -->
    <div class="section-header">
      <h2 class="section-title">Categorias</h2>
      <span class="section-action" id="view-all-plans">Ver todos</span>
    </div>

    <div class="flex-col gap-md stagger" id="category-list">
      ${renderCategoryCards(userRole)}
    </div>

    ${renderTodayTasks(userRole, partnerRole, partner)}
  `;

  // Inject avatars safely via DOM (avoids HTML template escaping bugs)
  _injectAvatar(div.querySelector('#dash-user-avatar'), user);
  _injectAvatar(div.querySelector('#dash-partner-avatar'), partner);
  _injectAvatar(div.querySelector('#dash-partner-progress-avatar'), partner);

  // Setup interactions
  setTimeout(() => {
    div.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => router.navigate('/plans', { categoryId: card.dataset.category }));
    });

    div.querySelector('#view-all-plans')?.addEventListener('click', () => router.navigate('/plans'));

    div.querySelector('#savings-card')?.addEventListener('click', () => router.navigate('/savings'));

    div.querySelectorAll('.quick-check-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        store.toggleItem(btn.dataset.planId, btn.dataset.itemId, store.currentProfile || 'user1');
        // Re-render dashboard
        const pageContent = document.getElementById('page-content');
        if (pageContent) {
          pageContent.innerHTML = '';
          pageContent.appendChild(renderDashboard());
          pageContent.classList.add('page-enter');
        }
      });
    });
  }, 100);

  return div;
}

/**
 * Safely injects an avatar image into a container, with initial-letter fallback.
 */
function _injectAvatar(container, profile) {
  if (!container) return;
  const img = document.createElement('img');
  img.src = profile.avatar;
  img.alt = profile.name;
  img.style.cssText = 'width:100%;height:100%;object-fit:cover';
  img.onerror = () => {
    container.textContent = profile.name[0];
    img.remove();
  };
  container.appendChild(img);
}

function renderCategoryCards(userRole) {
  // Only show prayer and reading categories
  const mainCats = CATEGORIES.filter(c => c.id !== 'custom');
  const activeCats = mainCats.filter(cat => store.getPlans(cat.id).length > 0);

  if (activeCats.length === 0) {
    return `
      <div class="empty-state" style="padding:var(--space-xl)">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">Nenhum plano ainda</div>
        <div class="empty-state-text">Vá em Planos e crie um novo para começar!</div>
      </div>
    `;
  }

  return activeCats.map(cat => {
    const plans = store.getPlans(cat.id);
    const progress = store.getCategoryProgress(cat.id, userRole);
    const totalItems = plans.reduce((sum, p) => sum + p.items.length, 0);

    return `
      <div class="category-card card-interactive" data-category="${cat.id}">
        <div class="category-icon" data-category="${cat.id}">${cat.icon}</div>
        <div class="category-info">
          <div class="category-name">${cat.name}</div>
          <div class="category-meta">${plans.length} plano${plans.length !== 1 ? 's' : ''} · ${totalItems} tarefas</div>
        </div>
        ${createProgressRing(progress, 44, 3.5)}
      </div>
    `;
  }).join('');
}

function renderTodayTasks(userRole, partnerRole, partner) {
  const incompleteTasks = [];

  for (const plan of store.state.plans) {
    for (const item of plan.items) {
      if (!item[userRole]) {
        incompleteTasks.push({ plan, item });
        if (incompleteTasks.length >= 5) break;
      }
    }
    if (incompleteTasks.length >= 5) break;
  }

  if (incompleteTasks.length === 0) {
    return `
      <div style="margin-top:var(--space-xl);text-align:center;padding:var(--space-lg)">
        <div style="font-size:3rem;margin-bottom:var(--space-sm)">🎉</div>
        <div class="heading-sm">Parabéns!</div>
        <div class="text-secondary text-sm">Todas as tarefas estão completas!</div>
      </div>
    `;
  }

  return `
    <div style="margin-top:var(--space-xl)">
      <div class="section-header">
        <h2 class="section-title">Próximas Tarefas</h2>
        <span class="badge badge-warning">${incompleteTasks.length} pendente${incompleteTasks.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="card flex-col gap-xs" style="padding:var(--space-md)">
        ${incompleteTasks.map(({ plan, item }) => {
          const cat = getCategoryInfo(plan.categoryId);
          const partnerDone = item[partnerRole];
          return `
            <div class="checkbox-item" style="border-radius:var(--radius-md)">
              <button class="quick-check-btn checkbox-box" data-plan-id="${plan.id}" data-item-id="${item.id}">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <div style="flex:1;min-width:0">
                <div class="checkbox-label" style="font-size:var(--fs-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.title}</div>
                <div class="text-xs text-muted">${cat.icon} ${plan.title}</div>
              </div>
              <div class="checkbox-partner-status" title="${partner.name}: ${partnerDone ? 'Feito' : 'Pendente'}">
                <div class="partner-dot ${partnerDone ? 'completed' : ''}"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
