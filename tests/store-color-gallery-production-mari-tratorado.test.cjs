'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {getVerifiedGallery}=require('../store-color-gallery.js');
const source=fs.readFileSync(path.join(__dirname,'../store-color-gallery.js'),'utf8'),ctx={module:{exports:{}},URL};
vm.runInNewContext(source.replace('return{verified,getVerifiedGallery,imageURL,start};','return{rules:MAP};'),ctx);
const rules=JSON.parse(JSON.stringify(ctx.module.exports.rules));
const expected={
 '364500647':{handle:'tamanco-mari',n:10,photos:7,gallery:{Cinza:['1267281639','1263329113','1263329117'],Preto:['1263329122']}},
 '364500521':{handle:'mocassim-tratorado',n:12,photos:21,gallery:{Caramelo:['1267284080','1263359596','1263359646'],Preto:['1263359609','1263359629','1263359657']}}
};
test('Mari and Tratorado: exact two-color galleries, native original retention and 41 total product rules',()=>{
 assert.equal(Object.keys(rules).filter(id=>!["364500953","364501049","364500285","363507514"].includes(id)).filter(id=>!['364499970','364501342','364500510','364500000'].includes(id)).length,41);
 for(const [id,e] of Object.entries(expected)){
  const r=rules[id];assert.equal(r.axis,1);assert.deepEqual(r.gallery,e.gallery);assert.equal(r.bindings.length,e.n);assert.equal(new Set(r.bindings.map(v=>v.id)).size,e.n);
  assert.equal(r.retired.length,e.photos-2);
  for(const [color,images] of Object.entries(e.gallery)){assert.deepEqual(r.colors[color],[images[0]]);const b=r.bindings.filter(v=>v.options[1]===color);assert.equal(b.length,e.n/2);assert.ok(b.every(v=>v.image===images[0]));}
 }
});
for(const [id,e] of Object.entries(expected))test(e.handle+': genuine post data support exact-color native bindings; invalid data fail closed',t=>{
 const dir=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/proximas-capas-2026-09-07'),file=path.join(dir,'POS_REAL_'+e.handle+'.json');
 if(!fs.existsSync(file)){t.skip('Local evidence not distributed');return;}
 const {validate,approved,unpack,galleryURLs}=require(path.join(dir,'preparar-galerias-dupla.cjs'));
 const pre=JSON.parse(fs.readFileSync(path.join(dir,'BASE_PRE_'+e.handle+'.json'))),post=JSON.parse(fs.readFileSync(file));
 const validated=validate(pre,post,approved[e.handle]);assert.deepEqual(validated,rules[id]);
 const vs=unpack(post),m={productId:id,variants:vs.map(v=>({...v,product_id:v.productId,image:v.imageId})),images:galleryURLs(post)};
 const frozen=JSON.stringify(m),g=getVerifiedGallery(m);assert.ok(g);assert.equal(JSON.stringify(m),frozen);assert.deepEqual(Object.fromEntries(g.colors.map(c=>[c.name,c.images.map(i=>i.id)])),e.gallery);
 for(const mutate of[x=>x.variants.pop(),x=>x.variants[0].sku='WRONG',x=>x.variants[1].image=x.variants[0].image,x=>x.images.pop(),x=>x.images.push({id:'987654321',url:x.images[0].url})]){const bad=structuredClone(m);mutate(bad);assert.equal(getVerifiedGallery(bad),null);}
 for(const mutate of[x=>x.rows[0][6]++,x=>x.rows[0][7]++,x=>x.rows[0][13]=approved[e.handle].source,x=>x.rows[1][13]=x.rows[0][13],x=>x.adminProtectedEqual=false,x=>x.urls[1]+='changed',x=>x.rows.pop(),x=>x.gallery.pop()]){const bad=structuredClone(post);mutate(bad);assert.throws(()=>validate(pre,bad,approved[e.handle]));}
});
