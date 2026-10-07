'use strict';
// R2-3: invariantes da otimização de carregamento (sem mudança visual).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const PAGES = ['index.html', 'sobre.html', 'como-comprar.html', 'trocas.html', 'faq.html', 'privacidade.html', 'termos.html', 'guia-medidas.html', '404.html'];

test('performance: imagens editoriais em WebP com o JPG original como fallback no mesmo <picture>', () => {
  const html = read('index.html');
  for (const name of ['split_shoes', 'split_bags', 'split_editorial']) {
    const picture = new RegExp('<picture><source type="image/webp" srcset="assets/' + name + '\\.webp\\?v=webp_r2"><img[^>]*src="assets/' + name + '\\.jpg\\?v=[^"]+"[^>]*loading="lazy"[^>]*></picture>');
    assert.match(html, picture, name);
    assert.ok(fs.existsSync(path.join(root, 'assets', name + '.webp')), name + '.webp');
    assert.ok(fs.existsSync(path.join(root, 'assets', name + '.jpg')), name + '.jpg preservado');
  }
  assert.match(read('style.css'), /\.dual-half picture, \.split-photo picture \{ display: contents; \}/);
});

test('performance: preload do hero usa exatamente a URL do CSS em cada largura (sem download duplo)', () => {
  const html = read('index.html'), css = read('style.css');
  const mobile = /<link rel="preload" as="image" type="image\/webp" href="([^"]+)" media="\(max-width: 1024px\)">/.exec(html);
  const desktop = /<link rel="preload" as="image" type="image\/webp" href="([^"]+)" media="\(min-width: 1025px\)">/.exec(html);
  assert.ok(mobile && desktop);
  assert.ok(css.includes("url('" + desktop[1] + "') type('image/webp')"), desktop[1]);
  const mobileBlock = css.slice(css.indexOf('@media (max-width: 1024px)'));
  assert.ok(mobileBlock.includes("url('" + mobile[1] + "') type('image/webp')"), mobile[1]);
});

test('performance: Montserrat vem uma vez por página via <link> com preconnect, nunca por @import', () => {
  assert.doesNotMatch(read('style.css'), /@import\s+url\(['"]?https:\/\/fonts\.googleapis/);
  for (const page of PAGES) {
    const html = read(page);
    assert.equal((html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?family=Montserrat[^"]*display=swap">/g) || []).length, 1, page);
    assert.match(html, /<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/, page);
    assert.ok(html.indexOf('fonts.googleapis.com/css2') < html.indexOf('style.css'), page + ': fonte antes do CSS');
  }
});
