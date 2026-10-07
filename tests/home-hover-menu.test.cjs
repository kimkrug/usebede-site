'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'home-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

function fixture(hover = true) {
  let active = null;
  const documentEvents = {};
  const mediaEvents = {};
  function element(kind) {
    const node = {
      kind, children: [], events: {}, open: false,
      appendChild(child) { this.children.push(child); return child; },
      replaceChildren() { this.children = []; },
      addEventListener(type, listener) { (this.events[type] ||= []).push(listener); },
      contains(child) { return child === this || this.children.some(item => item.contains(child)); },
      focus() { active = this; },
      querySelector(selector) {
        if (selector === 'summary') return this.children.find(item => item.kind === 'summary');
        if (selector === '[data-product-links]') return this.children.find(item => item.kind === 'links');
        if (selector === 'a') return this.children.find(item => item.kind === 'a');
        return null;
      },
      fire(type, values = {}) {
        const event = { target: this, defaultPrevented: false,
          preventDefault() { this.defaultPrevented = true; }, ...values };
        (this.events[type] || []).forEach(listener => listener(event));
        return event;
      }
    };
    return node;
  }
  function menu() {
    const details = element('details');
    details.appendChild(element('summary'));
    details.appendChild(element('links'));
    return details;
  }
  const desktop = menu();
  const mobile = menu();
  const nav = element('nav');
  nav.appendChild(desktop);
  const menus = [desktop, mobile];
  const media = {
    matches: hover,
    addEventListener(type, listener) { (mediaEvents[type] ||= []).push(listener); },
    change(matches) { this.matches = matches; (mediaEvents.change || []).forEach(listener => listener({ matches })); }
  };
  const document = {
    readyState: 'loading',
    get activeElement() { return active; },
    createElement: element,
    getElementById(id) { return id === 'mainNav' ? nav : null; },
    querySelectorAll(selector) { return selector === 'details[data-product-menu]' ? menus : []; },
    querySelector(selector) { return selector === 'details[data-product-menu][open]' ? menus.find(item => item.open) : null; },
    addEventListener(type, listener) { (documentEvents[type] ||= []).push(listener); }
  };
  const queries = [];
  const window = { matchMedia(query) { queries.push(query); return media; } };
  vm.runInNewContext(source, { window, document });
  documentEvents.DOMContentLoaded.forEach(listener => listener());
  function fireDocument(type, values) {
    const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...values };
    (documentEvents[type] || []).forEach(listener => listener(event));
    return event;
  }
  return { desktop, mobile, nav, document, window, media, queries, fireDocument, element,
    get active() { return active; }, set active(value) { active = value; } };
}

test('desktop hover opens immediately without stealing focus, then closes on leaving', () => {
  const f = fixture();
  const outside = f.element('button');
  outside.focus();
  f.desktop.fire('pointerenter', { pointerType: 'mouse' });
  assert.equal(f.desktop.open, true);
  assert.equal(f.active, outside);
  f.desktop.fire('pointerleave', { pointerType: 'mouse' });
  assert.equal(f.desktop.open, false);
  assert.deepEqual(f.queries, [
    '(min-width: 1280px) and (hover: hover) and (pointer: fine)',
    '(prefers-reduced-motion: reduce)'
  ]);
});

test('touch and non-hover viewports do not auto-open; mobile retains native click disclosure', () => {
  const f = fixture();
  f.desktop.fire('pointerenter', { pointerType: 'touch' });
  assert.equal(f.desktop.open, false);
  f.media.change(false);
  f.desktop.fire('pointerenter', { pointerType: 'mouse' });
  assert.equal(f.desktop.open, false);
  assert.equal(f.mobile.events.pointerenter, undefined);
  const summary = f.mobile.querySelector('summary');
  const click = summary.fire('click');
  assert.equal(click.defaultPrevented, false);
  // Default <summary> activation remains owned by the browser.
  f.mobile.open = true;
  f.mobile.fire('pointerleave', { pointerType: 'touch' });
  assert.equal(f.mobile.open, true);
});

test('keyboard entry, focus within menu, and focus leaving remain usable', () => {
  const f = fixture();
  const summary = f.desktop.querySelector('summary');
  const first = f.desktop.querySelector('[data-product-links]').querySelector('a');
  f.mobile.open = true;
  const arrow = summary.fire('keydown', { key: 'ArrowDown' });
  assert.equal(arrow.defaultPrevented, true);
  assert.equal(f.desktop.open, true);
  assert.equal(f.mobile.open, false);
  assert.equal(f.active, first);
  f.desktop.fire('pointerenter', { pointerType: 'mouse' });
  f.desktop.fire('pointerleave', { pointerType: 'mouse' });
  assert.equal(f.desktop.open, true);
  f.desktop.fire('focusout', { relatedTarget: first });
  assert.equal(f.desktop.open, true);
  f.active = f.element('button');
  f.desktop.fire('focusout', { relatedTarget: f.active });
  assert.equal(f.desktop.open, false);
  assert.equal(summary.fire('keydown', { key: 'Enter' }).defaultPrevented, false);
  assert.equal(summary.fire('keydown', { key: ' ' }).defaultPrevented, false);
});

test('Escape dismisses under pointer and restores focus without reopening', () => {
  const f = fixture();
  f.desktop.fire('pointerenter', { pointerType: 'mouse' });
  f.desktop.querySelector('[data-product-links]').querySelector('a').focus();
  const event = f.fireDocument('keydown', { key: 'Escape' });
  assert.equal(event.defaultPrevented, true);
  assert.equal(f.desktop.open, false);
  assert.equal(f.active, f.desktop.querySelector('summary'));
  assert.equal(f.desktop.events.focusin, undefined);
});

test('outside click and loss of desktop hover close open menus', () => {
  const f = fixture();
  f.desktop.fire('pointerenter', { pointerType: 'mouse' });
  f.fireDocument('click', { target: { closest() { return null; } } });
  assert.equal(f.desktop.open, false);
  f.desktop.fire('pointerenter', { pointerType: 'mouse' });
  f.media.change(false);
  assert.equal(f.desktop.open, false);
});

test('desktop and mobile keep identical twenty destinations; setup is idempotent', () => {
  const f = fixture();
  f.window.BedeNavigation.setupProductMenus(f.document);
  const desktopLinks = f.desktop.querySelector('[data-product-links]').children;
  const mobileLinks = f.mobile.querySelector('[data-product-links]').children;
  assert.equal(desktopLinks.length, 20);
  assert.deepEqual(desktopLinks.map(item => [item.textContent, item.href]), mobileLinks.map(item => [item.textContent, item.href]));
  assert.deepEqual(desktopLinks.map(item => item.textContent), [
    'Ver todos os produtos', 'Chinelos', 'Sandálias', 'Rasteirinhas', 'Papetes', 'Birkens',
    'Mocassins', 'Mules', 'Clogs', 'Slingbacks', 'Sapatilhas', 'Sapatos', 'Tamancos',
    'Scarpins', 'Tênis', 'Botas', 'Coturnos', 'Bolsas', 'Mochilas', 'Clutches'
  ]);
  assert.equal(f.desktop.events.pointerenter.length, 1);
  assert.equal(f.desktop.querySelector('summary').events.keydown.length, 1);
});

test('only desktop decorative chevron is hidden; disclosure is never forced open by CSS hover', () => {
  assert.match(css, /\.main-nav \.product-menu > summary > span\[aria-hidden="true"\]\s*\{\s*display:\s*none;\s*\}/);
  assert.match(css, /\.product-menu > summary > span\s*\{\s*display:\s*inline-block;/);
  assert.doesNotMatch(css, /\.product-menu:hover[^{}]*\{[^}]*display:\s*(?:block|grid|flex)/);
});
