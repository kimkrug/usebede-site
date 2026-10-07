'use strict';
// R3-1: controles nativos da PDP/busca sem anel de foco no tema (WCAG 2.4.7). O complemento
// injeta só um contorno de teclado (:focus-visible), sem mudar a aparência para mouse/toque.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'store-enhancements.js'), 'utf8');
const block = source.slice(source.indexOf('native-focus'), source.indexOf('native-focus') + 800);

test('loja: Comprar nativo ganha contorno preto só no foco de teclado', () => {
  assert.match(block, /\.js-addtocart:focus-visible\{outline:2px solid #000;outline-offset:2px\}/);
});

test('loja: quantidade, CEP e busca vencem o outline:0 !important do tema, só no foco de teclado', () => {
  const rule = /([^{}]*)\{outline:2px solid #000!important;outline-offset:2px\}/.exec(block);
  assert.ok(rule);
  for (const selector of ['.form-control.js-quantity-input:focus-visible', '.form-control.js-shipping-input:focus-visible', '.form-control.js-search-input:focus-visible']) {
    assert.ok(rule[1].includes(selector), selector);
  }
  assert.doesNotMatch(rule[1], /:focus(?!-visible)/, 'nunca no foco por clique/toque');
});
