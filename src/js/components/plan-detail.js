/* ===================================
   P&G — Plan Detail Component
   Checklist with edit/delete capabilities
   =================================== */

import { store } from '../store.js';
import { router } from '../router.js';
import { createProgressRing, showToast, triggerConfetti, showModal } from '../ui.js';

export function renderPlanDetail(params = {}) {
  const planId = params.id;
  const plan = store.getPlan(planId);
  const user = store.getUser();
  const partner = store.getPartner();

  if (!plan || !user) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'page-container';
    errorDiv.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">😵</div>
        <div class="empty-state-title">Plano não encontrado</div>
        <button class="btn btn-primary" id="back-from-error">Voltar</button>
      </div>`;
    errorDiv.querySelector('#back-from-error')?.addEventListener('click', () => router.navigate('/plans'));
    return errorDiv;
  }

  const userRole = user.role;
  const partnerRole = store.getPartnerRole();
  const progress = store.getPlanProgress(plan.id, userRole);
  const partnerProgress = store.getPlanProgress(plan.id, partnerRole);

  const div = document.createElement('div');
  div.className = 'page-container';

  div.innerHTML = `
    <div class="page-header">
      <div class="page-header-back" id="plan-back">←</div>
      <h1 class="page-header-title">${plan.icon || '📝'} ${plan.title}</h1>
      ${!plan.isFixed ? `<button class="btn btn-icon btn-ghost" id="plan-menu" title="Opções">⋯</button>` : ''}
    </div>

    ${plan.description ? `<div class="text-sm text-secondary" style="margin-bottom:var(--space-lg)">${plan.description}</div>` : ''}

    ${plan.isFixed ? `
      <div class="badge badge-primary" style="margin-bottom:var(--space-base)">
        📿 Plano fixo — reseta toda semana
      </div>
    ` : ''}

    <!-- Progress -->
    <div class="card" style="margin-bottom:var(--space-lg)">
      <div class="flex-between" style="margin-bottom:var(--space-md)">
        <div>
          <div class="text-sm text-secondary">${user.name}</div>
          <div class="heading-sm text-gradient">${progress}%</div>
        </div>
        <div style="text-align:right">
          <div class="text-sm text-secondary">${partner.name}</div>
          <div class="heading-sm" style="color:var(--color-primary-light)">${partnerProgress}%</div>
        </div>
      </div>
      <div style="display:flex;gap:var(--space-sm)">
        <div style="flex:1;background:var(--border-color);border-radius:var(--radius-full);height:8px;overflow:hidden">
          <div style="width:${progress}%;height:100%;background:var(--gradient-primary);border-radius:var(--radius-full);transition:width 600ms var(--ease-out)"></div>
        </div>
        <div style="flex:1;background:var(--border-color);border-radius:var(--radius-full);height:8px;overflow:hidden">
          <div style="width:${partnerProgress}%;height:100%;background:var(--gradient-warm);border-radius:var(--radius-full);transition:width 600ms var(--ease-out)"></div>
        </div>
      </div>
    </div>

    <!-- Checklist -->
    <div class="section-header">
      <h2 class="section-title">Tarefas</h2>
      <span class="badge badge-primary" id="task-count-badge">${plan.items.filter(i => i[userRole]).length}/${plan.items.length}</span>
    </div>

    <div class="card flex-col" style="padding:var(--space-sm)" id="checklist-container">
      ${renderChecklist(plan, userRole, partnerRole, partner)}
    </div>

    ${!plan.isFixed ? `
      <button class="btn btn-secondary btn-full" id="add-task-btn" style="margin-top:var(--space-base)">
        + Adicionar Tarefa
      </button>
    ` : ''}
  `;

  // Wire up event listeners after DOM is ready
  setTimeout(() => {
    div.querySelector('#plan-back')?.addEventListener('click', () =>
      router.navigate('/plans')
    );
    div.querySelector('#plan-menu')?.addEventListener('click', () =>
      showPlanMenu(plan, div, userRole, partnerRole, partner)
    );
    div.querySelector('#add-task-btn')?.addEventListener('click', () =>
      openAddTaskModal(plan, div, userRole, partnerRole, partner)
    );
    _wireChecklist(div, plan, userRole, partnerRole, partner);
  }, 100);

  return div;
}

// ─── Checklist Rendering ──────────────────────────────────────────────────────

function renderChecklist(plan, userRole, partnerRole, partner) {
  if (plan.items.length === 0) {
    return `
      <div class="empty-state" style="padding:var(--space-lg)">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-title">Nenhuma tarefa</div>
      </div>`;
  }

  return plan.items.map(item => {
    const isChecked = item[userRole];
    const partnerChecked = item[partnerRole];
    const partnerStatusTitle = `${partner.name}: ${partnerChecked ? '✅ Feito' : '⏳ Pendente'}`;
    const isOverdue = !isChecked && store.isTaskOverdue(item, plan);

    // Deadline display
    let deadlineInfo = '';
    if (item.deadlineTime) {
      deadlineInfo += `⏰ ${item.deadlineTime}`;
    }
    if (item.deadlineDate) {
      deadlineInfo += ` 📅 ${formatShortDate(item.deadlineDate)}`;
    }

    return `
      <div class="checkbox-item ${isChecked ? 'checked' : ''} ${isOverdue ? 'overdue-item' : ''}" data-item-id="${item.id}">
        <div class="checkbox-box">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style="flex:1;min-width:0">
          <div class="checkbox-label">${item.title}</div>
          ${deadlineInfo ? `<div class="text-xs ${isOverdue ? 'text-overdue' : 'text-muted'}" style="margin-top:2px">${deadlineInfo}${isOverdue ? ' — Atrasada!' : ''}</div>` : ''}
        </div>
        ${!plan.isFixed ? `
          <button class="item-edit-btn btn btn-icon btn-ghost"
            data-edit-item-id="${item.id}"
            title="Editar tarefa"
            style="width:28px;height:28px;font-size:0.8rem;flex-shrink:0">✏️</button>
        ` : ''}
        <div class="checkbox-partner-status" title="${partnerStatusTitle}" id="partner-status-${item.id}"></div>
      </div>
    `;
  }).join('');
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T12:00:00');
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Hoje';
  if (dateStr === tomorrow) return 'Amanhã';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/**
 * Wire checkbox toggles and edit buttons. Called after innerHTML is set.
 */
function _wireChecklist(container, plan, userRole, partnerRole, partner) {
  // Inject partner status dots
  plan.items.forEach(item => {
    const statusEl = container.querySelector(`#partner-status-${item.id}`);
    if (!statusEl) return;
    const partnerChecked = item[partnerRole];
    statusEl.innerHTML = '';
    const dot = document.createElement('div');
    dot.style.cssText = `width:22px;height:22px;font-size:0.65rem;background:${partnerChecked ? 'var(--gradient-success)' : 'var(--bg-input)'};border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden`;

    if (partnerChecked) {
      dot.textContent = '✓';
    } else {
      const img = document.createElement('img');
      img.src = partner.avatar;
      img.alt = partner.name;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover';
      img.onerror = () => { img.remove(); dot.textContent = '⏳'; };
      dot.appendChild(img);
    }
    statusEl.appendChild(dot);
  });

  // Checkbox toggle listeners
  container.querySelectorAll('.checkbox-item').forEach(el => {
    const checkboxBox = el.querySelector('.checkbox-box');
    const label = el.querySelector('.checkbox-label');

    const handleToggle = () => {
      const itemId = el.dataset.itemId;
      const item = store.toggleItem(plan.id, itemId, userRole);
      if (!item) return;

      el.classList.toggle('checked', item[userRole]);

      if (item[userRole]) {
        const allDone = plan.items.every(i => i[userRole]);
        if (allDone) {
          triggerConfetti();
          showToast('Plano completo! 🎉 Parabéns!', '🏆', 4000);
        } else {
          showToast('Tarefa concluída! ✅', '👏');
        }
      }

      _updateTaskBadge(container, plan, userRole);
    };

    checkboxBox?.addEventListener('click', (e) => { e.stopPropagation(); handleToggle(); });
    label?.addEventListener('click', (e) => { e.stopPropagation(); handleToggle(); });
  });

  // Edit button listeners
  container.querySelectorAll('.item-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const itemId = btn.dataset.editItemId;
      const item = plan.items.find(i => i.id === itemId);
      if (item) openEditItemModal(plan, item, container, userRole, partnerRole, partner);
    });
  });
}

function _refreshChecklist(container, plan, userRole, partnerRole, partner) {
  const cl = container.querySelector('#checklist-container');
  if (cl) {
    cl.innerHTML = renderChecklist(plan, userRole, partnerRole, partner);
    _wireChecklist(container, plan, userRole, partnerRole, partner);
  }
  _updateTaskBadge(container, plan, userRole);
}

function _updateTaskBadge(container, plan, userRole) {
  const badge = container.querySelector('#task-count-badge');
  if (badge) badge.textContent = `${plan.items.filter(i => i[userRole]).length}/${plan.items.length}`;
}

// ─── Modals ───────────────────────────────────────────────────────────────────

async function openEditItemModal(plan, item, container, userRole, partnerRole, partner) {
  await showModal('Editar Tarefa', `
    <div class="flex-col gap-lg">
      <div class="input-group">
        <label class="input-label">Título da tarefa</label>
        <input class="input" id="edit-task-title" type="text" value="${item.title}" autocomplete="off" autofocus />
      </div>
      <div class="input-group">
        <label class="input-label">📅 Data limite (opcional)</label>
        <input class="input" id="edit-task-date" type="date" value="${item.deadlineDate || ''}" />
      </div>
      <div class="input-group">
        <label class="input-label">⏰ Hora limite (opcional)</label>
        <input class="input" id="edit-task-time" type="time" value="${item.deadlineTime || ''}" />
      </div>
      <button class="btn btn-primary btn-full" id="save-task-btn">Salvar ✅</button>
      <button class="btn btn-ghost btn-full" id="delete-task-btn" style="color:#c47a6e">
        🗑️ Excluir Tarefa
      </button>
    </div>
  `, {
    onMount: (overlay, close) => {
      const input = overlay.querySelector('#edit-task-title');
      setTimeout(() => { input?.focus(); input?.select(); }, 300);
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') overlay.querySelector('#save-task-btn')?.click();
      });

      overlay.querySelector('#save-task-btn')?.addEventListener('click', () => {
        const title = input?.value.trim();
        if (!title) { showToast('Digite um título', '✏️'); return; }
        const deadlineDate = overlay.querySelector('#edit-task-date')?.value || null;
        const deadlineTime = overlay.querySelector('#edit-task-time')?.value || null;
        store.updatePlanItem(plan.id, item.id, { title, deadlineDate, deadlineTime });
        close(true);
        showToast('Tarefa atualizada!', '✏️');
        _refreshChecklist(container, plan, userRole, partnerRole, partner);
      });

      overlay.querySelector('#delete-task-btn')?.addEventListener('click', () => {
        store.deletePlanItem(plan.id, item.id);
        close(true);
        showToast('Tarefa excluída', '🗑️');
        _refreshChecklist(container, plan, userRole, partnerRole, partner);
      });
    }
  });
}

async function openAddTaskModal(plan, container, userRole, partnerRole, partner) {
  await showModal('Nova Tarefa', `
    <div class="flex-col gap-lg">
      <div class="input-group">
        <label class="input-label">Título da tarefa</label>
        <input class="input" id="new-task-title" type="text" placeholder="Ex: Ler capítulo 5" autocomplete="off" autofocus />
      </div>
      <div class="input-group">
        <label class="input-label">📅 Data limite (opcional)</label>
        <input class="input" id="new-task-date" type="date" />
      </div>
      <div class="input-group">
        <label class="input-label">⏰ Hora limite (opcional)</label>
        <input class="input" id="new-task-time" type="time" />
      </div>
      <button class="btn btn-primary btn-full" id="create-task-btn">Adicionar ✅</button>
    </div>
  `, {
    onMount: (overlay, close) => {
      const input = overlay.querySelector('#new-task-title');
      setTimeout(() => input?.focus(), 300);
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') overlay.querySelector('#create-task-btn')?.click();
      });

      overlay.querySelector('#create-task-btn')?.addEventListener('click', () => {
        const title = input?.value.trim();
        if (!title) { showToast('Digite um título', '✏️'); return; }
        const deadlineDate = overlay.querySelector('#new-task-date')?.value || null;
        const deadlineTime = overlay.querySelector('#new-task-time')?.value || null;
        store.addPlanItem(plan.id, { title, deadlineDate, deadlineTime });
        close(true);
        showToast('Tarefa adicionada!', '📝');
        _refreshChecklist(container, plan, userRole, partnerRole, partner);
      });
    }
  });
}

async function showPlanMenu(plan, container, userRole, partnerRole, partner) {
  await showModal('Opções', `
    <div class="flex-col gap-sm">
      <button class="settings-item" id="menu-edit">
        <div class="settings-icon">✏️</div>
        <div class="settings-info">
          <div class="settings-name">Editar Plano</div>
          <div class="settings-desc">Alterar título, descrição ou ícone</div>
        </div>
      </button>
      <button class="settings-item" id="menu-delete" style="color:#c47a6e">
        <div class="settings-icon" style="background:rgba(196,122,110,0.1)">🗑️</div>
        <div class="settings-info">
          <div class="settings-name" style="color:#c47a6e">Excluir Plano</div>
          <div class="settings-desc">Esta ação não pode ser desfeita</div>
        </div>
      </button>
    </div>
  `, {
    onMount: (overlay, close) => {
      overlay.querySelector('#menu-edit')?.addEventListener('click', () => {
        close();
        openEditPlanModal(plan, container, userRole, partnerRole, partner);
      });
      overlay.querySelector('#menu-delete')?.addEventListener('click', () => {
        store.deletePlan(plan.id);
        close();
        showToast('Plano excluído', '🗑️');
        router.navigate('/plans');
      });
    }
  });
}

async function openEditPlanModal(plan, container, userRole, partnerRole, partner) {
  await showModal('Editar Plano', `
    <div class="flex-col gap-lg">
      <div class="input-group">
        <label class="input-label">Título do plano</label>
        <input class="input" id="edit-plan-title" type="text" value="${plan.title}" autocomplete="off" />
      </div>
      <div class="input-group">
        <label class="input-label">Descrição (opcional)</label>
        <input class="input" id="edit-plan-desc" type="text" value="${plan.description || ''}" placeholder="Breve descrição" autocomplete="off" />
      </div>
      <div class="input-group">
        <label class="input-label">Ícone (emoji)</label>
        <input class="input" id="edit-plan-icon" type="text" value="${plan.icon || '📝'}" style="width:60px;text-align:center;font-size:1.5rem" />
      </div>
      <button class="btn btn-primary btn-full" id="save-plan-btn">Salvar ✅</button>
    </div>
  `, {
    onMount: (overlay, close) => {
      overlay.querySelector('#save-plan-btn')?.addEventListener('click', () => {
        const title = overlay.querySelector('#edit-plan-title')?.value.trim();
        if (!title) { showToast('Digite um título', '✏️'); return; }
        store.updatePlan(plan.id, {
          title,
          description: overlay.querySelector('#edit-plan-desc')?.value.trim() || '',
          icon: overlay.querySelector('#edit-plan-icon')?.value.trim() || '📝',
        });
        close(true);
        showToast('Plano atualizado!', '✏️');

        // Re-render the detail page
        const pageContent = document.getElementById('page-content');
        if (pageContent) {
          pageContent.innerHTML = '';
          const newContent = renderPlanDetail({ id: plan.id });
          if (newContent instanceof HTMLElement) {
            pageContent.appendChild(newContent);
          }
          pageContent.classList.add('page-enter');
        }
      });
    }
  });
}
