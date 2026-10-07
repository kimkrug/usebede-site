'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function luminance(hex) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const FOOTER_BG = '#fafafa';

test('contrast: small legal/copyright text in institutional footers meets WCAG AA (4.5:1)', () => {
  for (const page of ['sobre.html', 'como-comprar.html', 'trocas.html', 'faq.html', 'privacidade.html', 'termos.html', 'guia-medidas.html']) {
    const colours = [...read(page).matchAll(/<p[^>]*style="font-size:12px;color:(#[0-9a-f]{3,6});/gi)].map(m => m[1]);
    assert.equal(colours.length, 2, page);
    for (const colour of colours) assert.ok(ratio(colour, FOOTER_BG) >= 4.5, page + ' ' + colour);
  }
});

test('contrast: drawer footer claims (10px) meet WCAG AA on the drawer background', () => {
  const rule = /\.mob-drawer-info\s*\{[^}]*color:\s*(#[0-9a-f]{3,6})/i.exec(read('style.css'));
  assert.ok(rule);
  assert.ok(ratio(rule[1], FOOTER_BG) >= 4.5, rule[1]);
});

test('contrast: home footer muted text on the cream slide (#f2f0eb) meets WCAG AA', () => {
  const css = read('style.css');
  const rule = /([^{}]*\.site-footer-slide \.footer-copy[^{]*)\{[^}]*color:\s*(#[0-9a-f]{3,6})/i.exec(css);
  assert.ok(rule, 'footer muted colour override');
  for (const selector of ['.cf-desc', '.cf-col a', '.pay-label', '#footerLegal', '.footer-copy']) assert.ok(rule[1].includes(selector), selector);
  assert.ok(ratio(rule[2], '#f2f0eb') >= 4.5, rule[2]);
  assert.ok(ratio(rule[2], FOOTER_BG) >= 4.5, rule[2] + ' on institutional footer');
  assert.match(css, /\.clean-footer \.cf-col a:hover \{ color: #000404; \}/, 'hover still darkens');
});
