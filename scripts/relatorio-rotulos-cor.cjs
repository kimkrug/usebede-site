/* Relatório OFFLINE de rótulos de cor (Fase B, só leitura). Lê a auditoria pública de variantes
   já salva e escreve CSV + resumo. Não altera loja nem frontend.
   Uso: node scripts/relatorio-rotulos-cor.cjs <auditoria-variacoes.json> <saida.csv> [rotulos-ao-vivo.txt]
   Regra: rótulo canônico só é sugerido para diferenças ORTOGRÁFICAS (acento, caixa, gênero o/a,
   espaços). Proximidade de sentido (Prata/Prateado, Ouro/Dourado…) vira "revisar" sem sugestão. */
'use strict';
const fs = require('node:fs');

const strip = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
// Gênero só na palavra final: "Preta"→"preto", "Dourada"→"dourado".
const orthoKey = s => strip(s).replace(/a$/, 'o');
// Pares de sentido próximo conhecidos no catálogo: sinalizar, nunca fundir.
// Grafia que não corresponde a nome de cor conhecido; Kim confirma o que é.
const TYPO_SUSPECT = ['sesano'];
const SEMANTIC = [['prata', 'prateado'], ['ouro', 'dourado'], ['verniz', 'preto verniz'], ['vermelho', 'vermelho escuro'], ['azul', 'azul escuro']];

function collect(audit) {
  const rows = [];
  for (const product of audit.products || []) for (const variant of product.variants || []) {
    const colour = (variant.options || []).find(o => /^cor$/i.test(o.name));
    if (!colour) continue;
    rows.push({ product: product.name, handle: product.handle, variantId: variant.id, sku: variant.sku, label: colour.value });
  }
  return rows;
}

function analyse(rows) {
  const byLabel = new Map();
  for (const row of rows) byLabel.set(row.label, (byLabel.get(row.label) || 0) + 1);
  const groups = new Map();
  for (const label of byLabel.keys()) { const key = orthoKey(label); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(label); }
  const verdict = new Map();
  for (const labels of groups.values()) {
    if (labels.length < 2) continue;
    // Canonical = most used spelling; ties keep the accented/longer form.
    const canonical = [...labels].sort((a, b) => byLabel.get(b) - byLabel.get(a) || b.length - a.length || a.localeCompare(b))[0];
    for (const label of labels) verdict.set(label, { kind: 'ortográfica', canonical, peers: labels.filter(l => l !== label) });
  }
  for (const label of byLabel.keys()) {
    if (verdict.has(label)) continue;
    const key = strip(label);
    const pair = SEMANTIC.find(p => p.includes(key));
    const peers = pair ? [...byLabel.keys()].filter(l => l !== label && pair.includes(strip(l))) : [];
    if (peers.length) verdict.set(label, { kind: 'sentido próximo — revisar', canonical: '', peers });
    else if (/[\/]/.test(label)) verdict.set(label, { kind: 'rótulo composto — revisar', canonical: '', peers: [] });
    else if (TYPO_SUSPECT.includes(key)) verdict.set(label, { kind: 'possível erro de digitação — revisar', canonical: '', peers: [] });
  }
  return { byLabel, verdict };
}

function csvCell(value) { const s = String(value ?? ''); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }

function main() {
  const [auditFile, outFile, liveFile] = process.argv.slice(2);
  if (!auditFile || !outFile) { console.error('Uso: node scripts/relatorio-rotulos-cor.cjs <auditoria.json> <saida.csv> [rotulos-ao-vivo.txt]'); process.exit(2); }
  const audit = JSON.parse(fs.readFileSync(auditFile, 'utf8'));
  const rows = collect(audit);
  const { byLabel, verdict } = analyse(rows);
  const header = ['rotulo_atual', 'tipo_divergencia', 'rotulo_canonico_sugerido', 'rotulos_parecidos', 'produto', 'handle', 'variante_id', 'sku'];
  const lines = [header.join(';')];
  for (const row of rows.sort((a, b) => a.label.localeCompare(b.label) || a.product.localeCompare(b.product) || a.sku.localeCompare(b.sku))) {
    const v = verdict.get(row.label);
    // Linhas já no rótulo canônico não exigem ação.
    if (!v || (v.kind === 'ortográfica' && v.canonical === row.label)) continue;
    lines.push([row.label, v.kind, v.canonical, v.peers.join(' | '), row.product, row.handle, row.variantId, row.sku].map(csvCell).join(';'));
  }
  fs.writeFileSync(outFile, '﻿' + lines.join('\r\n') + '\r\n');
  const live = liveFile ? fs.readFileSync(liveFile, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean) : null;
  const summary = {
    fonte: auditFile, capturadoEm: audit.completedAt || audit.startedAt, variantesComCor: rows.length, rotulosDistintos: byLabel.size,
    linhasNoCsv: lines.length - 1,
    rotulos: [...byLabel].sort((a, b) => a[0].localeCompare(b[0])).map(([label, count]) => ({ label, variantes: count, ...(verdict.get(label) || { kind: 'ok' }) })),
    ...(live ? { aoVivoSemDadoDeSetembro: live.filter(l => !byLabel.has(l)), setembroAusenteAoVivo: [...byLabel.keys()].filter(l => !live.includes(l)) } : {})
  };
  console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) main();
module.exports = { collect, analyse, orthoKey };
