const test=require('node:test'),assert=require('node:assert/strict');
const {verified,getVerifiedGallery,imageURL}=require('../store-color-gallery');
const url='https://dcdn-us.mitiendanube.com/stores/008/137/758/products/original.webp';
const variants=[{id:1,sku:'a',product_id:364500780,option1:'Dourada',image:1266855344,available:false},{id:2,sku:'b',product_id:364500780,option1:'Prata',image:1266899517,available:true}];
const images=[{id:'1266855344',url},{id:'1266899517',url:url.replace('original','prata')}];
// Keep this two-row synthetic legacy fixture explicit. The production Paris
// rule now requires twelve observed bindings, covered by the plan22 test.
const legacyParisRule={axis:1,colors:{Dourada:['1266855344'],Prata:['1266899517']},retired:[]};
const legacyParis=(v=variants,i=images)=>getVerifiedGallery({productId:'364500780',variants:v,images:i},legacyParisRule);
test('legacy rule: exact audited images and sold-out state',()=>{const m=legacyParis();assert.equal(m.colors[0].soldOut,true);assert.equal(m.colors[1].name,'Prata');assert.equal(m.colors[1].images[0].url,images[1].url);});
test('legacy rule: unknown/shared/missing images fail closed',()=>{assert.equal(verified('999',variants,images),null);assert.equal(legacyParis(variants.map(v=>({...v,image:1266855344})),images),null);assert.equal(legacyParis(variants,images.slice(0,1)),null);});
test('legacy rule: extra image or duplicate identity requires review',()=>{assert.equal(legacyParis(variants,[...images,{id:'3',url}]),null);assert.equal(legacyParis([variants[0],variants[0]],images),null);});
test('only original trusted HTTPS CDN resources accepted',()=>{assert.equal(imageURL('javascript:alert(1)'),null);assert.equal(imageURL('https://evil.test/x.webp'),null);assert.equal(imageURL('//dcdn-us.mitiendanube.com/a.webp'),'https://dcdn-us.mitiendanube.com/a.webp');});
function audited(){
  const productId='123',variants=[{id:1,sku:'a',product_id:123,option0:'34',option1:'Preto',image:11,available:true},{id:2,sku:'b',product_id:123,option0:'35',option1:'Preto',image:11,available:false},{id:3,sku:'c',product_id:123,option0:'34',option1:'Bege',image:21,available:true}];
  const rule={axis:1,colors:{Preto:['11','12'],Bege:['21']},retired:['10'],bindings:variants.map(v=>({id:String(v.id),sku:v.sku,image:String(v.image),options:[v.option0,v.option1,null]}))};
  return{model:{productId,variants,images:['10','11','12','21'].map(id=>({id,url:url.replace('original',id)}))},rule};
}
test('multiple approved photos retain exact order and never expose retired IDs',()=>{
  const {model,rule}=audited(),before=JSON.stringify({model,rule}),result=getVerifiedGallery(model,rule);
  assert.deepEqual(result.colors[0].images.map(i=>i.id),['11','12']);assert.deepEqual(result.colors[1].images.map(i=>i.id),['21']);assert.deepEqual(result.retired,['10']);assert.equal(result.colors.flatMap(c=>c.images).some(i=>i.id==='10'),false);assert.equal(JSON.stringify({model,rule}),before);
});
test('retirement requires exact complete bindings, including SKU, size, color and active image',()=>{
  for(const modify of [({rule})=>delete rule.bindings,({rule})=>rule.bindings.pop(),({rule})=>rule.bindings[0].sku='other',({rule})=>rule.bindings[0].options[0]='36',({rule})=>rule.bindings[0].image='12',({model})=>model.variants[0].image=10,({model})=>model.variants[0].option1='Bege']){const data=audited();modify(data);assert.equal(getVerifiedGallery(data.model,data.rule),null);}
});
test('extra/missing/duplicate gallery assets and overlapping color/retired maps fail closed',()=>{
  for(const modify of [({model})=>model.images.push({id:'99',url}),({model})=>model.images.shift(),({model})=>model.images[0].id='11',({rule})=>rule.retired.push('11'),({rule})=>rule.colors.Bege.push('12'),({rule})=>rule.retired=false,({rule})=>rule.colors.Preto=[],({rule})=>rule.axis=3]){const data=audited();modify(data);assert.equal(getVerifiedGallery(data.model,data.rule),null);}
});
test('unknown availability is not labelled sold out; helper defaults to audited production rules only',()=>{
  const {model,rule}=audited();model.variants.forEach(v=>delete v.available);assert.equal(getVerifiedGallery(model,rule).colors[0].soldOut,false);assert.equal(getVerifiedGallery(model),null);assert.equal(getVerifiedGallery(null),null);
});
function singleAudited(){const data=audited();data.model.variants.forEach(v=>{v.option1=null;v.option2=null;v.image=11;});data.rule={mode:'single',approved:['11','12'],retired:['10','21'],bindings:data.model.variants.map(v=>({id:String(v.id),sku:v.sku,image:String(v.image),options:[v.option0,null,null]}))};return data;}
test('single mode never invents a color, keeps exact photo order and never mutates input',()=>{const {model,rule}=singleAudited(),before=JSON.stringify({model,rule}),m=getVerifiedGallery(model,rule);assert.ok(m);assert.equal(m.single,true);assert.equal(m.axis,null);assert.equal(m.colors[0].name,'');assert.deepEqual(m.colors[0].images.map(i=>i.id),['11','12']);assert.equal(JSON.stringify({model,rule}),before);});
test('single mode rejects incomplete evidence, extra color axes or changed identities and assets',()=>{
  for(const modify of [({rule})=>delete rule.bindings,({rule})=>rule.bindings.pop(),({rule})=>rule.axis=1,({rule})=>rule.colors={Preto:['11']},({rule})=>rule.approved=[],({model})=>model.variants[0].option1='Preto',({model})=>model.variants[0].option2='Azul',({model})=>model.variants[0].sku='other',({model})=>model.variants[0].image=10,({model})=>model.images.push({id:'99',url})]){const d=singleAudited();modify(d);assert.equal(getVerifiedGallery(d.model,d.rule),null);}
});
test('Martta production map accepts only the five confirmed bindings and preserves the retired source',()=>{
  // These are the public identity/image values reported by the root's live DOM read,
  // not an invented after-snapshot or a substitute for the publication audit.
  const ids=[1587979950,1587979956,1587979960,1587979963,1587979966],stocks=[1,2,1,2,1];
  const variants=ids.map((id,i)=>({id,sku:'3315-'+(34+i)+'-PRETO',product_id:364501337,option0:String(34+i),option1:'Preto',option2:null,image:1266967783,stock:stocks[i],price_number:310.9,available:true,is_visible:true,contact:false}));
  const currentImages=[{id:'1266967783',url:'//dcdn-us.mitiendanube.com/stores/008/137/758/products/candidata_centralizada-68f62100534f21bad517886674743542-1024-1024.webp'},{id:'1263284006',url:'https://dcdn-us.mitiendanube.com/stores/008/137/758/products/original-b64faf18108162f9c317882328022009-1024-1024.webp'}];
  const before=JSON.stringify(variants),m=verified('364501337',variants,currentImages);assert.ok(m);assert.deepEqual(m.colors.map(c=>c.name),['Preto']);assert.deepEqual(m.colors[0].images.map(i=>i.id),["1266967783","1263284006"]);assert.deepEqual(m.retired,['1263284006']);assert.equal(JSON.stringify(variants),before);
  assert.equal(verified('364501337',variants,currentImages.slice(0,1)),null);assert.equal(verified('364501337',variants.map((v,i)=>i===0?{...v,image:1263284006}:v),currentImages),null);assert.equal(verified('364501337',variants.slice(0,4),currentImages),null);
});
test('Martta retained local baseline agrees on all five identities, options, price and stock',t=>{
  const fs=require('node:fs'),path=require('node:path'),file=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/qa-martta-bella-2026-09-06/baseline-live/scarpin-martta.snapshot.json');if(!fs.existsSync(file)){t.skip('local evidence is not distributed with the public site');return;}
  const base=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(base.htmlSha256,'9B3B7B1A0B1427173D8AF5FD841F37A825E3818C60AACA3B41E9B4420A259FE2');assert.equal(base.product.id,'364501337');assert.deepEqual(base.gallery.map(i=>i.id),['1263284006']);
  assert.deepEqual(base.variants.map(v=>[v.id,v.sku,v.option0,v.option1,v.option2,v.price_number,v.stock]),[[1587979950,'3315-34-PRETO','34','Preto',null,310.9,1],[1587979956,'3315-35-PRETO','35','Preto',null,310.9,2],[1587979960,'3315-36-PRETO','36','Preto',null,310.9,1],[1587979963,'3315-37-PRETO','37','Preto',null,310.9,2],[1587979966,'3315-38-PRETO','38','Preto',null,310.9,1]]);
  assert.equal(verified(base.product.id,base.variants,base.gallery),null,'the pre-publication state cannot activate the replacement');
});
test('Bella production map orders the white cover and two original photos while hiding the processed secondary image',()=>{
  // Public post-save values supplied by root; this fixture does not claim to be an HTTP capture.
  const ids=[1587980213,1587980215,1587980218,1587980222,1587980224],stocks=[1,2,1,2,1];
  const variants=ids.map((id,i)=>({id,sku:'3322-'+(34+i)+'-PRETO',product_id:364501384,option0:String(34+i),option1:'Preto',option2:null,image:1266970460,stock:stocks[i],price_number:269.9,available:true,is_visible:true,contact:false}));
  const prefix='https://dcdn-us.mitiendanube.com/stores/008/137/758/products/';
  const gallery=[{id:'1266970460',url:prefix+'bella_isolada_v2_candidata-bf39aa029e3daa045e17886680921682-1024-1024.webp'},{id:'1263284404',url:prefix+'original-eeca8c0be1a4d1060617882328660522-1024-1024.webp'},{id:'1263284416',url:prefix+'original-2e1b47c4b185ea1a0217882328673913-1024-1024.webp'},{id:'1266970459',url:prefix+'bella_em_uso_v2_corte_natural_candidata-1fed51f3eecd2d705817886680920547-1024-1024.webp'}];
  const before=JSON.stringify({variants,gallery}),m=verified('364501384',variants,gallery);assert.ok(m);assert.deepEqual(m.colors[0].images.map(i=>i.id),["1266970460","1263284416","1263284404"]);assert.deepEqual(m.retired,['1263284404','1263284416']);assert.equal(JSON.stringify({variants,gallery}),before);
  assert.equal(verified('364501384',variants,gallery.slice(0,3)),null);assert.equal(verified('364501384',variants.map((v,i)=>i===4?{...v,image:1263284404}:v),gallery),null);assert.equal(verified('364501384',variants.slice(0,4),gallery),null);
});
test('Bella local baseline confirms exact preexisting identities and rejects pre-save gallery',t=>{
  const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),basePath=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/qa-martta-bella-2026-09-06/baseline-live/slingback-bella'),file=basePath+'.snapshot.json';if(!fs.existsSync(file)){t.skip('local evidence is not distributed with the public site');return;}
  const base=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(base.product.id,'364501384');assert.equal(crypto.createHash('sha256').update(fs.readFileSync(basePath+'.html')).digest('hex').toUpperCase(),'E7355E50B90DA98719364808A3814DA11C75EC816A86FBBBC15685EAE6825C1A');assert.deepEqual(base.gallery.map(i=>i.id),['1263284404','1263284416']);
  assert.deepEqual(base.variants.map(v=>[v.id,v.sku,v.option0,v.option1,v.option2,v.price_number,v.stock]),[[1587980213,'3322-34-PRETO','34','Preto',null,269.9,1],[1587980215,'3322-35-PRETO','35','Preto',null,269.9,2],[1587980218,'3322-36-PRETO','36','Preto',null,269.9,1],[1587980222,'3322-37-PRETO','37','Preto',null,269.9,2],[1587980224,'3322-38-PRETO','38','Preto',null,269.9,1]]);assert.equal(verified(base.product.id,base.variants,base.gallery),null);
});
