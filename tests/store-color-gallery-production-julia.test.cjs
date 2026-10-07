'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {getVerifiedGallery}=require('../store-color-gallery.js');
const source=fs.readFileSync(path.join(__dirname,'../store-color-gallery.js'),'utf8'),ctx={module:{exports:{}},URL};
vm.runInNewContext(source.replace('return{verified,getVerifiedGallery,imageURL,start};','return{rules:MAP};'),ctx);
const rules=JSON.parse(JSON.stringify(ctx.module.exports.rules));
test('Julia: exact 38-product scope, black-only cover, empty Marrom and hidden ambiguous originals',()=>{
 assert.equal(Object.keys(rules).filter(id=>!["364500953","364501049","364500285","363507514"].includes(id)).filter(id=>!['363515143','364500647','364500521','364499970','364501342','364500510','364500000'].includes(id)).length,38);
 const r=rules['364501004'];assert.equal(r.axis,1);
 assert.deepEqual(r.colors,{Marrom:[],Preto:['1267259700']});
 assert.deepEqual(r.gallery,{Marrom:[],Preto:['1267259700','1263365911']});
 assert.deepEqual(r.retired,['1263365902','1263365911','1263315518','1263315535']);
 assert.equal(r.bindings.length,12);
 assert.deepEqual(r.bindings.filter(v=>v.options[1]==='Preto').map(v=>v.id),['1587978406','1587978408','1587978410','1587978413','1587978414','1587978417']);
 assert.deepEqual(r.bindings.filter(v=>v.options[1]==='Marrom').map(v=>v.id),['1587978396','1587978397','1587978399','1587978401','1587978403','1587978404']);
 for(const v of r.bindings)assert.equal(v.image,v.options[1]==='Preto'?'1267259700':'1263365902');
 for(const color of Object.values(r.gallery))assert.ok(!color.some(id=>['1263365902','1263315518','1263315535'].includes(id)));
});
test('Julia: genuine post-save evidence preserves originals and all non-image fields; mismatches fail closed',t=>{
 const dir=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/lote20-capas-producao-2026-09-06'),file=path.join(dir,'pos-julia-normalizado.json');
 if(!fs.existsSync(file)){t.skip('Local audit evidence not distributed');return;}
 const bytes=fs.readFileSync(file);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),'F022F4E7672B7F8B7A634318A3C99F5736106739F55E22C74705FBDE63D86D2E');
 const post=JSON.parse(bytes).products[0],before=JSON.parse(fs.readFileSync(path.resolve(dir,'../diretriz-capa-galeria-2026-09-06/lote20-capas-baseline-atual-2026-09-06.json'))).products.find(p=>p.productId===post.productId);
 assert.equal(post.gallery.length,5);assert.equal(before.gallery.length,4);assert.equal(post.variants.length,12);
 for(const i of before.gallery)assert.equal(post.gallery.find(x=>x.imageId===i.imageId)?.href,i.href);
 for(const v of post.variants){const old=before.variants.find(x=>x.id===v.id);for(const k of Object.keys(old).filter(k=>!['imageId','imageURL'].includes(k)))assert.deepEqual(v[k],old[k],v.sku+'/'+k);if(v.option1==='Marrom'){assert.equal(v.imageId,old.imageId);assert.equal(v.imageURL,old.imageURL);}}
 const model={productId:post.productId,variants:post.variants.map(v=>({...v,product_id:v.productId,image:v.imageId})),images:post.gallery.map(i=>({id:i.imageId,url:i.href}))};
 const frozen=JSON.stringify(model),verified=getVerifiedGallery(model);assert.ok(verified);assert.equal(JSON.stringify(model),frozen);
 assert.deepEqual(Object.fromEntries(verified.colors.map(c=>[c.name,c.images.map(i=>i.id)])),{Marrom:[],Preto:['1267259700','1263365911']});
 for(const mutate of [m=>m.variants.pop(),m=>m.variants[0].sku='WRONG',m=>m.variants[0].image='1267259700',m=>m.variants[6].image='1263365902',m=>m.images.pop(),m=>m.images.push({id:'987654321',url:m.images[0].url})]){const m=structuredClone(model);mutate(m);assert.equal(getVerifiedGallery(m),null);}
});
