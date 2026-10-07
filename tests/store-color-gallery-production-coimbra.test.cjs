'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {getVerifiedGallery}=require('../store-color-gallery');
const rows=[['1587974150','3018-35','35',0,false],['1587974155','3018-37','37',0,false],['1587974159','3018-36','36',0,false],['1587974162','3018-34','34',1,true]];
const old=['1263652612','1263652639','1263354328','1263354332','1263334816','1263334819','1263274674','1263274693'];
// Complete post-save evidence reported 2026-09-06T13:41:31.826Z.
// Placeholder original URLs below are test fixtures, not observations.
function coimbra(){return{
  productId:'364499989',variants:rows.map(([id,sku,size,stock,available])=>({product_id:'364499989',id,sku,option0:size,option1:null,option2:null,image:'1267028908',stock,price_number:215.8,available,is_visible:true,contact:false})),
  images:['1267028908',...old].map(id=>({id,url:id==='1267028908'?'//dcdn-us.mitiendanube.com/stores/008/137/758/products/candidata_rgb_original_metal_preservado-f3e09b1542113dc6c517887018493883-1024-1024.webp':'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))
};}
test('Coimbra production map preserves four exact bindings, three unavailable sizes and eight original assets',()=>{
  const m=coimbra(),before=JSON.stringify(m),r=getVerifiedGallery(m);assert.ok(r);assert.equal(r.single,true);assert.equal(r.axis,null);assert.equal(r.colors[0].name,'');assert.equal(r.colors[0].soldOut,false);assert.deepEqual(r.colors[0].images.map(i=>i.id),["1267028908","1263652612","1263652639"]);assert.deepEqual(r.retired,old);assert.deepEqual(m.variants.map(v=>v.available),[false,false,false,true]);assert.equal(JSON.stringify(m),before);
});
test('Coimbra map refuses missing originals, extras, incomplete or changed native identities and image bindings',()=>{
  for(const change of [m=>m.images.pop(),m=>m.images.push({id:'999',url:m.images[0].url}),m=>m.variants.pop(),m=>m.variants[0].id='999',m=>m.variants[0].product_id='999',m=>m.variants[0].sku='3018-99',m=>m.variants[0].option0='99',m=>m.variants[0].option1='Preto',m=>m.variants[0].image=old[0]]){const m=coimbra();change(m);assert.equal(getVerifiedGallery(m),null);}
  const before=coimbra();before.images.shift();before.variants.forEach(v=>v.image=old[0]);assert.equal(getVerifiedGallery(before),null);
});
test('Coimbra fresh public observation matches all four identities, gallery IDs and observed commercial fields',t=>{
  const file=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/adicionais-primeiras4-2026-09-06/PUBLICACAO_COIMBRA_CONFIRMADA_2026-09-06.json');if(!fs.existsSync(file)){t.skip('local evidence is not distributed with the public site');return;}
  const p=JSON.parse(fs.readFileSync(file));assert.equal(p.productId,364499989);assert.equal(p.postCapturedAt,'2026-09-06T13:41:31.826Z');assert.equal(p.newImageId,'1267028908');assert.deepEqual(p.preGalleryIds,old);assert.deepEqual(p.postGallery.map(i=>i.id),['1267028908',...old]);assert.deepEqual(p.postVariants.map(v=>[String(v.id),v.sku,v.option0,v.stock,v.available]),rows);assert.ok(p.postVariants.every(v=>v.price_number===215.8&&v.option1===null&&v.option2===null&&v.image===1267028908&&v.is_visible===true&&v.contact===false));
  const m={productId:p.productId,variants:p.postVariants,images:p.postGallery},before=JSON.stringify(m);assert.ok(getVerifiedGallery(m));assert.equal(JSON.stringify(m),before);
});
