'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {getVerifiedGallery}=require('../store-color-gallery.js');
const EXPECTED={
 '364500034':{single:['1267123949','1263354749','1263354761']},
 '364500815':{Caramelo:['1267172003','1263361087'],Preto:['1263361103','1263361134']},
 '364500892':{Preta:['1267175262','1263362372'],Marrom:[]},
 '364501326':{Preto:['1267122281','1263283992'],'Café':[]},
 '364501392':{Preto:['1267119359','1263369391'],'Café':['1263369398']}
};
const original=['364500246','364500780','364501337','364501384','364500371','364500362','364500357','363506708','363506702','364500317','364499940','364500367','364500386','364500239','364499989','364500375','364500025','364500939','364501366','364500961','364500797','364500789'];
const source=fs.readFileSync(path.join(__dirname,'../store-color-gallery.js'),'utf8');
const ctx={module:{exports:{}},URL};vm.runInNewContext(source.replace('return{verified,getVerifiedGallery,imageURL,start};','return{rules:MAP};'),ctx);
const rules=JSON.parse(JSON.stringify(ctx.module.exports.rules));
test('five: original22 plus five approved products remain intact after the next approved batch',()=>{
 const nextNine=['363507458','364499897','364499960','364500089','364500288','364500305','364500483','364500321','364500989','364499928','364501004','363515143','364500647','364500521','364499970','364501342','364500510','364500000'];
 assert.deepEqual(Object.keys(rules).filter(id=>!["364500953","364501049","364500285","363507514"].includes(id)).filter(id=>!nextNine.includes(id)).sort(),[...original,...Object.keys(EXPECTED)].sort());
 for(const [id,expected] of Object.entries(EXPECTED)){const r=rules[id];assert.deepEqual(r.mode==='single'?{single:r.gallery}:r.gallery,expected);}
});
const file=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/lote20-capas-producao-2026-09-06/pos-cinco-normalizado.json');
test('five: frozen genuine public capture validates every binding without mutating commerce fields',t=>{
 if(!fs.existsSync(file)){t.skip('local audit snapshot not distributed');return;}
 const bytes=fs.readFileSync(file);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),'3512679CA6A39CA39912991E5E1FD4DACD85313C9D3C2FA73CCC9B1A4392CC40');
 const post=JSON.parse(bytes).products;assert.equal(post.reduce((n,p)=>n+p.variants.length,0),52);assert.equal(post.reduce((n,p)=>n+p.gallery.length,0),26);
 const before=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/diretriz-capa-galeria-2026-09-06/lote20-capas-baseline-atual-2026-09-06.json'))).products;
 for(const p of post){
  const old=before.find(x=>x.productId===p.productId);assert.equal(p.gallery.length,old.gallery.length+1);
  for(const i of old.gallery)assert.equal(p.gallery.find(x=>x.imageId===i.imageId)?.href,i.href);
  for(const v of p.variants){const o=old.variants.find(x=>x.id===v.id);for(const k of Object.keys(o).filter(k=>!['imageId','imageURL'].includes(k)))assert.deepEqual(v[k],o[k],p.handle+'/'+v.sku+'/'+k);}
  const model={productId:p.productId,variants:p.variants.map(v=>({...v,product_id:v.productId,image:v.imageId})),images:p.gallery.map(i=>({id:i.imageId,url:i.href}))};
  const copy=JSON.stringify(model);assert.ok(getVerifiedGallery(model),p.handle);assert.equal(JSON.stringify(model),copy);
  for(const mutate of [m=>m.variants.pop(),m=>m.variants[0].sku='WRONG',m=>m.variants[0].image='123',m=>m.images.pop(),m=>m.images.push({id:'987654321',url:m.images[0].url})]){const m=structuredClone(model);mutate(m);assert.equal(getVerifiedGallery(m),null,p.handle);}
 }
});
