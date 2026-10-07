'use strict';
// R2-1: comportamento de teclado da gaveta institucional independente do motor.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'institutional-ui.js'), 'utf8');

test('institucional: Tab é conduzido pelo script dentro da gaveta aberta', () => {
  const trap = source.slice(source.indexOf("if (event.key !== 'Tab') return;"));
  assert.match(trap, /event\.preventDefault\(\);\s*\r?\n\s*const index = links\.indexOf\(document\.activeElement\)/);
  assert.match(trap, /\(index \+ step \+ links\.length\) % links\.length/);
});

test('institucional: o foco devolvido nunca é o body (Safari não foca botão clicado)', () => {
  assert.match(source, /returnFocus !== document\.body && returnFocus\.isConnected/);
});
