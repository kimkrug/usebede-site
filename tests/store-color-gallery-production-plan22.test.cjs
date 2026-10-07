'use strict';
// Literal expectations transcribed from the separately reviewed offline plan,
// not generated from the runtime MAP. These are source/fixture contracts, not
// a claim that publication or live visual QA has already happened.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {getVerifiedGallery}=require('../store-color-gallery.js');
const EXPECTED=[
  ['364500246',null,['1267066076','1263356188','1263356193']],
  ['364500780','Dourada',['1266855344']],['364500780','Prata',['1266899517']],
  ['364501337','Preto',['1266967783','1263284006']],
  ['364501384','Preto',['1266970460','1263284416','1263284404']],
  ['364500371',null,['1266976473','1263332523','1263332530']],
  ['364500362',null,['1266977371','1263332467','1263332473']],
  ['364500357',null,['1266979119','1263332440','1263332444']],
  ['363506708',null,['1266980380','1263330536','1263330542']],
  ['363506702',null,['1266981269','1263333039','1263333041']],
  ['364500317',null,['1266982039','1263358176','1263358186']],
  ['364499940',null,['1267014575','1263335620','1263335624']],
  ['364500367',null,['1267018094','1263332495','1263332500']],
  ['364500386',null,['1267024727','1263358382']],
  ['364500239',null,['1267027196','1263356160','1263356166']],
  ['364499989',null,['1267028908','1263652612','1263652639']],
  ['364500375',null,['1267035164','1263358269','1263358289']],
  ['364500025',null,['1267037175','1263356015','1263356022']],
  ['364500939',null,['1267039299','1263320185','1263320205','1263320214']],
  ['364501366','Preto',['1267015050','1263369345','1263369374']],
  ['364500961',null,['1267053460','1263317052','1263317073','1263317080','1263317091','1263317122']],
  ['364500797',null,['1267062711','1263321119','1263321139']],
  ['364500789',null,['1267016141','1263321056','1263321027','1263321064','1263321099']]
];
function actualRules(){
  const source=fs.readFileSync(path.resolve(__dirname,'../store-color-gallery.js'),'utf8');
  const marker='return{verified,getVerifiedGallery,imageURL,start};';assert.equal(source.split(marker).length,2);
  const context={module:{exports:{}},URL};vm.runInNewContext(source.replace(marker,'return{rules:MAP};'),context);
  return JSON.parse(JSON.stringify(context.module.exports.rules));
}
test('plan22: exact declared galleries keep 23 covers and 46 original frames across 22 products',()=>{
  const actual=actualRules(),products=[...new Set(EXPECTED.map(row=>row[0]))];
  assert.equal(products.length,22);assert.equal(EXPECTED.length,23);assert.equal(EXPECTED.reduce((n,row)=>n+row[2].length,0),69);
  // This contract remains scoped to the original22. The lote20 test checks the full expanded inventory.
  assert.deepEqual(Object.keys(actual).filter(id=>products.includes(id)).sort(),products.slice().sort());
  for(const id of products){
    const rows=EXPECTED.filter(row=>row[0]===id),rule=actual[id];
    assert.ok(Array.isArray(rule.bindings)&&rule.bindings.length>0,id+' keeps complete audited binding declarations');
    if(rows[0][1]===null){assert.equal(rule.mode,'single');assert.deepEqual(rule.gallery,rows[0][2],id);assert.equal(rule.approved[0],rows[0][2][0]);}
    else{assert.equal(rule.axis,1);assert.deepEqual(rule.gallery,Object.fromEntries(rows.map(([,color,ids])=>[color,ids])),id);for(const [,color,ids] of rows)assert.equal(rule.colors[color][0],ids[0]);}
  }
  const visible=EXPECTED.flatMap(row=>row[2]);assert.equal(new Set(visible).size,69);
  for(const id of ['1263356157','1263288451','1266970459','1263320806','1263320798'])assert.equal(visible.includes(id),false,'Pending/processed/offline-only image must remain outside display lists');
  assert.ok(actual['364500239'].retired.includes('1263356157'));
  assert.ok(actual['364500375'].retired.includes('1263288451'));
  assert.ok(actual['364501384'].colors.Preto.includes('1266970459'),'Hidden processed image stays in the exact native inventory');
});

test('plan22: local independent plan hash and 23 literal rows agree when audit artifact is available',t=>{
  const file=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/diretriz-capa-galeria-2026-09-06/plano-galerias-22-produtos-2026-09-06.json');
  if(!fs.existsSync(file)){t.skip('local audit plan is not distributed with the public website');return;}
  const bytes=fs.readFileSync(file);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),'C19D431BADFFD6421F088A6912FC55102C4225BB8B046758583CDEFCD1C43557');
  const plan=JSON.parse(bytes);assert.deepEqual(plan.products.flatMap(p=>p.galleryOrderByColor.map(group=>[p.productId,group.color,group.ids])),EXPECTED);
  assert.equal(plan.counts.products,22);assert.equal(plan.counts.approvedCoverIDs,23);assert.equal(plan.counts.nativeOriginalIDsToKeep,46);assert.equal(plan.counts.plannedVisibleIDsWithoutNewUploads,69);
});

// Root supplied these independently from a live CUA read on 2026-09-06.
// This literal fixture does not impersonate a persisted HTTP/DOM snapshot or
// claim prices/stock that were not included in the supplied observation.
const PARIS=[
  ['1587977373','3173-34-DOURADA','1266855344','34','Dourada'],
  ['1587977375','3173-39-PRATA','1266899517','39','Prata'],
  ['1587977378','3173-38-PRATA','1266899517','38','Prata'],
  ['1587977379','3173-37-PRATA','1266899517','37','Prata'],
  ['1587977382','3173-36-PRATA','1266899517','36','Prata'],
  ['1587977384','3173-35-PRATA','1266899517','35','Prata'],
  ['1587977386','3173-34-PRATA','1266899517','34','Prata'],
  ['1587977391','3173-39-DOURADA','1266855344','39','Dourada'],
  ['1587977392','3173-38-DOURADA','1266855344','38','Dourada'],
  ['1587977394','3173-37-DOURADA','1266855344','37','Dourada'],
  ['1587977397','3173-36-DOURADA','1266855344','36','Dourada'],
  ['1587977399','3173-35-DOURADA','1266855344','35','Dourada']
];
function paris(){return{productId:'364500780',variants:PARIS.map(([id,sku,image,size,color])=>({id,sku,image,product_id:'364500780',option0:size,option1:color,option2:null})),images:['1266855344','1266899517'].map(id=>({id,url:'https://dcdn-us.mitiendanube.com/test-fixture/'+id+'.webp'}))};}
test('Paris production: all twelve exact observed bindings keep each color on its declared cover',()=>{
  const rules=actualRules();assert.deepEqual(rules['364500780'].bindings,PARIS.map(([id,sku,image,size,color])=>({id,sku,image,options:[size,color,null]})));
  const model=paris(),before=JSON.stringify(model),result=getVerifiedGallery(model);assert.ok(result);assert.equal(result.single,false);assert.equal(result.axis,1);
  assert.deepEqual(result.colors.map(c=>[c.name,c.images.map(i=>i.id)]),[['Dourada',['1266855344']],['Prata',['1266899517']]]);assert.equal(JSON.stringify(model),before);
});
test('Paris production: missing, duplicated, changed or cross-color binding and extra assets remain rejected',()=>{
  for(const change of [m=>m.variants.pop(),m=>m.variants.push({...m.variants[0]}),m=>m.variants[0].id='999',m=>m.variants[0].sku='different',m=>m.variants[0].option0='99',m=>m.variants[0].option1='Prata',m=>m.variants[0].image='1266899517',m=>m.images.pop(),m=>m.images.push({id:'1263320806',url:m.images[0].url})]){const m=paris();change(m);assert.equal(getVerifiedGallery(m),null);}
});
