/* QA local da camada da loja: páginas públicas SALVAS (scripts/salvar-loja-publica.cjs) servidas com os
   complementos store-*.js. Sem JS nativo da Nuvemshop, formulários e compra bloqueados, loopback 8767.
   O store-color-gallery.js servido é o da RELEASE (padrão release/layout-2026-10-07-r2), não o da branch.
   Uso: node scripts/qa-loja.cjs --out <pasta> --engine chromium [--snapshots ../outputs/store-preview-r3] [--gallery-ref <ref>] [--modules-ref origin/main]
   Mede: overflow e erros por largura, axe WCAG 2.1 AA, percurso de teclado e checagens de D06. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { clean, FIXTURE_JS } = require('./preview-store-integrated.cjs');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'http://127.0.0.1:8767';
const opt = (name, fallback) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : fallback; };
const SNAP = path.resolve(opt('--snapshots', path.join(ROOT, '../outputs/store-preview-r3')));
const EXTRA = { 'pdp-multicor-regra-paris.html': path.join(ROOT, '../outputs/fotos-padrao-etapa2/qa-paris-prata/pos-remocao-duas-antigas-paris-2026-09-06.html') };
const MODULES = ['config_loja.js', 'catalog-model.js', 'store-product-ui.js', 'store-filter-bar.js', 'store-color-gallery.js', 'store-enhancements.js'];
const WIDTHS = [[320, 640], [390, 844], [430, 932], [768, 1024], [1280, 720]];
const START = "function startLocal(){for(const name of ['BedeProductUI','BedeNativeFilters','BedeColorGallery']){try{window[name]?.start();}catch(e){qaLog(name+': '+e.message);}}}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startLocal,{once:true});else startLocal();";

// modulesRef: servir todos os complementos de um commit (ex.: origin/main = produção) em vez da pasta.
function moduleSource(name, galleryRef, modulesRef) {
  const ref = name === 'store-color-gallery.js' ? galleryRef : modulesRef;
  const source = ref
    ? execFileSync('git', ['show', ref + ':' + name], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 << 20 })
    : fs.readFileSync(path.join(ROOT, name), 'utf8');
  return source.replace(/https:\/\/loja\.usebede\.com\.br/g, ORIGIN).replace(/https:\/\/www\.usebede\.com\.br/g, ORIGIN);
}

function pages() {
  const list = fs.readdirSync(SNAP).filter(f => f.endsWith('.html')).sort();
  return [...list.map(f => [f, path.join(SNAP, f)]), ...Object.entries(EXTRA).filter(([, file]) => fs.existsSync(file))];
}

function server(galleryRef, modulesRef = null) {
  const files = new Map(pages());
  const srv = http.createServer((req, res) => {
    if (req.headers.host !== '127.0.0.1:8767' || req.method !== 'GET') { res.writeHead(403); return res.end('Somente GET local'); }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://*.mitiendanube.com https://fonts.googleapis.com; img-src 'self' data: https://*.mitiendanube.com https://www.usebede.com.br; font-src 'self' data: https://*.mitiendanube.com https://fonts.gstatic.com; connect-src 'self'; form-action 'none'; object-src 'none'; base-uri 'none'");
    const url = new URL(req.url, ORIGIN);
    const name = url.pathname.slice(1);
    if (name === 'qa-fixture.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(FIXTURE_JS); }
    if (name === 'qa-start.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(START); }
    if (MODULES.includes(name)) { res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); return res.end(moduleSource(name, galleryRef, modulesRef)); }
    if (files.has(name)) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(clean(fs.readFileSync(files.get(name), 'utf8'))); }
    // Prévia de tamanhos dos cards: responde com a PDP salva quando existir; senão 404 (estado de erro honesto).
    const product = /^produtos\/([^/]+)\/$/.exec(name);
    const saved = product && [...files.keys()].find(f => f.endsWith('-' + product[1] + '.html'));
    if (saved) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(fs.readFileSync(files.get(saved), 'utf8')); }
    res.writeHead(404); res.end('Sem fixture');
  });
  return new Promise(resolve => srv.listen(8767, '127.0.0.1', () => resolve(srv)));
}

// Checagens objetivas de D06 nos elementos dos complementos.
const D06 = () => {
  const issues = [], facts = {};
  const box = el => el.getBoundingClientRect();
  const cards = [...document.querySelectorAll('.js-item-product')].filter(c => box(c).width > 0);
  facts.cards = cards.length;
  for (const card of cards.slice(0, 12)) {
    const image = card.querySelector('.item-image, .js-product-item-image-link-private, a img')?.closest('div,a') || card;
    const img = card.querySelector('img');
    // Só conta o que está visível: a camada de hover do desktop fica com opacidade 0 até o mouse passar.
    const info = [...card.querySelectorAll('.item-description, .bede-card-overlay, .item-name')].find(el => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05 && el.getBoundingClientRect().height > 0; });
    if (img && info && innerWidth <= 1024) { const a = box(img), b = box(info); if (b.top < a.bottom - 2 && b.bottom > a.top + 2 && b.left < a.right && b.right > a.left) issues.push('texto sobre a foto no card: ' + (info.textContent || '').trim().slice(0, 30)); }
    if (img && getComputedStyle(img).objectFit === 'cover') issues.push('foto recortada (cover) no card');
  }
  const preview = [...document.querySelectorAll('.bede-card-preview')].map(p => p.textContent.replace(/\s+/g, ' ').trim());
  for (const text of preview) {
    for (const group of text.split(/(?:[A-ZÀ-Úa-zà-ú][A-Za-zÀ-ú ]+:)/).filter(Boolean)) {
      const sizes = (group.match(/\b(3[3-9]|4[0-4])\b/g) || []).map(Number);
      if (sizes.some((v, i) => i && v < sizes[i - 1])) issues.push('tamanhos fora de ordem na prévia: ' + group.trim().slice(0, 40));
    }
  }
  facts.previews = preview.length;
  const sizeButtons = [...document.querySelectorAll('.js-product-variants-group[data-variation-id] a.js-insta-variant')].map(a => a.getAttribute('data-option'));
  const numeric = sizeButtons.filter(v => /^\d+$/.test(v || '')).map(Number);
  if (numeric.some((v, i) => i && v < numeric[i - 1])) issues.push('tamanhos da PDP fora de ordem: ' + numeric.join(','));
  const colourButtons = [...document.querySelectorAll('.bede-color-name, .bede-colors-gallery-nav button')];
  facts.colourControls = colourButtons.length;
  for (const b of colourButtons) if (!b.textContent.trim()) issues.push('cor sem nome escrito');
  for (const b of document.querySelectorAll('.js-addtocart, .js-prod-submit-form, .bede-card-overlay-cta')) {
    // Cards de carrossel ficam parcialmente fora da tela de propósito.
    if (b.closest('.swiper-container, .js-swiper-related, [class*="swiper"]')) continue;
    const r = box(b);
    if (r.width && (r.right > innerWidth + 1 || r.left < -1)) issues.push('CTA cortado: ' + (b.value || b.textContent).trim().slice(0, 20));
  }
  return { issues: [...new Set(issues)], facts };
};

async function main() {
  const out = path.resolve(opt('--out', 'qa-loja'));
  const engine = opt('--engine', 'chromium');
  const galleryRef = opt('--gallery-ref', 'release/layout-2026-10-07-r2');
  fs.mkdirSync(path.join(out, engine), { recursive: true });
  const pw = require('playwright');
  const { default: AxeBuilder } = require('@axe-core/playwright');
  const modulesRef = opt('--modules-ref', null);
  const srv = await server(galleryRef, modulesRef);
  const browser = await pw[engine].launch();
  const report = { generatedAt: new Date().toISOString(), engine: browser.version(), galleryRef, snapshots: SNAP, pages: [] };
  try {
    for (const [name] of pages()) {
      for (const [width, height] of WIDTHS) {
        const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
        await context.route('**/*', route => {
          const request = route.request();
          if (!['GET', 'HEAD'].includes(request.method())) return route.abort();
          if (!request.url().startsWith(ORIGIN) && request.isNavigationRequest()) return route.fulfill({ status: 200, body: 'stub' });
          return route.continue();
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message.slice(0, 150)));
        page.on('console', m => { if (m.type() === 'error' && !/Content Security Policy|Failed to load resource/i.test(m.text())) errors.push(m.text().slice(0, 150)); });
        await page.goto(ORIGIN + '/' + name, { waitUntil: 'load' });
        await page.waitForTimeout(1500);
        await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 5000))]));
        const row = { page: name, width, ...(await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }))), d06: await page.evaluate(D06), errors: [...errors] };
        if (width === 390 || width === 768 || width === 1280) {
          await page.screenshot({ path: path.join(out, engine, name.replace('.html', '') + '_' + width + '.png') });
          const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('.qa-integrated-notice').analyze();
          // Só o que os complementos BEDÊ produzem é corrigível aqui; o resto é do tema nativo.
          row.axe = axe.violations.map(v => ({ id: v.id, impact: v.impact, ours: v.nodes.filter(n => /bede/.test(n.html + n.target.join(' '))).map(n => n.target.join(' ')).slice(0, 5), theme: v.nodes.filter(n => !/bede/.test(n.html + n.target.join(' '))).length }));
          await page.evaluate(() => document.activeElement?.blur());
          const stops = [];
          for (let i = 0; i < 60; i++) {
            await page.keyboard.press('Tab');
            const s = await page.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return null; const r = a.getBoundingClientRect(), cs = getComputedStyle(a); return { ours: [...a.classList].some(c => c.startsWith('bede')) || !!a.closest('.bede-color-gallery, .bede-colors-gallery-nav, .bede-card-overlay, .bede-product-help, .bede-shipping-progress, [class*="bede-filter"], [class*="bede-card-preview"]'), label: (a.getAttribute('aria-label') || a.textContent || a.value || a.tagName).replace(/\s+/g, ' ').trim().slice(0, 30) + ' <' + a.tagName.toLowerCase() + '.' + [...a.classList].slice(0, 3).join('.') + '>', visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden', hidden: !!a.closest('[aria-hidden="true"],[inert]'), ring: cs.outlineStyle !== 'none' || cs.boxShadow !== 'none' }; });
            if (s) stops.push(s);
          }
          // 'ours' = controle criado pelos complementos BEDÊ; o resto (mesmo dentro de contêiner marcado) é do tema nativo.
          const tag = s => (!s.visible ? 'invisível' : s.hidden ? 'em aria-hidden' : 'sem anel de foco') + ': ' + s.label;
          const bad = s => !s.visible || s.hidden || !s.ring;
          row.keyboard = { stops: stops.length, ourStops: stops.filter(s => s.ours).length, issues: [...new Set(stops.filter(s => s.ours && bad(s)).map(tag))], theme: [...new Set(stops.filter(s => !s.ours && bad(s)).map(tag))] };
        }
        report.pages.push(row);
        await context.close();
      }
    }
  } finally { await browser.close(); srv.close(); }
  fs.writeFileSync(path.join(out, engine, 'report.json'), JSON.stringify(report, null, 2));
  const flagged = report.pages.filter(p => p.overflow || p.errors.length || p.d06.issues.length || (p.axe || []).some(v => v.ours.length) || (p.keyboard?.issues.length));
  console.log(JSON.stringify({ engine: report.engine, combinations: report.pages.length, overflow: report.pages.filter(p => p.overflow).map(p => p.page + ' ' + p.width),
    errors: report.pages.filter(p => p.errors.length).map(p => p.page + ' ' + p.width + ': ' + p.errors[0]),
    d06: report.pages.filter(p => p.d06.issues.length).map(p => p.page + ' ' + p.width + ': ' + p.d06.issues.join(' | ')),
    axeOurs: report.pages.flatMap(p => (p.axe || []).filter(v => v.ours.length).map(v => p.page + ' ' + p.width + ' ' + v.id + ' ' + v.ours.join(', '))),
    axeThemeRules: [...new Set(report.pages.flatMap(p => (p.axe || []).filter(v => v.theme).map(v => v.id)))],
    keyboard: report.pages.filter(p => p.keyboard?.issues.length).map(p => p.page + ' ' + p.width + ': ' + p.keyboard.issues.join(' | ')) }, null, 2));
  if (flagged.length) process.exitCode = 1;
}

module.exports = { server, pages, ORIGIN };
if (require.main === module) main().catch(error => { console.error(error.stack); process.exitCode = 2; });
