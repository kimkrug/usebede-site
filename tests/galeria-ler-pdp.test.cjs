'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePdp, compareRule, candidateCheck } = require('../scripts/galeria-ler-pdp.cjs');

// Minimal public PDP markup with the attributes the Morelia theme serves.
function pdp({ images = ['11', '12', '21'], variants } = {}) {
  const rows = variants || [
    { product_id: 123, id: 1, sku: 'M-34-PRETO', option0: '34', option1: 'Preto', option2: null, image: 11, available: true },
    { product_id: 123, id: 2, sku: 'M-34-BEGE', option0: '34', option1: 'Bege', option2: null, image: 21, available: false }
  ];
  const json = JSON.stringify(rows).replace(/"/g, '&quot;');
  const slides = images.map((id, i) => `<div class="js-product-slide swiper-slide" data-image="${id}" data-image-position="${i}"><a href="//dcdn-us.mitiendanube.com/stores/1/products/${id}-1024-1024.webp" class="js-product-slide-link d-block">x</a></div>`).join('');
  return `<div id="single-product" data-variants="${json}" data-store="product-detail"><div data-store="product-image-123"><div class="js-swiper-product">${slides}</div></div><form id="product_form" data-store="product-form-123"></form></div>`;
}
const rule = { axis: 1, colors: { Preto: ['11'], Bege: ['21'] }, gallery: { Preto: ['11', '12'], Bege: ['21'] }, retired: ['12'],
  bindings: [
    { id: '1', sku: 'M-34-PRETO', image: '11', options: ['34', 'Preto', null] },
    { id: '2', sku: 'M-34-BEGE', image: '21', options: ['34', 'Bege', null] }
  ] };

test('parsePdp: reads product, variants and ordered native images from saved public HTML', () => {
  const page = parsePdp(pdp());
  assert.equal(page.productId, '123');
  assert.deepEqual(page.images.map(i => i.id), ['11', '12', '21']);
  assert.equal(page.images[0].url, 'https://dcdn-us.mitiendanube.com/stores/1/products/11-1024-1024.webp');
  assert.deepEqual(page.bindings[1], { id: '2', sku: 'M-34-BEGE', image: '21', options: ['34', 'Bege', null] });
});

test('parsePdp: duplicated slides (theme clones) are counted once; malformed pages fail loudly', () => {
  assert.deepEqual(parsePdp(pdp({ images: ['11', '11', '12', '21'] })).images.map(i => i.id), ['11', '12', '21']);
  assert.throws(() => parsePdp('<html></html>'), /product-form/);
});

test('compareRule: unchanged page verifies; the report shows no differences', () => {
  const report = compareRule(parsePdp(pdp()), rule);
  assert.equal(report.verified, true);
  assert.deepEqual(report.newImageIds, []);
  assert.deepEqual(report.missingKnownIds, []);
  assert.deepEqual(report.bindingChanges, []);
});

test('compareRule: new shoot is reported, never auto-accepted, and colours stay a human decision', () => {
  const page = parsePdp(pdp({ images: ['11', '12', '21', '901', '902'], variants: [
    { product_id: 123, id: 1, sku: 'M-34-PRETO', option0: '34', option1: 'Preto', option2: null, image: 901, available: true },
    { product_id: 123, id: 2, sku: 'M-34-BEGE', option0: '34', option1: 'Bege', option2: null, image: 902, available: false }
  ] }));
  const report = compareRule(page, rule);
  assert.equal(report.verified, false);
  assert.deepEqual(report.newImageIds, ['901', '902']);
  assert.deepEqual(report.bindingChanges.map(c => [c.id, c.before, c.after]), [['1', '11', '901'], ['2', '21', '902']]);
  assert.deepEqual(report.suggestedBindings.map(b => b.image), ['901', '902']);
  assert.equal(report.colorsToDecide.length, 2, 'every colour needs manifest-based cover/gallery choice');
});

test('candidateCheck: a candidate rule is accepted only if it verifies against the post-save page', () => {
  const page = parsePdp(pdp({ images: ['11', '12', '21', '901', '902'], variants: [
    { product_id: 123, id: 1, sku: 'M-34-PRETO', option0: '34', option1: 'Preto', option2: null, image: 901, available: true },
    { product_id: 123, id: 2, sku: 'M-34-BEGE', option0: '34', option1: 'Bege', option2: null, image: 902, available: false }
  ] }));
  const good = { axis: 1, colors: { Preto: ['901'], Bege: ['902'] }, gallery: { Preto: ['901', '11', '12'], Bege: ['902', '21'] }, retired: ['11', '12', '21'],
    bindings: page.bindings };
  assert.equal(candidateCheck(page, good).verified, true);
  // Wrong colour: Bege cover shown under Preto must be refused.
  const wrong = { ...good, gallery: { Preto: ['901', '902'], Bege: ['902', '21'] } };
  assert.equal(candidateCheck(page, wrong).verified, false);
});
