/* Monta a regra candidata do MAP a partir do manifesto de fotos (04_RECEBIMENTO_NOVAS_FOTOS §3)
   e de uma PDP pública salva DEPOIS do vínculo nativo. Offline; não escreve no MAP nem na loja.
   Uso: node scripts/galeria-regra-do-manifesto.cjs <manifesto.csv> <pdp-depois.html> <id-produto> [--out candidata.json]
   Manifesto: CSV com ';' e cabeçalho
   arquivo_original;copia;id_produto;sku_prefixo;modelo;cor;ordem;papel;estado;novo_image_id;observacao
   papel = capa | interna · cor = rótulo exato da loja, ou sem-eixo-cor. */
'use strict';
const fs = require('node:fs');
const { parsePdp, candidateCheck } = require('./galeria-ler-pdp.cjs');

const LINKED = new Set(['VINCULADA', 'PUBLICADA', 'CONFERIDA NO SITE']);

function parseManifest(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(line => line.trim());
  const header = lines.shift().split(';').map(h => h.trim());
  for (const column of ['id_produto', 'cor', 'ordem', 'papel', 'estado', 'novo_image_id']) if (!header.includes(column)) throw new Error('Manifesto sem a coluna ' + column);
  return lines.map((line, i) => {
    const cells = line.split(';');
    const row = Object.fromEntries(header.map((h, j) => [h, (cells[j] || '').trim()]));
    row.linha = i + 2;
    return row;
  });
}

function buildRule(manifest, page, productId) {
  const rows = manifest.filter(r => r.id_produto === String(productId));
  if (!rows.length) throw new Error('Nenhuma linha do manifesto para o produto ' + productId);
  if (page.productId !== String(productId)) throw new Error('A PDP é do produto ' + page.productId + ', não ' + productId);
  const onPage = new Set(page.images.map(i => i.id));
  for (const r of rows) {
    if (/a-confirmar/i.test(r.cor)) throw new Error('Linha ' + r.linha + ': cor a confirmar — não associar por aparência');
    if (!LINKED.has(r.estado.toUpperCase())) throw new Error('Linha ' + r.linha + ': foto ainda não vinculada (estado ' + r.estado + ')');
    if (!/^[1-9]\d*$/.test(r.novo_image_id)) throw new Error('Linha ' + r.linha + ': novo_image_id ausente ou inválido');
    if (!onPage.has(r.novo_image_id)) throw new Error('Linha ' + r.linha + ': imagem ' + r.novo_image_id + ' não está na página salva');
    if (!['capa', 'interna'].includes(r.papel.toLowerCase())) throw new Error('Linha ' + r.linha + ': papel deve ser capa ou interna');
  }
  const owner = new Map();
  for (const r of rows) {
    if (owner.has(r.novo_image_id) && owner.get(r.novo_image_id) !== r.cor) throw new Error('Imagem ' + r.novo_image_id + ' aparece em mais de uma cor (' + owner.get(r.novo_image_id) + ', ' + r.cor + ')');
    owner.set(r.novo_image_id, r.cor);
  }
  const single = rows.every(r => r.cor === 'sem-eixo-cor');
  if (!single && rows.some(r => r.cor === 'sem-eixo-cor')) throw new Error('Manifesto mistura sem-eixo-cor com cores');
  const byColour = new Map();
  for (const r of rows) { if (!byColour.has(r.cor)) byColour.set(r.cor, []); byColour.get(r.cor).push(r); }
  const ordered = colourRows => {
    const covers = colourRows.filter(r => r.papel.toLowerCase() === 'capa');
    if (!covers.length) throw new Error('Cor ' + colourRows[0].cor + ' sem capa no manifesto');
    if (covers.length > 1) throw new Error('Cor ' + colourRows[0].cor + ' com mais de uma capa');
    const inner = colourRows.filter(r => r.papel.toLowerCase() === 'interna').sort((a, b) => Number(a.ordem) - Number(b.ordem));
    return [covers[0].novo_image_id, ...inner.map(r => r.novo_image_id)];
  };
  const warnings = [];
  let rule;
  if (single) {
    const gallery = ordered(rows), cover = gallery[0];
    for (const variant of page.variants) if (String(variant.image) !== cover) throw new Error('Variante ' + variant.id + ' ligada à imagem ' + variant.image + ', não à capa ' + cover);
    rule = { mode: 'single', approved: [cover], gallery, retired: page.images.map(i => i.id).filter(id => id !== cover), bindings: page.bindings };
  } else {
    const names = [...byColour.keys()];
    const axis = [0, 1, 2].find(i => names.every(name => page.variants.some(v => v['option' + i] === name)));
    if (axis === undefined) throw new Error('Cores do manifesto (' + names.join(', ') + ') não correspondem a nenhuma opção das variantes');
    const colours = [...new Set(page.variants.map(v => v['option' + axis]))].sort((a, b) => a.localeCompare(b));
    rule = { axis, colors: {}, gallery: {}, retired: [], bindings: page.bindings };
    for (const colour of colours) {
      const gallery = byColour.has(colour) ? ordered(byColour.get(colour)) : [];
      if (!gallery.length) warnings.push('Cor ' + colour + ' sem foto no manifesto: ficará “Foto indisponível”');
      rule.colors[colour] = gallery.slice(0, 1);
      rule.gallery[colour] = gallery;
      for (const variant of page.variants.filter(v => v['option' + axis] === colour)) {
        if (gallery.length && String(variant.image) !== gallery[0]) throw new Error('Variante ' + variant.id + ' (' + colour + ') ligada à imagem ' + variant.image + ', não à capa ' + gallery[0] + ' — corrigir o vínculo no admin');
      }
    }
    const covers = new Set(Object.values(rule.colors).flat());
    rule.retired = page.images.map(i => i.id).filter(id => !covers.has(id));
  }
  return { rule, warnings, verified: candidateCheck(page, rule).verified };
}

if (require.main === module) {
  const [manifestFile, pdpFile, productId] = process.argv.slice(2);
  const outIndex = process.argv.indexOf('--out');
  if (!manifestFile || !pdpFile || !productId) { console.error('Uso: node scripts/galeria-regra-do-manifesto.cjs <manifesto.csv> <pdp-depois.html> <id-produto> [--out candidata.json]'); process.exit(2); }
  try {
    const result = buildRule(parseManifest(fs.readFileSync(manifestFile, 'utf8')), parsePdp(fs.readFileSync(pdpFile, 'utf8')), productId);
    if (outIndex > -1) fs.writeFileSync(process.argv[outIndex + 1], JSON.stringify(result.rule, null, 2));
    console.log(JSON.stringify(result, null, 2));
    if (!result.verified) process.exitCode = 1;
  } catch (error) { console.error('RECUSADO: ' + error.message); process.exitCode = 1; }
}

module.exports = { parseManifest, buildRule };
