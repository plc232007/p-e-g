/* ===================================
   P&G — Dashboard Component
   Main home screen
   Santa Zélia & São Luís Martin Edition
   =================================== */

import { store, TERCO_MISTERIOS } from '../store.js';
import { router } from '../router.js';
import { getGreeting, createProgressRing, showToast, showModal } from '../ui.js';
import { renderSavingsCard } from './savings.js';

export function renderDashboard() {
  const user = store.getUser();
  const partner = store.getPartner();
  if (!user) { router.navigate('/profile'); return ''; }

  // Request notification permission on first dashboard load
  store.requestNotificationPermission();

  const greeting = getGreeting();
  const userRole = user.role;
  const partnerRole = store.getPartnerRole();
  const userProgress = store.getOverallProgress(userRole);
  const partnerProgress = store.getOverallProgress(partnerRole);
  const streak = store.state.streak || 0;
  const unreadCount = store.getUnreadNotificationCount();

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
        ${unreadCount > 0 ? `
          <button class="notification-bell" id="notif-bell" title="${unreadCount} notificações">
            🔔
            <span class="notif-badge-count">${unreadCount}</span>
          </button>
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

    <!-- Terço do Dia Card -->
    ${renderTercoCard(userRole, partnerRole, partner)}

    <!-- Savings Card -->
    ${renderSavingsCard()}

    <!-- All Plans Section -->
    <div class="section-header" style="margin-top:var(--space-lg)">
      <h2 class="section-title">📋 Nossos Planos</h2>
      <span class="section-action" id="view-all-plans">Ver todos</span>
    </div>

    <div class="flex-col gap-md stagger" id="plans-list-dashboard">
      ${renderPlanCards(userRole, partnerRole, partner)}
    </div>

    <!-- Upcoming Deadlines -->
    ${renderUpcomingDeadlines(userRole, partnerRole, partner)}

    <!-- Próximas Tarefas -->
    ${renderTodayTasks(userRole, partnerRole, partner)}
  `;

  // Inject avatars safely via DOM
  _injectAvatar(div.querySelector('#dash-user-avatar'), user);
  _injectAvatar(div.querySelector('#dash-partner-avatar'), partner);
  _injectAvatar(div.querySelector('#dash-partner-progress-avatar'), partner);

  // Setup interactions
  setTimeout(() => {
    // Notification bell
    div.querySelector('#notif-bell')?.addEventListener('click', () => {
      showNotificationsModal();
    });

    // Plan cards click
    div.querySelectorAll('.plan-card-dash').forEach(card => {
      card.addEventListener('click', () => router.navigate(`/plan/${card.dataset.planId}`));
    });

    div.querySelector('#view-all-plans')?.addEventListener('click', () => router.navigate('/plans'));

    div.querySelector('#savings-card')?.addEventListener('click', () => router.navigate('/savings'));

    // Terço toggle
    div.querySelectorAll('.terco-check-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        store.toggleItem('terco-semanal', btn.dataset.itemId, store.currentProfile || 'user1');
        _rerender();
      });
    });

    // Quick check buttons
    div.querySelectorAll('.quick-check-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        store.toggleItem(btn.dataset.planId, btn.dataset.itemId, store.currentProfile || 'user1');
        _rerender();
      });
    });
  }, 100);

  // Listen for partner notifications
  const handleNotif = (e) => {
    const notif = e.detail;
    if (notif.from && notif.from !== store.currentProfile) {
      showToast(notif.message, notif.icon, 4000);
    }
  };
  window.addEventListener('partnernotification', handleNotif);

  return div;
}

function _rerender() {
  const pageContent = document.getElementById('page-content');
  if (pageContent) {
    pageContent.innerHTML = '';
    pageContent.appendChild(renderDashboard());
    pageContent.classList.add('page-enter');
  }
}

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

// ─── Terço Card ──────────────────────────────────────────────────────────────

function renderTercoCard(userRole, partnerRole, partner) {
  const terco = store.getPlan('terco-semanal');
  if (!terco) return '';

  const now = new Date();
  const dayOfWeek = now.getDay();
  const todayItem = terco.items.find(i => i.dayOfWeek === dayOfWeek);
  if (!todayItem) return '';

  const misterio = TERCO_MISTERIOS[dayOfWeek];
  const isDone = todayItem[userRole];
  const partnerDone = todayItem[partnerRole];
  const pendingDays = store.getTercoPendingDays(userRole);

  return `
    <div class="terco-card card" style="margin-bottom:var(--space-lg);position:relative;overflow:hidden">
      <div style="position:absolute;top:-20px;right:-20px;font-size:6rem;opacity:0.07">📿</div>
      <div class="flex-between" style="position:relative;z-index:1;margin-bottom:var(--space-md)">
        <div>
          <div class="text-sm text-secondary" style="margin-bottom:2px">📿 Terço de Hoje</div>
          <div class="heading-sm">${misterio.emoji} ${misterio.titulo}</div>
          <div class="text-xs text-muted" style="margin-top:2px">Até ${todayItem.deadlineTime || '20:00'}</div>
        </div>
        <button class="terco-check-btn terco-toggle ${isDone ? 'done' : ''}" data-item-id="${todayItem.id}">
          ${isDone ? '✅' : '📿'}
        </button>
      </div>

      <!-- Week Progress Mini -->
      <div class="terco-week-strip">
        ${terco.items.map(item => {
          const isToday = item.dayOfWeek === dayOfWeek;
          const done = item[userRole];
          const isPast = item.dayOfWeek < dayOfWeek;
          const missed = isPast && !done;
          const dayLabel = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][item.dayOfWeek];

          return `
            <div class="terco-day ${isToday ? 'today' : ''} ${done ? 'done' : ''} ${missed ? 'missed' : ''}">
              <div class="terco-day-label">${dayLabel}</div>
              <div class="terco-day-dot">${done ? '✓' : missed ? '✗' : '·'}</div>
            </div>
          `;
        }).join('')}
      </div>

      ${pendingDays.length > 0 ? `
        <div class="text-xs" style="margin-top:var(--space-sm);color:#c47a6e">
          ⚠️ ${pendingDays.length} dia${pendingDays.length > 1 ? 's' : ''} pendente${pendingDays.length > 1 ? 's' : ''} nesta semana
        </div>
      ` : ''}

      <div class="text-xs text-muted" style="margin-top:var(--space-xs)">
        ${partner.name}: ${partnerDone ? '✅ Rezou' : '⏳ Pendente'}
      </div>
    </div>
  `;
}

// ─── All Plans Cards ──────────────────────────────────────────────────────────

function renderPlanCards(userRole, partnerRole, partner) {
  const plans = store.getPlans().filter(p => p.id !== 'terco-semanal'); // Terço has its own card

  if (plans.length === 0) {
    return `
      <div class="empty-state" style="padding:var(--space-xl)">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">Nenhum plano ainda</div>
        <div class="empty-state-text">Vá em Planos e crie um novo para começar!</div>
      </div>
    `;
  }

  return plans.map(plan => {
    const progress = store.getPlanProgress(plan.id, userRole);
    const partnerProg = store.getPlanProgress(plan.id, partnerRole);
    const completed = plan.items.filter(i => i[userRole]).length;

    return `
      <div class="card card-interactive plan-card-dash" data-plan-id="${plan.id}" style="padding:var(--space-base) var(--space-lg)">
        <div class="flex gap-base" style="align-items:center">
          <div class="category-icon" data-category="${plan.categoryId}" style="width:42px;height:42px;font-size:1.3rem">${plan.icon || '📝'}</div>
          <div style="flex:1;min-width:0">
            <div style="font-family:var(--font-display);font-weight:var(--fw-semibold);font-size:var(--fs-md)">${plan.title}</div>
            <div class="text-sm text-secondary" style="margin-top:2px">
              ${completed}/${plan.items.length} · ${partner.name} ${partnerProg}%
            </div>
          </div>
          ${createProgressRing(progress, 40, 3)}
        </div>
      </div>
    `;
  }).join('');
}

// ─── Upcoming Deadlines ──────────────────────────────────────────────────────

function renderUpcomingDeadlines(userRole, partnerRole, partner) {
  const deadlines = store.getUpcomingDeadlines(userRole, 3);

  if (deadlines.length === 0) return '';

  return `
    <div style="margin-top:var(--space-lg)">
      <div class="section-header">
        <h2 class="section-title">⏰ Prazos</h2>
        <span class="badge badge-warning">${deadlines.length} próximo${deadlines.length > 1 ? 's' : ''}</span>
      </div>
      <div class="card flex-col gap-xs" style="padding:var(--space-md)">
        ${deadlines.map(({ plan, item, deadlineDate, deadlineTime, isTerco }) => {
          const isOverdue = store.isTaskOverdue(item, plan);
          const dateStr = deadlineDate ? formatDeadlineDate(deadlineDate) : '';
          const timeStr = deadlineTime || '';

          return `
            <div class="deadline-item ${isOverdue ? 'overdue' : ''}">
              <div class="deadline-icon">${isTerco ? '📿' : '📌'}</div>
              <div style="flex:1;min-width:0">
                <div class="text-sm" style="font-weight:var(--fw-medium)">${item.title}</div>
                <div class="text-xs text-muted">${plan.title}</div>
              </div>
              <div class="deadline-time ${isOverdue ? 'overdue' : ''}">
                ${isOverdue ? '❌ ' : ''}${timeStr}
                ${dateStr ? `<div class="text-xs">${dateStr}</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function formatDeadlineDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);

  if (dateStr === todayStr) return 'Hoje';
  if (dateStr === tomorrowStr) return 'Amanhã';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// ─── Today's Tasks ──────────────────────────────────────────────────────────

function renderTodayTasks(userRole, partnerRole, partner) {
  const incompleteTasks = [];

  for (const plan of store.state.plans) {
    if (plan.id === 'terco-semanal') continue; // Terço has its own card
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
          const partnerDone = item[partnerRole];
          const isOverdue = store.isTaskOverdue(item, plan);

          return `
            <div class="checkbox-item ${isOverdue ? 'overdue-item' : ''}" style="border-radius:var(--radius-md)">
              <button class="quick-check-btn checkbox-box" data-plan-id="${plan.id}" data-item-id="${item.id}">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <div style="flex:1;min-width:0">
                <div class="checkbox-label" style="font-size:var(--fs-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.title}</div>
                <div class="text-xs text-muted">
                  ${plan.icon || '📝'} ${plan.title}
                  ${item.deadlineTime ? ` · ⏰ ${item.deadlineTime}` : ''}
                  ${item.deadlineDate ? ` · 📅 ${formatDeadlineDate(item.deadlineDate)}` : ''}
                </div>
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

// ─── Notifications Modal ──────────────────────────────────────────────────────

async function showNotificationsModal() {

  const notifications = store.state.notifications || [];

  const content = notifications.length === 0
    ? `<div class="empty-state" style="padding:var(--space-lg)">
         <div class="empty-state-icon">🔔</div>
         <div class="empty-state-title">Sem notificações</div>
       </div>`
    : `<div class="flex-col gap-sm" style="max-height:60vh;overflow-y:auto">
        ${notifications.slice(0, 20).map(n => {
          const time = new Date(n.timestamp);
          const timeStr = time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const dateStr = time.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

          return `
            <div class="notif-item ${n.read ? '' : 'unread'}">
              <div class="notif-icon">${n.icon}</div>
              <div style="flex:1;min-width:0">
                <div class="text-sm" style="font-weight:${n.read ? 'normal' : 'var(--fw-semibold)'}">${n.message}</div>
                <div class="text-xs text-muted">${dateStr} às ${timeStr}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>`;

  await showModal('🔔 Notificações', content);
  store.markNotificationsRead();
}
