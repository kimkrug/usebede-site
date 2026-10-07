'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../home-ui.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
function fixture(options = {}) {
  const all = [], frames = [], mutations = [], resizes = [], globalEvents = {};
  let now = 1000, active;
  function matches(node, selector) {
    if (selector[0] === '.') return node.classList.contains(selector.slice(1));
    if (selector === 'details[data-product-menu]') return false;
    return selector === node.tagName.toLowerCase();
  }
  class Element {
    constructor(tag = 'div', id = '', className = '') {
      this.tagName = tag.toUpperCase(); this.id = id; this.className = className;
      this.children = []; this.parentElement = null; this.events = {}; this.attributes = {};
      this.style = { values: {}, setProperty(name, value) { this.values[name] = value; }, getPropertyValue(name) { return this.values[name] || ''; } };
      this.hidden = false; this.disabled = false; this.scrollLeft = 0;
      this.clientWidth = 400; this.scrollWidth = 1200; this.scrollCalls = [];
      this.classList = {
        contains: n => this.className.split(/\s+/).includes(n),
        add: n => { if (!this.classList.contains(n)) this.className += ' ' + n; }
      };
      all.push(this);
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    hasAttribute(name) { return Object.hasOwn(this.attributes, name); }
    getBoundingClientRect() {
      const box = typeof this.rect === 'function' ? this.rect() : { left: 0, top: 0, width: this.clientWidth, height: 0 };
      return { ...box, right: box.left + box.width, bottom: box.top + box.height };
    }
    appendChild(node) {
      if (node.parentElement) node.parentElement.children = node.parentElement.children.filter(c => c !== node);
      node.parentElement = this; this.children.push(node); return node;
    }
    querySelectorAll(selector) {
      const out = [];
      function walk(node) { for (const child of node.children) { if (matches(child, selector)) out.push(child); walk(child); } }
      walk(this); return out;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    contains(node) { return this === node || this.children.some(c => c.contains(node)); }
    addEventListener(type, fn, config) { (this.events[type] ||= []).push({ fn, config }); }
    focus(config) { active = this; this.lastFocus = config; }
    scrollBy(config) {
      this.scrollCalls.push(config);
      this.scrollLeft = Math.max(0, Math.min(this.scrollWidth - this.clientWidth, this.scrollLeft + config.left));
      emit(this, 'scroll');
    }
  }
  const body = new Element('body');
  const docEvents = {};
  const doc = {
    readyState: 'loading',
    get activeElement() { return active; },
    getElementById(id) { return all.find(n => n.id === id) || null; },
    createElement(tag) { return new Element(tag); },
    querySelectorAll(selector) { return body.querySelectorAll(selector); },
    querySelector(selector) { return body.querySelector(selector); },
    addEventListener(type, fn) { (docEvents[type] ||= []).push({ fn }); }
  };
  const railIds = options.ids || ['emAltaRail', 'tiposRail', 'tabsRail'];
  const entries = railIds.map(id => {
    const wrapper = body.appendChild(new Element('div', '', 'nb-rail-wrapper'));
    const previous = wrapper.appendChild(new Element('button', id + 'Prev', 'rail-arrow prev'));
    const rail = wrapper.appendChild(new Element('div', id, 'nb-rail'));
    const next = wrapper.appendChild(new Element('button', id + 'Next', 'rail-arrow next'));
    rail.setAttribute('aria-busy', options.busy ? 'true' : 'false');
    if (options.tabIndex !== undefined) rail.setAttribute('tabindex', options.tabIndex);
    if (options.label) rail.setAttribute('aria-label', options.label);
    const photos = [];
    if (!options.empty) for (let i = 0; i < 4; i++) {
      const card = rail.appendChild(new Element('a', '', 'nb-card'));
      if (!options.noPhotos) {
        const photo = card.appendChild(new Element('div', '', 'nb-card-img-wrap'));
        photo.photoSize = options.photoSize ?? 280; photo.photoTop = options.photoTop ?? 8;
        photo.rect = () => ({
          left: (options.hostLeft ?? 0) + (i === 3 ? rail.scrollWidth - 32 - photo.photoSize : 32 + i * (photo.photoSize + 20)) - rail.scrollLeft,
          top: (options.hostTop ?? 100) + photo.photoTop,
          width: photo.photoSize, height: photo.photoSize
        });
        photos.push(photo);
      }
    }
    rail.scrollWidth = options.scrollWidth ?? 1200;
    rail.clientWidth = options.clientWidth ?? 400;
    rail.scrollLeft = options.scrollLeft ?? 0;
    wrapper.rect = () => ({ left: options.hostLeft ?? 0, top: options.hostTop ?? 100, width: rail.clientWidth, height: 380 });
    rail.rect = wrapper.rect;
    previous.setAttribute('onclick', 'nativePrevious()');
    next.setAttribute('onclick', 'nativeNext()');
    previous.onclick = () => rail.scrollBy({ left: -280, behavior: 'smooth' });
    next.onclick = () => rail.scrollBy({ left: 280, behavior: 'smooth' });
    return { id, wrapper, rail, previous, next, photos };
  });
  class Observer {
    constructor(callback, list) { this.callback = callback; list.push(this); }
    observe(node, config) { this.node = node; this.config = config; }
  }
  class MutationObserver extends Observer { constructor(fn) { super(fn, mutations); } }
  class ResizeObserver extends Observer { constructor(fn) { super(fn, resizes); } }
  const win = {
    matchMedia: query => ({ matches: query.includes('reduced-motion') ? Boolean(options.reducedMotion) : false, addEventListener() {} }),
    addEventListener(type, fn, config) { (globalEvents[type] ||= []).push({ fn, config }); },
    requestAnimationFrame(fn) { frames.push(fn); return frames.length; },
    setTimeout(fn) { frames.push(fn); return frames.length; }
  };
  if (!options.noObservers) { win.MutationObserver = MutationObserver; win.ResizeObserver = ResizeObserver; }
  const context = { window: win, document: doc, WeakSet, Map, encodeURIComponent, Date: { now: () => now } };
  vm.runInNewContext(source, context);
  function emit(target, type, extra = {}) {
    const e = { type, target, touches: [{ clientX: 0, clientY: 0 }], deltaX: 0, deltaY: 0,
      defaultPrevented: false, stopped: false,
      preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, ...extra };
    for (const listener of target.events?.[type] || []) listener.fn(e);
    if (!e.stopped) for (const listener of globalEvents[type] || []) listener.fn(e);
    return e;
  }
  function flush() { let count = 0; while (frames.length) { if (++count > 20) throw new Error('Unbounded scheduling'); frames.shift()(); } }
  for (const listener of docEvents.DOMContentLoaded || []) listener.fn();
  for (const entry of entries) entry.controls = entry.wrapper.querySelector('.home-rail-cues');
  return { entries, win, doc, body, all, frames, mutations, resizes, globalEvents, emit, flush,
    advance(ms) { now += ms; }, rerun() { vm.runInNewContext(source, context); win.BedeCarouselCues.setup(doc); } };
}
test('todos os trilhos horizontais de produtos do index têm pistas, sem mexer no hero', () => {
  const ids = [...html.matchAll(/class="nb-rail" id="([^"]+)"/g)].map(m => m[1]);
  const f = fixture({ ids });
  assert.deepEqual(ids, ['emAltaRail', 'tiposRail', 'tabsRail']);
  assert.equal(f.entries.length, 3);
  for (const e of f.entries) assert.ok(e.controls, e.id);
  assert.equal(f.all.filter(n => n.classList.contains('home-rail-cues')).length, 3);
  assert.doesNotMatch(source, /getElementById\('heroCarousel'\)/);
});
test('setas existentes mantêm ordem DOM após trilho, sem clones ou alteração do onclick', () => {
  const f = fixture();
  for (const e of f.entries) {
    assert.deepEqual(e.wrapper.children, [e.rail, e.controls]);
    assert.deepEqual(e.controls.children, [e.previous, e.next]);
    assert.equal(e.next.getAttribute('onclick'), 'nativeNext()');
    assert.equal(e.previous.getAttribute('onclick'), 'nativePrevious()');
    assert.equal(e.next.events.click, undefined);
    assert.equal(e.previous.events.click, undefined);
    assert.equal(e.next.getAttribute('aria-controls'), e.id);
    assert.equal(e.rail.getAttribute('role'), 'region');
    assert.equal(e.next.getAttribute('aria-label'), 'Ver próximos produtos');
    assert.equal(e.previous.getAttribute('aria-label'), 'Voltar aos produtos anteriores');
  }
});
test('seta acompanha meio real da foto e seu gutter lateral em 320, 390 e 1440px', () => {
  for (const viewport of [320, 390, 1440]) {
    const size = viewport < 767 ? Math.min(viewport * .74, 320) : Math.max(280, viewport * .26);
    const f = fixture({ clientWidth: viewport, scrollWidth: viewport * 4, photoSize: size, hostLeft: 19, hostTop: 141, photoTop: 17 });
    for (const e of f.entries) {
      assert.equal(e.controls.getAttribute('data-geometry'), 'ready');
      assert.equal(e.controls.style.getPropertyValue('--home-cue-x'), (32 + size - 22).toFixed(3) + 'px');
      assert.equal(e.controls.style.getPropertyValue('--home-cue-y'), (17 + size / 2).toFixed(3) + 'px');
      e.rail.scrollLeft = e.rail.scrollWidth - e.rail.clientWidth; f.emit(e.rail, 'scroll');
      assert.equal(e.previous.hidden, false);
      assert.equal(e.controls.style.getPropertyValue('--home-cue-x'), (viewport - 32 - size + 22).toFixed(3) + 'px');
      assert.equal(e.controls.style.getPropertyValue('--home-cue-y'), (17 + size / 2).toFixed(3) + 'px');
    }
  }
});
test('alteração de tamanho real da foto após load recalcula posição e não usa altura de textos', () => {
  const f = fixture(), e = f.entries[0];
  e.photos[0].photoSize = 200; e.photos[0].photoTop = 24;
  f.emit(e.rail, 'load'); f.flush();
  assert.equal(e.controls.style.getPropertyValue('--home-cue-y'), '124.000px');
  assert.equal(e.controls.style.getPropertyValue('--home-cue-x'), '210.000px');
  assert.equal(e.controls.hidden, false);
});
test('geometria incompleta não põe seta sobre produto para caber e preserva foco ao ocultar', () => {
  const f = fixture(), e = f.entries[0];
  e.next.focus(); e.photos[0].photoSize = 600;
  f.win.BedeCarouselCues.refresh();
  assert.equal(e.controls.hidden, true); assert.equal(e.controls.getAttribute('data-geometry'), 'pending');
  assert.equal(f.doc.activeElement, e.rail); assert.equal(e.rail.lastFocus.preventScroll, true);
  e.photos[0].photoSize = 280; f.emit(e.rail, 'load'); f.flush();
  assert.equal(e.controls.hidden, false);
  const incomplete = fixture({ noPhotos: true }).entries[0];
  assert.equal(incomplete.controls.hidden, true);
});
test('início >, movimento esconde ambas, fim <, retorno ao início restaura >', () => {
  const f = fixture(), e = f.entries[0];
  assert.equal(e.controls.getAttribute('data-position'), 'start');
  assert.equal(e.previous.hidden, true); assert.equal(e.next.hidden, false);
  e.rail.scrollLeft = 30; f.emit(e.rail, 'scroll');
  assert.equal(e.controls.getAttribute('data-position'), 'middle');
  assert.equal(e.previous.hidden, true); assert.equal(e.next.hidden, true);
  e.rail.scrollLeft = 800; f.emit(e.rail, 'scroll');
  assert.equal(e.controls.getAttribute('data-position'), 'end');
  assert.equal(e.previous.hidden, false); assert.equal(e.next.hidden, true);
  e.rail.scrollLeft = 0; f.emit(e.rail, 'scroll');
  assert.equal(e.next.hidden, false); assert.equal(e.previous.hidden, true);
});
test('sem overflow, sem produtos ou carregando não oferece setas falsas', () => {
  for (const options of [{ scrollWidth: 400 }, { scrollWidth: 401 }, { empty: true }, { busy: true }, { clientWidth: 0 }]) {
    const f = fixture(options);
    for (const e of f.entries) {
      assert.equal(e.controls.getAttribute('data-position'), 'none');
      assert.equal(e.controls.hidden, true);
      assert.equal(e.previous.hidden, true); assert.equal(e.next.hidden, true);
      assert.equal(e.rail.getAttribute('tabindex'), '-1');
    }
  }
});
test('loading assíncrono e troca de categoria atualizam sem remontar controles', () => {
  const f = fixture({ busy: true }), e = f.entries[2], controls = e.controls;
  e.rail.setAttribute('aria-busy', 'false');
  f.mutations[2].callback(); f.flush();
  assert.equal(e.controls.hidden, false); assert.equal(e.next.hidden, false);
  e.rail.scrollLeft = 800; f.emit(e.rail, 'scroll');
  e.rail.scrollLeft = 0;
  f.mutations[2].callback(); f.mutations[2].callback();
  assert.equal(f.frames.length, 1, 'mutações são agrupadas em uma atualização');
  f.flush();
  assert.equal(e.controls, controls); assert.equal(e.next.hidden, false);
  assert.deepEqual(Array.from(f.mutations[2].config.attributeFilter), ['aria-busy']);
});
test('resize, imagem carregada e pageshow recalculam bordas', () => {
  const f = fixture(), e = f.entries[0];
  e.rail.clientWidth = 1200;
  f.resizes[0].callback(); f.flush(); assert.equal(e.controls.hidden, true);
  e.rail.clientWidth = 400;
  f.emit(e.rail, 'load'); f.flush(); assert.equal(e.next.hidden, false);
  e.rail.scrollLeft = 800;
  f.emit(e.rail, 'pageshow'); f.flush(); assert.equal(e.previous.hidden, false);
});
test('botão usa handler nativo; seu foco ocultado volta ao trilho sem salto', () => {
  const f = fixture(), e = f.entries[0];
  e.next.focus(); e.next.onclick();
  assert.equal(e.rail.scrollCalls.length, 1);
  assert.equal(e.rail.scrollLeft, 280);
  assert.equal(e.next.hidden, true);
  assert.equal(f.doc.activeElement, e.rail);
  assert.equal(e.rail.lastFocus.preventScroll, true);
});
test('teclado do trilho usa esquerda/direita/Home/End e respeita movimento reduzido', () => {
  const f = fixture({ reducedMotion: true }), e = f.entries[0];
  const right = f.emit(e.rail, 'keydown', { key: 'ArrowRight' });
  assert.equal(right.defaultPrevented, true); assert.equal(right.stopped, true);
  assert.equal(e.rail.scrollLeft, 280); assert.equal(e.rail.scrollCalls[0].behavior, 'auto');
  f.emit(e.rail, 'keydown', { key: 'End' }); assert.equal(e.rail.scrollLeft, 800);
  f.emit(e.rail, 'keydown', { key: 'ArrowLeft' }); assert.equal(e.rail.scrollLeft, 520);
  f.emit(e.rail, 'keydown', { key: 'Home' }); assert.equal(e.rail.scrollLeft, 0);
});
test('não intercepta teclado de produto/link, modificadores ou teclas verticais', () => {
  const f = fixture(), e = f.entries[0];
  for (const extra of [{ key: 'ArrowRight', target: e.rail.children[0] }, { key: 'End', ctrlKey: true }, { key: 'ArrowDown' }]) {
    const event = f.emit(e.rail, 'keydown', extra);
    assert.equal(event.defaultPrevented, false); assert.equal(event.stopped, false);
  }
  assert.equal(e.rail.scrollCalls.length, 0);
});
test('gesto horizontal e cauda diagonal não propagam ao fullpage nem previnem scroll nativo', () => {
  const f = fixture(), e = f.entries[0]; let pageMoves = 0;
  f.win.addEventListener('wheel', () => pageMoves++);
  const horizontal = f.emit(e.rail, 'wheel', { deltaX: 90, deltaY: 40 });
  assert.equal(horizontal.stopped, true); assert.equal(horizontal.defaultPrevented, false);
  f.advance(80);
  const tail = f.emit(e.rail, 'wheel', { deltaX: 0, deltaY: 50 });
  assert.equal(tail.stopped, true); assert.equal(pageMoves, 0);
  f.advance(181);
  f.emit(e.rail, 'wheel', { deltaX: 0, deltaY: 60 });
  assert.equal(pageMoves, 1, 'nova intenção vertical permanece da home');
});
test('wheel vertical dominante e tremor horizontal mínimo continuam chegando à home', () => {
  const f = fixture(), e = f.entries[0]; let pageMoves = 0;
  f.win.addEventListener('wheel', () => pageMoves++);
  for (const delta of [{ deltaX: 1, deltaY: 80 }, { deltaX: 35, deltaY: 90 }, { deltaX: 2, deltaY: 1 }]) {
    const event = f.emit(e.rail, 'wheel', delta);
    assert.equal(event.stopped, false); assert.equal(event.defaultPrevented, false);
  }
  assert.equal(pageMoves, 3);
});
test('swipe horizontal bloqueia só touchend, preservando touchstart e scroll nativo', () => {
  const f = fixture(), e = f.entries[0]; let pageTouches = 0;
  f.win.addEventListener('touchstart', () => pageTouches++);
  f.win.addEventListener('touchend', () => pageTouches++);
  const start = f.emit(e.rail, 'touchstart');
  assert.equal(start.stopped, false); assert.equal(start.defaultPrevented, false);
  const move = f.emit(e.rail, 'touchmove', { touches: [{ clientX: 90, clientY: 20 }] });
  assert.equal(move.stopped, false); assert.equal(move.defaultPrevented, false);
  e.rail.setAttribute('aria-busy', 'true'); f.win.BedeCarouselCues.refresh();
  const end = f.emit(e.rail, 'touchend', { touches: [], changedTouches: [{ clientX: 100, clientY: 120 }] });
  assert.equal(end.stopped, true); assert.equal(end.defaultPrevented, false); assert.equal(pageTouches, 1);
});
test('swipe vertical sobre produto segue ao fullpage e não é preso por diagonal posterior', () => {
  const f = fixture(), e = f.entries[0]; const reached = [];
  for (const type of ['touchstart', 'touchmove', 'touchend']) f.win.addEventListener(type, event => reached.push(event.type));
  f.emit(e.rail, 'touchstart');
  const move = f.emit(e.rail, 'touchmove', { touches: [{ clientX: 12, clientY: 100 }] });
  const end = f.emit(e.rail, 'touchend', { touches: [], changedTouches: [{ clientX: 130, clientY: 110 }] });
  assert.equal(move.stopped, false); assert.equal(end.stopped, false);
  assert.equal(end.defaultPrevented, false);
  assert.deepEqual(reached, ['touchstart', 'touchmove', 'touchend']);
});
test('multitouch e cancelamento desarmam lock horizontal sem impedir eventos nativos', () => {
  const f = fixture(), e = f.entries[0];
  for (const interrupt of ['touchstart', 'touchmove', 'touchcancel']) {
    f.emit(e.rail, 'touchstart');
    f.emit(e.rail, 'touchmove', { touches: [{ clientX: 90, clientY: 2 }] });
    const interrupted = f.emit(e.rail, interrupt, { touches: [{ clientX: 90, clientY: 2 }, { clientX: 60, clientY: 20 }] });
    assert.equal(interrupted.stopped, false); assert.equal(interrupted.defaultPrevented, false);
    const end = f.emit(e.rail, 'touchend', { touches: [], changedTouches: [{ clientX: 120, clientY: 3 }] });
    assert.equal(end.stopped, false); assert.equal(end.defaultPrevented, false);
  }
});
test('tap sem deslocamento suficiente propaga, e gesto sem touchmove usa coordenada final', () => {
  const f = fixture(), e = f.entries[0];
  f.emit(e.rail, 'touchstart');
  assert.equal(f.emit(e.rail, 'touchend', { touches: [], changedTouches: [{ clientX: 7, clientY: 1 }] }).stopped, false);
  f.emit(e.rail, 'touchstart');
  assert.equal(f.emit(e.rail, 'touchend', { touches: [], changedTouches: [{ clientX: 80, clientY: 1 }] }).stopped, true);
});
test('gutter clicável da seta também isola só gestos horizontais sem impedir clique ou scroll nativo', () => {
  const f = fixture(), e = f.entries[0], target = e.controls;
  assert.equal(f.emit(target, 'wheel', { deltaX: 80, deltaY: 10 }).stopped, true);
  f.advance(181);
  assert.equal(f.emit(target, 'wheel', { deltaX: 2, deltaY: 80 }).stopped, false);
  assert.equal(f.emit(target, 'touchstart').stopped, false);
  f.emit(target, 'touchmove', { touches: [{ clientX: 90, clientY: 10 }] });
  const horizontal = f.emit(target, 'touchend', { touches: [], changedTouches: [{ clientX: 100, clientY: 11 }] });
  assert.equal(horizontal.stopped, true); assert.equal(horizontal.defaultPrevented, false);
  f.emit(target, 'touchstart');
  f.emit(target, 'touchmove', { touches: [{ clientX: 10, clientY: 90 }] });
  assert.equal(f.emit(target, 'touchend', { touches: [], changedTouches: [{ clientX: 11, clientY: 100 }] }).stopped, false);
  assert.equal(e.next.events.click, undefined); e.next.onclick();
  assert.equal(e.rail.scrollLeft, 280);
});
test('trilho sem overflow não aprisiona swipe ou wheel do visitante', () => {
  const f = fixture({ scrollWidth: 400 }), e = f.entries[0];
  assert.equal(f.emit(e.rail, 'touchstart').stopped, false);
  assert.equal(f.emit(e.rail, 'touchend').stopped, false);
  assert.equal(f.emit(e.rail, 'wheel', { deltaX: 50 }).stopped, false);
});
test('setup repetido e script reexecutado não duplicam controles ou listeners', () => {
  const f = fixture(), count = f.globalEvents.resize.length;
  f.win.BedeCarouselCues.setup(f.doc); f.rerun();
  assert.equal(f.all.filter(n => n.classList.contains('home-rail-cues')).length, 3);
  assert.equal(f.globalEvents.resize.length, count);
  for (const e of f.entries) assert.equal(e.rail.events.scroll.length, 1);
});
test('mantém rótulo/tabindex autorais e funciona sem observadores', () => {
  const f = fixture({ label: 'Minha seleção', tabIndex: '3', noObservers: true }), e = f.entries[0];
  assert.equal(e.rail.getAttribute('aria-label'), 'Minha seleção');
  assert.equal(e.rail.getAttribute('tabindex'), '3');
  e.rail.scrollLeft = 800; f.emit(e.rail, 'scroll'); assert.equal(e.previous.hidden, false);
});
test('fim tolera arredondamento fracionário e início tolera bounce negativo', () => {
  const f = fixture(), e = f.entries[0];
  e.rail.scrollLeft = 799.2; f.emit(e.rail, 'scroll'); assert.equal(e.previous.hidden, false);
  e.rail.scrollLeft = -10; f.emit(e.rail, 'scroll'); assert.equal(e.next.hidden, false);
});
