'use strict';
// No browser/network. A small DOM validates the presentation-only contracts.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','store-enhancements.js'),'utf8');
const model=require('../catalog-model.js');
const STORE=model.STORE;
const p=(extra={})=>({id:'real',name:'Scarpin real',url:STORE+'/produtos/scarpin-real/',image:'https://acdn-us.mitiendanube.com/stores/008/137/758/products/real.webp',priceCents:20000,compareAtCents:30000,category:'scarpin',available:true,...extra});
async function fixture(options={}){
  const windowEvents={},documentEvents={},timers=new Map(),observers=[],requests=[];
  let now=1000000, timerId=0, failing=Boolean(options.fail);
  const on=(list,type,callback)=>(list[type]||=[]).push(callback);
  const fire=(list,type,event={})=>(list[type]||[]).forEach(fn=>fn(event));
  function matches(node,selector){
    const tag=selector.match(/^[a-z][\w-]*/i)?.[0];if(tag&&node.tagName!==tag.toUpperCase())return false;
    const id=selector.match(/#([\w-]+)/)?.[1];if(id&&node.id!==id)return false;
    for(const match of selector.matchAll(/\.([\w-]+)/g))if(!node.classList.contains(match[1]))return false;
    for(const match of selector.matchAll(/\[([\w-]+)(?:=["']([^"']*)["'])?\]/g)){
      const value=node.getAttribute(match[1]);if(value===null||(match[2]!==undefined&&value!==match[2]))return false;
    }
    return true;
  }
  class Element{
    constructor(tag,id='',classes=''){this.tagName=tag.toUpperCase();this.id=id;this.className=classes;this.attributes={};this.dataset={};this.children=[];this.parentElement=null;this.hidden=false;this._text='';this._html='';this.value='';
      this.classList={contains:c=>this.className.split(/\s+/).includes(c),add:c=>{if(!this.classList.contains(c))this.className+=' '+c;}};
    }
    get parentNode(){return this.parentElement;}
    get options(){return this.children.filter(c=>c.tagName==='OPTION');}
    set textContent(v){this._text=String(v);this._html='';this.children=[];}
    get textContent(){return this._text+this.children.map(c=>c.textContent).join(' ');}
    set innerHTML(v){this._html=String(v);this._text='';this.children=[];}
    get innerHTML(){return this._html;}
    setAttribute(k,v){this.attributes[k]=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5)]=String(v);}
    getAttribute(k){return this.attributes[k]??null;}
    removeAttribute(k){delete this.attributes[k];}
    remove(){if(this.parentElement){const siblings=this.parentElement.children;siblings.splice(siblings.indexOf(this),1);this.parentElement=null;}}
    appendChild(child){child.remove();child.parentElement=this;this.children.push(child);return child;}
    replaceChildren(...children){this.children.forEach(c=>c.parentElement=null);this.children=[];this._text=this._html='';children.forEach(c=>this.appendChild(c));}
    insertAdjacentElement(position,child){assert.equal(position,'afterend');const parent=this.parentElement;child.remove();child.parentElement=parent;parent.children.splice(parent.children.indexOf(this)+1,0,child);return child;}
    querySelectorAll(selector){const result=[];for(const child of this.children){if(matches(child,selector))result.push(child);result.push(...child.querySelectorAll(selector));}return result;}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    contains(node){return this===node||this.children.some(child=>child.contains(node));}
    closest(selector){for(let node=this;node;node=node.parentElement)if(matches(node,selector))return node;return null;}
  }
  const doc={readyState:'loading',hidden:false,title:'Produtos',head:new Element('head'),body:new Element('body'),
    createElement:tag=>new Element(tag),addEventListener:(type,fn)=>on(documentEvents,type,fn),
    querySelectorAll:selector=>[...doc.head.querySelectorAll(selector),...doc.body.querySelectorAll(selector)],
    querySelector:selector=>doc.querySelectorAll(selector)[0]||null,getElementById:id=>doc.querySelector('#'+id)};
  const add=(id,tag='div',classes='',parent=doc.body)=>parent.appendChild(new Element(tag,id,classes));
  const heading=add('heading','h1');heading.textContent='Produtos';
  const area=add('area');const native=add('native','div','js-product-table',area);native.setAttribute('data-store','category-grid-0');
  const protectedProduct=add('protected-product','article','',native);protectedProduct.setAttribute('data-sku','REAL-35');protectedProduct.setAttribute('data-price','20000');
  const footer=add('footer','footer','',area);footer.textContent='Rodapé intacto';const newsletter=add('newsletter','aside','',area);
  const pagerClasses='row justify-content-center align-items-center mt-4';
  const pager=add('store-pager','div',pagerClasses,area);const next=add('store-next','a','p-2',pager);next.setAttribute('href','/produtos/page/2/');next.textContent='2';
  const outsidePager=add('outside-pager','div',pagerClasses);const outsideNext=add('outside-next','a','p-2',outsidePager);outsideNext.setAttribute('href','/produtos/page/2/');
  const otherRow=add('other-row','div',pagerClasses,area);const helpLink=add('other-link','a','',otherRow);helpLink.setAttribute('href','/ajuda/');
  const variants=add('variants','div','js-product-variants');
  const group=add('sizes','div','js-product-variants-group',variants);
  add('sizes-label','label','',group).textContent='Tamanho';
  const select=add('sizes-select','select','js-variation-option',group);
  const selectOrder=options.sortedSelect?[34,35,36,37,38,39]:[38,34,39,37,36,35];
  selectOrder.forEach(v=>{const option=add('size-'+v,'option','',select);option.value=String(v);option.nativeMarker={size:v};});select.value='37';
  const buttonGroup=add('buttons','div','',group);
  [39,35,38,34,36,37].forEach(v=>{const button=add('button-'+v,'a','js-insta-variant',buttonGroup);button.setAttribute('data-option',v);button.nativeHandler={size:v};});
  const colors=add('colors','div','js-product-variants-group',variants),colorSelect=add('color-select','select','js-variation-option',colors);
  add('colors-label','label','',colors).textContent='Cor';
  ['Marrom','Preto'].forEach(v=>{const option=add('color-'+v,'option','',colorSelect);option.value=v;});colorSelect.value='Preto';
  const subtotalParent=add('subtotal-parent');const subtotal=add('subtotal','span','js-cart-subtotal',subtotalParent);subtotal.setAttribute('data-priceraw',options.subtotal??49900);
  const originalOptions=select.options.slice(),originalButtons=buttonGroup.children.slice(),originalProduct={...protectedProduct.attributes};
  class FakeDate extends Date{static now(){return now;}}
  const products=options.products||[p()],originalProducts=JSON.parse(JSON.stringify(products));
  const context={document:doc,URL,Date:FakeDate,Set,Number,console,AbortSignal,
    location:new URL(STORE+(options.regular?'/produtos/':'/produtos/?bede_ofertas=1')),
    CFG_LOJA:{freteGratisAcimaDe:599,freteGratisRegioes:['Sul','Sudeste']},
    BedeCatalog:options.noModel?undefined:model,
    MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(target,config){this.target=target;this.config=config;}},
    addEventListener:(type,fn)=>on(windowEvents,type,fn),
    setTimeout:(callback,delay)=>{const id=++timerId;timers.set(id,{callback,at:now+delay});return id;},clearTimeout:id=>timers.delete(id),
    fetch:async(url,init)=>{requests.push({url,init});return{ok:!failing,json:async()=>({products,...(options.noTimestamp?{}:{startedAt:new Date(now-(options.age||0)).toISOString(),fetchedAt:new Date(now-(options.age||0)).toISOString()})})};},
    localStorage:{getItem(){throw new Error('Não usar carrinho local');},setItem(){throw new Error('Não gravar carrinho local');}}
  };context.window=context;vm.createContext(context);vm.runInContext(source,context);fire(documentEvents,'DOMContentLoaded');
  const settle=()=>new Promise(resolve=>setImmediate(resolve));await settle();
  async function tick(ms){now+=ms;let count=0;while(true){const due=[...timers].find(([,t])=>t.at<=now);if(!due)break;if(++count>100)throw new Error('Timer loop');timers.delete(due[0]);due[1].callback();await settle();}}
  return{doc,context,get:doc.getElementById,add,native,footer,newsletter,select,buttonGroup,colorSelect,subtotal,requests,products,originalProducts,originalOptions,originalButtons,protectedProduct,originalProduct,observers,
    settle,tick,windowEvent:(type,event)=>fire(windowEvents,type,event),documentEvent:type=>fire(documentEvents,type),
    mutate:()=>observers.forEach(o=>o.callback([])),fail:()=>{failing=true;}};
}

test('store: tamanhos ordenados preservam objetos nativos, seleção e atributos comerciais',async()=>{
  const f=await fixture();
  assert.deepEqual(f.select.options.map(o=>o.value),['34','35','36','37','38','39']);assert.equal(f.select.value,'37');
  assert.deepEqual(f.buttonGroup.children.map(b=>b.dataset.option),['34','35','36','37','38','39']);
  assert.ok(f.select.options.every(o=>f.originalOptions.includes(o)&&o.nativeMarker));assert.ok(f.buttonGroup.children.every(b=>f.originalButtons.includes(b)&&b.nativeHandler));
  assert.deepEqual(f.colorSelect.options.map(o=>o.value),['Marrom','Preto']);assert.equal(f.colorSelect.value,'Preto');
  assert.deepEqual(f.protectedProduct.attributes,f.originalProduct);assert.deepEqual(f.products,f.originalProducts);
});
test('store: botões são ordenados mesmo quando select já está crescente',async()=>{
  const f=await fixture({sortedSelect:true});assert.deepEqual(f.buttonGroup.children.map(b=>b.dataset.option),['34','35','36','37','38','39']);
});
test('store: não duplica menu nativo e ajuda não intercepta compra',async()=>{
  const f=await fixture();assert.equal(f.get('bede-category-access'),null);
  assert.ok(f.get('bede-product-help').children.every(a=>a.href.startsWith('https://www.usebede.com.br/')));
  // The sole permitted click is the guarded initial native gallery thumbnail.
  assert.equal((source.match(/fresh\.thumb\.click\(\);/g)||[]).length,1);
  assert.doesNotMatch(source.replace('fresh.thumb.click();',''),/\.dispatchEvent\(|\.click\(|localStorage|shop_func\.php|\.stock\s*=(?!=)|priceCents\s*=(?!=)/);
});
test('store: ofertas escondem apenas grade nativa, preservando irmãos e rodapé',async()=>{
  const f=await fixture();assert.equal(f.native.hidden,true);assert.equal(f.footer.hidden,false);assert.equal(f.newsletter.hidden,false);assert.equal(f.get('area').hidden,false);
  assert.equal(f.footer.textContent,'Rodapé intacto');assert.ok(f.native.children.includes(f.protectedProduct));
  assert.equal(f.get('bede-offers').parentElement,f.get('area'));assert.match(f.get('bede-offers-content').innerHTML,/200,00/);
  assert.equal(f.get('store-pager').hidden,true);assert.equal(f.get('outside-pager').hidden,false);assert.equal(f.get('other-row').hidden,false);
  assert.equal(f.get('store-next').getAttribute('href'),'/produtos/page/2/','link nativo permanece, apenas oculto em ofertas');
});
test('store: falta de modelo, feed ou timestamp falha fechada sem promover catálogo comum',async()=>{
  for(const options of [{noModel:true},{fail:true},{noTimestamp:true},{age:150000},{products:[p(),p()]}]){
    const f=await fixture(options);assert.equal(f.native.hidden,true);assert.equal(f.get('bede-offers-content').innerHTML,'');assert.match(f.get('bede-offers-content').textContent,/Não foi possível/);
    assert.equal(f.get('bede-offers-content').children.at(-1).href,STORE+'/produtos/');
  }
});
test('store: seleção contém apenas promoções explícitas disponíveis e vazia é clara',async()=>{
  const f=await fixture({products:[p(),p({id:'regular',compareAtCents:null}),p({id:'unavailable',available:false})]});
  assert.equal((f.get('bede-offers-content').innerHTML.match(/class="bede-offer-card"/g)||[]).length,1);
  assert.ok(f.requests.every(r=>r.init.method==='GET'&&r.init.credentials==='omit'&&!r.init.body));
  const empty=await fixture({products:[p({compareAtCents:null,discountPix:5})]});assert.match(empty.get('bede-offers-content').textContent,/Nenhuma oferta no momento/);
});
test('store: ofertas vencem em150s; retry, BFCache e visibilidade não causam flood',async()=>{
  const f=await fixture({age:149000});await f.tick(1000);assert.equal(f.get('bede-offers-content').innerHTML,'');assert.equal(f.requests.length,1);
  f.windowEvent('pagehide',{persisted:true});f.windowEvent('pageshow',{persisted:true});for(let i=0;i<10;i++)f.documentEvent('visibilitychange');
  await f.tick(19000);assert.equal(f.requests.length,2);
  f.doc.hidden=true;f.documentEvent('visibilitychange');await f.tick(240000);assert.equal(f.requests.length,2);
  f.doc.hidden=false;f.documentEvent('visibilitychange');assert.equal(f.get('bede-offers-content').innerHTML,'');await f.settle();assert.equal(f.requests.length,3);
});
test('store: atualização visível em120s não conserva ofertas antigas na falha',async()=>{
  const f=await fixture();f.fail();await f.tick(120000);assert.equal(f.requests.length,2);assert.equal(f.get('bede-offers-content').innerHTML,'');assert.match(f.get('bede-offers-content').textContent,/Não foi possível/);
});
test('store: frete lê subtotal nativo, explicita condições e remove aviso inválido',async()=>{
  const f=await fixture({regular:true});assert.match(f.get('bede-shipping-progress').textContent,/Faltam R\$\s*100,00/);assert.match(f.get('bede-shipping-progress').textContent,/Sul e Sudeste, em PAC ou Jadlog Econômico/);
  assert.equal(f.subtotal.getAttribute('data-priceraw'),'49900');f.subtotal.setAttribute('data-priceraw','60000');f.mutate();await f.tick(50);assert.match(f.get('bede-shipping-progress').textContent,/atingiu o valor mínimo/);
  f.subtotal.setAttribute('data-priceraw','inválido');f.mutate();await f.tick(50);assert.equal(f.get('bede-shipping-progress'),null);assert.equal(f.requests.length,0);
  assert.equal(f.observers[0].target,f.doc.body,'observa também substituição nativa do subtotal');
});
test('store: nova carga do script não duplica interface nem observadores',async()=>{
  const f=await fixture();const styles=f.doc.head.children.length,count=f.observers.length;vm.runInContext(source,f.context);assert.equal(f.doc.head.children.length,styles);assert.equal(f.observers.length,count);assert.equal(f.requests.length,1);
});
