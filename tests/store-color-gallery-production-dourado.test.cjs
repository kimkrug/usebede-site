'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {getVerifiedGallery} = require('../store-color-gallery');

// Native before and post-save DOM observations on 2026-09-06, not an API fixture.
const rows = [
  ['1587974760', '3037-35', '35', 1, true],
  ['1587974755', '3037-36', '36', 2, true],
  ['1587974752', '3037-37', '37', 2, true],
  ['1587974745', '3037-38', '38', 1, true],
];
const old = ['1263356188','1263356193','1263334441','1263334443','1263281551','1263281564'];
const newImage = '1267066076';
const newURL = '//dcdn-us.mitiendanube.com/stores/008/137/758/products/candidata_rgb_original-0432f9d748e119d94a17887106257177.png';
function dourado() {
  return {
    productId: '364500246',
    variants: rows.map(([id, sku, size, stock, available]) => ({
      product_id: '364500246', id, sku, option0: size, option1: null, option2: null,
      image: newImage, stock, price_number: 379.9, available, is_visible: true, contact: false,
    })),
    // Old URL placeholders are synthetic only here; the evidence test checks the real URLs.
    images: [newImage,...old].map(id => ({id,url:id === newImage ? newURL : 'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'})),
  };
}

test('Dourado accepts four exact size-only bindings and retains six originals without input mutation', () => {
  const model = dourado(), before = JSON.stringify(model), result = getVerifiedGallery(model);
  assert.ok(result);
  assert.equal(result.single, true);
  assert.equal(result.axis, null);
  assert.equal(result.colors[0].name, '');
  assert.equal(result.colors[0].soldOut, false);
  assert.deepEqual(result.colors[0].images.map(i => i.id), ["1267066076","1263356188","1263356193"]);
  assert.deepEqual(result.retired, old);
  assert.deepEqual(model.variants.map(v => [v.option0,v.stock]), [['35',1],['36',2],['37',2],['38',1]]);
  assert.ok(model.variants.every(v => v.available && v.price_number === 379.9 && v.is_visible === true && v.contact === false));
  assert.equal(JSON.stringify(model), before);
});

test('Dourado rejects wrong binding, missing or duplicated variants, invented color and incomplete gallery', () => {
  for (const change of [
    m => m.productId = '999',
    m => m.variants[0].image = old[0],
    m => m.variants.pop(),
    m => m.variants.push({...m.variants[0]}),
    m => m.variants[0].id = '999',
    m => m.variants[0].product_id = '999',
    m => m.variants[0].sku = '3037-99',
    m => m.variants[0].option0 = '99',
    m => m.variants[0].option1 = 'Preto',
    m => m.variants[0].option2 = 'Dourado',
    m => m.images.pop(),
    m => m.images.shift(),
    m => m.images.push({id:'999',url:newURL}),
    m => m.images.push({...m.images[0]}),
    m => m.images[0].url = 'https://untrusted.example/product.webp',
  ]) {
    const model = dourado(); change(model); assert.equal(getVerifiedGallery(model), null);
  }
  const oldOnly = dourado();
  oldOnly.images.shift(); oldOnly.variants.forEach(v => v.image = old[0]);
  assert.equal(getVerifiedGallery(oldOnly), null);
});

test('Dourado hashed fresh observations prove four image-only changes and six identical original URLs', t => {
  const dir = path.resolve(__dirname, '../../outputs/fotos-padrao-etapa2/proximo-lote-4-prioritarias-2026-09-06');
  const beforeFile = path.join(dir,'BASELINE_DOURADO_PUBLICACAO_2026-09-06.json');
  const afterFile = path.join(dir,'POS_DOURADO_PUBLICACAO_2026-09-06.json');
  if (!fs.existsSync(beforeFile) || !fs.existsSync(afterFile)) {
    t.skip('Local evidence files are not distributed with the public site'); return;
  }
  const beforeBytes = fs.readFileSync(beforeFile), afterBytes = fs.readFileSync(afterFile);
  const sha = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
  assert.equal(sha(beforeBytes),'4FE4CF131A11F0C24E9D91312FF5C5758057618B3671AC22CB86B8F539DAFDA9');
  assert.equal(sha(afterBytes),'183E1C75F7573FAD34156B200F2E2E77513C030A22A03A77639B7E6476B04414');
  const before = JSON.parse(beforeBytes), after = JSON.parse(afterBytes);
  assert.equal(before.capturedAt,'2026-09-06T15:58:26.656Z');
  assert.equal(after.capturedAt,'2026-09-06T16:05:49.861Z');
  assert.equal(after.slug,'coturno-lhos-dourado');
  assert.equal(after.name,before.name); assert.equal(after.url,before.url);
  assert.deepEqual(after.optionLabels,before.optionLabels);
  assert.deepEqual(before.gallery.map(i=>i.id),old);
  assert.deepEqual(after.gallery.slice(1),before.gallery);
  assert.deepEqual(after.gallery[0],{id:newImage,url:newURL});
  const protect = v => Object.fromEntries(Object.entries(v).filter(([k])=>k !== 'image'));
  assert.deepEqual(after.variants.map(protect),before.variants.map(protect));
  assert.deepEqual(after.variants.map(v=>[String(v.id),v.sku,v.options[0],v.stock,v.available]),rows);
  assert.equal(before.variants.length,4); assert.equal(after.variants.length,4);
  assert.ok(before.variants.every(v=>v.image === Number(old[0])));
  assert.ok(after.variants.every(v=>v.product_id === 364500246 && v.image === Number(newImage) && v.price === 379.9 && v.is_visible === true && v.contact === false && v.options[1] === null && v.options[2] === null && v.missingFields.length === 0));
  const model = {productId:'364500246',variants:after.variants.map(v=>({...v,option0:v.options[0],option1:v.options[1],option2:v.options[2],price_number:v.price})),images:after.gallery};
  const snapshot = JSON.stringify(model);
  assert.ok(getVerifiedGallery(model)); assert.equal(JSON.stringify(model),snapshot);
});
