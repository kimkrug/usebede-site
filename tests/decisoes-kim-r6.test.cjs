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
// D23/R7-1: a frase de Kim fica em elemento próprio. O [data-store-hours] é substituído por
// CFG_LOJA.horario quando o turno for definido; se a frase estivesse ali, sumiria nesse dia.
const STORE_HOURS = /<(p|span)\b[^>]*\bdata-store-hours\b[^>]*>[\s\S]*?<\/\1>/g;
test('D19/D23: frase de retirada literal em Como comprar, FAQ e Sobre, fora de [data-store-hours]', () => {
  for (const page of ['como-comprar.html', 'faq.html', 'sobre.html']) {
    const html = read(page);
    for (const element of html.match(STORE_HOURS) || []) assert.ok(!element.includes(RETIRADA), page + ': frase dentro de data-store-hours');
    assert.ok(html.replace(STORE_HOURS, '').includes(RETIRADA), page);
    for (const [, fallback] of html.matchAll(/data-empty-hours="([^"]*)"/g)) assert.doesNotMatch(fallback, /Retirada em Viamão/, page);
  }
  assert.doesNotMatch(read('como-comprar.html'), /retirada imediata/i);
});

test('D23: Sobre usa o rótulo "Retirada:" e o horário fica separado, oculto enquanto vazio', () => {
  const sobre = read('sobre.html'), faq = read('faq.html');
  assert.ok(sobre.includes('<strong>Retirada:</strong> ' + RETIRADA));
  assert.doesNotMatch(sobre, /Horário de Atendimento:/);
  for (const html of [sobre, faq]) {
    // O rodapé tem o próprio [data-store-hours] (oculto, sem reserva); aqui só o do conteúdo.
    const own = (html.match(STORE_HOURS) || []).filter(element => !element.includes('line-height:1.5'));
    assert.equal(own.length, 1, 'um elemento de horário no conteúdo');
    assert.match(own[0], /data-empty-hours=""/);
    assert.match(own[0], /\bhidden\b/);
  }
});

test('D24: Termos não muda nesta rodada (reserva antiga de atendimento)', () => {
  const termos = read('termos.html');
  assert.ok(termos.includes('<strong>Atendimento:</strong> <span data-store-hours data-empty-hours="Consulte nossos horários de atendimento pelo WhatsApp.">Consulte nossos horários de atendimento pelo WhatsApp.</span>'));
  assert.ok(!termos.includes(RETIRADA));
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

const INSTITUCIONAIS = ['sobre.html', 'como-comprar.html', 'trocas.html', 'faq.html', 'privacidade.html', 'termos.html', 'guia-medidas.html'];
test('D22c: as 7 institucionais têm a mesma busca da home (destino, rótulos, teclado)', () => {
  const pattern = [
    /<button class="icon-btn home-search-trigger" id="homeSearchTrigger" type="button" aria-label="Buscar na loja" aria-controls="homeSearchPanel" aria-expanded="false">/,
    /<div class="home-search-panel" id="homeSearchPanel" hidden>/,
    /<form class="home-search-form" data-store-search action="https:\/\/loja\.usebede\.com\.br\/search\/" method="get" role="search" aria-label="Buscar produtos na loja">/,
    /<label class="home-sr-only" for="homeSearchInput">O que você procura\?<\/label>/,
    /<input id="homeSearchInput" name="q" type="search"[^>]*required/,
    /<button class="home-search-close" id="homeSearchClose" type="button" aria-label="Fechar busca">/
  ];
  for (const page of ['index.html', ...INSTITUCIONAIS]) {
    const html = read(page);
    for (const re of pattern) assert.match(html, re, page + ' ' + re);
    assert.equal((html.match(/id="homeSearchTrigger"/g) || []).length, 1, page + ': uma lupa só');
    const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
    assert.ok(header.includes('id="homeSearchPanel"'), page + ': painel dentro do cabeçalho');
  }
});

test('D22c: a busca é ligada sem depender da gaveta da home; a gaveta institucional fecha a busca', () => {
  const ui = read('home-ui.js');
  const setup = ui.slice(ui.indexOf('function setupHomeUI()'));
  assert.ok(setup.indexOf('setupSearch();') > -1 && setup.indexOf('setupSearch();') < setup.indexOf('if (!menu) return;'));
  assert.match(read('institutional-ui.js'), /BedeNavigation\.closeSearch\(false\)/);
});
