/* Cabeçalho da homepage. Busca, conta e sacola continuam na Nuvemshop. */
(function () {
  'use strict';

  // Same destinations and order as the published native store menu. These are
  // searches, not a replacement taxonomy or a second product catalogue.
  const STORE = 'https://loja.usebede.com.br';
  const PRODUCT_SEARCHES = [
    ['Chinelos', 'chinelo'], ['Sandálias', 'sandalia'], ['Rasteirinhas', 'rasteirinha'],
    ['Papetes', 'papete'], ['Birkens', 'birken'], ['Mocassins', 'mocassim'],
    ['Mules', 'mule'], ['Clogs', 'clog'], ['Slingbacks', 'slingback'],
    ['Sapatilhas', 'sapatilha'], ['Sapatos', 'sapato'], ['Tamancos', 'tamanco'],
    ['Scarpins', 'scarpin'], ['Tênis', 'tenis'], ['Botas', 'bota'],
    ['Coturnos', 'coturno'], ['Bolsas', 'bolsa'], ['Mochilas', 'mochila'], ['Clutches', 'clutch']
  ];
  const boundMenus = new WeakSet();

  function closeProductMenus(except, restoreFocus) {
    document.querySelectorAll('details[data-product-menu]').forEach(function (details) {
      if (details === except || !details.open) return;
      if (restoreFocus && details.contains(document.activeElement)) details.querySelector('summary').focus();
      details.open = false;
    });
  }
  function setupProductMenus(root) {
    root.querySelectorAll('details[data-product-menu]').forEach(function (details) {
      if (boundMenus.has(details)) return;
      const links = details.querySelector('[data-product-links]');
      const summary = details.querySelector('summary');
      if (!links || !summary) return;
      boundMenus.add(details);
      links.replaceChildren();
      [['Ver todos os produtos', null]].concat(PRODUCT_SEARCHES).forEach(function (item) {
        const link = document.createElement('a');
        link.textContent = item[0];
        link.href = STORE + (item[1] ? '/search/?q=' + encodeURIComponent(item[1]) : '/produtos/');
        links.appendChild(link);
      });
      summary.addEventListener('click', function () { closeProductMenus(details); });
      summary.addEventListener('keydown', function (event) {
        if (event.key !== 'ArrowDown') return;
        event.preventDefault();
        closeProductMenus(details);
        details.open = true;
        links.querySelector('a').focus();
      });
    });
  }
  window.BedeNavigation = { setupProductMenus: setupProductMenus, closeProductMenus: closeProductMenus };

  function setupHomeUI() {
    setupProductMenus(document);
    document.addEventListener('click', function (event) {
      if (!event.target.closest('details[data-product-menu]')) closeProductMenus();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !document.querySelector('details[data-product-menu][open]')) return;
      event.preventDefault();
      closeProductMenus(null, true);
    });
    const menu = document.getElementById('mobileDrawer');
    // Institutional pages share the product menu, but own their document drawer.
    if (!menu) return;
    const menuButton = document.getElementById('mobileMenuBtn');
    const searchPanel = document.getElementById('homeSearchPanel');
    const searchButton = document.getElementById('homeSearchTrigger');
    const searchInput = document.getElementById('homeSearchInput');
    const searchClose = document.getElementById('homeSearchClose');
    const originalOpenMenu = window.openMobileMenu;
    const originalCloseMenu = window.closeMobileMenu;

    function closeSearch(restoreFocus) {
      if (!searchPanel || !searchButton) return;
      const wasOpen = !searchPanel.hidden;
      searchPanel.hidden = true;
      searchButton.setAttribute('aria-expanded', 'false');
      if (wasOpen && restoreFocus) searchButton.focus();
    }

    window.openMobileMenu = function () {
      closeSearch(false);
      closeProductMenus();
      if (typeof originalOpenMenu === 'function') originalOpenMenu();
      if (!menu || !menuButton) return;
      menu.inert = false;
      menu.setAttribute('aria-hidden', 'false');
      menuButton.setAttribute('aria-expanded', 'true');
      menuButton.setAttribute('aria-label', 'Fechar menu');
      const closeButton = menu.querySelector('.mob-drawer-close');
      if (closeButton) closeButton.focus();
    };

    window.closeMobileMenu = function () {
      const restoreFocus = menu && menu.contains(document.activeElement);
      closeProductMenus();
      if (typeof originalCloseMenu === 'function') originalCloseMenu();
      if (!menu || !menuButton) return;
      if (restoreFocus) menuButton.focus();
      menu.inert = true;
      menu.setAttribute('aria-hidden', 'true');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Abrir menu');
    };

    if (searchButton && searchPanel && searchInput) {
      searchButton.addEventListener('click', function () {
        if (!searchPanel.hidden) {
          closeSearch(true);
          return;
        }
        window.closeMobileMenu();
        closeProductMenus();
        searchPanel.hidden = false;
        searchButton.setAttribute('aria-expanded', 'true');
        searchInput.focus();
      });
      searchPanel.querySelector('form').addEventListener('submit', function (event) {
        searchInput.value = searchInput.value.trim();
        if (!searchInput.value) {
          event.preventDefault();
          searchInput.focus();
        }
      });
    }
    if (searchClose) searchClose.addEventListener('click', function () { closeSearch(true); });

    menu.addEventListener('click', function (event) {
      if (event.target.closest('a[href]')) window.closeMobileMenu();
    });
    document.querySelectorAll('a[data-home-offers]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
        if (typeof window.goToOffers !== 'function') return;
        event.preventDefault();
        closeProductMenus();
        closeSearch(false);
        window.closeMobileMenu();
        window.goToOffers();
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.defaultPrevented) return;
      const menuIsOpen = menu && menu.classList.contains('open');
      if (event.key === 'Escape') {
        if (menuIsOpen) {
          event.preventDefault();
          window.closeMobileMenu();
        } else if (searchPanel && !searchPanel.hidden) {
          event.preventDefault();
          closeSearch(true);
        }
      }
      if (!menuIsOpen || event.key !== 'Tab') return;
      const focusable = Array.from(menu.querySelectorAll('a[href], summary, button:not([disabled]), input:not([disabled]), [tabindex="0"]'))
        .filter(function (element) { return element.getClientRects().length > 0; });
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const outside = !menu.contains(document.activeElement);
      if (event.shiftKey && (outside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (outside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    });

    document.addEventListener('click', function (event) {
      if (searchPanel && !searchPanel.hidden && !searchPanel.contains(event.target) && !searchButton.contains(event.target)) closeSearch(false);
    });

    const desktop = window.matchMedia('(min-width: 1280px)');
    desktop.addEventListener('change', function (event) {
      closeProductMenus();
      if (event.matches && menu && menu.classList.contains('open')) window.closeMobileMenu();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupHomeUI);
  else setupHomeUI();
}());
