'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { analyse } = require('../scripts/relatorio-rotulos-cor.cjs');

const rows = labels => labels.flatMap(([label, n]) => Array.from({ length: n }, (_, i) => ({ label, sku: label + i })));

test('rótulos: só diferença ortográfica recebe rótulo canônico (o mais usado)', () => {
  const { verdict } = analyse(rows([['Preto', 5], ['Preta', 1], ['Café', 2], ['Cafe', 3]]));
  assert.equal(verdict.get('Preta').canonical, 'Preto');
  assert.equal(verdict.get('Café').canonical, 'Cafe', 'a grafia mais usada vence; Kim decide no admin');
  assert.equal(verdict.get('Preto').kind, 'ortográfica');
});

test('rótulos: proximidade de sentido, composto e grafia suspeita nunca são fundidos', () => {
  const { verdict } = analyse(rows([['Prata', 2], ['Prateado', 1], ['Nude/preto', 1], ['Sesano', 1], ['Caramelo', 4]]));
  for (const label of ['Prata', 'Prateado', 'Nude/preto', 'Sesano']) assert.equal(verdict.get(label).canonical, '', label);
  assert.match(verdict.get('Prata').kind, /revisar/);
  assert.equal(verdict.has('Caramelo'), false);
});
