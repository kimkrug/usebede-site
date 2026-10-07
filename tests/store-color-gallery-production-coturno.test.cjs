'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {getVerifiedGallery}=require('../store-color-gallery.js');
const source=fs.readFileSync(path.join(__dirname,'../store-color-gallery.js'),'utf8');
const ctx={module:{exports:{}},URL};vm.runInNewContext(source.replace('return{verified,getVerifiedGallery,imageURL,start};','return{rules:MAP};'),ctx);
const rules=JSON.parse(JSON.stringify(ctx.module.exports.rules));
test('coturno: exact gallery, six bindings, prior 37 products and no synthetic color axis',()=>{
 assert.equal(Object.keys(rules).filter(id=>!["364500953","364501049","364500285","363507514"].includes(id)).filter(id=>!['364501004','363515143','364500647','364500521','364499970','364501342','364500510','364500000'].includes(id)).length,37);
 const r=rules['364499928'];assert.equal(r.mode,'single');assert.equal(r.axis,undefined);assert.equal(r.colors,undefined);
 assert.deepEqual(r.approved,['1267240615']);assert.deepEqual(r.gallery,['1267240615','1263652434','1263652484']);
 assert.equal(r.bindings.length,6);assert.ok(r.bindings.every(v=>v.image==='1267240615'&&v.options[1]===null&&v.options[2]===null));
 assert.deepEqual(r.retired,['1263652434','1263652484','1263353968','1263353982','1263335604','1263335607','1263273987','1263273998']);
});
test('coturno: genuine after snapshot preserves all originals and every non-image variant field',t=>{
 const dir=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/lote20-capas-producao-2026-09-06'),file=path.join(dir,'pos-coturno-normalizado.json');
 if(!fs.existsSync(file)){t.skip('Local audit evidence not distributed');return;}
 const bytes=fs.readFileSync(file);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),'48D8B4A605CF5CCCE03C5B12269CD7A21C693FADBEB1A5852DD02135EC81946A');
 const post=JSON.parse(bytes).products[0],before=JSON.parse(fs.readFileSync(path.resolve(dir,'../diretriz-capa-galeria-2026-09-06/lote20-capas-baseline-atual-2026-09-06.json'))).products.find(p=>p.productId===post.productId);
 assert.equal(post.gallery.length,9);assert.equal(before.gallery.length,8);assert.equal(post.variants.length,6);
 for(const i of before.gallery)assert.equal(post.gallery.find(x=>x.imageId===i.imageId)?.href,i.href);
 for(const v of post.variants){const old=before.variants.find(x=>x.id===v.id);for(const k of Object.keys(old).filter(k=>!['imageId','imageURL'].includes(k)))assert.deepEqual(v[k],old[k],v.sku+'/'+k);}
 const model={productId:post.productId,variants:post.variants.map(v=>({...v,product_id:v.productId,image:v.imageId})),images:post.gallery.map(i=>({id:i.imageId,url:i.href}))};
 const frozen=JSON.stringify(model);assert.ok(getVerifiedGallery(model));assert.equal(JSON.stringify(model),frozen);
 for(const mutate of [m=>m.variants.pop(),m=>m.variants[0].sku='WRONG',m=>m.variants[0].image='123',m=>m.images.pop(),m=>m.images.push({id:'987654321',url:m.images[0].url})]){const m=structuredClone(model);mutate(m);assert.equal(getVerifiedGallery(m),null);}
});
