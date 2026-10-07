/* Medição de laboratório da home (mesmo método do B32): preview em fixture, cache desligado.
   Perfis: celular 390×844 com 4G lento (1,6 Mbps, 150 ms) + CPU 4×; desktop 1280×720 sem limite.
   Mediana de N rodadas. Só Chromium (CDP). Uso: node scripts/qa-perf.cjs [--runs 3] [--port 8774] */
'use strict';
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const opt = (name, fallback) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : fallback; };
const PORT = Number(opt('--port', 8774)), RUNS = Number(opt('--runs', 3));
const ORIGIN = 'http://127.0.0.1:' + PORT;
const PROFILES = [
  { name: 'celular-4g-lento', width: 390, height: 844, net: { latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 }, cpu: 4 },
  { name: 'desktop', width: 1280, height: 720, net: null, cpu: 1 }
];

async function preview() {
  const child = spawn(process.execPath, [path.join(ROOT, 'scripts/preview-server.cjs')], { cwd: ROOT,
    env: { ...process.env, BEDE_PREVIEW_FIXTURE: '1', BEDE_PREVIEW_FRESH_FIXTURE: '1', BEDE_PREVIEW_PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise(resolve => child.stdout.on('data', d => { if (String(d).includes('PRÉVIA LOCAL')) resolve(); }));
  return child;
}

async function measure(browser, profile) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', profile.net ? { offline: false, ...profile.net } : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
  await page.addInitScript(() => {
    window.__lcp = 0; window.__cls = 0;
    new PerformanceObserver(list => { for (const e of list.getEntries()) { window.__lcp = e.startTime; window.__lcpEl = e.element ? (e.element.tagName + '.' + e.element.className).slice(0, 50) : (e.url || '').split('/').pop(); } }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(ORIGIN + '/', { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(4000);
  const result = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0], res = performance.getEntriesByType('resource');
    const size = e => e.transferSize || e.encodedBodySize || 0;
    const heroImage = res.find(e => /hero_mulher_(mobile|desktop)\.webp/.test(e.name));
    const font = res.filter(e => /fonts\.gstatic/.test(e.name)).sort((a, b) => a.responseEnd - b.responseEnd)[0];
    return { lcp: Math.round(window.__lcp), lcpEl: window.__lcpEl, cls: Number(window.__cls.toFixed(3)),
      fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0), load: Math.round(nav.loadEventEnd),
      kb: Math.round((res.reduce((a, e) => a + size(e), 0) + size(nav)) / 1024), requests: res.length,
      heroImageDone: heroImage ? Math.round(heroImage.responseEnd) : null, firstFontDone: font ? Math.round(font.responseEnd) : null,
      top: res.sort((a, b) => size(b) - size(a)).slice(0, 6).map(e => e.name.split('/').pop().slice(0, 42) + ':' + Math.round(size(e) / 1024) + 'KB') };
  });
  await context.close();
  return result;
}

const median = values => { const s = values.filter(v => v !== null).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

async function main() {
  const pw = require('playwright');
  const server = await preview();
  const browser = await pw.chromium.launch();
  const summary = {};
  try {
    for (const profile of PROFILES) {
      const runs = [];
      for (let i = 0; i < RUNS; i++) runs.push(await measure(browser, profile));
      summary[profile.name] = { runs: RUNS, ...Object.fromEntries(['lcp', 'cls', 'fcp', 'load', 'kb', 'requests', 'heroImageDone', 'firstFontDone'].map(k => [k, median(runs.map(r => r[k]))])), lcpEl: runs[0].lcpEl, top: runs[0].top };
    }
  } finally { await browser.close(); server.kill(); }
  console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) main().catch(error => { console.error(error.stack); process.exitCode = 2; });
