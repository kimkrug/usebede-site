'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {getVerifiedGallery}=require('../store-color-gallery');
// Public DOM values reported after the native save, 2026-09-06T13:22:51.759Z.
// Old image URL placeholders below are test fixtures, not HTTP captures.
const rows=[['1587975366','3084-38','38',2,true],['1587975369','3084-37','37',2,true],['1587975371','3084-36','36',2,true],['1587975374','3084-35','35',0,false],['1587975376','3084-34','34',1,true]];
const old=['1263358382','1263332615','1263288610'];
function montaria(){return{
  productId:'364500386',variants:rows.map(([id,sku,size,stock,available])=>({product_id:'364500386',id,sku,option0:size,option1:null,option2:null,image:'1267024727',stock,price_number:459.9,available,is_visible:true,contact:false})),
  images:['1267024727',...old].map(id=>({id,url:id==='1267024727'?'//dcdn-us.mitiendanube.com/stores/008/137/758/products/candidata_rgb_original_metal_preservado-f458bed38fb753f30017887005018848-1024-1024.webp':'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))
};}
test('Montaria Couro map retains exact five size bindings, stock-zero35 and three original photos',()=>{
  const m=montaria(),before=JSON.stringify(m),r=getVerifiedGallery(m);assert.ok(r);assert.equal(r.single,true);assert.equal(r.axis,null);assert.equal(r.colors[0].name,'');assert.deepEqual(r.colors[0].images.map(i=>i.id),["1267024727","1263358382"]);assert.deepEqual(r.retired,old);assert.equal(m.variants.find(v=>v.option0==='35').available,false);assert.equal(JSON.stringify(m),before);
});
test('Montaria Couro map rejects abandoned draft, old state and every incomplete or conflicting identity',()=>{
  for(const change of [m=>m.images.pop(),m=>m.images.push({id:'1267014896',url:m.images[0].url}),m=>m.images[0].id='1267014896',m=>m.variants.pop(),m=>m.variants[0].id='999',m=>m.variants[0].product_id='999',m=>m.variants[0].sku='3084-99',m=>m.variants[0].option0='99',m=>m.variants[0].option1='Preto',m=>m.variants[0].image='1267014896',m=>m.variants[0].image=old[0]]){const m=montaria();change(m);assert.equal(getVerifiedGallery(m),null);}
  const before=montaria();before.images.shift();before.variants.forEach(v=>v.image=old[0]);assert.equal(getVerifiedGallery(before),null);
});
test('Montaria Couro post-save observation agrees with production map and exact public commercial fields',t=>{
  const file=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/adicionais-primeiras4-2026-09-06/PUBLICACAO_MONTARIA_CONFIRMADA_2026-09-06.json');if(!fs.existsSync(file)){t.skip('local evidence is not distributed with the public site');return;}
  const p=JSON.parse(fs.readFileSync(file));assert.equal(p.productId,364500386);assert.equal(p.postCapturedAt,'2026-09-06T13:22:51.759Z');assert.equal(p.newImageId,'1267024727');assert.deepEqual(p.preGalleryIds,old);assert.deepEqual(p.postGallery.map(i=>i.id),['1267024727',...old]);assert.deepEqual(p.postVariants.map(v=>[String(v.id),v.sku,v.option0,v.stock,v.available]),rows);assert.ok(p.postVariants.every(v=>v.price_number===459.9&&v.option1===null&&v.option2===null&&v.image===1267024727&&v.is_visible===true&&v.contact===false));assert.ok(getVerifiedGallery({productId:String(p.productId),variants:p.postVariants,images:p.postGallery}));
});
