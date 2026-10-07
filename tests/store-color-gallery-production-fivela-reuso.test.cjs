'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {getVerifiedGallery}=require('../store-color-gallery.js');
const source=fs.readFileSync(path.join(__dirname,'../store-color-gallery.js'),'utf8'),ctx={module:{exports:{}},URL};
vm.runInNewContext(source.replace('return{verified,getVerifiedGallery,imageURL,start};','return{rules:MAP};'),ctx);
const rules=JSON.parse(JSON.stringify(ctx.module.exports.rules));
const expected={Azul:['1266826515','1263359040'],Caramelo:['1263359085'],'Off White':['1263359043'],Preto:['1263359054'],'Rosa Claro':['1263359075']};
test('Mule Fivela: exact five-color gallery reuses existing cover, hides duplicates/mixed shots and keeps 39 products',()=>{
 assert.equal(Object.keys(rules).filter(id=>!["364500953","364501049","364500285","363507514"].includes(id)).filter(id=>!['364500647','364500521','364499970','364501342','364500510','364500000'].includes(id)).length,39);const r=rules['363515143'];assert.equal(r.axis,1);
 assert.deepEqual(r.gallery,expected);assert.equal(r.bindings.length,30);assert.equal(new Set(r.bindings.map(v=>v.id)).size,30);
 assert.equal(r.retired.length,16);assert.ok(['1266782369','1263359064','1263331824','1263292310','1263292285'].every(id=>r.retired.includes(id)));
 for(const color of Object.keys(expected)){const vs=r.bindings.filter(v=>v.options[1]===color);assert.equal(vs.length,6);assert.ok(vs.every(v=>v.image===expected[color][0]));assert.deepEqual(vs.map(v=>v.options[0]).sort(),['34','35','36','37','38','39']);}
 assert.equal(new Set(Object.values(r.gallery).flat()).size,6);
});
test('Mule Fivela: frozen genuine 30-variant/21-image reading supports exact galleries without mutating native data',t=>{
 const file=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/reuso-fivela-2026-09-07/DOM_LEITURA_MULE_FIVELA_2026-09-07.json');
 if(!fs.existsSync(file)){t.skip('Local evidence not distributed');return;}
 const bytes=fs.readFileSync(file);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),'C807D2B6679EDD842329B22DF4347CF233A29753FADC943CC7F97BCBD4CCADFF');
 const p=JSON.parse(bytes),vs=p.rows.map(row=>({...p.columnDefaults,...Object.fromEntries(p.columns.map((k,i)=>[k,row[i]]))})),m={productId:p.productId,variants:vs.map(v=>({...v,product_id:v.productId,image:v.imageId})),images:p.gallery.map(([id,url])=>({id,url:p.urlPrefix+url}))};
 assert.equal(m.images.length,21);assert.equal(m.variants.length,30);
 assert.deepEqual(rules[p.productId].bindings,vs.map(v=>({id:v.id,sku:v.sku,image:v.imageId,options:[v.option0,v.option1,v.option2]})));
 const frozen=JSON.stringify(m),g=getVerifiedGallery(m);assert.ok(g);assert.equal(JSON.stringify(m),frozen);
 assert.deepEqual(Object.fromEntries(g.colors.map(c=>[c.name,c.images.map(i=>i.id)])),expected);
 for(const mutate of [x=>x.variants.pop(),x=>x.variants[0].sku='WRONG',x=>x.variants[1].image='1266826515',x=>x.images.pop(),x=>x.images.push({id:'987654321',url:x.images[0].url})]){const copy=structuredClone(m);mutate(copy);assert.equal(getVerifiedGallery(copy),null);}
});
