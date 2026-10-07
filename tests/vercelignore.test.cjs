'use strict';
// R5-2: o .vercelignore tira do bundle só legados não referenciados (R5-1, D14) e ferramentas,
// nunca um arquivo de runtime. Avaliador mínimo para a sintaxe usada (ver supportedSyntax).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const patterns = () => read('.vercelignore').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));

// Âncora "/x" = caminho a partir da raiz (arquivo ou pasta); "*.ext" e "prefixo*" valem em qualquer nível.
function ignored(file, list = patterns()) {
  return list.some(p => {
    if (p.startsWith('/')) { const target = p.slice(1).replace(/\/$/, ''); return file === target || file.startsWith(target + '/'); }
    const re = new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$');
    return file.split('/').some((_, i, parts) => re.test(parts[i])) ;
  });
}
const supportedSyntax = p => /^\/[^*!?[\]]+$/.test(p) || /^[^/!?[\]]*\*[^/!?[\]]*$/.test(p);

const RUNTIME = ['index.html', 'sobre.html', 'como-comprar.html', 'trocas.html', 'faq.html', 'privacidade.html', 'termos.html', 'guia-medidas.html', '404.html',
  'style.css', 'home-app.js', 'home-ui.js', 'institutional-ui.js', 'catalog-model.js', 'config_loja.js', 'links_loja.js',
  'store-enhancements.js', 'store-product-ui.js', 'store-filter-bar.js', 'store-color-gallery.js', 'api/catalogo.js', 'vercel.json',
  'robots.txt', 'sitemap.xml', 'og-image.jpg', 'package.json', 'package-lock.json'];
const REMOVED = ['products.js', 'sync_log.json', 'teste-jornada.mjs', 'app.js', 'avaliacoes.js', 'MOBILE E DESKTOP - HERO/mulher desktop hero.png'];

function referencedAssets() {
  const found = new Set();
  for (const file of [...RUNTIME.filter(f => /\.(html|css)$/.test(f))]) {
    const text = read(file);
    for (const m of text.matchAll(/(?:src|href|srcset)="\/?([^"?#:]+\.(?:png|jpe?g|webp|svg|ico|css|js))(?:\?[^"]*)?"|url\(['"]?\/?([^'")?]+\.(?:png|jpe?g|webp|svg))/g)) {
      const ref = decodeURI(m[1] || m[2]);
      if (!/^(https?:)?\/\//.test(ref)) found.add(ref.replace(/^\.\//, ''));
    }
  }
  return [...found];
}

test('vercelignore: só usa sintaxe suportada pelo avaliador do teste', () => {
  for (const p of patterns()) assert.ok(supportedSyntax(p), 'padrão não suportado: ' + p);
});

test('vercelignore: nenhum arquivo de runtime nem asset referenciado é ignorado', () => {
  for (const file of RUNTIME) assert.equal(ignored(file), false, file);
  const assets = referencedAssets();
  assert.ok(assets.length > 15, 'assets encontrados: ' + assets.length);
  for (const asset of assets) {
    assert.equal(ignored(asset), false, asset);
    assert.ok(fs.existsSync(path.join(root, asset)), 'asset referenciado existe: ' + asset);
  }
});

test('vercelignore: legados aprovados no R5-1 e ferramentas ficam fora do bundle', () => {
  for (const file of [...REMOVED, 'scripts/qa-visual.cjs', 'tests/vercelignore.test.cjs', 'README.md', '.env.local', 'outputs/x.png']) assert.equal(ignored(file), true, file);
});

module.exports = { ignored };
