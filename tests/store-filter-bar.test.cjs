'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const modulePath = path.resolve(__dirname, '../store-filter-bar.js');
const api = require(modulePath);
const source = fs.readFileSync(modulePath, 'utf8');

function fixture(options = {}) {
  const docEvents = {}, ready = [], timers = new Map();
  let serial = 0, doc;
  function matches(node, selector) {
    if (node.nodeType !== 1) return false;
    const attrs = [...selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)];
    if (attrs.some(match => node.getAttribute(match[1]) === null || (match[2] !== undefined && node.getAttribute(match[1]) !== match[2]))) return false;
    const clean = selector.replace(/\[[^\]]*\]/g, '');
    const tag = clean.match(/^[\w-]+/)?.[0];
    if (tag && node.tagName !== tag.toUpperCase()) return false;
    const id = clean.match(/#([\w-]+)/)?.[1];
    if (id && node.id !== id) return false;
    return [...clean.matchAll(/\.([\w-]+)/g)].every(match => node.classList.contains(match[1]));
  }
  class Element {
    constructor(tag = 'div', nodeType = 1) {
      this.tagName = tag.toUpperCase(); this.nodeType = nodeType; this.id = ''; this.className = '';
      this.attributes = {}; this.childNodes = []; this.parentNode = null; this.events = {};
      this.open = false; this.checked = false; this.disabled = false; this.value = ''; this._text = '';
      this.nativeHandler = { token: Symbol('native-handler') };
      this.classList = {
        contains: value => this.className.split(/\s+/).includes(value),
        add: value => { if (!this.classList.contains(value)) this.className += ' ' + value; },
        remove: value => { this.className = this.className.split(/\s+/).filter(item => item !== value).join(' '); }
      };
    }
    get children() { return this.childNodes.filter(child => child.nodeType === 1); }
    get firstChild() { return this.childNodes[0] || null; }
    get textContent() { return this._text + this.childNodes.map(child => child.textContent).join(''); }
    set textContent(value) { this.replaceChildren(); const text = new Element('#text', 3); text._text = String(value); this.appendChild(text); }
    getAttribute(name) { if (name === 'id') return this.id || null; return this.attributes[name] ?? null; }
    setAttribute(name, value) { if (name === 'id') this.id = String(value); else this.attributes[name] = String(value); }
    removeAttribute(name) { delete this.attributes[name]; }
    remove() { if (this.parentNode) { const index = this.parentNode.childNodes.indexOf(this); this.parentNode.childNodes.splice(index, 1); this.parentNode = null; } }
    appendChild(child) { child.remove(); child.parentNode = this; this.childNodes.push(child); return child; }
    insertBefore(child, before) { if (child === before) return child; child.remove(); const index = before === null ? this.childNodes.length : this.childNodes.indexOf(before); assert.ok(index >= 0); child.parentNode = this; this.childNodes.splice(index, 0, child); return child; }
    replaceChildren(...nodes) { this.childNodes.forEach(child => { child.parentNode = null; }); this.childNodes = []; this._text = ''; nodes.forEach(node => this.appendChild(node)); }
    contains(node) { return node === this || this.childNodes.some(child => child.contains(node)); }
    querySelectorAll(selector) { const found = []; for (const child of this.childNodes) { if (matches(child, selector)) found.push(child); found.push(...child.querySelectorAll(selector)); } return found; }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    addEventListener(type, fn) { (this.events[type] ||= []).push(fn); }
    removeEventListener(type, fn) { this.events[type] = (this.events[type] || []).filter(item => item !== fn); }
    fire(type, input = {}) { const event = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...input }; (this.events[type] || []).forEach(fn => fn(event)); return event; }
    focus() { doc.activeElement = this; }
  }
  doc = {
    readyState: options.loading ? 'loading' : 'complete', activeElement: null,
    body: new Element('body'), head: new Element('head'),
    createElement: tag => new Element(tag), createComment: () => new Element('#comment', 8),
    querySelectorAll(selector) { return [...this.head.querySelectorAll(selector), ...this.body.querySelectorAll(selector)]; },
    getElementById(id) { return this.querySelectorAll('#' + id)[0] || null; },
    addEventListener(type, fn) { (docEvents[type] ||= []).push(fn); },
    removeEventListener(type, fn) { docEvents[type] = (docEvents[type] || []).filter(item => item !== fn); }
  };
  doc.body.className = options.template || 'template-search';
  const append = (parent, tag, attrs = {}, text) => {
    const element = doc.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) { if (key === 'class') element.className = value; else element.setAttribute(key, value); }
    if (text !== undefined) element.textContent = text;
    return parent.appendChild(element);
  };
  const controls = append(doc.body, 'section', { class: 'js-category-controls' });
  const button = append(controls, 'a', { class: 'js-modal-open', 'data-toggle': '#nav-filters', 'data-component': 'filter-button', href: '#' }, 'Filtrar');
  const modal = append(controls, 'div', { id: 'nav-filters', class: 'js-modal modal-filters' });
  const modalBody = append(modal, 'div', { class: 'modal-body' });
  const sorting = append(modalBody, 'div', {}, 'Ordenar');
  const sort = append(sorting, 'a', { class: 'js-apply-sort-private selected', 'data-sort-value': 'score-descending', href: '#' }, 'Relevância');
  const filters = append(modalBody, 'div', { id: 'filters', 'data-store': 'filters-nav' });
  function group(component, label) {
    const node = append(filters, 'div', { 'data-store': 'filters-group', 'data-component': component, class: 'js-accordion-container' });
    append(node, 'div', { class: 'font-small font-weight-bold' }, label);
    return node;
  }
  function option(parent, name, value, checked = false) {
    const label = append(parent, 'label', { class: 'js-filter-checkbox ' + (checked ? 'js-remove-filter' : 'js-apply-filter'), 'data-filter-name': name, 'data-filter-value': value });
    const input = append(label, 'input', { type: 'checkbox' }); input.checked = checked;
    const content = append(label, 'span', { class: 'checkbox' });
    append(content, 'span', { class: 'checkbox-text with-color' }, value + ' (2)');
    return input;
  }
  const color = group('list.filter-color', 'Cor'); const colorInput = option(color, 'Cor', 'Preto', true);
  const size = group('list.filter-size', 'Tamanho'); const sizeInput = option(size, 'Tamanho', '34'); option(size, 'Tamanho', '35');
  const brand = group('list.filter-brand', 'Marca'); const brandInput = option(brand, 'brand', options.brandName || 'Bedê', Boolean(options.brandActive));
  if (options.multiBrand) option(brand, 'brand', 'Outra');
  const price = group('list.filter-price', 'Preço'); price.classList.add('price-filter-container');
  const form = append(price, 'form');
  const min = append(form, 'input', { class: 'js-price-filter-input', name: 'min_price', type: 'number' }); min.value = '100';
  const max = append(form, 'input', { class: 'js-price-filter-input', name: 'max_price', type: 'number' }); max.value = '350';
  const submit = append(form, 'button', { class: 'js-price-filter-btn', type: 'submit' }); submit.disabled = true;
  const overlay = append(modalBody, 'div', { class: 'js-filters-overlay filters-overlay' });
  const area = append(doc.body, 'section');
  const grid = append(area, 'div', { class: 'js-product-table' });
  const product = append(grid, 'article', { 'data-product-id': '364501337', 'data-stock': '2', 'data-price': '30590' });
  const pager = append(area, 'a', { href: '/search/?q=martta&page=2&Cor=Preto' }, 'Próxima');
  const search = append(doc.body, 'form'); const query = append(search, 'input', { name: 'q' }); query.value = 'martta';
  const location = new URL('https://loja.usebede.com.br/search/?q=martta&Cor=Preto' + (options.offers ? '&bede_ofertas=1' : ''));
  const runtime = {
    document: doc, location,
    LS: options.noNative ? null : { ready: { then(callback) { ready.push(callback); } } },
    setTimeout(fn) { timers.set(++serial, fn); return serial; }, clearTimeout(id) { timers.delete(id); }
  };
  function fire(type, data = {}) { const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...data }; (docEvents[type] || []).slice().forEach(fn => fn(event)); return event; }
  function flush() { ready.splice(0).forEach(fn => fn()); const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); }
  return { doc, runtime, append, controls, button, modal, modalBody, sorting, sort, filters, color, colorInput, size, sizeInput, brand, brandInput, price, min, max, submit, overlay, area, grid, product, pager, query, fire, flush, ready };
}

const menuLinks = [['Ver todos os produtos','/produtos/'],['Chinelos','chinelo'],['Sandálias','sandalia'],['Rasteirinhas','rasteirinha'],['Papetes','papete'],['Birkens','birken'],['Mocassins','mocassim'],['Mules','mule'],['Clogs','clog'],['Slingbacks','slingback'],['Sapatilhas','sapatilha'],['Sapatos','sapato'],['Tamancos','tamanco'],['Scarpins','scarpin'],['Tênis','tenis'],['Botas','bota'],['Coturnos','coturno'],['Bolsas','bolsa'],['Mochilas','mochila'],['Clutches','clutch']].map(([label,value])=>({label,href:'https://loja.usebede.com.br'+(value.startsWith('/')?value:'/search/?q='+value)}));
function addProductMenu(f, links = menuLinks) {
  const header = f.append(f.doc.body,'header');
  const main = f.append(header,'li',{class:'js-nav-main-item'});
  f.append(main,'a',{href:'#'},'Produtos');
  const submenu = f.append(main,'ul',{class:'list-subitems'});
  return links.map(link=>f.append(submenu,'a',{href:link.href},link.label));
}

test('Produtos uses the complete real header menu, deduplicates consistent desktop/mobile and preserves native brand nodes reversibly', () => {
  const f=fixture(); const links=addProductMenu(f); addProductMenu(f);
  const old=f.filters.childNodes.slice(), brandHandler=f.brandInput.nativeHandler;
  assert.deepEqual(api.productLinks(f.doc),menuLinks);
  const controller=api.start({document:f.doc,runtime:f.runtime}); f.flush();
  const details=f.doc.querySelectorAll('.bede-filter-products');assert.equal(details.length,1);
  assert.equal(details[0].querySelector('summary').textContent,'Produtos');
  const anchors=details[0].querySelectorAll('a');assert.equal(anchors.length,20);
  assert.deepEqual(anchors.map(a=>({label:a.textContent,href:a.getAttribute('href')})),menuLinks);
  assert.ok(anchors.every(a=>!a.events.click&&!a.getAttribute('onclick')&&!a.getAttribute('target')));
  assert.equal(f.brand.getAttribute('hidden'),'');assert.equal(f.brand.getAttribute('data-bede-brand-preserved'),'');
  assert.equal(f.brandInput.checked,false);assert.equal(f.brandInput.nativeHandler,brandHandler);
  assert.equal(f.brand.querySelector('.font-small.font-weight-bold').textContent,'Marca');
  assert.ok(links.every(a=>a.parentNode));
  assert.equal(api.start({document:f.doc,runtime:f.runtime}),controller);f.flush();assert.equal(f.doc.querySelectorAll('.bede-filter-products').length,1);
  controller.stop();assert.deepEqual(f.filters.childNodes,old);assert.equal(f.brand.getAttribute('hidden'),null);assert.equal(f.brand.getAttribute('data-bede-brand-preserved'),null);
  api.start({document:f.doc,runtime:f.runtime});f.flush();assert.equal(f.doc.querySelectorAll('.bede-filter-products').length,1);
});

test('active checked brand or brand URL is never hidden, cleared or renamed; Produtos is separate navigation', () => {
  for(const input of [{brandActive:true},{search:'?brand=Bed%C3%AA'},{search:'?brand%5B%5D=Bed%C3%AA'},{search:'?filter%5Bbrand%5D=Bed%C3%AA'}]){
    const f=fixture(input);addProductMenu(f);
    if(input.search) f.runtime.location=new URL('https://loja.usebede.com.br/produtos/'+input.search);
    const before=f.runtime.location.href,checked=f.brandInput.checked;
    api.start({document:f.doc,runtime:f.runtime});f.flush();
    assert.equal(f.brand.getAttribute('hidden'),null);assert.equal(f.brand.getAttribute('data-bede-brand-preserved'),null);
    assert.equal(f.brand.parentNode.querySelector('summary').textContent,'Marca');
    assert.equal(f.doc.querySelectorAll('.bede-filter-products').length,1);
    assert.equal(f.runtime.location.href,before);assert.equal(f.brandInput.checked,checked);
  }
});

test('missing, inconsistent or unsafe header menu and multiple/unknown brands preserve genuine Marca filter', () => {
  for(const mode of ['missing','unsafe','relative','inconsistent','multibrand','otherbrand']){
    const f=fixture({multiBrand:mode==='multibrand',brandName:mode==='otherbrand'?'Outra':'Bedê'});
    if(mode!=='missing')addProductMenu(f,mode==='unsafe'?[menuLinks[0],{label:'Não autorizado',href:'javascript:alert(1)'}]:mode==='relative'?[menuLinks[0],{label:'Botas',href:'search/?q=bota'}]:menuLinks);
    if(mode==='inconsistent')addProductMenu(f,menuLinks.slice(0,3));
    api.start({document:f.doc,runtime:f.runtime});f.flush();
    assert.equal(f.doc.querySelectorAll('.bede-filter-products').length,0,mode);
    assert.equal(f.brand.getAttribute('hidden'),null,mode);assert.equal(f.brand.parentNode.querySelector('summary').textContent,'Marca',mode);
  }
});

test('Produtos keyboard/outside closing and mobile layout use native details and real links without touching protected controls', () => {
  const f=fixture();addProductMenu(f);const url=f.runtime.location.href,stock={...f.product.attributes};
  api.start({document:f.doc,runtime:f.runtime});f.flush();
  const products=f.doc.querySelectorAll('.bede-filter-products')[0];products.open=true;products.querySelector('a').focus();
  const event=f.fire('keydown',{key:'Escape'});assert.equal(event.defaultPrevented,true);assert.equal(products.open,false);assert.equal(f.doc.activeElement,products.querySelector('summary'));
  products.open=true;f.fire('click',{target:f.grid});assert.equal(products.open,false);
  assert.equal(f.colorInput.checked,true);assert.equal(f.min.value,'100');assert.equal(f.max.value,'350');assert.equal(f.sort.parentNode,f.sorting);
  assert.equal(f.runtime.location.href,url);assert.deepEqual(f.product.attributes,stock);
  assert.match(api.css,/\.bede-product-links a\{[^}]*min-height:44px/);
  assert.match(api.css,/max-height:340px;overflow:auto/);
  assert.match(api.css,/\.bede-filter-disclosure\[open\]\{flex-basis:100%/);
});

test('UMD is pure on load and exposes explicit browser start', () => {
  const window = {};
  vm.runInNewContext(source, { window, URLSearchParams });
  assert.equal(typeof window.BedeNativeFilters.start, 'function');
  assert.equal(api.start(), null);
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|localStorage|LS\.url|dispatchEvent\(|\.click\(/);
});

test('real captured listing has the selectors and document-delegated native filtering contract', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../../outputs/store-preview-local/listing.html'), 'utf8');
  for (const needle of ['id="nav-filters"', 'id="filters"', 'js-product-table', 'data-component="list.filter-size"', 'data-component="list.filter-color"', 'data-component="list.filter-price"', 'js-apply-sort-private']) assert.ok(html.includes(needle));
  assert.ok(html.includes('jQueryNuvem(document).on("click", ".js-apply-filter, .js-remove-filter"'));
});

test('waits for DOM and native ready before moving original controls above grid', () => {
  const f = fixture({ loading: true });
  const controller = api.start({ document: f.doc, runtime: f.runtime });
  assert.equal(controller.getStatus(), 'waiting-dom');
  assert.equal(f.filters.parentNode, f.modalBody);
  f.doc.readyState = 'interactive'; f.fire('DOMContentLoaded');
  assert.equal(controller.getStatus(), 'waiting-native');
  assert.equal(f.filters.parentNode, f.modalBody);
  f.flush();
  assert.equal(controller.getStatus(), 'active');
  const bar = f.doc.getElementById('bede-native-filter-bar');
  assert.equal(f.filters.parentNode, bar);
  assert.equal(f.area.children.indexOf(bar) + 1, f.area.children.indexOf(f.grid));
  assert.equal(f.filters.children[0], f.size);
  assert.equal(f.doc.querySelectorAll('#filters').length, 1);
  assert.equal(f.doc.querySelectorAll('.js-filter-checkbox').length, 4);
});

test('preserves original native events, form values, checked states, sort modal and page data', () => {
  const f = fixture();
  const controls = [f.colorInput, f.sizeInput, f.min, f.max, f.submit, f.button, f.sort];
  const handlers = controls.map(node => node.nativeHandler);
  const snapshot = { url: f.runtime.location.href, pager: f.pager.getAttribute('href'), product: { ...f.product.attributes } };
  const controller = api.start({ document: f.doc, runtime: f.runtime }); f.flush();
  assert.equal(controller.getStatus(), 'active');
  assert.deepEqual(controls.map(node => node.nativeHandler), handlers);
  assert.equal(f.colorInput.checked, true); assert.equal(f.sizeInput.checked, false);
  assert.equal(f.min.value, '100'); assert.equal(f.max.value, '350'); assert.equal(f.submit.disabled, true);
  assert.equal(f.sort.parentNode, f.sorting); assert.equal(f.sorting.parentNode, f.modalBody);
  assert.equal(f.button.getAttribute('data-toggle'), '#nav-filters'); assert.ok(f.button.classList.contains('js-modal-open'));
  assert.equal(f.button.textContent, 'Ordenar');
  assert.equal(f.runtime.location.href, snapshot.url); assert.equal(f.query.value, 'martta');
  assert.equal(f.pager.getAttribute('href'), snapshot.pager); assert.deepEqual(f.product.attributes, snapshot.product);
  assert.equal(f.overlay.parentNode.id, 'bede-native-filter-bar');
  assert.match(f.doc.getElementById('bede-native-filter-bar').textContent, /Confirme tamanho, cor e disponibilidade na página do produto/);
});

test('compact disclosures preserve keyboard, Escape, outside click and native opener behavior', () => {
  const f = fixture(); api.start({ document: f.doc, runtime: f.runtime }); f.flush();
  const details = f.doc.querySelectorAll('.bede-filter-disclosure');
  assert.equal(details.length, 3);
  details[0].open = true; details[0].fire('toggle');
  details[1].open = true; details[1].fire('toggle');
  assert.equal(details[0].open, false);
  f.min.focus(); // The price disclosure is the last group.
  details[2].open = true; details[2].fire('toggle');
  const escape = f.fire('keydown', { key: 'Escape' });
  assert.equal(escape.defaultPrevented, true);
  assert.equal(details[2].open, false);
  assert.equal(f.doc.activeElement, details[2].querySelector('summary'));
  details[0].open = true;
  f.fire('click', { target: f.grid }); assert.equal(details[0].open, false);
  assert.equal(f.button.events.click, undefined);
  assert.equal(f.submit.events.click, undefined);
  assert.equal(f.min.getAttribute('aria-label'), 'Preço mínimo em reais');
  assert.match(api.css, /min-height:44px/);
  assert.match(api.css, /max-width:767px/);
  assert.match(api.css, /input:focus\+\.checkbox/);
  assert.match(api.css, /\.checkbox-color\{display:none!important\}/);
});

test('start is idempotent and stop restores exact original nodes/order/labels without removing native handlers', () => {
  const f = fixture();
  const children = f.filters.childNodes.slice(), buttonChildren = f.button.childNodes.slice();
  const controller = api.start({ document: f.doc, runtime: f.runtime }); f.flush();
  assert.equal(api.start({ document: f.doc, runtime: f.runtime }), controller);
  assert.equal(f.doc.querySelectorAll('#bede-native-filter-bar').length, 1);
  controller.stop();
  assert.equal(controller.getStatus(), 'stopped');
  assert.equal(f.filters.parentNode, f.modalBody);
  assert.deepEqual(f.filters.childNodes, children);
  assert.deepEqual(f.button.childNodes, buttonChildren);
  assert.equal(f.button.parentNode, f.controls); assert.equal(f.button.textContent, 'Filtrar');
  assert.equal(f.overlay.parentNode, f.modalBody);
  assert.equal(f.min.getAttribute('aria-label'), null);
  assert.equal(f.doc.getElementById('bede-native-filter-bar'), null);
  assert.equal(f.doc.getElementById('bede-native-filter-style'), null);
  assert.equal(f.doc.querySelectorAll('.bede-filter-disclosure').length, 0);
});

test('offers, PDP, missing native readiness, duplicate structure and open native modal preserve original UI', () => {
  for (const options of [{ offers: true }, { template: 'template-product' }, { noNative: true }, { duplicate: true }, { modalOpen: true }]) {
    const f = fixture(options);
    if (options.duplicate) f.append(f.area, 'div', { class: 'js-product-table' });
    if (options.modalOpen) f.modal.classList.add('modal-show');
    api.start({ document: f.doc, runtime: f.runtime }); f.flush();
    assert.equal(f.filters.parentNode, f.modalBody);
    assert.equal(f.button.textContent, 'Filtrar');
    assert.equal(f.doc.getElementById('bede-native-filter-bar'), null);
    assert.equal(f.doc.getElementById('bede-native-filter-style'), null);
  }
  assert.equal(api.isOffers('?bede_ofertas=0&bede_ofertas=1'), true);
  assert.equal(api.isOffers('?bede_ofertas=%31'), true);
  assert.equal(api.isOffers('?q=martta&Cor=Preto'), false);
});

test('cancellation before native ready does not move controls later', () => {
  const f = fixture(); const controller = api.start({ document: f.doc, runtime: f.runtime });
  controller.stop(); f.flush();
  assert.equal(f.filters.parentNode, f.modalBody);
  assert.equal(f.doc.getElementById('bede-native-filter-bar'), null);
});
