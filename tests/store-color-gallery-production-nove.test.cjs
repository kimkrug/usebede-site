'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {getVerifiedGallery}=require('../store-color-gallery.js');
const EXPECTED={
 '363507458':{Taupe:['1263656110'],Preto:['1263656085'],Blush:['1267201850','1263656053']},
 '364499897':{'Bordô':['1267205547','1263353597','1263353603'],Vermelho:['1263353613','1263353626']},
 '364499960':{Cinza:[],Preto:['1263354226','1263354232'],Marrom:['1267208806','1263354206','1263354207']},
 '364500089':{Cacau:['1267212487','1263653731','1263653760'],Preto:['1263653899'],Malbec:['1263653803','1263653850']},
 '364500288':{Marsala:['1267224111','1263333806','1263333808'],Preto:['1263333810'],Verniz:['1263333825'],Rosado:['1263333817']},
 '364500305':{Nude:[],Verde:['1267219163','1263358085']},
 '364500483':{Marsala:['1263329396'],Onix:['1267221895','1263329394'],Ferrari:['1263329399'],Nude:[],Preto:[]},
 '364500321':{single:['1267216265','1263333117','1263333122','1263333130']},
 '364500989':{'Castanho Avermelhado':['1267220238','1263365445','1263365452'],Oliva:['1263365473','1263365482']}
};
const source=fs.readFileSync(path.join(__dirname,'../store-color-gallery.js'),'utf8');
const ctx={module:{exports:{}},URL};vm.runInNewContext(source.replace('return{verified,getVerifiedGallery,imageURL,start};','return{rules:MAP};'),ctx);
const rules=JSON.parse(JSON.stringify(ctx.module.exports.rules));
test('nine: original 36 products preserved after approved coturno; four missing colors remain empty',()=>{
 assert.equal(Object.keys(rules).filter(id=>!["364500953","364501049","364500285","363507514"].includes(id)).filter(id=>!['364499928','364501004','363515143','364500647','364500521','364499970','364501342','364500510','364500000'].includes(id)).length,36);
 for(const [id,expected] of Object.entries(EXPECTED)){const r=rules[id];assert.ok(r,id);assert.deepEqual(r.mode==='single'?{single:r.gallery}:r.gallery,expected,id);}
 assert.equal(Object.values(EXPECTED).flatMap(x=>Object.values(x)).filter(x=>x.length===0).length,4);
 assert.equal(Object.values(EXPECTED).flatMap(x=>Object.values(x)).flat().length,41);
 const laterNativeAlpha={'364501342':['Preto','1267296453'],'364500000':['Marrom','1267298906'],'364500510':['Ferrari','1267297514'],'364499970':['Preto','1267295258']};
 const {ALLOWED}=require('../../outputs/fotos-padrao-etapa2/lote20-capas-producao-2026-09-06/gerar-patch-map-pos.cjs');
 for(const[id,[color,cover]]of Object.entries(laterNativeAlpha)){assert.equal(ALLOWED[id],undefined,'Old rejected-mask generator stays blocked');assert.deepEqual(rules[id].colors[color],[cover],'Only later independently reviewed native-alpha cover allowed');}
});
test('nine: genuine captures preserve 140 variants, 93 originals and all non-image fields',t=>{
 const dir=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/lote20-capas-producao-2026-09-06');
 const file=path.join(dir,'pos-nove-normalizado.json');if(!fs.existsSync(file)){t.skip('Local audit evidence not distributed');return;}
 const bytes=fs.readFileSync(file);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),'E9B474E92C7D0C34D1E11D680902153BDC6A4B8C549F56B7DD195CBE6C6FE86F');
 const post=JSON.parse(bytes).products;
 const before=JSON.parse(fs.readFileSync(path.resolve(dir,'../diretriz-capa-galeria-2026-09-06/lote20-capas-baseline-atual-2026-09-06.json'))).products;
 assert.equal(post.length,9);assert.equal(post.reduce((n,p)=>n+p.variants.length,0),140);assert.equal(post.reduce((n,p)=>n+p.gallery.length,0),102);
 for(const p of post){
  const old=before.find(x=>x.productId===p.productId);assert.equal(p.gallery.length,old.gallery.length+1);
  for(const image of old.gallery)assert.equal(p.gallery.find(x=>x.imageId===image.imageId)?.href,image.href);
  for(const v of p.variants){const o=old.variants.find(x=>x.id===v.id);for(const k of Object.keys(o).filter(k=>!['imageId','imageURL'].includes(k)))assert.deepEqual(v[k],o[k],p.handle+'/'+v.sku+'/'+k);}
  const model={productId:p.productId,variants:p.variants.map(v=>({...v,product_id:v.productId,image:v.imageId})),images:p.gallery.map(i=>({id:i.imageId,url:i.href}))};
  const copy=JSON.stringify(model);assert.ok(getVerifiedGallery(model),p.handle);assert.equal(JSON.stringify(model),copy);
  for(const mutate of [m=>m.variants.pop(),m=>m.variants[0].sku='WRONG',m=>m.variants[0].image='123',m=>m.images.pop(),m=>m.images.push({id:'987654321',url:m.images[0].url})]){const m=structuredClone(model);mutate(m);assert.equal(getVerifiedGallery(m),null,p.handle);}
 }
});
