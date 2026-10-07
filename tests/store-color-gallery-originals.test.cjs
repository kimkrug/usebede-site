'use strict';
// Synthetic, offline rules: no production MAP edits, photo changes or store writes.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../store-color-gallery.js'),'utf8');
const {getVerifiedGallery}=require('../store-color-gallery.js');
const cdn='https://dcdn-us.mitiendanube.com/stores/008/137/758/products/';
function audited({single=false,missing=false}={}){
  const variants=[{id:1,sku:'P34',product_id:123,option0:'34',option1:'Preto',option2:null,image:11,available:true,stock:2,price_number:100},
    {id:2,sku:'B35',product_id:123,option0:'35',option1:'Bege',option2:null,image:21,available:false,stock:0,price_number:100}];
  const rule={axis:1,colors:{Preto:['11'],Bege:['21']},retired:['10','20','99'],gallery:{Preto:['11','10'],Bege:['21','20']}};
  if(missing){rule.colors.Bege=[];rule.gallery.Bege=[];rule.retired.push('21');variants[1].image=20;}
  if(single){delete rule.axis;delete rule.colors;rule.mode='single';rule.approved=['11'];rule.retired=['10','20','21','99'];rule.gallery=['11','10','20'];variants.forEach(v=>{v.option1=null;v.image=11;});}
  rule.bindings=variants.map(v=>({id:String(v.id),sku:v.sku,image:String(v.image),options:[v.option0,v.option1,null]}));
  return{model:{productId:'123',variants,images:['11','10','21','20','99'].map(id=>({id,url:cdn+id+'.webp'}))},rule};
}

test('explicit single gallery keeps cover first and includes only listed original URLs without changing input',()=>{
  const {model,rule}=audited({single:true}),before=JSON.stringify({model,rule}),result=getVerifiedGallery(model,rule);
  assert.ok(result);assert.equal(result.single,true);assert.deepEqual(result.colors[0].images.map(i=>i.id),['11','10','20']);
  assert.deepEqual(result.colors[0].images.map(i=>i.url),[cdn+'11.webp',cdn+'10.webp',cdn+'20.webp']);
  assert.deepEqual(result.retired,['10','20','21','99']);assert.equal(JSON.stringify({model,rule}),before);
});

test('explicit color galleries never infer color or expose unlisted originals',()=>{
  const {model,rule}=audited(),before=JSON.stringify({model,rule}),result=getVerifiedGallery(model,rule);
  assert.deepEqual(result.colors.map(c=>[c.name,c.images.map(i=>i.id)]),[['Preto',['11','10']],['Bege',['21','20']]]);
  assert.deepEqual(result.colors.map(c=>c.soldOut),[false,true]);assert.equal(result.colors.flatMap(c=>c.images).some(i=>i.id==='99'),false);
  assert.equal(JSON.stringify({model,rule}),before);
});

test('duplicate, cross-color, unknown, missing-key and malformed gallery declarations fail closed',()=>{
  for(const change of [
    d=>d.rule.gallery.Preto.push('10'),d=>d.rule.gallery.Bege.push('10'),d=>d.rule.gallery.Preto.push('21'),
    d=>d.rule.gallery.Preto.push('404'),d=>d.rule.gallery.Preto=[10],d=>d.rule.gallery.Preto=['10','11'],
    d=>delete d.rule.gallery.Bege,d=>d.rule.gallery.Azul=[],d=>d.rule.gallery=null,d=>d.rule.gallery=[],
    d=>d.rule.gallery.Preto='11',d=>d.rule.gallery.Preto=undefined,
    d=>delete d.rule.bindings,d=>d.rule.bindings.pop(),d=>d.rule.bindings[0].image='10',
    d=>d.model.variants[0].image=10,d=>d.model.images.pop(),d=>d.model.images.push({...d.model.images[0]}),
    d=>d.model.images[0].url='https://untrusted.invalid/11.webp'
  ]){const d=audited();change(d);assert.equal(getVerifiedGallery(d.model,d.rule),null);}
});

test('explicit empty color requires complete exact bindings to a retained native ID and never borrows another cover',()=>{
  const d=audited({missing:true}),before=JSON.stringify(d),result=getVerifiedGallery(d.model,d.rule);
  assert.ok(result);assert.deepEqual(result.colors[1],{name:'Bege',soldOut:true,images:[]});assert.equal(JSON.stringify(d),before);
  for(const change of [
    x=>delete x.rule.bindings,x=>x.rule.bindings[1].image='21',
    x=>{x.model.variants[1].image=11;x.rule.bindings[1].image='11';},
    x=>x.rule.gallery.Bege=['20'],x=>delete x.rule.gallery,x=>x.rule.retired=x.rule.retired.filter(id=>id!=='20')
  ]){const x=audited({missing:true});change(x);assert.equal(getVerifiedGallery(x.model,x.rule),null);}
  const hasCover=audited();hasCover.rule.gallery.Bege=[];assert.deepEqual(getVerifiedGallery(hasCover.model,hasCover.rule).colors[1].images,[]);
});

test('omitting gallery preserves legacy approved-only presentation; explicit single empty remains empty',()=>{
  const d=audited();delete d.rule.gallery;assert.deepEqual(getVerifiedGallery(d.model,d.rule).colors.map(c=>c.images.map(i=>i.id)),[['11'],['21']]);
  const single=audited({single:true});single.rule.gallery=[];assert.deepEqual(getVerifiedGallery(single.model,single.rule).colors[0].images,[]);
});

function fixture(options={}){
  const d=audited(options),timers=new Map(),createdImages=[],observers=[];let doc,timerId=0;
  function simple(node,selector){
    const tag=selector.match(/^[a-z][\w-]*/i)?.[0];if(tag&&node.tagName!==tag.toUpperCase())return false;
    const id=selector.match(/#([\w-]+)/)?.[1];if(id&&node.id!==id)return false;
    for(const m of selector.matchAll(/\.([\w-]+)/g))if(!node.classList.contains(m[1]))return false;
    for(const m of selector.matchAll(/\[([\w-]+)(?:=["']([^"']*)["'])?\]/g))if(!node.hasAttribute(m[1])||(m[2]!==undefined&&node.getAttribute(m[1])!==m[2]))return false;
    return true;
  }
  function matches(node,selector){const pieces=selector.split(/\s+/);if(!simple(node,pieces.pop()))return false;let parent=node.parentElement;while(pieces.length){const part=pieces.pop();while(parent&&!simple(parent,part))parent=parent.parentElement;if(!parent)return false;parent=parent.parentElement;}return true;}
  class Element{
    constructor(tag){this.tagName=tag.toUpperCase();this.className='';this.id='';this.children=[];this.parentElement=null;this.attributes={};this.handlers={};this.value='';this._text='';this.complete=false;this.naturalWidth=0;this.clicks=0;
      this.classList={contains:c=>this.className.split(/\s+/).includes(c),add:c=>{if(!this.classList.contains(c))this.className+=' '+c;},remove:c=>{this.className=this.className.split(/\s+/).filter(v=>v!==c).join(' ');}};
      this.dataset=new Proxy({}, {get:(_,key)=>this.getAttribute('data-'+key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())),set:(_,key,value)=>{this.setAttribute('data-'+key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()),value);return true;}});
    }
    set textContent(value){this._text=String(value);this.children.forEach(c=>c.parentElement=null);this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent).join(' ');}
    setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k]??null;}hasAttribute(k){return k in this.attributes;}removeAttribute(k){delete this.attributes[k];}
    appendChild(child){child.remove();this.children.push(child);child.parentElement=this;return child;}
    insertAdjacentElement(where,child){assert.ok(['beforebegin','afterend'].includes(where));child.remove();const parent=this.parentElement;assert.ok(parent);const index=parent.children.indexOf(this)+(where==='afterend'?1:0);parent.children.splice(index,0,child);child.parentElement=parent;return child;}
    remove(){if(!this.parentElement)return;if(doc?.activeElement&&this.contains(doc.activeElement))doc.activeElement=doc.body;const parent=this.parentElement;parent.children=parent.children.filter(c=>c!==this);this.parentElement=null;}
    contains(node){return node===this||this.children.some(c=>c.contains(node));}
    querySelectorAll(selector){const result=[];for(const child of this.children){if(matches(child,selector))result.push(child);result.push(...child.querySelectorAll(selector));}return result;}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    addEventListener(type,fn){(this.handlers[type]||=[]).push(fn);}removeEventListener(type,fn){this.handlers[type]=(this.handlers[type]||[]).filter(f=>f!==fn);}
    fire(type,event={}){for(const fn of this.handlers[type]||[])fn({target:this,...event});}
    click(){this.clicks++;this.nativeHandler?.();this.fire('click');}focus(){doc.activeElement=this;}
  }
  doc=new Element('document');doc.head=doc.appendChild(new Element('head'));doc.body=doc.appendChild(new Element('body'));doc.activeElement=doc.body;
  doc.createElement=tag=>{const node=new Element(tag);if(tag==='img')createdImages.push(node);return node;};
  const add=(parent,tag,classes='')=>{const n=new Element(tag);n.className=classes;return parent.appendChild(n);};
  const root=add(doc.body,'div');root.id='single-product';root.setAttribute('data-store','product-detail');root.setAttribute('data-variants',JSON.stringify(d.model.variants));add(root,'h1').textContent='Modelo de teste';
  const area=add(root,'div');area.setAttribute('data-store','product-image-123');area.setAttribute('aria-hidden','false');const swiper=add(area,'div','js-swiper-product');
  const slides=d.model.images.map(image=>{const slide=add(swiper,'div','js-product-slide');slide.setAttribute('data-image',image.id);const a=add(slide,'a','js-product-slide-link');a.setAttribute('href',image.url);add(a,'img');return slide;});
  const form=add(root,'form');form.id='product_form';form.setAttribute('data-store','product-form-123');const size=add(form,'select');size.value='34';size.setAttribute('name','variation[0]');const quantity=add(form,'input');quantity.value='1';quantity.setAttribute('name','quantity');const variant=add(form,'input');variant.value='1';variant.setAttribute('name','variant_id');const price=add(form,'span');price.textContent='R$ 100,00';const buy=add(form,'button');buy.textContent='Comprar';
  const group=add(form,'div','js-product-variants-group');group.setAttribute('data-variation-id','1');const select=add(group,'select','js-variation-option');select.setAttribute('name','variation[1]');select.value='Preto';
  const anchors=['Preto','Bege'].map(name=>{const a=add(group,'a','js-insta-variant');a.setAttribute('data-option',name);a.nativeHandler=()=>{select.value=name;};return a;});
  if(options.single)group.remove();
  const win={document:doc,URL,console,Map,Set,Object,Array,JSON,setTimeout:(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId;},clearTimeout:id=>timers.delete(id),handlers:{},addEventListener(type,fn){(this.handlers[type]||=[]).push(fn);},removeEventListener(type,fn){this.handlers[type]=(this.handlers[type]||[]).filter(f=>f!==fn);},MutationObserver:class{constructor(fn){this.fn=fn;this.targets=[];observers.push(this);}observe(node,config){this.targets.push({node,config});}disconnect(){this.disconnected=true;}}};win.window=win;
  vm.createContext(win);vm.runInContext(source.replace(/const MAP=[\s\S]*?;\s*(?=function imageURL)/,'const MAP='+JSON.stringify({'123':d.rule})+';\n  '),win);
  function flush(delay=40){let count=0;while([...timers.values()].some(t=>t.delay===delay)){assert.ok(++count<20,'bounded timers');const [id,t]=[...timers.entries()].find(([,v])=>v.delay===delay);timers.delete(id);t.fn();}}
  const pending=()=>createdImages.filter(i=>typeof i.onload==='function').at(-1);
  function load(image=pending()){assert.ok(image);image.complete=true;image.naturalWidth=1024;image.onload?.();}
  return{win,doc,root,area,form,group,select,size,quantity,variant,price,buy,anchors,slides,timers,observers,flush,pending,load,start:()=>win.BedeColorGallery.start(),change:color=>{select.value=color;form.fire('change');flush();},mutate:()=>{observers.forEach(o=>o.fn([]));flush();}};
}
function hiddenNative(f){assert.equal(f.area.classList.contains('bede-original-color-gallery'),true);assert.equal(f.area.getAttribute('aria-hidden'),'true');assert.equal(f.area.hasAttribute('inert'),true);assert.deepEqual(f.area.querySelectorAll('.js-product-slide'),f.slides);}
function protectedFields(f){assert.equal(f.size.value,'34');assert.equal(f.quantity.value,'1');assert.equal(f.variant.value,'1');assert.equal(f.price.textContent,'R$ 100,00');assert.equal(f.buy.textContent,'Comprar');}

test('strict DOM: cover and explicit original appear in order; loading never reveals native originals',()=>{
  const f=fixture();f.start();hiddenNative(f);assert.match(f.doc.querySelector('[role="status"]').textContent,/Carregando foto/);f.load();
  assert.deepEqual(f.doc.querySelectorAll('.bede-color-photo-nav button').map(b=>b.getAttribute('data-bede-photo')),['11','10']);
  const original=f.doc.querySelector('button[data-bede-photo="10"]');original.focus();original.click();f.flush();hiddenNative(f);assert.equal(f.doc.querySelector('.bede-color-gallery a'),null);f.load();
  assert.equal(f.doc.querySelector('.bede-color-gallery a').href,cdn+'10.webp');hiddenNative(f);protectedFields(f);assert.equal(f.select.value,'Preto');assert.deepEqual(f.anchors.map(a=>a.clicks),[0,0]);
});

test('strict DOM: explicit missing color shows only status and native controls remain usable and unchanged',()=>{
  const f=fixture({missing:true});f.start();f.load();f.doc.querySelector('button[data-color="Bege"]').click();f.flush();hiddenNative(f);
  assert.equal(f.select.value,'Bege');assert.deepEqual(f.anchors.map(a=>a.clicks),[0,1]);assert.match(f.doc.querySelector('[role="status"]').textContent,/Foto indisponível — Bege/);
  assert.equal(f.doc.querySelector('.bede-color-gallery').querySelectorAll('img').length,0);assert.equal(f.pending(),undefined);assert.equal(f.doc.querySelector('button[data-color="Bege"]').querySelector('img'),null);protectedFields(f);
  f.doc.querySelector('button[data-color="Preto"]').click();f.flush();hiddenNative(f);f.load();assert.equal(f.doc.querySelector('.bede-color-gallery a').href,cdn+'11.webp');
});

test('strict DOM: image error or timeout remains closed and another declared photo can be selected',()=>{
  for(const mode of ['error','timeout']){const f=fixture();f.start();if(mode==='error')f.pending().onerror();else f.flush(6000);hiddenNative(f);
    assert.match(f.doc.querySelector('[role="status"]').textContent,/Foto indisponível — Preto/);assert.equal(f.doc.querySelector('.bede-color-gallery a'),null);assert.equal(f.pending(),undefined);assert.equal(f.timers.size,0);protectedFields(f);
    f.doc.querySelector('button[data-bede-photo="10"]').click();f.flush();hiddenNative(f);f.load();assert.equal(f.doc.querySelector('.bede-color-gallery a').href,cdn+'10.webp');}
});

for(const mode of ['error','timeout'])for(const route of ['refresh','same-thumbnail'])test('strict DOM: explicit '+route+' retries after '+mode+' without automatic retries or native leakage',()=>{
  const f=fixture(),control=f.start(),first=f.pending(),staleLoad=first.onload,staleError=first.onerror;
  if(mode==='error')first.onerror();else f.flush(6000);
  hiddenNative(f);assert.equal(f.pending(),undefined);assert.equal(f.timers.size,0);
  assert.match(f.doc.querySelector('[role="status"]').textContent,/Foto indisponível — Preto/);
  // These automatic notifications must not turn a failed request into a retry loop.
  f.mutate();f.form.fire('change');f.form.fire('click');for(const callback of f.win.handlers.pageshow||[])callback();f.flush();
  assert.equal(f.pending(),undefined);assert.equal(f.timers.size,0);assert.equal(f.doc.querySelector('.bede-color-gallery a'),null);hiddenNative(f);
  const retry=()=>{if(route==='refresh')control.refresh();else f.doc.querySelector('button[data-bede-photo="11"]').click();f.flush();};
  retry();const second=f.pending();assert.ok(second);assert.notEqual(second,first);assert.equal(second.src,cdn+'11.webp');
  assert.match(f.doc.querySelector('[role="status"]').textContent,/Carregando foto — Preto/);assert.equal(f.doc.querySelector('.bede-color-gallery a'),null);hiddenNative(f);
  // Late callbacks from the failed request cannot mount a previous image or cancel the explicit retry.
  first.naturalWidth=1024;staleLoad();staleError();assert.equal(f.pending(),second);assert.equal(f.doc.querySelector('.bede-color-gallery a'),null);hiddenNative(f);
  f.load(second);assert.equal(f.doc.querySelector('.bede-color-gallery a').href,cdn+'11.webp');assert.equal(f.doc.querySelector('[role="status"]'),null);
  assert.deepEqual(f.doc.querySelectorAll('.bede-color-photo-nav button').map(b=>b.getAttribute('data-bede-photo')),['11','10']);
  assert.equal(f.select.value,'Preto');assert.deepEqual(f.anchors.map(a=>a.clicks),[0,0]);protectedFields(f);hiddenNative(f);
  // A successfully settled photo keeps the existing idempotent behavior.
  const settled=f.doc.querySelector('.bede-color-gallery');retry();assert.equal(f.pending(),undefined);assert.equal(f.doc.querySelector('.bede-color-gallery'),settled);
});

test('strict DOM: invalidated image, binding, selection or form structure displays status instead of native images',()=>{
  for(const change of [f=>f.slides[0].setAttribute('data-image','999'),f=>{const v=JSON.parse(f.root.getAttribute('data-variants'));v[0].sku='changed';f.root.setAttribute('data-variants',JSON.stringify(v));},f=>f.select.value='Azul',f=>f.select.setAttribute('name','wrong')]){
    const f=fixture();f.start();f.load();change(f);f.mutate();hiddenNative(f);assert.match(f.doc.querySelector('[role="status"]').textContent,/Foto indisponível/);assert.equal(f.doc.querySelector('.bede-color-gallery').querySelectorAll('img').length,0);protectedFields(f);}
});

test('strict DOM: stale callbacks cannot reveal the previous color after an empty or different selection',()=>{
  for(const missing of [true,false]){const f=fixture({missing});f.start();const old=f.pending(),oldLoad=old.onload,oldError=old.onerror;f.change('Bege');old.naturalWidth=1024;oldLoad();oldError();hiddenNative(f);
    if(missing){assert.match(f.doc.querySelector('[role="status"]').textContent,/Foto indisponível — Bege/);assert.equal(f.doc.querySelector('.bede-color-gallery a'),null);}
    else{f.load();assert.equal(f.doc.querySelector('.bede-color-gallery a').href,cdn+'21.webp');assert.deepEqual(f.doc.querySelectorAll('.bede-color-photo-nav button').map(b=>b.getAttribute('data-bede-photo')),['21','20']);}}
});

test('strict DOM: callback rereads a selection changed before the delayed native event',()=>{
  const f=fixture({missing:true});f.start();const old=f.pending();f.select.value='Bege';f.load(old);hiddenNative(f);assert.match(f.doc.querySelector('[role="status"]').textContent,/Foto indisponível — Bege/);assert.equal(f.pending(),undefined);
});

test('strict DOM: a completed image ignores an obsolete error callback',()=>{
  const f=fixture();f.start();const image=f.pending(),oldError=image.onerror;f.load(image);oldError();hiddenNative(f);assert.equal(f.doc.querySelector('.bede-color-gallery a').href,cdn+'11.webp');assert.equal(f.doc.querySelector('[role="status"]'),null);
});

test('strict DOM: invalid initial proof stays closed; manual stop restores every original and accessibility attribute',()=>{
  const f=fixture();f.area.setAttribute('inert','original');f.select.setAttribute('name','wrong');const control=f.start();assert.ok(control);hiddenNative(f);assert.match(f.doc.querySelector('[role="status"]').textContent,/Foto indisponível/);
  control.stop();assert.equal(f.area.getAttribute('aria-hidden'),'false');assert.equal(f.area.getAttribute('inert'),'original');assert.equal(f.area.classList.contains('bede-original-color-gallery'),false);assert.deepEqual(f.area.querySelectorAll('.js-product-slide'),f.slides);assert.equal(f.doc.head.children.length,0);assert.equal(f.timers.size,0);protectedFields(f);
});

test('strict single DOM: originals are accessible without inventing a color axis',()=>{
  const f=fixture({single:true});f.start();hiddenNative(f);f.load();assert.equal(f.doc.querySelector('.bede-colors-gallery-nav'),null);assert.deepEqual(f.doc.querySelectorAll('.bede-color-photo-nav button').map(b=>b.getAttribute('data-bede-photo')),['11','10','20']);
  f.doc.querySelector('button[data-bede-photo="20"]').click();f.flush();hiddenNative(f);f.load();assert.equal(f.doc.querySelector('.bede-color-gallery a').href,cdn+'20.webp');protectedFields(f);
});
