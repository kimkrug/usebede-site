'use strict';
// GET only. Reads public product listings; never authenticates or mutates the store.
const model = require('../catalog-model.js');
const START = model.STORE + '/produtos/';
const MAX_PAGES = 20;
const MAX_COLLECTION_MS = 18000;
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
  const currentPage = Number(new URL(pageURL).pathname.match(/\/page\/(\d+)\//)?.[1] || 1);
  const links = [...html.matchAll(/href=["']([^"']*\/produtos\/page\/\d+\/?)["']/gi)]
    .map(m => new URL(decode(m[1]), START)).filter(u => u.origin === model.STORE);
  const next = links.find(u => Number(u.pathname.match(/\/page\/(\d+)/)?.[1]) === currentPage + 1);
  return { products, next: next?.href || null };
}
async function collectCatalogue(fetchImpl = fetch) {
  const products = [], ids = new Set();
  let url = START, pages = 0;
  const deadline = Date.now() + MAX_COLLECTION_MS;
  const started = new Date().toISOString();
  while (url) {
    if (++pages > MAX_PAGES) throw new Error('Catalogue exceeds safety page limit');
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Catalogue collection deadline exceeded');
    const r = await fetchImpl(url, { signal: AbortSignal.timeout(Math.min(8000, remaining)), redirect: 'error',
      headers: { Accept: 'text/html', 'User-Agent': 'BEDE-Storefront-Catalog/1.0' } });
    if (!r.ok) throw new Error('Store response ' + r.status);
    if (!(r.headers.get('content-type') || '').includes('text/html')) throw new Error('Unexpected catalogue format');
    const html = await r.text();
    if (Date.now() >= deadline) throw new Error('Catalogue collection deadline exceeded');
    if (html.length > 2500000) throw new Error('Unexpected catalogue size');
    const page = parsePage(html, url);
    for (const p of page.products) {
      if (ids.has(p.id)) throw new Error('Catalogue changed during pagination');
      ids.add(p.id); products.push(p);
    }
    url = page.next;
  }
  return { source: START, startedAt: started, fetchedAt: new Date().toISOString(), pages,
    products, categories: model.CATEGORIES.filter(c => products.some(p => p.category === c.key)) };
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
