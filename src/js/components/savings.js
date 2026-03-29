/* ===================================
   P&G — Savings Component
   Financial tracking module
   =================================== */

import { store, PROFILES } from '../store.js';
import { showModal, showToast } from '../ui.js';

export function renderSavings() {
  const savings = store.getSavings();
  const user = store.getUser();
  const partner = store.getPartner();

  const div = document.createElement('div');
  div.className = 'page-container';

  const goalPercent = savings.goal ? Math.min(Math.round((savings.total / savings.goal) * 100), 100) : null;

  div.innerHTML = `
    <div class="page-header">
      <h1 class="page-header-title">💰 Poupança</h1>
      <button class="btn btn-icon btn-ghost" id="savings-goal-btn" title="Definir meta">🎯</button>
    </div>

    <!-- Total Card -->
    <div class="card savings-total-card" style="margin-bottom:var(--space-lg);text-align:center;position:relative;overflow:hidden">
      <div style="position:absolute;top:-20px;right:-20px;font-size:6rem;opacity:0.05">💰</div>
      <div class="text-sm text-secondary" style="margin-bottom:var(--space-xs)">Total Guardado</div>
      <div class="savings-amount heading-xl text-gradient" id="savings-total">
        ${formatCurrency(savings.total)}
      </div>
      ${savings.goal ? `
        <div style="margin-top:var(--space-base)">
          <div class="flex-between text-xs text-muted" style="margin-bottom:4px">
            <span>Meta: ${savings.goalDescription || 'Meta'}</span>
            <span>${goalPercent}% de ${formatCurrency(savings.goal)}</span>
          </div>
          <div style="background:var(--border-color);border-radius:var(--radius-full);height:8px;overflow:hidden">
            <div style="width:${goalPercent}%;height:100%;background:var(--gradient-success);border-radius:var(--radius-full);transition:width 800ms var(--ease-out)"></div>
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Action Buttons -->
    <div style="display:flex;gap:var(--space-md);margin-bottom:var(--space-xl)">
      <button class="btn btn-primary btn-full" id="add-deposit-btn" style="flex:1">
        <span>+</span> Adicionar
      </button>
      <button class="btn btn-secondary btn-full" id="add-withdrawal-btn" style="flex:1">
        <span>−</span> Retirar
      </button>
    </div>

    <!-- Transactions -->
    <div class="section-header">
      <h2 class="section-title">Histórico</h2>
      <span class="badge badge-primary">${savings.transactions?.length || 0} registros</span>
    </div>

    <div class="flex-col gap-sm stagger" id="transactions-list">
      ${renderTransactions(savings.transactions || [])}
    </div>
  `;

  // Setup interactions
  setTimeout(() => {
    div.querySelector('#add-deposit-btn')?.addEventListener('click', () => openTransactionModal('deposit', div));
    div.querySelector('#add-withdrawal-btn')?.addEventListener('click', () => openTransactionModal('withdrawal', div));
    div.querySelector('#savings-goal-btn')?.addEventListener('click', () => openGoalModal(div));
  }, 100);

  return div;
}

function renderTransactions(transactions) {
  if (transactions.length === 0) {
    return `
      <div class="empty-state" style="padding:var(--space-xl)">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-title">Nenhuma transação</div>
        <div class="empty-state-text">Adicione o valor que vocês têm guardado para começar!</div>
      </div>
    `;
  }

  return transactions.slice(0, 50).map(tx => {
    const isDeposit = tx.type === 'deposit';
    const profile = PROFILES[tx.who] || PROFILES.user1;
    const date = new Date(tx.date);
    const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="card card-sm flex gap-base" style="align-items:center;padding:var(--space-md) var(--space-base)">
        <div style="width:36px;height:36px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;font-size:1.1rem;background:${isDeposit ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}">
          ${isDeposit ? '📈' : '📉'}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:var(--fw-medium);font-size:var(--fs-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${tx.description || (isDeposit ? 'Depósito' : 'Retirada')}
          </div>
          <div class="text-xs text-muted">${profile.name} · ${dateStr} às ${timeStr}</div>
        </div>
        <div style="font-family:var(--font-display);font-weight:var(--fw-bold);font-size:var(--fs-sm);color:${isDeposit ? '#10b981' : '#ef4444'}">
          ${isDeposit ? '+' : '−'} ${formatCurrency(tx.amount)}
        </div>
      </div>
    `;
  }).join('');
}

async function openTransactionModal(type, container) {
  const isDeposit = type === 'deposit';
  const formHTML = `
    <div class="flex-col gap-lg">
      <div class="input-group">
        <label class="input-label">Valor (R$)</label>
        <input class="input input-lg" id="tx-amount" type="number" inputmode="decimal" step="0.01" min="0.01" placeholder="0,00" autofocus />
      </div>
      <div class="input-group">
        <label class="input-label">Descrição</label>
        <input class="input" id="tx-description" type="text" placeholder="${isDeposit ? 'Ex: Salário março' : 'Ex: Conta de luz'}" autocomplete="off" />
      </div>
      <button class="btn ${isDeposit ? 'btn-primary' : 'btn-danger'} btn-full" id="confirm-tx-btn">
        ${isDeposit ? '+ Adicionar' : '− Retirar'}
      </button>
    </div>
  `;

  await showModal(isDeposit ? 'Adicionar Dinheiro' : 'Retirar Dinheiro', formHTML, {
    onMount: (overlay, close) => {
      const amountInput = overlay.querySelector('#tx-amount');
      setTimeout(() => amountInput?.focus(), 300);

      amountInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') overlay.querySelector('#confirm-tx-btn')?.click();
      });

      overlay.querySelector('#confirm-tx-btn')?.addEventListener('click', () => {
        const amount = parseFloat(amountInput?.value);
        if (!amount || amount <= 0) {
          showToast('Digite um valor válido', '⚠️');
          return;
        }

        const description = overlay.querySelector('#tx-description')?.value.trim() || '';
        store.addTransaction(amount, type, description);
        close();

        showToast(
          isDeposit ? `+${formatCurrency(amount)} adicionado! 💰` : `−${formatCurrency(amount)} retirado`,
          isDeposit ? '📈' : '📉'
        );

        // Re-render
        router_refresh(container);
      });
    }
  });
}

async function openGoalModal(container) {
  const savings = store.getSavings();
  const formHTML = `
    <div class="flex-col gap-lg">
      <div class="input-group">
        <label class="input-label">Meta (R$)</label>
        <input class="input input-lg" id="goal-amount" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0,00" value="${savings.goal || ''}" />
      </div>
      <div class="input-group">
        <label class="input-label">Para quê?</label>
        <input class="input" id="goal-desc" type="text" placeholder="Ex: Viagem, Casa, Casamento" value="${savings.goalDescription || ''}" autocomplete="off" />
      </div>
      <button class="btn btn-primary btn-full" id="save-goal-btn">Salvar Meta 🎯</button>
      ${savings.goal ? `<button class="btn btn-ghost btn-full" id="clear-goal-btn">Remover Meta</button>` : ''}
    </div>
  `;

  await showModal('Meta de Poupança', formHTML, {
    onMount: (overlay, close) => {
      overlay.querySelector('#save-goal-btn')?.addEventListener('click', () => {
        const amount = parseFloat(overlay.querySelector('#goal-amount')?.value);
        if (!amount || amount <= 0) {
          showToast('Digite um valor válido', '⚠️');
          return;
        }
        const desc = overlay.querySelector('#goal-desc')?.value.trim() || '';
        store.setSavingsGoal(amount, desc);
        close();
        showToast('Meta definida! 🎯');
        router_refresh(container);
      });

      overlay.querySelector('#clear-goal-btn')?.addEventListener('click', () => {
        store.setSavingsGoal(null, '');
        close();
        showToast('Meta removida');
        router_refresh(container);
      });
    }
  });
}

function router_refresh(container) {
  // Re-render savings page
  const pageContent = document.getElementById('page-content');
  if (pageContent) {
    pageContent.innerHTML = '';
    pageContent.appendChild(renderSavings());
    pageContent.classList.add('page-enter');
  }
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

// === Dashboard Savings Card (exported for use in dashboard) ===
export function renderSavingsCard() {
  const savings = store.getSavings();
  const goalPercent = savings.goal ? Math.min(Math.round((savings.total / savings.goal) * 100), 100) : null;

  return `
    <div class="card card-interactive" id="savings-card" style="cursor:pointer;position:relative;overflow:hidden">
      <div style="position:absolute;top:-10px;right:-10px;font-size:4rem;opacity:0.06">💰</div>
      <div class="flex-between" style="position:relative;z-index:1">
        <div>
          <div class="text-sm text-secondary" style="margin-bottom:2px">💰 Poupança</div>
          <div class="heading-sm text-gradient">${formatCurrency(savings.total)}</div>
          ${savings.goal ? `
            <div class="text-xs text-muted" style="margin-top:4px">${goalPercent}% da meta</div>
          ` : ''}
        </div>
        <div style="font-size:2rem;opacity:0.6">→</div>
      </div>
      ${savings.goal ? `
        <div style="margin-top:var(--space-sm);background:var(--border-color);border-radius:var(--radius-full);height:4px;overflow:hidden;position:relative;z-index:1">
          <div style="width:${goalPercent}%;height:100%;background:var(--gradient-success);border-radius:var(--radius-full)"></div>
        </div>
      ` : ''}
    </div>
  `;
}
