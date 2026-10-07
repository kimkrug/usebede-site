/* QA visual local, reexecutável. Somente loopback + GET; navegação para a loja é interceptada.
   Sobe scripts/preview-server.cjs em modo fixture (selo "SIMULAÇÃO LOCAL" visível) e, para cada
   motor × página × largura: captura, overflow horizontal e erros de console.

   Uso:
     node scripts/qa-visual.cjs --out <pasta>                    # gera capturas + report.json
     node scripts/qa-visual.cjs --out <pasta> --compare <base>   # idem e compara com uma baseline
     node scripts/qa-visual.cjs --out <pasta> --flows            # também roda fluxos de menu/busca
   Opções: --engines chromium,webkit,firefox (padrão: chromium,webkit) · --merge (acumula motores no report.json) · --pages index.html,sobre.html
           --widths 390,1280 · --threshold 0.002 (fração de pixels diferentes tolerada)
   Capturas usam prefers-reduced-motion: reduce para congelar o carrossel do hero. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number((process.argv.find((a, i, all) => all[i - 1] === '--port')) || 8765);
const ORIGIN = 'http://127.0.0.1:' + PORT;
const PAGES = ['index.html', 'sobre.html', 'como-comprar.html', 'trocas.html', 'faq.html', 'privacidade.html', 'termos.html', 'guia-medidas.html', '404.html'];
const WIDTHS = [320, 390, 430, 768, 1280];
const HEIGHT = { 320: 640, 390: 844, 430: 932, 768: 1024, 1280: 720 };
const HOME_SLIDES = [1, 2, 3, 4, 5, 6, 7]; // todas as seções além do hero

function args(argv) {
  const out = { engines: ['chromium', 'webkit'], pages: PAGES, widths: WIDTHS, threshold: 0.002 };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i], value = argv[i + 1];
    if (key === '--out') out.out = path.resolve(value), i++;
    else if (key === '--compare') out.compare = path.resolve(value), i++;
    else if (key === '--engines') out.engines = value.split(','), i++;
    else if (key === '--pages') out.pages = value.split(','), i++;
    else if (key === '--widths') out.widths = value.split(',').map(Number), i++;
    else if (key === '--threshold') out.threshold = Number(value), i++;
    else if (key === '--flows') out.flows = true;
    else if (key === '--merge') out.merge = true;
  }
  if (!out.out) throw new Error('Informe --out <pasta>.');
  return out;
}

async function startPreview() {
  const child = spawn(process.execPath, [path.join(ROOT, 'scripts/preview-server.cjs')], {
    cwd: ROOT, env: { ...process.env, BEDE_PREVIEW_FIXTURE: '1', BEDE_PREVIEW_FRESH_FIXTURE: '1', BEDE_PREVIEW_PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Preview não respondeu (porta 8765 ocupada?)')), 15000);
    child.stdout.on('data', chunk => { if (String(chunk).includes('PRÉVIA LOCAL')) { clearTimeout(timer); resolve(); } });
    child.on('exit', code => { clearTimeout(timer); reject(new Error('Preview saiu com código ' + code)); });
  });
  return child;
}

async function guard(context) {
  // Nada sai do loopback além de GET de imagens/fontes; navegação à loja vira página stub.
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (!['GET', 'HEAD'].includes(request.method())) return route.abort();
    if (url.origin !== ORIGIN && request.isNavigationRequest()) return route.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>stub ' + url.href });
    return route.continue();
  });
}

async function settle(page, isHome) {
  await page.waitForLoadState('load');
  if (isHome) await page.waitForFunction(() => ['emAltaRail', 'tiposRail', 'tabsRail'].every(id => document.getElementById(id)?.getAttribute('aria-busy') !== 'true'), null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => Promise.all([...document.images].filter(img => !img.complete).map(img => new Promise(done => { img.onload = img.onerror = done; setTimeout(done, 8000); }))));
  // No evento load as faces da Montserrat ainda podem estar carregando: sem esperar,
  // a mesma página saía com peso de fonte diferente entre execuções (ruído no WebKit).
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(done => setTimeout(done, 8000))]));
  await page.waitForTimeout(isHome ? 600 : 200);
}

function shotName(engine, page, width, suffix = '') { return `${engine}/${page.replace('.html', '')}${suffix}_${width}.png`; }

async function capture(pw, opts, report) {
  for (const engine of opts.engines) {
    let browser;
    try { browser = await pw[engine].launch(); }
    catch (error) { report.engines[engine] = 'indisponível: ' + error.message.split('\n')[0]; continue; }
    report.engines[engine] = browser.version();
    fs.mkdirSync(path.join(opts.out, engine), { recursive: true });
    for (const width of opts.widths) {
      const context = await browser.newContext({ viewport: { width, height: HEIGHT[width] || 900 }, reducedMotion: 'reduce' });
      await guard(context);
      for (const name of opts.pages) {
        // Uma página nova por captura, fechada em seguida: limita a memória em execuções longas.
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message.slice(0, 160)));
        page.on('console', m => { if (m.type() === 'error' && !/Content Security Policy|favicon/i.test(m.text())) errors.push(m.text().slice(0, 160)); });
        const isHome = name === 'index.html';
        await page.goto(ORIGIN + '/' + name);
        await settle(page, isHome);
        const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
        const shots = [shotName(engine, name, width)];
        await page.screenshot({ path: path.join(opts.out, shots[0]), fullPage: !isHome });
        if (isHome) for (const slide of HOME_SLIDES) {
          await page.evaluate(i => window.goToSlide(i, true), slide);
          await page.waitForTimeout(400);
          const file = shotName(engine, name, width, '-slide' + slide);
          await page.screenshot({ path: path.join(opts.out, file) });
          shots.push(file);
        }
        report.pages.push({ engine, page: name, width, overflow: metrics.scrollWidth > metrics.clientWidth, ...metrics, consoleErrors: [...errors], shots });
        await page.close();
      }
      await context.close();
    }
    if (opts.flows) report.flows[engine] = await flows(browser);
    await browser.close();
  }
}

async function flows(browser) {
  const results = [];
  const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail });
  const guarded = async (label, body) => { try { await body(); } catch (error) { check(label + ': execução', false, error.message.split(/\r?\n/)[0]); } };
  // Menu desktop
  await guarded('desktop/busca', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await guard(context);
    const page = await context.newPage();
    await page.goto(ORIGIN + '/'); await settle(page, true);
    const details = page.locator('#mainNav details[data-product-menu]');
    await details.locator('summary').hover(); await page.waitForTimeout(300);
    check('desktop: hover abre Produtos', await details.evaluate(d => d.open));
    const link = await details.locator('a').first().boundingBox();
    await page.mouse.move(link.x + 10, link.y + link.height / 2, { steps: 8 }); await page.waitForTimeout(200);
    check('desktop: continua aberto até o link', await details.evaluate(d => d.open));
    await page.mouse.move(700, 600, { steps: 5 }); await page.waitForTimeout(500);
    check('desktop: fecha ao sair', !(await details.evaluate(d => d.open)));
    await details.locator('summary').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    check('desktop: Enter abre', await details.evaluate(d => d.open));
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    check('desktop: Escape fecha e devolve foco', !(await details.evaluate(d => d.open)) && await page.evaluate(() => document.activeElement.tagName === 'SUMMARY'));
    // Busca
    await page.locator('#homeSearchTrigger').click(); await page.waitForTimeout(150);
    check('busca: abre com foco no campo', await page.evaluate(() => document.activeElement.id === 'homeSearchInput'));
    await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    check('busca: vazio não navega', page.url().startsWith(ORIGIN));
    await page.locator('#homeSearchInput').fill('  sandália & 37/38 ');
    const [request] = await Promise.all([page.waitForRequest(r => r.isNavigationRequest() && r.url().includes('/search/')), page.keyboard.press('Enter')]);
    check('busca: termo chega intacto', request.url() === 'https://loja.usebede.com.br/search/?q=sand%C3%A1lia+%26+37%2F38', request.url());
    await page.goto(ORIGIN + '/'); await settle(page, true);
    await page.locator('#homeSearchTrigger').click(); await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    check('busca: Escape fecha e devolve foco', await page.evaluate(() => document.getElementById('homeSearchPanel').hidden && document.activeElement.id === 'homeSearchTrigger'));
    await context.close();
  });
  // Gaveta móvel
  await guarded('gaveta', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: browser.browserType().name() !== 'firefox' });
    await guard(context);
    const page = await context.newPage();
    await page.goto(ORIGIN + '/'); await settle(page, true);
    const state = () => page.evaluate(() => ({ open: document.getElementById('mobileDrawer').classList.contains('open'), focus: document.activeElement.id || document.activeElement.className, inside: !!document.activeElement.closest('#mobileDrawer') }));
    await page.locator('#mobileMenuBtn').click(); await page.waitForTimeout(400);
    let s = await state();
    check('gaveta: abre com foco dentro', s.open && s.inside, JSON.stringify(s));
    let trapped = true;
    for (let i = 0; i < 10; i++) { await page.keyboard.press('Tab'); if (!(await state()).inside) trapped = false; }
    check('gaveta: Tab preso dentro', trapped);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    s = await state();
    check('gaveta: Escape fecha e devolve foco ao botão', !s.open && s.focus === 'mobileMenuBtn', JSON.stringify(s));
    await page.locator('#mobileMenuBtn').click(); await page.waitForTimeout(400);
    await page.mouse.click(385, 500); await page.waitForTimeout(400);
    s = await state();
    check('gaveta: toque fora fecha e devolve foco', !s.open && s.focus === 'mobileMenuBtn', JSON.stringify(s));
    await page.locator('#mobileMenuBtn').click(); await page.waitForTimeout(400);
    await page.locator('#mobileDrawer a[data-home-offers]').click(); await page.waitForTimeout(800);
    check('gaveta: Liquidação fecha e vai ao slide 5', await page.evaluate(() => !document.getElementById('mobileDrawer').classList.contains('open') && document.querySelectorAll('.s-dot')[4].classList.contains('active')));
    await context.close();
  });
  // Gaveta institucional
  await guarded('institucional', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await guard(context);
    const page = await context.newPage();
    await page.goto(ORIGIN + '/trocas.html'); await settle(page, false);
    await page.locator('#mobileMenuBtn').click(); await page.waitForTimeout(400);
    check('institucional: abre com foco no fechar', await page.evaluate(() => document.activeElement.classList.contains('mob-drawer-close')));
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    check('institucional: Escape devolve foco', await page.evaluate(() => document.activeElement.id === 'mobileMenuBtn'));
    await context.close();
  });
  return results;
}

async function compare(opts, report) {
  const sharp = require('sharp');
  for (const entry of report.pages) for (const shot of entry.shots) {
    const base = path.join(opts.compare, shot), current = path.join(opts.out, shot);
    if (!fs.existsSync(base)) { report.diffs.push({ shot, status: 'sem baseline' }); continue; }
    const [a, b] = await Promise.all([base, current].map(file => sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
    if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
      report.diffs.push({ shot, status: 'tamanho diferente', base: [a.info.width, a.info.height], atual: [b.info.width, b.info.height] }); continue;
    }
    let changed = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > 48) changed++;
    }
    const ratio = changed / (a.info.width * a.info.height);
    report.diffs.push({ shot, status: ratio > opts.threshold ? 'DIFERENTE' : 'igual', changedPixels: changed, ratio: Number(ratio.toFixed(5)) });
  }
}

async function main() {
  const opts = args(process.argv.slice(2));
  const pw = require('playwright');
  fs.mkdirSync(opts.out, { recursive: true });
  const report = { generatedAt: new Date().toISOString(), note: 'Viewport emulado; WebKit do Playwright não é Safari/iPhone real. Fixture com selo de simulação.', engines: {}, pages: [], flows: {}, diffs: [] };
  const preview = await startPreview();
  try {
    await capture(pw, opts, report);
    if (opts.compare) await compare(opts, report);
  } finally { preview.kill(); }
  // --merge: um motor por vez (menos memória) sem apagar o relatório dos motores anteriores.
  const reportPath = path.join(opts.out, 'report.json');
  if (opts.merge && fs.existsSync(reportPath)) {
    const previous = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const ran = new Set(Object.keys(report.engines));
    for (const [engine, version] of Object.entries(previous.engines || {})) if (!ran.has(engine)) report.engines[engine] = version;
    report.pages = [...(previous.pages || []).filter(p => !ran.has(p.engine)), ...report.pages];
    for (const [engine, list] of Object.entries(previous.flows || {})) if (!ran.has(engine)) report.flows[engine] = list;
    report.diffs = [...(previous.diffs || []).filter(d => !ran.has(d.shot.split('/')[0])), ...report.diffs];
  }
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const overflow = report.pages.filter(p => p.overflow), errors = report.pages.filter(p => p.consoleErrors.length);
  const flowFails = Object.entries(report.flows).flatMap(([engine, list]) => list.filter(f => !f.ok).map(f => engine + ': ' + f.name + ' ' + f.detail));
  const diffs = report.diffs.filter(d => d.status !== 'igual');
  console.log(JSON.stringify({ engines: report.engines, combinations: report.pages.length, overflow: overflow.map(p => `${p.engine} ${p.page} ${p.width}`), consoleErrors: errors.map(p => `${p.engine} ${p.page} ${p.width}: ${p.consoleErrors[0]}`), flows: Object.fromEntries(Object.entries(report.flows).map(([e, l]) => [e, `${l.filter(f => f.ok).length}/${l.length}`])), flowFails, diffs: opts.compare ? diffs : undefined }, null, 2));
  if (overflow.length || errors.length || flowFails.length || diffs.length) process.exitCode = 1;
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 2; });
module.exports = { PAGES, WIDTHS };
