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
  const desktopHover = typeof window.matchMedia === 'function'
    ? window.matchMedia('(min-width: 1280px) and (hover: hover) and (pointer: fine)')
    : null;

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
      const desktopNav = document.getElementById('mainNav');
      if (desktopNav && desktopNav.contains(details)) {
        let pointerInside = false;
        details.addEventListener('pointerenter', function (event) {
          if (!desktopHover || !desktopHover.matches || event.pointerType === 'touch') return;
          pointerInside = true;
          closeProductMenus(details);
          details.open = true;
        });
        details.addEventListener('pointerleave', function () {
          pointerInside = false;
          // Keep keyboard focus visible until it leaves the disclosure.
          if (!details.contains(document.activeElement)) details.open = false;
        });
        details.addEventListener('focusout', function (event) {
          if (!pointerInside && !details.contains(event.relatedTarget)) details.open = false;
        });
        if (desktopHover) desktopHover.addEventListener('change', function () {
          pointerInside = false;
          details.open = false;
        });
      }
    });
  }
  window.BedeNavigation = { setupProductMenus: setupProductMenus, closeProductMenus: closeProductMenus };

  // Reuse the native rail buttons and scroll handlers. These cues live AFTER
  // the rail, never in the product image, and do not own catalogue loading.
  function createCarouselCues() {
    const controllers = new Map();
    const rails = [['emAltaRail', 'Em alta'], ['tiposRail', 'Tipos de produtos'], ['tabsRail', 'Produtos por categoria']];
    const motion = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    function bind(rail, label) {
      if (controllers.has(rail)) { controllers.get(rail).update(); return; }
      const wrapper = rail.parentElement;
      const previous = document.getElementById(rail.id + 'Prev');
      const next = document.getElementById(rail.id + 'Next');
      if (!wrapper || !wrapper.classList.contains('nb-rail-wrapper') || !previous || !next || previous.parentElement !== wrapper || next.parentElement !== wrapper) return;
      const controls = document.createElement('div');
      controls.className = 'home-rail-cues';
      controls.setAttribute('role', 'group');
      controls.setAttribute('aria-label', 'Navegar produtos: ' + label);
      const addedTabIndex = !rail.hasAttribute('tabindex');
      const addedLabel = !rail.hasAttribute('aria-label');
      if (addedTabIndex) rail.setAttribute('tabindex', '0');
      if (!rail.hasAttribute('role')) rail.setAttribute('role', 'region');
      if (addedLabel) rail.setAttribute('aria-label', label + ': lista horizontal de produtos');
      wrapper.classList.add('home-rail-cues-ready');
      [[previous, 'prev', 'Voltar aos produtos anteriores'], [next, 'next', 'Ver próximos produtos']].forEach(function (item) {
        const button = item[0];
        button.classList.add('home-rail-cue');
        button.setAttribute('data-direction', item[1]);
        button.setAttribute('aria-label', item[2]);
        button.setAttribute('aria-controls', rail.id);
        button.type = 'button';
        button.hidden = true;
        controls.appendChild(button);
      });
      wrapper.appendChild(controls);
      let frame = null;
      let horizontalWheelUntil = 0;
      let railTouch = null;
      function update() {
        const width = Number(rail.clientWidth), total = Number(rail.scrollWidth);
        const last = Math.max(0, total - width);
        const hasProducts = Boolean(rail.querySelector('.nb-card'));
        const overflow = hasProducts && rail.getAttribute('aria-busy') !== 'true' && Number.isFinite(width) && Number.isFinite(total) && width > 0 && last > 2;
        const left = Math.max(0, Math.min(last, Number(rail.scrollLeft) || 0));
        const position = !overflow ? 'none' : left <= 2 ? 'start' : left >= last - 2 ? 'end' : 'middle';
        controls.setAttribute('data-position', position);
        controls.hidden = !overflow;
        previous.hidden = position !== 'end';
        next.hidden = position !== 'start';
        // A scroll can hide the focused cue. Keep keyboard focus on the list,
        // without scrolling the fullpage or jumping back to the document body.
        if ((previous.hidden && document.activeElement === previous) || (next.hidden && document.activeElement === next)) rail.focus({ preventScroll: true });
        if (addedTabIndex) rail.setAttribute('tabindex', overflow ? '0' : '-1');
      }
      function schedule() {
        if (frame !== null) return;
        const request = window.requestAnimationFrame || function (callback) { return window.setTimeout(callback, 0); };
        frame = request(function () { frame = null; update(); });
      }
      function localTouch(event) {
        if (event.type === 'touchcancel') { railTouch = null; return; }
        if (event.type === 'touchstart') {
          const touch = event.touches.length === 1 ? event.touches[0] : null;
          railTouch = touch && controls.getAttribute('data-position') !== 'none'
            ? { x: touch.clientX, y: touch.clientY, identifier: touch.identifier, axis: null } : null;
          // The fullpage still needs this start for a later VERTICAL swipe.
          return;
        }
        if (!railTouch) return;
        if (event.touches.length > (event.type === 'touchend' ? 0 : 1)) { railTouch = null; return; }
        const touches = event.type === 'touchend' ? event.changedTouches : event.touches;
        const touch = touches && Array.prototype.find.call(touches, function (item) { return item.identifier === railTouch.identifier; });
        if (touch && !railTouch.axis) {
          const dx = Math.abs(touch.clientX - railTouch.x), dy = Math.abs(touch.clientY - railTouch.y);
          if (Math.max(dx, dy) >= 8 && dx !== dy) railTouch.axis = dx > dy ? 'horizontal' : 'vertical';
        }
        if (event.type === 'touchend') {
          // Only a confirmed horizontal gesture owns this end. Never prevent
          // native scrolling, taps, vertical fullpage swipes or multi-touch.
          if (railTouch.axis === 'horizontal') event.stopPropagation();
          railTouch = null;
        }
      }
      function localWheel(event) {
        // Native horizontal scrolling remains untouched. Stop its diagonal or
        // momentum tail from also becoming a vertical fullpage gesture.
        const now = Date.now();
        if (controls.getAttribute('data-position') === 'none') return;
        if (Math.abs(event.deltaX) > 2 && Math.abs(event.deltaX) > Math.abs(event.deltaY)) horizontalWheelUntil = now + 180;
        if (now < horizontalWheelUntil) { horizontalWheelUntil = now + 180; event.stopPropagation(); }
      }
      function keyboard(event) {
        if (event.target !== rail || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        const last = Math.max(0, rail.scrollWidth - rail.clientWidth);
        if (last <= 2 || rail.getAttribute('aria-busy') === 'true') return;
        event.preventDefault(); event.stopPropagation();
        const behavior = motion && motion.matches ? 'auto' : 'smooth';
        const left = event.key === 'Home' ? -rail.scrollLeft : event.key === 'End' ? last - rail.scrollLeft : (event.key === 'ArrowRight' ? 1 : -1) * Math.max(280, rail.clientWidth * 0.65);
        rail.scrollBy({ left: left, behavior: behavior });
        schedule();
      }
      rail.addEventListener('scroll', update, { passive: true });
      rail.addEventListener('load', schedule, true);
      rail.addEventListener('keydown', keyboard);
      rail.addEventListener('wheel', localWheel, { passive: true });
      ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(function (type) { rail.addEventListener(type, localTouch, { passive: true }); });
      window.addEventListener('resize', schedule, { passive: true });
      window.addEventListener('pageshow', schedule);
      const resize = typeof window.ResizeObserver === 'function' ? new window.ResizeObserver(schedule) : null;
      if (resize) resize.observe(rail);
      const mutation = typeof window.MutationObserver === 'function' ? new window.MutationObserver(schedule) : null;
      if (mutation) mutation.observe(rail, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-busy'] });
      controllers.set(rail, { update: update });
      update();
    }
    function setup(scope) {
      rails.forEach(function (item) {
        const rail = document.getElementById(item[0]);
        if (rail && (!scope || scope === document || scope.contains(rail))) bind(rail, item[1]);
      });
    }
    return { setup: setup, refresh: function () { controllers.forEach(function (controller) { controller.update(); }); } };
  }
  if (!window.BedeCarouselCues) window.BedeCarouselCues = createCarouselCues();

  function setupHomeUI() {
    window.BedeCarouselCues.setup(document);
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
