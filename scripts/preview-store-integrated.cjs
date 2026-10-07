/* Local fixture QA only. No live native JS, account, checkout or store writes. */
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const ROOT = path.resolve(__dirname, '..');
const WORKSPACE = path.dirname(ROOT);
const ORIGIN = 'http://127.0.0.1:8767';
const SOURCES = {
  listing: path.join(WORKSPACE, 'outputs/store-preview-local/listing.html'),
  paris: path.join(WORKSPACE, 'outputs/fotos-padrao-etapa2/qa-paris-prata/pos-remocao-duas-antigas-paris-2026-09-06.html'),
  martta: path.join(WORKSPACE, 'outputs/store-preview-local/scarpin-martta.html'),
  marttaMedio: path.join(WORKSPACE, 'outputs/store-preview-local/scarpin-martta-medio.html')
};
const MODULES = ['config_loja.js', 'catalog-model.js', 'store-product-ui.js', 'store-filter-bar.js', 'store-color-gallery.js', 'store-enhancements.js'];
const NOTICE = 'QA LOCAL · SNAPSHOTS · SEM PEDIDOS · Eventos nativos simulados apenas para conferir layout. Não homologa filtros, estoque ou checkout reais.';
const QA_CART_COUNTS = new Set(['0', '1', '12', '999']);
function cartCount(value) { return QA_CART_COUNTS.has(value) ? value : null; }

function clean(html, requestedCartCount = null) {
  const count = cartCount(requestedCartCount);
  // Change only the badge's text in the served copy; keep all attributes and saved sources intact.
  if (count !== null) html = html.replace(/<span\b([^>]*)>([^<]*)<\/span\s*>/gi, (whole, attrs) => {
    const classAttribute = Array.from(attrs.matchAll(/([^\s=]+)\s*=\s*(["'])(.*?)\2/g))
      .find(attribute => attribute[1].toLowerCase() === 'class');
    const classes = classAttribute?.[3].split(/\s+/) || [];
    return classes.includes('js-cart-widget-amount') && classes.includes('badge')
      ? whole.replace(/>[^<]*</, '>' + count + '<') : whole;
  });
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/<base\b[^>]*>/gi, '')
    .replace(/<(?:iframe|object)\b[^>]*>[\s\S]*?<\/(?:iframe|object)\s*>/gi, '')
    .replace(/([\s"'(=])\/\/(?=[a-z0-9.-])/gi, '$1https://')
    .replace(/(<link\b[^>]*rel=["']stylesheet["'][^>]*?)media=["']print["']/gi, '$1media="all"')
    .replace(/https:\/\/loja\.usebede\.com\.br/g, ORIGIN)
    .replace(/<form\b([^>]*)>/gi, (_, attrs) => '<form' + attrs.replace(/\s(?:action|method)\s*=\s*(?:"[^"]*"|'[^']*')/gi, '') + ' action="/blocked" method="post">');
  return html.replace(/<title>[\s\S]*?<\/title>/i, '<title>QA LOCAL — BEDÊ — fixture sem operações</title>')
    .replace(/<\/head>/i, '<style>.qa-integrated-notice{position:relative;z-index:99999;padding:9px 12px;background:#fff7dc;color:#000;font:11px/1.45 sans-serif;text-align:center}.qa-fixture-log{font:11px/1.5 monospace;color:#333}.js-swiper-product{overflow:hidden}.js-swiper-product.qa-fixture-swiper .swiper-wrapper{display:block;transform:none!important}.js-swiper-product.qa-fixture-swiper .js-product-slide:not(.swiper-slide-active){display:none!important}.visible-when-content-ready{visibility:visible!important}.display-when-content-ready{display:block}</style></head>')
    .replace(/<body([^>]*)>/i, '<body$1><div class="qa-integrated-notice">' + NOTICE + (count !== null ? '<div><strong>SIMULAÇÃO contador ' + count + '</strong></div>' : '') + '<div class="qa-fixture-log" id="qa-fixture-log" role="status">Nenhuma ação simulada.</div></div>')
    .replace(/<\/body>/i, '<script src="/qa-fixture.js"></script>' + MODULES.map(name => '<script src="/' + name + '"></script>').join('') + '<script src="/qa-start.js"></script></body>');
}

const FIXTURE_JS = `
'use strict';
window.__BEDE_LOCAL_FIXTURE__ = true;
window.LS = { ready: { then: callback => Promise.resolve().then(callback) } };
function qaLog(text) { const node = document.getElementById('qa-fixture-log'); if(node)node.textContent='SIMULAÇÃO LOCAL: '+text; }
document.addEventListener('submit', event => { event.preventDefault(); event.stopImmediatePropagation(); qaLog('envio de formulário bloqueado'); }, true);
document.addEventListener('click', event => {
  if(event.target.closest('.js-prod-submit-form,.js-addtocart,.js-cart-checkout,input[name="go_to_checkout"]')){event.preventDefault();event.stopImmediatePropagation();qaLog('compra bloqueada');return;}
  const anchor=event.target.closest('a');if(anchor)event.preventDefault();
}, true);
function qaInitialize(){
  document.querySelectorAll('img[data-srcset]').forEach(img=>{img.srcset=img.getAttribute('data-srcset');const first=img.srcset.split(',')[0].trim().split(/\\s+/)[0];if(first)img.src=first;img.classList.remove('lazyload');img.classList.add('lazyloaded');});
  document.querySelectorAll('img[data-src]:not([data-srcset])').forEach(img=>{if(img.dataset.src&&!img.dataset.src.startsWith('data:'))img.src=img.dataset.src;});
  const product=document.getElementById('single-product');
  function variants(){try{return JSON.parse(product?.getAttribute('data-variants')||'[]');}catch(_){return[];}}
  const gallery=product?.querySelector('.js-swiper-product');
  function showImage(imageId){
    if(!gallery)return;
    const slides=Array.from(gallery.querySelectorAll('.js-product-slide'));
    const target=slides.find(slide=>slide.getAttribute('data-image')===String(imageId));if(!target)return;
    slides.forEach(slide=>slide.classList.toggle('swiper-slide-active',slide===target));
    const position=target.getAttribute('data-image-position');
    product.querySelectorAll('.js-product-thumb').forEach(thumb=>thumb.classList.toggle('selected',thumb.getAttribute('data-thumb-loop')===position));
  }
  function selectedImage(){
    if(!product)return;
    const selects=Array.from(product.querySelectorAll('select.js-variation-option'));
    const row=variants().find(item=>selects.every(select=>{const axis=/variation\\[([0-2])\\]/.exec(select.name)?.[1];return axis!==undefined&&item['option'+axis]===select.value;}));
    if(row)showImage(row.image);
  }
  if(gallery){gallery.classList.add('swiper-container-initialized','qa-fixture-swiper');selectedImage();}
  document.addEventListener('click',event=>{
    const variant=event.target.closest('a.js-insta-variant[data-option]');
    if(variant&&product?.contains(variant)){
      const group=variant.closest('.js-product-variants-group'),select=group?.querySelector('select.js-variation-option');
      if(select){select.value=variant.getAttribute('data-option');group.querySelectorAll('.js-insta-variant').forEach(a=>a.classList.toggle('selected',a===variant));select.dispatchEvent(new Event('change',{bubbles:true}));selectedImage();qaLog('seleção visual '+select.value+'; sem reserva ou estoque');}return;
    }
    const thumb=event.target.closest('.js-product-thumb');if(thumb&&gallery){const slide=Array.from(gallery.querySelectorAll('.js-product-slide')).find(item=>item.getAttribute('data-image-position')===thumb.getAttribute('data-thumb-loop'));if(slide)showImage(slide.getAttribute('data-image'));return;}
    const filter=event.target.closest('.js-filter-checkbox');
    if(filter){event.preventDefault();const input=filter.querySelector('input[type="checkbox"]');if(input){input.checked=!filter.classList.contains('js-remove-filter');filter.classList.toggle('js-remove-filter',input.checked);filter.classList.toggle('js-apply-filter',!input.checked);qaLog('filtro '+filter.getAttribute('data-filter-name')+'='+filter.getAttribute('data-filter-value')+'; grade não filtrada');}return;}
    const sort=event.target.closest('.js-apply-sort-private');if(sort){document.querySelectorAll('.js-apply-sort-private').forEach(a=>a.classList.toggle('selected',a===sort));qaLog('ordenação visual '+sort.getAttribute('data-sort-value')+'; produtos não reordenados');return;}
    const opener=event.target.closest('.js-modal-open[data-toggle]');
    if(opener){const selector=opener.getAttribute('data-toggle');if(selector!=='#nav-filters'){qaLog('outro modal nativo não simulado');return;}const modal=document.querySelector(selector);if(modal){modal.style.display='block';modal.classList.add('modal-show');qaLog('painel nativo de ordenação aberto somente nesta cópia');}return;}
    const close=event.target.closest('.js-modal-close');if(close){const modal=close.closest('.js-modal');if(modal){modal.classList.remove('modal-show');modal.style.display='none';}}
  });
  document.addEventListener('change',event=>{if(product?.contains(event.target)&&event.target.matches('select.js-variation-option'))selectedImage();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',qaInitialize,{once:true});else qaInitialize();
`;

function shell(url) {
  const view = url.searchParams.get('view') === 'listing' ? 'listing' : 'paris';
  const raw = Number(url.searchParams.get('w'));
  const width = [390, 768, 1024, 1440].includes(raw) ? raw : 1440;
  const count = cartCount(url.searchParams.get('qaCartCount'));
  const frameURL = '/' + view + (count !== null ? '?qaCartCount=' + count : '');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA integrado local</title><style>body{margin:0;background:#ddd;color:#000;font:13px/1.5 sans-serif}nav{padding:12px;display:flex;gap:16px;flex-wrap:wrap}a{color:#000}iframe{display:block;border:1px solid #888;background:#fff;width:${width}px;height:1050px;margin:0 auto}p{margin:0;padding:0 12px 12px}</style></head><body><nav><a href="/review?view=paris&w=1440">Paris desktop</a><a href="/review?view=paris&w=390">Paris 390px</a><a href="/review?view=listing&w=1440">Listagem desktop</a><a href="/review?view=listing&w=390">Listagem 390px</a></nav><p>Viewport real do iframe: ${width}px. ${NOTICE}</p><iframe title="Fixture ${view} ${width}px" src="${frameURL}"></iframe></body></html>`;
}

async function serve(req, res) {
  if (req.headers.host !== '127.0.0.1:8767') { res.writeHead(403); return res.end('Loopback only'); }
  if (req.method !== 'GET') { res.writeHead(405, { Allow: 'GET' }); return res.end('No actions in fixture'); }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://*.mitiendanube.com https://fonts.googleapis.com; img-src 'self' data: https://*.mitiendanube.com https://www.usebede.com.br; font-src 'self' data: https://*.mitiendanube.com https://fonts.gstatic.com; connect-src 'self'; form-action 'none'; frame-src 'self'; object-src 'none'; base-uri 'none'");
  const url = new URL(req.url, ORIGIN);
  if (url.pathname === '/' || url.pathname === '/review') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(shell(url)); }
  if (url.pathname === '/qa-fixture.js') { res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); return res.end(FIXTURE_JS); }
  if (url.pathname === '/qa-start.js') { res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); return res.end("function startLocal(){for(const name of ['BedeProductUI','BedeNativeFilters','BedeColorGallery']){try{window[name]?.start();}catch(e){qaLog(name+': '+e.message);}}}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startLocal,{once:true});else startLocal();"); }
  const file = url.pathname.slice(1);
  if (MODULES.includes(file)) {
    res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    // Translate owner origins in the served copy only, so read-only previews use saved PDPs.
    const js = (await fs.readFile(path.join(ROOT, file), 'utf8')).replace(/https:\/\/loja\.usebede\.com\.br/g, ORIGIN).replace(/https:\/\/www\.usebede\.com\.br/g, ORIGIN);
    return res.end(js);
  }
  const route = {
    '/listing': 'listing', '/search/': 'listing', '/produtos/': 'listing',
    '/paris': 'paris', '/produtos/rasteirinha-paris/': 'paris',
    '/produtos/scarpin-martta/': 'martta', '/produtos/scarpin-martta-medio/': 'marttaMedio'
  }[url.pathname];
  if (!route) { res.writeHead(404); return res.end('No fixture / no operation'); }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.end(clean(await fs.readFile(SOURCES[route], 'utf8'), url.searchParams.get('qaCartCount')));
}

async function main() {
  await Promise.all(Object.values(SOURCES).map(file => fs.access(file)));
  http.createServer((req, res) => serve(req, res).catch(error => { console.error(error.message); if (!res.headersSent) res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end('Local QA file unavailable'); }))
    .listen(8767, '127.0.0.1', () => console.log(JSON.stringify({ status: 'LOCAL_QA_READY', origin: ORIGIN, views: ['/paris', '/listing', '/review?view=paris&w=390', '/review?view=listing&w=390'], simulationOnly: true, sources: SOURCES }, null, 2)));
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { clean, shell, serve, FIXTURE_JS, SOURCES };
