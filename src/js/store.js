/* ===================================
   P&G — State Management
   Firebase-synced reactive store
   =================================== */

import { saveToFirestore, loadFromFirestore, listenForChanges } from './firebase.js';

const LOCAL_PROFILE_KEY = 'pg_current_profile';
const LOCAL_CACHE_KEY = 'pg_data_cache';

// Fixed profiles
const PROFILES = {
  user1: { name: 'Pedro', avatar: '/images/pedro.png', role: 'user1' },
  user2: { name: 'Gabi', avatar: '/images/gabi.png', role: 'user2' },
};

// Default categories
const CATEGORIES = [
  { id: 'prayer', name: 'Oração', icon: '🙏', color: 'prayer' },
  { id: 'reading', name: 'Leitura', icon: '📖', color: 'reading' },
  { id: 'food', name: 'Alimentação', icon: '🍽️', color: 'food' },
  { id: 'exercise', name: 'Exercícios', icon: '💪', color: 'exercise' },
  { id: 'custom', name: 'Personalizado', icon: '✨', color: 'custom' },
];

// Pre-built plans
const DEFAULT_PLANS = [
  {
    id: 'rosario-diario',
    categoryId: 'prayer',
    title: 'Rosário Diário',
    description: 'Reze o Rosário completo todos os dias',
    icon: '📿',
    items: [
      { id: 'r1', title: 'Segunda — Mistérios Gozosos', user1: false, user2: false },
      { id: 'r2', title: 'Terça — Mistérios Dolorosos', user1: false, user2: false },
      { id: 'r3', title: 'Quarta — Mistérios Gloriosos', user1: false, user2: false },
      { id: 'r4', title: 'Quinta — Mistérios Luminosos', user1: false, user2: false },
      { id: 'r5', title: 'Sexta — Mistérios Dolorosos', user1: false, user2: false },
      { id: 'r6', title: 'Sábado — Mistérios Gozosos', user1: false, user2: false },
      { id: 'r7', title: 'Domingo — Mistérios Gloriosos', user1: false, user2: false },
    ],
    createdAt: Date.now(),
  },
  {
    id: 'leitura-biblica',
    categoryId: 'reading',
    title: 'Evangelho de São Marcos',
    description: 'Leia o Evangelho de Marcos juntos — 1 capítulo por dia',
    icon: '✝️',
    items: [
      { id: 'mc1', title: 'Marcos 1 — Início do Evangelho', user1: false, user2: false },
      { id: 'mc2', title: 'Marcos 2 — Cura do paralítico', user1: false, user2: false },
      { id: 'mc3', title: 'Marcos 3 — Os doze apóstolos', user1: false, user2: false },
      { id: 'mc4', title: 'Marcos 4 — Parábola do semeador', user1: false, user2: false },
      { id: 'mc5', title: 'Marcos 5 — O endemoninhado', user1: false, user2: false },
      { id: 'mc6', title: 'Marcos 6 — Multiplicação dos pães', user1: false, user2: false },
      { id: 'mc7', title: 'Marcos 7 — Tradições dos fariseus', user1: false, user2: false },
      { id: 'mc8', title: 'Marcos 8 — Confissão de Pedro', user1: false, user2: false },
      { id: 'mc9', title: 'Marcos 9 — Transfiguração', user1: false, user2: false },
      { id: 'mc10', title: 'Marcos 10 — O jovem rico', user1: false, user2: false },
      { id: 'mc11', title: 'Marcos 11 — Entrada em Jerusalém', user1: false, user2: false },
      { id: 'mc12', title: 'Marcos 12 — Os vinhateiros', user1: false, user2: false },
      { id: 'mc13', title: 'Marcos 13 — Discurso escatológico', user1: false, user2: false },
      { id: 'mc14', title: 'Marcos 14 — Última Ceia', user1: false, user2: false },
      { id: 'mc15', title: 'Marcos 15 — Paixão e Morte', user1: false, user2: false },
      { id: 'mc16', title: 'Marcos 16 — Ressurreição', user1: false, user2: false },
    ],
    createdAt: Date.now(),
  },
  {
    id: 'cardapio-semanal',
    categoryId: 'food',
    title: 'Cardápio Saudável Semanal',
    description: 'Planejem e sigam um cardápio saudável juntos',
    icon: '🥗',
    items: [
      { id: 'f1', title: 'Segunda — Preparar marmita', user1: false, user2: false },
      { id: 'f2', title: 'Terça — Cozinhar receita nova', user1: false, user2: false },
      { id: 'f3', title: 'Quarta — Dia de salada', user1: false, user2: false },
      { id: 'f4', title: 'Quinta — Receita fit juntos', user1: false, user2: false },
      { id: 'f5', title: 'Sexta — Jantar especial saudável', user1: false, user2: false },
      { id: 'f6', title: 'Sábado — Feira / Compras da semana', user1: false, user2: false },
      { id: 'f7', title: 'Domingo — Almoço em família', user1: false, user2: false },
    ],
    createdAt: Date.now(),
  },
];

function getDefaultState() {
  return {
    plans: [...DEFAULT_PLANS.map(p => ({ ...p, items: p.items.map(i => ({ ...i })) }))],
    savings: {
      total: 0,
      goal: null,
      goalDescription: '',
      transactions: [],
    },
    streak: 0,
    lastActiveDate: null,
    history: {},
  };
}

class Store {
  constructor() {
    this._state = this._loadLocal();
    this._listeners = new Map();
    this._syncing = false;
    this._unsubscribe = null;
  }

  // Load from local cache
  _loadLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_CACHE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        return { ...getDefaultState(), ...saved };
      }
    } catch (e) {
      console.error('Local cache load error:', e);
    }
    return getDefaultState();
  }

  _saveLocal() {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(this._state));
    } catch (e) {
      console.error('Local cache save error:', e);
    }
  }

  // Initialize Firebase sync
  async initSync() {
    // Try to load from Firestore
    const remote = await loadFromFirestore();
    if (remote) {
      // Merge remote into local (remote wins for shared data)
      this._state = { ...getDefaultState(), ...remote };
      this._saveLocal();
      this._notifyAll();
    } else {
      // First time: push local state to Firestore
      await this._pushToFirestore();
    }

    // Listen for real-time changes
    this._unsubscribe = listenForChanges((data, source) => {
      if (source === 'server' && !this._syncing) {
        // Update from the other device
        this._state = { ...this._state, ...data };
        this._saveLocal();
        this._notifyAll();
      }
    });
  }

  async _pushToFirestore() {
    this._syncing = true;
    try {
      await saveToFirestore(this._state);
    } finally {
      this._syncing = false;
    }
  }

  get state() {
    return this._state;
  }

  // Current profile (stored per-device in localStorage)
  get currentProfile() {
    return localStorage.getItem(LOCAL_PROFILE_KEY) || null;
  }

  set currentProfile(role) {
    localStorage.setItem(LOCAL_PROFILE_KEY, role);
  }

  getUser() {
    return PROFILES[this.currentProfile] || null;
  }

  getPartner() {
    const role = this.currentProfile;
    if (role === 'user1') return PROFILES.user2;
    if (role === 'user2') return PROFILES.user1;
    return null;
  }

  getPartnerRole() {
    return this.currentProfile === 'user1' ? 'user2' : 'user1';
  }

  // === Reactive updates ===
  set(key, value) {
    this._state[key] = value;
    this._saveLocal();
    this._pushToFirestore();
    this._notify(key);
  }

  update(updater) {
    updater(this._state);
    this._saveLocal();
    this._pushToFirestore();
    this._notifyAll();
  }

  on(key, listener) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    this._listeners.get(key).add(listener);
    return () => this._listeners.get(key)?.delete(listener);
  }

  _notify(key) {
    this._listeners.get(key)?.forEach(fn => fn(this._state[key]));
    this._listeners.get('*')?.forEach(fn => fn(this._state));
  }

  _notifyAll() {
    for (const [key, fns] of this._listeners) {
      fns.forEach(fn => fn(key === '*' ? this._state : this._state[key]));
    }
  }

  // === Plan helpers ===
  getPlans(categoryId) {
    if (categoryId) return this._state.plans.filter(p => p.categoryId === categoryId);
    return this._state.plans;
  }

  getPlan(planId) {
    return this._state.plans.find(p => p.id === planId);
  }

  addPlan(plan) {
    plan.id = plan.id || `plan_${Date.now()}`;
    plan.createdAt = Date.now();
    plan.items = plan.items || [];
    this._state.plans.push(plan);
    this._saveLocal();
    this._pushToFirestore();
    this._notify('plans');
    return plan;
  }

  deletePlan(planId) {
    this._state.plans = this._state.plans.filter(p => p.id !== planId);
    this._saveLocal();
    this._pushToFirestore();
    this._notify('plans');
  }

  addPlanItem(planId, item) {
    const plan = this.getPlan(planId);
    if (!plan) return;
    item.id = item.id || `item_${Date.now()}`;
    item.user1 = false;
    item.user2 = false;
    plan.items.push(item);
    this._saveLocal();
    this._pushToFirestore();
    this._notify('plans');
    return item;
  }

  toggleItem(planId, itemId, userRole) {
    const plan = this.getPlan(planId);
    if (!plan) return null;
    const item = plan.items.find(i => i.id === itemId);
    if (!item) return null;
    item[userRole] = !item[userRole];
    this._saveLocal();
    this._pushToFirestore();
    this._notify('plans');
    this._updateHistory();
    return item;
  }

  _updateHistory() {
    const today = new Date().toISOString().slice(0, 10);
    const role = this.currentProfile || 'user1';
    let completedToday = 0;
    for (const plan of this._state.plans) {
      for (const item of plan.items) {
        if (item[role]) completedToday++;
      }
    }
    if (!this._state.history) this._state.history = {};
    this._state.history[today] = { ...this._state.history[today], [`${role}Count`]: completedToday };
    this._saveLocal();
    this._pushToFirestore();
  }

  getPlanProgress(planId, userRole) {
    const plan = this.getPlan(planId);
    if (!plan || plan.items.length === 0) return 0;
    const role = userRole || this.currentProfile || 'user1';
    const completed = plan.items.filter(i => i[role]).length;
    return Math.round((completed / plan.items.length) * 100);
  }

  getCategoryProgress(categoryId, userRole) {
    const plans = this.getPlans(categoryId);
    if (plans.length === 0) return 0;
    let total = 0, completed = 0;
    const role = userRole || this.currentProfile || 'user1';
    for (const plan of plans) {
      total += plan.items.length;
      completed += plan.items.filter(i => i[role]).length;
    }
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }

  getOverallProgress(userRole) {
    const role = userRole || this.currentProfile || 'user1';
    let total = 0, completed = 0;
    for (const plan of this._state.plans) {
      total += plan.items.length;
      completed += plan.items.filter(i => i[role]).length;
    }
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }

  getTodayCompletedCount(userRole) {
    const role = userRole || this.currentProfile || 'user1';
    let completed = 0;
    for (const plan of this._state.plans) {
      completed += plan.items.filter(i => i[role]).length;
    }
    return completed;
  }

  getTotalItems() {
    let total = 0;
    for (const plan of this._state.plans) {
      total += plan.items.length;
    }
    return total;
  }

  // === Savings ===
  getSavings() {
    return this._state.savings || { total: 0, goal: null, goalDescription: '', transactions: [] };
  }

  addTransaction(amount, type, description) {
    if (!this._state.savings) {
      this._state.savings = { total: 0, goal: null, goalDescription: '', transactions: [] };
    }
    const tx = {
      id: `tx_${Date.now()}`,
      amount: Math.abs(amount),
      type, // 'deposit' or 'withdrawal'
      description,
      who: this.currentProfile || 'user1',
      date: new Date().toISOString(),
    };
    this._state.savings.transactions.unshift(tx);
    if (type === 'deposit') {
      this._state.savings.total += Math.abs(amount);
    } else {
      this._state.savings.total -= Math.abs(amount);
    }
    this._saveLocal();
    this._pushToFirestore();
    this._notify('savings');
    return tx;
  }

  setSavingsGoal(amount, description) {
    if (!this._state.savings) {
      this._state.savings = { total: 0, goal: null, goalDescription: '', transactions: [] };
    }
    this._state.savings.goal = amount;
    this._state.savings.goalDescription = description || '';
    this._saveLocal();
    this._pushToFirestore();
    this._notify('savings');
  }

  // === Streak ===
  updateStreak() {
    const today = new Date().toISOString().slice(0, 10);
    if (this._state.lastActiveDate === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (this._state.lastActiveDate === yesterday) {
      this._state.streak = (this._state.streak || 0) + 1;
    } else if (this._state.lastActiveDate !== today) {
      this._state.streak = 1;
    }
    this._state.lastActiveDate = today;
    this._saveLocal();
    this._pushToFirestore();
    this._notify('streak');
  }

  // === Reset ===
  resetAll() {
    localStorage.removeItem(LOCAL_CACHE_KEY);
    localStorage.removeItem(LOCAL_PROFILE_KEY);
    this._state = getDefaultState();
    this._pushToFirestore();
    this._notifyAll();
  }
}

export const store = new Store();
export { CATEGORIES, PROFILES };
