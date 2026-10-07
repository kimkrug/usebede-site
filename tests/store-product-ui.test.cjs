'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','store-product-ui.js'),'utf8');
function fixture(options={}){
  const timers=new Map(),observers=[];let sequence=0;
  function matches(node,selector){
    const tag=selector.match(/^[a-z][\w-]*/i)?.[0];if(tag&&node.tagName!==tag.toUpperCase())return false;
    const id=selector.match(/#([\w-]+)/)?.[1];if(id&&node.id!==id)return false;
    for(const m of selector.matchAll(/\.([\w-]+)/g))if(!node.classList.contains(m[1]))return false;
    for(const m of selector.matchAll(/\[([\w-]+)(?:=["']([^"']*)["'])?\]/g))if(!node.hasAttribute(m[1])||(m[2]!==undefined&&node.getAttribute(m[1])!==m[2]))return false;
    return true;
  }
  class Element{
    constructor(tag,classes=''){this.tagName=tag.toUpperCase();this.className=classes;this.id='';this.children=[];this.parentElement=null;this.attributes={};this.handlers={};this._text='';this.value='';this.clicks=0;
      this.classList={contains:c=>this.className.split(/\s+/).includes(c),add:c=>{if(!this.classList.contains(c))this.className+=' '+c;},remove:c=>{this.className=this.className.split(/\s+/).filter(v=>v!==c).join(' ');}};
      const props=new Map();this.style={setProperty:(n,v)=>props.set(n,v),removeProperty:n=>props.delete(n),getPropertyValue:n=>props.get(n)||'',[Symbol.iterator]:()=>props.keys()};
    }
    get options(){return this.children.filter(c=>c.tagName==='OPTION');}
    set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent).join(' ');}
    setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k]??null;}hasAttribute(k){return k in this.attributes;}
    appendChild(child){this.children.push(child);child.parentElement=this;return child;}
    querySelectorAll(selector){const result=[];for(const child of this.children){if(matches(child,selector))result.push(child);result.push(...child.querySelectorAll(selector));}return result;}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    closest(selector){for(let n=this;n;n=n.parentElement)if(matches(n,selector))return n;return null;}
    contains(node){return node===this||this.children.some(c=>c.contains(node));}
    addEventListener(type,fn){(this.handlers[type]||=[]).push(fn);}removeEventListener(type,fn){this.handlers[type]=(this.handlers[type]||[]).filter(f=>f!==fn);}
    fire(type,event){for(const fn of this.handlers[type]||[])fn(event);}
    click(){this.clicks++;this.nativeHandler?.();}
  }
  const doc=new Element('document');doc.readyState=options.loading?'loading':'complete';doc.head=doc.appendChild(new Element('head'));doc.body=doc.appendChild(new Element('body'));doc.createElement=tag=>new Element(tag);doc.getElementById=id=>doc.querySelector('#'+id);
  const add=(parent,tag,classes='')=>parent.appendChild(new Element(tag,classes));
  const product=add(doc.body,'div');product.id=options.noPDP?'other':'single-product';product.setAttribute('data-store','product-detail');
  const form=add(product,'form');form.id='product_form';form.setAttribute('action','/comprar/');form.setAttribute('data-store','product-form-123');
  const price=add(product,'span');price.textContent='R$ 195,90';const stock=add(form,'input');stock.value='1';stock.setAttribute('name','quantity');
  function group(name,axis,colors,href){
    const group=add(form,'div','js-product-variants-group');group.setAttribute('data-variation-id',axis);add(group,'label','form-label').textContent=name;
    const select=add(group,'select','js-variation-option');select.setAttribute('name','variation['+axis+']');
    const anchors=colors.map((color,index)=>{const option=add(select,'option');option.value=color;option.setAttribute('data-native-sku','SKU-'+axis+'-'+index);
      const a=add(group,'a','js-insta-variant btn btn-variant btn-variant-color p-0'+(index===0?' selected':''));a.setAttribute('data-option',color);a.setAttribute('data-variation-id',axis);a.setAttribute('title',color);if(href!==undefined)a.setAttribute('href',href);
      const content=add(a,'span','btn-variant-content');content.setAttribute('data-name',color);content.style.setProperty('background','#123456');content.style.setProperty('border','1px solid #eee');content.style.setProperty('opacity','.9');a.nativeHandler=()=>{select.value=color;};return a;
    });select.value=colors[0];return{group,select,anchors};
  }
  const sizes=group('Tamanho','0',['34','35']),colors=group(options.colorLabel||'Cor','1',['Dourada','Prata'],options.href);
  const context={document:doc,console,WeakMap,Map,Set,Array,globalThis:null,setTimeout:(fn)=>{timers.set(++sequence,fn);return sequence;},clearTimeout:id=>timers.delete(id),MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(node,config){this.node=node;this.config=config;}disconnect(){this.disconnected=true;}}};context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(source,context);
  function key(type,anchor,key,extra={}){const event={target:anchor,key,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...extra};product.fire(type,event);return event;}
  function flush(){for(let n=0;timers.size;n++){assert.ok(n<10,'bounded refresh');const [id,fn]=timers.entries().next().value;timers.delete(id);fn();}}
  return{context,doc,product,form,colors,sizes,price,stock,observers,key,flush,start:()=>context.BedeProductUI.start(),ready:()=>doc.fire('DOMContentLoaded',{}),mutate:records=>observers.forEach(o=>o.fn(records)),timers};
}
test('product UI: UMD load performs no DOM writes; explicit start is idempotent',()=>{
  const f=fixture();assert.equal(f.doc.getElementById('bede-product-ui-style'),null);assert.equal(f.colors.anchors[0].querySelector('.btn-variant-content').textContent,'');
  const a=f.start(),b=f.start();assert.equal(a,b);assert.equal(f.doc.querySelectorAll('#bede-product-ui-style').length,1);assert.equal(f.observers.length,1);
});
test('product UI: writes exact color names, preserves anchors, selects, values, handlers and commercial fields',()=>{
  const f=fixture(),anchors=f.colors.anchors.slice(),options=f.colors.select.options.slice();f.start();
  assert.equal(f.colors.select.value,'Dourada');assert.equal(f.stock.value,'1');assert.equal(f.price.textContent,'R$ 195,90');assert.equal(f.form.getAttribute('action'),'/comprar/');
  anchors.forEach((anchor,i)=>{assert.equal(f.colors.anchors[i],anchor);assert.equal(f.colors.select.options[i],options[i]);assert.ok(anchor.nativeHandler);assert.equal(anchor.getAttribute('data-option'),['Dourada','Prata'][i]);assert.equal(anchor.querySelector('.btn-variant-content').textContent,anchor.getAttribute('data-option'));assert.equal(anchor.classList.contains('btn-variant-color'),false);assert.equal(anchor.querySelector('.btn-variant-content').style.getPropertyValue('background'),'');assert.equal(anchor.querySelector('.btn-variant-content').style.getPropertyValue('border'),'');assert.equal(anchor.querySelector('.btn-variant-content').style.getPropertyValue('opacity'),'.9');});
  assert.equal(f.sizes.anchors[0].classList.contains('btn-variant-color'),true);assert.equal(f.sizes.select.value,'34');
});
test('product UI: does not invent a color axis or accept inconsistent variant identity',()=>{
  const f=fixture({colorLabel:'Acabamento'});f.start();assert.equal(f.colors.anchors[0].classList.contains('bede-color-name'),false);
  const g=fixture();g.colors.anchors[1].setAttribute('data-variation-id','0');g.start();assert.equal(g.colors.anchors[0].classList.contains('bede-color-name'),false);
  const h=fixture();h.colors.anchors[1].setAttribute('data-option','UNKNOWN');h.start();assert.equal(h.colors.anchors[0].classList.contains('bede-color-name'),false);
});
test('product UI: Enter/Space on anchors without href dispatch exactly one native option click',()=>{
  const f=fixture();f.start();const anchor=f.colors.anchors[1];
  assert.equal(anchor.getAttribute('role'),'button');assert.equal(anchor.getAttribute('tabindex'),'0');
  assert.equal(f.key('keydown',anchor,'Enter').defaultPrevented,true);assert.equal(anchor.clicks,1);assert.equal(f.colors.select.value,'Prata');
  f.key('keydown',anchor,'Enter',{repeat:true});assert.equal(anchor.clicks,1);
  f.key('keydown',anchor,' ');f.key('keydown',anchor,' ',{repeat:true});assert.equal(anchor.clicks,1);f.key('keyup',anchor,' ');assert.equal(anchor.clicks,2);f.key('keyup',anchor,' ');assert.equal(anchor.clicks,2);
});
test('product UI: href anchors keep native Enter, while Space activates once without scrolling',()=>{
  const f=fixture({href:'#'});f.start();const anchor=f.colors.anchors[1];
  assert.equal(anchor.getAttribute('href'),'#');assert.equal(anchor.getAttribute('role'),null);assert.equal(anchor.getAttribute('tabindex'),null);
  assert.equal(f.key('keydown',anchor,'Enter').defaultPrevented,false);assert.equal(anchor.clicks,0,'browser owns the Enter click');
  f.key('keydown',anchor,' ');f.key('keyup',anchor,' ');assert.equal(anchor.clicks,1);
});
test('product UI: prevents duplicate handled keys; disabled controls and focus loss never activate',()=>{
  const f=fixture();f.start();const anchor=f.colors.anchors[1];
  f.key('keydown',anchor,'Enter',{defaultPrevented:true});f.key('keydown',anchor,'Enter',{ctrlKey:true});assert.equal(anchor.clicks,0);
  anchor.setAttribute('aria-disabled','true');f.key('keydown',anchor,'Enter');assert.equal(anchor.clicks,0);assert.equal(anchor.getAttribute('aria-disabled'),'true');
  anchor.setAttribute('aria-disabled','false');f.key('keydown',anchor,' ');f.product.fire('focusout',{});f.key('keyup',anchor,' ');assert.equal(anchor.clicks,0);
});
test('product UI: selected styling and pressed semantics follow native classes, never change selects',()=>{
  const f=fixture();f.start();const [first,second]=f.colors.anchors;
  assert.equal(first.getAttribute('aria-pressed'),'true');assert.equal(second.getAttribute('aria-pressed'),'false');
  first.classList.remove('selected');second.classList.add('selected');f.mutate([{type:'attributes',target:second}]);f.flush();
  assert.equal(first.getAttribute('aria-pressed'),'false');assert.equal(second.getAttribute('aria-pressed'),'true');assert.equal(f.colors.select.value,'Dourada','no synthetic selection');
});
test('product UI: waits for DOM readiness, skips non-PDP and stops scheduled enhancement safely',()=>{
  const f=fixture({loading:true});const control=f.start();assert.equal(f.doc.getElementById('bede-product-ui-style'),null);f.ready();assert.ok(f.doc.getElementById('bede-product-ui-style'));control.refresh();control.stop();assert.equal(f.timers.size,0);assert.equal(f.observers[0].disconnected,true);
  const no=fixture({noPDP:true});no.start();assert.equal(no.doc.getElementById('bede-product-ui-style'),null);
  const cancelled=fixture({loading:true});cancelled.start().stop();cancelled.ready();assert.equal(cancelled.doc.getElementById('bede-product-ui-style'),null);
});
test('product UI: styles are strictly scoped, color labels auto-size and selected text stays white',()=>{
  assert.match(source,/\.bede-color-name\{[^}]*width:auto!important[^}]*min-height:44px/);
  assert.match(source,/\.bede-color-name\.selected\{background:#000!important;color:#fff!important\}/);
  assert.match(source,/\.bede-color-name:focus-visible/);assert.match(source,/#single-product\.bede-product-ui \.js-product-name/);
  assert.doesNotMatch(source,/fetch\(|localStorage|dispatchEvent|\.value\s*=|\.selected\s*=|swiper|image_url|add_to_cart/);
});
test('product UI: saved public PDP proves exact native Cor/select/anchor contract',()=>{
  const file=path.resolve(__dirname,'../../outputs/store-preview-local/scarpin-martta-medio.html');if(!fs.existsSync(file))return;
  const html=fs.readFileSync(file,'utf8');assert.match(html,/<label[^>]*for="variation_2">Cor<\/label>/);assert.match(html,/name="variation\[1\]"/);
  assert.match(html,/<a data-option="Preto" class="js-insta-variant[^\n]*btn-variant-color[^\n]*data-variation-id="1">/);
  assert.match(html,/class="btn-variant-content" style="background: #000000; border: 1px solid #eee"/);
});
