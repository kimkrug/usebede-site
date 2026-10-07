/* Leitura OFFLINE de uma PDP pública salva em arquivo. Sem rede, sem escrita na loja.
   Uso: node scripts/galeria-ler-pdp.cjs <pdp-salva.html> [--rule candidata.json]
   Compara a página pós-save com a regra atual de store-color-gallery.js (04_RECEBIMENTO_NOVAS_FOTOS §5, passo 6).
   Não escolhe capa nem cor: isso vem do manifesto de fotos. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const gallery = require('../store-color-gallery.js');

function decode(text) {
  return text.replace(/&quot;|&#34;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function parsePdp(html) {
  const form = /data-store="product-form-([1-9]\d*)"/.exec(html);
  if (!form) throw new Error('PDP sem product-form: não é uma página de produto salva.');
  const productId = form[1];
  const raw = /id="single-product"[^>]*?data-variants="([^"]*)"|data-variants="([^"]*)"[^>]*?id="single-product"/.exec(html);
  if (!raw) throw new Error('PDP sem data-variants em #single-product.');
  const variants = JSON.parse(decode(raw[1] || raw[2]));
  const images = [];
  const slide = /<[^>]*\bjs-product-slide\b[^>]*\bdata-image="([1-9]\d*)"[^>]*>[\s\S]*?<a\b[^>]*\bhref="([^"]+)"[^>]*\bjs-product-slide-link\b|<[^>]*\bjs-product-slide\b[^>]*\bdata-image="([1-9]\d*)"[^>]*>[\s\S]*?<a\b[^>]*\bjs-product-slide-link\b[^>]*\bhref="([^"]+)"/g;
  for (const match of html.matchAll(slide)) {
    const id = match[1] || match[3], href = decode(match[2] || match[4]);
    // Morelia clones slides for its swiper; keep the first occurrence of each ID.
    if (images.some(image => image.id === id)) continue;
    images.push({ id, url: href.startsWith('//') ? 'https:' + href : href });
  }
  const bindings = variants.map(v => ({ id: String(v.id), sku: v.sku, image: String(v.image), options: [v.option0 ?? null, v.option1 ?? null, v.option2 ?? null] }));
  return { productId, variants, images, bindings };
}

function knownIds(rule) {
  if (!rule) return [];
  const colours = Object.values(rule.colors || {}).flat();
  const shown = Array.isArray(rule.gallery) ? rule.gallery : Object.values(rule.gallery || {}).flat();
  return [...new Set([...(rule.approved || []), ...colours, ...shown, ...(rule.retired || []), ...(rule.bindings || []).map(b => b.image)].map(String))];
}

function candidateCheck(page, rule) {
  const model = { productId: page.productId, variants: page.variants, images: page.images };
  return { verified: Boolean(rule && gallery.getVerifiedGallery(model, rule)) };
}

function compareRule(page, rule) {
  const known = knownIds(rule), onPage = page.images.map(image => image.id);
  const before = new Map((rule?.bindings || []).map(b => [String(b.id), b]));
  const bindingChanges = page.bindings.flatMap(after => {
    const old = before.get(after.id);
    if (!old) return [{ id: after.id, sku: after.sku, change: 'variante nova', before: null, after: after.image }];
    if (old.sku !== after.sku || String(old.image) !== after.image || JSON.stringify(old.options) !== JSON.stringify(after.options))
      return [{ id: after.id, sku: after.sku, change: old.sku !== after.sku ? 'sku' : String(old.image) !== after.image ? 'imagem' : 'opções', before: String(old.image), after: after.image }];
    return [];
  });
  const removed = [...before.keys()].filter(id => !page.bindings.some(b => b.id === id));
  const axis = rule && rule.mode !== 'single' && [0, 1, 2].includes(rule.axis) ? rule.axis : null;
  const colours = axis === null ? ['(sem eixo cor)'] : [...new Set(page.variants.map(v => v['option' + axis]))];
  return {
    productId: page.productId,
    ruleExists: Boolean(rule),
    verified: candidateCheck(page, rule).verified,
    nativeImageIds: onPage,
    newImageIds: onPage.filter(id => !known.includes(id)),
    missingKnownIds: known.filter(id => !onPage.includes(id)),
    bindingChanges,
    removedVariants: removed,
    suggestedBindings: page.bindings,
    colorsToDecide: colours.map(name => ({ color: name, coverAndGallery: 'definir pelo manifesto; nunca por aparência ou eliminação' }))
  };
}

function currentRule(productId) {
  // The MAP is private to the module; read it from source without executing page code.
  const source = fs.readFileSync(path.join(__dirname, '..', 'store-color-gallery.js'), 'utf8');
  const body = /const MAP=([\s\S]*?);\s*function imageURL/.exec(source);
  if (!body) throw new Error('MAP não encontrado em store-color-gallery.js');
  const map = Function('"use strict";return (' + body[1] + ');')();
  return map[productId] || null;
}

if (require.main === module) {
  const [file, flag, candidate] = process.argv.slice(2);
  if (!file) { console.error('Uso: node scripts/galeria-ler-pdp.cjs <pdp-salva.html> [--rule candidata.json]'); process.exit(2); }
  const page = parsePdp(fs.readFileSync(file, 'utf8'));
  const report = compareRule(page, currentRule(page.productId));
  if (flag === '--rule' && candidate) report.candidate = candidateCheck(page, JSON.parse(fs.readFileSync(candidate, 'utf8')));
  console.log(JSON.stringify(report, null, 2));
}

module.exports = { parsePdp, compareRule, candidateCheck, knownIds, currentRule };
