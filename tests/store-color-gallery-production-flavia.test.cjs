'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {getVerifiedGallery}=require('../store-color-gallery');
const rows=[['1587978196','3202-38','38',0,false],['1587978200','3202-39','39',1,true],['1587978202','3202-37','37',2,true],['1587978205','3202-36','36',0,false],['1587978207','3202-35','35',1,true],['1587978209','3202-34','34',1,true]];
const old=['1263317052','1263317073','1263317080','1263317091','1263317122'];
const newImage='1267053460';
const newURL='//dcdn-us.mitiendanube.com/stores/008/137/758/products/candidata_rgb_original-c00f9703d022fbadbc17887081078524.png';
// Exact post-save identities observed at 2026-09-06T15:25:00.284Z.
// Old URL placeholders below are fixtures, not fresh network observations.
function flavia(){return{
  productId:'364500961',variants:rows.map(([id,sku,size,stock,available])=>({product_id:'364500961',id,sku,option0:size,option1:null,option2:null,image:newImage,stock,price_number:345,available,is_visible:true,contact:false})),
  images:[newImage,...old].map(id=>({id,url:id===newImage?newURL:'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))
};}
test('Flavia map accepts six exact size-only bindings and retains all five originals without mutation',()=>{
  const m=flavia(),before=JSON.stringify(m),r=getVerifiedGallery(m);
  assert.ok(r);assert.equal(r.single,true);assert.equal(r.axis,null);assert.equal(r.colors[0].name,'');assert.equal(r.colors[0].soldOut,false);
  assert.deepEqual(r.colors[0].images.map(i=>i.id),["1267053460","1263317052","1263317073","1263317080","1263317091","1263317122"]);assert.deepEqual(r.retired,old);
  assert.deepEqual(m.variants.filter(v=>v.available).map(v=>v.option0),['39','37','35','34']);assert.equal(JSON.stringify(m),before);
});
test('Flavia refuses wrong image binding, missing variant, conflicting identity and incomplete original gallery',()=>{
  for(const change of [m=>m.variants[0].image=old[0],m=>m.variants.pop(),m=>m.variants[0].id='999',m=>m.variants[0].product_id='999',m=>m.variants[0].sku='3202-99',m=>m.variants[0].option0='99',m=>m.variants[0].option1='Marrom',m=>m.images.pop(),m=>m.images.push({id:'999',url:newURL})]){
    const m=flavia();change(m);assert.equal(getVerifiedGallery(m),null);
  }
  const before=flavia();before.images.shift();before.variants.forEach(v=>v.image=old[0]);assert.equal(getVerifiedGallery(before),null);
});
test('Flavia retained baseline and post-save prove six image-only changes and five identical original URLs',t=>{
  const dir=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/publicacao-lia-sofi-flavia-bruna-2026-09-06');
  const beforeFile=path.join(dir,'BASELINE_FLAVIA_REINICIO_2026-09-06.json'),afterFile=path.join(dir,'POS_FLAVIA_REINICIO_2026-09-06.json');
  if(!fs.existsSync(beforeFile)||!fs.existsSync(afterFile)){t.skip('local observations are not distributed with public site');return;}
  const beforeBytes=fs.readFileSync(beforeFile),afterBytes=fs.readFileSync(afterFile),sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
  assert.equal(sha(beforeBytes),'E257D2C16BDD2CF4B92C8E55F862CF0806A3AC7D29DC087F5F47D1898DE25AC8');
  assert.equal(sha(afterBytes),'C28D9F744F98F008B2A03CD2F5298219DE93E6300C97E9A00F9187A9E80CAB24');
  const before=JSON.parse(beforeBytes),after=JSON.parse(afterBytes);
  assert.equal(before.capturedAt,'2026-09-06T15:19:43.218Z');assert.equal(after.capturedAt,'2026-09-06T15:25:00.284Z');
  assert.equal(after.slug,'tenis-flavia');assert.equal(after.name,before.name);assert.equal(after.url,before.url);assert.deepEqual(after.optionLabels,before.optionLabels);
  assert.deepEqual(before.gallery.map(i=>i.id),old);assert.deepEqual(after.gallery.slice(1),before.gallery);assert.deepEqual(after.gallery[0],{id:newImage,url:newURL});
  const protect=v=>Object.fromEntries(Object.entries(v).filter(([k])=>k!=='image'));
  assert.deepEqual(after.variants.map(protect),before.variants.map(protect));assert.deepEqual(after.variants.map(v=>[String(v.id),v.sku,v.options[0],v.stock,v.available]),rows);
  assert.ok(after.variants.every(v=>v.product_id===364500961&&v.image===Number(newImage)&&v.price===345&&v.is_visible===true&&v.contact===false&&v.options[1]===null&&v.options[2]===null));
  const m={productId:'364500961',variants:after.variants.map(v=>({...v,option0:v.options[0],option1:v.options[1],option2:v.options[2],price_number:v.price})),images:after.gallery},snapshot=JSON.stringify(m);
  assert.ok(getVerifiedGallery(m));assert.equal(JSON.stringify(m),snapshot);
});
