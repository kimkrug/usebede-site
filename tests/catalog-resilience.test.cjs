'use strict';
// R2-4: upstream HTTP errors, a repeated page and the handler contract on failure.
// Offline only: fetch is replaced in every case.
const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../catalog-model.js');

const START = model.STORE + '/produtos/';
const pageURL = n => n === 1 ? START : START + 'page/' + n + '/';
function card(n) {
  const data = { '@type': 'Product', name: 'Scarpin ' + n, image: 'https://dcdn-us.mitiendanube.com/stores/008/137/758/products/foto-' + n + '.webp',
    offers: { '@type': 'Offer', priceCurrency: 'BRL', price: (10000 + n) / 100, availability: 'https://schema.org/InStock', url: START + 'produto-' + n + '/' } };
  return '<div data-product-type="list"><a data-product-price="' + (10000 + n) + '"></a><script type="application/ld+json">' + JSON.stringify(data) + '</script></div>';
}
const page = (n, next) => card(n) + (next ? '<a href="' + pageURL(next) + '">' + next + '</a>' : '');
const html = body => ({ ok: true, status: 200, headers: { get: () => 'text/html; charset=utf-8' }, text: async () => body });
const fresh = () => { delete require.cache[require.resolve('../api/catalogo.js')]; return require('../api/catalogo.js'); };

test('resiliência: 429/500/502/503 na primeira página falham sem catálogo', async () => {
  const { collectCatalogue } = fresh();
  for (const status of [429, 500, 502, 503]) {
    await assert.rejects(collectCatalogue(async () => ({ ok: false, status, headers: { get: () => 'text/html' } })), new RegExp('Store response ' + status));
  }
});

test('resiliência: 429 numa página do meio derruba a coleta inteira (nunca parcial)', async () => {
  const { collectCatalogue } = fresh();
  const pages = new Map([[START, page(1, 2)], [pageURL(2), null], [pageURL(3), page(3)]]);
  await assert.rejects(collectCatalogue(async url => pages.get(url) === null ? { ok: false, status: 429 } : html(pages.get(url))), /Store response 429/);
});

test('resiliência: loja repetindo a página 1 no lugar da 2 é rejeitada, não somada', async () => {
  const { collectCatalogue } = fresh();
  await assert.rejects(collectCatalogue(async url => html(url === START ? page(1, 2) : page(1, 3))), /Catalogue changed during pagination|pagination/);
});

test('resiliência: handler responde 503 no-store sem produtos quando a fonte falha', async t => {
  const handler = fresh();
  t.mock.method(global, 'fetch', async () => ({ ok: false, status: 503, headers: { get: () => 'text/html' } }));
  t.mock.method(console, 'error', () => {});
  const headers = {}; let body = '';
  const res = { statusCode: 0, setHeader: (k, v) => { headers[k.toLowerCase()] = v; }, end: chunk => { body = chunk; } };
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(headers['cache-control'], 'no-store');
  assert.deepEqual(JSON.parse(body), { error: 'Catalogue temporarily unavailable', products: null });
});

test('resiliência: depois de uma falha, a próxima requisição tenta de novo (sem cache de erro)', async t => {
  const handler = fresh();
  let calls = 0;
  t.mock.method(console, 'error', () => {});
  t.mock.method(global, 'fetch', async () => { calls++; return { ok: false, status: 500, headers: { get: () => 'text/html' } }; });
  const res = () => ({ setHeader() {}, end() {} });
  await handler({ method: 'GET' }, res());
  await handler({ method: 'GET' }, res());
  assert.equal(calls, 2);
});
