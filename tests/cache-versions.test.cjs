'use strict';
// R2-8: cada recurso local tem uma única versão de cache em todas as páginas.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const PAGES = ['index.html', 'sobre.html', 'como-comprar.html', 'trocas.html', 'faq.html', 'privacidade.html', 'termos.html', 'guia-medidas.html', '404.html'];

test('cache: style.css, home-ui.js e institutional-ui.js usam a mesma versão em todas as páginas', () => {
  const versions = {};
  for (const page of PAGES) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const match of html.matchAll(/(?:href|src)="\/?((?:style\.css|home-ui\.js|institutional-ui\.js|home-app\.js))\?v=([A-Za-z0-9_]+)"/g)) {
      (versions[match[1]] ||= new Set()).add(match[2]);
    }
  }
  for (const file of ['style.css', 'home-ui.js', 'institutional-ui.js']) {
    assert.ok(versions[file], file);
    assert.equal(versions[file].size, 1, file + ': ' + [...versions[file]].join(', '));
  }
  assert.equal([...versions['style.css']][0], '2026_10_07_r2', 'versão desta release');
});
