/* BEDÊ homepage: editorial navigation and fresh public Nuvemshop data. */
(function () {
  'use strict';
  const STORE = 'https://loja.usebede.com.br';
  // Enable only after the native-store offers enhancement is active and verified.
  const STORE_OFFERS_READY = false;
  const CATALOGUE_REFRESH_MS = 120000, CATALOGUE_MAX_AGE_MS = 150000, CATALOGUE_MIN_RETRY_MS = 20000;
  const $ = id => document.getElementById(id);
  const state = { slide: 0, frame: 0, busy: false, menu: false, products: [], categories: [],
    category: 'scarpin', feed: 'loading', loadedAt: 0, loading: false, validUntil: 0, lastAttemptAt: null,
    hover: false, heroFocus: false };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let slides = [], frames = [], heroTimer = null, transitionTimer = null, catalogueTimer = null, touch = null;
  let innerWheelUntil = 0;
  const model = () => window.BedeCatalog;
  const editable = target => Boolean(target && target.closest && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'));
  const interactive = target => Boolean(target && target.closest && target.closest('a, button, summary, input, textarea, select, [contenteditable], [role="tab"]'));
  function uiIsOpen() {
    const drawer = $('mobileDrawer'), search = $('homeSearchPanel');
    return state.menu || Boolean(drawer && drawer.classList.contains('open')) ||
      Boolean(search && !search.hidden) || Boolean(document.querySelector('dialog[open], [role="dialog"].open')) ||
      Boolean(document.querySelector('details[data-product-menu][open]'));
  }
  function setText(id, text) { const element = $(id); if (element) element.textContent = text; }
  function stopHero() { if (heroTimer !== null) { window.clearInterval(heroTimer); heroTimer = null; } }
  function updateHeroTimer() {
    stopHero();
    if (reduceMotion.matches || document.hidden || state.slide !== 0 || state.hover || state.heroFocus || editable(document.activeElement) || uiIsOpen() || frames.length < 2) return;
    heroTimer = window.setInterval(() => {
      if (document.hidden || uiIsOpen() || editable(document.activeElement)) { stopHero(); return; }
      window.goToHeroFrame(state.frame + 1);
    }, 7000);
  }

  // These functions exist immediately, before any asynchronous feed request.
  window.irParaLoja = function (url) {
    try {
      const destination = new URL(url, STORE);
      if (destination.origin === STORE && !destination.username && !destination.password) window.location.href = destination.href;
    } catch (_) { /* An invalid destination never changes the page. */ }
  };
  window.openMobileMenu = function () {
    state.menu = true;
    const drawer = $('mobileDrawer'), overlay = $('mobileDrawerOverlay'), button = $('mobileMenuBtn');
    if (drawer) { drawer.classList.add('open'); drawer.inert = false; drawer.setAttribute('aria-hidden', 'false'); }
    if (overlay) overlay.classList.add('open');
    if (button) button.setAttribute('aria-expanded', 'true');
    stopHero();
  };
  window.closeMobileMenu = function () {
    state.menu = false;
    const drawer = $('mobileDrawer'), overlay = $('mobileDrawerOverlay'), button = $('mobileMenuBtn');
    if (drawer) { drawer.classList.remove('open'); drawer.inert = true; drawer.setAttribute('aria-hidden', 'true'); }
    if (overlay) overlay.classList.remove('open');
    if (button) button.setAttribute('aria-expanded', 'false');
    updateHeroTimer();
  };
  window.toggleMobileMenu = function () {
    const drawer = $('mobileDrawer');
    if (state.menu || (drawer && drawer.classList.contains('open'))) window.closeMobileMenu();
    else window.openMobileMenu();
  };
  window.goToSlide = function (index, instant) {
    if (!slides.length || uiIsOpen() || !Number.isFinite(Number(index))) return;
    const next = Math.max(0, Math.min(slides.length - 1, Math.trunc(Number(index))));
    if ((state.busy || next === state.slide) && !instant) return;
    state.slide = next;
    if (next !== 4 && window.location.hash === '#liquidacao' && window.history) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    const immediate = Boolean(instant) || reduceMotion.matches;
    state.busy = !immediate;
    window.clearTimeout(transitionTimer);
    const track = $('slidesTrack');
    if (track) {
      track.style.transition = immediate ? 'none' : 'transform 600ms cubic-bezier(0.25, 1, 0.5, 1)';
      track.style.transform = `translateY(-${next * 100}%)`;
    }
    slides.forEach((slide, i) => { slide.inert = i !== next; slide.setAttribute('aria-hidden', String(i !== next)); });
    const header = $('siteHeader'), logo = $('logoImg');
    if (header) { header.classList.toggle('ghost', next === 0); header.classList.toggle('solid-light', next !== 0); }
    if (logo) logo.src = next === 0 ? 'assets/brand/logo_header_branco.svg' : 'assets/brand/logo_header_preto.svg';
    document.querySelectorAll('.s-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === next);
      dot.setAttribute('aria-current', i === next ? 'step' : 'false');
      dot.style.display = '';
    });
    if (!immediate) transitionTimer = window.setTimeout(() => { state.busy = false; }, 610);
    updateHeroTimer();
  };
  window.goToHeroFrame = function (index) {
    if (!frames.length || !Number.isFinite(Number(index))) return;
    state.frame = ((Math.trunc(Number(index)) % frames.length) + frames.length) % frames.length;
    frames.forEach((frame, i) => {
      frame.classList.toggle('active', i === state.frame);
      frame.inert = i !== state.frame;
      frame.setAttribute('aria-hidden', String(i !== state.frame));
    });
    document.querySelectorAll('.hero-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === state.frame);
      dot.setAttribute('aria-current', i === state.frame ? 'true' : 'false');
    });
  };
  window.nextHeroFrame = function () { window.goToHeroFrame(state.frame + 1); updateHeroTimer(); };
  window.prevHeroFrame = function () { window.goToHeroFrame(state.frame - 1); updateHeroTimer(); };
  window.goToOffers = function () {
    if (window.BedeNavigation) window.BedeNavigation.closeProductMenus();
    window.closeMobileMenu();
    window.goToSlide(4, true);
    if (window.history) window.history.replaceState(null, '', '#liquidacao');
    const heading = $('offersHeading');
    if (heading) heading.focus({ preventScroll: true });
  };
  function scrollRail(id, direction) {
    const rail = $(id);
    if (rail && Number.isFinite(Number(direction))) rail.scrollBy({ left: Math.sign(Number(direction)) * Math.max(280, rail.clientWidth * 0.65), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }
  window.scrollEmAltaRail = direction => scrollRail('emAltaRail', direction);
  window.scrollTiposRail = direction => scrollRail('tiposRail', direction);
  window.scrollTabsRail = direction => scrollRail('tabsRail', direction);
  window.switchCategoryTab = function (category) {
    const key = String(category || '').toLowerCase();
    if (!['scarpin', 'bota', 'mule'].includes(key)) return;
    state.category = key;
    document.querySelectorAll('#categoryTabs .tab-pill').forEach(tab => {
      const selected = (tab.dataset.tab || '').toLowerCase() === key;
      tab.classList.toggle('active', selected); tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
    });
    renderCategory();
  };

  function applyConfiguration() {
    const config = typeof CFG_LOJA !== 'undefined' && CFG_LOJA ? CFG_LOJA : {};
    setText('footerAddress', config.endereco || '');
    const hours = config.horarioAtendimento || config.horario || '';
    setText('footerHorario', hours);
    if ($('footerHorario')) $('footerHorario').hidden = !hours;
    const legal = [config.razaoSocial, config.cnpj ? `CNPJ ${config.cnpj}` : ''].filter(Boolean).join(' · ');
    if (legal) setText('footerLegal', legal);
    const pix = Number(config.descontoPix), installments = Number(config.parcelamentoMax);
    const hasPix = Number.isFinite(pix) && pix > 0, hasInstallments = Number.isInteger(installments) && installments > 0;
    setText('footerPixTag', hasPix ? `PIX ${pix}% OFF` : 'PIX');
    setText('footerCartaoTag', hasInstallments ? `Cartão em até ${installments}x` : 'Cartão');
    const paymentClaims = [hasPix ? `${pix}% NO PIX` : '', hasInstallments ? `ATÉ ${installments}X NO CARTÃO` : ''].filter(Boolean).join(' · ');
    const threshold = Number(config.freteGratisAcimaDe);
    const regions = Array.isArray(config.freteGratisRegioes) ? config.freteGratisRegioes.filter(r => typeof r === 'string' && r.trim()) : [];
    const amount = Number.isFinite(threshold) && threshold > 0 ? threshold.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: Number.isInteger(threshold) ? 0 : 2 }) : '';
    const shippingClaim = amount && regions.length ? `FRETE GRÁTIS ${regions.join(' E ').toUpperCase()} A PARTIR DE ${amount}` : '';
    const claims = [shippingClaim, paymentClaims].filter(Boolean).join(' · ');
    const bar = $('homeBarClaims');
    if (bar) {
      const desktop = bar.querySelector('.bar-desktop-text'), mobile = bar.querySelectorAll('.bar-mobile-lines span');
      if (desktop) desktop.textContent = claims;
      if (mobile[0]) mobile[0].textContent = paymentClaims;
      if (mobile[1]) mobile[1].textContent = shippingClaim;
    }
    setText('mobDrawerClaims', claims);
    let phone = String(config.whatsapp || '').replace(/\D/g, '');
    if (phone.length === 10 || phone.length === 11) phone = '55' + phone;
    if (/^55\d{10,11}$/.test(phone)) {
      document.querySelectorAll('a[href^="https://wa.me/"]').forEach(link => { const u = new URL(link.href); u.pathname = '/' + phone; link.href = u.href; });
      if ($('footerWa')) $('footerWa').textContent = 'WhatsApp: ' + config.whatsapp;
    }
  }

  function message(railId, text, href, label) {
    const rail = $(railId);
    if (!rail) return;
    rail.replaceChildren();
    const block = document.createElement('div'); block.className = 'home-catalog-status'; block.setAttribute('role', 'status');
    const paragraph = document.createElement('p'); paragraph.textContent = text; block.appendChild(paragraph);
    const link = document.createElement('a'); link.href = href || STORE + '/produtos/'; link.textContent = label || 'Ver produtos na loja'; block.appendChild(link);
    rail.appendChild(block); rail.setAttribute('aria-busy', String(state.feed === 'loading'));
    rail.scrollLeft = 0; updateRailButtons(railId);
  }
  function productCard(product, showPrice) {
    const m = model(), escape = m.escapeHTML, promotion = m.getPromotion(product);
    const price = showPrice ? `<span class="nb-card-price">${product.priceRange ? 'A partir de ' : ''}${escape(m.formatBRL(product.priceCents))}</span>` : '';
    const oldPrice = showPrice && promotion ? `<del class="nb-card-old-price">${escape(m.formatBRL(promotion.compareAtCents))}</del>` : '';
    return `<a class="nb-card" href="${escape(product.url)}"><div class="nb-card-img-wrap"><img src="${escape(product.image)}" alt="${escape(product.name)}" loading="lazy" decoding="async"></div><div class="nb-card-info-row"><span class="nb-card-name">${escape(product.name)}</span>${oldPrice}${price}</div></a>`;
  }
  function renderProducts(railId, products, withPrice) {
    const rail = $(railId); if (!rail) return;
    rail.innerHTML = products.map(p => productCard(p, withPrice)).join('');
    rail.setAttribute('aria-busy', 'false'); rail.scrollLeft = 0; updateRailButtons(railId);
  }
  function updateRailButtons(railId) {
    const rail = $(railId), previous = $(railId + 'Prev'), next = $(railId + 'Next');
    if (!rail || !Number.isFinite(rail.scrollWidth) || !Number.isFinite(rail.clientWidth)) return;
    const last = Math.max(0, rail.scrollWidth - rail.clientWidth);
    if (previous) previous.disabled = rail.scrollLeft <= 2;
    if (next) next.disabled = rail.scrollLeft >= last - 2;
  }
  function searchCategory(key) {
    const terms = { scarpin: 'Scarpin', bota: 'Bota', mule: 'Mule', tenis: 'Tênis', sandalia: 'Sandália',
      papete: 'Papete', mocassim: 'Mocassim', rasteirinha: 'Rasteirinha', chinelo: 'Chinelo', bolsa: 'Bolsa',
      mochila: 'Mochila', clutch: 'Clutch', carteira: 'Carteira', slingback: 'Slingback', sapatilha: 'Sapatilha',
      sapato: 'Sapato', tamanco: 'Tamanco', coturno: 'Coturno' };
    return STORE + '/search/?q=' + encodeURIComponent(terms[key] || key);
  }
  function renderCategory() {
    if (state.feed !== 'ready') {
      message('tabsRail', state.feed === 'loading' ? 'Carregando a seleção da loja…' : 'A seleção está temporariamente indisponível.', searchCategory(state.category), 'Ver esta categoria na loja'); return;
    }
    const products = model().selectCategory(state.products, state.category).filter(p => p.available).slice(0, 8);
    if (!products.length) message('tabsRail', 'Nenhum modelo disponível nesta seleção no momento.', searchCategory(state.category), 'Consultar esta categoria na loja');
    else renderProducts('tabsRail', products, true);
  }
  function renderTypes() {
    const rail = $('tiposRail'); if (!rail) return;
    const m = model();
    const categories = m.CATEGORIES.filter(c => state.categories.includes(c.key));
    const cards = categories.map(category => {
      const group = m.selectCategory(state.products, category.key);
      const product = group.find(p => p.available) || group[0];
      if (!product) return '';
      return `<a class="nb-card" href="${m.escapeHTML(searchCategory(category.key))}"><div class="nb-card-img-wrap"><img src="${m.escapeHTML(product.image)}" alt="${m.escapeHTML(category.label + ' — ' + product.name)}" loading="lazy" decoding="async"></div><div class="nb-card-label-only">${m.escapeHTML(category.label)}</div></a>`;
    }).filter(Boolean);
    if (!cards.length) { message('tiposRail', 'Consulte as categorias disponíveis na loja.'); return; }
    rail.innerHTML = cards.join(''); rail.setAttribute('aria-busy', 'false'); updateRailButtons('tiposRail');
  }
  function updateOffers() {
    const section = $('slide4'), button = $('slideSaleBtn');
    if (!section) return;
    const offers = state.feed === 'ready' ? state.products.filter(p => p.available && model().getPromotion(p)) : [];
    if (button) {
      button.hidden = !STORE_OFFERS_READY;
      button.style.display = STORE_OFFERS_READY ? '' : 'none';
      if (STORE_OFFERS_READY) button.href = STORE + '/produtos/?bede_ofertas=1';
      else button.removeAttribute('href');
      button.textContent = 'Ver ofertas →';
    }
    let status = $('homeOffersStatus');
    if (!status) {
      status = document.createElement('p'); status.id = 'homeOffersStatus'; status.className = 'home-catalog-status'; status.setAttribute('role', 'status');
      if (button && button.parentNode) button.parentNode.insertBefore(status, button);
    }
    status.textContent = state.feed === 'loading' ? 'Consultando ofertas da loja…' : state.feed === 'error' ? 'Não foi possível consultar as ofertas agora. Tente novamente em instantes.' : offers.length ? 'Confira produtos com preço promocional.' : 'Nenhuma oferta no momento.';
    let directLinks = $('homeOfferProducts');
    if (!directLinks && button && button.parentNode) {
      directLinks = document.createElement('div'); directLinks.id = 'homeOfferProducts';
      directLinks.style.flexDirection = 'column'; directLinks.style.gap = '12px';
      button.parentNode.insertBefore(directLinks, button);
    }
    if (directLinks) {
      directLinks.replaceChildren();
      directLinks.hidden = STORE_OFFERS_READY || !offers.length;
      directLinks.style.display = directLinks.hidden ? 'none' : 'flex';
      if (!STORE_OFFERS_READY) offers.forEach(product => {
        const link = document.createElement('a'); link.className = 'btn-nv dark';
        link.href = product.url; link.textContent = product.name + ' · ' +
          (product.priceRange ? 'A partir de ' : '') + model().formatBRL(product.priceCents) + ' →';
        directLinks.appendChild(link);
      });
    }
  }
  function clearCatalogueWhileLoading() {
    state.feed = 'loading'; state.products = []; state.categories = []; state.validUntil = 0;
    message('emAltaRail', 'Carregando a seleção da loja…'); message('tiposRail', 'Carregando categorias da loja…'); renderCategory(); updateOffers();
  }
  function scheduleCatalogue(delay) {
    window.clearTimeout(catalogueTimer); catalogueTimer = null;
    if (!document.hidden) catalogueTimer = window.setTimeout(loadCatalogue, Math.max(0, delay));
  }
  async function loadCatalogue() {
    if (state.loading) return;
    window.clearTimeout(catalogueTimer); catalogueTimer = null;
    if (document.hidden) return;
    // A restored page or an expired feed must not display its old prices while
    // a new request is pending, including the minimum retry interval.
    clearCatalogueWhileLoading();
    const sinceAttempt = state.lastAttemptAt === null ? Infinity : Date.now() - state.lastAttemptAt;
    if (sinceAttempt < CATALOGUE_MIN_RETRY_MS) { scheduleCatalogue(CATALOGUE_MIN_RETRY_MS - sinceAttempt); return; }
    state.loading = true; state.lastAttemptAt = Date.now();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const m = model(); if (!m) throw new Error('Catalogue model unavailable');
      const response = await fetch('/api/catalogo', { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Catalogue response unavailable');
      const payload = await response.json();
      if (!payload || !Array.isArray(payload.products) || !payload.products.length) throw new Error('Catalogue empty');
      const fetchedAt = typeof payload.fetchedAt === 'string' ? Date.parse(payload.fetchedAt) : NaN;
      const startedAt = typeof payload.startedAt === 'string' ? Date.parse(payload.startedAt) : NaN;
      const receivedAt = Date.now();
      // The oldest page in the multi-page collection bounds freshness. Small
      // clock skew is tolerated, but missing/expired cache timestamps are not.
      if (!Number.isFinite(fetchedAt) || !Number.isFinite(startedAt) || startedAt > fetchedAt ||
        fetchedAt > receivedAt + 30000 || receivedAt - startedAt >= CATALOGUE_MAX_AGE_MS) throw new Error('Catalogue timestamp unavailable or expired');
      const products = payload.products.map(m.normalizeProduct);
      if (products.some(p => !p) || new Set(products.map(p => p.id)).size !== products.length) throw new Error('Catalogue data invalid');
      state.products = products; state.categories = m.CATEGORIES.filter(c => products.some(p => p.category === c.key)).map(c => c.key);
      state.feed = 'ready'; state.loadedAt = receivedAt;
      state.validUntil = receivedAt + CATALOGUE_MAX_AGE_MS - Math.max(0, receivedAt - startedAt);
      const highlights = m.selectHighlights(products, 8);
      if (highlights.length) renderProducts('emAltaRail', highlights, true);
      else message('emAltaRail', 'Consulte os modelos disponíveis diretamente na loja.');
      renderTypes(); renderCategory(); updateOffers();
    } catch (_) {
      state.products = []; state.categories = []; state.feed = 'error';
      message('emAltaRail', 'Não foi possível carregar a seleção agora. A loja continua disponível.');
      message('tiposRail', 'Não foi possível carregar as categorias agora.'); renderCategory(); updateOffers();
    } finally {
      window.clearTimeout(timeout); state.loading = false;
      scheduleCatalogue(state.feed === 'ready' ? Math.min(CATALOGUE_REFRESH_MS, state.validUntil - Date.now()) : CATALOGUE_REFRESH_MS);
    }
  }

  function canScrollVertically(target, delta) {
    let element = target && target.nodeType === 1 ? target : target && target.parentElement;
    while (element && element !== document.body) {
      const style = window.getComputedStyle(element);
      if (/(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 2) {
        if (delta < 0 && element.scrollTop > 1) return true;
        if (delta > 0 && element.scrollTop + element.clientHeight < element.scrollHeight - 2) return true;
      }
      if (element === slides[state.slide]) break;
      element = element.parentElement;
    }
    return false;
  }
  function setupNavigation() {
    window.addEventListener('wheel', event => {
      if (uiIsOpen() || editable(event.target) || event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || Math.abs(event.deltaY) < 15) return;
      if (canScrollVertically(event.target, event.deltaY)) { innerWheelUntil = Date.now() + 180; return; }
      // Let one gesture finish inside a short-screen section. Its remaining
      // wheel events must not also advance the fullpage after reaching the edge.
      if (Date.now() < innerWheelUntil) { innerWheelUntil = Date.now() + 180; event.preventDefault(); return; }
      event.preventDefault();
      window.goToSlide(state.slide + (event.deltaY > 0 ? 1 : -1));
    }, { passive: false });
    window.addEventListener('touchstart', event => {
      touch = null;
      if (uiIsOpen() || editable(event.target) || event.touches.length !== 1) return;
      touch = { x: event.touches[0].clientX, y: event.touches[0].clientY, target: event.target,
        downScroll: canScrollVertically(event.target, 1), upScroll: canScrollVertically(event.target, -1) };
    }, { passive: true });
    window.addEventListener('touchend', event => {
      const start = touch; touch = null;
      if (!start || uiIsOpen() || !event.changedTouches.length) return;
      const dx = start.x - event.changedTouches[0].clientX, dy = start.y - event.changedTouches[0].clientY;
      if (Math.abs(dy) < 45 || Math.abs(dx) >= Math.abs(dy) || (dy > 0 ? start.downScroll : start.upScroll)) return;
      window.goToSlide(state.slide + (dy > 0 ? 1 : -1));
    }, { passive: true });
    window.addEventListener('touchcancel', () => { touch = null; }, { passive: true });
    window.addEventListener('keydown', event => {
      if (event.defaultPrevented || uiIsOpen() || interactive(event.target) || interactive(document.activeElement) || event.ctrlKey || event.metaKey || event.altKey) return;
      const direction = ['ArrowDown', 'PageDown', ' '].includes(event.key) ? (event.key === ' ' && event.shiftKey ? -1 : 1) : ['ArrowUp', 'PageUp'].includes(event.key) ? -1 : 0;
      if (!direction || canScrollVertically(event.target, direction)) return;
      event.preventDefault(); window.goToSlide(state.slide + direction);
    });
    const tabs = $('categoryTabs');
    if (tabs) tabs.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const buttons = Array.from(tabs.querySelectorAll('.tab-pill'));
      const index = buttons.indexOf(event.target); if (index < 0) return;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
      event.preventDefault(); window.switchCategoryTab(buttons[next].dataset.tab); buttons[next].focus();
    });
  }
  function setViewport() { document.documentElement.style.setProperty('--vh', window.innerHeight + 'px'); }
  function init() {
    slides = Array.from(document.querySelectorAll('.v-slide')); frames = Array.from(document.querySelectorAll('.hero-frame'));
    slides.forEach(slide => { slide.style.overflowY = 'auto'; slide.style.overscrollBehaviorY = 'contain'; });
    setViewport(); applyConfiguration(); setupNavigation();
    ['emAltaRail', 'tiposRail', 'tabsRail'].forEach(id => {
      const rail = $(id);
      if (rail) rail.addEventListener('scroll', () => updateRailButtons(id), { passive: true });
    });
    const hero = $('slide0');
    if (hero) {
      hero.addEventListener('mouseenter', () => { state.hover = true; stopHero(); });
      hero.addEventListener('mouseleave', () => { state.hover = false; updateHeroTimer(); });
      hero.addEventListener('focusin', () => { state.heroFocus = true; stopHero(); });
      hero.addEventListener('focusout', () => { window.setTimeout(() => { state.heroFocus = hero.contains(document.activeElement); updateHeroTimer(); }, 0); });
    }
    window.addEventListener('resize', () => {
      setViewport(); ['emAltaRail', 'tiposRail', 'tabsRail'].forEach(updateRailButtons);
    }, { passive: true });
    window.addEventListener('hashchange', () => { if (window.location.hash === '#liquidacao') window.goToOffers(); });
    reduceMotion.addEventListener('change', updateHeroTimer);
    document.addEventListener('visibilitychange', () => {
      updateHeroTimer();
      if (document.hidden) { window.clearTimeout(catalogueTimer); catalogueTimer = null; }
      else loadCatalogue();
    });
    window.addEventListener('pagehide', event => {
      window.clearTimeout(catalogueTimer); catalogueTimer = null;
      if (event.persisted) clearCatalogueWhileLoading();
    });
    window.addEventListener('pageshow', event => { if (event.persisted) loadCatalogue(); });
    document.addEventListener('focusin', () => { if (editable(document.activeElement)) stopHero(); });
    document.addEventListener('focusout', () => { window.setTimeout(updateHeroTimer, 0); });
    document.addEventListener('toggle', event => {
      if (event.target.closest && event.target.closest('details[data-product-menu]') === event.target) updateHeroTimer();
    }, true);
    window.goToHeroFrame(0); window.goToSlide(window.location.hash === '#liquidacao' ? 4 : 0, true); window.switchCategoryTab('Scarpin');
    loadCatalogue();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
