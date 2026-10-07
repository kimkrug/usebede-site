/* Local QA only. GET snapshots; no account, cart, checkout, credentials or writes to store. */
'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const ROOT=path.resolve(__dirname,'..'),OUT=path.resolve(ROOT,'../outputs/store-preview-local');
const ORIGIN='http://127.0.0.1:8766',STORE='https://loja.usebede.com.br';
const SEARCH=STORE+'/search/?q=martta';
function productURLs(html){return[...new Set([...html.matchAll(/href=["'](https:\/\/loja\.usebede\.com\.br\/produtos\/[^/"']+\/)["']/g)].map(m=>m[1]))];}
async function capture(){
  await fs.mkdir(OUT,{recursive:true});const urls=[SEARCH],files={};
  for(let i=0;i<urls.length;i++){
    const url=urls[i];if(i>6)throw new Error('Unexpectedly broad search snapshot');
    const r=await fetch(url,{method:'GET',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(8000)});
    if(!r.ok||!(r.headers.get('content-type')||'').includes('text/html'))throw new Error('Capture failed: '+url);
    const html=await r.text();if(html.length>2500000)throw new Error('Capture too large');
    const filename=i===0?'listing.html':new URL(url).pathname.split('/').filter(Boolean).at(-1)+'.html';
    await fs.writeFile(path.join(OUT,filename),html,'utf8');files[new URL(url).pathname+new URL(url).search]=filename;
    if(i===0)urls.push(...productURLs(html));
  }
  await fs.writeFile(path.join(OUT,'manifest.json'),JSON.stringify({capturedAt:new Date().toISOString(),source:SEARCH,files},null,2),'utf8');
  console.log(JSON.stringify({captured:urls.length,output:OUT,files},null,2));
}
function clean(html){
  // Keep public native HTML/CSS/images, but no remote JavaScript or submissions.
  html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi,'');
  html=html.replace(/([\s"'(=])\/\/(?=[a-z0-9.-])/gi,'$1https://').replace(/(<link\b[^>]*rel=["']stylesheet["'][^>]*?)media=["']print["']/gi,'$1media="all"');
  html=html.replace(/https:\/\/loja\.usebede\.com\.br/g,ORIGIN);
  html=html.replace(/<form\b[^>]*>/gi,'<form action="/blocked" method="post">');
  return html.replace(/<title>[\s\S]*?<\/title>/i,'<title>QA LOCAL — snapshot público da loja</title>')
    .replace(/<\/head>/i,'<style>.qa-notice{position:relative;z-index:99999;padding:10px;background:#fff7dc;color:#000;font:12px/1.5 sans-serif;text-align:center}.js-swiper-product{overflow:hidden}</style></head>')
    .replace(/<body([^>]*)>/i,'<body$1><div class="qa-notice">PRÉVIA LOCAL · SNAPSHOT · SEM PEDIDOS · As datas e estoques são apenas os da captura.</div>')
    .replace(/<\/body>/i,'<script src="/qa-guard.js"></script><script src="/config_loja.js"></script><script src="/catalog-model.js"></script><script src="/store-enhancements.js"></script></body>');
}
function shell(){return`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA local — BEDÊ</title><style>body{margin:0;padding:12px;background:#ddd;color:#000;font:14px sans-serif}nav{padding-bottom:12px;display:flex;gap:16px}iframe{display:block;border:1px solid #777;background:#fff;margin:auto;width:100%;height:850px}body.mobile iframe{width:390px;height:844px}button,a{color:#000;padding:8px}</style><nav><a href="/">Desktop</a><a href="/?mobile=1">Viewport interno 390px</a><a href="/listing">Listagem sem moldura</a><span>Somente prévia local. Não emula aparelho real.</span></nav><iframe title="Loja local de teste" src="/listing"></iframe><script>if(new URL(location.href).searchParams.has('mobile'))document.body.className='mobile';</script></html>`;}
async function serve(req,res){
  if(req.headers.host!=='127.0.0.1:8766') {res.writeHead(403);return res.end('Loopback only');}
  if(req.method!=='GET'){res.writeHead(405,{Allow:'GET'});return res.end('No actions in preview');}
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://*.mitiendanube.com https://fonts.googleapis.com; img-src 'self' data: https://*.mitiendanube.com https://www.usebede.com.br; font-src 'self' data: https://*.mitiendanube.com https://fonts.gstatic.com; connect-src 'self'; form-action 'none'; frame-src 'self'; object-src 'none'; base-uri 'self'");
  const u=new URL(req.url,ORIGIN);
  if(u.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(shell());}
  if(['/config_loja.js','/catalog-model.js','/store-enhancements.js'].includes(u.pathname)){
    res.setHeader('Content-Type','text/javascript; charset=utf-8');
    // Only origins are translated to loopback in the served QA copy. Source files remain unchanged.
    let js=await fs.readFile(path.join(ROOT,u.pathname.slice(1)),'utf8');js=js.replace(/https:\/\/loja\.usebede\.com\.br/g,ORIGIN).replace(/https:\/\/www\.usebede\.com\.br/g,ORIGIN);return res.end(js);
  }
  if(u.pathname==='/qa-guard.js'){
    res.setHeader('Content-Type','text/javascript; charset=utf-8');
    return res.end(`document.addEventListener('submit',e=>e.preventDefault(),true);document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const u=new URL(a.href,location.href);if(u.origin!==location.origin||!/^\\/produtos\\/[^/]+\\/$/.test(u.pathname)){e.preventDefault();} },true);document.querySelectorAll('img[data-srcset]').forEach(img=>{img.srcset=img.getAttribute('data-srcset');if(img.dataset.src)img.src=img.dataset.src;img.classList.remove('lazyload');img.classList.add('lazyloaded');});`);
  }
  const manifest=JSON.parse(await fs.readFile(path.join(OUT,'manifest.json'),'utf8'));
  const key=u.pathname==='/listing'?'/search/?q=martta':u.pathname+u.search;
  const filename=manifest.files[key];
  if(!filename||!/^[a-z0-9-]+\.html$/.test(filename)){res.writeHead(404);return res.end('No fixture / no actions');}
  res.setHeader('Content-Type','text/html; charset=utf-8');
  const html=await fs.readFile(path.join(OUT,filename),'utf8');return res.end(clean(html));
}
async function main(){
  if(process.argv.includes('--capture'))return capture();
  const manifest=JSON.parse(await fs.readFile(path.join(OUT,'manifest.json'),'utf8'));console.log('LOCAL QA SNAPSHOT '+manifest.capturedAt);
  http.createServer((req,res)=>serve(req,res).catch(e=>{console.error(e.message);if(!res.headersSent)res.writeHead(500);res.end('Local preview error');})).listen(8766,'127.0.0.1',()=>console.log(ORIGIN));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={clean,productURLs};
