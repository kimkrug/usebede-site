'use strict';
// Offline gallery-only contract: no browser, network, order or inventory writes.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('../store-enhancements.js');
const variants=()=>[
  {id:11,product_id:123,option0:'39',option1:'Cacau',option2:null,image:100,stock:0,price:20090},
  {id:12,product_id:123,option0:'39',option1:'Off White',option2:null,image:102,stock:1,price:20090}
];
const selected=()=>[{index:0,value:'39'},{index:1,value:'Off White'}];
test('gallery: selected exact tuple identifies one image without changing variant data',()=>{
  const rows=variants(),selections=selected(),before=JSON.stringify([rows,selections]);
  assert.deepEqual(P.initialVariantImage(rows,selections,'123'),{productId:'123',variantId:'12',imageId:'102'});
  assert.equal(JSON.stringify([rows,selections]),before);
});
test('gallery: missing axis, duplicate match/id, different product or unsafe image fail closed',()=>{
  const rows=variants();
  for(const [data,options,id] of [
    [rows,[{index:1,value:'Off White'}],'123'],[rows,[...selected(),{index:1,value:'Off White'}],'123'],
    [rows,selected(),'999'],[[...rows,{...rows[1],id:13}],selected(),'123'],[[rows[0],{...rows[1],id:11}],selected(),'123'],
    [[rows[0],{...rows[1],product_id:124}],selected(),'123'],[[rows[0],{...rows[1],image:'javascript:1'}],selected(),'123'],
    [[rows[0],{...rows[1],image:9007199254740992}],selected(),'123'],[rows,[{index:0,value:'39'},{index:1,value:'off white'}],'123'],
    [rows.map(v=>({...v,option2:'Couro'})),selected(),'123']
  ])assert.equal(P.initialVariantImage(data,options,id),null);
  const triple=rows.map(v=>({...v,option2:'Couro'}));
  assert.equal(P.initialVariantImage(triple,[...selected(),{index:2,value:'Couro'}],'123').imageId,'102');
});

function fixture({ready=true,activeTarget=false}={}){
  let now=0,next=0,clicks=0;const timers=new Map(),records=[];
  const events=target=>{
    target.events=new Map();target.addEventListener=(type,fn)=>{const list=target.events.get(type)||[];list.push(fn);target.events.set(type,list);};
    target.removeEventListener=(type,fn)=>{target.events.set(type,(target.events.get(type)||[]).filter(f=>f!==fn));};return target;
  };
  class Node{
    constructor(attrs={},classes=[]){this.attrs={...attrs};this.classes=new Set(classes);this.queries={};this.isConnected=true;this.relevant=false;this.classList={contains:c=>this.classes.has(c)};}
    getAttribute(name){return this.attrs[name]??null;}hasAttribute(name){return Object.hasOwn(this.attrs,name);}
    querySelectorAll(selector){return this.queries[selector]||[];}
    closest(selector){if(selector==='#single-product')return this===root||this.relevant?root:null;if(selector==='[inert]')return this.inert?root:null;return this.relevant?root:null;}
  }
  const root=new Node({'data-store':'product-detail','data-variants':JSON.stringify(variants())}),form=new Node({'data-store':'product-form-123'});
  const selects=selected().map(s=>Object.assign(new Node({name:'variation['+s.index+']'}),{value:s.value,selectedOptions:[{}],multiple:false,relevant:true}));
  const gallery=new Node({},ready?['swiper-container-initialized']:[]),thumbContainer=new Node();
  const slides=[new Node({'data-image':'100','data-image-position':'0'},activeTarget?[]:['swiper-slide-active']),new Node({'data-image':'102','data-image-position':'2'},activeTarget?['swiper-slide-active']:[])];
  const thumb=new Node({href:'#','data-thumb-loop':'2'},['js-product-thumb']);thumb.relevant=true;thumb.click=()=>{clicks++;records.push({selections:selects.map(s=>s.value),variants:root.attrs['data-variants']});};
  root.queries={'form#product_form':[form],'.js-swiper-product':[gallery],'.js-swiper-product-thumbs':[thumbContainer]};
  form.queries['select.js-variation-option']=selects;gallery.queries['.js-product-slide']=slides;thumbContainer.queries['a.js-product-thumb']=[thumb];
  const doc=events({hidden:false,activeElement:null,querySelectorAll:selector=>selector==='#single-product'?[root]:[]});
  const runtime=events({setTimeout(fn,delay){const id=++next;timers.set(id,{fn,at:now+delay});return id;},clearTimeout(id){timers.delete(id);}});
  const align=P.createInitialGalleryAlignment(doc,runtime);
  function tick(ms){now+=ms;for(let i=0;i<100;i++){const due=[...timers].filter(([,v])=>v.at<=now).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)return;timers.delete(due[0]);due[1].fn();}throw new Error('timer loop');}
  const emit=(type,target=thumb,trusted=true,on=doc)=>[...(on.events.get(type)||[])].forEach(fn=>fn({type,target,isTrusted:trusted}));
  const listeners=()=>[doc,runtime].reduce((sum,node)=>sum+[...node.events.values()].reduce((n,list)=>n+list.length,0),0);
  return{align,tick,emit,root,form,selects,gallery,slides,thumb,thumbContainer,doc,runtime,timers,records,listeners,clicks:()=>clicks,Node};
}
test('gallery: waits for initialized stable DOM then clicks native thumbnail exactly once',()=>{
  const f=fixture({ready:false}),before=f.root.attrs['data-variants'];f.align.start();f.tick(0);f.tick(150);assert.equal(f.clicks(),0);
  f.gallery.classes.add('swiper-container-initialized');f.tick(150);assert.equal(f.clicks(),0);f.tick(150);assert.equal(f.clicks(),1);
  assert.deepEqual(f.selects.map(s=>s.value),['39','Off White']);assert.equal(f.root.attrs['data-variants'],before);
  assert.equal(f.listeners(),0);assert.equal(f.timers.size,0);f.align.start();f.tick(5000);assert.equal(f.clicks(),1);
});
test('gallery: already active image is a no-op and absence of initialization times out',()=>{
  const active=fixture({activeTarget:true});active.align.start();active.tick(0);assert.equal(active.clicks(),0);assert.equal(active.listeners(),0);
  const waiting=fixture({ready:false});waiting.align.start();for(let i=0;i<30;i++)waiting.tick(150);
  assert.equal(waiting.clicks(),0);assert.equal(waiting.listeners(),0);assert.equal(waiting.timers.size,0);
});
test('gallery: human interaction before or during initialization cancels without taking focus or selection',()=>{
  for(const type of ['pointerdown','mousedown','touchstart','click','change','keydown']){
    const f=fixture();f.emit(type,type==='keydown'?{}:f.selects[1]);f.align.start();f.tick(5000);assert.equal(f.clicks(),0,type);assert.equal(f.listeners(),0);
  }
  const during=fixture();during.align.start();during.tick(0);during.emit('pointerdown');during.tick(200);assert.equal(during.clicks(),0);
  const focused=fixture();focused.doc.activeElement=focused.selects[0];focused.align.start();focused.tick(5000);assert.equal(focused.clicks(),0);
  const synthetic=fixture();synthetic.emit('change',synthetic.selects[1],false);synthetic.align.start();synthetic.tick(0);synthetic.tick(150);assert.equal(synthetic.clicks(),1);
});
test('gallery: re-reads immediately before click and refuses a last-moment variant change',()=>{
  const f=fixture();f.align.start();f.tick(0);let reads=0;
  Object.defineProperty(f.selects[1],'value',{get(){return ++reads===1?'Off White':'Cacau';}});
  f.tick(150);assert.equal(f.clicks(),0);assert.equal(f.listeners(),0);assert.equal(f.timers.size,0);
});
test('gallery: ambiguous slides/thumbs, modal/video anchors and inconsistent form never click',()=>{
  const cases=[
    f=>f.gallery.queries['.js-product-slide'].push(f.slides[1]),
    f=>f.thumbContainer.queries['a.js-product-thumb'].push(f.thumb),
    f=>f.thumb.classes.add('js-product-thumb-modal'),f=>f.thumb.attrs.href='/comprar/',
    f=>f.thumb.attrs['data-video_id']='video',f=>f.thumb.inert=true,
    f=>f.form.attrs['data-store']='product-form-124',f=>f.root.attrs['data-variants']='not JSON',
    f=>f.selects[1].selectedOptions=[],f=>f.slides[1].attrs['data-image-position']='2x',
    f=>f.slides[0].classes.add('swiper-slide-active')&&f.slides[1].classes.add('swiper-slide-active')
  ];
  for(const change of cases){const f=fixture();change(f);f.align.start();for(let i=0;i<30;i++)f.tick(150);assert.equal(f.clicks(),0);assert.equal(f.listeners(),0);}
});
test('gallery: hidden/pagehide cancels permanently and native click failure is not retried',()=>{
  const hidden=fixture();hidden.align.start();hidden.doc.hidden=true;hidden.emit('visibilitychange');hidden.tick(5000);assert.equal(hidden.clicks(),0);assert.equal(hidden.listeners(),0);
  const leaving=fixture();leaving.align.start();leaving.emit('pagehide',null,true,leaving.runtime);leaving.tick(5000);assert.equal(leaving.clicks(),0);
  const failed=fixture();let clicks=0;failed.thumb.click=()=>{clicks++;throw new Error('native failure');};failed.align.start();failed.tick(0);failed.tick(150);failed.tick(5000);assert.equal(clicks,1);
});
test('gallery: actual public Patrícia data resolves selected39/Off White to registered image',()=>{
  const file=path.resolve(__dirname,'../../outputs/fotos-padrao/backups/sapato-patricia-depois-2026-09-05.html');
  if(!fs.existsSync(file))return;const html=fs.readFileSync(file,'utf8');
  const raw=html.match(/id="single-product"[^>]*data-variants="([^"]*)"/)?.[1];assert.ok(raw);
  const rows=JSON.parse(raw.replace(/&quot;/g,'"').replace(/&amp;/g,'&'));
  const target=P.initialVariantImage(rows,selected(),'363501869');assert.equal(target.imageId,'1263276580');
  assert.match(html,/data-store="product-form-363501869"/);
  assert.match(html,/data-image="1263276580" data-image-position="2"/);
});
