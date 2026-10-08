'use strict';
// R6: decisões de Kim de 07/10 (D19, D20, D22) aplicadas no código editorial.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('D20: chamada do hero é só "Nova Coleção", sem estação nem separador solto', () => {
  const html = read('index.html');
  const eyebrows = [...html.matchAll(/<span class="hero-eyebrow">([^<]*)<\/span>/g)].map(m => m[1].trim());
  assert.ok(eyebrows.includes('Nova Coleção'));
  for (const text of eyebrows) {
    assert.doesNotMatch(text, /inverno|verão|outono|primavera|20\d\d/i, text);
    assert.doesNotMatch(text, /^[·\-–|]|[·\-–|]$/, 'separador solto: ' + text);
  }
});

const RETIRADA = 'Retirada em Viamão em horário comercial, combinada previamente pelo WhatsApp.';
test('D19: frase de retirada/atendimento aprovada em Como comprar, FAQ e Sobre', () => {
  assert.ok(read('como-comprar.html').includes(RETIRADA));
  for (const page of ['faq.html', 'sobre.html']) {
    const html = read(page);
    const hours = [...html.matchAll(/<(?:p|span)[^>]*data-store-hours[^>]*data-empty-hours="([^"]*)"[^>]*>([^<]*)</g)];
    assert.ok(hours.length, page);
    for (const [, fallback, text] of hours) { assert.equal(fallback, RETIRADA, page); assert.equal(text.trim(), RETIRADA, page); }
  }
  assert.doesNotMatch(read('como-comprar.html'), /retirada imediata/i);
});

test('D19: sem turno inventado; PIX, parcelas, frete e trocas inalterados (D15–D18)', () => {
  for (const page of ['como-comprar.html', 'faq.html', 'sobre.html']) assert.doesNotMatch(read(page), /\b(manh[ãa]|tarde|noite)\b|\b\d{1,2}\s?h(\d{2})?\b/i, page);
  const como = read('como-comprar.html'), faq = read('faq.html');
  assert.ok(como.includes('Aceitamos PIX com 5% de desconto e Cartão de Crédito em até 6x sem juros.'));
  assert.ok(como.includes('Frete grátis para as regiões Sul e Sudeste em compras a partir de R$ 599.'));
  assert.ok(faq.includes('Oferecemos <strong>Frete Grátis para as regiões Sul e Sudeste</strong> em compras a partir de R$ 599.'));
  assert.ok(read('trocas.html').includes('A primeira troca é por nossa conta'));
});

test('D22b: rodapé da home centralizado na seção por margens automáticas (sem cortar quando não cabe)', () => {
  const css = read('style.css');
  const rule = /\.site-footer-slide \.clean-footer-bottom\s*\{([^}]*)\}/g;
  const decls = [...css.matchAll(rule)].map(m => m[1]).join(';');
  assert.match(decls, /margin-block:\s*auto/);
  assert.doesNotMatch(decls, /margin-top:\s*auto/, 'preso embaixo deixava o vão');
  // justify-content:center cortaria o topo quando o rodapé é maior que a tela (320×640).
  assert.doesNotMatch(css, /\.site-footer-slide\s*\{[^}]*justify-content:\s*center[^}]*\}\s*(?![\s\S]*\.site-footer-slide\s*\{[^}]*justify-content:\s*flex-start)/);
});
