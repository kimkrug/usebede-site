'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{getVerifiedGallery}=require('../store-color-gallery');
// Identity/binding evidence reported by the live operator after the native save,
// 2026-09-06T12:22:31Z. Test fixtures are not additional live reads.
const liaRows=[['1587980094','3320-34-PRETO','34',1],['1587980098','3320-35-PRETO','35',1],['1587980100','3320-36-PRETO','36',2],['1587980103','3320-37-PRETO','37',2],['1587980118','3320-38-PRETO','38',2],['1587980121','3320-39-PRETO','39',1]];
const liaOld=['1263369345','1263369374','1263284379','1263284395'];
function lia(){return{
  productId:'364501366',
  variants:liaRows.map(([id,sku,size,stock])=>({id,sku,product_id:'364501366',option0:size,option1:'Preto',option2:null,image:'1267015050',stock,price_number:479.9,available:true,is_visible:true,contact:false})),
  images:['1267015050',...liaOld].map(id=>({id,url:id==='1267015050'?'//dcdn-us.mitiendanube.com/stores/008/137/758/products/candidata_rgb_original-294f6530d66578b72d17886971608449-1024-1024.webp':'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))
};}
test('Lia production map keeps the exact native Preto color and six complete bindings',()=>{
  const model=lia(),before=JSON.stringify(model),m=getVerifiedGallery(model);assert.ok(m);assert.equal(m.single,false);assert.equal(m.axis,1);assert.deepEqual(m.colors.map(c=>c.name),['Preto']);assert.deepEqual(m.colors[0].images.map(i=>i.id),["1267015050","1263369345","1263369374"]);assert.deepEqual(m.retired,liaOld);assert.equal(JSON.stringify(model),before);
});
test('Lia map rejects incomplete gallery, changed binding and removed or mismatched native color',()=>{
  for(const change of [m=>m.images.pop(),m=>m.images.push({id:'999',url:m.images[0].url}),m=>m.variants.pop(),m=>m.variants[0].id='999',m=>m.variants[0].sku='3320-99-PRETO',m=>m.variants[0].option0='99',m=>m.variants[0].option1='Marrom',m=>m.variants[0].option1=null,m=>m.variants[0].image=liaOld[0]]){const model=lia();change(model);assert.equal(getVerifiedGallery(model),null);}
  const before=lia();before.images.shift();before.variants.forEach(v=>v.image=liaOld[0]);assert.equal(getVerifiedGallery(before),null);
});
test('Lia earlier retained local baseline agrees with all six identities, native options and commercial fields',t=>{
  const file=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/proximo-lote-8-adicionais-2026-09-06/BASELINE_DOM_ATUAL_8_ADICIONAIS_2026-09-06.json');if(!fs.existsSync(file)){t.skip('local source evidence is not distributed with the public site');return;}
  const p=JSON.parse(fs.readFileSync(file)).products.find(p=>p.productId===364501366);assert.ok(p);assert.equal(p.slug,'bota-montaria-lia');assert.equal(p.capturedAt,'2026-09-06T05:32:55.918Z','this is the earlier retained baseline, not a fabricated fresh snapshot');assert.deepEqual(p.gallery.map(i=>i.id),liaOld);
  assert.deepEqual(p.variants.map(v=>[String(v.id),v.sku,v.option0,v.stock]),liaRows);assert.ok(p.variants.every(v=>v.option1==='Preto'&&v.option2===null&&v.price_number===479.9&&v.available===true&&v.is_visible===true&&v.contact===false));
});

const sofiRows=[['1587977407','3177-34','34',1],['1587977409','3177-39','39',1],['1587977412','3177-38','38',1],['1587977414','3177-36','36',2],['1587977417','3177-35','35',0],['1587977421','3177-37','37',2]];
const sofiOld=['1263321027','1263321056','1263321064','1263321099'];
function sofi(){return{
  productId:'364500789',
  variants:sofiRows.map(([id,sku,size,stock])=>({id,sku,product_id:'364500789',option0:size,option1:null,option2:null,image:'1267016141',stock,price_number:278.9,available:stock>0,is_visible:true,contact:false})),
  images:['1267016141',...sofiOld].map(id=>({id,url:id==='1267016141'?'//dcdn-us.mitiendanube.com/stores/008/137/758/products/candidata_rgb_original-419b17fdc17c7664f317886974833059-1024-1024.webp':'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))
};}
test('Sofi production map keeps all six native size bindings and the unavailable35 unchanged',()=>{
  const model=sofi(),before=JSON.stringify(model),m=getVerifiedGallery(model);assert.ok(m);assert.equal(m.single,true);assert.equal(m.axis,null);assert.equal(m.colors[0].name,'');assert.deepEqual(m.colors[0].images.map(i=>i.id),["1267016141","1263321056","1263321027","1263321064","1263321099"]);assert.deepEqual(m.retired,sofiOld);assert.equal(model.variants.find(v=>v.option0==='35').available,false);assert.equal(m.colors[0].soldOut,false);assert.equal(JSON.stringify(model),before);
});
test('Sofi map refuses incomplete evidence, changed size/image identity or invented color',()=>{
  for(const change of [m=>m.images.pop(),m=>m.images.push({id:'999',url:m.images[0].url}),m=>m.variants.pop(),m=>m.variants[0].id='999',m=>m.variants[0].sku='3177-99',m=>m.variants[0].option0='99',m=>m.variants[0].option1='Preto',m=>m.variants[0].image=sofiOld[0]]){const model=sofi();change(model);assert.equal(getVerifiedGallery(model),null);}
  const before=sofi();before.images.shift();before.variants.forEach(v=>v.image=sofiOld[0]);assert.equal(getVerifiedGallery(before),null);
});
test('Sofi earlier retained baseline agrees with six identities, price, stock and absent color',t=>{
  const file=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/proximo-lote-8-adicionais-2026-09-06/BASELINE_DOM_ATUAL_8_ADICIONAIS_2026-09-06.json');if(!fs.existsSync(file)){t.skip('local source evidence is not distributed with the public site');return;}
  const p=JSON.parse(fs.readFileSync(file)).products.find(p=>p.productId===364500789);assert.ok(p);assert.equal(p.slug,'tenis-sofi');assert.equal(p.capturedAt,'2026-09-06T05:32:57.393Z');assert.deepEqual(p.gallery.map(i=>i.id),sofiOld);assert.deepEqual(p.variants.map(v=>[String(v.id),v.sku,v.option0,v.stock]),sofiRows);assert.ok(p.variants.every(v=>v.option1===null&&v.option2===null&&v.price_number===278.9&&v.is_visible===true&&v.contact===false));assert.deepEqual(p.variants.map(v=>v.available),[true,true,true,true,false,true]);
});
