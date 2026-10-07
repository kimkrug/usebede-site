'use strict';
// R3-1: controles nativos da PDP/busca sem anel de foco no tema (WCAG 2.4.7). O complemento injeta
// contorno em :focus-visible: no botão Comprar só via teclado; nos campos de texto também ao tocar/clicar.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'store-enhancements.js'), 'utf8');
const block = source.slice(source.indexOf('native-focus'), source.indexOf('native-focus') + 800);

test('loja: Comprar nativo ganha contorno preto só no foco de teclado', () => {
  assert.match(block, /\.js-addtocart:focus-visible\{outline:2px solid #000;outline-offset:2px\}/);
});

// Nos campos de texto os navegadores aplicam :focus-visible também no toque/clique (indicação de onde se digita).
test('loja: quantidade, CEP e busca vencem o outline:0 !important do tema com :focus-visible', () => {
  const rule = /([^{}]*)\{outline:2px solid #000!important;outline-offset:2px\}/.exec(block);
  assert.ok(rule);
  for (const selector of ['.form-control.js-quantity-input:focus-visible', '.form-control.js-shipping-input:focus-visible', '.form-control.js-search-input:focus-visible']) {
    assert.ok(rule[1].includes(selector), selector);
  }
  assert.doesNotMatch(rule[1], /:focus(?!-visible)/, 'nunca :focus genérico');
});
