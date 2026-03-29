/* ===================================
   NósJuntos — SPA Router
   Hash-based with page transitions
   =================================== */

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.container = null;
  }

  init(containerId) {
    this.container = document.getElementById(containerId);
    window.addEventListener('hashchange', () => this._handleRoute());
    // Initial route
    this._handleRoute();
  }

  register(path, handler) {
    this.routes[path] = handler;
  }

  navigate(path, params = {}) {
    // Store params for the route
    this._pendingParams = params;
    window.location.hash = path;
  }

  _handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const [path, ...paramParts] = hash.split('/').filter(Boolean);
    const route = '/' + (path || '');

    // Parse params from URL: /#/plan/plan-id → { id: 'plan-id' }
    const params = this._pendingParams || {};
    this._pendingParams = null;

    if (paramParts.length > 0) {
      params.id = paramParts.join('/');
    }

    const handler = this.routes[route];
    if (!handler) {
      // Fallback to home
      this.navigate('/');
      return;
    }

    this._transition(route, handler, params);
  }

  async _transition(route, handler, params) {
    const container = this.container;
    if (!container) return;

    // Exit animation
    if (this.currentRoute) {
      container.classList.remove('page-enter');
      container.classList.add('page-exit');
      await this._wait(200);
    }

    // Render new page
    container.innerHTML = '';
    container.classList.remove('page-exit');

    try {
      const content = await handler(params);
      if (typeof content === 'string') {
        container.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        container.appendChild(content);
      }
    } catch (err) {
      console.error('Route error:', err);
      container.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">😵</div>
        <div class="empty-state-title">Ops! Algo deu errado</div>
      </div>`;
    }

    // Enter animation
    container.classList.add('page-enter');
    this.currentRoute = route;

    // Dispatch event for nav to update
    window.dispatchEvent(new CustomEvent('routechange', { detail: { route } }));
  }

  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const router = new Router();
