/* QA de acessibilidade local: axe-core (WCAG 2.0/2.1 A+AA) + percurso só com teclado.
   Preview em fixture, loopback, navegação para a loja interceptada.
   Uso: node scripts/qa-a11y.cjs --out <pasta> [--port 8772] [--engines chromium,webkit] */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number((process.argv.find((a, i, all) => all[i - 1] === '--port')) || 8772);
const ORIGIN = 'http://127.0.0.1:' + PORT;
const PAGES = ['index.html', 'sobre.html', 'como-comprar.html', 'trocas.html', 'faq.html', 'privacidade.html', 'termos.html', 'guia-medidas.html', '404.html'];
const VIEWPORTS = [[390, 844], [1280, 720]];
const opt = name => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; };

async function preview() {
  const child = spawn(process.execPath, [path.join(ROOT, 'scripts/preview-server.cjs')], { cwd: ROOT,
    env: { ...process.env, BEDE_PREVIEW_FIXTURE: '1', BEDE_PREVIEW_FRESH_FIXTURE: '1', BEDE_PREVIEW_PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Preview não respondeu')), 15000);
    child.stdout.on('data', d => { if (String(d).includes('PRÉVIA LOCAL')) { clearTimeout(timer); resolve(); } });
  });
  return child;
}

async function guard(context) {
  await context.route('**/*', route => {
    const request = route.request();
    if (!['GET', 'HEAD'].includes(request.method())) return route.abort();
    if (!request.url().startsWith(ORIGIN) && request.isNavigationRequest()) return route.fulfill({ status: 200, contentType: 'text/html', body: 'stub' });
    return route.continue();
  });
}

async function ready(page, home) {
  await page.waitForLoadState('load');
  if (home) await page.waitForFunction(() => document.getElementById('emAltaRail')?.getAttribute('aria-busy') !== 'true', null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(home ? 800 : 200);
}

// Tab pela página inteira: registra cada parada e problemas objetivos.
async function keyboardWalk(page, limit = 80) {
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  const stops = [], issues = [];
  let previous = null, repeats = 0;
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return { body: true };
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      const label = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      const indicator = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none' || /underline/.test(cs.textDecorationLine) || el.matches(':focus-visible') === false;
      const hiddenAncestor = el.closest('[aria-hidden="true"],[inert]');
      return { tag: el.tagName, id: el.id, label, key: el.tagName + '#' + el.id + '|' + label,
        visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && +cs.opacity > 0.05,
        onscreen: r.bottom > 0 && r.right > 0 && r.left < innerWidth && r.top < innerHeight,
        indicator, inHidden: Boolean(hiddenAncestor) };
    });
    if (info.body) { stops.push('(body)'); if (stops.filter(s => s === '(body)').length > 1) break; continue; }
    stops.push(info.label || info.tag);
    if (!info.visible) issues.push('foco em elemento invisível: ' + info.key);
    if (info.inHidden) issues.push('foco dentro de aria-hidden/inert: ' + info.key);
    if (!info.indicator) issues.push('sem indicador de foco visível: ' + info.key);
    repeats = info.key === previous ? repeats + 1 : 0;
    if (repeats >= 2) { issues.push('armadilha: foco preso em ' + info.key); break; }
    previous = info.key;
    if (i > 2 && info.key === stops.__first) break;
    if (i === 0) stops.__first = info.key;
  }
  return { stops: stops.slice(0, 60), issues: [...new Set(issues)] };
}

async function main() {
  const out = path.resolve(opt('--out') || 'qa-a11y');
  const engines = (opt('--engines') || 'chromium,webkit').split(',');
  fs.mkdirSync(out, { recursive: true });
  const pw = require('playwright');
  const { default: AxeBuilder } = require('@axe-core/playwright');
  const server = await preview();
  const report = { generatedAt: new Date().toISOString(), engines: {}, axe: [], keyboard: [], zoom: [], motion: [] };
  try {
    for (const engine of engines) {
      let browser;
      try { browser = await pw[engine].launch(); } catch (error) { report.engines[engine] = 'indisponível: ' + error.message.split('\n')[0]; continue; }
      report.engines[engine] = browser.version();
      for (const [width, height] of VIEWPORTS) {
        const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
        await guard(context);
        const page = await context.newPage();
        for (const name of PAGES) {
          await page.goto(ORIGIN + '/' + name); await ready(page, name === 'index.html');
          const slides = name === 'index.html' ? [0, 1, 4, 7] : [null];
          for (const slide of slides) {
            if (slide !== null) { await page.evaluate(i => window.goToSlide(i, true), slide); await page.waitForTimeout(300); }
            const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
              .exclude('[data-preview-timestamp-qa]').analyze();
            for (const v of result.violations) report.axe.push({ engine, width, page: name + (slide !== null ? '#slide' + slide : ''), id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map(n => ({ target: n.target.join(' '), summary: (n.failureSummary || '').split('\n').slice(0, 2).join(' ') })) });
          }
          await page.goto(ORIGIN + '/' + name); await ready(page, name === 'index.html');
          report.keyboard.push({ engine, width, page: name, ...(await keyboardWalk(page)) });
        }
        await context.close();
      }
      // Zoom 200% de um desktop 1280×720 = viewport CSS 640×360.
      const zoom = await browser.newContext({ viewport: { width: 640, height: 360 }, reducedMotion: 'reduce' });
      await guard(zoom);
      const zp = await zoom.newPage();
      for (const name of PAGES) {
        await zp.goto(ORIGIN + '/' + name); await ready(zp, name === 'index.html');
        report.zoom.push({ engine, page: name, ...(await zp.evaluate(() => {
          const de = document.documentElement;
          const controls = [...document.querySelectorAll('header a, header button, header summary')].filter(e => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0);
          const clipped = controls.filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).map(e => e.getAttribute('aria-label') || e.textContent.trim().slice(0, 20));
          return { overflow: de.scrollWidth > de.clientWidth, headerControls: controls.length, clipped };
        })) });
      }
      await zoom.close();
      // Movimento reduzido: sem autoplay, trilhos sem animação suave, troca de seção imediata.
      for (const reducedMotion of ['reduce', 'no-preference']) {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion });
        await guard(ctx);
        const mp = await ctx.newPage();
        await mp.goto(ORIGIN + '/'); await ready(mp, true);
        const frame0 = await mp.evaluate(() => [...document.querySelectorAll('.hero-frame')].findIndex(f => f.classList.contains('active')));
        await mp.waitForTimeout(8000);
        const frame8 = await mp.evaluate(() => [...document.querySelectorAll('.hero-frame')].findIndex(f => f.classList.contains('active')));
        await mp.evaluate(() => window.goToSlide(1));
        const transition = await mp.evaluate(() => document.getElementById('slidesTrack').style.transition);
        const railBehavior = await mp.evaluate(() => getComputedStyle(document.getElementById('emAltaRail')).scrollBehavior);
        report.motion.push({ engine, reducedMotion, heroAutoplayed: frame0 !== frame8, slideTransition: transition, railScrollBehavior: railBehavior });
        await ctx.close();
      }
      await browser.close();
    }
  } finally { server.kill(); }
  fs.writeFileSync(path.join(out, 'a11y.json'), JSON.stringify(report, null, 2));
  const byRule = {};
  for (const v of report.axe) { const k = v.id + ' (' + v.impact + ')'; (byRule[k] ||= new Set()).add(v.engine + ' ' + v.width + ' ' + v.page); }
  console.log(JSON.stringify({ engines: report.engines, axe: Object.fromEntries(Object.entries(byRule).map(([k, s]) => [k, [...s].slice(0, 12)])),
    keyboardIssues: report.keyboard.filter(k => k.issues.length).map(k => `${k.engine} ${k.width} ${k.page}: ${k.issues.join(' ; ')}`),
    zoom: report.zoom.filter(z => z.overflow || z.clipped.length), motion: report.motion }, null, 2));
}

if (require.main === module) main().catch(error => { console.error(error.stack); process.exitCode = 2; });
