'use strict';
// R2-4: falhas simuladas do preview local são honestas e não vazam para o modo ao vivo.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fixtureFault } = require('../scripts/preview-server.cjs');

const captured = { startedAt: '2026-09-05T02:07:00.000Z', fetchedAt: '2026-09-05T02:07:03.660Z', products: [{ id: 'a' }, { id: 'b' }] };

test('preview: HTTP 429/500/503 respondem erro sem produtos', () => {
  for (const status of [429, 500, 503]) {
    const fault = fixtureFault('http-' + status, captured);
    assert.equal(fault.status, status);
    assert.equal(JSON.parse(fault.body).products, null);
  }
});

test('preview: corpo truncado não é JSON válido; products nulo e duplicado chegam como 200', () => {
  assert.throws(() => JSON.parse(fixtureFault('truncated', { ...captured, products: Array.from({ length: 300 }, (_, i) => ({ id: 'p' + i, name: 'x'.repeat(20) })) }).body));
  assert.equal(JSON.parse(fixtureFault('null-products', captured).body).products, null);
  const duplicate = JSON.parse(fixtureFault('duplicate', captured).body).products;
  assert.deepEqual(duplicate.map(p => p.id), ['a', 'b', 'a']);
});

test('preview: "stale" mantém as datas originais; "hang" não responde; snapshot não é alterado', () => {
  const before = JSON.stringify(captured);
  assert.equal(JSON.parse(fixtureFault('stale', captured).body).fetchedAt, captured.fetchedAt);
  assert.deepEqual(fixtureFault('hang', captured), { hang: true });
  assert.equal(JSON.stringify(captured), before);
});

test('preview: falha só é lida com fixture ativa', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'preview-server.cjs'), 'utf8');
  assert.match(source, /const FAULT = FIXTURE && FAULTS\.has\(process\.env\.BEDE_PREVIEW_FAULT\)/);
});
