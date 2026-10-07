/* Produção ainda é o commit esperado? Somente GET público em www.usebede.com.br; compara o SHA-256
   (quebras de linha normalizadas, mesmo método do auditar-publico.cjs do handoff) com o arquivo
   no commit Git indicado. Não acessa sessão, carrinho, admin nem API de escrita.
   Uso: node scripts/auditar-producao.cjs [ref=origin/main] [--out arquivo.json] */
'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ORIGIN = 'https://www.usebede.com.br/';
// Os 18 estáticos da auditoria de 07/10 + extras carregados pela home/loja.
const STATIC = ['index.html', 'style.css', 'home-app.js', 'home-ui.js', 'store-enhancements.js', 'store-product-ui.js', 'store-filter-bar.js',
  'store-color-gallery.js', 'config_loja.js', 'catalog-model.js', 'institutional-ui.js', 'sobre.html', 'como-comprar.html', 'trocas.html',
  'faq.html', 'privacidade.html', 'termos.html', 'guia-medidas.html'];
const EXTRA = ['links_loja.js', 'store-color-gallery.js?v=20260906_ui1'];
const STATUS_ONLY = ['robots.txt', 'sitemap.xml', 'pagina-que-nao-existe-qa'];
const hash = text => crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');

function gitFile(ref, file) {
  try { return execFileSync('git', ['show', ref + ':' + file], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }); }
  catch (_) { return null; }
}

async function main() {
  const ref = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'origin/main';
  const outIndex = process.argv.indexOf('--out');
  const commit = execFileSync('git', ['rev-parse', ref], { encoding: 'utf8' }).trim();
  const rows = [];
  for (const route of [...STATIC, ...EXTRA, ...STATUS_ONLY]) {
    const url = ORIGIN + route;
    try {
      const response = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(30000) });
      const body = await response.text();
      const row = { route, status: response.status, cacheControl: response.headers.get('cache-control') };
      if (!STATUS_ONLY.includes(route)) {
        const expected = gitFile(ref, route.split('?')[0]);
        row.sha256LF = hash(body);
        row.expectedSha256LF = expected === null ? null : hash(expected);
        row.matches = expected !== null && row.sha256LF === row.expectedSha256LF;
      }
      if (route.startsWith('store-color-gallery.js')) row.bagRules = ['364500953', '364501049', '364500285', '363507514'].filter(id => body.includes(id)).length;
      rows.push(row);
    } catch (error) { rows.push({ route, error: error.message }); }
  }
  const compared = rows.filter(r => 'matches' in r);
  const result = { observedAt: new Date().toISOString(), ref, commit, scope: 'Somente GET público; não homologa compra, saldo, admin, pagamento ou ERP.',
    summary: { compared: compared.length, matching: compared.filter(r => r.matches).length, diverging: compared.filter(r => !r.matches).map(r => r.route) }, rows };
  if (outIndex > -1) fs.writeFileSync(process.argv[outIndex + 1], JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result.summary, null, 2));
  for (const r of rows) console.log((r.matches === undefined ? '      ' : r.matches ? 'IGUAL ' : 'DIFERE') + ' ' + String(r.status).padEnd(4) + r.route + (r.bagRules !== undefined ? ' (regras de bolsas: ' + r.bagRules + ')' : '') + (r.error ? ' ERRO ' + r.error : ''));
  if (compared.some(r => !r.matches)) process.exitCode = 1;
}

main().catch(error => { console.error(error.message); process.exitCode = 2; });
