/* ===================================
   P&G — Plan List Component
   All plans with edit/delete
   =================================== */

import { store } from '../store.js';
import { router } from '../router.js';
import { createProgressRing, showModal, showToast } from '../ui.js';

export function renderPlanList(params = {}) {
  const user = store.getUser();
  const partner = store.getPartner();
  if (!user) return '';

  const div = document.createElement('div');
  div.className = 'page-container';

  div.innerHTML = `
    <div class="page-header">
      <h1 class="page-header-title">📋 Nossos Planos</h1>
    </div>

    <div class="flex-col gap-md stagger" id="plans-container">
      ${renderPlans(user, partner)}
    </div>
  `;

  // FAB — append to body for correct fixed positioning
  const existingFab = document.getElementById('add-plan-fab');
  if (existingFab) existingFab.remove();

  const fab = document.createElement('button');
  fab.className = 'fab ripple';
  fab.id = 'add-plan-fab';
  fab.textContent = '+';
  fab.style.cssText = 'position:fixed;right:1.25rem;left:auto;bottom:calc(4.25rem + env(safe-area-inset-bottom, 0px) + 1.5rem);';
  document.body.appendChild(fab);

  // Cleanup FAB on route change
  const cleanupFab = (e) => {
    const newRoute = e?.detail?.route || '';
    if (newRoute === '/plans') return;
    fab.remove();
    window.removeEventListener('routechange', cleanupFab);
  };
  window.addEventListener('routechange', cleanupFab);

  setTimeout(() => {
    div.querySelectorAll('.plan-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't navigate if clicking action buttons
        if (e.target.closest('.plan-action-btn')) return;
        router.navigate(`/plan/${card.dataset.planId}`);
      });
    });

    // Edit plan buttons
    div.querySelectorAll('.plan-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const planId = btn.dataset.planId;
        const plan = store.getPlan(planId);
        if (plan) openEditPlanModal(plan, div);
      });
    });

    // Delete plan buttons
    div.querySelectorAll('.plan-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const planId = btn.dataset.planId;
        const plan = store.getPlan(planId);
        if (plan) confirmDeletePlan(plan, div);
      });
    });

    fab.addEventListener('click', () => openNewPlanModal(div));
  }, 100);

  return div;
}

function renderPlans(user, partner) {
  const plans = store.getPlans();
  const userRole = user.role;
  const partnerRole = store.getPartnerRole();

  if (plans.length === 0) {
    return `<div class="empty-state">
      <div class="empty-state-icon">📋</div>
      <div class="empty-state-title">Nenhum plano ainda</div>
      <div class="empty-state-text">Toque no + para criar</div>
    </div>`;
  }

  return plans.map(plan => {
    const progress = store.getPlanProgress(plan.id, userRole);
    const partnerProg = store.getPlanProgress(plan.id, partnerRole);
    const completed = plan.items.filter(i => i[userRole]).length;
    const isFixed = plan.isFixed;

    return `
      <div class="card card-interactive plan-card" data-plan-id="${plan.id}" style="padding:var(--space-base) var(--space-lg)">
        <div class="flex gap-base" style="align-items:center">
          <div class="category-icon" data-category="${plan.categoryId}" style="width:42px;height:42px;font-size:1.3rem">${plan.icon || '📝'}</div>
          <div style="flex:1;min-width:0">
            <div class="flex gap-xs" style="align-items:center">
              <div style="font-family:var(--font-display);font-weight:var(--fw-semibold);font-size:var(--fs-md);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${plan.title}</div>
              ${isFixed ? '<span class="badge badge-primary" style="font-size:0.6rem">Fixo</span>' : ''}
            </div>
            <div class="text-sm text-secondary" style="margin-top:2px">
              ${completed}/${plan.items.length} · ${partner.name} ${partnerProg}%
            </div>
          </div>
          <div class="flex gap-xs" style="align-items:center">
            ${!isFixed ? `
              <button class="plan-action-btn plan-edit-btn btn btn-icon btn-ghost" data-plan-id="${plan.id}" title="Editar" style="width:32px;height:32px;font-size:0.85rem">✏️</button>
              <button class="plan-action-btn plan-delete-btn btn btn-icon btn-ghost" data-plan-id="${plan.id}" title="Excluir" style="width:32px;height:32px;font-size:0.85rem;color:#c47a6e">🗑️</button>
            ` : ''}
            ${createProgressRing(progress, 40, 3)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function _refreshList(container) {
  const pageContent = document.getElementById('page-content');
  if (pageContent) {
    pageContent.innerHTML = '';
    pageContent.appendChild(renderPlanList());
    pageContent.classList.add('page-enter');
  }
}

async function confirmDeletePlan(plan, container) {
  await showModal('Excluir Plano?', `
    <div class="flex-col gap-lg" style="text-align:center">
      <div style="font-size:3rem">${plan.icon || '📋'}</div>
      <div class="heading-sm">${plan.title}</div>
      <p class="text-secondary text-sm">Tem certeza? Todo o progresso será perdido.</p>
      <div class="flex gap-sm">
        <button class="btn btn-secondary btn-full" id="cancel-delete">Cancelar</button>
        <button class="btn btn-danger btn-full" id="confirm-delete">Excluir</button>
      </div>
    </div>
  `, {
    onMount: (overlay, close) => {
      overlay.querySelector('#cancel-delete')?.addEventListener('click', () => close());
      overlay.querySelector('#confirm-delete')?.addEventListener('click', () => {
        store.deletePlan(plan.id);
        close();
        showToast('Plano excluído', '🗑️');
        _refreshList(container);
      });
    }
  });
}

async function openEditPlanModal(plan, container) {
  const formHTML = `
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
  `;

  await showModal('Editar Plano', formHTML, {
    onMount: (overlay, close) => {
      const input = overlay.querySelector('#edit-plan-title');
      setTimeout(() => { input?.focus(); input?.select(); }, 300);

      overlay.querySelector('#save-plan-btn')?.addEventListener('click', () => {
        const title = input?.value.trim();
        if (!title) { showToast('Digite um título', '✏️'); return; }
        store.updatePlan(plan.id, {
          title,
          description: overlay.querySelector('#edit-plan-desc')?.value.trim() || '',
          icon: overlay.querySelector('#edit-plan-icon')?.value.trim() || '📝',
        });
        close(true);
        showToast('Plano atualizado!', '✏️');
        _refreshList(container);
      });
    }
  });
}

async function openNewPlanModal(container) {
  const formHTML = `
    <div class="flex-col gap-lg">
      <div class="input-group">
        <label class="input-label">Título do plano</label>
        <input class="input" id="new-plan-title" type="text" placeholder="Ex: Novena ao Sagrado Coração" autocomplete="off" />
      </div>
      <div class="input-group">
        <label class="input-label">Descrição (opcional)</label>
        <input class="input" id="new-plan-desc" type="text" placeholder="Breve descrição" autocomplete="off" />
      </div>
      <div class="input-group">
        <label class="input-label">Ícone (emoji)</label>
        <input class="input" id="new-plan-icon" type="text" value="📝" style="width:60px;text-align:center;font-size:1.5rem" />
      </div>
      <button class="btn btn-primary btn-full" id="create-plan-btn" type="button">Criar Plano ✨</button>
    </div>
  `;

  await showModal('Novo Plano', formHTML, {
    onMount: (overlay, close) => {
      const input = overlay.querySelector('#new-plan-title');
      setTimeout(() => input?.focus(), 300);
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') overlay.querySelector('#create-plan-btn')?.click();
      });

      overlay.querySelector('#create-plan-btn')?.addEventListener('click', () => {
        const title = input?.value.trim();
        if (!title) { showToast('Digite um título', '✏️'); return; }
        const plan = store.addPlan({
          categoryId: 'custom',
          title,
          description: overlay.querySelector('#new-plan-desc')?.value.trim() || '',
          icon: overlay.querySelector('#new-plan-icon')?.value.trim() || '📝',
        });
        close(plan);
        showToast(`"${title}" criado!`, '🎉');
        router.navigate(`/plan/${plan.id}`);
      });
    }
  });
}
