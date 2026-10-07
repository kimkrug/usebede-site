'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {getVerifiedGallery}=require('../store-color-gallery');

// Identities were read in LOTE8_BASELINE_DOM_2026-09-06.json. The new image ID
// and unchanged fields were reported by root after a native save/public DOM read.
// CDN URLs below are synthetic test fixtures, not claimed publication evidence.
const rows=[['1587975302','3079-34','34',1],['1587975304','3079-38','38',1],['1587975308','3079-37','37',3],['1587975311','3079-36','36',2],['1587975314','3079-35','35',2]];
const oldImages=['1263332523','1263332530','1263288319','1263288334'];
function cruzado(){return{
  productId:'364500371',
  variants:rows.map(([id,sku,size,stock])=>({id,sku,product_id:'364500371',option0:size,option1:null,option2:null,image:'1266976473',stock,price_number:200.9,available:stock>0,is_visible:true,contact:false})),
  images:['1266976473',...oldImages].map(id=>({id,url:'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))
};}

test('Cruzado production map shows one approved image without inventing a color',()=>{
  const model=cruzado(),before=JSON.stringify(model),result=getVerifiedGallery(model);
  assert.ok(result);assert.equal(result.single,true);assert.equal(result.axis,null);
  assert.deepEqual(result.colors.map(c=>c.name),['']);
  assert.deepEqual(result.colors[0].images.map(x=>x.id),["1266976473","1263332523","1263332530"]);
  assert.deepEqual(result.retired,oldImages);
  assert.equal(JSON.stringify(model),before,'catalogue, stock and prices must not mutate');
});

test('Cruzado replacement fails closed on missing, extra or duplicate original assets',()=>{
  for(const change of [m=>m.images.pop(),m=>m.images.shift(),m=>m.images.push({id:'999',url:m.images[0].url}),m=>m.images[1].id=m.images[0].id]){
    const model=cruzado();change(model);assert.equal(getVerifiedGallery(model),null);
  }
});

test('Cruzado production bindings require all five exact IDs, SKUs, sizes and new image',()=>{
  for(const change of [m=>m.variants.pop(),m=>m.variants.push({...m.variants[0]}),m=>m.variants[0].sku='3079-99',m=>m.variants[0].option0='99',m=>m.variants[0].option1='Preto',m=>m.variants[0].option2='Material',m=>m.variants[0].image=oldImages[0],m=>m.variants[0].id='999',m=>m.variants[0].product_id='999']){
    const model=cruzado();change(model);assert.equal(getVerifiedGallery(model),null);
  }
});

test('Cruzado before-save gallery cannot activate the replacement',()=>{
  const model=cruzado();model.images.shift();model.variants.forEach(v=>v.image=oldImages[0]);
  assert.equal(getVerifiedGallery(model),null);
});

test('Cruzado retained DOM baseline agrees with identities, size order, stock and price',t=>{
  const file=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/LOTE8_BASELINE_DOM_2026-09-06.json');
  if(!fs.existsSync(file)){t.skip('local source evidence is not distributed with the public site');return;}
  const bytes=fs.readFileSync(file),data=JSON.parse(bytes),item=data.items.find(p=>p.productId==='364500371');
  assert.ok(item);assert.equal(item.slug,'scarpin-cruzado');assert.equal(item.price,200.9);
  assert.deepEqual(item.variants,rows);assert.deepEqual(item.gallery,oldImages);assert.equal(item.boundImage,oldImages[0]);
  assert.deepEqual(data.commonObserved,{is_visible:true,contact:false,option1:null,option2:null});
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),'09B9DED8B07DA4ABF41C0778A05D64B18FD1E8FCBA3EFC0162A7FE676B8FB616');
});

const nudeRows=[['1587975261','3077-34','34',1],['1587975265','3077-35','35',0],['1587975266','3077-37','37',4],['1587975267','3077-38','38',0],['1587975269','3077-36','36',3]];
const nudeOld=['1263332467','1263332473','1263288163','1263288182'];
function nude(){return{
  productId:'364500362',
  variants:nudeRows.map(([id,sku,size,stock])=>({id,sku,product_id:'364500362',option0:size,option1:null,option2:null,image:'1266977371',stock,price_number:224.9,available:stock>0,is_visible:true,contact:false})),
  images:['1266977371',...nudeOld].map(id=>({id,url:'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))
};}

test('Nude production map preserves two unavailable sizes and four originals without inventing a color',()=>{
  const model=nude(),before=JSON.stringify(model),result=getVerifiedGallery(model);
  assert.ok(result);assert.equal(result.single,true);assert.equal(result.axis,null);assert.equal(result.colors[0].name,'');
  assert.deepEqual(result.colors[0].images.map(i=>i.id),["1266977371","1263332467","1263332473"]);assert.deepEqual(result.retired,nudeOld);
  assert.equal(result.colors[0].soldOut,false);assert.deepEqual(model.variants.map(v=>v.available),[true,false,true,false,true]);
  assert.equal(JSON.stringify(model),before);
});

test('Nude production map rejects any missing original, additional asset or changed binding',()=>{
  for(const change of [m=>m.images.pop(),m=>m.images.shift(),m=>m.images.push({id:'999',url:m.images[0].url}),m=>m.variants.pop(),m=>m.variants[0].id='999',m=>m.variants[0].sku='3077-99',m=>m.variants[0].option0='99',m=>m.variants[0].option1='Nude',m=>m.variants[0].image=nudeOld[0]]){
    const model=nude();change(model);assert.equal(getVerifiedGallery(model),null);
  }
  const before=nude();before.images.shift();before.variants.forEach(v=>v.image=nudeOld[0]);assert.equal(getVerifiedGallery(before),null);
});

test('Nude retained baseline agrees exactly with five rows and original gallery',t=>{
  const file=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/LOTE8_BASELINE_DOM_2026-09-06.json');
  if(!fs.existsSync(file)){t.skip('local source evidence is not distributed with the public site');return;}
  const data=JSON.parse(fs.readFileSync(file)),item=data.items.find(p=>p.productId==='364500362');
  assert.ok(item);assert.equal(item.slug,'sapato-meia-pata-verniz-nude');assert.equal(item.price,224.9);
  assert.deepEqual(item.variants,nudeRows);assert.deepEqual(item.gallery,nudeOld);assert.equal(item.boundImage,nudeOld[0]);
});

const crocoRows=[['1587975247','3076-34','34',1],['1587975250','3076-38','38',1],['1587975253','3076-37','37',4],['1587975256','3076-35','35',2],['1587975258','3076-36','36',2]];
const crocoOld=['1263332440','1263332444','1263288075','1263288087'];
function croco(){return{
  productId:'364500357',
  variants:crocoRows.map(([id,sku,size,stock])=>({id,sku,product_id:'364500357',option0:size,option1:null,option2:null,image:'1266979119',stock,price_number:200.9,available:true,is_visible:true,contact:false})),
  images:['1266979119',...crocoOld].map(id=>({id,url:id==='1266979119'?'//dcdn-us.mitiendanube.com/stores/008/137/758/products/croco_v2_candidata_local-236a025420a35a824c17886710965903-1024-1024.webp':'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))
};}
test('Croco production map activates only the approved V2 with all five bindings and original assets',()=>{
  const model=croco(),before=JSON.stringify(model),m=getVerifiedGallery(model);assert.ok(m);assert.equal(m.single,true);assert.equal(m.axis,null);assert.equal(m.colors[0].name,'');
  assert.deepEqual(m.colors[0].images.map(i=>i.id),["1266979119","1263332440","1263332444"]);assert.deepEqual(m.retired,crocoOld);assert.equal(JSON.stringify(model),before);
});
test('Croco unknown asset, old image, changed identities or invented color fails closed',()=>{
  for(const change of [m=>m.images.pop(),m=>m.images.push({id:'999',url:m.images[0].url}),m=>m.variants.pop(),m=>m.variants[0].id='999',m=>m.variants[0].sku='3076-99',m=>m.variants[0].option0='99',m=>m.variants[0].option1='Preto',m=>m.variants[0].image=crocoOld[0]]){const model=croco();change(model);assert.equal(getVerifiedGallery(model),null);}
  const before=croco();before.images.shift();before.variants.forEach(v=>v.image=crocoOld[0]);assert.equal(getVerifiedGallery(before),null);
});
test('Croco retained baseline agrees with all rows, price and original gallery',t=>{
  const file=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/LOTE8_BASELINE_DOM_2026-09-06.json');if(!fs.existsSync(file)){t.skip('local source evidence is not distributed with the public site');return;}
  const item=JSON.parse(fs.readFileSync(file)).items.find(p=>p.productId==='364500357');assert.ok(item);assert.equal(item.slug,'scarpin-croco');assert.equal(item.price,200.9);assert.deepEqual(item.variants,crocoRows);assert.deepEqual(item.gallery,crocoOld);assert.equal(item.boundImage,crocoOld[0]);
});

const leonaRows=[['1585036796','3088-38','38',1],['1585036804','3088-37','37',2],['1585036808','3088-35','35',3],['1585036813','3088-34','34',1],['1585036817','3088-36','36',2]];
const leonaOld=['1263330536','1263330542','1263288821','1263288831','1260008172'];
function leona(){return{
  productId:'363506708',
  variants:leonaRows.map(([id,sku,size,stock])=>({id,sku,product_id:'363506708',option0:size,option1:null,option2:null,image:'1266980380',stock,price_number:299,available:true,is_visible:true,contact:false})),
  images:['1266980380',...leonaOld].map(id=>({id,url:id==='1266980380'?'//dcdn-us.mitiendanube.com/stores/008/137/758/products/candidata_rgb_original-e57aa5335607780ae617886715742284-1024-1024.webp':'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))
};}
test('Leona production map accepts one approved image while retaining all five source assets',()=>{
  const model=leona(),before=JSON.stringify(model),m=getVerifiedGallery(model);assert.ok(m);assert.equal(m.single,true);assert.equal(m.axis,null);assert.equal(m.colors[0].name,'');assert.deepEqual(m.colors[0].images.map(i=>i.id),["1266980380","1263330536","1263330542"]);assert.deepEqual(m.retired,leonaOld);assert.equal(JSON.stringify(model),before);
});
test('Leona production map fails closed on asset, identity, size or color mismatch',()=>{
  for(const change of [m=>m.images.pop(),m=>m.images.push({id:'999',url:m.images[0].url}),m=>m.variants.pop(),m=>m.variants[0].id='999',m=>m.variants[0].sku='3088-99',m=>m.variants[0].option0='99',m=>m.variants[0].option1='Preto',m=>m.variants[0].image=leonaOld[0]]){const model=leona();change(model);assert.equal(getVerifiedGallery(model),null);}
  const before=leona();before.images.shift();before.variants.forEach(v=>v.image=leonaOld[0]);assert.equal(getVerifiedGallery(before),null);
});
test('Leona retained baseline agrees with all five rows and five original assets',t=>{
  const file=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/LOTE8_BASELINE_DOM_2026-09-06.json');if(!fs.existsSync(file)){t.skip('local source evidence is not distributed with the public site');return;}
  const item=JSON.parse(fs.readFileSync(file)).items.find(p=>p.productId==='363506708');assert.ok(item);assert.equal(item.slug,'scarpin-leona');assert.equal(item.price,299);assert.deepEqual(item.variants,leonaRows);assert.deepEqual(item.gallery,leonaOld);assert.equal(item.boundImage,leonaOld[0]);
});

const arianaRows=[['1585036762','3067-38','38',0],['1585036765','3067-36','36',0],['1585036773','3067-35','35',1],['1585036777','3067-34','34',0]];
const arianaOld=['1263333039','1263333041','1263286922','1263286930','1260007991'];
function ariana(){return{
  productId:'363506702',
  variants:arianaRows.map(([id,sku,size,stock])=>({id,sku,product_id:'363506702',option0:size,option1:null,option2:null,image:'1266981269',stock,price_number:155.9,available:stock>0,is_visible:true,contact:false})),
  images:['1266981269',...arianaOld].map(id=>({id,url:id==='1266981269'?'//dcdn-us.mitiendanube.com/stores/008/137/758/products/candidata_rgb_original-988ee7b547086d427917886718598785-1024-1024.webp':'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))
};}
test('Ariana production map preserves three unavailable sizes and all five original photos',()=>{
  const model=ariana(),before=JSON.stringify(model),m=getVerifiedGallery(model);assert.ok(m);assert.equal(m.single,true);assert.equal(m.axis,null);assert.equal(m.colors[0].name,'');assert.equal(m.colors[0].soldOut,false);
  assert.deepEqual(m.colors[0].images.map(i=>i.id),["1266981269","1263333039","1263333041"]);assert.deepEqual(m.retired,arianaOld);assert.deepEqual(model.variants.map(v=>v.available),[false,false,true,false]);assert.equal(JSON.stringify(model),before);
});
test('Ariana production map rejects missing or altered evidence and never accepts the pre-save state',()=>{
  for(const change of [m=>m.images.pop(),m=>m.images.push({id:'999',url:m.images[0].url}),m=>m.variants.pop(),m=>m.variants[0].id='999',m=>m.variants[0].sku='3067-99',m=>m.variants[0].option0='99',m=>m.variants[0].option1='Azul',m=>m.variants[0].image=arianaOld[0]]){const model=ariana();change(model);assert.equal(getVerifiedGallery(model),null);}
  const before=ariana();before.images.shift();before.variants.forEach(v=>v.image=arianaOld[0]);assert.equal(getVerifiedGallery(before),null);
});
test('Ariana retained baseline agrees with four exact rows, price and five original assets',t=>{
  const file=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/LOTE8_BASELINE_DOM_2026-09-06.json');if(!fs.existsSync(file)){t.skip('local source evidence is not distributed with the public site');return;}
  const item=JSON.parse(fs.readFileSync(file)).items.find(p=>p.productId==='363506702');assert.ok(item);assert.equal(item.slug,'scarpin-ariana-verniz');assert.equal(item.price,155.9);assert.deepEqual(item.variants,arianaRows);assert.deepEqual(item.gallery,arianaOld);assert.equal(item.boundImage,arianaOld[0]);
});

const lyonRows=[['1587975071','3068-39','39',1],['1587975073','3068-38','38',2],['1587975074','3068-37','37',2],['1587975076','3068-36','36',1],['1587975077','3068-34','34',1]];
const lyonOld=['1263358176','1263358186','1263333061','1263333063','1263286996','1263287003'];
function lyon(){return{
  productId:'364500317',
  variants:lyonRows.map(([id,sku,size,stock])=>({id,sku,product_id:'364500317',option0:size,option1:null,option2:null,image:'1266982039',stock,price_number:170.9,available:true,is_visible:true,contact:false})),
  images:['1266982039',...lyonOld].map(id=>({id,url:id==='1266982039'?'//dcdn-us.mitiendanube.com/stores/008/137/758/products/candidata_rgb_original-92356e70a3b9048c1717886721804866-1024-1024.webp':'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))
};}
test('Lyon production map activates one approved image with all six originals retained',()=>{
  const model=lyon(),before=JSON.stringify(model),m=getVerifiedGallery(model);assert.ok(m);assert.equal(m.single,true);assert.equal(m.axis,null);assert.equal(m.colors[0].name,'');assert.deepEqual(m.colors[0].images.map(i=>i.id),["1266982039","1263358176","1263358186"]);assert.deepEqual(m.retired,lyonOld);assert.equal(JSON.stringify(model),before);
});
test('Lyon production map rejects missing evidence, modified bindings, color invention and pre-save state',()=>{
  for(const change of [m=>m.images.pop(),m=>m.images.push({id:'999',url:m.images[0].url}),m=>m.variants.pop(),m=>m.variants[0].id='999',m=>m.variants[0].sku='3068-99',m=>m.variants[0].option0='99',m=>m.variants[0].option1='Preto',m=>m.variants[0].image=lyonOld[0]]){const model=lyon();change(model);assert.equal(getVerifiedGallery(model),null);}
  const before=lyon();before.images.shift();before.variants.forEach(v=>v.image=lyonOld[0]);assert.equal(getVerifiedGallery(before),null);
});
test('Lyon retained baseline agrees with five exact rows, price and six original assets',t=>{
  const file=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/LOTE8_BASELINE_DOM_2026-09-06.json');if(!fs.existsSync(file)){t.skip('local source evidence is not distributed with the public site');return;}
  const item=JSON.parse(fs.readFileSync(file)).items.find(p=>p.productId==='364500317');assert.ok(item);assert.equal(item.slug,'bota-lyon-napa');assert.equal(item.price,170.9);assert.deepEqual(item.variants,lyonRows);assert.deepEqual(item.gallery,lyonOld);assert.equal(item.boundImage,lyonOld[0]);
});

const bonecaRows=[['1587974011','3013-34','34',1],['1587974025','3013-39','39',1],['1587974032','3013-38','38',2],['1587974036','3013-37','37',0],['1587974039','3013-36','36',0],['1587974043','3013-35','35',0]];
const bonecaOld=['1263335620','1263335624','1263274059','1263274068'];
function boneca(){return{
  productId:'364499940',
  variants:bonecaRows.map(([id,sku,size,stock])=>({id,sku,product_id:'364499940',option0:size,option1:null,option2:null,image:'1267014575',stock,price_number:269.9,available:stock>0,is_visible:true,contact:false})),
  images:['1267014575',...bonecaOld].map(id=>({id,url:'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))
};}
test('Boneca production map retains six native size bindings, including three unavailable sizes',()=>{
  const model=boneca(),before=JSON.stringify(model),m=getVerifiedGallery(model);assert.ok(m);assert.equal(m.single,true);assert.equal(m.axis,null);assert.equal(m.colors[0].name,'');assert.equal(m.colors[0].soldOut,false);assert.deepEqual(m.colors[0].images.map(i=>i.id),["1267014575","1263335620","1263335624"]);assert.deepEqual(m.retired,bonecaOld);assert.deepEqual(model.variants.map(v=>v.available),[true,true,true,false,false,false]);assert.equal(JSON.stringify(model),before);
});
test('Boneca production map rejects missing evidence, modified bindings, artificial color and old state',()=>{
  for(const change of [m=>m.images.pop(),m=>m.images.push({id:'999',url:m.images[0].url}),m=>m.variants.pop(),m=>m.variants[0].id='999',m=>m.variants[0].sku='3013-99',m=>m.variants[0].option0='99',m=>m.variants[0].option1='Preto',m=>m.variants[0].image=bonecaOld[0]]){const model=boneca();change(model);assert.equal(getVerifiedGallery(model),null);}
  const before=boneca();before.images.shift();before.variants.forEach(v=>v.image=bonecaOld[0]);assert.equal(getVerifiedGallery(before),null);
});
test('Boneca retained baseline agrees with six exact rows, price and four original assets',t=>{
  const file=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/LOTE8_BASELINE_DOM_2026-09-06.json');if(!fs.existsSync(file)){t.skip('local source evidence is not distributed with the public site');return;}
  const item=JSON.parse(fs.readFileSync(file)).items.find(p=>p.productId==='364499940');assert.ok(item);assert.equal(item.slug,'sapato-boneca');assert.equal(item.price,269.9);assert.deepEqual(item.variants,bonecaRows);assert.deepEqual(item.gallery,bonecaOld);assert.equal(item.boundImage,bonecaOld[0]);
});

const pretoRows=[['1587975277','3078-34','34',1],['1587975285','3078-38','38',1],['1587975288','3078-37','37',2],['1587975292','3078-36','36',4],['1587975295','3078-35','35',2]];
const pretoOld=['1263332495','1263332500','1263288237','1263288250'];
function preto(){return{
  productId:'364500367',
  variants:pretoRows.map(([id,sku,size,stock])=>({id,sku,product_id:'364500367',option0:size,option1:null,option2:null,image:'1267018094',stock,price_number:224.9,available:true,is_visible:true,contact:false})),
  images:['1267018094',...pretoOld].map(id=>({id,url:id==='1267018094'?'//dcdn-us.mitiendanube.com/stores/008/137/758/products/preto_tira_conservadora_rgb_original-690cbd9fadf5645bae17886980747898-1024-1024.webp':'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))
};}
test('Verniz Preto production map keeps five exact size bindings, one approved image and four originals',()=>{
  const model=preto(),before=JSON.stringify(model),m=getVerifiedGallery(model);assert.ok(m);assert.equal(m.single,true);assert.equal(m.axis,null);assert.equal(m.colors[0].name,'');assert.equal(m.colors[0].soldOut,false);assert.deepEqual(m.colors[0].images.map(i=>i.id),["1267018094","1263332495","1263332500"]);assert.deepEqual(m.retired,pretoOld);assert.equal(model.variants.reduce((n,v)=>n+v.stock,0),10);assert.equal(JSON.stringify(model),before);
});
test('Verniz Preto production map fails closed on incomplete or altered gallery/bindings and invented color',()=>{
  for(const change of [m=>m.images.pop(),m=>m.images.shift(),m=>m.images.push({id:'999',url:m.images[0].url}),m=>m.images[1].id=m.images[0].id,m=>m.variants.pop(),m=>m.variants.push({...m.variants[0]}),m=>m.variants[0].id='999',m=>m.variants[0].product_id='999',m=>m.variants[0].sku='3078-99',m=>m.variants[0].option0='99',m=>m.variants[0].option1='Preto',m=>m.variants[0].option2='Material',m=>m.variants[0].image=pretoOld[0]]){const model=preto();change(model);assert.equal(getVerifiedGallery(model),null);}
  const before=preto();before.images.shift();before.variants.forEach(v=>v.image=pretoOld[0]);assert.equal(getVerifiedGallery(before),null);
});
test('Verniz Preto retained baseline agrees with all five identities, stocks, price and source gallery',t=>{
  const file=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/LOTE8_BASELINE_DOM_2026-09-06.json');if(!fs.existsSync(file)){t.skip('local source evidence is not distributed with the public site');return;}
  const item=JSON.parse(fs.readFileSync(file)).items.find(p=>p.productId==='364500367');assert.ok(item);assert.equal(item.slug,'sapato-meia-pata-verniz-preto');assert.equal(item.price,224.9);assert.deepEqual(item.variants,pretoRows);assert.deepEqual(item.gallery,pretoOld);assert.equal(item.boundImage,pretoOld[0]);
});
