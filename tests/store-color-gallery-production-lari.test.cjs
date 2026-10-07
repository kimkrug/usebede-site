'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {getVerifiedGallery}=require('../store-color-gallery');
const rows=[['1587974724','3036-38','38',0,false],['1587974727','3036-37','37',1,true],['1587974734','3036-36','36',1,true],['1587974737','3036-35','35',0,false]];
const old=['1263356157','1263356160','1263356166','1263334427','1263334428','1263334434','1263281446','1263281469','1263281484'];
// Complete post-save binding evidence reported 2026-09-06T13:32:59.445Z.
// Placeholder old URLs are only a unit-test fixture, not new network evidence.
function lari(){return{
  productId:'364500239',variants:rows.map(([id,sku,size,stock,available])=>({product_id:'364500239',id,sku,option0:size,option1:null,option2:null,image:'1267027196',stock,price_number:429.9,available,is_visible:true,contact:false})),
  images:['1267027196',...old].map(id=>({id,url:id==='1267027196'?'//dcdn-us.mitiendanube.com/stores/008/137/758/products/candidata_rgb_original_branco_centralizada-34db47ddbee3af1f7f17887012949533-1024-1024.webp':'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))
};}
test('Lari production map retains four exact size bindings, two unavailable sizes and nine original assets',()=>{
  const m=lari(),before=JSON.stringify(m),r=getVerifiedGallery(m);assert.ok(r);assert.equal(r.single,true);assert.equal(r.axis,null);assert.equal(r.colors[0].name,'');assert.equal(r.colors[0].soldOut,false);assert.deepEqual(r.colors[0].images.map(i=>i.id),["1267027196","1263356160","1263356166"]);assert.deepEqual(r.retired,old);assert.deepEqual(m.variants.map(v=>v.available),[false,true,true,false]);assert.equal(JSON.stringify(m),before);
});
test('Lari map refuses missing originals, extra images and any changed or incomplete native binding',()=>{
  for(const change of [m=>m.images.pop(),m=>m.images.push({id:'999',url:m.images[0].url}),m=>m.variants.pop(),m=>m.variants[0].id='999',m=>m.variants[0].product_id='999',m=>m.variants[0].sku='3036-99',m=>m.variants[0].option0='99',m=>m.variants[0].option1='Preto',m=>m.variants[0].image=old[0]]){const m=lari();change(m);assert.equal(getVerifiedGallery(m),null);}
  const before=lari();before.images.shift();before.variants.forEach(v=>v.image=old[0]);assert.equal(getVerifiedGallery(before),null);
});
test('Lari fresh post-save observation agrees with all four identities and exact public commercial fields',t=>{
  const file=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/adicionais-primeiras4-2026-09-06/PUBLICACAO_LARI_CONFIRMADA_2026-09-06.json');if(!fs.existsSync(file)){t.skip('local evidence is not distributed with the public site');return;}
  const p=JSON.parse(fs.readFileSync(file));assert.equal(p.productId,364500239);assert.equal(p.postCapturedAt,'2026-09-06T13:32:59.445Z');assert.equal(p.newImageId,'1267027196');assert.deepEqual(p.preGalleryIds,old);assert.deepEqual(p.postGalleryIds,['1267027196',...old]);assert.deepEqual(p.postVariants.map(v=>[String(v.id),v.sku,v.option0,v.stock,v.available]),rows);assert.ok(p.postVariants.every(v=>v.price_number===429.9&&v.option1===null&&v.option2===null&&v.image===1267027196&&v.is_visible===true&&v.contact===false));
  const m=lari();m.variants=p.postVariants;m.images[0].url=p.newImageUrl;assert.ok(getVerifiedGallery(m));
});
