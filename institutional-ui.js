/* Navegação das páginas institucionais; compra e conta permanecem na loja. */
(function () {
  'use strict';

  let menu;
  let overlay;
  let menuButton;
  let closeButton;
  let returnFocus;
  let initialized = false;
  const backgroundStates = new Map();

  function isOpen() {
    return Boolean(menu && menu.classList.contains('open'));
  }

  function config() {
    return typeof CFG_LOJA !== 'undefined' && CFG_LOJA ? CFG_LOJA : {};
  }

  function textValue(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function applyStoreDetails() {
    const store = config();
    const address = textValue(store.endereco);
    const legal = [textValue(store.razaoSocial), store.cnpj ? 'CNPJ ' + store.cnpj : '']
      .filter(Boolean).join(' · ');
    const hours = textValue(store.horario);
    document.querySelectorAll('[data-store-address]').forEach(function (element) {
      if (address) element.textContent = address;
    });
    document.querySelectorAll('[data-store-legal]').forEach(function (element) {
      if (legal) element.textContent = legal;
    });
    document.querySelectorAll('[data-store-hours]').forEach(function (element) {
      const displayed = hours || textValue(element.getAttribute('data-empty-hours'));
      element.textContent = displayed;
      element.hidden = !displayed;
    });

    const whatsapp = textValue(store.whatsapp);
    let phone = whatsapp.replace(/\D/g, '');
    if (phone.length === 10 || phone.length === 11) phone = '55' + phone;
    if (!/^55\d{10,11}$/.test(phone)) return;
    document.querySelectorAll('a[href]').forEach(function (link) {
      let url;
      try { url = new URL(link.getAttribute('href'), document.baseURI); }
      catch (_) { return; }
      if (url.protocol !== 'https:' || url.hostname !== 'wa.me') return;
      url.pathname = '/' + phone;
      link.href = url.href;
      if (/^\s*WhatsApp:\s*[+(\d]/i.test(link.textContent)) {
        link.textContent = 'WhatsApp: ' + whatsapp;
      }
    });
  }

  function createLink(label, href) {
    const link = document.createElement('a');
    link.className = 'mob-nav-link';
    link.textContent = label;
    link.href = href;
    return link;
  }

  function openMenu() {
    if (!initialized) setup();
    if (!menu || isOpen()) return;
    if (window.BedeNavigation) window.BedeNavigation.closeProductMenus();
    returnFocus = document.activeElement;
    menu.inert = false;
    menu.setAttribute('aria-hidden', 'false');
    menu.classList.add('open');
    overlay.classList.add('open');
    document.body.classList.add('institutional-menu-open');
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', 'Fechar menu');
    Array.from(document.body.children).forEach(function (element) {
      if (element === menu || element === overlay || /^(SCRIPT|STYLE|LINK)$/.test(element.tagName)) return;
      backgroundStates.set(element, element.inert);
      element.inert = true;
    });
    closeButton.focus();
  }

  function closeMenu() {
    if (!isOpen()) return;
    if (window.BedeNavigation) window.BedeNavigation.closeProductMenus();
    menu.classList.remove('open');
    overlay.classList.remove('open');
    document.body.classList.remove('institutional-menu-open');
    backgroundStates.forEach(function (wasInert, element) { element.inert = wasInert; });
    backgroundStates.clear();
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir menu');
    const target = returnFocus && returnFocus.isConnected && !returnFocus.closest('[inert]')
      ? returnFocus : menuButton;
    if (target && typeof target.focus === 'function') target.focus();
    menu.inert = true;
    menu.setAttribute('aria-hidden', 'true');
  }

  window.openMobileMenu = openMenu;
  window.closeMobileMenu = closeMenu;
  window.toggleMobileMenu = function () { if (isOpen()) closeMenu(); else openMenu(); };

  function setup() {
    if (initialized) return;
    const mainNav = document.getElementById('mainNav');
    menuButton = document.getElementById('mobileMenuBtn');
    if (!document.body || !mainNav || !menuButton) return;
    initialized = true;
    applyStoreDetails();

    overlay = document.createElement('div');
    overlay.className = 'mobile-drawer-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.addEventListener('click', closeMenu);
    menu = document.createElement('div');
    menu.className = 'mobile-drawer';
    menu.id = 'institutionalMenu';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    menu.setAttribute('aria-label', 'Menu de navegação');
    menu.setAttribute('aria-hidden', 'true');
    menu.inert = true;

    const header = document.createElement('div');
    header.className = 'mob-drawer-header';
    const officialLogo = document.querySelector('.header-center .logo-link');
    if (officialLogo) {
      const logo = officialLogo.cloneNode(true);
      logo.className = 'mob-drawer-logo';
      logo.removeAttribute('id');
      logo.querySelectorAll('[id]').forEach(function (element) { element.removeAttribute('id'); });
      header.appendChild(logo);
    }
    closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'mob-drawer-close';
    closeButton.setAttribute('aria-label', 'Fechar menu');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', closeMenu);
    header.appendChild(closeButton);

    const nav = document.createElement('nav');
    nav.className = 'mob-drawer-nav';
    nav.setAttribute('aria-label', 'Navegação principal móvel');
    Array.from(mainNav.children).forEach(function (source) {
      const item = source.cloneNode(true);
      item.removeAttribute('id');
      item.querySelectorAll('[id]').forEach(function (element) { element.removeAttribute('id'); });
      if (item.tagName === 'DETAILS') {
        item.open = false;
        const summary = item.querySelector('summary');
        if (summary) summary.className = 'mob-nav-link';
      } else item.className = 'mob-nav-link';
      nav.appendChild(item);
    });
    const footer = document.createElement('div');
    footer.className = 'mob-drawer-footer';
    footer.appendChild(createLink('Minha conta', 'https://loja.usebede.com.br/account/login/'));
    footer.appendChild(createLink('Minha sacola', 'https://loja.usebede.com.br/comprar/'));
    menu.appendChild(header);
    menu.appendChild(nav);
    menu.appendChild(footer);
    document.body.appendChild(overlay);
    document.body.appendChild(menu);
    if (window.BedeNavigation) window.BedeNavigation.setupProductMenus(menu);
    menuButton.setAttribute('aria-controls', menu.id);

    menu.addEventListener('click', function (event) {
      if (event.target.closest('a[href]')) closeMenu();
    });
    document.addEventListener('keydown', function (event) {
      if (!isOpen() || event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== 'Tab') return;
      const links = Array.from(menu.querySelectorAll('a[href], summary, button:not([disabled]), [tabindex="0"]'))
        .filter(function (element) { return element.getClientRects().length > 0; });
      if (!links.length) return;
      const first = links[0];
      const last = links[links.length - 1];
      const outside = !menu.contains(document.activeElement);
      if (event.shiftKey && (outside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (outside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    });
    const desktop = window.matchMedia('(min-width: 1280px)');
    desktop.addEventListener('change', function (event) { if (event.matches) closeMenu(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
}());
