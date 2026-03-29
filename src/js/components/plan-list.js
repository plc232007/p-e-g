/* ===================================
   P&G — Plan List Component
   =================================== */

import { store, CATEGORIES } from '../store.js';
import { router } from '../router.js';
import { getCategoryInfo, createProgressRing, showModal, showToast } from '../ui.js';

export function renderPlanList(params = {}) {
  const selectedCategory = params.categoryId || null;
  const user = store.getUser();
  const partner = store.getPartner();
  if (!user) return '';

  const div = document.createElement('div');
  div.className = 'page-container';

  div.innerHTML = `
    <div class="page-header">
      ${selectedCategory ? `
        <div class="page-header-back" id="plans-back">←</div>
        <h1 class="page-header-title">${getCategoryInfo(selectedCategory).icon} ${getCategoryInfo(selectedCategory).name}</h1>
      ` : `<h1 class="page-header-title">📋 Nossos Planos</h1>`}
    </div>

    ${!selectedCategory ? renderCategoryFilter() : ''}

    <div class="flex-col gap-md stagger" id="plans-container">
      ${renderPlans(selectedCategory, user, partner)}
    </div>
  `;

  const fab = document.createElement('button');
  fab.className = 'fab ripple';
  fab.id = 'add-plan-fab';
  fab.textContent = '+';
  div.appendChild(fab);

  setTimeout(() => {
    div.querySelector('#plans-back')?.addEventListener('click', () => router.navigate('/plans'));
    div.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const catId = chip.dataset.category;
        router.navigate('/plans', catId === 'all' ? {} : { categoryId: catId });
      });
    });
    div.querySelectorAll('.plan-card').forEach(card => {
      card.addEventListener('click', () => router.navigate(`/plan/${card.dataset.planId}`));
    });
    fab.addEventListener('click', () => openNewPlanModal(selectedCategory));
  }, 100);

  return div;
}

function renderCategoryFilter() {
  return `
    <div style="display:flex;gap:var(--space-sm);overflow-x:auto;padding-bottom:var(--space-base);margin-bottom:var(--space-base);-webkit-overflow-scrolling:touch">
      <button class="filter-chip btn btn-sm btn-secondary" data-category="all" style="flex-shrink:0">Todos</button>
      ${CATEGORIES.map(cat => `
        <button class="filter-chip btn btn-sm btn-ghost" data-category="${cat.id}" style="flex-shrink:0">${cat.icon} ${cat.name}</button>
      `).join('')}
    </div>
  `;
}

function renderPlans(categoryId, user, partner) {
  const plans = categoryId ? store.getPlans(categoryId) : store.getPlans();
  const userRole = user.role;
  const partnerRole = store.getPartnerRole();

  if (plans.length === 0) {
    return `<div class="empty-state">
      <div class="empty-state-icon">${categoryId ? getCategoryInfo(categoryId).icon : '📋'}</div>
      <div class="empty-state-title">Nenhum plano ainda</div>
      <div class="empty-state-text">Toque no + para criar</div>
    </div>`;
  }

  return plans.map(plan => {
    const cat = getCategoryInfo(plan.categoryId);
    const progress = store.getPlanProgress(plan.id, userRole);
    const partnerProg = store.getPlanProgress(plan.id, partnerRole);
    const completed = plan.items.filter(i => i[userRole]).length;

    return `
      <div class="card card-interactive plan-card" data-plan-id="${plan.id}" style="padding:var(--space-base) var(--space-lg)">
        <div class="flex gap-base" style="align-items:center">
          <div class="category-icon" data-category="${plan.categoryId}" style="width:42px;height:42px;font-size:1.3rem">${plan.icon || cat.icon}</div>
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

async function openNewPlanModal(preSelectedCategory) {
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
        <label class="input-label">Categoria</label>
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-sm)">
          ${CATEGORIES.map(cat => `
            <button class="cat-select-btn btn btn-sm ${cat.id === preSelectedCategory ? 'btn-primary' : 'btn-secondary'}" data-cat="${cat.id}" type="button">
              ${cat.icon} ${cat.name}
            </button>
          `).join('')}
        </div>
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
      let selectedCat = preSelectedCategory || CATEGORIES[0].id;
      overlay.querySelectorAll('.cat-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          overlay.querySelectorAll('.cat-select-btn').forEach(b => b.className = 'cat-select-btn btn btn-sm btn-secondary');
          btn.className = 'cat-select-btn btn btn-sm btn-primary';
          selectedCat = btn.dataset.cat;
        });
      });
      overlay.querySelector('#create-plan-btn')?.addEventListener('click', () => {
        const title = overlay.querySelector('#new-plan-title')?.value.trim();
        if (!title) { showToast('Digite um título', '✏️'); return; }
        const plan = store.addPlan({
          categoryId: selectedCat,
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
