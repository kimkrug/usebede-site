/* Native Morelia filters and audited header navigation; no catalogue or stock writes. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BedeNativeFilters = api;
}(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var instances = new WeakMap();
  var BAR_ID = 'bede-native-filter-bar';
  var STYLE_ID = 'bede-native-filter-style';
  var CSS = `
#bede-native-filter-bar{position:relative;margin:0 0 26px;padding:18px 0;border-top:1px solid #ddd;border-bottom:1px solid #ddd;color:#000;background:#fff;text-align:left;clear:both;min-width:0}
#bede-native-filter-bar .bede-filter-note{margin:0 0 14px;font-size:12px;line-height:1.5;color:#555}
#bede-native-filter-bar #filters{display:flex;flex-wrap:wrap;align-items:flex-start;gap:12px 16px;width:100%;min-width:0}
#bede-native-filter-bar .bede-filter-size{flex:0 0 100%;display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 4px!important;padding:0!important}
#bede-native-filter-bar .bede-filter-size>[data-bede-filter-heading]{flex:0 0 100%;margin:0 0 4px!important;font-size:13px;line-height:1.4;font-weight:600}
#bede-native-filter-bar .checkbox-container{position:relative;display:inline-flex;vertical-align:top;margin:0!important;padding:0!important;min-height:44px;max-width:100%}
#bede-native-filter-bar .checkbox-container input[type="checkbox"]{display:block!important;position:absolute!important;width:1px!important;height:1px!important;opacity:0;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%)}
#bede-native-filter-bar .checkbox-container .checkbox{display:inline-flex;position:relative;align-items:center;justify-content:center;width:auto;min-width:44px;min-height:44px;height:auto;margin:0;padding:8px 12px;border:1px solid #bdbdbd;border-radius:0;background:#fff;color:#000;line-height:1.35;box-sizing:border-box}
#bede-native-filter-bar .checkbox-icon,#bede-native-filter-bar .checkbox-color{display:none!important}
#bede-native-filter-bar .checkbox-text{position:static;padding:0!important;margin:0!important;color:inherit!important;font-size:13px;white-space:normal}
#bede-native-filter-bar .checkbox-text .ml-1{font-size:11px;font-weight:400;opacity:.75}
#bede-native-filter-bar input:checked+.checkbox{background:#000;color:#fff;border-color:#000}
#bede-native-filter-bar .checkbox-container:hover .checkbox{border-color:#000}
#bede-native-filter-bar input:focus+.checkbox,#bede-native-filter-bar summary:focus,#bede-native-filter-bar a:focus,#bede-native-filter-bar button:focus,#bede-native-filter-bar input[type="number"]:focus{outline:2px solid #000;outline-offset:3px}
#bede-native-filter-bar .bede-filter-disclosure{position:relative;flex:0 1 auto;min-width:140px;max-width:100%;border:1px solid #bdbdbd;background:#fff}
#bede-native-filter-bar .bede-filter-disclosure>summary{display:list-item;cursor:pointer;min-height:44px;padding:11px 32px 11px 14px;box-sizing:border-box;font-size:13px;font-weight:500;line-height:20px;list-style-position:inside}
#bede-native-filter-bar .bede-filter-disclosure>summary::marker{font-size:10px}
#bede-native-filter-bar .bede-filter-disclosure:not([open])>.bede-filter-options{display:none}
#bede-native-filter-bar .bede-filter-disclosure>.bede-filter-options{margin:0!important;padding:12px!important;border-top:1px solid #ddd;max-width:500px;max-height:340px;overflow:auto;overscroll-behavior:contain}
#bede-native-filter-bar .bede-filter-disclosure [data-bede-filter-heading]{display:none}
#bede-native-filter-bar .bede-filter-options .checkbox-container{margin:0 6px 6px 0!important}
#bede-native-filter-bar [data-bede-brand-preserved]{display:none!important}
#bede-native-filter-bar .bede-product-links{list-style:none;min-width:200px;margin:0;padding:0}
#bede-native-filter-bar .bede-product-links a{display:block;min-height:44px;padding:11px 12px;box-sizing:border-box;color:#000;background:#fff;text-decoration:none;font-size:13px;line-height:22px}
#bede-native-filter-bar .bede-product-links a:hover{color:#fff;background:#000}
#bede-native-filter-bar .price-filter-container form{margin:0}
#bede-native-filter-bar .price-filter-container .form-group{display:flex;align-items:flex-end;flex-wrap:wrap;gap:10px;margin:0}
#bede-native-filter-bar .filter-input-price-container{position:relative;float:none;width:100px;max-width:100%;margin:0}
#bede-native-filter-bar .filter-input-price-container .form-label{display:block;position:static;margin:0 0 5px;font-size:12px}
#bede-native-filter-bar .filter-input-price{min-height:44px;width:100%;padding:8px;border:1px solid #999;background:#fff;color:#000;border-radius:0;box-sizing:border-box}
#bede-native-filter-bar .js-price-filter-btn{min-height:44px;padding:10px 16px;background:#000;color:#fff;border:1px solid #000;border-radius:0}
#bede-native-filter-bar .js-price-filter-btn:disabled{opacity:.45;cursor:not-allowed}
#bede-native-filter-bar .bede-filter-sort{display:inline-flex;align-items:center;justify-content:center;min-height:44px;margin:12px 0 0;padding:10px 18px;border:1px solid #000;color:#000!important;background:#fff!important;border-radius:0;font-size:13px;font-weight:500;line-height:22px;text-decoration:none;box-sizing:border-box}
#bede-native-filter-bar .bede-filter-sort:hover{background:#000!important;color:#fff!important}
#bede-native-filter-bar .filters-overlay{position:absolute;inset:0;z-index:3;background:rgba(255,255,255,.96);color:#000}
@media(min-width:768px){#bede-native-filter-bar{padding-right:115px}#bede-native-filter-bar .bede-filter-sort{position:absolute;right:0;bottom:18px;margin:0}}
@media(max-width:767px){#bede-native-filter-bar{margin-bottom:20px;padding:14px 0}#bede-native-filter-bar #filters{gap:10px}#bede-native-filter-bar .bede-filter-disclosure{flex:1 1 calc(50% - 10px);min-width:130px}#bede-native-filter-bar .bede-filter-disclosure[open]{flex-basis:100%}#bede-native-filter-bar .bede-filter-disclosure>.bede-filter-options{max-width:none}#bede-native-filter-bar .bede-filter-sort{width:100%}}
`;

  function isOffers(search) {
    try { return new URLSearchParams(search || '').getAll('bede_ofertas').indexOf('1') !== -1; }
    catch (_) { return true; }
  }

  // Read the existing header submenu; never turn a brand into a product category.
  // If its structure or destinations cannot be verified, keep the native brand UI.
  function productLinks(doc) {
    var links = [], seen = Object.create(null), invalid = false, signature = null;
    Array.from(doc.querySelectorAll('header')).forEach(function (header) {
      Array.from(header.querySelectorAll('.js-nav-main-item')).forEach(function (item) {
        var opener = item.querySelector('a');
        if (!opener || opener.textContent.trim() !== 'Produtos') return;
        var submenu = item.querySelector('.list-subitems');
        if (!submenu) return;
        var menu = [], menuSeen = Object.create(null);
        Array.from(submenu.querySelectorAll('a')).forEach(function (anchor) {
          var href = anchor.getAttribute('href'), label = anchor.textContent.trim();
          try {
            var url = new URL(href, 'https://loja.usebede.com.br');
            var query = Array.from(url.searchParams.keys());
            var validPath = (url.pathname === '/produtos/' && !url.search) ||
              (url.pathname === '/search/' && query.length === 1 && query[0] === 'q' && Boolean(url.searchParams.get('q')));
            if (!href || !/^(https:\/\/|\/)/.test(href) || !label || url.origin !== 'https://loja.usebede.com.br' || url.username || url.password || url.hash || !validPath) { invalid = true; return; }
            if (menuSeen[url.href] && menuSeen[url.href] !== label) { invalid = true; return; }
            if (!menuSeen[url.href]) { menuSeen[url.href] = label; menu.push({ label: label, href: href }); }
          } catch (_) { invalid = true; }
        });
        var current = JSON.stringify(Object.keys(menuSeen).sort().map(function (href) { return [href, menuSeen[href]]; }));
        if (signature !== null && signature !== current) invalid = true;
        if (signature === null) { signature = current; links = menu; seen = menuSeen; }
      });
    });
    return !invalid && links.length >= 2 && links.length <= 40 && seen['https://loja.usebede.com.br/produtos/'] ? links : [];
  }

  function brandIsActive(group, search) {
    if (Array.from(group.querySelectorAll('input')).some(function (input) { return input.checked; }) || group.querySelector('.js-remove-filter')) return true;
    try {
      return Array.from(new URLSearchParams(search || '').keys()).some(function (key) { return /(^|[^a-z])(brand|marca)([^a-z]|$)/i.test(key); });
    } catch (_) { return true; }
  }

  function inspect(doc, runtime) {
    if (!doc || !doc.body || isOffers(runtime.location && runtime.location.search)) return null;
    if (!doc.body.classList.contains('template-category') && !doc.body.classList.contains('template-search')) return null;
    if (doc.getElementById(BAR_ID)) return null;
    var modals = doc.querySelectorAll('#nav-filters');
    var filters = doc.querySelectorAll('#filters');
    var grids = doc.querySelectorAll('.js-product-table');
    if (modals.length !== 1 || filters.length !== 1 || grids.length !== 1 || !grids[0].parentNode) return null;
    var modal = modals[0], filter = filters[0];
    if (!modal.contains(filter) || modal.classList.contains('modal-show') || modal.contains(doc.activeElement)) return null;
    var buttons = doc.querySelectorAll('[data-component="filter-button"][data-toggle="#nav-filters"]');
    if (buttons.length !== 1 || !buttons[0].classList.contains('js-modal-open')) return null;
    var sorts = modal.querySelectorAll('.js-apply-sort-private');
    if (!sorts.length) return null;
    var groups = Array.from(filter.children).filter(function (group) { return group.getAttribute('data-store') === 'filters-group'; });
    if (!groups.length || !groups.some(function (group) { return group.querySelector('.js-filter-checkbox') || group.querySelector('.js-price-filter-input'); })) return null;
    return { modal: modal, filter: filter, grid: grids[0], button: buttons[0], groups: groups };
  }

  function createController(doc, runtime) {
    var stopped = false, scheduled = false, timer = null, status = 'idle';
    var undo = [], disclosures = [], bar = null, style = null;
    var domReady = null, outside = null, escape = null;
    function rememberAttribute(node, name, value) {
      var old = node.getAttribute(name);
      node.setAttribute(name, value);
      undo.push(function () { if (old === null) node.removeAttribute(name); else node.setAttribute(name, old); });
    }
    function addClass(node, name) {
      var had = node.classList.contains(name);
      node.classList.add(name);
      if (!had) undo.push(function () { node.classList.remove(name); });
    }
    function moveWithAnchor(node, target) {
      var anchor = doc.createComment('BEDÊ: posição original do controle nativo');
      node.parentNode.insertBefore(anchor, node);
      target.appendChild(node);
      undo.push(function () { if (anchor.parentNode) { anchor.parentNode.insertBefore(node, anchor); anchor.remove(); } });
    }
    function restore() {
      if (outside) doc.removeEventListener('click', outside);
      if (escape) doc.removeEventListener('keydown', escape);
      undo.reverse().forEach(function (fn) { fn(); });
      undo = [];
      if (bar) bar.remove();
      if (style) style.remove();
      bar = style = null;
    }
    function enhance() {
      if (stopped || bar) return Boolean(bar);
      var native = inspect(doc, runtime);
      if (!native) { status = 'native-preserved'; return false; }
      try {
        style = doc.createElement('style'); style.id = STYLE_ID; style.textContent = CSS;
        if (doc.getElementById(STYLE_ID)) { status = 'native-preserved'; style = null; return false; }
        doc.head.appendChild(style);
        bar = doc.createElement('section'); bar.id = BAR_ID;
        bar.setAttribute('aria-label', 'Filtros do catálogo');
        var note = doc.createElement('p'); note.className = 'bede-filter-note';
        note.textContent = 'Filtros do catálogo. Confirme tamanho, cor e disponibilidade na página do produto.';
        bar.appendChild(note);
        native.grid.parentNode.insertBefore(bar, native.grid);
        moveWithAnchor(native.filter, bar);
        var originalChildren = Array.from(native.filter.childNodes);
        undo.push(function () { native.filter.replaceChildren.apply(native.filter, originalChildren); });
        var sizes = native.groups.filter(function (group) { return group.getAttribute('data-component') === 'list.filter-size'; });
        var brands = native.groups.filter(function (group) { return group.getAttribute('data-component') === 'list.filter-brand'; });
        var navigation = productLinks(doc);
        native.groups.forEach(function (group) {
          var heading = group.querySelector('.font-small.font-weight-bold');
          if (!heading || !heading.textContent.trim()) return;
          rememberAttribute(heading, 'data-bede-filter-heading', '');
          if (sizes.length === 1 && group === sizes[0]) {
            addClass(group, 'bede-filter-size');
            native.filter.insertBefore(group, native.filter.firstChild);
            return;
          }
          if (brands.length === 1 && group === brands[0] && navigation.length) {
            var choices = group.querySelectorAll('.js-filter-checkbox');
            // This replacement is scoped to the observed sole Bedê brand only.
            if (choices.length === 1 && (choices[0].getAttribute('data-filter-value') || '').trim().toLocaleLowerCase('pt-BR') === 'bedê') {
              var products = doc.createElement('details'); products.className = 'bede-filter-disclosure bede-filter-products';
              var title = doc.createElement('summary'); title.textContent = 'Produtos'; products.appendChild(title);
              var list = doc.createElement('ul'); list.className = 'bede-filter-options bede-product-links';
              navigation.forEach(function (link) {
                var li = doc.createElement('li'), anchor = doc.createElement('a');
                anchor.textContent = link.label; anchor.setAttribute('href', link.href);
                li.appendChild(anchor); list.appendChild(li);
              });
              products.appendChild(list); group.parentNode.insertBefore(products, group);
              products.addEventListener('toggle', function () { if (products.open) disclosures.forEach(function (other) { if (other !== products) other.open = false; }); });
              disclosures.push(products);
              if (!brandIsActive(group, runtime.location && runtime.location.search)) {
                rememberAttribute(group, 'data-bede-brand-preserved', '');
                rememberAttribute(group, 'hidden', '');
                return;
              }
              // An active/uncertain brand remains a genuine native Marca control,
              // in addition to Produtos; do not clear the URL or checked state.
            }
          }
          var disclosure = doc.createElement('details'); disclosure.className = 'bede-filter-disclosure';
          var summary = doc.createElement('summary'); summary.textContent = heading.textContent.trim();
          disclosure.appendChild(summary);
          group.parentNode.insertBefore(disclosure, group);
          addClass(group, 'bede-filter-options');
          disclosure.appendChild(group);
          disclosure.addEventListener('toggle', function () {
            if (disclosure.open) disclosures.forEach(function (other) { if (other !== disclosure) other.open = false; });
          });
          disclosures.push(disclosure);
        });
        native.filter.querySelectorAll('.js-price-filter-input').forEach(function (input) {
          if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
            var name = input.getAttribute('name');
            if (name === 'min_price' || name === 'max_price') rememberAttribute(input, 'aria-label', name === 'min_price' ? 'Preço mínimo em reais' : 'Preço máximo em reais');
          }
        });
        // Keep private sorting controls and their modal ancestry untouched.
        // Only the existing opener moves; it still invokes the native drawer.
        var originalButtonChildren = Array.from(native.button.childNodes);
        moveWithAnchor(native.button, bar);
        native.button.textContent = 'Ordenar';
        undo.push(function () { native.button.replaceChildren.apply(native.button, originalButtonChildren); });
        addClass(native.button, 'bede-filter-sort');
        rememberAttribute(native.button, 'aria-label', 'Abrir ordenação de produtos');
        // Native filter progress stays visible after moving its controls.
        native.modal.querySelectorAll('.js-filters-overlay').forEach(function (overlay) { moveWithAnchor(overlay, bar); });
        outside = function (event) { disclosures.forEach(function (details) { if (details.open && !details.contains(event.target)) details.open = false; }); };
        escape = function (event) {
          if (event.key !== 'Escape') return;
          var open = disclosures.filter(function (details) { return details.open; });
          if (!open.length) return;
          event.preventDefault();
          open.forEach(function (details) {
            if (details.contains(doc.activeElement)) details.querySelector('summary').focus();
            details.open = false;
          });
        };
        doc.addEventListener('click', outside);
        doc.addEventListener('keydown', escape);
        status = 'active';
        return true;
      } catch (_) {
        restore(); status = 'native-preserved'; return false;
      }
    }
    function start() {
      if (stopped || scheduled || bar) return controller;
      scheduled = true;
      function waitNative() {
        if (stopped) return;
        if (!inspect(doc, runtime)) { status = 'native-preserved'; return; }
        if (!runtime.LS || !runtime.LS.ready || typeof runtime.LS.ready.then !== 'function') { status = 'native-not-ready'; return; }
        status = 'waiting-native';
        runtime.LS.ready.then(function () {
          if (!stopped) timer = runtime.setTimeout(enhance, 0);
        });
      }
      if (doc.readyState === 'loading') {
        status = 'waiting-dom'; domReady = waitNative;
        doc.addEventListener('DOMContentLoaded', domReady, { once: true });
      } else waitNative();
      return controller;
    }
    function stop() {
      stopped = true;
      if (timer !== null) runtime.clearTimeout(timer);
      if (domReady) doc.removeEventListener('DOMContentLoaded', domReady);
      restore(); status = 'stopped';
    }
    var controller = { start: start, stop: stop, getStatus: function () { return status; } };
    return controller;
  }

  function start(options) {
    options = options || {};
    var runtime = options.runtime || (typeof window !== 'undefined' ? window : null);
    var doc = options.document || (runtime && runtime.document);
    if (!runtime || !doc) return null;
    if (!instances.has(doc) || instances.get(doc).getStatus() === 'stopped') instances.set(doc, createController(doc, runtime));
    return instances.get(doc).start();
  }
  return { start: start, createController: createController, isOffers: isOffers, productLinks: productLinks, brandIsActive: brandIsActive, css: CSS };
}));
