'use strict';

// Apenas Node: testes de modelo puro e integração estática da homepage.
// Não verifica renderização, sessões reais, bfcache, frete ou publicação.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const M = require('../catalog-model.js');
const clone = value => JSON.parse(JSON.stringify(value));

function product(overrides = {}) {
  return {
    id: '12345', name: 'Scarpin real Preto', category: 'scarpin',
    url: 'https://loja.usebede.com.br/produtos/scarpin-real/',
    image: 'https://acdn-us.mitiendanube.com/stores/008/137/758/products/scarpin-real.webp',
    priceCents: 26990, compareAtCents: null, available: true, priceRange: false,
    ...overrides
  };
}

test('catalog: UMD funciona no navegador sem dependências de Node', () => {
  const sandbox = { window: {}, URL, Intl };
  vm.runInNewContext(read('catalog-model.js'), sandbox);
  assert.equal(typeof sandbox.window.BedeCatalog.normalizeProduct, 'function');
  assert.equal(sandbox.window.BedeCatalog.STORE, 'https://loja.usebede.com.br');
});

test('catalog: normalização conserva identidade, preço explícito e imagem do mesmo registro', () => {
  const input = product({ id: 12345, compareAtCents: 30000, sku: 'REAL-35-PRETO', stock: 2 });
  const baseline = clone(input);
  const output = M.normalizeProduct(input);
  assert.equal(output.id, '12345');
  assert.equal(output.url, input.url);
  assert.equal(output.image, input.image);
  assert.equal(output.priceCents, 26990);
  assert.equal(output.compareAtCents, 30000);
  assert.equal(output.available, true);
  assert.deepEqual(input, baseline, 'nenhuma mutação de SKU/saldo/preço fonte');
  assert.ok(!Object.hasOwn(output, 'stock'), 'não gerar um novo estoque próprio');
});

test('catalog: preço ausente/inválido não recorre a campos legados', () => {
  for (const invalid of [undefined, null, 0, -1, '26990', 269.9, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(M.normalizeProduct(product({ priceCents: invalid, preco: 99.9, price: 99.9, cachedPrice: 9990 })), null);
  }
});

test('catalog: sem imagem ou identidade válida não inventa produto substituto', () => {
  for (const invalid of [null, {}, product({ id: '' }), product({ name: '' }), product({ name: '   ' }),
    product({ image: '' }), product({ image: 'https://placehold.co/400x500' }),
    product({ image: 'https://images.unsplash.com/foto-de-outro-produto' }),
    product({ image: 'javascript:alert(1)' }), product({ url: 'https://outra-loja.example/produtos/scarpin-real/' }),
    product({ url: 'https://loja.usebede.com.br@evil.example/produtos/scarpin-real/' })]) {
    assert.equal(M.normalizeProduct(invalid), null);
  }
});

test('catalog: promoção exige compareAt explícito maior que preço positivo', () => {
  assert.deepEqual(M.getPromotion(product({ priceCents: 8000, compareAtCents: 10000 })), { priceCents: 8000, compareAtCents: 10000, percent: 20 });
  for (const extra of [{ compareAtCents: null }, { compareAtCents: 0 }, { compareAtCents: 26990 },
    { compareAtCents: 20000 }, { compareAtCents: '30000' }, { priceCents: 0, compareAtCents: 10000 },
    { preco_antigo: 400, descontoPix: 5 }, { discount: 5, coupon: 'PROMO5' }]) {
    assert.equal(M.getPromotion(product(extra)), null, JSON.stringify(extra));
  }
  assert.equal(M.normalizeProduct(product({ compareAtCents: 20000 })).compareAtCents, null);
});

test('catalog: categoria vazia fica vazia sem completar com bolsas ou outros modelos', () => {
  const inputs = [product({ id: 'BOLSA', category: 'bolsa' }), product({ id: 'BOTA', category: 'bota' })];
  const original = clone(inputs);
  assert.deepEqual(M.selectCategory(inputs, 'scarpin'), []);
  assert.deepEqual(M.selectCategory(inputs, 'BÓTA').map(p => p.id), ['BOTA']);
  assert.deepEqual(inputs, original);
});

test('catalog: curadoria não inclui indisponível, não duplica e respeita limite', () => {
  const inputs = [product({ id: 'ZERO', available: false }), product({ id: 'A' }),
    product({ id: 'A' }), product({ id: 'B', category: 'bota' }), product({ id: 'C', category: 'bolsa' })];
  const original = clone(inputs);
  const chosen = M.selectHighlights(inputs, 2);
  assert.equal(chosen.length, 2);
  assert.equal(new Set(chosen.map(p => p.id)).size, 2);
  assert.ok(chosen.every(p => p.available && inputs.includes(p)));
  assert.deepEqual(M.selectHighlights(inputs, 0), []);
  assert.deepEqual(inputs, original);
});

test('catalog: categorias comuns de calçado e bolsa não se confundem', () => {
  const examples = { 'SCARPIN MARTTA MÉDIO': 'scarpin', 'BOTAS CROCO': 'bota',
    'BOTA COTURNO BRENDA': 'coturno', 'TÊNIS SOFI': 'tenis', 'CLUTCH PALHA': 'clutch',
    'CLOGS MULE SABRINA': 'mule', 'PAPETE ONÇA': 'papete' };
  for (const [name, category] of Object.entries(examples)) assert.equal(M.inferCategory(name), category, name);
});

test('catalog: moeda mantém centavos e texto externo é escapado', () => {
  assert.match(M.formatBRL(26990), /269,90/);
  assert.match(M.formatBRL(1), /0,01/);
  assert.equal(M.escapeHTML('<img src=x onerror="x"> & \'produto\''), '&lt;img src=x onerror=&quot;x&quot;&gt; &amp; &#39;produto&#39;');
});

function publicCard(overrides = {}, compare = '') {
  const p = product(overrides);
  const data = { '@type': 'Product', name: p.name, image: p.image,
    offers: { '@type': 'Offer', priceCurrency: 'BRL', price: p.priceCents / 100,
      availability: p.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: p.url } };
  return `<div data-product-type="list"><a data-product-price="${p.priceCents}"></a>${compare}<script type="application/ld+json">${JSON.stringify(data)}</script></div>`;
}

test('api: produto público conserva preço exibido; desconto oculto não vira promoção', () => {
  const { parsePage } = require('../api/catalogo.js');
  const page = M.STORE + '/produtos/';
  const hidden = '<span class="js-compare-price-display" style="display: none">R$ 399,90</span>';
  const output = parsePage(publicCard({}, hidden), page).products[0];
  assert.equal(output.priceCents, 26990);
  assert.equal(output.compareAtCents, null);
  assert.equal(output.image, product().image);
  const visible = '<span class="js-compare-price-display">R$ 399,90</span>';
  assert.equal(parsePage(publicCard({}, visible), page).products[0].compareAtCents, 39990);
  assert.throws(() => parsePage(publicCard().replace('"BRL"', '"USD"'), page));
});

test('api: paginação coleta somente fonte pública sem escrita ou alteração de valores', async () => {
  const { collectCatalogue } = require('../api/catalogo.js');
  const calls = [];
  const first = publicCard() + '<a href="/produtos/page/2/">2</a><a href="https://evil.invalid/produtos/page/2/">fora</a>';
  const second = publicCard({ id: '222', name: 'Bota de teste', url: M.STORE + '/produtos/bota-teste/', priceCents: 33990 });
  const result = await collectCatalogue(async (url, options) => {
    calls.push({ url, options });
    return { ok: true, headers: { get: () => 'text/html' }, text: async () => calls.length === 1 ? first : second };
  });
  assert.equal(result.products.length, 2);
  assert.deepEqual(result.products.map(p => p.priceCents), [26990, 33990]);
  assert.deepEqual(calls.map(c => c.url), [M.STORE + '/produtos/', M.STORE + '/produtos/page/2/']);
  assert.ok(calls.every(c => !c.options.method || c.options.method === 'GET'));
  assert.ok(calls.every(c => !c.options.body && !c.options.headers.Authorization));
});

test('api: fonte falha ou SKU/handle repetido não retorna catálogo parcial/antigo', async () => {
  const { collectCatalogue } = require('../api/catalogo.js');
  await assert.rejects(collectCatalogue(async () => ({ ok: false, status: 503 })), /Store response 503/);
  let page = 0;
  await assert.rejects(collectCatalogue(async () => ({ ok: true, headers: { get: () => 'text/html' },
    text: async () => publicCard() + (++page === 1 ? '<a href="/produtos/page/2/">2</a>' : '') })), /Catalogue changed/);
});

test('api: métodos de escrita rejeitados antes de qualquer consulta', async () => {
  const handler = require('../api/catalogo.js');
  const headers = {};
  let body;
  const res = { statusCode: 0, setHeader: (name, value) => { headers[name] = value; }, end: value => { body = value; } };
  await handler({ method: 'POST', headers: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(headers.Allow, 'GET');
  assert.match(body, /Method not allowed/);
});

test('api: comparação oculta no elemento ou ancestral não vira promoção', () => {
  const { parsePage } = require('../api/catalogo.js');
  const price = '<span class="js-compare-price-display">R$ 399,90</span>';
  const hidden = [
    '<span class="js-compare-price-display d-none">R$ 399,90</span>',
    '<span class="js-compare-price-display" hidden>R$ 399,90</span>',
    '<span class="js-compare-price-display" aria-hidden="true">R$ 399,90</span>',
    '<div class="d-none">' + price + '</div>',
    '<div style="display: none !important">' + price + '</div>',
    '<div style="visibility: hidden">' + price + '</div>'
  ];
  for (const markup of hidden) assert.equal(parsePage(publicCard({}, markup), M.STORE + '/produtos/').products[0].compareAtCents, null, markup);
  const oldHiddenThenReal = hidden[0] + price.replace('399,90', '299,90');
  assert.equal(parsePage(publicCard({}, oldHiddenThenReal), M.STORE + '/produtos/').products[0].compareAtCents, 29990);
});

test('api: CORS fixo da loja independe de Origin e da ordem que aquece o cache', async t => {
  const handler = require('../api/catalogo.js'), calls = [];
  const response = () => ({ headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(body) { this.body = JSON.parse(body); } });
  t.mock.method(global, 'fetch', async (url, options) => { calls.push({url, options}); return { ok: true, headers: { get: () => 'text/html' }, text: async () => publicCard() }; });
  const origins = [undefined, M.STORE, 'https://www.usebede.com.br', 'https://usebede.com.br', 'https://untrusted.example'];
  for (const order of [origins, origins.slice().reverse()]) {
    let cachedHeaders;
    for (const origin of order) {
      const res = response(); await handler({ method: 'GET', headers: origin ? {origin} : {} }, res);
      assert.equal(res.statusCode, 200); assert.equal(res.body.products.length, 1);
      assert.equal(res.headers['Access-Control-Allow-Origin'], M.STORE);
      assert.notEqual(res.headers['Access-Control-Allow-Origin'], '*');
      assert.equal(res.headers['Access-Control-Allow-Credentials'], undefined);
      assert.equal(res.headers.Vary, undefined, 'header does not need an Origin-specific CDN cache key');
      cachedHeaders ||= res.headers;
      assert.equal(cachedHeaders['Access-Control-Allow-Origin'], M.STORE, 'cached no-Origin response remains readable by the store');
      assert.deepEqual(res.headers, cachedHeaders);
    }
  }
  assert.ok(calls.every(call => !call.options.body && !call.options.headers.Authorization && !call.options.headers.Cookie));
  assert.match(read('home-app.js'), /fetch\('\/api\/catalogo'/, 'home consumer remains same-origin');
  assert.match(read('store-enhancements.js'), /fetch\(HOME\+'\/api\/catalogo',\{method:'GET',credentials:'omit'/);
});

test('api: CORS fixo também cobre erro e GET-only sem habilitar credenciais ou escrita', async t => {
  const handler = require('../api/catalogo.js'); let calls = 0;
  const response = () => ({ headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(body) { this.body = JSON.parse(body); } });
  t.mock.method(global, 'fetch', async () => { calls++; return { ok: false, status: 503 }; });
  t.mock.method(console, 'error', () => {});
  for (const method of ['POST','PUT','PATCH','DELETE','OPTIONS','HEAD']) {
    const res = response(); await handler({method, headers: {origin: M.STORE}}, res);
    assert.equal(res.statusCode, 405); assert.equal(res.headers.Allow, 'GET');
    assert.equal(res.headers['Access-Control-Allow-Origin'], M.STORE);
    assert.equal(res.headers['Access-Control-Allow-Credentials'], undefined);
    assert.equal(res.headers['Access-Control-Allow-Methods'], undefined);
  }
  assert.equal(calls, 0, 'unsupported methods never read the source');
  const failed = response(); await handler({method: 'GET', headers: {}}, failed);
  assert.equal(failed.statusCode, 503); assert.equal(failed.headers['Access-Control-Allow-Origin'], M.STORE);
  assert.equal(failed.headers['Cache-Control'], 'no-store'); assert.equal(failed.body.products, null);
  assert.equal(failed.headers['Access-Control-Allow-Credentials'], undefined);
});

test('api: promoção responsiva legítima e preço em faixa são preservados', () => {
  const { parsePage } = require('../api/catalogo.js');
  const responsive = '<span class="js-compare-price-display d-none d-md-inline">R$ <strong>399,90</strong></span>';
  const parsed = parsePage(publicCard({}, responsive), M.STORE + '/produtos/').products[0];
  assert.equal(parsed.compareAtCents, 39990);
  const repeated = responsive + '<span class="js-compare-price-display d-md-none">R$ 399,90</span>';
  assert.equal(parsePage(publicCard({}, repeated), M.STORE + '/produtos/').products[0].compareAtCents, 39990);
  const conflicting = responsive + '<span class="js-compare-price-display">R$ 299,90</span>';
  assert.equal(parsePage(publicCard({}, conflicting), M.STORE + '/produtos/').products[0].compareAtCents, null);
  assert.equal(parsePage(publicCard({}, '<span class="d-none">A partir de</span>'), M.STORE + '/produtos/').products[0].priceRange, false);
  assert.equal(parsePage(publicCard({}, '<span>A partir de</span>'), M.STORE + '/produtos/').products[0].priceRange, true);
  assert.equal(parsePage(publicCard().replace('"@type":"Offer"', '"@type":"AggregateOffer"'), M.STORE + '/produtos/').products[0].priceRange, true);
});

test('api: prazo total limita a coleta e reduz timeout das páginas finais', async t => {
  const { collectCatalogue } = require('../api/catalogo.js');
  let clock = 0, calls = 0;
  const deadlines = [];
  t.mock.method(Date, 'now', () => clock);
  t.mock.method(AbortSignal, 'timeout', milliseconds => { deadlines.push(milliseconds); return new AbortController().signal; });
  await assert.rejects(collectCatalogue(async () => {
    const page = ++calls;
    return { ok: true, headers: { get: () => 'text/html' }, text: async () => {
      clock = page === 1 ? 15000 : 18000;
      return publicCard({ url: M.STORE + '/produtos/teste-' + page + '/' }) + (page === 1 ? '<a href="/produtos/page/2/">2</a>' : '');
    } };
  }), /deadline exceeded/);
  assert.equal(calls, 2);
  assert.deepEqual(deadlines, [8000, 3000]);
});

test('api: coleta concorrente compartilhada, cache curto e erro sem catálogo antigo', async t => {
  const handler = require('../api/catalogo.js');
  let calls = 0;
  const response = () => ({ headers: {}, statusCode: 0,
    setHeader(name, value) { this.headers[name] = value; }, end(body) { this.body = JSON.parse(body); } });
  t.mock.method(global, 'fetch', async () => { calls++; return { ok: true, headers: { get: () => 'text/html' }, text: async () => publicCard() }; });
  const a = response(), b = response();
  await Promise.all([handler({ method: 'GET', headers: {} }, a), handler({ method: 'GET', headers: {} }, b)]);
  assert.equal(calls, 1);
  assert.equal(a.statusCode, 200);
  assert.deepEqual(a.body, b.body);
  assert.equal(a.headers['Cache-Control'], 'public, max-age=0, s-maxage=120, must-revalidate');
  assert.ok(Number.isFinite(Date.parse(a.body.fetchedAt)));
  t.mock.method(global, 'fetch', async () => ({ ok: false, status: 503 }));
  t.mock.method(console, 'error', () => {});
  const failed = response();
  await handler({ method: 'GET', headers: {} }, failed);
  assert.equal(failed.statusCode, 503);
  assert.equal(failed.headers['Cache-Control'], 'no-store');
  assert.equal(failed.body.products, null);
});

test('vercel: só a duração da função é configurada, sem reescrever o site', () => {
  const config = JSON.parse(read('vercel.json'));
  assert.equal(config.functions['api/catalogo.js'].maxDuration, 30);
  assert.deepEqual(Object.keys(config).sort(), ['$schema', 'functions']);
  assert.deepEqual(Object.keys(config.functions), ['api/catalogo.js']);
  assert.deepEqual(Object.keys(config.functions['api/catalogo.js']), ['maxDuration']);
});

test('home: carrega somente entrypoint novo e modelo; legados fora do documento', () => {
  const html = read('index.html');
  const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(m => m[1].split('?')[0]);
  assert.ok(scripts.includes('catalog-model.js'));
  assert.ok(scripts.includes('home-app.js'));
  assert.ok(scripts.indexOf('catalog-model.js') < scripts.indexOf('home-app.js'));
  assert.ok(!scripts.some(src => ['app.js', 'products.js', 'avaliacoes.js'].includes(src)));
});

test('home: navegação, sacola e conta nativas sem interceptação de links', () => {
  const html = read('index.html');
  const anchors = [...html.matchAll(/<a\b[^>]*>/g)].map(m => m[0]);
  const storeLinks = anchors.filter(tag => /href="https:\/\/loja\.usebede\.com\.br\//.test(tag));
  assert.ok(storeLinks.some(tag => /\/comprar\/"/.test(tag)), 'sacola Nuvemshop');
  assert.ok(storeLinks.some(tag => /\/(?:account|conta|login|customer)/.test(tag)), 'conta nativa');
  for (const tag of storeLinks) assert.doesNotMatch(tag, /irParaLoja\(|return false|preventDefault\(/);
  const entry = read('home-app.js');
  assert.doesNotMatch(entry, /shop_func\.php|wbuySacola|STILETTO_PRODUCTS|bede_cart_v2|pageTransition/);
});

test('home: fullpage e coleção de promoções vazia explícita preservados', () => {
  const html = read('index.html');
  assert.equal([...html.matchAll(/<section\b[^>]*class="[^"]*\bv-slide\b[^\"]*"/g)].length, 8);
  assert.match(html, /id="slidesTrack"/);
  assert.match(html, /id="slide4"/);
  assert.match(html + read('home-app.js'), /sem\s+(?:ofertas|promo[çc][õo]es)|nenhuma\s+(?:oferta|promo[çc][aã]o)/i);
});

test('home: CTA coletivo homologado está ativo no runtime e seguro sem JavaScript', () => {
  assert.match(read('home-app.js'), /const STORE_OFFERS_READY = true;/);
  const tag = read('index.html').match(/<a\b[^>]*id="slideSaleBtn"[^>]*>/)?.[0];
  assert.ok(tag);
  assert.match(tag, /\bhidden\b/);
  assert.match(tag, /display:\s*none/);
  assert.doesNotMatch(tag, /\bhref\s*=/);
});

test('home: frete grátis permanece condicionado em texto, sem promessa universal', () => {
  const html = read('index.html');
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  assert.match(text, /frete gr[aá]tis.{0,100}(Sul.{0,25}Sudeste|599)/i);
});

// DOM mínimo deliberado: testa contratos e eventos do entrypoint, não layout real.
async function createHome(products = [product()], options = {}) {
  const nodes = [], listeners = {}, timers = new Map(), intervals = new Map(), requests = [];
  let timerID = 0, now = 1000, failing = Boolean(options.fail);
  function listen(target, type, callback) { (target[type] ||= []).push(callback); }
  function emit(target, type, overrides = {}) {
    const event = { target: doc.body, deltaX: 0, deltaY: 80, defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; }, ...overrides };
    for (const callback of target[type] || []) callback(event);
    return event;
  }
  class Element {
    constructor(tag = 'div', id = '', classes = '') {
      this.tagName = tag.toUpperCase(); this.id = id; this.className = classes;
      this.nodeType = 1; this.dataset = {}; this.attributes = {}; this.children = [];
      this.parentElement = this.parentNode = null; this.events = {};
      this.style = { setProperty(name, value) { this[name] = value; } };
      this.hidden = false; this.inert = false; this.scrollTop = this.scrollLeft = 0;
      this.scrollHeight = this.clientHeight = 500; this.clientWidth = 600;
      this._text = ''; this._html = ''; nodes.push(this);
      this.classList = {
        contains: name => this.className.split(/\s+/).includes(name),
        add: name => { if (!this.classList.contains(name)) this.className += ' ' + name; },
        remove: name => { this.className = this.className.split(/\s+/).filter(c => c !== name).join(' '); },
        toggle: (name, force) => { const add = force === undefined ? !this.classList.contains(name) : force; this.classList[add ? 'add' : 'remove'](name); }
      };
    }
    set textContent(value) { this._text = String(value); this._html = ''; this.children = []; }
    get textContent() { return this._text + this.children.map(c => c.textContent).join(' '); }
    set innerHTML(value) { this._html = String(value); this._text = ''; this.children = []; }
    get innerHTML() { return this._html; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    removeAttribute(name) { delete this.attributes[name]; if (name === 'href') delete this.href; }
    appendChild(child) { child.parentElement = child.parentNode = this; this.children.push(child); return child; }
    insertBefore(child, before) { child.parentElement = child.parentNode = this; this.children.splice(this.children.indexOf(before), 0, child); return child; }
    replaceChildren(...children) { this._html = ''; this._text = ''; this.children = []; children.forEach(c => this.appendChild(c)); }
    addEventListener(type, callback) { listen(this.events, type, callback); }
    contains(child) { return child === this || this.children.some(c => c.contains(child)); }
    closest(selector) { for (let node = this; node; node = node.parentElement) if (selector.split(',').some(s => matches(node, s.trim()))) return node; return null; }
    querySelectorAll(selector) { return select(selector, this).filter(n => n !== this); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    focus() { doc.activeElement = this; }
    scrollBy({ left }) { this.scrollLeft += left; }
  }
  function matches(node, selector) {
    if (selector.startsWith('#')) return node.id === selector.slice(1);
    if (selector.startsWith('.')) return node.classList.contains(selector.slice(1));
    if (selector.startsWith('[contenteditable]')) return Object.hasOwn(node.attributes, 'contenteditable') && (!selector.includes(':not') || node.attributes.contenteditable !== 'false');
    if (selector === '[role="tab"]') return node.attributes.role === 'tab';
    if (selector === 'a[href^="https://wa.me/"]') return node.tagName === 'A' && /^https:\/\/wa\.me\//.test(node.href);
    return node.tagName.toLowerCase() === selector;
  }
  function select(selector, within) {
    if (selector.includes('dialog')) return [];
    const parts = selector.split(' ');
    return nodes.filter(node => (!within || within.contains(node)) && matches(node, parts.at(-1)) &&
      (parts.length === 1 || node.parentElement?.closest(parts.slice(0, -1).join(' '))));
  }
  const doc = { readyState: 'loading', hidden: false, events: {},
    getElementById: id => nodes.find(n => n.id === id) || null,
    createElement: tag => new Element(tag), querySelectorAll: selector => select(selector),
    querySelector: selector => select(selector)[0] || null,
    addEventListener(type, callback) { listen(this.events, type, callback); } };
  doc.documentElement = new Element('html'); doc.body = new Element('body');
  doc.documentElement.appendChild(doc.body); doc.activeElement = doc.body;
  function add(id, tag = 'div', classes = '', parent = doc.body) { return parent.appendChild(new Element(tag, id, classes)); }
  const track = add('slidesTrack');
  const slides = Array.from({ length: 8 }, (_, i) => add('slide' + i, 'section', 'v-slide', track));
  Array.from({ length: 3 }, (_, i) => add('frame' + i, 'div', 'hero-frame', slides[0]));
  Array.from({ length: 8 }, (_, i) => add('dot' + i, 'button', 's-dot'));
  Array.from({ length: 3 }, (_, i) => add('herodot' + i, 'button', 'hero-dot'));
  ['siteHeader', 'logoImg', 'mobileDrawer', 'mobileDrawerOverlay', 'mobileMenuBtn', 'emAltaRail', 'tiposRail',
    'tabsRail', 'footerAddress', 'footerHorario', 'footerLegal', 'footerPixTag', 'footerCartaoTag', 'mobDrawerClaims'].forEach(id => add(id));
  add('homeSearchPanel').hidden = true;
  add('slideSaleBtn', 'a', '', slides[4]);
  const tabs = add('categoryTabs');
  ['Scarpin', 'Bota', 'Mule'].forEach(category => { const t = add('tab' + category, 'button', 'tab-pill', tabs); t.dataset.tab = category; t.setAttribute('role', 'tab'); });
  const bar = add('homeBarClaims'); add('', 'span', 'bar-desktop-text', bar);
  const mobileClaims = add('', 'div', 'bar-mobile-lines', bar);
  add('', 'span', '', mobileClaims); add('', 'span', '', mobileClaims);
  add('footerWa', 'a').href = 'https://wa.me/5511999999999?text=Olá';
  class TestDate extends Date { static now() { return now; } }
  const context = { document: doc, URL, Intl, Set, AbortController, Date: TestDate, console,
    innerHeight: 900, location: { href: 'https://www.usebede.com.br/' }, BedeCatalog: M,
    localStorage: { getItem() { throw new Error('Persistência antiga proibida'); } },
    STILETTO_PRODUCTS: [{ name: 'STALE', preco: 1, image: 'https://placehold.co/dummy' }],
    matchMedia: () => ({ matches: options.reduceMotion !== false, addEventListener() {} }),
    getComputedStyle: element => ({ overflowY: element.style.overflowY || 'visible' }),
    addEventListener: (type, callback) => listen(listeners, type, callback),
    setTimeout: (callback, delay) => { const id = ++timerID; timers.set(id, { callback, delay, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id),
    setInterval: callback => { const id = ++timerID; intervals.set(id, callback); return id; },
    clearInterval: id => intervals.delete(id),
    fetch: async (url, init) => { requests.push({ url, init }); return { ok: !failing, json: async () => ({ products,
      ...(options.omitTimestamps ? {} : { startedAt: new Date(now - (options.sourceAge || 0)).toISOString(), fetchedAt: new Date(now - (options.sourceAge || 0)).toISOString() }) }) }; }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read('config_loja.js'), context);
  const source = read('home-app.js');
  const entry = typeof options.storeOffersReady === 'boolean'
    ? source.replace(/const STORE_OFFERS_READY = (?:true|false);/, 'const STORE_OFFERS_READY = ' + options.storeOffersReady + ';')
    : source;
  vm.runInContext(entry, context);
  emit(doc.events, 'DOMContentLoaded');
  const settle = () => new Promise(resolve => setImmediate(resolve));
  await settle();
  async function tick(milliseconds) {
    now += milliseconds;
    let safety = 0;
    while (true) {
      const due = [...timers].find(([, timer]) => timer.at <= now);
      if (!due) break;
      if (++safety > 100) throw new Error('Unbounded timer loop');
      timers.delete(due[0]); due[1].callback(); await settle();
    }
  }
  return { window: context, document: doc, get: doc.getElementById, add, slides, intervals, requests,
    tick, settle,
    event: (type, event) => emit(listeners, type, event),
    docEvent: (type, event) => emit(doc.events, type, event),
    async failRefresh() { failing = true; now += 130000; emit(doc.events, 'visibilitychange'); await settle(); } };
}

test('runtime: feed válido usa preço e imagem da fonte sem modificar SKU/saldo', async () => {
  const source = [product({ sku: 'REAL-35', stock: 2 })], original = clone(source);
  const home = await createHome(source);
  assert.match(home.get('emAltaRail').innerHTML, /269,90/);
  assert.ok(home.get('emAltaRail').innerHTML.includes(source[0].image));
  assert.deepEqual(source, original);
  assert.equal(home.requests.length, 1);
  assert.equal(home.requests[0].url, '/api/catalogo');
  assert.equal(home.requests[0].init.method, 'GET');
  assert.equal(home.get('slidesTrack').style.transform, 'translateY(-0%)');
});

test('runtime: falha inicial e posterior removem preços antigos e deixam saída nativa', async () => {
  const initial = await createHome([product()], { fail: true });
  assert.equal(initial.get('emAltaRail').innerHTML, '');
  assert.match(initial.get('emAltaRail').textContent, /Não foi possível/);
  assert.equal(initial.get('emAltaRail').children[0].children[1].href, M.STORE + '/produtos/');
  const home = await createHome();
  assert.match(home.get('emAltaRail').innerHTML, /269,90/);
  await home.failRefresh();
  for (const id of ['emAltaRail', 'tiposRail', 'tabsRail']) {
    assert.equal(home.get(id).innerHTML, '', id);
    assert.doesNotMatch(home.get(id).textContent, /STALE|269,90/);
  }
});

test('runtime: categoria sem modelos e ofertas sem desconto ficam explicitamente vazias', async () => {
  const home = await createHome([product({ id: 'BAG', category: 'bolsa', name: 'Bolsa real' })]);
  assert.equal(home.get('tabsRail').innerHTML, '');
  assert.match(home.get('tabsRail').textContent, /Nenhum modelo disponível/);
  assert.equal(home.get('homeOffersStatus').textContent, 'Nenhuma oferta no momento.');
  assert.equal(home.get('slideSaleBtn').href, M.STORE + '/produtos/?bede_ofertas=1');
  assert.equal(home.get('slideSaleBtn').hidden, false);
  assert.ok(home.get('tiposRail').innerHTML.includes('Bolsa real'));
  assert.equal(home.get('dot4').style.display, '');
  const promotion = await createHome([product({ compareAtCents: 30000 })]);
  assert.match(promotion.get('homeOffersStatus').textContent, /preço promocional/);
  assert.match(promotion.get('emAltaRail').innerHTML, /<del[^>]*>R\$\s*300,00/);
});

test('runtime: ofertas sem página coletiva usam só links de produtos promocionais disponíveis', async () => {
  const source = [product({ compareAtCents: 30000 }), product({ id: 'regular', name: 'Preço comum' }),
    product({ id: 'sold', compareAtCents: 30000, available: false })];
  const original = clone(source);
  const home = await createHome(source, { storeOffersReady: false });
  assert.equal(home.get('slideSaleBtn').hidden, true);
  assert.equal(home.get('slideSaleBtn').href, undefined);
  const links = home.get('homeOfferProducts');
  assert.equal(links.hidden, false);
  assert.equal(links.children.length, 1);
  assert.equal(links.children[0].href, source[0].url);
  assert.deepEqual(source, original);
  await home.failRefresh();
  assert.equal(links.children.length, 0);
  assert.equal(links.hidden, true);
  assert.match(home.get('homeOffersStatus').textContent, /Não foi possível/);
  assert.equal(home.get('slideSaleBtn').hidden, true);
});

test('runtime: CTA coletivo homologado usa flag ativa real e mantém ofertas vazias ou indisponíveis honestas', async () => {
  const home = await createHome([product()]);
  assert.equal(home.get('slideSaleBtn').hidden, false);
  assert.equal(home.get('slideSaleBtn').href, M.STORE + '/produtos/?bede_ofertas=1');
  assert.equal(home.get('homeOfferProducts').hidden, true);
  assert.equal(home.get('homeOffersStatus').textContent, 'Nenhuma oferta no momento.');
  await home.failRefresh();
  assert.match(home.get('homeOffersStatus').textContent, /Não foi possível consultar as ofertas/);
  assert.equal(home.get('homeOfferProducts').children.length, 0);
  assert.equal(home.get('homeOfferProducts').hidden, true);
  assert.equal(home.get('slideSaleBtn').href, M.STORE + '/produtos/?bede_ofertas=1');
  const failed = await createHome([product({ compareAtCents: 30000 })], { fail: true });
  assert.match(failed.get('homeOffersStatus').textContent, /Não foi possível/);
  assert.equal(failed.get('homeOfferProducts').children.length, 0);
});

test('runtime: fullpage funciona no corpo mas respeita foco, modificadores e menu', async () => {
  const home = await createHome();
  assert.equal(home.event('keydown', { key: 'PageDown' }).defaultPrevented, true);
  assert.equal(home.get('slidesTrack').style.transform, 'translateY(-100%)');
  for (const tag of ['input', 'textarea', 'select', 'a', 'button', 'div']) {
    const target = home.add('focus-' + tag, tag);
    if (tag === 'div') target.setAttribute('contenteditable', 'true');
    const event = home.event('keydown', { key: 'PageDown', target });
    assert.equal(event.defaultPrevented, false, tag);
    assert.equal(home.get('slidesTrack').style.transform, 'translateY(-100%)', tag);
  }
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
    assert.equal(home.event('keydown', { key: 'PageDown', [modifier]: true }).defaultPrevented, false);
  }
  home.window.openMobileMenu();
  assert.equal(home.get('mobileDrawer').inert, false);
  assert.equal(home.event('wheel').defaultPrevented, false);
  assert.equal(home.event('keydown', { key: 'PageDown' }).defaultPrevented, false);
  assert.equal(home.get('slidesTrack').style.transform, 'translateY(-100%)');
  home.window.closeMobileMenu();
  assert.equal(home.get('mobileDrawer').inert, true);
  assert.equal(home.event('wheel').defaultPrevented, true);
  assert.equal(home.get('slidesTrack').style.transform, 'translateY(-200%)');
});

test('runtime: área com rolagem própria e painel de busca não trocam o slide', async () => {
  const home = await createHome();
  const nested = home.add('nested-scroll', 'div', '', home.slides[0]);
  nested.style.overflowY = 'auto'; nested.scrollHeight = 1000;
  assert.equal(home.event('wheel', { target: nested }).defaultPrevented, false);
  assert.equal(home.get('slidesTrack').style.transform, 'translateY(-0%)');
  nested.scrollTop = 500;
  assert.equal(home.event('wheel', { target: nested }).defaultPrevented, true);
  assert.equal(home.get('slidesTrack').style.transform, 'translateY(-0%)', 'a cauda do mesmo gesto não troca a seção');
  await home.tick(181);
  assert.equal(home.event('wheel', { target: nested }).defaultPrevented, true);
  assert.equal(home.get('slidesTrack').style.transform, 'translateY(-100%)');
  home.get('homeSearchPanel').hidden = false;
  assert.equal(home.event('wheel').defaultPrevented, false);
  assert.equal(home.get('slidesTrack').style.transform, 'translateY(-100%)');
});

test('runtime: rodapé lê CFG_LOJA correto; horário ausente não é inventado', async () => {
  const home = await createHome();
  assert.match(home.get('footerAddress').textContent, /Vaz Ferreira, 457/);
  assert.match(home.get('footerLegal').textContent, /55\.068\.034\/0001-00/);
  assert.equal(home.get('footerHorario').textContent, '');
  assert.equal(home.get('footerHorario').hidden, true);
  assert.match(home.get('footerWa').href, /^https:\/\/wa\.me\/5551996704954/);
  assert.match(home.get('mobDrawerClaims').textContent, /SUL E SUDESTE.*599/);
});

test('runtime: irParaLoja navega imediatamente sem timer e rejeita domínio externo', async () => {
  const home = await createHome();
  home.window.irParaLoja('/produtos/bota-teste/');
  assert.equal(home.window.location.href, M.STORE + '/produtos/bota-teste/');
  home.window.irParaLoja('https://evil.invalid/produtos/bota-teste/');
  assert.equal(home.window.location.href, M.STORE + '/produtos/bota-teste/');
  home.window.irParaLoja('https://user@loja.usebede.com.br/produtos/bota-teste/');
  assert.equal(home.window.location.href, M.STORE + '/produtos/bota-teste/');
});

test('freshness: feed sem timestamp ou com origem vencida não exibe preços', async () => {
  for (const options of [{ omitTimestamps: true }, { sourceAge: 150000 }, { sourceAge: 151000 }]) {
    const home = await createHome([product()], options);
    assert.equal(home.get('emAltaRail').innerHTML, '');
    assert.match(home.get('emAltaRail').textContent, /Não foi possível/);
  }
});

test('freshness: catálogo visível atualiza em 120s e não consulta enquanto oculto', async () => {
  const home = await createHome();
  await home.tick(119000);
  assert.equal(home.requests.length, 1);
  await home.tick(1000);
  assert.equal(home.requests.length, 2);
  home.document.hidden = true; home.docEvent('visibilitychange');
  await home.tick(240000);
  assert.equal(home.requests.length, 2);
  home.document.hidden = false; home.docEvent('visibilitychange');
  assert.equal(home.get('emAltaRail').innerHTML, '', 'remove preço antes de aguardar resposta');
  await home.settle();
  assert.equal(home.requests.length, 3);
  assert.match(home.get('emAltaRail').innerHTML, /269,90/);
});

test('freshness: BFCache limpa seleção e retomadas repetidas respeitam 20s mínimos', async () => {
  const home = await createHome();
  home.event('pagehide', { persisted: true });
  assert.equal(home.get('emAltaRail').innerHTML, '');
  home.event('pageshow', { persisted: true });
  for (let i = 0; i < 10; i++) home.docEvent('visibilitychange');
  assert.equal(home.requests.length, 1);
  await home.tick(19000);
  assert.equal(home.requests.length, 1);
  await home.tick(1000);
  assert.equal(home.requests.length, 2);
  assert.match(home.get('emAltaRail').innerHTML, /269,90/);
});

test('freshness: cache quase vencido expira na tela antes de novo retry permitido', async () => {
  const home = await createHome([product()], { sourceAge: 149000 });
  assert.match(home.get('emAltaRail').innerHTML, /269,90/);
  await home.tick(1000);
  assert.equal(home.get('emAltaRail').innerHTML, '', 'não mantém preço após 150s da origem');
  assert.equal(home.requests.length, 1, 'não contorna a pausa mínima de 20s');
  await home.tick(19000);
  assert.equal(home.requests.length, 2);
});
