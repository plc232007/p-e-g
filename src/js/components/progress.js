/* ===================================
   P&G — Progress Component
   Interactive calendars & progress
   =================================== */

import { store } from '../store.js';
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

    <!-- Per-Plan Progress -->
    <div class="section-header"><h2 class="section-title">Por Plano</h2></div>
    <div class="flex-col gap-md stagger" style="margin-bottom:var(--space-xl)">
      ${renderPlanBars(userRole, partnerRole, partner)}
    </div>

    <!-- Weekly Activity -->
    <div class="section-header"><h2 class="section-title">Atividade Semanal</h2></div>
    <div class="card weekly-activity-card" style="margin-bottom:var(--space-xl)" id="weekly-chart-card">
      ${renderInteractiveWeeklyChart(user, partner, userRole, partnerRole)}
    </div>

    <!-- Monthly Calendar -->
    <div class="section-header">
      <h2 class="section-title">📅 Calendário Mensal</h2>
      <div class="flex gap-sm" style="align-items:center">
        <button class="btn btn-icon btn-ghost btn-sm" id="cal-prev" style="font-size:1rem">◀</button>
        <span id="cal-month-label" class="text-sm" style="font-weight:var(--fw-semibold);min-width:120px;text-align:center"></span>
        <button class="btn btn-icon btn-ghost btn-sm" id="cal-next" style="font-size:1rem">▶</button>
      </div>
    </div>
    <div class="card monthly-calendar-card" style="margin-bottom:var(--space-xl)" id="monthly-calendar">
    </div>

    <!-- Achievements -->
    <div class="section-header"><h2 class="section-title">Conquistas</h2></div>
    <div class="flex-col gap-md stagger">${renderAchievements(userRole)}</div>
  `;

  // Inject avatars via DOM
  _injectAvatar(div.querySelector('#progress-user-avatar'), user);
  _injectAvatar(div.querySelector('#progress-partner-avatar'), partner);

  // Monthly calendar state
  let calendarMonth = new Date().getMonth();
  let calendarYear = new Date().getFullYear();

  function updateCalendar() {
    const monthLabel = div.querySelector('#cal-month-label');
    const calContainer = div.querySelector('#monthly-calendar');
    if (monthLabel) {
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      monthLabel.textContent = `${monthNames[calendarMonth]} ${calendarYear}`;
    }
    if (calContainer) {
      calContainer.innerHTML = renderMonthlyCalendar(calendarYear, calendarMonth, userRole, partnerRole);
      _wireCalendarDays(calContainer, userRole, partnerRole);
    }
  }

  // Initialize calendar
  setTimeout(() => {
    updateCalendar();

    div.querySelector('#cal-prev')?.addEventListener('click', () => {
      calendarMonth--;
      if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
      updateCalendar();
    });

    div.querySelector('#cal-next')?.addEventListener('click', () => {
      calendarMonth++;
      if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
      updateCalendar();
    });

    // Wire weekly chart interactions
    _wireWeeklyChart(div, userRole, partnerRole);
  }, 100);

  return div;
}

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

function renderPlanBars(userRole, partnerRole, partner) {
  const plans = store.getPlans();

  if (!plans.length) {
    return '<div class="text-sm text-muted" style="text-align:center;padding:var(--space-lg)">Sem planos ainda</div>';
  }

  return plans.map(plan => {
    const up = store.getPlanProgress(plan.id, userRole);
    const pp = store.getPlanProgress(plan.id, partnerRole);
    return `
      <div class="card card-sm">
        <div class="flex-between" style="margin-bottom:var(--space-sm)">
          <div class="flex gap-sm" style="align-items:center">
            <span>${plan.icon || '📝'}</span>
            <span class="text-sm" style="font-weight:var(--fw-medium)">${plan.title}</span>
          </div>
          <span class="text-sm text-secondary">${up}%</span>
        </div>
        <div style="background:var(--border-color);border-radius:var(--radius-full);height:6px;overflow:hidden;margin-bottom:4px">
          <div style="width:${up}%;height:100%;background:var(--gradient-primary);border-radius:var(--radius-full);transition:width 600ms var(--ease-out)"></div>
        </div>
        <div style="display:flex;gap:var(--space-sm);align-items:center">
          <div style="flex:1;background:var(--border-color);border-radius:var(--radius-full);height:4px;overflow:hidden">
            <div style="width:${pp}%;height:100%;background:var(--gradient-warm);opacity:0.7;border-radius:var(--radius-full)"></div>
          </div>
          <span class="text-xs text-muted">${partner.name} ${pp}%</span>
        </div>
      </div>`;
  }).join('');
}

// ─── Interactive Weekly Chart ────────────────────────────────────────────────

function renderInteractiveWeeklyChart(user, partner, userRole, partnerRole) {
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const history = store.state.history || {};
  const data = [];
  const todayIdx = new Date().getDay();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    const key = date.toISOString().slice(0, 10);
    const dayIdx = (date.getDay() + 6) % 7;
    const isToday = i === 0;
    data.push({
      label: days[dayIdx],
      date: key,
      user: history[key]?.[`${userRole}Count`] || 0,
      partner: history[key]?.[`${partnerRole}Count`] || 0,
      isToday,
    });
  }

  const maxVal = Math.max(...data.map(d => Math.max(d.user, d.partner)), 1);

  return `
    <div class="weekly-chart-interactive">
      ${data.map((d, idx) => `
        <div class="chart-col ${d.isToday ? 'today' : ''}" data-idx="${idx}" data-date="${d.date}">
          <div class="chart-value-label text-xs" style="opacity:0">${d.user}</div>
          <div class="chart-bars-wrapper">
            <div class="chart-bar-animated user-bar" style="height:${Math.max((d.user / maxVal) * 100, 6)}%"></div>
            <div class="chart-bar-animated partner-bar" style="height:${Math.max((d.partner / maxVal) * 100, 6)}%"></div>
          </div>
          <span class="chart-day-label ${d.isToday ? 'today' : ''}">${d.label}</span>
        </div>
      `).join('')}
    </div>
    <div class="chart-tooltip" id="chart-tooltip" style="display:none">
      <div id="tooltip-content"></div>
    </div>
    <div class="flex-between text-xs text-muted" style="margin-top:var(--space-sm)">
      <span style="display:flex;align-items:center;gap:4px"><span class="legend-dot user-dot"></span> ${user.name}</span>
      <span style="display:flex;align-items:center;gap:4px"><span class="legend-dot partner-dot"></span> ${partner.name}</span>
    </div>
  `;
}

function _wireWeeklyChart(container, userRole, partnerRole) {
  const cols = container.querySelectorAll('.chart-col');
  const tooltip = container.querySelector('#chart-tooltip');
  const tooltipContent = container.querySelector('#tooltip-content');

  cols.forEach(col => {
    col.addEventListener('click', () => {
      const date = col.dataset.date;
      const history = store.state.history || {};
      const userCount = history[date]?.[`${userRole}Count`] || 0;
      const partnerCount = history[date]?.[`${store.getPartnerRole()}Count`] || 0;
      const dateObj = new Date(date + 'T12:00:00');
      const dateStr = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

      // Toggle tooltip
      if (tooltip.style.display !== 'none' && tooltip.dataset.date === date) {
        tooltip.style.display = 'none';
        col.classList.remove('active');
        return;
      }

      cols.forEach(c => c.classList.remove('active'));
      col.classList.add('active');

      tooltipContent.innerHTML = `
        <div class="text-sm" style="font-weight:var(--fw-semibold);margin-bottom:4px;text-transform:capitalize">${dateStr}</div>
        <div class="flex gap-lg">
          <div class="flex gap-xs" style="align-items:center">
            <span class="legend-dot user-dot"></span>
            <span class="text-xs">${userCount} tarefas</span>
          </div>
          <div class="flex gap-xs" style="align-items:center">
            <span class="legend-dot partner-dot"></span>
            <span class="text-xs">${partnerCount} tarefas</span>
          </div>
        </div>
      `;

      tooltip.dataset.date = date;
      tooltip.style.display = 'block';
    });
  });
}

// ─── Interactive Monthly Calendar ──────────────────────────────────────────

function renderMonthlyCalendar(year, month, userRole, partnerRole) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = lastDay.getDate();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const history = store.state.history || {};

  let html = `
    <div class="cal-header">
      <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
    </div>
    <div class="cal-grid">
  `;

  // Empty cells before month starts
  for (let i = 0; i < startDayOfWeek; i++) {
    html += '<div class="cal-cell empty"></div>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateKey = date.toISOString().slice(0, 10);
    const isToday = dateKey === todayStr;
    const isFuture = date > today;

    const userCount = history[dateKey]?.[`${userRole}Count`] || 0;
    const partnerCount = history[dateKey]?.[`${partnerRole}Count`] || 0;
    const totalCount = userCount + partnerCount;

    // Activity level
    let level = '';
    if (totalCount >= 12) level = 'level-4';
    else if (totalCount >= 8) level = 'level-3';
    else if (totalCount >= 4) level = 'level-2';
    else if (totalCount >= 1) level = 'level-1';

    html += `
      <div class="cal-cell ${level} ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''}"
           data-date="${dateKey}"
           data-user="${userCount}"
           data-partner="${partnerCount}"
           title="${dateKey}: ${totalCount} atividades">
        <span class="cal-day-num">${day}</span>
        ${totalCount > 0 && !isFuture ? `
          <div class="cal-activity-dots">
            ${userCount > 0 ? '<span class="cal-dot user"></span>' : ''}
            ${partnerCount > 0 ? '<span class="cal-dot partner"></span>' : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  // Fill remaining cells
  const totalCells = startDayOfWeek + daysInMonth;
  const remaining = totalCells % 7 !== 0 ? 7 - (totalCells % 7) : 0;
  for (let i = 0; i < remaining; i++) {
    html += '<div class="cal-cell empty"></div>';
  }

  html += '</div>';

  // Day detail panel
  html += '<div class="cal-day-detail" id="cal-day-detail" style="display:none"></div>';

  // Legend
  html += `
    <div class="cal-legend">
      <span class="text-xs text-muted">Menos</span>
      <div class="cal-legend-cells">
        <div class="cal-legend-cell"></div>
        <div class="cal-legend-cell level-1"></div>
        <div class="cal-legend-cell level-2"></div>
        <div class="cal-legend-cell level-3"></div>
        <div class="cal-legend-cell level-4"></div>
      </div>
      <span class="text-xs text-muted">Mais</span>
    </div>
  `;

  return html;
}

function _wireCalendarDays(container, userRole, partnerRole) {
  const cells = container.querySelectorAll('.cal-cell:not(.empty)');
  const detailPanel = container.querySelector('#cal-day-detail');

  cells.forEach(cell => {
    cell.addEventListener('click', () => {
      const date = cell.dataset.date;
      const userCount = parseInt(cell.dataset.user) || 0;
      const partnerCount = parseInt(cell.dataset.partner) || 0;
      const dateObj = new Date(date + 'T12:00:00');
      const dateStr = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

      // Toggle
      if (detailPanel.style.display !== 'none' && detailPanel.dataset.date === date) {
        detailPanel.style.display = 'none';
        cell.classList.remove('selected');
        return;
      }

      cells.forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');

      const user = store.getUser();
      const partner = store.getPartner();
      const totalCount = userCount + partnerCount;

      detailPanel.innerHTML = `
        <div class="cal-detail-header text-sm" style="font-weight:var(--fw-semibold);text-transform:capitalize;margin-bottom:var(--space-sm)">
          📅 ${dateStr}
        </div>
        ${totalCount === 0 ? `
          <div class="text-xs text-muted">Sem atividades registradas</div>
        ` : `
          <div class="cal-detail-stats">
            <div class="cal-stat">
              <div class="cal-stat-icon user-bg">${user?.name?.[0] || 'P'}</div>
              <div>
                <div class="text-sm" style="font-weight:var(--fw-medium)">${user?.name || 'Você'}</div>
                <div class="text-xs text-muted">${userCount} tarefa${userCount !== 1 ? 's' : ''} concluída${userCount !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div class="cal-stat">
              <div class="cal-stat-icon partner-bg">${partner?.name?.[0] || 'P'}</div>
              <div>
                <div class="text-sm" style="font-weight:var(--fw-medium)">${partner?.name || 'Parceiro'}</div>
                <div class="text-xs text-muted">${partnerCount} tarefa${partnerCount !== 1 ? 's' : ''} concluída${partnerCount !== 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>
          <div class="cal-detail-bar" style="margin-top:var(--space-sm)">
            <div class="cal-bar-segment user-bar" style="flex:${Math.max(userCount, 0.1)}"></div>
            <div class="cal-bar-segment partner-bar" style="flex:${Math.max(partnerCount, 0.1)}"></div>
          </div>
        `}
      `;

      detailPanel.dataset.date = date;
      detailPanel.style.display = 'block';
    });
  });
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
      icon: '📿',
      title: 'Devoto',
      desc: 'Complete o Terço 7 dias seguidos',
      unlocked: false,
      progress: (() => {
        const terco = store.getPlan('terco-semanal');
        if (!terco) return 0;
        const done = terco.items.filter(i => i[userRole]).length;
        return (done / 7) * 100;
      })(),
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
