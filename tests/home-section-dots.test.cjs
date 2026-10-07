'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('section dots: white dots are hidden on light sections so they never sit over product photos', () => {
  // Dots follow the header in the DOM, so the sibling selector tracks the active section.
  assert.ok(html.indexOf('id="siteHeader"') < html.indexOf('id="slideDots"'));
  assert.match(css, /\.site-header\.solid-light\s*~\s*\.slide-dots\s*\{[^}]*visibility:\s*hidden/);
});

test('section dots: hero keeps the visible white dots', () => {
  assert.doesNotMatch(css, /\.site-header\.ghost\s*~\s*\.slide-dots\s*\{[^}]*visibility:\s*hidden/);
  assert.match(css, /\.slide-dots\s*\{[^}]*position:\s*fixed/);
});
