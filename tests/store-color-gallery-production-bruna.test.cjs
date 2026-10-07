'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {getVerifiedGallery}=require('../store-color-gallery');
// IDs, SKUs, options and protected fields agree with BASELINE_BRUNA_DOM.json
// (2026-09-06T12:43:38.056Z). The root reported the new binding and URL from
// public post-save observation at 2026-09-06T15:58:11.139Z. This fixture is not
// a substitute for the native executor's persisted before/after evidence.
const rows=[['1587977429','3178-37','37',1,true],['1587977436','3178-39','39',1,true],['1587977439','3178-38','38',0,false],['1587977440','3178-36','36',1,true],['1587977442','3178-35','35',0,false],['1587977444','3178-34','34',0,false]];
const old=['1263321119','1263321139'],newImage='1267062711';
const newURL='//dcdn-us.mitiendanube.com/stores/008/137/758/products/candidata_rgb_original-472f57ac21958f8fe617887100363683-1024-1024.webp';
function bruna(){return{
  productId:'364500797',variants:rows.map(([id,sku,size,stock,available])=>({product_id:'364500797',id,sku,option0:size,option1:null,option2:null,image:newImage,stock,price_number:369.9,available,is_visible:true,contact:false})),
  // Old URL placeholders are intentionally synthetic test fixtures.
  images:[newImage,...old].map(id=>({id,url:id===newImage?newURL:'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))
};}

test('Bruna map accepts six exact size-only bindings and retains both originals without mutating input',()=>{
  const m=bruna(),before=JSON.stringify(m),r=getVerifiedGallery(m);
  assert.ok(r);assert.equal(r.single,true);assert.equal(r.axis,null);assert.equal(r.colors[0].name,'');assert.equal(r.colors[0].soldOut,false);
  assert.deepEqual(r.colors[0].images.map(i=>i.id),["1267062711","1263321119","1263321139"]);assert.deepEqual(r.retired,old);
  assert.deepEqual(m.variants.filter(v=>v.available).map(v=>v.option0),['37','39','36']);
  assert.deepEqual(m.variants.filter(v=>!v.available).map(v=>v.option0),['38','35','34']);
  assert.ok(m.variants.every(v=>v.price_number===369.9&&v.is_visible===true&&v.contact===false));
  assert.equal(JSON.stringify(m),before);
});

test('Bruna rejects wrong photo, variant identity, invented color axis and incomplete original gallery',()=>{
  for(const change of [
    m=>m.productId='999',m=>m.variants[0].image=old[0],m=>m.variants.pop(),m=>m.variants.push({...m.variants[0]}),
    m=>m.variants[0].id='999',m=>m.variants[0].product_id='999',m=>m.variants[0].sku='3178-99',m=>m.variants[0].option0='99',
    m=>m.variants[0].option1='Preto',m=>m.variants[0].option2='Metalizado',
    m=>m.images.pop(),m=>m.images.shift(),m=>m.images.push({id:'999',url:newURL}),m=>m.images.push({...m.images[0]}),
    m=>m.images[0].url='https://untrusted.example/product.webp'
  ]){const m=bruna();change(m);assert.equal(getVerifiedGallery(m),null);}
  const before=bruna();before.images.shift();before.variants.forEach(v=>v.image=old[0]);assert.equal(getVerifiedGallery(before),null);
});

test('Bruna retained baseline and post-save prove six image-only changes and two identical original URLs',t=>{
  const dir=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/publicacao-lia-sofi-flavia-bruna-2026-09-06');
  const beforeFile=path.join(dir,'BASELINE_BRUNA_REINICIO_2026-09-06.json'),afterFile=path.join(dir,'POS_BRUNA_REINICIO_2026-09-06.json');
  if(!fs.existsSync(beforeFile)||!fs.existsSync(afterFile)){t.skip('local observations are not distributed with public site');return;}
  const beforeBytes=fs.readFileSync(beforeFile),afterBytes=fs.readFileSync(afterFile),sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
  assert.equal(sha(beforeBytes),'7ED766868D10AB61822B157E4AB7F3F5BA93F4E6A88602F0DCE04EAB2641AD7F');
  assert.equal(sha(afterBytes),'4D6E8F064DF1F227B51FE2B6413825D11FBE86EB6A8BB21854ACEA4F46563BCA');
  const before=JSON.parse(beforeBytes),after=JSON.parse(afterBytes);
  assert.equal(before.capturedAt,'2026-09-06T15:51:01.957Z');assert.equal(after.capturedAt,'2026-09-06T15:58:11.139Z');
  assert.equal(after.slug,'tenis-chunky-bruna');assert.equal(after.name,before.name);assert.equal(after.url,before.url);assert.deepEqual(after.optionLabels,before.optionLabels);
  assert.deepEqual(before.gallery.map(i=>i.id),old);assert.deepEqual(after.gallery.slice(1),before.gallery);assert.deepEqual(after.gallery[0],{id:newImage,url:newURL});
  const protect=v=>Object.fromEntries(Object.entries(v).filter(([k])=>k!=='image'));
  assert.deepEqual(after.variants.map(protect),before.variants.map(protect));assert.deepEqual(after.variants.map(v=>[String(v.id),v.sku,v.options[0],v.stock,v.available]),rows);
  assert.equal(before.variants.length,6);assert.equal(after.variants.length,6);assert.ok(before.variants.every(v=>v.image===Number(old[0])));
  assert.ok(after.variants.every(v=>v.product_id===364500797&&v.image===Number(newImage)&&v.price===369.9&&v.is_visible===true&&v.contact===false&&v.options[1]===null&&v.options[2]===null&&v.missingFields.length===0));
  const m={productId:'364500797',variants:after.variants.map(v=>({...v,option0:v.options[0],option1:v.options[1],option2:v.options[2],price_number:v.price})),images:after.gallery},snapshot=JSON.stringify(m);
  assert.ok(getVerifiedGallery(m));assert.equal(JSON.stringify(m),snapshot);
});
