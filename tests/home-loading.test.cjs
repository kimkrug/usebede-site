'use strict';
// Offline DOM/network fixtures: no live fetch, publication or catalogue writes.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const model=require('../catalog-model');
const source=fs.readFileSync(path.resolve(__dirname,'../home-app.js'),'utf8');
const product=(id='a',priceCents=19990)=>({id,name:'Scarpin '+id,url:model.STORE+'/produtos/scarpin-'+id+'/',image:'https://dcdn-us.mitiendanube.com/stores/008/137/758/products/'+id+'.webp',category:'scarpin',priceCents,compareAtCents:null,available:true});
async function fixture(){
  let now=1000000,timerId=0;const timers=new Map(),requests=[],events={},docEvents={};
  const listen=(target,type,fn)=>(target[type]||=[]).push(fn);
  const emit=(target,type,event={})=>(target[type]||[]).forEach(fn=>fn({target:doc.body,...event}));
  function matches(node,selector){
    if(selector.includes('dialog')||selector.includes('details')||selector.includes('[contenteditable'))return false;
    if(selector.startsWith('#'))return node.id===selector.slice(1);
    if(selector.startsWith('.'))return node.classList.contains(selector.slice(1));
    if(selector==='a[href^="https://wa.me/"]')return node.tagName==='A'&&String(node.href).startsWith('https://wa.me/');
    return node.tagName.toLowerCase()===selector;
  }
  class Element{
    constructor(tag='div',id='',classes=''){this.tagName=tag.toUpperCase();this.id=id;this.className=classes;this.children=[];this.parentElement=this.parentNode=null;this.attributes={};this.dataset={};this.events={};this.hidden=false;this.inert=false;this.nodeType=1;this._text=this._html='';this.scrollTop=this.scrollLeft=0;this.scrollWidth=this.clientWidth=600;this.scrollHeight=this.clientHeight=600;this.style={setProperty(k,v){this[k]=v;}};
      this.classList={contains:c=>this.className.split(/\s+/).includes(c),add:c=>{if(!this.classList.contains(c))this.className+=' '+c;},remove:c=>{this.className=this.className.split(/\s+/).filter(v=>v!==c).join(' ');},toggle:(c,force)=>{this.classList[force??!this.classList.contains(c)?'add':'remove'](c);}};
    }
    set textContent(v){this._text=String(v);this._html='';this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent).join(' ');}
    set innerHTML(v){this._html=String(v);this._text='';this.children=[];}get innerHTML(){return this._html;}
    setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k]??null;}removeAttribute(k){delete this.attributes[k];}
    appendChild(child){child.parentElement=child.parentNode=this;this.children.push(child);return child;}
    insertBefore(child,before){child.parentElement=child.parentNode=this;this.children.splice(this.children.indexOf(before),0,child);return child;}
    replaceChildren(...children){this.children.forEach(c=>c.parentElement=c.parentNode=null);this.children=[];this._text=this._html='';children.forEach(c=>this.appendChild(c));}
    querySelectorAll(selector){const results=[],parts=selector.split(' ');for(const child of this.children){if(matches(child,parts.at(-1))&&(parts.length===1||child.parentElement.closest(parts.slice(0,-1).join(' '))))results.push(child);results.push(...child.querySelectorAll(selector));}return results;}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    contains(child){return child===this||this.children.some(c=>c.contains(child));}closest(selector){for(let n=this;n;n=n.parentElement)if(selector.split(',').some(s=>matches(n,s.trim())))return n;return null;}
    addEventListener(type,fn){listen(this.events,type,fn);}focus(options){this.focusOptions=options;this.focusCount=(this.focusCount||0)+1;doc.activeElement=this;}scrollBy({left}){this.scrollLeft+=left;}
  }
  const doc={hidden:false,readyState:'loading',createElement:tag=>new Element(tag),addEventListener:(type,fn)=>listen(docEvents,type,fn)};
  doc.documentElement=new Element('html');doc.body=new Element('body');doc.documentElement.appendChild(doc.body);doc.activeElement=doc.body;
  doc.querySelectorAll=selector=>doc.body.querySelectorAll(selector);doc.querySelector=selector=>doc.body.querySelector(selector);doc.getElementById=id=>doc.body.querySelector('#'+id);
  const add=(id,tag='div',classes='',parent=doc.body)=>parent.appendChild(new Element(tag,id,classes));
  const track=add('slidesTrack');const slides=Array.from({length:8},(_,i)=>add('slide'+i,'section','v-slide',track));
  ['emAltaRail','tiposRail','tabsRail'].forEach(id=>add(id));add('slideSaleBtn','a','',slides[4]);
  class TestDate extends Date{static now(){return now;}}
  const context={document:doc,URL,Intl,Set,AbortController,Date:TestDate,console,BedeCatalog:model,innerHeight:844,
    location:new URL('https://www.usebede.com.br/'),matchMedia:()=>({matches:true,addEventListener(){}}),getComputedStyle:element=>({overflowY:element.style.overflowY||'visible'}),
    addEventListener:(type,fn)=>listen(events,type,fn),setTimeout:(fn,delay)=>{const id=++timerId;timers.set(id,{fn,at:now+delay});return id;},clearTimeout:id=>timers.delete(id),setInterval(){throw new Error('reduced motion must suppress autoplay');},clearInterval(){},
    localStorage:{getItem(){throw new Error('stale local cache is forbidden');},setItem(){throw new Error('no storage writes');}},
    fetch:(url,init)=>new Promise((resolve,reject)=>requests.push({url,init,resolve,reject}))};context.window=context;
  vm.createContext(context);vm.runInContext(source,context);emit(docEvents,'DOMContentLoaded');
  const settle=()=>new Promise(resolve=>setImmediate(resolve));await settle();
  async function tick(ms){now+=ms;for(let i=0;i<100;i++){const due=[...timers].find(([,t])=>t.at<=now);if(!due)return;timers.delete(due[0]);due[1].fn();await settle();}throw new Error('timer loop');}
  const payload=(products=[product()],extra={})=>({products,startedAt:new Date(now).toISOString(),fetchedAt:new Date(now).toISOString(),...extra});
  const reply=(i,data=payload(),extra={})=>requests[i].resolve({ok:true,json:async()=>data,...extra});
  return{doc,context,requests,slides,get:doc.getElementById,payload,reply,tick,settle,event:(type,event)=>emit(events,type,event),visibility(hidden){doc.hidden=hidden;emit(docEvents,'visibilitychange');},click(node){emit(node.events,'click',{target:node});}};
}

test('home loading reserves four neutral cards per rail and provides a real store exit immediately',async()=>{
  const f=await fixture();assert.equal(f.requests.length,1);assert.equal(f.requests[0].url,'/api/catalogo');assert.equal(f.requests[0].init.method,'GET');assert.equal(f.requests[0].init.body,undefined);
  for(const id of ['emAltaRail','tiposRail','tabsRail']){
    const rail=f.get(id),skeletons=rail.querySelector('.home-catalog-skeletons');
    assert.equal(rail.getAttribute('data-catalog-state'),'loading');assert.equal(rail.getAttribute('aria-busy'),'true');
    assert.equal(skeletons.getAttribute('aria-hidden'),'true');assert.equal(skeletons.querySelectorAll('.home-catalog-skeleton').length,4);
    assert.equal(skeletons.querySelectorAll('.home-catalog-skeleton-image').length,4);assert.equal(skeletons.querySelector('img'),null);assert.equal(skeletons.querySelector('a'),null);assert.equal(skeletons.textContent.trim(),'');
    const meta=rail.querySelector('.home-catalog-loading-meta');assert.equal(meta.getAttribute('role'),'status');assert.ok(meta.querySelector('a').href.startsWith(model.STORE+'/'));assert.doesNotMatch(rail.textContent,/R\$|Esgotado/);
  }
  f.context.goToSlide(1,true);assert.equal(f.get('slidesTrack').style.transform,'translateY(-100%)');assert.equal(f.requests.length,1);
});

test('home fresh response replaces skeletons with the exact matching name, image and price',async()=>{
  const f=await fixture(),p=product('original',19590),before=JSON.stringify(p);f.reply(0,f.payload([p]));await f.settle();
  const rail=f.get('emAltaRail');assert.equal(rail.getAttribute('data-catalog-state'),'ready');assert.equal(rail.getAttribute('aria-busy'),'false');assert.equal(rail.querySelector('.home-catalog-loading'),null);
  assert.ok(rail.innerHTML.includes(p.image));assert.ok(rail.innerHTML.includes(p.name));assert.match(rail.innerHTML,/195,90/);assert.equal(JSON.stringify(p),before);
});

test('home valid empty response, invalid source and network error remain distinct states',async()=>{
  const empty=await fixture();empty.reply(0,empty.payload([]));await empty.settle();assert.equal(empty.get('emAltaRail').getAttribute('data-catalog-state'),'empty');assert.match(empty.get('emAltaRail').textContent,/Nenhum modelo disponível/);assert.equal(empty.get('emAltaRail').querySelector('.home-catalog-retry'),null);
  for(const data of [{products:[]},{products:null}]){const f=await fixture();f.reply(0,data);await f.settle();assert.equal(f.get('emAltaRail').getAttribute('data-catalog-state'),'error');assert.equal(f.get('emAltaRail').innerHTML,'');}
  const failed=await fixture();failed.requests[0].reject(new Error('network'));await failed.settle();const rail=failed.get('emAltaRail');assert.equal(rail.getAttribute('data-catalog-state'),'error');assert.equal(rail.getAttribute('aria-busy'),'false');assert.match(rail.textContent,/Não foi possível/);assert.ok(rail.querySelector('.home-catalog-retry'));assert.equal(rail.querySelector('a').href,model.STORE+'/produtos/');
});

test('home deadline ends loading even when fetch ignores abort and late success cannot replace a retry',async()=>{
  const f=await fixture();await f.tick(20000);assert.equal(f.requests[0].init.signal.aborted,true);assert.equal(f.get('emAltaRail').getAttribute('data-catalog-state'),'error');
  const retry=f.get('emAltaRail').querySelector('.home-catalog-retry');f.click(retry);f.click(retry);assert.equal(f.requests.length,2);
  f.reply(1,f.payload([product('fresh',29990)]));await f.settle();f.reply(0,f.payload([product('late',100)]));await f.settle();
  assert.match(f.get('emAltaRail').innerHTML,/299,90/);assert.doesNotMatch(f.get('emAltaRail').innerHTML,/late|1,00/);assert.equal(f.get('emAltaRail').getAttribute('data-catalog-state'),'ready');
});

test('home hidden-page cancellation prevents the former request from overwriting fresh resumed data',async()=>{
  const f=await fixture();f.visibility(true);assert.equal(f.requests[0].init.signal.aborted,true);f.visibility(false);for(let i=0;i<5;i++)f.visibility(false);assert.equal(f.requests.length,1);
  await f.tick(20000);assert.equal(f.requests.length,2);f.reply(1,f.payload([product('resumed',39990)]));await f.settle();
  f.reply(0,f.payload([product('cancelled',100)]));await f.settle();assert.match(f.get('emAltaRail').innerHTML,/resumed/);assert.doesNotMatch(f.get('emAltaRail').innerHTML,/cancelled/);
});

test('home brief tab return reuses only current memory without a new skeleton or request',async()=>{
  const f=await fixture();f.reply(0,f.payload([product('current',19590)]));await f.settle();
  const rail=f.get('emAltaRail'),html=rail.innerHTML;
  await f.tick(5000);f.visibility(true);await f.tick(10000);f.visibility(false);
  for(let i=0;i<5;i++)f.visibility(false);
  assert.equal(f.requests.length,1);assert.equal(rail.innerHTML,html);assert.equal(rail.getAttribute('data-catalog-state'),'ready');
  await f.tick(104999);assert.equal(f.requests.length,1);
  await f.tick(1);assert.equal(f.requests.length,2);assert.equal(rail.getAttribute('data-catalog-state'),'loading');
});

test('home tab return never extends the original source expiry or shows expired prices',async()=>{
  const f=await fixture(),now=Date.parse(f.payload().startedAt);
  f.reply(0,f.payload([product('near-expiry',19590)],{startedAt:new Date(now-140000).toISOString()}));await f.settle();
  f.visibility(true);await f.tick(11000);f.visibility(false);
  assert.equal(f.get('emAltaRail').innerHTML,'');assert.equal(f.get('emAltaRail').getAttribute('data-catalog-state'),'loading');
  assert.equal(f.requests.length,1);await f.tick(9000);assert.equal(f.requests.length,2);
});

test('home BFCache invalidation also rejects a late response body after headers already arrived',async()=>{
  const f=await fixture();let finishBody;f.reply(0,null,{json:()=>new Promise(resolve=>{finishBody=resolve;})});await f.settle();
  f.event('pagehide',{persisted:true});assert.equal(f.requests[0].init.signal.aborted,true);f.event('pageshow',{persisted:true});await f.tick(20000);
  assert.equal(f.requests.length,2);f.reply(1,f.payload([product('new-body')]));await f.settle();finishBody(f.payload([product('old-body')]));await f.settle();assert.match(f.get('emAltaRail').innerHTML,/new-body/);assert.doesNotMatch(f.get('emAltaRail').innerHTML,/old-body/);
});

test('home refresh removes previous prices and error retry respects the shared minimum interval',async()=>{
  const f=await fixture();f.reply(0,f.payload([product('previous',19990)]));await f.settle();await f.tick(120000);
  assert.equal(f.requests.length,2);assert.equal(f.get('emAltaRail').getAttribute('data-catalog-state'),'loading');assert.equal(f.get('emAltaRail').innerHTML,'');assert.doesNotMatch(f.get('emAltaRail').textContent,/previous|199,90/);
  f.requests[1].reject(new Error('network'));await f.settle();const retry=f.get('emAltaRail').querySelector('.home-catalog-retry');f.click(retry);for(let i=0;i<4;i++)f.click(retry);assert.equal(f.requests.length,2);
  await f.tick(19999);assert.equal(f.requests.length,2);await f.tick(1);assert.equal(f.requests.length,3);assert.equal(f.get('emAltaRail').getAttribute('data-catalog-state'),'loading');
});

test('home category loading keeps its own native destination and cannot borrow a different category photo',async()=>{
  const f=await fixture();f.context.switchCategoryTab('Bota');assert.match(f.get('tabsRail').querySelector('a').href,/search\/\?q=Bota$/);
  assert.equal(f.get('tabsRail').querySelector('img'),null);f.reply(0,f.payload([product('scarpin-only')]));await f.settle();
  assert.equal(f.get('tabsRail').getAttribute('data-catalog-state'),'empty');assert.equal(f.get('tabsRail').innerHTML,'');assert.doesNotMatch(f.get('tabsRail').textContent,/scarpin-only/);
});

test('home retry keeps focused keyboard users on the same rail without scrolling the fullpage',async()=>{
  const f=await fixture();f.requests[0].reject(new Error('network'));await f.settle();
  const rail=f.get('emAltaRail'),retry=rail.querySelector('.home-catalog-retry');rail.setAttribute('tabindex','0');retry.focus();f.click(retry);
  assert.equal(f.doc.activeElement,rail);assert.equal(rail.focusOptions.preventScroll,true);assert.equal(rail.getAttribute('tabindex'),'0');assert.equal(rail.getAttribute('data-catalog-state'),'loading');
  assert.equal(f.get('slidesTrack').style.transform,'translateY(-0%)');assert.equal(f.get('tiposRail').focusCount||0,0);assert.equal(f.get('tabsRail').focusCount||0,0);
  await f.tick(20000);f.reply(1);await f.settle();assert.equal(f.doc.activeElement,rail);assert.equal(rail.focusCount,1);
});

test('home loading, success and error preserve external focus instead of stealing it',async()=>{
  const f=await fixture(),external=f.doc.createElement('button');f.doc.body.appendChild(external);external.focus();f.reply(0);await f.settle();assert.equal(f.doc.activeElement,external);
  await f.tick(120000);assert.equal(f.doc.activeElement,external);f.requests[1].reject(new Error('network'));await f.settle();assert.equal(f.doc.activeElement,external);
  for(const id of ['emAltaRail','tiposRail','tabsRail'])assert.equal(f.get(id).focusCount||0,0);
});

test('home replaces a focused loading link safely on ready and empty outcomes, adding no sequential tab stop',async()=>{
  for(const [railId,products,expected] of [['emAltaRail',[product()],'ready'],['tiposRail',[product()],'ready'],['tabsRail',[],'empty']]){
    const f=await fixture(),rail=f.get(railId),link=rail.querySelector('a');link.focus();f.reply(0,f.payload(products));await f.settle();
    assert.equal(f.doc.activeElement,rail);assert.equal(rail.focusOptions.preventScroll,true);assert.equal(rail.getAttribute('tabindex'),'-1');assert.equal(rail.getAttribute('data-catalog-state'),expected);assert.equal(rail.focusCount,1);
  }
});
