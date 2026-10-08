'use strict';
// R6: decisões de Kim de 07/10 (D19, D20, D22) aplicadas no código editorial.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('D20: chamada do hero é só "Nova Coleção", sem estação nem separador solto', () => {
  const html = read('index.html');
  const eyebrows = [...html.matchAll(/<span class="hero-eyebrow">([^<]*)<\/span>/g)].map(m => m[1].trim());
  assert.ok(eyebrows.includes('Nova Coleção'));
  for (const text of eyebrows) {
    assert.doesNotMatch(text, /inverno|verão|outono|primavera|20\d\d/i, text);
    assert.doesNotMatch(text, /^[·\-–|]|[·\-–|]$/, 'separador solto: ' + text);
  }
});
