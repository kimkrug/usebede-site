/* Cabeçalho da homepage. Busca, conta e sacola continuam na Nuvemshop. */
(function () {
  'use strict';

  function setupHomeUI() {
    const menu = document.getElementById('mobileDrawer');
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

    document.addEventListener('keydown', function (event) {
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
      const focusable = Array.from(menu.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]'))
        .filter(function (element) { return element.getClientRects().length > 0; });
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    document.addEventListener('click', function (event) {
      if (searchPanel && !searchPanel.hidden && !searchPanel.contains(event.target) && !searchButton.contains(event.target)) closeSearch(false);
    });

    const desktop = window.matchMedia('(min-width: 1280px)');
    desktop.addEventListener('change', function (event) {
      if (event.matches && menu && menu.classList.contains('open')) window.closeMobileMenu();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupHomeUI);
  else setupHomeUI();
}());
