/* ===================================
   P&G — Progress Component
   User & partner progress tracking
   =================================== */

import { store, CATEGORIES } from '../store.js';
import { createProgressRing } from '../ui.js';

export function renderProgress() {
  const user = store.getUser();
  const partner = store.getPartner();
  if (!user) return '';

  const userRole = user.role;
  const partnerRole = store.getPartnerRole();

  const div = document.createElement('div');
  div.className = 'page-container';

  div.innerHTML = `
    <div class="page-header">
      <h1 class="page-header-title">📊 Progresso</h1>
    </div>

    <!-- Overall Stats -->
    <div class="card" style="margin-bottom:var(--space-lg)">
      <div style="display:flex;gap:var(--space-lg);justify-content:space-around;text-align:center">
        <div id="progress-user-col">
          <div class="avatar" style="margin:0 auto var(--space-sm);overflow:hidden;padding:0" id="progress-user-avatar"></div>
          ${createProgressRing(store.getOverallProgress(userRole), 64, 4)}
          <div class="text-sm" style="margin-top:var(--space-sm)">${user.name}</div>
        </div>
        <div id="progress-partner-col">
          <div class="avatar" style="margin:0 auto var(--space-sm);background:var(--gradient-warm);overflow:hidden;padding:0" id="progress-partner-avatar"></div>
          ${createProgressRing(store.getOverallProgress(partnerRole), 64, 4)}
          <div class="text-sm" style="margin-top:var(--space-sm)">${partner.name}</div>
        </div>
      </div>
    </div>

    <!-- Category Progress -->
    <div class="section-header"><h2 class="section-title">Por Categoria</h2></div>
    <div class="flex-col gap-md stagger" style="margin-bottom:var(--space-xl)">
      ${renderCategoryBars(userRole, partnerRole, partner)}
    </div>

    <!-- Weekly Activity -->
    <div class="section-header"><h2 class="section-title">Atividade Semanal</h2></div>
    <div class="card" style="margin-bottom:var(--space-xl)">
      ${renderWeeklyChart(user, partner, userRole, partnerRole)}
    </div>

    <!-- Heatmap -->
    <div class="section-header"><h2 class="section-title">Calendário</h2></div>
    <div class="card" style="margin-bottom:var(--space-xl)">
      <div class="flex-between text-xs text-muted" style="margin-bottom:var(--space-sm)">
        <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
      </div>
      <div class="heatmap">${renderHeatmap(userRole, partnerRole)}</div>
      <div class="flex gap-md text-xs text-muted" style="margin-top:var(--space-md);justify-content:flex-end;align-items:center">
        <span>Menos</span>
        <div style="display:flex;gap:2px">
          <div class="heatmap-cell" style="width:12px;height:12px"></div>
          <div class="heatmap-cell level-1" style="width:12px;height:12px"></div>
          <div class="heatmap-cell level-2" style="width:12px;height:12px"></div>
          <div class="heatmap-cell level-3" style="width:12px;height:12px"></div>
          <div class="heatmap-cell level-4" style="width:12px;height:12px"></div>
        </div>
        <span>Mais</span>
      </div>
    </div>

    <!-- Achievements -->
    <div class="section-header"><h2 class="section-title">Conquistas</h2></div>
    <div class="flex-col gap-md stagger">${renderAchievements(userRole)}</div>
  `;

  // Inject avatars via DOM to avoid HTML escaping issues with onerror attributes
  _injectAvatar(div.querySelector('#progress-user-avatar'), user);
  _injectAvatar(div.querySelector('#progress-partner-avatar'), partner);

  return div;
}

/**
 * Safely injects an avatar image into a container element.
 * Falls back to the user's initial letter if the image fails to load.
 */
function _injectAvatar(container, profile) {
  if (!container) return;
  const img = document.createElement('img');
  img.src = profile.avatar;
  img.alt = profile.name;
  img.style.cssText = 'width:100%;height:100%;object-fit:cover';
  img.onerror = () => {
    container.innerHTML = '';
    container.textContent = profile.name[0];
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.fontWeight = 'bold';
    container.style.fontSize = '1.2rem';
  };
  container.appendChild(img);
}

function renderCategoryBars(userRole, partnerRole, partner) {
  // Only show prayer and reading categories with existing plans
  const activeCats = CATEGORIES
    .filter(c => c.id !== 'custom')
    .filter(c => store.getPlans(c.id).length > 0);

  if (!activeCats.length) {
    return '<div class="text-sm text-muted" style="text-align:center;padding:var(--space-lg)">Sem planos ainda</div>';
  }

  return activeCats.map(cat => {
    const up = store.getCategoryProgress(cat.id, userRole);
    const pp = store.getCategoryProgress(cat.id, partnerRole);
    return `
      <div class="card card-sm">
        <div class="flex-between" style="margin-bottom:var(--space-sm)">
          <div class="flex gap-sm" style="align-items:center">
            <span>${cat.icon}</span>
            <span class="text-sm" style="font-weight:var(--fw-medium)">${cat.name}</span>
          </div>
          <span class="text-sm text-secondary">${up}%</span>
        </div>
        <div style="background:var(--border-color);border-radius:var(--radius-full);height:6px;overflow:hidden;margin-bottom:4px">
          <div style="width:${up}%;height:100%;background:var(--color-${cat.color});border-radius:var(--radius-full);transition:width 600ms var(--ease-out)"></div>
        </div>
        <div style="display:flex;gap:var(--space-sm);align-items:center">
          <div style="flex:1;background:var(--border-color);border-radius:var(--radius-full);height:4px;overflow:hidden">
            <div style="width:${pp}%;height:100%;background:var(--color-${cat.color});opacity:0.5;border-radius:var(--radius-full)"></div>
          </div>
          <span class="text-xs text-muted">${partner.name} ${pp}%</span>
        </div>
      </div>`;
  }).join('');
}

function renderWeeklyChart(user, partner, userRole, partnerRole) {
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const history = store.state.history || {};
  const data = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    const key = date.toISOString().slice(0, 10);
    const dayIdx = (date.getDay() + 6) % 7;
    data.push({
      label: days[dayIdx],
      user: history[key]?.[`${userRole}Count`] || 0,
      partner: history[key]?.[`${partnerRole}Count`] || 0,
    });
  }

  const maxVal = Math.max(...data.map(d => Math.max(d.user, d.partner)), 1);

  return `
    <div class="weekly-chart">
      ${data.map(d => `
        <div class="chart-bar-group">
          <div class="chart-bars">
            <div class="chart-bar user-bar" style="height:${Math.max((d.user / maxVal) * 100, 5)}%"></div>
            <div class="chart-bar partner-bar" style="height:${Math.max((d.partner / maxVal) * 100, 5)}%"></div>
          </div>
          <span class="chart-day">${d.label}</span>
        </div>
      `).join('')}
    </div>
    <div class="flex-between text-xs text-muted" style="margin-top:var(--space-sm)">
      <span>▮ ${user.name}</span>
      <span>▮ ${partner.name}</span>
    </div>`;
}

function renderHeatmap(userRole, partnerRole) {
  const history = store.state.history || {};
  const cells = [];
  for (let i = 34; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    const key = date.toISOString().slice(0, 10);
    const count = (history[key]?.[`${userRole}Count`] || 0) + (history[key]?.[`${partnerRole}Count`] || 0);
    let level = '';
    if (count >= 12) level = 'level-4';
    else if (count >= 8) level = 'level-3';
    else if (count >= 4) level = 'level-2';
    else if (count >= 1) level = 'level-1';
    cells.push(`<div class="heatmap-cell ${level}" title="${key}: ${count}"></div>`);
  }
  return cells.join('');
}

function renderAchievements(userRole) {
  const streak = store.state.streak || 0;
  const completed = store.getTodayCompletedCount(userRole);
  const total = store.getTotalItems();

  const achievements = [
    {
      icon: '🔥',
      title: 'Sequência de Fogo',
      desc: `${streak} dias consecutivos`,
      unlocked: streak >= 3,
      progress: Math.min((streak / 7) * 100, 100),
    },
    {
      icon: '⭐',
      title: 'Primeiro Passo',
      desc: 'Complete 1 tarefa',
      unlocked: completed >= 1,
      progress: completed >= 1 ? 100 : 0,
    },
    {
      icon: '🏆',
      title: 'Campeão',
      desc: 'Complete 50% das tarefas',
      unlocked: total > 0 && completed / total >= 0.5,
      progress: total > 0 ? Math.min((completed / total) * 200, 100) : 0,
    },
    {
      icon: '💎',
      title: 'Perfeccionista',
      desc: 'Complete todas as tarefas',
      unlocked: total > 0 && completed === total,
      progress: total > 0 ? (completed / total) * 100 : 0,
    },
    {
      icon: '💑',
      title: 'Casal Nota 10',
      desc: 'Ambos completem 80%+',
      unlocked: false,
      progress: 0,
    },
  ];

  return achievements.map(a => `
    <div class="card card-sm flex gap-base" style="align-items:center;opacity:${a.unlocked ? '1' : '0.5'}">
      <div style="font-size:2rem;${a.unlocked ? '' : 'filter:grayscale(1)'}">${a.icon}</div>
      <div style="flex:1">
        <div style="font-weight:var(--fw-semibold);font-size:var(--fs-sm)">${a.title}</div>
        <div class="text-xs text-muted">${a.desc}</div>
        <div style="margin-top:4px;background:var(--border-color);border-radius:var(--radius-full);height:4px;overflow:hidden">
          <div style="width:${a.progress}%;height:100%;background:${a.unlocked ? 'var(--gradient-primary)' : 'var(--text-muted)'};border-radius:var(--radius-full)"></div>
        </div>
      </div>
      ${a.unlocked ? '<span class="badge badge-success">✓</span>' : ''}
    </div>
  `).join('');
}
