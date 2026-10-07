'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {getVerifiedGallery}=require('../store-color-gallery');
const rows=[['1587975324','3080-34','34',1],['1587975336','3080-35','35',2],['1587975335','3080-36','36',2],['1587975333','3080-37','37',2],['1587975329','3080-38','38',2]];
const old=['1263358269','1263358289','1263332568','1263332572','1263288451','1263288469'];
// Exact identities reported after native save at 2026-09-06T14:12:42.672Z.
// Placeholder original URLs are test-only fixtures, not network observations.
function fivela(){return{
  productId:'364500375',variants:rows.map(([id,sku,size,stock])=>({product_id:'364500375',id,sku,option0:size,option1:null,option2:null,image:'1267035164',stock,price_number:245.9,available:true,is_visible:true,contact:false})),
  images:['1267035164',...old].map(id=>({id,url:id==='1267035164'?'//dcdn-us.mitiendanube.com/stores/008/137/758/products/candidata_rgb_original-54a043c222988467d017887037252427-1024-1024.webp':'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))
};}
test('Fivela Prateada map uses five exact size-only bindings and keeps all six original photos',()=>{
  const m=fivela(),before=JSON.stringify(m),r=getVerifiedGallery(m);assert.ok(r);assert.equal(r.single,true);assert.equal(r.axis,null);assert.equal(r.colors[0].name,'');assert.equal(r.colors[0].soldOut,false);assert.deepEqual(r.colors[0].images.map(i=>i.id),["1267035164","1263358269","1263358289"]);assert.deepEqual(r.retired,old);assert.equal(JSON.stringify(m),before);
});
test('Fivela Prateada refuses incomplete gallery, extras, previous state and any conflicting binding',()=>{
  for(const change of [m=>m.images.pop(),m=>m.images.push({id:'999',url:m.images[0].url}),m=>m.variants.pop(),m=>m.variants[0].id='999',m=>m.variants[0].product_id='999',m=>m.variants[0].sku='3080-99',m=>m.variants[0].option0='99',m=>m.variants[0].option1='Prateada',m=>m.variants[0].image=old[0]]){const m=fivela();change(m);assert.equal(getVerifiedGallery(m),null);}
  const before=fivela();before.images.shift();before.variants.forEach(v=>v.image=old[0]);assert.equal(getVerifiedGallery(before),null);
});
test('Fivela Prateada retained public before/after proves image-only changes and exact real gallery URLs',t=>{
  const dir=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/proximo-lote-4-prioritarias-2026-09-06');
  const file=path.join(dir,'PUBLICACAO_FIVELA_PRATEADA_CONFIRMADA_2026-09-06.json');if(!fs.existsSync(file)){t.skip('local observations are not distributed with public site');return;}
  const p=JSON.parse(fs.readFileSync(file)),baseline=JSON.parse(fs.readFileSync(path.join(dir,'BASELINE_FIVELA_PRATEADA_PUBLICACAO_2026-09-06.json')));
  assert.equal(p.productId,364500375);assert.deepEqual(p.before,baseline);assert.equal(p.after.capturedAt,'2026-09-06T14:12:42.672Z');assert.equal(p.after.url,p.before.url);assert.equal(p.after.title,p.before.title);
  assert.deepEqual(p.before.gallery.map(i=>i.id),old);assert.deepEqual(p.after.gallery.slice(1),p.before.gallery);assert.equal(p.after.gallery[0].id,'1267035164');
  const protect=v=>Object.fromEntries(Object.entries(v).filter(([k])=>k!=='image'));
  assert.deepEqual(p.after.variants.map(protect),p.before.variants.map(protect));assert.deepEqual(p.after.variants.map(v=>[String(v.id),v.sku,v.option0,v.stock]),rows);
  assert.ok(p.after.variants.every(v=>v.image===1267035164&&v.price_number===245.9&&v.available===true&&v.is_visible===true&&v.contact===false&&v.option1===null&&v.option2===null));
  const m={productId:p.productId,variants:p.after.variants,images:p.after.gallery},before=JSON.stringify(m);assert.ok(getVerifiedGallery(m));assert.equal(JSON.stringify(m),before);
});
