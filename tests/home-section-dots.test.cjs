'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const rule = selector => new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s*') + '\\s*\\{([^}]*)\\}').exec(css)?.[1] || '';

test('section dots: on light sections they are visually hidden so they never sit over product photos', () => {
  // Dots follow the header in the DOM, so the sibling selector tracks the active section.
  assert.ok(html.indexOf('id="siteHeader"') < html.indexOf('id="slideDots"'));
  const hidden = rule('.site-header.solid-light ~ .slide-dots');
  assert.match(hidden, /opacity:\s*0/);
  assert.match(hidden, /pointer-events:\s*none/);
});

test('section dots: keyboard users keep them — focusable, and shown (dark) while focused', () => {
  // R2-8: visibility:hidden removed them from Tab order and dropped focus after Enter.
  assert.doesNotMatch(rule('.site-header.solid-light ~ .slide-dots'), /visibility:\s*hidden|display:\s*none/);
  assert.match(rule('.site-header.solid-light ~ .slide-dots:focus-within'), /opacity:\s*1/);
  assert.match(css, /\.site-header\.solid-light ~ \.slide-dots \.s-dot\s*\{[^}]*border-color:\s*rgba\(0, 0, 0/);
});

test('section dots: hero keeps the visible white dots', () => {
  assert.doesNotMatch(css, /\.site-header\.ghost\s*~\s*\.slide-dots\s*\{[^}]*(visibility:\s*hidden|opacity:\s*0)/);
  assert.match(css, /\.slide-dots\s*\{[^}]*position:\s*fixed/);
});
