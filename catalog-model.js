/* BEDÊ: public storefront data only. No independent stock or price catalogue. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.BedeCatalog = model;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const STORE = 'https://loja.usebede.com.br';
  const CATEGORIES = [
    ['scarpin', 'Scarpins'], ['sandalia', 'Sandálias'], ['rasteirinha', 'Rasteirinhas'],
    ['chinelo', 'Chinelos'], ['papete', 'Papetes e birkens'], ['mocassim', 'Mocassins'],
    ['mule', 'Mules e clogs'], ['slingback', 'Slingbacks'], ['sapatilha', 'Sapatilhas'],
    ['sapato', 'Sapatos'], ['tamanco', 'Tamancos'], ['tenis', 'Tênis'],
    ['bota', 'Botas'], ['coturno', 'Coturnos'], ['bolsa', 'Bolsas'],
    ['mochila', 'Mochilas'], ['clutch', 'Clutches'], ['carteira', 'Carteiras']
  ].map(([key, label]) => ({ key, label }));
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  function inferCategory(name) {
    const n = norm(name);
    if (/\bcoturno\b/.test(n)) return 'coturno';
    if (/^(clogs?|mules?)\b/.test(n)) return 'mule';
    if (/^(birkens?|papetes?)\b/.test(n)) return 'papete';
    const found = CATEGORIES.find(c => new RegExp('^' + c.key + '(?:s)?\\b').test(n));
    return found ? found.key : '';
  }
  function safeURL(value, product) {
    try {
      const u = new URL(value, STORE);
      if (u.protocol !== 'https:' || u.username || u.password || u.port) return '';
      if (product) return u.origin === STORE && /^\/produtos\/[^/]+\/$/.test(u.pathname) ? u.href : '';
      return /(^|\.)mitiendanube\.com$/.test(u.hostname) ? u.href : '';
    } catch (_) { return ''; }
  }
  function normalizeProduct(p) {
    if (!p || !p.id || !p.name || !String(p.name).trim()) return null;
    const price = p.priceCents;
    const url = safeURL(p.url, true);
    const image = safeURL(p.image, false);
    if (!url || !image || !Number.isSafeInteger(price) || price <= 0) return null;
    return {
      id: String(p.id), name: String(p.name).trim(), url, image,
      priceCents: price,
      compareAtCents: Number.isSafeInteger(p.compareAtCents) && p.compareAtCents > price ? p.compareAtCents : null,
      category: CATEGORIES.some(c => c.key === p.category) ? p.category : inferCategory(p.name),
      available: p.available === true,
      priceRange: p.priceRange === true
    };
  }
  function getPromotion(p) {
    if (!p || !Number.isSafeInteger(p.priceCents) || p.priceCents <= 0 ||
        !Number.isSafeInteger(p.compareAtCents) || p.compareAtCents <= p.priceCents) return null;
    return { priceCents: p.priceCents, compareAtCents: p.compareAtCents,
      percent: Math.floor((p.compareAtCents - p.priceCents) * 100 / p.compareAtCents) };
  }
  function selectCategory(products, key) {
    return (products || []).filter(p => p.category === norm(key));
  }
  function selectHighlights(products, limit = 8) {
    const selected = [], seen = new Set();
    const candidates = (products || []).filter(p => p.available && p.category);
    // Editorial diversity, not a sales or popularity ranking.
    ['scarpin', 'sandalia', 'bota', 'tenis', 'bolsa', 'mocassim', 'rasteirinha', 'chinelo'].forEach(key => {
      const p = candidates.find(p => p.category === key && !seen.has(p.id));
      if (p && selected.length < limit) { selected.push(p); seen.add(p.id); }
    });
    return selected;
  }
  const formatBRL = cents => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return { STORE, CATEGORIES, norm, inferCategory, normalizeProduct, getPromotion, selectCategory, selectHighlights, formatBRL, escapeHTML };
});
