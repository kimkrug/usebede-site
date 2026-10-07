'use strict';
// Offline public-page fixtures only. No browser, live requests or store mutation.
const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../catalog-model.js');
const { parsePage, collectCatalogue } = require('../api/catalogo.js');
const START = model.STORE + '/produtos/';
const pageURL = number => number === 1 ? START : START + 'page/' + number + '/';
const link = number => '<a href="' + pageURL(number) + '">' + number + '</a>';
const flush = () => new Promise(resolve => setImmediate(resolve));

function card(number, id = 'produto-' + number) {
  const data = { '@type': 'Product', name: 'Scarpin ' + number,
    image: 'https://dcdn-us.mitiendanube.com/stores/008/137/758/products/foto-' + number + '.webp',
    offers: { '@type': 'Offer', priceCurrency: 'BRL', price: (10000 + number) / 100,
      availability: 'https://schema.org/InStock', url: START + id + '/' } };
  return '<div data-product-type="list"><a data-product-price="' + (10000 + number) + '"></a>' +
    '<script type="application/ld+json">' + JSON.stringify(data) + '</script></div>';
}
const page = (number, links = []) => card(number) + links.map(link).join('');
const response = html => ({ ok: true, headers: { get: () => 'text/html; charset=utf-8' }, text: async () => html });
function officialPager(current, total, next = current < total ? pageURL(current + 1) : null) {
  return '<div class="row justify-content-center align-items-center mt-4">' +
    '<div class="col-auto p-0"><a class="opacity-30 disabled p-2"><svg></svg></a></div>' +
    '<div class="col-auto px-2"><div class="text-center"><span>' + current + '</span><span>/</span><span>' + total + '</span></div></div>' +
    '<div class="col-auto p-0"><a' + (next ? ' href="' + next + '"' : '') + ' class=" p-2"><svg></svg></a></div></div>';
}

function controlledFetch(first) {
  const calls = [], pending = new Map(), aborted = [];
  let active = 0, maximum = 0;
  function fetch(url, options) {
    calls.push({ url, options });
    if (url === START) return Promise.resolve(response(first));
    active++; maximum = Math.max(maximum, active);
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = action => {
        if (settled) return;
        settled = true; active--; options.signal.removeEventListener('abort', onAbort); action();
      };
      const onAbort = () => finish(() => { aborted.push(url); reject(options.signal.reason); });
      options.signal.addEventListener('abort', onAbort, { once: true });
      pending.set(url, {
        resolve: html => finish(() => resolve(response(html))),
        fail: status => finish(() => resolve({ ok: false, status }))
      });
    });
  }
  async function untilCalls(count) {
    for (let i = 0; i < 20 && calls.length < count; i++) await flush();
    assert.equal(calls.length, count);
  }
  return { fetch, calls, pending, aborted, untilCalls, maximum: () => maximum };
}

test('pagination: exposes only discovered same-store exact integer page routes in numeric order', () => {
  const unsafe = [
    'https://evil.invalid/produtos/page/2/', '/collections/produtos/page/3/',
    '/produtos/page/4/?sort=price', '/produtos/page/4/#next', '/produtos/page/0/',
    '/produtos/page/-1/', '/produtos/page/03/', '/produtos/page/1.5/',
    '/produtos/page/2/extra/', '/produtos/page/9007199254740993/',
    'https://user@loja.usebede.com.br/produtos/page/9/', 'javascript:alert(1)'
  ];
  const source = card(1) + link(4) + link(2) + link(2) + '<a href="/produtos/page/3">3</a>' +
    unsafe.map(url => '<a href="' + url + '">ignorar</a>').join('') +
    '<!-- <a href="/produtos/page/8/">comentário</a> -->' +
    '<script>const example = \'<a href="/produtos/page/7/">exemplo</a>\';</script>' +
    '<div data-href="/produtos/page/6/">não é um link</div>';
  const parsed = parsePage(source, START);
  assert.equal(parsed.next, pageURL(2));
  assert.deepEqual(parsed.discoveredURLs, [pageURL(2), START + 'page/3', pageURL(4)]);
  assert.equal(parsed.products.length, 1);
  assert.throws(() => parsePage(card(1), 'https://evil.invalid/produtos/page/1/'), /Invalid catalogue page URL/);
});

test('collection: overlaps at most three discovered pages and preserves numeric/product order', async () => {
  const f = controlledFetch(page(1, [4, 2, 3]));
  const resultPromise = collectCatalogue(f.fetch);
  await f.untilCalls(4);
  assert.deepEqual(f.calls.map(call => call.url), [START, pageURL(2), pageURL(3), pageURL(4)]);
  assert.equal(f.maximum(), 3);
  f.pending.get(pageURL(4)).resolve(page(4, [5, 2]));
  await f.untilCalls(5);
  assert.equal(f.calls[4].url, pageURL(5), 'A newly discovered page fills one released slot');
  f.pending.get(pageURL(5)).resolve(page(5));
  f.pending.get(pageURL(3)).resolve(page(3, [4]));
  f.pending.get(pageURL(2)).resolve(page(2, [3]));
  const result = await resultPromise;
  assert.equal(f.maximum(), 3);
  assert.equal(result.pages, 5);
  assert.deepEqual(result.products.map(product => product.id), [1, 2, 3, 4, 5].map(n => 'produto-' + n));
  assert.deepEqual(result.products.map(product => product.priceCents), [10001, 10002, 10003, 10004, 10005]);
  assert.deepEqual(result.products.map(product => product.image), [1, 2, 3, 4, 5].map(n => parsePage(card(n), pageURL(n)).products[0].image));
  assert.ok(f.calls.every(call => call.options.redirect === 'error' && call.options.signal instanceof AbortSignal));
  assert.ok(f.calls.every(call => (!call.options.method || call.options.method === 'GET') && !call.options.body && !call.options.headers.Authorization && !call.options.headers.Cookie));
});

test('collection: a next-only source remains sequential and never invents unseen page URLs', async () => {
  const calls = [];
  const result = await collectCatalogue(async url => {
    calls.push(url);
    const number = url === START ? 1 : Number(new URL(url).pathname.match(/page\/(\d+)/)[1]);
    return response(page(number, number < 3 ? [number + 1] : []));
  });
  assert.deepEqual(calls, [START, pageURL(2), pageURL(3)]);
  assert.equal(result.pages, 3);
});

test('collection: a missing middle page or broken next chain fails without partial catalogue', async () => {
  for (const fixtures of [
    new Map([[START, page(1, [2, 4])], [pageURL(2), page(2)], [pageURL(4), page(4)]]),
    new Map([[START, page(1, [2, 3])], [pageURL(2), page(2)], [pageURL(3), page(3)]])
  ]) {
    const calls = [];
    await assert.rejects(collectCatalogue(async url => { calls.push(url); assert.ok(fixtures.has(url)); return response(fixtures.get(url)); }), /pagination chain incomplete/);
    assert.deepEqual(new Set(calls), new Set(fixtures.keys()));
  }
});

test('collection: one failed concurrent response cancels siblings and does not start queued pages', async () => {
  const f = controlledFetch(page(1, [2, 3, 4, 5]));
  const result = collectCatalogue(f.fetch);
  const rejected = assert.rejects(result, /Store response 503/);
  await f.untilCalls(4);
  f.pending.get(pageURL(3)).fail(503);
  await rejected;
  await flush();
  assert.deepEqual(new Set(f.aborted), new Set([pageURL(2), pageURL(4)]));
  assert.equal(f.calls.length, 4, 'Undispatched page 5 stays undispatched');
  assert.ok(f.calls.slice(1).every(call => call.options.signal.aborted));
});

test('collection: duplicate product identity fails early and cancels outstanding pages', async () => {
  const f = controlledFetch(page(1, [2, 3, 4]));
  const result = collectCatalogue(f.fetch);
  const rejected = assert.rejects(result, /Catalogue changed during pagination/);
  await f.untilCalls(4);
  f.pending.get(pageURL(2)).resolve(card(2, 'produto-1') + link(3));
  await rejected;
  await flush();
  assert.deepEqual(new Set(f.aborted), new Set([pageURL(3), pageURL(4)]));
});

test('collection: page 21 is never requested and the twenty-page boundary succeeds only with a complete chain', async () => {
  const rejectedCalls = [];
  await assert.rejects(collectCatalogue(async url => {
    rejectedCalls.push(url); return response(page(1, [2, 21]));
  }), /safety page limit/);
  assert.deepEqual(rejectedCalls, [START]);
  const result = await collectCatalogue(async url => {
    const number = url === START ? 1 : Number(new URL(url).pathname.match(/page\/(\d+)/)[1]);
    return response(page(number, number < 20 ? [number + 1] : []));
  });
  assert.equal(result.pages, 20);
  assert.equal(result.products.length, 20);
});

test('collection: invalid body format, oversize body and missing structured data stay hard failures', async () => {
  await assert.rejects(collectCatalogue(async () => ({ ok: true, headers: { get: () => 'application/json' }, text: async () => card(1) })), /Unexpected catalogue format/);
  await assert.rejects(collectCatalogue(async () => response(' '.repeat(2500001))), /Unexpected catalogue size/);
  await assert.rejects(collectCatalogue(async () => response('<div data-product-type="list">sem dados</div>')), /structured data missing/);
});

test('collection: the global eighteen-second deadline settles and aborts concurrent fetches even if adapters ignore abort', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let clock = 0;
  t.mock.method(Date, 'now', () => clock);
  t.mock.method(AbortSignal, 'timeout', () => new AbortController().signal);
  const calls = [];
  const result = collectCatalogue(async (url, options) => {
    calls.push({ url, options });
    if (url === START) return response(page(1, [2, 3, 4]));
    return new Promise(() => {});
  });
  const rejected = assert.rejects(result, /Catalogue collection deadline exceeded/);
  await flush();
  assert.equal(calls.length, 4);
  clock = 18000; t.mock.timers.tick(18000);
  await rejected;
  assert.ok(calls.slice(1).every(call => call.options.signal.aborted));
});

test('collection: per-page timeout also covers a stalled body and preserves the eight-second cap', async t => {
  const controller = new AbortController(), limits = [];
  t.mock.method(AbortSignal, 'timeout', milliseconds => { limits.push(milliseconds); return controller.signal; });
  let bodyStarted = false;
  const result = collectCatalogue(async () => ({ ok: true, headers: { get: () => 'text/html' }, text: async () => {
    bodyStarted = true; return new Promise(() => {});
  } }));
  const rejected = assert.rejects(result, /page timeout/);
  await flush();
  assert.equal(bodyStarted, true);
  assert.deepEqual(limits, [8000]);
  controller.abort(new Error('page timeout'));
  await rejected;
});

test('official pager: the verified current/total row plus real next route enables bounded planning of all nine pages', async () => {
  const first = card(1) + officialPager(1, 9);
  const parsed = parsePage(first, START);
  assert.deepEqual(parsed.discoveredURLs, [pageURL(2)], 'Only one future URL is literally linked');
  assert.equal(parsed.paginationTotal, 9);
  assert.equal(parsed.paginationTemplate, pageURL(2));
  const f = controlledFetch(first);
  const result = collectCatalogue(f.fetch);
  await f.untilCalls(4);
  assert.deepEqual(f.calls.map(call => call.url), [START, pageURL(2), pageURL(3), pageURL(4)]);
  for (let number = 2; number <= 9; number++) {
    assert.ok(f.pending.has(pageURL(number)));
    f.pending.get(pageURL(number)).resolve(card(number) + officialPager(number, 9));
    await flush();
  }
  const data = await result;
  assert.equal(f.maximum(), 3);
  assert.deepEqual(f.calls.map(call => call.url), Array.from({ length: 9 }, (_, i) => pageURL(i + 1)));
  assert.equal(data.pages, 9);
  assert.deepEqual(data.products.map(product => product.id), Array.from({ length: 9 }, (_, i) => 'produto-' + (i + 1)));
});

test('official pager: unrelated counters do not authorize route derivation; next-only fallback remains intact', async () => {
  const first = card(1) + officialPager(1, 9).replace('row justify-content-center align-items-center mt-4', 'unrelated-counter');
  const parsed = parsePage(first, START);
  assert.equal(parsed.paginationTotal, null);
  assert.equal(parsed.paginationTemplate, null);
  const f = controlledFetch(first);
  const result = collectCatalogue(f.fetch);
  await f.untilCalls(2);
  f.pending.get(pageURL(2)).resolve(card(2));
  assert.equal((await result).pages, 2);
  assert.equal(f.maximum(), 1);
  assert.equal(f.calls.length, 2);
});

test('official pager: missing marker, changed total or broken next link cancels the planned collection', async () => {
  for (const second of [card(2) + link(3), card(2) + officialPager(2, 8), card(2) + officialPager(2, 9, null)]) {
    const f = controlledFetch(card(1) + officialPager(1, 9));
    const result = collectCatalogue(f.fetch);
    const rejected = assert.rejects(result, /pagination (?:summary|chain)/);
    await f.untilCalls(4);
    f.pending.get(pageURL(2)).resolve(second);
    await rejected; await flush();
    assert.equal(f.calls.length, 4, 'Failed proof cannot trigger more planned fetches');
    assert.deepEqual(new Set(f.aborted), new Set([pageURL(3), pageURL(4)]));
  }
});

test('official pager: untrusted next routes, invalid current/total and a nonterminal last page cannot yield partial success', async () => {
  for (const next of ['https://evil.invalid/produtos/page/2/', '/produtos/page/2/?sort=price', '/search/?page=2']) {
    const first = card(1) + officialPager(1, 9, next), calls = [];
    assert.equal(parsePage(first, START).paginationTemplate, null);
    await assert.rejects(collectCatalogue(async url => { calls.push(url); return response(first); }), /pagination chain incomplete/);
    assert.deepEqual(calls, [START]);
  }
  assert.throws(() => parsePage(card(2) + officialPager(3, 9), pageURL(2)), /summary inconsistent/);
  assert.throws(() => parsePage(card(1) + officialPager(1, 21), START), /safety page limit/);
  await assert.rejects(collectCatalogue(async url => response(url === START ? card(1) + officialPager(1, 2) : card(2) + officialPager(2, 2, pageURL(3)))), /summary inconsistent/);
});
