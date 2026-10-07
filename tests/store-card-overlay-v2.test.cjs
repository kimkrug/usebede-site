'use strict';
// Offline presentation contract; no browser, production writes or remote requests.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const p=require('../store-enhancements.js');
const axes=[{index:0,name:'Tamanho'},{index:1,name:'Cor'}];
const photo=id=>'https://dcdn-us.mitiendanube.com/stores/008/137/758/products/fixture-'+id+'-1024-1024.webp';
function row(id,size,color,image,extra={}){return{id,sku:'FIXTURE-'+id,product_id:123,option0:size,option1:color,image,image_url:photo(image),stock:1,available:true,is_visible:true,contact:false,...extra};}
const rows=()=>[row(1,'39','Preto',101),row(2,'34','Preto',101),row(3,'36','Café',102),row(4,'35','Café',102,{stock:0,available:false})];
const data=(variants=rows())=>p.previewFromVariants(variants,axes,'123');

test('overlay: exact native image URL chooses that color and numeric stock order',()=>{
  const before=rows(),serialized=JSON.stringify(before),preview=data(before);
  const view=p.resolveCardPreview(preview,{imageURLs:[photo(101)]});
  assert.equal(view.color,'Preto');assert.deepEqual(view.sizes,['34','39']);
  assert.equal(view.message,'Tamanhos com estoque');assert.equal(JSON.stringify(before),serialized);
  assert.deepEqual(p.resolveCardPreview(preview,{imageURLs:[photo(102)]}).sizes,['36']);
});
test('overlay: exact image ID is accepted, but conflicting URL and ID fail closed',()=>{
  const preview=data();assert.equal(p.resolveCardPreview(preview,{imageId:'101'}).color,'Preto');
  const conflict=p.resolveCardPreview(preview,{imageId:'102',imageURLs:[photo(101)]});
  assert.equal(conflict.status,'by-color');assert.deepEqual(conflict.sizes,[]);assert.equal(conflict.color,null);
});
test('overlay: explicitly selected native color takes precedence over the photographed color',()=>{
  const view=p.resolveCardPreview(data(),{color:'Café',imageURLs:[photo(101)]});
  assert.equal(view.color,'Café');assert.deepEqual(view.sizes,['36']);
  for(const color of ['cafe','', 'Inexistente'])assert.equal(p.resolveCardPreview(data(),{color}).status,'unknown');
});
test('overlay: photo reused across colors never displays a merged size list',()=>{
  const preview=data(rows().map(v=>({...v,image:101,image_url:photo(101)})));
  for(const evidence of [{imageId:'101'},{imageURLs:[photo(101)]},{}]){
    const view=p.resolveCardPreview(preview,evidence);
    assert.equal(view.message,'Tamanhos por cor');assert.deepEqual(view.sizes,[]);assert.equal(view.color,null);
    assert.deepEqual(view.groups,[{name:'Preto',sizes:['34','39']},{name:'Café',sizes:['36']}]);
  }
});
test('overlay: same image ID with different CDN URL forms still preserves cross-color ambiguity',()=>{
  const preview=data(rows().map(v=>({...v,image:101})));
  assert.equal(preview.imageBindings.length,2);
  const view=p.resolveCardPreview(preview,{imageURLs:[photo(101)]});
  assert.equal(view.message,'Tamanhos por cor');assert.deepEqual(view.sizes,[]);
});
test('overlay: matching two pictured images from distinct colors is ambiguous',()=>{
  const view=p.resolveCardPreview(data(),{imageURLs:[photo(101),photo(102)]});
  assert.equal(view.status,'by-color');assert.deepEqual(view.sizes,[]);assert.equal(view.color,null);
});
test('overlay: URL matching is exact; no filename, resize-suffix or visual-color inference',()=>{
  for(const url of [photo(101).replace('1024-1024','480-0'),photo(101)+'?different=1',photo(101).replace('dcdn-us','acdn-us'),'/fixture-101-1024-1024.webp']){
    assert.equal(p.resolveCardPreview(data(),{imageURLs:[url]}).status,'by-color',url);
    assert.equal(p.resolveCardPreview(data(),{imageURLs:[url]}).color,null,url);
  }
  assert.equal(p.resolveCardPreview(data(),{imageURLs:[photo(101).replace('https:','')]}).color,'Preto');
});
test('overlay: unexpected protocols, hosts and credentials cannot serve as photo evidence',()=>{
  for(const url of ['http://dcdn-us.mitiendanube.com/a.webp','https://mitiendanube.com.evil.test/a.webp','https://user:pass@dcdn-us.mitiendanube.com/a.webp','data:image/webp;base64,AAAA','javascript:void(0)']){
    const preview=data(rows().map(v=>({...v,image_url:url})));
    assert.deepEqual(preview.imageBindings,[]);
    assert.equal(p.resolveCardPreview(preview,{imageURLs:[url]}).status,'by-color');
    assert.equal(p.resolveCardPreview(preview,{imageURLs:[url]}).color,null);
  }
});
test('overlay: unavailable photographed color cannot inherit another color stock',()=>{
  const preview=data(rows().map(v=>v.option1==='Preto'?{...v,stock:0,available:false}:v));
  const view=p.resolveCardPreview(preview,{imageURLs:[photo(101)]});
  assert.equal(view.color,'Preto');assert.deepEqual(view.sizes,[]);assert.equal(view.message,'Sem estoque confirmado');
});
test('overlay: uncertain or hidden stock is never fabricated as a number or Esgotado',()=>{
  for(const extra of [{stock:null},{stock:'2'},{stock:undefined},{available:undefined},{is_visible:false},{contact:true}]){
    const view=p.resolveCardPreview(data([row(1,'34','Preto',101,extra)]),{});
    assert.deepEqual(view.sizes,[]);assert.doesNotMatch(view.message,/Esgotado/i);
  }
  for(const status of ['unknown','idle','queued','loading','error','not-sized']){
    const view=p.resolveCardPreview({status},{});assert.deepEqual(view.sizes,[]);assert.doesNotMatch(view.message,/Sem estoque|Esgotado/i);
  }
});

test('overlay: grouped colors retain a no-stock row without borrowing sizes and never mutate evidence',()=>{
  const rowsCopy=rows().map(v=>v.option1==='Café'?{...v,stock:0,available:false}:v),preview=data(rowsCopy),before=JSON.stringify(preview);
  const view=p.resolveCardPreview(preview,{});
  assert.equal(view.status,'by-color');assert.deepEqual(view.sizes,[]);assert.equal(view.color,null);
  assert.deepEqual(view.groups,[{name:'Preto',sizes:['34','39']},{name:'Café',sizes:[]}]);assert.equal(JSON.stringify(preview),before);
  for(const colors of [[{name:'Preto',sizes:['34']},{name:'Preto',sizes:['39']}],[{name:'Preto',sizes:['34']},{name:'Café',sizes:null}]])assert.equal(p.resolveCardPreview({...preview,colors},{}).status,'unknown');
});

test('overlay: idle, queue, loading, transient error and structural failure have distinct truthful states',()=>{
  assert.equal(p.resolveCardPreview({status:'idle'}).message,'Prévia de tamanhos');
  assert.equal(p.resolveCardPreview({status:'queued'}).message,'Aguardando consulta…');
  assert.equal(p.resolveCardPreview({status:'loading'}).message,'Consultando tamanhos…');
  assert.equal(p.resolveCardPreview({status:'loading',retrying:true}).message,'Consultando novamente…');
  assert.equal(p.resolveCardPreview({status:'error',reason:'timeout',retryPending:true}).note,'Nova tentativa em instantes.');
  assert.equal(p.resolveCardPreview({status:'error',reason:'structure'}).message,'Não foi possível confirmar os tamanhos');
  assert.equal(p.resolveCardPreview({status:'error',reason:'network'}).message,'Não foi possível consultar agora');
});
test('overlay: single-color and explicitly size-only products retain numeric order',()=>{
  const variants=[row(1,'40','Preto',101),row(2,'9','Preto',101),row(3,'10','Preto',101)];
  assert.deepEqual(p.resolveCardPreview(data(variants),{}).sizes,['9','10','40']);
  const sizeOnly=p.previewFromVariants(variants,[axes[0]],'123');
  assert.deepEqual(p.resolveCardPreview(sizeOnly,{}).sizes,['9','10','40']);
  assert.equal(p.resolveCardPreview(sizeOnly,{}).color,null);
});
test('overlay: a third option is disclosed rather than promising a particular combination',()=>{
  const variants=rows().map(v=>({...v,option2:'Liso'}));
  const preview=p.previewFromVariants(variants,[...axes,{index:2,name:'Acabamento'}],'123');
  assert.equal(p.resolveCardPreview(preview,{imageURLs:[photo(101)]}).note,'Confirme a combinação no produto.');
});
test('overlay: not-sized products direct to native options instead of inventing shoe sizes',()=>{
  const preview=p.previewFromVariants(rows(),[{index:1,name:'Cor'}],'123');
  assert.equal(p.resolveCardPreview(preview,{}).message,'Consultar opções');
});
test('overlay: saved real PDP keeps no-stock Café separate from Preto',()=>{
  const file=path.resolve(__dirname,'../../outputs/catalogo-revisao/martta-publica.html');
  if(!fs.existsSync(file))return;
  const preview=p.parseProductHTML(fs.readFileSync(file,'utf8'),'364501342');
  assert.deepEqual(p.resolveCardPreview(preview,{color:'Café'}).sizes,[]);
  assert.deepEqual(p.resolveCardPreview(preview,{color:'Preto'}).sizes,['34','35','36','37','38','39']);
  assert.ok(preview.imageBindings.length>0);
});
test('overlay: touch layout and wrapping size spans remain inside the native image link',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','store-enhancements.js'),'utf8');
  assert.match(source,/overlay\.appendChild\(preview\)/);assert.match(source,/imageLink\.appendChild\(overlay\)/);
  assert.doesNotMatch(source,/className='bede-card-product-link'/);
  assert.match(source,/@media\(hover:none\),\(pointer:coarse\)\{\.bede-card-overlay\{opacity:1/);
  assert.match(source,/\.bede-card-overlay\{[^}]*max-height:none/);assert.match(source,/\.bede-card-overlay-cta\{[^}]*min-height:44px/);
  assert.match(source,/pointer-events:none/);assert.match(source,/prefers-reduced-motion:reduce/);
});

test('overlay: desktop and mobile cannot ellipsize, clip or flex-shrink the size preview',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','store-enhancements.js'),'utf8');
  const rules=selector=>[...source.matchAll(new RegExp('\\.'+selector+'\\{([^}]+)\\}','g'))].map(m=>m[1]);
  for(const selector of ['bede-card-preview','bede-card-preview-color','bede-card-overlay']){
    const blocks=rules(selector);assert.ok(blocks.length);
    for(const css of blocks){assert.doesNotMatch(css,/white-space:nowrap|text-overflow:ellipsis|overflow:(?:hidden|clip)|line-clamp|max-height:\d/);}
  }
  const preview=rules('bede-card-preview')[0],color=rules('bede-card-preview-color')[0];
  assert.match(preview,/flex:0 0 auto/);assert.match(preview,/max-height:none/);assert.match(preview,/overflow:visible/);
  assert.match(color,/white-space:normal/);assert.match(color,/overflow-wrap:anywhere/);assert.match(color,/font-size:10px/);
  assert.match(source,/\.bede-card-overlay-cta\{[^}]*min-height:44px/);
});

test('overlay: compact copy is hidden only in narrow or touch layouts without smaller text or targets',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','store-enhancements.js'),'utf8');
  const style=source.match(/style\.textContent = `([\s\S]*?)`;/)?.[1];assert.ok(style);
  const mobile=style.slice(style.indexOf('@media(max-width:767px)'));
  const desktop=style.slice(0,style.indexOf('@media(max-width:767px)'));
  assert.doesNotMatch(desktop,/bede-card-preview-(?:redundant-heading|generic-note)/);
  assert.match(mobile,/\.bede-card-preview \.bede-card-preview-redundant-heading,\.bede-card-preview \.bede-card-preview-generic-note\{display:none\}/);
  assert.match(mobile,/\.bede-card-overlay\{[^}]*gap:2px;padding:10px 6px 6px/);
  assert.match(mobile,/\.bede-card-overlay-name\{font-size:10px\}/);
  assert.match(mobile,/\.bede-card-overlay-cta\{font-size:11px;padding:7px 11px\}/);
  assert.match(desktop,/\.bede-card-overlay-cta\{[^}]*min-height:44px/);
  assert.match(desktop,/@media\(hover:hover\) and \(pointer:fine\)\{\.bede-card-ready:hover \.bede-card-overlay\{opacity:1;transform:none\}\}/);
});

test('cards: narrow and touch layouts remove the photo overlay and expose a static sibling panel',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','store-enhancements.js'),'utf8');
  const style=source.match(/style\.textContent = `([\s\S]*?)`;/)?.[1];assert.ok(style);
  const query='@media(max-width:767px),(hover:none),(pointer:coarse)',touch=style.slice(style.indexOf(query));assert.ok(style.includes(query));
  assert.match(style,/\.bede-card-mobile-info\{display:none\}/);
  assert.match(touch,/\.bede-card-ready \.bede-card-overlay\{display:none\}/);
  assert.match(touch,/\.bede-card-mobile-info\{display:flex;position:static;[^}]*max-height:none;overflow:visible;background:transparent/);
  assert.doesNotMatch(touch,/position:absolute|position:fixed|transform:|height:\d|overflow:hidden/);
  assert.match(style,/\.bede-card-mobile-cta\{[^}]*min-height:44px;[^}]*background:#000!important;[^}]*color:#fff!important/);
  assert.match(style,/\.bede-card-mobile-preview\{[^}]*max-height:none;overflow:visible;[^}]*white-space:normal;overflow-wrap:anywhere/);
  assert.match(source,/mobileInfo\.appendChild\(mobileCTA\);info\.appendChild\(mobileInfo\)/);
  assert.doesNotMatch(source,/imageLink\.appendChild\(mobileInfo\)|padding\.appendChild\(mobileInfo\)/);
});

test('cards: retained native listing proves why the mobile panel must stay outside image ancestors',()=>{
  const file=path.resolve(__dirname,'../../outputs/store-preview-local/listing.html');assert.ok(fs.existsSync(file));
  const html=fs.readFileSync(file,'utf8');
  assert.match(html,/class="js-item-image-padding position-relative d-block"/);
  assert.match(html,/\.product-item-image-container \.js-product-item-image-link-private\s*\{\s*position: absolute !important;/);
  assert.match(html,/class="item-description text-center"[^>]*>[\s\S]*?class="item-link"/);
});
