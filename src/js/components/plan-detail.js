/* ===================================
   P&G — Plan Detail Component
   Checklist view with animations
   =================================== */

import { store } from '../store.js';
import { router } from '../router.js';
import { getCategoryInfo, createProgressRing, showToast, triggerConfetti, showModal } from '../ui.js';

export function renderPlanDetail(params = {}) {
  const planId = params.id;
  const plan = store.getPlan(planId);
  const user = store.getUser();
  const partner = store.getPartner();

  if (!plan || !user) {
    return `<div class="page-container"><div class="empty-state">
      <div class="empty-state-icon">😵</div>
      <div class="empty-state-title">Plano não encontrado</div>
      <button class="btn btn-primary" onclick="window.location.hash='#/plans'">Voltar</button>
    </div></div>`;
  }

  const cat = getCategoryInfo(plan.categoryId);
  const userRole = user.role;
  const partnerRole = store.getPartnerRole();
  const progress = store.getPlanProgress(plan.id, userRole);
  const partnerProgress = store.getPlanProgress(plan.id, partnerRole);

  const div = document.createElement('div');
  div.className = 'page-container';

  div.innerHTML = `
    <div class="page-header">
      <div class="page-header-back" id="plan-back">←</div>
      <h1 class="page-header-title">${plan.icon || cat.icon} ${plan.title}</h1>
      <button class="btn btn-icon btn-ghost" id="plan-menu">⋯</button>
    </div>

    ${plan.description ? `<div class="text-sm text-secondary" style="margin-bottom:var(--space-lg)">${plan.description}</div>` : ''}

    <!-- Progress -->
    <div class="card" style="margin-bottom:var(--space-lg)">
      <div class="flex-between" style="margin-bottom:var(--space-md)">
        <div>
          <div class="text-sm text-secondary">${user.name}</div>
          <div class="heading-sm text-gradient">${progress}%</div>
        </div>
        <div style="text-align:right">
          <div class="text-sm text-secondary">${partner.name}</div>
          <div class="heading-sm" style="color:var(--color-${cat.color})">${partnerProgress}%</div>
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
      <span class="badge badge-primary">${plan.items.filter(i => i[userRole]).length}/${plan.items.length}</span>
    </div>

    <div class="card flex-col" style="padding:var(--space-sm)" id="checklist-container">
      ${renderChecklist(plan, userRole, partnerRole, partner)}
    </div>

    <button class="btn btn-secondary btn-full" id="add-task-btn" style="margin-top:var(--space-base)">
      + Adicionar Tarefa
    </button>
  `;

  setTimeout(() => {
    div.querySelector('#plan-back')?.addEventListener('click', () => router.navigate('/plans', { categoryId: plan.categoryId }));
    div.querySelector('#plan-menu')?.addEventListener('click', () => showPlanMenu(plan));
    setupCheckboxListeners(div, plan, userRole);
    div.querySelector('#add-task-btn')?.addEventListener('click', () => openAddTaskModal(plan, div, userRole, partnerRole, partner));
  }, 100);

  return div;
}

function renderChecklist(plan, userRole, partnerRole, partner) {
  if (plan.items.length === 0) {
    return `<div class="empty-state" style="padding:var(--space-lg)">
      <div class="empty-state-icon">📝</div>
      <div class="empty-state-title">Nenhuma tarefa</div>
    </div>`;
  }

  return plan.items.map(item => {
    const isChecked = item[userRole];
    const partnerChecked = item[partnerRole];

    return `
      <div class="checkbox-item ${isChecked ? 'checked' : ''}" data-item-id="${item.id}">
        <div class="checkbox-box">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="checkbox-label">${item.title}</div>
        <div class="checkbox-partner-status" title="${partner.name}: ${partnerChecked ? '✅' : '⏳'}">
          <div style="width:22px;height:22px;font-size:0.65rem;background:${partnerChecked ? 'var(--gradient-success)' : 'var(--bg-input)'};border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden">
            ${partnerChecked ? '✓' : `<img src="${partner.avatar}" style="width:100%;height:100%;object-fit:cover" onerror="this.outerHTML='⏳'" />`}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function setupCheckboxListeners(container, plan, userRole) {
  container.querySelectorAll('.checkbox-item').forEach(el => {
    el.addEventListener('click', () => {
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

      const badge = container.querySelector('.badge-primary');
      if (badge) badge.textContent = `${plan.items.filter(i => i[userRole]).length}/${plan.items.length}`;
    });
  });
}

async function openAddTaskModal(plan, container, userRole, partnerRole, partner) {
  await showModal('Nova Tarefa', `
    <div class="flex-col gap-lg">
      <div class="input-group">
        <label class="input-label">Título da tarefa</label>
        <input class="input" id="new-task-title" type="text" placeholder="Ex: Ler capítulo 5" autocomplete="off" autofocus />
      </div>
      <button class="btn btn-primary btn-full" id="create-task-btn">Adicionar ✅</button>
    </div>
  `, {
    onMount: (overlay, close) => {
      const input = overlay.querySelector('#new-task-title');
      setTimeout(() => input?.focus(), 300);
      input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') overlay.querySelector('#create-task-btn')?.click(); });

      overlay.querySelector('#create-task-btn')?.addEventListener('click', () => {
        const title = input?.value.trim();
        if (!title) { showToast('Digite um título', '✏️'); return; }
        store.addPlanItem(plan.id, { title });
        close(true);
        showToast('Tarefa adicionada! 📝', '✅');

        const cl = container.querySelector('#checklist-container');
        if (cl) { cl.innerHTML = renderChecklist(plan, userRole, partnerRole, partner); setupCheckboxListeners(container, plan, userRole); }
        const badge = container.querySelector('.badge-primary');
        if (badge) badge.textContent = `${plan.items.filter(i => i[userRole]).length}/${plan.items.length}`;
      });
    }
  });
}

async function showPlanMenu(plan) {
  await showModal('Opções', `
    <div class="flex-col gap-sm">
      <button class="settings-item" id="menu-delete" style="color:#ef4444">
        <div class="settings-icon" style="background:rgba(239,68,68,0.1)">🗑️</div>
        <div class="settings-info">
          <div class="settings-name" style="color:#ef4444">Excluir Plano</div>
          <div class="settings-desc">Esta ação não pode ser desfeita</div>
        </div>
      </button>
    </div>
  `, {
    onMount: (overlay, close) => {
      overlay.querySelector('#menu-delete')?.addEventListener('click', () => {
        store.deletePlan(plan.id);
        close();
        showToast('Plano excluído', '🗑️');
        router.navigate('/plans');
      });
    }
  });
}
