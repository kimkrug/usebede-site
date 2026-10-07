'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {getVerifiedGallery}=require('../store-color-gallery.js');
const {parseMap,ALLOWED}=require('../../outputs/fotos-padrao-etapa2/lote20-capas-producao-2026-09-06/gerar-patch-map-pos.cjs');
const dir=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/proximas-capas-2026-09-07');
const {validate,approved,unpack,galleryURLs}=require(path.join(dir,'preparar-galerias-quatro.cjs'));
const rules=JSON.parse(JSON.stringify(parseMap(fs.readFileSync(path.join(__dirname,'../store-color-gallery.js'),'utf8'))));
const expected={
 '364499970':{Preto:['1267295258','1263354280','1263354301'],Caramelo:['1263354311','1263354315']},
 '364501342':{Preto:['1267296453','1263284029'],'Café':[]},
 '364500510':{Ferrari:['1267297514','1263329493'],Nude:[],'Preto Verniz':[]},
 '364500000':{Marrom:['1267298906','1263354449','1263354458'],Preto:['1263354465']}
};
test('Four exact native-alpha approvals: 45 total rules, 51 bindings, 29 native photos, 13 visible photos, 3 empty colors',()=>{
 assert.equal(Object.keys(rules).filter(id=>!["364500953","364501049","364500285","363507514"].includes(id)).length,45);let bindings=0,native=0,visible=0,empty=0;
 for(const[id,gallery]of Object.entries(expected)){const r=rules[id];assert.deepEqual(r.gallery,gallery);assert.equal(r.axis,1);assert.equal(ALLOWED[id],undefined,'Historical rejected-mask generator remains blocked');bindings+=r.bindings.length;native+=r.retired.length+Object.values(r.colors).flat().length;visible+=Object.values(gallery).flat().length;empty+=Object.values(gallery).filter(x=>!x.length).length;}
 assert.equal(bindings,51);assert.equal(native,29);assert.equal(visible,13);assert.equal(empty,3);
});
for(const[handle,entry]of Object.entries(approved)){
 test(handle+': real pre/post audit and exact-color display',()=>{
  const pre=JSON.parse(fs.readFileSync(path.join(dir,'BASE_PRE_'+handle+'.json'))),post=JSON.parse(fs.readFileSync(path.join(dir,'POS_REAL_'+handle+'.json')));
  assert.deepEqual(validate(pre,post,entry),rules[entry.id]);const model={productId:entry.id,variants:unpack(post).map(v=>({...v,product_id:v.productId,image:v.imageId})),images:galleryURLs(post)};
  const initial=JSON.stringify(model),g=getVerifiedGallery(model);assert.ok(g);assert.equal(JSON.stringify(model),initial);assert.deepEqual(Object.fromEntries(g.colors.map(c=>[c.name,c.images.map(i=>i.id)])),expected[entry.id]);
  for(const mutate of[x=>x.variants.pop(),x=>x.variants[0].sku='WRONG',x=>x.variants[0].image=pre.gallery[0][0],x=>x.variants[0].option1='WRONG COLOR',x=>x.images.pop(),x=>x.images.push({id:'999999999',url:x.images[0].url})]){const bad=structuredClone(model);mutate(bad);assert.equal(getVerifiedGallery(bad),null);}
 });
 test(handle+': protected fields, originals, source bindings and evidence fail closed',()=>{
  const pre=JSON.parse(fs.readFileSync(path.join(dir,'BASE_PRE_'+handle+'.json'))),post=JSON.parse(fs.readFileSync(path.join(dir,'POS_REAL_'+handle+'.json')));
  for(const mutate of[x=>x.rows[0][6]++,x=>x.rows[0][7]++,x=>x.rows[0][0]='999',x=>x.rows[0][1]='BAD-SKU',x=>x.rows[0][4]='WRONG',x=>x.rows[0][13]=pre.gallery[0][0],x=>x.adminProtectedEqual=false,x=>x.adminProtectedFieldsCount--,x=>x.freshPublicNonImageDifferences.push('price'),x=>x.urls[1]+='changed',x=>x.rows.pop(),x=>x.gallery.pop(),x=>x.nativeSavedAt=pre.capturedAt]){const bad=structuredClone(post);mutate(bad);assert.throws(()=>validate(pre,bad,entry));}
  assert.throws(()=>validate(pre,post,{...entry,coverSha:'REJECTED-OLD-COVER'}));assert.throws(()=>validate(pre,post,{...entry,cover:'99999999'}));
 });
}
