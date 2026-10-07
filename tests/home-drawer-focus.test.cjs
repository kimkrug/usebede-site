'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'home-ui.js'), 'utf8');

function fixture() {
  const documentEvents = {};
  function element(id) {
    const classes = new Set();
    return {
      id, children: [], attributes: {}, inert: true,
      classList: { contains: name => classes.has(name), add: name => classes.add(name), remove: name => classes.delete(name) },
      appendChild(child) { child.parentElement = this; this.children.push(child); return child; },
      contains(child) { return child === this || this.children.some(item => item.contains(child)); },
      setAttribute(name, value) { this.attributes[name] = String(value); },
      getAttribute(name) { return this.attributes[name] ?? null; },
      querySelector(selector) { return selector === '.mob-drawer-close' ? this.children[0] : null; },
      querySelectorAll() { return []; },
      addEventListener() {},
      focus() { document.activeElement = this; }
    };
  }
  const body = element('body');
  const drawer = element('mobileDrawer');
  const close = drawer.appendChild(element('close'));
  const button = element('mobileMenuBtn');
  const other = element('other');
  const byId = { mobileDrawer: drawer, mobileMenuBtn: button };
  const document = {
    readyState: 'complete', body, activeElement: body,
    getElementById: id => byId[id] || null,
    querySelectorAll: () => [], querySelector: () => null,
    addEventListener(type, listener) { (documentEvents[type] ||= []).push(listener); }
  };
  const media = { matches: false, addEventListener() {} };
  // home-app.js defines these first; home-ui.js wraps them.
  const window = {
    matchMedia: () => media,
    openMobileMenu() { drawer.classList.add('open'); },
    closeMobileMenu() { drawer.classList.remove('open'); }
  };
  vm.runInNewContext(source, { window, document });
  return { window, document, drawer, close, button, other, body };
}

test('drawer: closing after focus fell to body (overlay tap) returns focus to the menu button', () => {
  const f = fixture();
  f.window.openMobileMenu();
  assert.equal(f.document.activeElement, f.close);
  // Tapping the non-focusable overlay moves focus to <body> before click.
  f.document.activeElement = f.body;
  f.window.closeMobileMenu();
  assert.equal(f.document.activeElement, f.button);
  assert.equal(f.drawer.inert, true);
  assert.equal(f.button.getAttribute('aria-expanded'), 'false');
});

test('drawer: closing while focus is inside returns focus; focus elsewhere is not stolen', () => {
  const f = fixture();
  f.window.openMobileMenu();
  f.window.closeMobileMenu();
  assert.equal(f.document.activeElement, f.button);
  f.window.openMobileMenu();
  f.other.focus();
  f.window.closeMobileMenu();
  assert.equal(f.document.activeElement, f.other);
});

test('drawer: closing an already closed drawer never moves focus to the hidden menu button', () => {
  const f = fixture();
  assert.equal(f.document.activeElement, f.body);
  f.window.closeMobileMenu();
  assert.equal(f.document.activeElement, f.body);
});
