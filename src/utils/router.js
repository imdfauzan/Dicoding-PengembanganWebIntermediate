// src/utils/router.js

class Router {
  constructor(contentElement) {
    this.contentElement = contentElement;
    this.routes = [];

    window.addEventListener('hashchange', () => this.handleRouteChange());
    window.addEventListener('load', () => this.handleRouteChange());
  }

  addRoute(path, page) {
    const { regex, paramNames } = this._createRouteMatcher(path);
    this.routes.push({ path, page, regex, paramNames });
  }

  async handleRouteChange() {
    const hash = window.location.hash || '#/login';
    const matchedRoute = this.routes.find((route) => route.regex.test(hash));

    if (!matchedRoute) {
      this.contentElement.innerHTML = '<h1>404 - Halaman tidak ditemukan</h1>';
      return;
    }

    const params = this._extractParams(matchedRoute, hash);

    if (!document.startViewTransition) {
      await this.renderPage(matchedRoute.page, params);
      return;
    }

    document.startViewTransition(async () => {
      await this.renderPage(matchedRoute.page, params);
    });
  }

  async renderPage(page, params = {}) {
    this.contentElement.innerHTML = await page.render(params);
    if (page.afterRender) {
      await page.afterRender(params);
    }
  }

  _createRouteMatcher(path) {
    const paramNames = [];
    const pattern = path.replace(/:[^/]+/g, (match) => {
      paramNames.push(match.substring(1));
      return '([^/]+)';
    });

    return {
      regex: new RegExp(`^${pattern}$`),
      paramNames,
    };
  }

  _extractParams(route, hash) {
    const match = hash.match(route.regex);
    if (!match) return {};

    return route.paramNames.reduce((params, name, index) => {
      const value = match[index + 1];
      params[name] = value ? decodeURIComponent(value) : value;
      return params;
    }, {});
  }
}

export default Router;