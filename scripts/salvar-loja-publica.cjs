/* Salva páginas PÚBLICAS da loja (somente GET, sem cookies, sem carrinho/conta/admin) para QA local.
   Uso: node scripts/salvar-loja-publica.cjs [pasta=../outputs/store-preview-r3]
   Grava listagens (filtros, ordenação, páginas) e PDPs de famílias distintas + manifest.json. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const STORE = 'https://loja.usebede.com.br';
const OUT = path.resolve(process.argv[2] || path.join(__dirname, '../../outputs/store-preview-r3'));
const LISTINGS = {
  'listagem': '/produtos/',
  'listagem-cor-preto-tam-36': '/produtos/?Cor=Preto&Tamanho=36',
  'listagem-preco-100-300': '/produtos/?min_price=100&max_price=300',
  'listagem-ordem-preco-asc': '/produtos/?sort_by=price-ascending',
  'listagem-pagina-2': '/produtos/page/2/',
  'listagem-pagina-3': '/produtos/page/3/'
};
// [família, termo de busca, nome exato do produto no catálogo]
const PRODUCTS = [
  ['mocassim', 'mocassim', 'MOCASSIM HELENA'], ['chinelo', 'chinelo', 'CHINELO PATRICIA'], ['bolsa', 'bolsa', 'BOLSA LARA'],
  ['clutch', 'clutch', 'CLUTCH TACHAS'], ['mochila', 'mochila', 'MOCHILA LIA'], ['birken', 'birken', 'BIRKEN MANU'],
  ['papete', 'papete', 'PAPETE MARIA'], ['bota', 'bota', 'BOTA BRECIA'], ['scarpin', 'scarpin', 'SCARPIN CROCO'], ['tenis', 'tenis', 'TENIS JANE']
];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(route) {
  const response = await fetch(STORE + route, { method: 'GET', redirect: 'follow', credentials: 'omit', signal: AbortSignal.timeout(30000) });
  if (!response.ok || !(response.headers.get('content-type') || '').includes('text/html')) throw new Error(route + ' → ' + response.status);
  const html = await response.text();
  if (html.length > 3_000_000) throw new Error('Página grande demais: ' + route);
  return html;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = { capturedAt: new Date().toISOString(), scope: 'GET público, sem cookies; sem carrinho, conta ou admin', listings: {}, products: [] };
  for (const [name, route] of Object.entries(LISTINGS)) {
    fs.writeFileSync(path.join(OUT, name + '.html'), await get(route));
    manifest.listings[name] = route;
    await sleep(400);
  }
  for (const [family, term, productName] of PRODUCTS) {
    const search = await get('/search/?q=' + encodeURIComponent(term));
    const card = search.split(/class="js-item-product /).slice(1).find(c => new RegExp('"name":\\s*"' + productName + '"', 'i').test(c));
    const handle = card && /href="https:\/\/loja\.usebede\.com\.br\/produtos\/([^/"]+)\/"/.exec(card)?.[1];
    if (!handle) { manifest.products.push({ family, productName, error: 'não encontrado na busca' }); continue; }
    await sleep(400);
    const html = await get('/produtos/' + handle + '/');
    const file = 'pdp-' + family + '-' + handle + '.html';
    fs.writeFileSync(path.join(OUT, file), html);
    const id = /data-store="product-form-(\d+)"/.exec(html)?.[1];
    let variants = [];
    try { variants = JSON.parse((/data-variants="([^"]*)"/.exec(html)?.[1] || '[]').replace(/&quot;/g, '"').replace(/&amp;/g, '&')); } catch (_) {}
    const colours = [...new Set(variants.flatMap(v => [v.option0, v.option1, v.option2]).filter(Boolean))];
    manifest.products.push({ family, productName, handle, id, file, route: '/produtos/' + handle + '/', variants: variants.length, optionValues: colours.length, images: (html.match(/class="js-product-slide[^"]*"[^>]*data-image="/g) || []).length });
    await sleep(400);
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
