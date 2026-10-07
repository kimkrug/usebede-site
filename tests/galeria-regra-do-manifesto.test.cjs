'use strict';
// R2-6: regra candidata montada a partir do manifesto de fotos + PDP pós-save (dados fictícios).
const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePdp, candidateCheck } = require('../scripts/galeria-ler-pdp.cjs');
const { parseManifest, buildRule } = require('../scripts/galeria-regra-do-manifesto.cjs');

function pdp(images, variants) {
  const json = JSON.stringify(variants).replace(/"/g, '&quot;');
  const slides = images.map((id, i) => `<div class="js-product-slide" data-image="${id}" data-image-position="${i}"><a href="//dcdn-us.mitiendanube.com/stores/1/products/${id}.webp" class="js-product-slide-link">x</a></div>`).join('');
  return `<div id="single-product" data-variants="${json}" data-store="product-detail"><div class="js-swiper-product">${slides}</div><form data-store="product-form-900000001"></form></div>`;
}
const v = (id, size, colour, image) => ({ product_id: 900000001, id, sku: 'FX-' + size + '-' + colour.toUpperCase(), option0: size, option1: colour, option2: null, image, available: true });
// Página pós-save: 2 fotos antigas (11, 12) + 3 novas (501 capa Preto, 502 interna Preto, 601 capa Caramelo).
const page = parsePdp(pdp(['11', '12', '501', '502', '601'], [v(1, '34', 'Preto', 501), v(2, '35', 'Preto', 501), v(3, '34', 'Caramelo', 601), v(4, '34', 'Nude', 11)]));
const HEADER = 'arquivo_original;copia;id_produto;sku_prefixo;modelo;cor;ordem;papel;estado;novo_image_id;observacao';
const row = (cor, ordem, papel, id, estado = 'VINCULADA') => `a.jpg;b.jpg;900000001;FX;Fixture;${cor};${ordem};${papel};${estado};${id};`;

test('manifesto: capa primeiro, internas na ordem, cor sem foto fica vazia, antigas aposentadas', () => {
  const manifest = parseManifest([HEADER, row('Preto', '02', 'interna', '502'), row('Preto', '01', 'capa', '501'), row('Caramelo', '01', 'capa', '601')].join('\n'));
  const { rule, warnings } = buildRule(manifest, page, '900000001');
  assert.equal(rule.axis, 1);
  assert.deepEqual(rule.colors, { Caramelo: ['601'], Nude: [], Preto: ['501'] });
  assert.deepEqual(rule.gallery, { Caramelo: ['601'], Nude: [], Preto: ['501', '502'] });
  assert.deepEqual(rule.retired.sort(), ['11', '12', '502']);
  assert.match(warnings.join(' '), /Nude.*sem foto/);
  assert.equal(candidateCheck(page, rule).verified, true);
});

test('manifesto: cor a confirmar, capa ausente/dupla e estado anterior ao vínculo são recusados', () => {
  const build = rows => buildRule(parseManifest([HEADER, ...rows].join('\n')), page, '900000001');
  assert.throws(() => build([row('cor-a-confirmar', '01', 'capa', '501')]), /cor a confirmar/i);
  assert.throws(() => build([row('Preto', '01', 'interna', '501')]), /sem capa/);
  assert.throws(() => build([row('Preto', '01', 'capa', '501'), row('Preto', '02', 'capa', '502')]), /mais de uma capa/);
  assert.throws(() => build([row('Preto', '01', 'capa', '501', 'SALVA NATIVAMENTE')]), /ainda não vinculada/);
  assert.throws(() => build([row('Preto', '01', 'capa', '999')]), /não está na página/);
});

test('manifesto: variante ligada a uma interna (não à capa) impede a regra', () => {
  const wrong = parsePdp(pdp(['11', '12', '501', '502', '601'], [v(1, '34', 'Preto', 502), v(2, '35', 'Preto', 501), v(3, '34', 'Caramelo', 601), v(4, '34', 'Nude', 11)]));
  const manifest = parseManifest([HEADER, row('Preto', '01', 'capa', '501'), row('Preto', '02', 'interna', '502'), row('Caramelo', '01', 'capa', '601')].join('\n'));
  assert.throws(() => buildRule(manifest, wrong, '900000001'), /Variante 1 .*502.*capa/);
});

test('manifesto: foto de uma cor colocada em outra nunca passa no verificador', () => {
  const manifest = parseManifest([HEADER, row('Preto', '01', 'capa', '501'), row('Preto', '02', 'interna', '601'), row('Caramelo', '01', 'capa', '601')].join('\n'));
  assert.throws(() => buildRule(manifest, page, '900000001'), /601.*mais de uma cor/);
});
