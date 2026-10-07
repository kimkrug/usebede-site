'use strict';
// Offline tests: no live inventory mutation, browser automation, or network.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const presentation=require('../store-enhancements.js');
const source=fs.readFileSync(path.join(__dirname,'..','store-enhancements.js'),'utf8');
const axes=[{index:0,name:'Tamanho'},{index:1,name:'Cor'}];
const fixtureImage=color=>'https://dcdn-us.mitiendanube.com/stores/008/137/758/products/FIXTURE_'+(color==='Preto'?'PRETO':'CAFE')+'.webp';
function variant(id,size,color,extra={}){return{id,sku:'SKU-'+id,product_id:123,option0:size,option1:color,stock:1,available:true,is_visible:true,contact:false,image:color==='Preto'?1001:1002,image_url:fixtureImage(color),...extra};}
function html(variants=[variant(1,'38','Preto'),variant(2,'34','Preto'),variant(3,'39','Café',{stock:0,available:false})],groups=axes){
  const attr=JSON.stringify(variants).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  return `<div class="js-product-detail" data-store="product-detail" data-variants="${attr}"></div>`+groups.map(a=>`<div class="js-product-variants-group form-group" data-variation-id="${a.index}"><label>${a.name}</label><select></select></div>`).join('');
}
test('preview: numerical order uses an explicitly named size axis; colors stay separate',()=>{
  const rows=[variant(1,'39','Preto'),variant(2,'34','Preto'),variant(3,'37','Café'),variant(4,'34','Café',{stock:0}),variant(5,'35','Preto',{available:false})];
  const before=JSON.stringify(rows),result=presentation.previewFromVariants(rows,axes,'123');
  assert.deepEqual(result.sizes,['34','37','39']);assert.deepEqual(result.colors,[{name:'Preto',sizes:['34','39']},{name:'Café',sizes:['37']}]);
  assert.equal(JSON.stringify(rows),before);assert.equal(presentation.isSizeAxis('Cor'),false);assert.equal(presentation.isSizeAxis('Numeração'),true);
});
test('preview: size/color positions can be reversed without interpreting numeric color as size',()=>{
  const groups=[{index:0,name:'Cor'},{index:1,name:'Tamanho'}];
  const rows=[variant(1,'34','38'),variant(2,'39','35')];
  const result=presentation.previewFromVariants(rows,groups,'123');
  assert.deepEqual(result.sizes,['35','38']);assert.deepEqual(result.colors.map(c=>c.name),['34','39']);
  assert.equal(presentation.previewFromVariants(rows,[{index:0,name:'Cor'}],'123').status,'not-sized');
});
test('preview: zero, negative, unlimited, string or unknown stock never become available sizes',()=>{
  for(const extra of [{stock:0},{stock:-1},{stock:null},{stock:'2'},{stock:Infinity},{stock:NaN},{stock:undefined},{available:false},{available:'true'},{is_visible:false},{is_visible:undefined},{contact:true}]){
    const result=presentation.previewFromVariants([variant(1,'34','Preto',extra)],axes,'123');assert.deepEqual(result.sizes,[],JSON.stringify(extra));
  }
});
test('preview: wrong product, duplicate SKU/id, missing axis and malformed native data fail closed',()=>{
  assert.equal(presentation.previewFromVariants([variant(1,'34','Preto')],axes,'999').status,'unknown');
  assert.equal(presentation.previewFromVariants([variant(1,'34','Preto'),variant(1,'35','Preto')],axes,'123').status,'unknown');
  assert.equal(presentation.previewFromVariants([variant(1,'34','Preto'),variant(2,'35','Preto',{sku:'SKU-1'})],axes,'123').status,'unknown');
  assert.equal(presentation.previewFromVariants([variant(1,'34','Preto')],[],'123').status,'unknown');
  assert.equal(presentation.previewFromVariants([variant(1,'34','Preto')],[...axes,{index:0,name:'Tamanho'}],'123').status,'unknown');
  assert.throws(()=>presentation.parseProductHTML('<script>LS.variants=[];</script>','123'));
  assert.throws(()=>presentation.parseProductHTML(html().replace('&quot;id&quot;','bad'),'123'));
});
test('preview: parser reads inert attribute data and labels without executing scripts',()=>{
  globalThis.__remoteExecuted=false;
  const result=presentation.parseProductHTML(html()+'<script>globalThis.__remoteExecuted=true</script>','123');
  assert.equal(globalThis.__remoteExecuted,false);delete globalThis.__remoteExecuted;
  assert.deepEqual(result.sizes,['34','38']);assert.deepEqual(result.colors[1],{name:'Café',sizes:[]});
  assert.throws(()=>presentation.parseProductHTML('x'.repeat(2500001),'123'));
});
test('preview: known local real PDP fixture preserves size/color association',()=>{
  const file=path.resolve(__dirname,'../../outputs/catalogo-revisao/martta-publica.html');
  if(!fs.existsSync(file))return;
  const result=presentation.parseProductHTML(fs.readFileSync(file,'utf8'),'364501342');
  assert.equal(result.status,'known');assert.deepEqual(result.sizes,['34','35','36','37','38','39']);
  assert.deepEqual(result.colors.find(c=>c.name==='Café').sizes,[]);
});

async function cardFixture(count=6,options={}){
  let now=1000000,nextTimer=0;const timers=new Map(),events={},docEvents={},requests=[],observers=[],intersections=[];
  const callbacks=(list,type)=>(list[type]||=[]),fire=(list,type,event={})=>callbacks(list,type).forEach(fn=>fn(event));
  function matches(node,selector){
    const tag=selector.match(/^[a-z][\w-]*/i)?.[0];if(tag&&node.tagName!==tag.toUpperCase())return false;
    for(const match of selector.matchAll(/\.([\w-]+)/g))if(!node.classList.contains(match[1]))return false;
    for(const match of selector.matchAll(/\[([\w-]+)(?:=["']([^"']*)["'])?\]/g)){const value=node.getAttribute(match[1]);if(value===null||(match[2]!==undefined&&value!==match[2]))return false;}
    const id=selector.match(/#([\w-]+)/)?.[1];return !id||node.id===id;
  }
  class Element{
    constructor(tag,classes=''){this.tagName=tag.toUpperCase();this.className=classes;this.children=[];this.parentElement=null;this.attributes={};this.dataset={};this.handlers={};this._text='';this.id='';this.value='';this.hidden=false;this.classList={contains:c=>this.className.split(/\s+/).includes(c),add:c=>{if(!this.classList.contains(c))this.className+=' '+c;}};}
    set textContent(value){this._text=String(value);this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent).join(' ');}
    setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k]??null;}
    appendChild(child){if(child.parentElement)child.remove();child.parentElement=this;this.children.push(child);return child;}
    remove(){if(this.parentElement){const a=this.parentElement.children;a.splice(a.indexOf(this),1);this.parentElement=null;}}
    replaceChildren(...children){this.children.forEach(c=>c.parentElement=null);this.children=[];this._text='';children.forEach(c=>this.appendChild(c));}
    querySelectorAll(selector){const result=[];for(const c of this.children){if(matches(c,selector))result.push(c);result.push(...c.querySelectorAll(selector));}return result;}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    closest(selector){for(let n=this;n;n=n.parentElement)if(matches(n,selector))return n;return null;}
    contains(node){return this===node||this.children.some(c=>c.contains(node));}
    getBoundingClientRect(){return this.rect||{left:0,top:0,right:180,bottom:250,width:180,height:250};}
    addEventListener(type,fn){callbacks(this.handlers,type).push(fn);}
  }
  const doc={head:new Element('head'),body:new Element('body'),readyState:'loading',hidden:false,createElement:tag=>new Element(tag),addEventListener:(type,fn)=>callbacks(docEvents,type).push(fn),querySelectorAll:selector=>doc.body.querySelectorAll(selector),querySelector:selector=>doc.body.querySelector(selector),getElementById:id=>doc.body.querySelector('#'+id)};
  const add=(tag,classes,parent)=>parent.appendChild(new Element(tag,classes));
  const native=[];for(let i=0;i<count;i++){
    const card=add('div','js-item-product',doc.body);card.setAttribute('data-product-type','list');card.setAttribute('data-product-id','123');card.setAttribute('data-native-sku','NEVER-CHANGE-'+i);
    const imageContainer=options.nativeImageBox?add('div','product-item-image-container item-image',card):card;
    const padding=options.nativeImageBox?add('div','js-item-image-padding position-relative d-block',imageContainer):imageContainer;
    if(options.nativeImageBox)padding.setAttribute('style','padding-bottom: 177.77777777778%;');
    const link=add('a','js-product-item-image-link-private',padding);link.setAttribute('href','https://loja.usebede.com.br/produtos/modelo-'+i+'/');link.setAttribute('aria-label','Modelo '+i);
    const image=add('img','native-image',link);image.setAttribute('src','original-'+i+'.jpg');
    if(options.imageEvidence!==false)image.setAttribute('srcset',(options.imageURL||fixtureImage('Preto'))+' 1024w');
    const info=add('div','item-description',card),titleLink=options.nativeImageBox?add('a','item-link',info):info;
    if(options.nativeImageBox)titleLink.setAttribute('href','https://loja.usebede.com.br/produtos/modelo-'+i+'/');
    const name=add('div','js-item-name',titleLink);name.textContent='Modelo '+i;
    if(options.nativeImageBox){const price=add('span','js-price-display',titleLink);price.textContent='R$ 195,90';price.setAttribute('data-product-price','19590');}
    const original=add('a','native-buy',info);original.setAttribute('href','https://loja.usebede.com.br/produtos/modelo-'+i+'/');original.handler={untouched:true};
    native.push({card,link,image,original,imageContainer,padding,info,titleLink,name,attributes:{...card.attributes}});
  }
  class FakeDate extends Date{static now(){return now;}}
  const context={document:doc,location:new URL('https://loja.usebede.com.br/produtos/'),URL,Date:FakeDate,console,AbortController,AbortSignal,innerWidth:390,innerHeight:844,
    CFG_LOJA:{freteGratisAcimaDe:599,freteGratisRegioes:['Sul','Sudeste']},
    setTimeout:(fn,delay)=>{const id=++nextTimer;timers.set(id,{fn,at:now+delay});return id;},clearTimeout:id=>timers.delete(id),
    addEventListener:(type,fn)=>callbacks(events,type).push(fn),
    MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}},
    IntersectionObserver:class{constructor(fn){this.fn=fn;intersections.push(this);}observe(){}unobserve(){}},
    fetch:(url,init)=>new Promise((resolve,reject)=>{const request={url,init,resolve:(reply={})=>resolve({ok:reply.ok??true,status:reply.status??200,headers:{get:()=>reply.type??'text/html'},text:async()=>reply.html??options.html??html()}),reject};requests.push(request);init.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});})
  };context.window=context;vm.createContext(context);vm.runInContext(source,context);fire(docEvents,'DOMContentLoaded');
  const settle=()=>new Promise(resolve=>setImmediate(resolve));await settle();
  const show=(indices,visible=true)=>{intersections[0].fn(indices.map(i=>({target:native[i].card,isIntersecting:visible})));};
  async function tick(ms){now+=ms;for(let n=0;n<200;n++){const due=[...timers].find(([,t])=>t.at<=now);if(!due)return;timers.delete(due[0]);due[1].fn();await settle();}throw new Error('timer loop');}
  return{doc,native,requests,context,show,settle,tick,mutate:()=>observers.forEach(o=>o.fn([])),event:(name,e)=>fire(events,name,e),visibility:hidden=>{doc.hidden=hidden;fire(docEvents,'visibilitychange');},Element};
}
test('cards: no eager 204-product scan; only intersecting cards load, maximum three GETs',async()=>{
  const f=await cardFixture(204);assert.equal(f.requests.length,0);f.show([0,1,2,3,4,5]);assert.equal(f.requests.length,3);
  assert.ok(f.requests.every(r=>r.init.method==='GET'&&r.init.credentials==='omit'&&!r.init.body));
  f.requests[0].resolve();await f.settle();assert.equal(f.requests.length,4);
  assert.match(f.native[0].card.querySelector('.bede-card-preview').textContent,/Cor: Preto Tamanhos com estoque 34 · 38/);
  assert.doesNotMatch(f.native[0].card.querySelector('.bede-card-preview').textContent,/Café|Em pelo menos uma cor/);
  f.visibility(true);await f.settle();assert.ok(f.requests.slice(1).every(r=>r.init.signal.aborted));
});
test('cards: image overlay contains sizes and CTA without replacing native images, links or purchase handlers',async()=>{
  const f=await cardFixture(1);f.show([0]);f.requests[0].resolve();await f.settle();const original=f.native[0];
  assert.deepEqual(original.card.attributes,original.attributes);assert.equal(original.image.getAttribute('src'),'original-0.jpg');assert.deepEqual(original.original.handler,{untouched:true});
  assert.equal(original.link.getAttribute('href'),'https://loja.usebede.com.br/produtos/modelo-0/');
  assert.equal(original.card.querySelector('.bede-card-overlay').getAttribute('aria-hidden'),'true');
  const overlay=original.card.querySelector('.bede-card-overlay'),preview=original.card.querySelector('.bede-card-preview');
  assert.match(overlay.textContent,/Modelo 0.*34 · 38.*Ver produto/);
  assert.equal(preview.parentElement,overlay);assert.equal(overlay.parentElement,original.link);
  assert.equal(original.card.querySelector('details'),null);assert.equal(original.link.querySelector('a'),null);
  assert.match(original.link.getAttribute('aria-label'),/Modelo 0.*Preto.*34.*38.*Ver produto/);
  f.mutate();await f.tick(50);f.mutate();await f.tick(50);assert.equal(original.card.querySelectorAll('.bede-card-preview').length,1);assert.equal(f.requests.length,1);
  assert.match(source,/@media\(prefers-reduced-motion:reduce\)/);assert.match(source,/:focus-within/);assert.doesNotMatch(source,/preventDefault|stopPropagation|\.dispatchEvent\(/);
});
test('cards: black and white CTAs preserve native anchor and non-interactive overlay semantics',async()=>{
  const f=await cardFixture(1),card=f.native[0].card;
  const link=f.native[0].link,overlayCTA=card.querySelector('.bede-card-overlay-cta');
  assert.equal(card.querySelector('.bede-card-product-link'),null);
  assert.equal(link.tagName,'A');assert.equal(link.getAttribute('href'),'https://loja.usebede.com.br/produtos/modelo-0/');
  assert.equal(overlayCTA.tagName,'SPAN');assert.equal(overlayCTA.querySelector('a'),null);
  for(const selector of ['bede-card-overlay-cta']){
    const css=source.match(new RegExp('\\.'+selector+'\\{([^}]+)\\}'))?.[1];assert.ok(css);
    assert.match(css,/background:#000!important/);assert.match(css,/color:#fff!important/);
    assert.match(css,/border:1px solid #000/);assert.match(css,/min-height:44px/);assert.match(css,/max-width:100%/);
    assert.match(css,/text-decoration:none!important/);
  }
  assert.match(source,/\.bede-card-image-link:focus-visible\{box-shadow:0 0 0 3px #fff;outline:2px solid #000;outline-offset:3px\}/);
});

test('cards: Swiper clone of an enriched card gets one overlay and preview without duplicate CTA',async()=>{
  const f=await cardFixture(1);f.show([0]);f.requests[0].resolve();await f.settle();
  function cloneNode(node){
    const clone=new f.Element(node.tagName,node.className);clone.attributes={...node.attributes};clone.id=node.id;clone.value=node.value;clone._text=node._text;
    node.children.forEach(child=>clone.appendChild(cloneNode(child)));return clone;
  }
  const original=f.native[0],clone=cloneNode(original.card),image=clone.querySelector('img'),name=clone.querySelector('.js-item-name'),link=clone.querySelector('a.js-product-item-image-link-private'),buy=clone.querySelector('a.native-buy');
  const price=clone.querySelector('.item-description').appendChild(new f.Element('span','native-price'));price.textContent='R$ 199,90';price.setAttribute('data-price','19990');
  const protectedNodes=[image,name,link,buy,price],before=protectedNodes.map(node=>({attributes:{...node.attributes},text:node===link?null:node.textContent}));
  // Also exercise artifacts left by the previous presentation version.
  const legacy=clone.querySelector('.item-description').appendChild(new f.Element('a','bede-card-product-link'));legacy.textContent='Ver produto';
  clone.appendChild(new f.Element('div','bede-card-preview')).textContent='Obsoleto';
  f.doc.body.appendChild(clone);f.mutate();await f.tick(50);
  assert.equal(clone.querySelectorAll('.bede-card-overlay').length,1);assert.equal(clone.querySelectorAll('.bede-card-preview').length,1);
  assert.equal(clone.querySelectorAll('.bede-card-mobile-info').length,1);assert.equal(clone.querySelectorAll('.bede-card-mobile-preview').length,1);
  assert.equal(clone.querySelectorAll('.bede-card-mobile-cta').length,1);assert.equal(clone.querySelector('.bede-card-mobile-info').parentElement,clone.querySelector('.item-description'));
  assert.equal(clone.querySelectorAll('.bede-card-overlay-cta').length,1);assert.equal(clone.querySelectorAll('.bede-card-product-link').length,0);
  assert.equal(clone.querySelector('.bede-card-preview').parentElement,clone.querySelector('.bede-card-overlay'));
  assert.equal(clone.querySelector('.bede-card-overlay').parentElement,link);
  protectedNodes.forEach((node,i)=>{assert.ok(clone.contains(node));const attributes={...node.attributes};if(node===link){delete attributes['aria-label'];const expected={...before[i].attributes};delete expected['aria-label'];assert.deepEqual(attributes,expected);}else{assert.deepEqual(attributes,before[i].attributes);assert.equal(node.textContent,before[i].text);}});
  f.mutate();await f.tick(50);assert.equal(clone.querySelectorAll('.bede-card-overlay').length,1);assert.equal(clone.querySelectorAll('.bede-card-preview').length,1);
  assert.equal(original.card.querySelectorAll('.bede-card-overlay').length,1);assert.equal(original.card.querySelectorAll('.bede-card-preview').length,1);
  for(const card of [clone,original.card]){assert.equal(card.querySelectorAll('.bede-card-mobile-info').length,1);assert.equal(card.querySelectorAll('.bede-card-mobile-cta').length,1);}
  assert.equal(f.requests.length,1,'clone does not eagerly fetch or spend another request');
});

test('cards: timeout and malformed PDP show unknown rather than fabricated availability',async()=>{
  const f=await cardFixture(1,{html:'<html>unavailable</html>'});f.show([0]);f.requests[0].resolve();await f.settle();assert.match(f.native[0].card.querySelector('.bede-card-preview').textContent,/Não foi possível confirmar os tamanhos/);
  const slow=await cardFixture(1);slow.show([0]);await slow.tick(8000);assert.equal(slow.requests[0].init.signal.aborted,true);assert.match(slow.native[0].card.querySelector('.bede-card-preview').textContent,/Não foi possível consultar agora/);
  for(const fixture of [f,slow])assert.doesNotMatch(fixture.native[0].card.querySelector('.bede-card-preview').textContent,/Esgotado|Sem estoque/);
});
test('cards: ambiguous photo shows visible color caveat instead of a misleading size union',async()=>{
  const f=await cardFixture(1,{imageEvidence:false});f.show([0]);f.requests[0].resolve();await f.settle();
  const preview=f.native[0].card.querySelector('.bede-card-preview');
  assert.match(preview.textContent,/Tamanhos por cor Preto: 34 · 38 Café: Sem estoque confirmado/);
  assert.equal(preview.querySelector('details'),null);assert.doesNotMatch(preview.textContent,/Esgotado|39/);
  assert.match(f.native[0].link.getAttribute('aria-label'),/Tamanhos por cor.*Preto: 34.*Café: Sem estoque confirmado/);
});

test('cards: grouped preview stays inside native link, limits visible rows and names further colors explicitly',async()=>{
  const rows=[variant(1,'39','Preto'),variant(2,'34','Preto'),variant(3,'38','Café',{stock:0,available:false}),variant(4,'36','Bege')];
  const f=await cardFixture(1,{imageEvidence:false,html:html(rows)});f.show([0]);f.requests[0].resolve();await f.settle();
  const preview=f.native[0].card.querySelector('.bede-card-preview');
  assert.equal(preview.getAttribute('data-bede-preview-state'),'by-color');assert.equal(preview.querySelectorAll('.bede-card-preview-color').length,2);
  assert.match(preview.textContent,/Preto: 34 · 39 Café: Sem estoque confirmado \+1 cor no produto/);assert.doesNotMatch(preview.textContent,/Bege: 36/);
  assert.match(f.native[0].link.getAttribute('aria-label'),/\+1 cor no produto/);assert.equal(f.native[0].link.querySelector('a'),null);
  assert.match(source,/\.bede-card-preview-color\{[^}]*white-space:normal/);assert.match(source,/\.bede-card-preview\{[^}]*max-height:none/);
});

test('cards: two long color names retain all six native sizes and an explicit further-colors notice',async()=>{
  const colors=['Marrom Café com Leite Acetinado','AzulMarinhoMetalizadoSemEspacos'],sizes=['34','35','36','37','38','39'];
  const rows=colors.flatMap((color,c)=>sizes.slice().reverse().map((size,i)=>variant(c*6+i+1,size,color)));rows.push(variant(13,'35','Bege'));
  const f=await cardFixture(1,{imageEvidence:false,html:html(rows)});f.show([0]);f.requests[0].resolve();await f.settle();
  const preview=f.native[0].card.querySelector('.bede-card-preview'),lines=preview.querySelectorAll('.bede-card-preview-color');
  assert.equal(lines.length,2);for(let i=0;i<2;i++)assert.equal(lines[i].textContent,colors[i]+': '+sizes.join(' · '));
  assert.match(preview.textContent,/\+1 cor no produto/);assert.doesNotMatch(preview.textContent,/Bege: 35|…|\.\.\./);
  const label=f.native[0].link.getAttribute('aria-label');for(const line of lines)assert.ok(label.includes(line.textContent));
  assert.equal(preview.parentElement,f.native[0].card.querySelector('.bede-card-overlay'));assert.equal(f.native[0].link.querySelector('a'),null);
});

test('cards: idle, queued and loading states distinguish offscreen cards from exhausted stock',async()=>{
  const f=await cardFixture(4),state=i=>f.native[i].card.querySelector('.bede-card-preview').getAttribute('data-bede-preview-state');
  assert.equal(state(0),'idle');f.show([0,1,2,3]);assert.equal(state(0),'loading');assert.equal(state(3),'queued');
  assert.equal(f.requests.length,3);f.requests[0].resolve();await f.settle();assert.equal(state(0),'known');assert.equal(state(3),'loading');
});

test('cards: mobile copy classes spare all real color rows, six sizes and accessible caveats',async()=>{
  const colors=['Preto','Marrom'],sizes=['34','35','36','37','38','39'];
  const rows=colors.flatMap((color,c)=>sizes.map((size,i)=>variant(c*6+i+1,size,color)));
  const f=await cardFixture(1,{imageEvidence:false,html:html(rows)});f.show([0]);f.requests[0].resolve();await f.settle();
  const area=f.native[0].card.querySelector('.bede-card-preview');
  assert.equal(area.querySelector('.bede-card-preview-redundant-heading').textContent,'Tamanhos por cor');
  assert.equal(area.querySelector('.bede-card-preview-generic-note').textContent,'Prévia por cor · confira no produto.');
  const lines=area.querySelectorAll('.bede-card-preview-color');assert.equal(lines.length,2);
  lines.forEach((line,i)=>{assert.equal(line.textContent,colors[i]+': '+sizes.join(' · '));assert.equal(line.className,'bede-card-preview-color');});
  assert.match(f.native[0].link.getAttribute('aria-label'),/Tamanhos por cor.*39.*Prévia por cor · confira no produto/);
  assert.equal(f.native[0].card.querySelector('.bede-card-overlay-name').textContent,'Modelo 0');
  assert.equal(f.native[0].card.querySelector('.bede-card-overlay-cta').textContent,'Ver produto');
  assert.equal(f.native[0].card.querySelector('.bede-card-mobile-preview').textContent,area.textContent);
});

test('cards: touch information is normal description flow outside the native absolute image ratio box',async()=>{
  const f=await cardFixture(1,{nativeImageBox:true,imageEvidence:false});f.show([0]);f.requests[0].resolve();await f.settle();
  const native=f.native[0],panel=native.card.querySelector('.bede-card-mobile-info'),preview=panel.querySelector('.bede-card-mobile-preview'),cta=panel.querySelector('.bede-card-mobile-cta');
  assert.equal(panel.parentElement,native.info);assert.equal(native.info.children.at(-1),panel);
  assert.equal(native.padding.contains(panel),false);assert.equal(native.imageContainer.contains(panel),false);assert.equal(native.link.contains(panel),false);
  assert.equal(native.link.parentElement,native.padding);assert.equal(native.padding.getAttribute('style'),'padding-bottom: 177.77777777778%;');
  assert.equal(native.name.textContent,'Modelo 0');assert.equal(native.name.parentElement,native.titleLink);
  const price=native.info.querySelector('.js-price-display');assert.equal(price.textContent,'R$ 195,90');assert.equal(price.getAttribute('data-product-price'),'19590');assert.equal(price.parentElement,native.titleLink);
  assert.equal(panel.querySelector('.bede-card-overlay-name'),null);assert.doesNotMatch(panel.textContent,/Modelo 0/);
  assert.equal(cta.tagName,'A');assert.equal(cta.getAttribute('href'),native.link.getAttribute('href'));assert.equal(cta.textContent,'Ver produto');
  assert.equal(cta.querySelector('a'),null);assert.equal(native.titleLink.contains(cta),false);assert.equal(preview.getAttribute('aria-hidden'),'true');
  assert.equal(cta.getAttribute('aria-label'),native.link.getAttribute('aria-label'));assert.match(cta.getAttribute('aria-label'),/Modelo 0.*Tamanhos por cor.*Ver produto/);
  assert.deepEqual(native.original.handler,{untouched:true});assert.equal(native.image.getAttribute('src'),'original-0.jpg');
});

test('cards: mobile panel mirrors every state and accessible label through retry, success and stale clearing',async()=>{
  const f=await cardFixture(1),card=f.native[0].card;
  function same(expected){const desktop=card.querySelector('.bede-card-preview'),mobile=card.querySelector('.bede-card-mobile-preview');assert.equal(desktop.getAttribute('data-bede-preview-state'),expected);assert.equal(mobile.getAttribute('data-bede-preview-state'),expected);assert.equal(mobile.textContent,desktop.textContent);assert.equal(mobile.getAttribute('data-bede-preview-reason'),desktop.getAttribute('data-bede-preview-reason'));assert.equal(card.querySelector('.bede-card-mobile-cta').getAttribute('aria-label'),f.native[0].link.getAttribute('aria-label'));}
  same('idle');f.show([0]);same('loading');f.requests[0].reject(new Error('network'));await f.settle();same('error');
  assert.match(card.querySelector('.bede-card-mobile-preview').textContent,/Nova tentativa em instantes/);
  await f.tick(10000);same('loading');f.requests[1].resolve();await f.settle();same('known');
  assert.match(card.querySelector('.bede-card-mobile-preview').textContent,/34 · 38/);
  f.event('pagehide',{persisted:true});same('idle');assert.doesNotMatch(card.querySelector('.bede-card-mobile-preview').textContent,/34 · 38/);
  f.event('pageshow',{persisted:true});same('loading');f.requests[2].resolve();await f.settle();same('known');
  await f.tick(60000);same('loading');assert.doesNotMatch(card.querySelector('.bede-card-mobile-preview').textContent,/34 · 38/);
  f.visibility(true);await f.settle();
});

test('cards: queued mobile cards update dynamically and do not trigger independent reads',async()=>{
  const f=await cardFixture(4);f.show([0,1,2,3]);
  assert.equal(f.native[3].card.querySelector('.bede-card-mobile-preview').getAttribute('data-bede-preview-state'),'queued');assert.equal(f.requests.length,3);
  f.requests[0].resolve();await f.settle();assert.equal(f.requests.length,4);
  assert.equal(f.native[3].card.querySelector('.bede-card-mobile-preview').getAttribute('data-bede-preview-state'),'loading');
  f.requests[3].resolve();await f.settle();assert.equal(f.native[3].card.querySelector('.bede-card-mobile-preview').getAttribute('data-bede-preview-state'),'known');
  f.mutate();await f.tick(50);assert.equal(f.requests.length,4);assert.equal(f.native[3].card.querySelectorAll('.bede-card-mobile-info').length,1);
  f.visibility(true);await f.settle();
});

test('cards: a known single color retains its label, size heading and complete numbers on mobile',async()=>{
  const f=await cardFixture(1);f.show([0]);f.requests[0].resolve();await f.settle();
  const area=f.native[0].card.querySelector('.bede-card-preview');
  assert.equal(area.querySelector('.bede-card-preview-redundant-heading'),null);
  assert.equal(area.querySelector('.bede-card-preview-generic-note').textContent,'Prévia · confirme no produto.');
  assert.match(area.textContent,/Cor: Preto Tamanhos com estoque 34 · 38/);
});

test('cards: compact mobile copy never hides status, errors or the retry notice',async()=>{
  const f=await cardFixture(4),area=i=>f.native[i].card.querySelector('.bede-card-preview');
  const intact=node=>{assert.equal(node.querySelector('.bede-card-preview-redundant-heading'),null);assert.equal(node.querySelector('.bede-card-preview-generic-note'),null);};
  intact(area(0));f.show([0,1,2,3]);intact(area(0));intact(area(3));
  f.requests[0].reject(new Error('network'));await f.settle();intact(area(0));assert.match(area(0).textContent,/Nova tentativa em instantes/);
  f.requests[1].resolve({html:'<html>no variants</html>'});await f.settle();intact(area(1));assert.match(area(1).textContent,/Não foi possível confirmar os tamanhos/);
  f.visibility(true);await f.settle();
});

test('cards: compact mobile copy keeps all no-stock states and not-sized options',async()=>{
  const examples=[
    {rows:[variant(1,'34','Preto',{stock:0,available:false})],groups:axes,expected:/Sem estoque confirmado/},
    {rows:[variant(1,'34','Preto',{stock:0,available:false}),variant(2,'35','Café',{stock:0,available:false})],groups:axes,expected:/Tamanhos por cor Preto: Sem estoque confirmado Café: Sem estoque confirmado/},
    {rows:[variant(1,'34','Preto')],groups:[{index:1,name:'Cor'}],expected:/Consultar opções/}
  ];
  for(const sample of examples){
    const f=await cardFixture(1,{imageEvidence:false,html:html(sample.rows,sample.groups)});f.show([0]);f.requests[0].resolve();await f.settle();
    const area=f.native[0].card.querySelector('.bede-card-preview');assert.match(area.textContent,sample.expected);
    assert.equal(area.querySelector('.bede-card-preview-redundant-heading'),null);assert.equal(area.querySelector('.bede-card-preview-generic-note'),null);
    f.visibility(true);await f.settle();
  }
});

test('cards: specific combination and additional-colors notices never get compact hiding classes',async()=>{
  for(const count of [2,3])for(const thirdAxis of [false,true]){
    const colors=['Preto','Café','Bege'];let rows=colors.slice(0,count).map((color,i)=>variant(i+1,String(34+i),color));
    if(thirdAxis)rows=rows.map(row=>({...row,option2:'Liso'}));
    const f=await cardFixture(1,{imageEvidence:false,html:html(rows,thirdAxis?[...axes,{index:2,name:'Acabamento'}]:axes)});f.show([0]);f.requests[0].resolve();await f.settle();
    const area=f.native[0].card.querySelector('.bede-card-preview');
    if(thirdAxis||count===3){
      assert.equal(area.querySelector('.bede-card-preview-generic-note'),null);
      if(thirdAxis)assert.match(area.querySelector('.bede-card-preview-note').textContent,/Confirme a combinação/);
      if(count===3)assert.match(area.querySelector('.bede-card-preview-note').textContent,/\+1 cor no produto/);
    }
    f.visibility(true);await f.settle();
  }
});

test('cards: more colors do not suppress the caveat about a third native option',async()=>{
  const rows=[variant(1,'34','Preto'),variant(2,'35','Café'),variant(3,'36','Bege')].map(v=>({...v,option2:'Liso'}));
  const f=await cardFixture(1,{imageEvidence:false,html:html(rows,[...axes,{index:2,name:'Acabamento'}])});f.show([0]);f.requests[0].resolve();await f.settle();
  assert.match(f.native[0].card.querySelector('.bede-card-preview').textContent,/\+1 cor no produto\. Confirme a combinação/);
  assert.match(f.native[0].link.getAttribute('aria-label'),/Confirme a combinação/);
});

test('cards: one transient retry waits ten seconds and second failure cannot become a recurring loop',async()=>{
  const f=await cardFixture(1);f.show([0]);f.requests[0].reject(new Error('network'));await f.settle();
  const area=f.native[0].card.querySelector('.bede-card-preview');assert.equal(area.getAttribute('data-bede-preview-reason'),'network');assert.match(area.textContent,/Nova tentativa em instantes/);
  await f.tick(9999);assert.equal(f.requests.length,1);await f.tick(1);assert.equal(f.requests.length,2);assert.match(area.textContent,/Consultando novamente/);
  f.requests[1].reject(new Error('network'));await f.settle();assert.doesNotMatch(area.textContent,/Nova tentativa|Esgotado|Sem estoque/);
  for(let i=0;i<4;i++){await f.tick(60000);f.show([0]);f.mutate();await f.tick(50);}assert.equal(f.requests.length,2);
});

test('cards: retry requires actual viewport visibility and never runs while the tab is hidden',async()=>{
  const f=await cardFixture(1);f.show([0]);f.requests[0].reject(new Error('network'));await f.settle();
  f.native[0].card.rect={left:0,top:900,right:180,bottom:1150,width:180,height:250};
  await f.tick(10000);assert.equal(f.requests.length,1,'rootMargin-only intersection does not authorize a retry');
  f.native[0].card.rect=null;f.show([0]);assert.equal(f.requests.length,2);
  f.visibility(true);await f.settle();await f.tick(60000);assert.equal(f.requests.length,2);assert.equal(f.requests[1].init.signal.aborted,true);
});

test('cards: only transient HTTP errors retry; structural, not-sized and empty stock do not',async()=>{
  for(const reply of [{ok:false,status:404},{type:'application/json'},{html:'<html>no native variants</html>'},{html:html([variant(1,'34','Preto',{stock:0,available:false})])},{html:html([variant(1,'34','Preto')],[{index:1,name:'Cor'}])}]){
    const f=await cardFixture(1);f.show([0]);f.requests[0].resolve(reply);await f.settle();await f.tick(10000);assert.equal(f.requests.length,1);
    if(reply.ok===false||reply.type||reply.html==='<html>no native variants</html>'){await f.tick(60000);assert.equal(f.requests.length,1,'nontransient failure does not keep retrying');}
    f.visibility(true);await f.settle();
  }
  for(const status of [429,503]){const f=await cardFixture(1);f.show([0]);f.requests[0].resolve({ok:false,status});await f.settle();await f.tick(10000);assert.equal(f.requests.length,2);f.requests[1].resolve();await f.settle();assert.match(f.native[0].card.querySelector('.bede-card-preview').textContent,/34 · 38/);f.visibility(true);await f.settle();}
});

test('cards: concurrent retries retain the same three-read cap and native inputs remain unchanged',async()=>{
  const f=await cardFixture(6);f.show([0,1,2,3,4,5]);
  for(let i=0;i<6;i++){assert.ok(f.requests[i]);f.requests[i].reject(new Error('network'));await f.settle();}
  await f.tick(10000);assert.equal(f.requests.length,9,'six finished failures plus only three live retries');
  f.requests[6].resolve();await f.settle();assert.equal(f.requests.length,10);
  f.native.forEach(n=>assert.deepEqual(n.card.attributes,n.attributes));f.visibility(true);await f.settle();
});

test('cards: retries share the existing forty-eight reads per sixty-second budget',async()=>{
  const f=await cardFixture(50);f.show(Array.from({length:50},(_,i)=>i));
  for(let i=0;i<48;i++){assert.ok(f.requests[i]);f.requests[i].reject(new Error('network'));await f.settle();}
  await f.tick(10000);assert.equal(f.requests.length,48,'retry never bypasses the exhausted global budget');
  await f.tick(50000);assert.equal(f.requests.length,51,'next budget window starts only three requests');
  f.visibility(true);await f.settle();
});

test('cards: explicitly selected native color never inherits another color availability',async()=>{
  const f=await cardFixture(1),card=f.native[0].card;
  const group=card.appendChild(new f.Element('div','js-product-variants-group'));
  const label=group.appendChild(new f.Element('label'));label.textContent='Cor';
  const select=group.appendChild(new f.Element('select','js-variation-option'));select.value='Café';
  f.show([0]);f.requests[0].resolve();await f.settle();
  const text=card.querySelector('.bede-card-preview').textContent;
  assert.match(text,/Cor: Café Sem estoque confirmado/);assert.doesNotMatch(text,/34 · 38/);assert.equal(select.value,'Café');
});
test('cards: hidden page and BFCache invalidate stock preview, prevent stale response and restart safely',async()=>{
  const f=await cardFixture(1);f.show([0]);f.requests[0].resolve();await f.settle();assert.match(f.native[0].card.textContent,/34 · 38/);
  f.event('pagehide',{persisted:true});assert.doesNotMatch(f.native[0].card.querySelector('.bede-card-preview').textContent,/34 · 38/);
  f.event('pageshow',{persisted:true});assert.equal(f.requests.length,2);f.visibility(true);await f.settle();f.visibility(false);assert.equal(f.requests.length,3);
  f.requests[2].resolve();await f.settle();assert.match(f.native[0].card.querySelector('.bede-card-preview').textContent,/34 · 38/);
});
test('cards: freshness expires after sixty seconds and detached cards are not repeatedly fetched',async()=>{
  const f=await cardFixture(1);f.show([0]);f.requests[0].resolve();await f.settle();await f.tick(60000);assert.equal(f.requests.length,2);assert.doesNotMatch(f.native[0].card.querySelector('.bede-card-preview').textContent,/34 · 38/);
  f.requests[1].resolve();await f.settle();f.native[0].card.remove();await f.tick(60000);assert.equal(f.requests.length,2);
});
test('cards: frequent unrelated DOM mutations cannot postpone sixty-second freshness',async()=>{
  const f=await cardFixture(1);f.show([0]);f.requests[0].resolve();await f.settle();
  for(let i=0;i<60;i++){f.mutate();await f.tick(1000);}
  assert.equal(f.requests.length,2);assert.doesNotMatch(f.native[0].card.querySelector('.bede-card-preview').textContent,/34 · 38/);
});
test('cards: TTL follows response time, not only the thirty-second sweep',async()=>{
  const f=await cardFixture(1);f.show([0]);await f.tick(1000);f.requests[0].resolve();await f.settle();
  await f.tick(59000);assert.equal(f.requests.length,1);await f.tick(1000);assert.equal(f.requests.length,2);
  assert.doesNotMatch(f.native[0].card.querySelector('.bede-card-preview').textContent,/34 · 38/);
});
test('cards: per-minute request budget stops a large visible batch at 48 reads',async()=>{
  const f=await cardFixture(70);f.show(Array.from({length:70},(_,i)=>i));
  for(let i=0;i<48;i++){assert.ok(f.requests[i]);f.requests[i].resolve();await f.settle();}
  assert.equal(f.requests.length,48);await f.tick(60000);assert.equal(f.requests.length,51,'next minute still starts only three concurrent requests');
  f.visibility(true);await f.settle();
});
