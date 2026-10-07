'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {getVerifiedGallery}=require('../store-color-gallery');
const rows=[['1587978102','3197-38','38',0,false],['1587978104','3197-37','37',1,true],['1587978107','3197-36','36',0,false],['1587978111','3197-35','35',0,false],['1587978113','3197-34','34',0,false]];
const old=['1263320185','1263320205','1263320214'];
// Exact post-save identities observed at 2026-09-06T14:31:43.183Z.
// Placeholder original URLs are test fixtures, not new network observations.
function helena(){return{
  productId:'364500939',variants:rows.map(([id,sku,size,stock,available])=>({product_id:'364500939',id,sku,option0:size,option1:null,option2:null,image:'1267039299',stock,price_number:269.9,available,is_visible:true,contact:false})),
  images:['1267039299',...old].map(id=>({id,url:id==='1267039299'?'//dcdn-us.mitiendanube.com/stores/008/137/758/products/candidata_rgb_original-460f3986ad893fd20217887048538152-1024-1024.webp':'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))
};}
test('Helena map preserves five size-only bindings, four unavailable sizes and three original photos',()=>{
  const m=helena(),before=JSON.stringify(m),r=getVerifiedGallery(m);assert.ok(r);assert.equal(r.single,true);assert.equal(r.axis,null);assert.equal(r.colors[0].name,'');assert.equal(r.colors[0].soldOut,false);assert.deepEqual(r.colors[0].images.map(i=>i.id),["1267039299","1263320185","1263320205","1263320214"]);assert.deepEqual(r.retired,old);assert.deepEqual(m.variants.filter(v=>v.available).map(v=>v.option0),['37']);assert.equal(JSON.stringify(m),before);
});
test('Helena refuses missing or extra images, previous state and incomplete or conflicting bindings',()=>{
  for(const change of [m=>m.images.pop(),m=>m.images.push({id:'999',url:m.images[0].url}),m=>m.variants.pop(),m=>m.variants[0].id='999',m=>m.variants[0].product_id='999',m=>m.variants[0].sku='3197-99',m=>m.variants[0].option0='99',m=>m.variants[0].option1='Prata',m=>m.variants[0].image=old[0]]){const m=helena();change(m);assert.equal(getVerifiedGallery(m),null);}
  const before=helena();before.images.shift();before.variants.forEach(v=>v.image=old[0]);assert.equal(getVerifiedGallery(before),null);
});
test('Helena retained before/after proves image-only changes, exact fields and all original URLs preserved',t=>{
  const dir=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/proximo-lote-4-prioritarias-2026-09-06'),file=path.join(dir,'PUBLICACAO_HELENA_CONFIRMADA_2026-09-06.json');if(!fs.existsSync(file)){t.skip('local observations are not distributed with public site');return;}
  const p=JSON.parse(fs.readFileSync(file)),baseline=JSON.parse(fs.readFileSync(path.join(dir,'BASELINE_HELENA_PUBLICACAO_2026-09-06.json')));
  assert.equal(p.productId,364500939);assert.deepEqual(p.before,baseline);assert.equal(p.after.capturedAt,'2026-09-06T14:31:43.183Z');assert.equal(p.after.url,p.before.url);assert.equal(p.after.title,p.before.title);
  assert.deepEqual(p.before.gallery.map(i=>i.id),old);assert.deepEqual(p.after.gallery.slice(1),p.before.gallery);assert.equal(p.after.gallery[0].id,'1267039299');
  const protect=v=>Object.fromEntries(Object.entries(v).filter(([k])=>k!=='image'));assert.deepEqual(p.after.variants.map(protect),p.before.variants.map(protect));assert.deepEqual(p.after.variants.map(v=>[String(v.id),v.sku,v.option0,v.stock,v.available]),rows);
  assert.ok(p.after.variants.every(v=>v.image===1267039299&&v.price_number===269.9&&v.is_visible===true&&v.contact===false&&v.option1===null&&v.option2===null));
  const m={productId:p.productId,variants:p.after.variants,images:p.after.gallery},before=JSON.stringify(m);assert.ok(getVerifiedGallery(m));assert.equal(JSON.stringify(m),before);
});
