/* QA de resiliência do catálogo da home no navegador. Local, loopback, sem tráfego para a loja.
   Para cada cenário sobe scripts/preview-server.cjs com fixture + falha simulada e observa os
   trilhos da home aos 2 s e no estado final.
   Uso: node scripts/qa-resiliencia.cjs --out <pasta> [--engine chromium] [--only http-429,hang] */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number((process.argv.find((a, i, all) => all[i - 1] === '--port')) || 8765);
const ORIGIN = 'http://127.0.0.1:' + PORT;
// expect: 'error' (mensagem + tentar novamente, nenhum card) ou 'ready' (cards da fixture).
const SCENARIOS = [
  { name: 'ok', env: {}, expect: 'ready', wait: 6000 },
  { name: 'lenta-9s', env: { BEDE_PREVIEW_FIXTURE_DELAY_MS: '9000' }, expect: 'ready', wait: 14000, loadingAt2s: true },
  { name: 'sem-resposta', env: { BEDE_PREVIEW_FAULT: 'hang' }, expect: 'error', wait: 24000, loadingAt2s: true },
  { name: 'http-429', env: { BEDE_PREVIEW_FAULT: 'http-429' }, expect: 'error', wait: 5000 },
  { name: 'http-500', env: { BEDE_PREVIEW_FAULT: 'http-500' }, expect: 'error', wait: 5000 },
  { name: 'http-503', env: { BEDE_PREVIEW_FAULT: 'http-503' }, expect: 'error', wait: 5000 },
  { name: 'json-truncado', env: { BEDE_PREVIEW_FAULT: 'truncated' }, expect: 'error', wait: 5000 },
  { name: 'products-nulo', env: { BEDE_PREVIEW_FAULT: 'null-products' }, expect: 'error', wait: 5000 },
  { name: 'produto-duplicado', env: { BEDE_PREVIEW_FAULT: 'duplicate' }, expect: 'error', wait: 5000 },
  { name: 'resposta-antiga', env: { BEDE_PREVIEW_FAULT: 'stale' }, expect: 'error', wait: 5000 }
];

function parse(argv) {
  const out = { engine: 'chromium' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') out.out = path.resolve(argv[++i]);
    else if (argv[i] === '--engine') out.engine = argv[++i];
    else if (argv[i] === '--only') out.only = argv[++i].split(',');
  }
  if (!out.out) throw new Error('Informe --out <pasta>.');
  return out;
}

async function preview(env) {
  const child = spawn(process.execPath, [path.join(ROOT, 'scripts/preview-server.cjs')], {
    cwd: ROOT, env: { ...process.env, BEDE_PREVIEW_FIXTURE: '1', BEDE_PREVIEW_FRESH_FIXTURE: '1', BEDE_PREVIEW_PORT: String(PORT), ...env }, stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Preview não respondeu')), 15000);
    child.stdout.on('data', chunk => { if (String(chunk).includes('PRÉVIA LOCAL')) { clearTimeout(timer); resolve(); } });
    child.on('exit', code => { clearTimeout(timer); reject(new Error('Preview saiu: ' + code)); });
  });
  return child;
}

const railState = page => page.evaluate(() => ['emAltaRail', 'tiposRail', 'tabsRail'].map(id => {
  const rail = document.getElementById(id);
  return { id, busy: rail.getAttribute('aria-busy'), state: rail.getAttribute('data-catalog-state'), cards: rail.querySelectorAll('.nb-card').length,
    skeletons: rail.querySelectorAll('.home-catalog-skeleton').length, retry: Boolean(rail.querySelector('.home-catalog-retry')),
    storeExit: Boolean(rail.querySelector('a[href^="https://loja.usebede.com.br/"]')), text: rail.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) };
}));

async function main() {
  const opts = parse(process.argv.slice(2));
  const pw = require('playwright');
  fs.mkdirSync(opts.out, { recursive: true });
  const results = [];
  for (const scenario of SCENARIOS.filter(s => !opts.only || opts.only.includes(s.name))) {
    const server = await preview(scenario.env);
    const browser = await pw[opts.engine].launch();
    try {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      await context.route('**/*', route => route.request().method() === 'GET' || route.request().method() === 'HEAD' ? route.continue() : route.abort());
      const page = await context.newPage();
      await page.goto(ORIGIN + '/');
      await page.evaluate(() => window.goToSlide(1, true));
      await page.waitForTimeout(2000);
      const at2s = await railState(page);
      await page.waitForTimeout(scenario.wait - 2000);
      const final = await railState(page);
      await page.screenshot({ path: path.join(opts.out, scenario.name + '_390.png') });
      const em = final[0];
      const honestError = final.every(r => r.cards === 0) && em.retry && em.storeExit && /Não foi possível/.test(em.text);
      const ready = final.every(r => r.cards > 0 || /Nenhum modelo/.test(r.text));
      const loadingOk = !scenario.loadingAt2s || (at2s[0].skeletons > 0 && at2s[0].cards === 0);
      const pass = loadingOk && (scenario.expect === 'error' ? honestError : ready);
      results.push({ scenario: scenario.name, expect: scenario.expect, pass, at2s: at2s[0], final });
      await context.close();
    } finally { await browser.close(); server.kill(); }
  }
  fs.writeFileSync(path.join(opts.out, 'resiliencia.json'), JSON.stringify({ generatedAt: new Date().toISOString(), engine: opts.engine, results }, null, 2));
  for (const r of results) console.log(`${r.pass ? 'OK ' : 'FALHA'} ${r.scenario.padEnd(18)} esperado=${r.expect} final="${r.final[0].text}"`);
  if (results.some(r => !r.pass)) process.exitCode = 1;
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 2; });
