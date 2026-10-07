'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {getVerifiedGallery}=require('../store-color-gallery');
const rows=[['1587974240','3021-37','37',3],['1587974243','3021-38','38',2],['1587974251','3021-36','36',1],['1587974253','3021-35','35',2],['1587974255','3021-34','34',2]];
const old=['1263356015','1263356022','1263354675','1263354681','1263334907','1263334911','1263275065','1263275073'];
// Exact post-save identities observed at 2026-09-06T14:23:34.564Z.
// Old URL placeholders below are test fixtures, not new observations.
function brecia(){return{
  productId:'364500025',variants:rows.map(([id,sku,size,stock])=>({product_id:'364500025',id,sku,option0:size,option1:null,option2:null,image:'1267037175',stock,price_number:388.47,available:true,is_visible:true,contact:false})),
  images:['1267037175',...old].map(id=>({id,url:id==='1267037175'?'//dcdn-us.mitiendanube.com/stores/008/137/758/products/candidata_rgb_original-1e98a9237d87d9c09417887042386535-1024-1024.webp':'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))
};}
test('Brecia map preserves five exact size-only bindings, original price and eight native photos',()=>{
  const m=brecia(),before=JSON.stringify(m),r=getVerifiedGallery(m);assert.ok(r);assert.equal(r.single,true);assert.equal(r.axis,null);assert.equal(r.colors[0].name,'');assert.equal(r.colors[0].soldOut,false);assert.deepEqual(r.colors[0].images.map(i=>i.id),["1267037175","1263356015","1263356022"]);assert.deepEqual(r.retired,old);assert.equal(JSON.stringify(m),before);
});
test('Brecia rejects previous state, missing or extra assets and incomplete or changed identities',()=>{
  for(const change of [m=>m.images.pop(),m=>m.images.push({id:'999',url:m.images[0].url}),m=>m.variants.pop(),m=>m.variants[0].id='999',m=>m.variants[0].product_id='999',m=>m.variants[0].sku='3021-99',m=>m.variants[0].option0='99',m=>m.variants[0].option1='Preto',m=>m.variants[0].image=old[0]]){const m=brecia();change(m);assert.equal(getVerifiedGallery(m),null);}
  const before=brecia();before.images.shift();before.variants.forEach(v=>v.image=old[0]);assert.equal(getVerifiedGallery(before),null);
});
test('Brecia retained before/after proves image-only changes, exact public fields and unchanged original URLs',t=>{
  const dir=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/proximo-lote-4-prioritarias-2026-09-06'),file=path.join(dir,'PUBLICACAO_BRECIA_CONFIRMADA_2026-09-06.json');if(!fs.existsSync(file)){t.skip('local observations are not distributed with public site');return;}
  const p=JSON.parse(fs.readFileSync(file)),baseline=JSON.parse(fs.readFileSync(path.join(dir,'BASELINE_BRECIA_PUBLICACAO_2026-09-06.json')));
  assert.equal(p.productId,364500025);assert.deepEqual(p.before,baseline);assert.equal(p.after.capturedAt,'2026-09-06T14:23:34.564Z');assert.equal(p.after.url,p.before.url);assert.equal(p.after.title,p.before.title);
  assert.deepEqual(p.before.gallery.map(i=>i.id),old);assert.deepEqual(p.after.gallery.slice(1),p.before.gallery);assert.equal(p.after.gallery[0].id,'1267037175');
  const protect=v=>Object.fromEntries(Object.entries(v).filter(([k])=>k!=='image'));assert.deepEqual(p.after.variants.map(protect),p.before.variants.map(protect));assert.deepEqual(p.after.variants.map(v=>[String(v.id),v.sku,v.option0,v.stock]),rows);
  assert.ok(p.after.variants.every(v=>v.image===1267037175&&v.price_number===388.47&&v.available===true&&v.is_visible===true&&v.contact===false&&v.option1===null&&v.option2===null));
  const m={productId:p.productId,variants:p.after.variants,images:p.after.gallery},before=JSON.stringify(m);assert.ok(getVerifiedGallery(m));assert.equal(JSON.stringify(m),before);
});
