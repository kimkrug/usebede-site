'use strict';
// Local contracts only. Real viewport/keyboard rendering remains a browser check.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const pages = ['index.html', 'sobre.html', 'como-comprar.html', 'trocas.html', 'faq.html', 'privacidade.html', 'termos.html', 'guia-medidas.html'];
const terms = ['chinelo', 'sandalia', 'rasteirinha', 'papete', 'birken', 'mocassim', 'mule', 'clog', 'slingback', 'sapatilha', 'sapato', 'tamanco', 'scarpin', 'tenis', 'bota', 'coturno', 'bolsa', 'mochila', 'clutch'];
const text = html => html.replace(/<[^>]*>/g, '').trim();

test('menu: todas as páginas têm exatamente Produtos, Liquidação, Sobre e Atendimento', () => {
  for (const name of pages) {
    const source = read(name);
    const nav = source.match(/<nav class="main-nav"[^>]*>([\s\S]*?)<\/nav>/)[1];
    const summary = nav.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)[1];
    assert.equal(text(summary).replace('⌄', '').trim(), 'Produtos', name);
    const direct = nav.replace(/<details[\s\S]*?<\/details>/g, '');
    assert.deepEqual([...direct.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map(m => text(m[1])), ['Liquidação', 'Sobre', 'Atendimento'], name);
    assert.match(nav, /data-home-offers href="(?:index\.html)?#liquidacao"/, name);
    assert.doesNotMatch(nav, /bede_ofertas=1|sort=date_desc/, name);
    assert.match(source, /account\/login\//, name);
    assert.match(source, /loja\.usebede\.com\.br\/comprar\//, name);
  }
});

test('menu móvel: mesmo grupo de quatro itens e recolhimento nativo acessível', () => {
  const source = read('index.html');
  const nav = source.match(/<nav class="mob-drawer-nav"[^>]*>([\s\S]*?)<\/nav>/)[1];
  assert.match(nav, /<details class="product-menu" data-product-menu>/);
  const direct = nav.replace(/<details[\s\S]*?<\/details>/g, '');
  assert.deepEqual([...direct.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map(m => text(m[1])), ['Liquidação', 'Sobre', 'Atendimento']);
  assert.match(source, /id="mobileMenuBtn" type="button"/);
  assert.match(source, /id="mobileDrawer"[^>]*aria-modal="true"[^>]*inert/);
});

test('Liquidação preserva abertura nativa em outra aba com teclas modificadoras', () => {
  const source = read('home-ui.js');
  const handler = source.slice(source.indexOf("document.querySelectorAll('a[data-home-offers]')"));
  assert.match(handler, /if \(event\.ctrlKey \|\| event\.metaKey \|\| event\.shiftKey \|\| event\.altKey \|\| event\.button > 0\) return;/);
  assert.ok(handler.indexOf('event.ctrlKey') < handler.indexOf('event.preventDefault()'));
});

function navigationFixture() {
  let active;
  const menus = [];
  class Element {
    constructor(tag, attributes = {}) { this.tagName = tag.toUpperCase(); this.attributes = attributes; this.children = []; this.events = {}; this.open = false; }
    appendChild(child) { child.parent = this; this.children.push(child); return child; }
    replaceChildren() { this.children = []; }
    addEventListener(name, fn) { (this.events[name] ||= []).push(fn); }
    focus() { active = this; }
    contains(child) { return child === this || this.children.some(n => n.contains(child)); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    querySelectorAll(selector) {
      const output = [];
      const matches = node => selector === 'summary' ? node.tagName === 'SUMMARY' : selector === 'a' ? node.tagName === 'A' : selector === '[data-product-links]' ? 'data-product-links' in node.attributes : selector.startsWith('details[data-product-menu]') ? node.tagName === 'DETAILS' && (!selector.includes('[open]') || node.open) : false;
      const walk = node => { for (const child of node.children) { if (matches(child)) output.push(child); walk(child); } };
      walk(this); return output;
    }
  }
  const body = new Element('body');
  for (let i = 0; i < 2; i++) {
    const menu = body.appendChild(new Element('details', { 'data-product-menu': '' }));
    menu.summary = menu.appendChild(new Element('summary'));
    menu.links = menu.appendChild(new Element('div', { 'data-product-links': '' }));
    menus.push(menu);
  }
  const listeners = {};
  const document = { readyState: 'loading', get activeElement() { return active; },
    getElementById() { return null; }, createElement: tag => new Element(tag),
    querySelectorAll: s => body.querySelectorAll(s), querySelector: s => body.querySelector(s),
    addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); } };
  const context = { window: {}, document, WeakSet, encodeURIComponent };
  vm.runInNewContext(read('home-ui.js'), context);
  for (const fn of listeners.DOMContentLoaded || []) fn();
  const emit = (target, name, values = {}) => {
    const event = { key: '', defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...values };
    for (const fn of target[name] || []) fn(event);
    return event;
  };
  return { menus, document, listeners, context, emit, active: () => active };
}

test('submenu: 20 destinos nativos na mesma ordem; hidratação idempotente', () => {
  const f = navigationFixture();
  const expected = ['https://loja.usebede.com.br/produtos/'].concat(terms.map(term => 'https://loja.usebede.com.br/search/?q=' + term));
  for (const menu of f.menus) assert.deepEqual(menu.links.children.map(a => a.href), expected);
  f.context.window.BedeNavigation.setupProductMenus(f.document);
  assert.equal(f.menus[0].links.children.length, 20);
  assert.equal(f.menus[0].summary.events.keydown.length, 1);
});

test('submenu: seta abre, foca o primeiro link e fecha o outro submenu', () => {
  const f = navigationFixture();
  f.menus[1].open = true;
  const event = f.emit(f.menus[0].summary.events, 'keydown', { key: 'ArrowDown' });
  assert.equal(event.defaultPrevented, true);
  assert.equal(f.menus[0].open, true);
  assert.equal(f.menus[1].open, false);
  assert.equal(f.active(), f.menus[0].links.children[0]);
});

test('submenu: Escape retorna o foco; clique externo fecha sem navegar', () => {
  const f = navigationFixture();
  f.menus[0].open = true; f.menus[0].links.children[4].focus();
  const event = f.emit(f.listeners, 'keydown', { key: 'Escape' });
  assert.equal(event.defaultPrevented, true);
  assert.equal(f.menus[0].open, false);
  assert.equal(f.active(), f.menus[0].summary);
  f.menus[0].open = true;
  f.emit(f.listeners, 'click', { target: { closest() { return null; } } });
  assert.equal(f.menus[0].open, false);
});

test('institucionais: clonagem preserva hierarquia e script compartilhado vem primeiro', () => {
  for (const page of pages.slice(1)) {
    assert.ok(read(page).indexOf('src="home-ui.js?') < read(page).indexOf('src="institutional-ui.js?'), page);
    assert.match(read(page), /body\.institutional-page[^}]*overflow-y:\s*auto/);
  }
  const source = read('institutional-ui.js');
  assert.match(source, /Array\.from\(mainNav\.children\)/);
  assert.match(source, /BedeNavigation\.setupProductMenus\(menu\)/);
  assert.match(source, /a\[href\], summary, button/);
});

test('ofertas: link profundo abre slide seguro; coletivo homologado está ativo', () => {
  const source = read('home-app.js');
  assert.match(source, /const STORE_OFFERS_READY = true;/);
  assert.match(source, /window\.location\.hash === '#liquidacao' \? 4 : 0/);
  assert.match(source, /state\.products\.filter\(p => p\.available && model\(\)\.getPromotion\(p\)\)/);
  assert.match(source, /Nenhuma oferta no momento/);
  assert.match(source, /offers\.forEach\(product/);
  assert.doesNotMatch(source, /offers\.slice\(0, 4\)/);
  const definition = source.match(/window\.goToOffers = function \(\) \{([\s\S]*?)\n  \};/)[1];
  const calls = [];
  vm.runInNewContext('(function () {' + definition + '}())', { window: {
    BedeNavigation: { closeProductMenus() { calls.push('menus'); } },
    closeMobileMenu() { calls.push('drawer'); }, goToSlide(n, instant) { calls.push([n, instant]); },
    history: { replaceState(a, b, fragment) { calls.push(fragment); } }
  }, $: () => ({ focus(options) { calls.push(options.preventScroll); } }) });
  assert.deepEqual(calls, ['menus', 'drawer', [4, true], '#liquidacao', true]);
});

test('fullpage: submenu aberto e summary não são interpretados como rolagem da home', () => {
  const source = read('home-app.js');
  assert.match(source, /a, button, summary, input/);
  assert.match(source, /document\.querySelector\('details\[data-product-menu\]\[open\]'\)/);
  assert.match(source, /Math\.abs\(event\.deltaX\) > Math\.abs\(event\.deltaY\)/);
  assert.match(source, /prefers-reduced-motion/);
  assert.equal((read('index.html').match(/class="[^"]*\bv-slide\b[^"]*"/g) || []).length, 8);
});

test('cards: nome, imagem e preço da fonte são escapados; nada de tamanhos inventados', () => {
  const model = require('../catalog-model.js');
  const source = read('home-app.js');
  const fn = source.slice(source.indexOf('  function productCard('), source.indexOf('  function renderProducts('));
  const input = { name: 'Mule <real>', image: 'https://example.test/a.jpg', url: 'https://loja.usebede.com.br/produtos/real/', priceCents: 9000, compareAtCents: 10000, priceRange: true };
  const html = vm.runInNewContext(fn + '\nproductCard(input, true)', { input, model: () => model });
  assert.match(html, /Mule &lt;real&gt;/);
  assert.match(html, /A partir de/);
  assert.match(html, /90,00/);
  assert.match(html, /100,00/);
  assert.match(source, /renderProducts\('tabsRail', products, true\)/);
  assert.doesNotMatch(html, /Tamanho|Disponíveis|33.*40/);
});

test('cards: responsividade, preços separados e fotografias sem recorte', () => {
  const css = read('style.css');
  assert.match(css, /\.nb-card-info-row\s*\{\s*display: grid/);
  assert.match(css, /\.nb-card-name\s*\{[\s\S]*?white-space: normal/);
  assert.match(css, /\.nb-card-img-wrap img\s*\{[^}]*object-fit: contain/);
  assert.match(css, /flex-basis: min\(74vw, 320px\)/);
  assert.match(css, /#tiposRail \.nb-card\s*\{ flex-basis: min\(48vw, 220px\)/);
  assert.match(css, /\.rail-arrow:disabled/);
  assert.match(css, /\.nb-slide-container \{ height: auto; min-height: 100%; overflow: visible;/);
});

test('cards editoriais: links nativos acessíveis e bolsas sem desvio ao catálogo geral', () => {
  const source = read('index.html');
  const section = source.match(/<section class="v-slide" id="slide2"[\s\S]*?<\/section>/)[0];
  assert.equal((section.match(/<a class="dual-half"/g) || []).length, 2);
  assert.match(section, /href="https:\/\/loja\.usebede\.com\.br\/search\/\?q=bolsa" aria-label="Ver Bolsas"/);
  assert.doesNotMatch(section, /role="button"|onclick=|Bolsas &amp; Casuais/);
  assert.match(source, /id="pageTransition"[^>]*aria-hidden="true"/);
});

test('rolagem: um gesto interno não avança duas interfaces; nova intenção continua fullpage', () => {
  let now = 1000, canScroll = true, handler;
  const calls = [];
  const source = read('home-app.js');
  const wheel = source.slice(source.indexOf("    window.addEventListener('wheel'"), source.indexOf("    window.addEventListener('touchstart'"));
  const context = { innerWheelUntil: 0, state: { slide: 2 }, uiIsOpen: () => false, editable: () => false,
    canScrollVertically: () => canScroll, Date: { now: () => now }, Math,
    window: { addEventListener(type, fn) { assert.equal(type, 'wheel'); handler = fn; }, goToSlide(n) { calls.push(n); } } };
  vm.runInNewContext(wheel, context);
  function event(extra = {}) { const e = { deltaX: 0, deltaY: 80, target: {}, prevented: false, preventDefault() { this.prevented = true; }, ...extra }; handler(e); return e; }
  assert.equal(event().prevented, false, 'primeiro permite rolagem nativa');
  canScroll = false; now = 1040;
  assert.equal(event().prevented, true);
  assert.deepEqual(calls, [], 'a borda no mesmo gesto não pula slide');
  now = 1130; event();
  assert.deepEqual(calls, [], 'inércia prolonga somente a trava curta');
  now = 1311; event();
  assert.deepEqual(calls, [3], 'depois da pausa, fullpage continua funcionando');
  assert.equal(event({ deltaX: 120, deltaY: 20 }).prevented, false, 'gesto horizontal permanece do trilho');
});
