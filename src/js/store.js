/* ===================================
   P&G — State Management
   Firebase-synced reactive store
   =================================== */

import { saveToFirestore, loadFromFirestore, listenForChanges } from './firebase.js';

const LOCAL_PROFILE_KEY = 'pg_current_profile';
const LOCAL_CACHE_KEY = 'pg_data_cache';

// Fixed profiles
export const PROFILES = {
  user1: { name: 'Pedro', avatar: '/images/pedro.png', role: 'user1' },
  user2: { name: 'Gabi', avatar: '/images/gabi.png', role: 'user2' },
};

// Mistérios do Terço por dia da semana (0=Dom, 1=Seg, ...)
export const TERCO_MISTERIOS = {
  0: { titulo: 'Mistérios Gloriosos', emoji: '👑' },
  1: { titulo: 'Mistérios Gozosos', emoji: '😊' },
  2: { titulo: 'Mistérios Dolorosos', emoji: '✝️' },
  3: { titulo: 'Mistérios Gloriosos', emoji: '👑' },
  4: { titulo: 'Mistérios Luminosos', emoji: '💡' },
  5: { titulo: 'Mistérios Dolorosos', emoji: '✝️' },
  6: { titulo: 'Mistérios Gozosos', emoji: '😊' },
};

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Default Terço plan items (one per day of the week)
function createTercoItems() {
  return [0, 1, 2, 3, 4, 5, 6].map(day => ({
    id: `terco_${day}`,
    title: `${DAY_NAMES[day]} — ${TERCO_MISTERIOS[day].titulo}`,
    dayOfWeek: day,
    user1: false,
    user2: false,
    // Terço has a default time of 20:00 (8PM)
    deadlineTime: '20:00',
  }));
}

// Pre-built plans
const DEFAULT_PLANS = [
  {
    id: 'terco-semanal',
    categoryId: 'terco',
    title: 'Terço Diário',
    description: 'Reze o Terço todos os dias — reseta toda semana',
    icon: '📿',
    isFixed: true, // Cannot be deleted, resets weekly
    items: createTercoItems(),
    createdAt: Date.now(),
    lastWeekReset: null,
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
];

function getDefaultState() {
  return {
    plans: DEFAULT_PLANS.map(p => ({ ...p, items: p.items.map(i => ({ ...i })) })),
    savings: {
      total: 0,
      goal: null,
      goalDescription: '',
      transactions: [],
    },
    notifications: [], // { id, message, icon, from, timestamp, read }
    streak: 0,
    lastActiveDate: null,
    history: {},
  };
}

class Store {
  constructor() {
    this._state = this._loadLocal();
    this._listeners = new Map();
    this._unsubscribe = null;
    this._pushTimer = null;
    this._lastWriteId = null;
    this._deviceId = this._getDeviceId();
    this._deadlineCheckInterval = null;
  }

  // ─── Device Identity ────────────────────────────────────────────────────────

  _getDeviceId() {
    let id = localStorage.getItem('pg_device_id');
    if (!id) {
      id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem('pg_device_id', id);
    }
    return id;
  }

  // ─── Local Cache ─────────────────────────────────────────────────────────────

  _loadLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_CACHE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const state = { ...getDefaultState(), ...saved };
        // Ensure notifications array exists
        if (!state.notifications) state.notifications = [];
        return state;
      }
    } catch (e) {
      console.error('[Store] Local cache load error:', e);
    }
    return getDefaultState();
  }

  _saveLocal() {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(this._state));
    } catch (e) {
      console.error('[Store] Local cache save error:', e);
    }
  }

  // ─── Firebase Sync ───────────────────────────────────────────────────────────

  async initSync() {
    try {
      const remote = await Promise.race([
        loadFromFirestore(),
        new Promise(resolve => setTimeout(() => resolve(null), 5000)),
      ]);

      if (remote) {
        this._state = { ...getDefaultState(), ...remote };
        if (!this._state.notifications) this._state.notifications = [];
        this._saveLocal();
        this._notifyAll();
        console.log('[Store] Synced from Firestore');
      } else {
        console.log('[Store] No remote data, pushing local');
        this._pushToFirestoreNow();
      }
    } catch (err) {
      console.warn('[Store] initSync failed, using local data:', err);
    }

    // Listen for real-time changes
    try {
      this._unsubscribe = listenForChanges((data, source) => {
        if (source !== 'server') return;

        const remoteWriteId = data._writeId || null;
        if (remoteWriteId && remoteWriteId === this._lastWriteId) {
          console.log('[Store] Skipped echo of own write');
          return;
        }

        console.log(`[Store] Received update from device: ${data._deviceId || 'unknown'}`);
        const savedTheme = this._state.theme;
        const prevState = JSON.parse(JSON.stringify(this._state));
        this._state = { ...getDefaultState(), ...data };
        if (!this._state.notifications) this._state.notifications = [];
        if (savedTheme) this._state.theme = savedTheme;
        delete this._state._writeId;
        delete this._state._deviceId;
        this._saveLocal();

        // Check if partner completed any task (cross-device notification)
        this._checkPartnerCompletions(prevState);

        this._notifyAll();
        window.dispatchEvent(new CustomEvent('firebaseupdate'));
        console.log('[Store] Applied server update & re-rendered');
      });
    } catch (err) {
      console.warn('[Store] Firestore listener failed:', err);
    }

    // Check for Terço weekly reset
    this.checkTercoWeeklyReset();

    // Start deadline checking
    this._startDeadlineChecker();
  }

  _pushToFirestore() {
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => this._pushToFirestoreNow(), 300);
  }

  async _pushToFirestoreNow() {
    this._lastWriteId = `w_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      await saveToFirestore(this._state, this._lastWriteId, this._deviceId);
    } catch (err) {
      console.warn('[Store] Push error:', err);
    }
  }

  // ─── Partner Completion Detection ──────────────────────────────────────────

  _checkPartnerCompletions(prevState) {
    const myRole = this.currentProfile;
    if (!myRole) return;
    const partnerRole = myRole === 'user1' ? 'user2' : 'user1';
    const partnerName = PROFILES[partnerRole]?.name || 'Parceiro';

    for (const plan of this._state.plans) {
      const prevPlan = prevState.plans?.find(p => p.id === plan.id);
      if (!prevPlan) continue;

      for (const item of plan.items) {
        const prevItem = prevPlan.items?.find(i => i.id === item.id);
        if (!prevItem) continue;

        // Partner toggled from false → true
        if (item[partnerRole] && !prevItem[partnerRole]) {
          this._addNotification(
            `${partnerName} concluiu: "${item.title}"`,
            '✅',
            partnerRole
          );
        }
      }
    }
  }

  // ─── Notifications ──────────────────────────────────────────────────────────

  _addNotification(message, icon = '🔔', from = null) {
    if (!this._state.notifications) this._state.notifications = [];

    const notif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      message,
      icon,
      from,
      timestamp: Date.now(),
      read: false,
    };
    this._state.notifications.unshift(notif);

    // Keep only last 50 notifications
    if (this._state.notifications.length > 50) {
      this._state.notifications = this._state.notifications.slice(0, 50);
    }

    this._saveLocal();
    this._notify('notifications');

    // Dispatch event so UI can show toast
    window.dispatchEvent(new CustomEvent('partnernotification', { detail: notif }));

    // Also try browser notification
    this._sendBrowserNotification(notif);
  }

  _sendBrowserNotification(notif) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification('P&G', {
          body: notif.message,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: notif.id,
        });
      } catch (e) {
        // Notification API might not be available in all contexts
      }
    }
  }

  getUnreadNotificationCount() {
    return (this._state.notifications || []).filter(n => !n.read).length;
  }

  markNotificationsRead() {
    if (!this._state.notifications) return;
    let changed = false;
    for (const n of this._state.notifications) {
      if (!n.read) {
        n.read = true;
        changed = true;
      }
    }
    if (changed) {
      this._saveLocal();
      this._pushToFirestore();
      this._notify('notifications');
    }
  }

  // ─── Deadline Checking ──────────────────────────────────────────────────────

  _startDeadlineChecker() {
    // Check every minute
    this._deadlineCheckInterval = setInterval(() => {
      this._checkDeadlines();
    }, 60000);

    // Also check immediately
    this._checkDeadlines();
  }

  _checkDeadlines() {
    const myRole = this.currentProfile;
    if (!myRole) return;

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const plan of this._state.plans) {
      for (const item of plan.items) {
        if (item[myRole]) continue; // Already completed

        let deadlineMinutes = null;
        let deadlineDate = null;

        // For terço items, check if it's today's day
        if (plan.id === 'terco-semanal') {
          if (item.dayOfWeek !== now.getDay()) continue;
          if (item.deadlineTime) {
            const [h, m] = item.deadlineTime.split(':').map(Number);
            deadlineMinutes = h * 60 + m;
            deadlineDate = today;
          }
        } else if (item.deadlineDate && item.deadlineTime) {
          deadlineDate = item.deadlineDate;
          if (deadlineDate === today) {
            const [h, m] = item.deadlineTime.split(':').map(Number);
            deadlineMinutes = h * 60 + m;
          }
        }

        if (deadlineDate === today && deadlineMinutes !== null) {
          const minutesLeft = deadlineMinutes - currentMinutes;

          // Notify 30 min before deadline
          const alertKey = `deadline_alert_${item.id}_${today}`;
          if (minutesLeft > 0 && minutesLeft <= 30 && !localStorage.getItem(alertKey)) {
            localStorage.setItem(alertKey, '1');
            this._addNotification(
              `⏰ "${item.title}" vence em ${minutesLeft} min!`,
              '⏰',
              null
            );
          }

          // Notify when deadline passed
          const lateKey = `deadline_late_${item.id}_${today}`;
          if (minutesLeft < 0 && minutesLeft > -5 && !localStorage.getItem(lateKey)) {
            localStorage.setItem(lateKey, '1');
            this._addNotification(
              `❌ "${item.title}" está atrasada!`,
              '❌',
              null
            );
          }
        }
      }
    }
  }

  // Request notification permission
  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // ─── Terço Weekly Reset ──────────────────────────────────────────────────────

  checkTercoWeeklyReset() {
    const terco = this._state.plans.find(p => p.id === 'terco-semanal');
    if (!terco) {
      // Terço plan might have been deleted or doesn't exist, recreate it
      const newTerco = {
        id: 'terco-semanal',
        categoryId: 'terco',
        title: 'Terço Diário',
        description: 'Reze o Terço todos os dias — reseta toda semana',
        icon: '📿',
        isFixed: true,
        items: createTercoItems(),
        createdAt: Date.now(),
        lastWeekReset: this._getCurrentWeekId(),
      };
      this._state.plans.unshift(newTerco);
      this._saveLocal();
      this._pushToFirestore();
      this._notify('plans');
      return;
    }

    const currentWeek = this._getCurrentWeekId();
    if (terco.lastWeekReset !== currentWeek) {
      // Reset all terço items
      terco.items = createTercoItems();
      terco.lastWeekReset = currentWeek;
      this._saveLocal();
      this._pushToFirestore();
      this._notify('plans');
      console.log('[Store] Terço weekly reset executed');
    }
  }

  _getCurrentWeekId() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const diff = now - startOfYear;
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const weekNum = Math.floor(diff / oneWeek);
    return `${now.getFullYear()}-W${weekNum}`;
  }

  // ─── State Access ─────────────────────────────────────────────────────────────

  get state() {
    return this._state;
  }

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

  // ─── Reactivity ──────────────────────────────────────────────────────────────

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

  // ─── Plan Helpers ─────────────────────────────────────────────────────────────

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

  updatePlan(planId, updates) {
    const plan = this.getPlan(planId);
    if (!plan) return null;
    if (updates.title !== undefined) plan.title = updates.title;
    if (updates.description !== undefined) plan.description = updates.description;
    if (updates.icon !== undefined) plan.icon = updates.icon;
    if (updates.categoryId !== undefined) plan.categoryId = updates.categoryId;
    this._saveLocal();
    this._pushToFirestore();
    this._notify('plans');
    return plan;
  }

  deletePlan(planId) {
    const plan = this.getPlan(planId);
    if (plan?.isFixed) return; // Cannot delete fixed plans (Terço)
    this._state.plans = this._state.plans.filter(p => p.id !== planId);
    this._saveLocal();
    this._pushToFirestore();
    this._notify('plans');
  }

  addPlanItem(planId, item) {
    const plan = this.getPlan(planId);
    if (!plan) return null;
    item.id = item.id || `item_${Date.now()}`;
    item.user1 = false;
    item.user2 = false;
    // Preserve deadline fields if provided
    if (item.deadlineDate) item.deadlineDate = item.deadlineDate;
    if (item.deadlineTime) item.deadlineTime = item.deadlineTime;
    plan.items.push(item);
    this._saveLocal();
    this._pushToFirestore();
    this._notify('plans');
    return item;
  }

  updatePlanItem(planId, itemId, updates) {
    const plan = this.getPlan(planId);
    if (!plan) return null;
    const item = plan.items.find(i => i.id === itemId);
    if (!item) return null;
    if (updates.title !== undefined) item.title = updates.title;
    if (updates.deadlineDate !== undefined) item.deadlineDate = updates.deadlineDate;
    if (updates.deadlineTime !== undefined) item.deadlineTime = updates.deadlineTime;
    this._saveLocal();
    this._pushToFirestore();
    this._notify('plans');
    return item;
  }

  deletePlanItem(planId, itemId) {
    const plan = this.getPlan(planId);
    if (!plan) return;
    plan.items = plan.items.filter(i => i.id !== itemId);
    this._saveLocal();
    this._pushToFirestore();
    this._notify('plans');
  }

  toggleItem(planId, itemId, userRole) {
    const plan = this.getPlan(planId);
    if (!plan) return null;
    const item = plan.items.find(i => i.id === itemId);
    if (!item) return null;
    const wasCompleted = item[userRole];
    item[userRole] = !item[userRole];

    // Send notification to partner when completing
    if (item[userRole] && !wasCompleted) {
      const userName = PROFILES[userRole]?.name || 'Alguém';
      const partnerRole = userRole === 'user1' ? 'user2' : 'user1';
      this._addNotification(
        `${userName} concluiu: "${item.title}"`,
        '✅',
        userRole
      );
    }

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
    this._state.history[today] = {
      ...this._state.history[today],
      [`${role}Count`]: completedToday,
    };
    this._saveLocal();
  }

  // ─── Terço Helpers ──────────────────────────────────────────────────────────

  getTercoToday() {
    const terco = this.getPlan('terco-semanal');
    if (!terco) return null;
    const dayOfWeek = new Date().getDay();
    return terco.items.find(i => i.dayOfWeek === dayOfWeek) || null;
  }

  getTercoPendingDays(userRole) {
    const terco = this.getPlan('terco-semanal');
    if (!terco) return [];
    const role = userRole || this.currentProfile || 'user1';
    const now = new Date();
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return terco.items.filter(item => {
      if (item[role]) return false; // Already done
      // Past days this week are pending
      if (item.dayOfWeek < currentDay) return true;
      // Today after deadline is also pending
      if (item.dayOfWeek === currentDay && item.deadlineTime) {
        const [h, m] = item.deadlineTime.split(':').map(Number);
        if (currentMinutes > h * 60 + m) return true;
      }
      return false;
    });
  }

  // ─── Progress Helpers ─────────────────────────────────────────────────────────

  getPlanProgress(planId, userRole) {
    const plan = this.getPlan(planId);
    if (!plan || plan.items.length === 0) return 0;
    const role = userRole || this.currentProfile || 'user1';
    return Math.round((plan.items.filter(i => i[role]).length / plan.items.length) * 100);
  }

  getCategoryProgress(categoryId, userRole) {
    const plans = this.getPlans(categoryId);
    if (plans.length === 0) return 0;
    const role = userRole || this.currentProfile || 'user1';
    let total = 0, completed = 0;
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
    return this._state.plans.reduce((sum, plan) => sum + plan.items.length, 0);
  }

  // ─── Deadline Helpers ────────────────────────────────────────────────────────

  getUpcomingDeadlines(userRole, limit = 5) {
    const role = userRole || this.currentProfile || 'user1';
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const tasks = [];

    for (const plan of this._state.plans) {
      for (const item of plan.items) {
        if (item[role]) continue; // Already completed

        if (plan.id === 'terco-semanal') {
          // For terço, show today's item
          if (item.dayOfWeek === now.getDay()) {
            tasks.push({
              plan,
              item,
              deadlineDate: today,
              deadlineTime: item.deadlineTime || '20:00',
              isTerco: true,
            });
          }
        } else if (item.deadlineDate) {
          tasks.push({
            plan,
            item,
            deadlineDate: item.deadlineDate,
            deadlineTime: item.deadlineTime || null,
            isTerco: false,
          });
        }
      }
    }

    // Sort by deadline date+time
    tasks.sort((a, b) => {
      const da = `${a.deadlineDate} ${a.deadlineTime || '23:59'}`;
      const db = `${b.deadlineDate} ${b.deadlineTime || '23:59'}`;
      return da.localeCompare(db);
    });

    return tasks.slice(0, limit);
  }

  isTaskOverdue(item, plan) {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    if (plan?.id === 'terco-semanal') {
      if (item.dayOfWeek < now.getDay()) return true;
      if (item.dayOfWeek === now.getDay() && item.deadlineTime) {
        const [h, m] = item.deadlineTime.split(':').map(Number);
        return now.getHours() * 60 + now.getMinutes() > h * 60 + m;
      }
      return false;
    }

    if (!item.deadlineDate) return false;
    if (item.deadlineDate < today) return true;
    if (item.deadlineDate === today && item.deadlineTime) {
      const [h, m] = item.deadlineTime.split(':').map(Number);
      return now.getHours() * 60 + now.getMinutes() > h * 60 + m;
    }
    return false;
  }

  // ─── Savings ───────────────────────────────────────────────────────────────────

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
      type,
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

  // ─── Streak ───────────────────────────────────────────────────────────────────

  updateStreak() {
    const today = new Date().toISOString().slice(0, 10);
    if (this._state.lastActiveDate === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    this._state.streak = this._state.lastActiveDate === yesterday
      ? (this._state.streak || 0) + 1
      : 1;
    this._state.lastActiveDate = today;
    this._saveLocal();
    this._pushToFirestore();
    this._notify('streak');
  }

  // ─── Reset ────────────────────────────────────────────────────────────────────

  resetAll() {
    localStorage.removeItem(LOCAL_CACHE_KEY);
    localStorage.removeItem(LOCAL_PROFILE_KEY);
    this._state = getDefaultState();
    this._pushToFirestoreNow();
    this._notifyAll();
  }
}

export const store = new Store();
