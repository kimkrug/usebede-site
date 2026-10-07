'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','store-color-gallery.js'),'utf8');
function fixture({single=false,strict=false,slideIds=['10','11','12','21'],bindImages=null}={}){
  const variants=[{id:1,sku:'p34',product_id:123,option0:'34',option1:'Preto',image:11,available:true},{id:2,sku:'b34',product_id:123,option0:'34',option1:'Bege',image:21,available:false}];
  if(single)variants.forEach((v,i)=>{v.option0=String(34+i);v.option1=null;v.image=11;});
  const rulesVariants=variants.map(v=>({...v}));if(bindImages)variants.forEach((v,i)=>{v.image=bindImages[i];});
  const rule={...(single?{mode:'single',approved:['11','12'],retired:['10','21']}:{axis:1,colors:{Preto:['11','12'],Bege:['21']},retired:['10']}),...(strict&&!single?{gallery:{Preto:['11','12'],Bege:['21']}}:{}),bindings:rulesVariants.map(v=>({id:String(v.id),sku:v.sku,image:String(v.image),options:[v.option0,v.option1,null]}))};
  const timers=new Map(),createdImages=[],observers=[];let timerId=0,doc;
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
  const root=add(doc.body,'div');root.id='single-product';root.setAttribute('data-store','product-detail');root.setAttribute('data-variants',JSON.stringify(variants));add(root,'h1').textContent='Modelo de teste';
  const area=add(root,'div');area.setAttribute('data-store','product-image-123');area.setAttribute('aria-hidden','false');const swiper=add(area,'div','js-swiper-product');
  const slides=slideIds.map(id=>{const s=add(swiper,'div','js-product-slide');s.setAttribute('data-image',id);const a=add(s,'a','js-product-slide-link');a.setAttribute('href','https://dcdn-us.mitiendanube.com/stores/008/137/758/products/'+id+'.webp');add(a,'img');return s;});
  const form=add(root,'form');form.id='product_form';form.setAttribute('data-store','product-form-123');const size=add(form,'select');size.value='34';size.setAttribute('name','variation[0]');const quantity=add(form,'input');quantity.value='1';quantity.setAttribute('name','quantity');const variant=add(form,'input');variant.value='1';variant.setAttribute('name','variant_id');const price=add(form,'span');price.textContent='R$ 100,00';const buy=add(form,'button');buy.textContent='Comprar';
  const group=add(form,'div','js-product-variants-group');group.setAttribute('data-variation-id','1');const select=add(group,'select','js-variation-option');select.setAttribute('name','variation[1]');select.value='Preto';
  const anchors=['Preto','Bege'].map(name=>{const a=add(group,'a','js-insta-variant');a.setAttribute('data-option',name);a.nativeHandler=()=>{select.value=name;};return a;});
  const win={document:doc,URL,console,Map,Set,Object,Array,JSON,setTimeout:(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId;},clearTimeout:id=>timers.delete(id),handlers:{},addEventListener(type,fn){(this.handlers[type]||=[]).push(fn);},removeEventListener(type,fn){this.handlers[type]=(this.handlers[type]||[]).filter(f=>f!==fn);},MutationObserver:class{constructor(fn){this.fn=fn;this.targets=[];observers.push(this);}observe(node,config){this.targets.push({node,config});}disconnect(){this.disconnected=true;}}};win.window=win;
  if(single)group.remove();
  vm.createContext(win);vm.runInContext(source.replace(/const MAP=[\s\S]*?;\s*(?=function imageURL)/,'const MAP='+JSON.stringify({'123':rule})+';\n  '),win);
  function flush(delay=40){let count=0;while([...timers.values()].some(t=>t.delay===delay)){assert.ok(++count<20,'bounded timers');const [id,t]=[...timers.entries()].find(([,v])=>v.delay===delay);timers.delete(id);t.fn();}}
  const pending=()=>createdImages.filter(i=>typeof i.onload==='function').at(-1);
  function load(image=pending()){assert.ok(image);image.complete=true;image.naturalWidth=1024;image.onload?.();}
  return{win,doc,root,area,form,group,select,size,quantity,variant,price,buy,anchors,slides,variants,timers,observers,flush,pending,load,start:()=>win.BedeColorGallery.start(),change:color=>{select.value=color;form.fire('change');flush();},mutate:()=>{observers.forEach(o=>o.fn([]));flush();}};
}
test('gallery: explicit start waits for decoded image before hiding native; same-color thumbnails only',()=>{
  const f=fixture();assert.equal(f.doc.querySelector('.bede-color-gallery'),null);const control=f.start();assert.equal(control,f.start());assert.equal(f.doc.querySelector('.bede-color-gallery'),null);assert.equal(f.area.classList.contains('bede-original-color-gallery'),false);
  f.load();assert.equal(f.doc.querySelectorAll('.bede-color-gallery').length,1);assert.equal(f.area.getAttribute('aria-hidden'),'true');assert.equal(f.area.hasAttribute('inert'),true);const photos=f.doc.querySelectorAll('.bede-color-photo-nav button');assert.deepEqual(photos.map(b=>b.getAttribute('data-bede-photo')),['11','12']);assert.ok(photos.every(b=>b.type==='button'));assert.equal(f.doc.querySelector('.bede-color-gallery a').href.endsWith('/11.webp'),true);assert.deepEqual(f.area.querySelectorAll('.js-product-slide'),f.slides);
});
test('gallery: photo switch changes only image and caption; exact native fields/nodes preserved',()=>{
  const f=fixture();f.start();f.load();const next=f.doc.querySelector('button[data-bede-photo="12"]');next.focus();next.click();f.flush();assert.equal(f.area.classList.contains('bede-original-color-gallery'),false);assert.equal(f.doc.querySelector('.bede-color-gallery'),null);f.load();
  assert.ok(f.doc.querySelector('.bede-color-gallery a').href.endsWith('/12.webp'));assert.equal(f.doc.activeElement.getAttribute('data-bede-photo'),'12');assert.equal(f.select.value,'Preto');assert.equal(f.size.value,'34');assert.equal(f.quantity.value,'1');assert.equal(f.variant.value,'1');assert.equal(f.price.textContent,'R$ 100,00');assert.equal(f.buy.textContent,'Comprar');assert.deepEqual(f.area.querySelectorAll('.js-product-slide'),f.slides);assert.deepEqual(f.anchors.map(a=>a.clicks),[0,0]);
});
test('gallery: color navigation dispatches one native click and shows only that color images',()=>{
  const f=fixture();f.start();f.load();f.doc.querySelector('button[data-color="Bege"]').click();f.flush();assert.equal(f.select.value,'Bege');assert.deepEqual(f.anchors.map(a=>a.clicks),[0,1]);f.load();assert.ok(f.doc.querySelector('.bede-color-gallery a').href.endsWith('/21.webp'));assert.equal(f.doc.querySelector('.bede-color-photo-nav'),null);assert.match(f.doc.querySelector('figcaption').textContent,/Bege/);assert.equal(f.size.value,'34');
});
test('gallery: stale onload/onerror never commit color A after B selected',()=>{
  const f=fixture();f.start();const imageA=f.pending(),oldLoad=imageA.onload,oldError=imageA.onerror;f.change('Bege');const imageB=f.pending();imageA.naturalWidth=1024;oldLoad();assert.equal(f.doc.querySelector('.bede-color-gallery'),null);f.load(imageB);oldError();assert.ok(f.doc.querySelector('.bede-color-gallery a').href.endsWith('/21.webp'));assert.equal(f.area.classList.contains('bede-original-color-gallery'),true);
});
test('gallery: rereads native selection even before its delayed event and does not steal new input focus',()=>{
  const f=fixture();f.start();const a=f.pending();f.select.value='Bege';f.load(a);assert.equal(f.doc.querySelector('.bede-color-gallery'),null);f.flush();f.load();assert.ok(f.doc.querySelector('.bede-color-gallery a').href.endsWith('/21.webp'));
  f.change('Preto');f.load();const next=f.doc.querySelector('button[data-bede-photo="12"]');next.focus();next.click();f.flush();f.quantity.focus();f.load();assert.equal(f.doc.activeElement,f.quantity);
});
test('gallery: image error and bounded timeout restore native without retries or commercial writes',()=>{
  for(const mode of ['error','timeout']){const f=fixture();f.start();if(mode==='error')f.pending().onerror();else f.flush(6000);assert.equal(f.doc.querySelector('.bede-color-gallery'),null);assert.equal(f.area.classList.contains('bede-original-color-gallery'),false);assert.equal(f.area.getAttribute('aria-hidden'),'false');assert.equal(f.select.value,'Preto');assert.equal(f.size.value,'34');assert.equal(f.quantity.value,'1');assert.equal(f.variant.value,'1');assert.equal(f.price.textContent,'R$ 100,00');assert.equal(f.buy.textContent,'Comprar');assert.equal(f.timers.size,0);f.form.fire('change');assert.equal(f.timers.size,0);}
});
test('gallery: unexpected asset or changed binding immediately exposes complete native gallery',()=>{
  for(const mode of ['image','binding']){const f=fixture();f.start();f.load();if(mode==='image')f.slides[0].setAttribute('data-image','99');else{const variants=JSON.parse(f.root.getAttribute('data-variants'));variants[0].sku='unexpected';f.root.setAttribute('data-variants',JSON.stringify(variants));}f.mutate();assert.equal(f.doc.querySelector('.bede-color-gallery'),null);assert.equal(f.area.classList.contains('bede-original-color-gallery'),false);assert.equal(f.area.querySelectorAll('.js-product-slide').length,4);assert.equal(f.select.value,'Preto');}
});
test('gallery: stop is fully reversible, restores original accessibility and cancels pending effects',()=>{
  const f=fixture();f.area.setAttribute('inert','original');const control=f.start();f.load();control.stop();assert.equal(f.area.getAttribute('aria-hidden'),'false');assert.equal(f.area.getAttribute('inert'),'original');assert.equal(f.doc.querySelector('.bede-color-gallery'),null);assert.equal(f.doc.querySelector('.bede-colors-gallery-nav'),null);assert.deepEqual(f.area.querySelectorAll('.js-product-slide'),f.slides);assert.equal(f.doc.head.children.length,0);assert.equal(f.timers.size,0);assert.equal(f.observers[0].disconnected,true);assert.equal(f.win.__bedeColorGallery,undefined);assert.ok(f.start());
});
test('gallery: malformed native color structure fails closed before rendering',()=>{
  const f=fixture();f.select.setAttribute('name','variation[0]');assert.equal(f.start(),null);assert.equal(f.timers.size,0);assert.equal(f.doc.head.children.length,0);
});
test('single gallery: approved photos without artificial color or changes to native sizes',()=>{
  const f=fixture({single:true}),control=f.start();assert.ok(control);f.load();assert.equal(f.doc.querySelector('.bede-colors-gallery-nav'),null);assert.match(f.doc.querySelector('figcaption').textContent,/foto 1 de 2/);assert.doesNotMatch(f.doc.querySelector('figcaption').textContent,/Preto|Bege/);assert.equal(f.doc.querySelectorAll('.bede-color-photo-nav button').length,2);
  f.doc.querySelector('button[data-bede-photo="12"]').click();f.flush();f.load();assert.ok(f.doc.querySelector('.bede-color-gallery a').href.endsWith('/12.webp'));assert.equal(f.size.value,'34');assert.equal(f.quantity.value,'1');assert.equal(f.variant.value,'1');assert.equal(f.price.textContent,'R$ 100,00');
  f.size.value='35';f.form.fire('change');f.flush();if(f.pending())f.load();assert.ok(f.doc.querySelector('.bede-color-gallery'));assert.equal(f.size.value,'35');control.stop();assert.equal(f.area.querySelectorAll('.js-product-slide').length,4);assert.equal(f.area.classList.contains('bede-original-color-gallery'),false);
});
test('single gallery: newly added option axis or color identity restores native gallery',()=>{
  for(const mode of ['axis','variant']){const f=fixture({single:true});f.start();f.load();if(mode==='axis')f.form.appendChild(f.group);else{const v=JSON.parse(f.root.getAttribute('data-variants'));v[0].option1='Preto';f.root.setAttribute('data-variants',JSON.stringify(v));}f.mutate();assert.equal(f.doc.querySelector('.bede-color-gallery'),null);assert.equal(f.area.classList.contains('bede-original-color-gallery'),false);}
});
test('single gallery: failed approved image restores every original without retries',()=>{
  const f=fixture({single:true});f.start();f.pending().onerror();assert.equal(f.doc.querySelector('.bede-color-gallery'),null);assert.equal(f.area.querySelectorAll('.js-product-slide').length,4);assert.equal(f.area.getAttribute('aria-hidden'),'false');assert.equal(f.timers.size,0);
});
test('strict gallery: partial or pre-save native state stays concealed with honest absence',()=>{
  // A retired ID (10) still present: the wrong-colour legacy photo must never return.
  const f=fixture({strict:true,slideIds:['10','11','99']});f.start();f.flush();
  assert.equal(f.area.classList.contains('bede-original-color-gallery'),true);
  assert.equal(f.area.getAttribute('aria-hidden'),'true');
  assert.match(f.doc.querySelector('.bede-color-gallery-status').textContent,/Foto indisponível/);
});
test('strict gallery: fully replaced native photos (new shoot) retire the obsolete rule and show native gallery',()=>{
  const f=fixture({strict:true,slideIds:['501','502','503'],bindImages:[501,503]});const control=f.start();f.flush();
  assert.equal(control,null,'obsolete rule does not attach');
  assert.equal(f.doc.querySelector('.bede-color-gallery'),null);
  assert.equal(f.area.classList.contains('bede-original-color-gallery'),false);
  assert.equal(f.area.getAttribute('aria-hidden'),'false');
  assert.equal(f.area.querySelectorAll('.js-product-slide').length,3);
  assert.equal(f.doc.head.children.length,0);assert.equal(f.timers.size,0);
});
test('strict gallery: replacement arriving after start releases the page to the native gallery',()=>{
  const f=fixture({strict:true});f.start();f.load();
  assert.equal(f.area.classList.contains('bede-original-color-gallery'),true);
  f.slides.forEach((s,i)=>s.setAttribute('data-image',String(700+i)));
  const v=JSON.parse(f.root.getAttribute('data-variants'));v[0].image=700;v[1].image=703;f.root.setAttribute('data-variants',JSON.stringify(v));
  f.mutate();
  assert.equal(f.doc.querySelector('.bede-color-gallery'),null);
  assert.equal(f.area.classList.contains('bede-original-color-gallery'),false);
  assert.equal(f.area.getAttribute('aria-hidden'),'false');
});
