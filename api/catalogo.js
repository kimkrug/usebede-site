'use strict';
// GET only. Reads public product listings; never authenticates or mutates the store.
const model = require('../catalog-model.js');
const START = model.STORE + '/produtos/';
const MAX_PAGES = 20;
const MAX_COLLECTION_MS = 18000;
const MAX_CONCURRENT_PAGES = 3;
let inflight;
function decode(value) {
  return String(value).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function attribute(attributes, name) {
  const match = attributes.match(new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
  return match ? decode(match[1] ?? match[2] ?? match[3]) : '';
}
function markupHidden(attributes) {
  if (/(?:^|\s)hidden(?:\s|=|$)/i.test(attributes) || attribute(attributes, 'aria-hidden').toLowerCase() === 'true') return true;
  const declarations = attribute(attributes, 'style').toLowerCase().split(';');
  let display = '', visibility = '';
  for (const declaration of declarations) {
    const [property, value] = declaration.split(':');
    if (property.trim() === 'display') display = (value || '').replace(/\s*!important\s*$/, '').trim();
    if (property.trim() === 'visibility') visibility = (value || '').replace(/\s*!important\s*$/, '').trim();
  }
  if (display === 'none' || visibility === 'hidden' || visibility === 'collapse') return true;
  const classes = attribute(attributes, 'class').split(/\s+/);
  // Morelia uses Bootstrap-style utilities. d-none with a responsive display
  // override may be visible at another viewport; do not discard that offer.
  return classes.includes('hidden') || (classes.includes('d-none') && !classes.some(c => /^d-(sm|md|lg|xl|xxl)-(block|inline|inline-block|flex|inline-flex|grid|table|table-row|table-cell)$/.test(c)));
}
function inspectCardMarkup(markup) {
  const stack = [], comparisons = [];
  let visibleText = '';
  const clean = markup.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const tokens = clean.matchAll(/<\/?([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>|([^<]+)/gi);
  for (const token of tokens) {
    if (token[3] !== undefined) {
      if (stack.some(node => node.hidden)) continue;
      visibleText += ' ' + decode(token[3]);
      stack.forEach(node => { if (node.comparison) node.comparison.text += token[3]; });
      continue;
    }
    const tag = token[1].toLowerCase();
    if (token[0][1] === '/') {
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
      continue;
    }
    const node = { tag, hidden: markupHidden(token[2]), comparison: null };
    if (attribute(token[2], 'class').split(/\s+/).includes('js-compare-price-display')) {
      node.comparison = { text: '' }; comparisons.push(node.comparison);
    }
    if (!/\/$/.test(token[2]) && !/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(tag)) stack.push(node);
  }
  return { compareTexts: comparisons.map(c => decode(c.text).replace(/&nbsp;|&#160;/g, ' ').trim()).filter(Boolean), visibleText };
}
function brlCents(text) {
  const amount = text.replace(/\s+/g, '').replace(/^R\$/, '');
  if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{2})?$/.test(amount)) return null;
  const cents = Math.round(Number(amount.replace(/\./g, '').replace(',', '.')) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}
function paginationReference(value) {
  let url;
  try { url = new URL(value, START); } catch (_) { return null; }
  if (url.origin !== model.STORE || url.username || url.password || url.search || url.hash) return null;
  const match = url.pathname.match(/^\/produtos\/page\/([1-9]\d*)\/?$/);
  const number = Number(match?.[1]);
  return match && Number.isSafeInteger(number) ? { number, url: url.href } : null;
}
function paginationSummary(markup, currentPage) {
  let summary = null;
  // Recognize the official Morelia pagination row observed on this store:
  // row/col-auto/text-center with three spans: current / total. Ordinary
  // numbers elsewhere in the page must never authorize speculative URLs.
  for (const opening of markup.matchAll(/<div\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)) {
    const classes = attribute(opening[1], 'class').split(/\s+/);
    if (!['row', 'justify-content-center', 'align-items-center', 'mt-4'].every(c => classes.includes(c))) continue;
    const start = opening.index + opening[0].length;
    const divs = /<\/?div\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi;
    divs.lastIndex = start;
    let depth = 1, closing;
    while ((closing = divs.exec(markup))) {
      depth += /^<\//.test(closing[0]) ? -1 : 1;
      if (!depth) break;
    }
    if (depth) continue;
    const row = markup.slice(start, closing.index);
    const centers = row.matchAll(/<div\b((?:"[^"]*"|'[^']*'|[^'">])*)>\s*<span\b[^>]*>\s*([1-9]\d*)\s*<\/span>\s*<span\b[^>]*>\s*\/\s*<\/span>\s*<span\b[^>]*>\s*([1-9]\d*)\s*<\/span>\s*<\/div>/gi);
    for (const center of centers) {
      if (!attribute(center[1], 'class').split(/\s+/).includes('text-center')) continue;
      const current = Number(center[2]), total = Number(center[3]);
      if (!Number.isSafeInteger(total) || total > MAX_PAGES) throw new Error('Catalogue exceeds safety page limit');
      if (current !== currentPage || total < current) throw new Error('Catalogue pagination summary inconsistent');
      let template = null;
      for (const anchor of row.matchAll(/<a\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)) {
        const reference = paginationReference(attribute(anchor[1], 'href'));
        if (reference?.number === currentPage + 1) template = reference.url;
      }
      if (summary && (summary.total !== total || summary.template !== template)) throw new Error('Catalogue pagination summary inconsistent');
      summary = { total, template };
    }
  }
  return summary;
}
function parsePage(html, pageURL) {
  const products = [];
  // Each Morelia listing card has its own JSON-LD Product. Never execute page JS.
  const cards = html.split(/<div\b(?=[^>]*\bdata-product-type=["']list["'])[^>]*>/i).slice(1);
  for (const card of cards) {
    const match = card.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!match) throw new Error('Product structured data missing');
    let data;
    try { data = JSON.parse(match[1]); } catch (_) { throw new Error('Invalid product structured data'); }
    if (data['@type'] !== 'Product') throw new Error('Unexpected product data');
    const offers = data.offers;
    if (!offers || offers.priceCurrency !== 'BRL') throw new Error('Product currency unavailable');
    const cardPrice = card.match(/data-product-price=["'](\d+)["']/i);
    const priceCents = Number(cardPrice?.[1]);
    if (!Number.isSafeInteger(priceCents) || priceCents <= 0) throw new Error('Visible price unavailable');
    const markup = inspectCardMarkup(card.slice(0, match.index));
    const comparisons = [...new Set(markup.compareTexts.map(brlCents).filter(cents => cents > priceCents))];
    // Conflicting visible comparisons are ambiguous: show the current price only.
    const compareAtCents = comparisons.length === 1 ? comparisons[0] : null;
    const url = offers.url || data.mainEntityOfPage?.['@id'];
    const p = model.normalizeProduct({ id: new URL(url).pathname.split('/').filter(Boolean).pop(),
      name: data.name, url, image: Array.isArray(data.image) ? data.image[0] : data.image,
      priceCents, compareAtCents, available: /\/InStock$/.test(offers.availability || ''),
      priceRange: offers['@type'] === 'AggregateOffer' || /A partir de/i.test(markup.visibleText) });
    if (!p) throw new Error('Invalid public product');
    products.push(p);
  }
  if (!products.length) throw new Error('Public catalogue unavailable');
  const currentPage = pageURL === START ? 1 : paginationReference(pageURL)?.number;
  if (!currentPage) throw new Error('Invalid catalogue page URL');
  const links = new Map();
  // Expose only actual pagination links, not scripts or another route/origin.
  // Derivation is handled separately, only for the verified official summary.
  const paginationMarkup = html.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  for (const tag of paginationMarkup.matchAll(/<(?:a|link)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)) {
    const link = paginationReference(attribute(tag[1], 'href'));
    if (link && !links.has(link.number)) links.set(link.number, link.url);
  }
  const discoveredURLs = [...links].sort((a, b) => a[0] - b[0]).map(([, url]) => url);
  const summary = paginationSummary(paginationMarkup, currentPage);
  return { products, next: links.get(currentPage + 1) || null, discoveredURLs,
    paginationTotal: summary?.total || null, paginationTemplate: summary?.template || null };
}
async function collectCatalogue(fetchImpl = fetch) {
  const products = [], ids = new Set(), completed = new Map();
  const discovered = new Map([[1, START]]), queue = [1], running = new Map();
  let announcedTotal = null, plannedFromSummary = false;
  const deadline = Date.now() + MAX_COLLECTION_MS;
  const started = new Date().toISOString();
  const collection = new AbortController();
  const deadlineTimer = setTimeout(() => collection.abort(new Error('Catalogue collection deadline exceeded')), MAX_COLLECTION_MS);
  async function readPage(number) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Catalogue collection deadline exceeded');
    const signal = AbortSignal.any([collection.signal, AbortSignal.timeout(Math.min(8000, remaining))]);
    let onAbort;
    const aborted = new Promise((_, reject) => {
      onAbort = () => reject(signal.reason || new Error('Catalogue collection aborted'));
      if (signal.aborted) onAbort(); else signal.addEventListener('abort', onAbort, { once: true });
    });
    try {
      // Race the complete response body as well as the headers. A stalled body
      // (or a fetch adapter ignoring abort) cannot extend the collection budget.
      const read = async () => {
        if (signal.aborted) throw signal.reason;
        const url = discovered.get(number);
        const r = await fetchImpl(url, { signal, redirect: 'error',
          headers: { Accept: 'text/html', 'User-Agent': 'BEDE-Storefront-Catalog/1.0' } });
        if (!r.ok) throw new Error('Store response ' + r.status);
        if (!(r.headers.get('content-type') || '').includes('text/html')) throw new Error('Unexpected catalogue format');
        const html = await r.text();
        if (Date.now() >= deadline) throw new Error('Catalogue collection deadline exceeded');
        if (html.length > 2500000) throw new Error('Unexpected catalogue size');
        if (signal.aborted) throw signal.reason;
        return { number, page: parsePage(html, url) };
      };
      return await Promise.race([read(), aborted]);
    } finally {
      signal.removeEventListener('abort', onAbort);
    }
  }
  try {
    while (queue.length || running.size) {
      queue.sort((a, b) => a - b);
      while (queue.length && running.size < MAX_CONCURRENT_PAGES) {
        const number = queue.shift();
        running.set(number, readPage(number));
      }
      const { number, page } = await Promise.race(running.values());
      running.delete(number);
      for (const p of page.products) {
        if (ids.has(p.id)) throw new Error('Catalogue changed during pagination');
        ids.add(p.id);
      }
      if (page.paginationTotal !== null) {
        if (announcedTotal !== null && announcedTotal !== page.paginationTotal) throw new Error('Catalogue pagination summary inconsistent');
        announcedTotal = page.paginationTotal;
      }
      if (number === 1 && page.paginationTotal !== null && page.paginationTemplate) plannedFromSummary = true;
      if (plannedFromSummary && page.paginationTotal !== announcedTotal) throw new Error('Catalogue pagination summary missing or inconsistent');
      if (announcedTotal !== null && (number > announcedTotal || (number === announcedTotal && page.next))) throw new Error('Catalogue pagination summary inconsistent');
      if (plannedFromSummary && number < announcedTotal && !page.next) throw new Error('Catalogue pagination chain incomplete');
      completed.set(number, page);
      const candidates = page.discoveredURLs.slice();
      if (number === 1 && plannedFromSummary) {
        // This store exposes only next/previous links. Its verified 1 / total
        // marker and real next URL establish the bounded route template; every
        // fetched page must still prove that same total and exact next chain.
        for (let n = 2; n <= announcedTotal; n++) candidates.push(page.paginationTemplate.replace(/\/page\/[1-9]\d*(\/?)$/, '/page/' + n + '$1'));
      }
      for (const url of candidates) {
        const reference = paginationReference(url);
        if (!reference || reference.number > MAX_PAGES) throw new Error('Catalogue exceeds safety page limit');
        if (announcedTotal !== null && reference.number > announcedTotal) throw new Error('Catalogue pagination summary inconsistent');
        if (!discovered.has(reference.number)) {
          discovered.set(reference.number, url);
          queue.push(reference.number);
        }
      }
    }
    // Concurrent completion order never becomes catalogue order. Every next
    // link must form the same uninterrupted chain, and no discovered page may
    // remain outside it. Missing links therefore fail instead of returning a
    // plausible-looking partial catalogue.
    let number = 1;
    while (true) {
      const page = completed.get(number);
      if (!page) throw new Error('Catalogue pagination chain incomplete');
      products.push(...page.products);
      if (!page.next) {
        if (number !== completed.size || number !== discovered.size || (announcedTotal !== null && number !== announcedTotal)) throw new Error('Catalogue pagination chain incomplete');
        break;
      }
      if (paginationReference(page.next)?.number !== number + 1) throw new Error('Catalogue pagination chain incomplete');
      number++;
    }
    if (Date.now() >= deadline) throw new Error('Catalogue collection deadline exceeded');
    return { source: START, startedAt: started, fetchedAt: new Date().toISOString(), pages: completed.size,
      products, categories: model.CATEGORIES.filter(c => products.some(p => p.category === c.key)) };
  } catch (error) {
    collection.abort(error);
    throw error;
  } finally {
    clearTimeout(deadlineTimer);
  }
}
async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // The only cross-origin reader is the public store. The home uses /api/catalogo.
  // Keep this header identical even when the CDN is warmed without an Origin.
  // No wildcard or credentials; cache correctness does not depend on Vary support.
  res.setHeader('Access-Control-Allow-Origin', model.STORE);
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' })); return; }
  try {
    if (!inflight) inflight = collectCatalogue().finally(() => { inflight = null; });
    const data = await inflight;
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=120, must-revalidate');
    res.statusCode = 200; res.end(JSON.stringify(data));
  } catch (error) {
    console.error('Catalogue refresh failed:', error.message);
    res.setHeader('Cache-Control', 'no-store'); res.statusCode = 503;
    res.end(JSON.stringify({ error: 'Catalogue temporarily unavailable', products: null }));
  }
}
module.exports = handler;
module.exports.parsePage = parsePage;
module.exports.collectCatalogue = collectCatalogue;
