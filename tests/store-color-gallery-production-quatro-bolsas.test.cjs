'use strict';
// Contract tests against saved observations; these are not new live observations.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../../outputs/fotos-padrao-etapa2/proximas-capas-2026-09-07');
const {parseMap}=require(path.join(dir,'../lote20-capas-producao-2026-09-06/gerar-patch-map-pos.cjs'));
const {modelFor,normalize,files}=require(path.join(dir,'preparar-galerias-bolsas-reais-2026-09-08.cjs'));
const {getVerifiedGallery}=require('../store-color-gallery.js');
const current=JSON.parse(JSON.stringify(parseMap(fs.readFileSync(path.resolve(__dirname,'../store-color-gallery.js'),'utf8'))));
const previous=JSON.parse(JSON.stringify(parseMap(fs.readFileSync(path.join(dir,'BASE_RUNTIME_45_PRE_BOLSAS_2026-09-08.js'),'utf8'))));
const expected={
 maria:{id:'364500953',gallery:{Caramelo:[],Dourada:[],Nude:[],'Off White':[],Prata:['1267310897','1263364183'],Preto:['1263364233','1263364254','1263364276'],'Vermelho Escuro':[]}},
 fabi:{id:'364501049',gallery:{Dourado:['1263367631'],Prata:['1268230347','1263367617']}},
 jussara:{id:'364500285',gallery:{Croco:[],'Off White':['1263358053'],Preto:['1263358045'],'Vermelho Escuro':['1263358059']}},
 jessica:{id:'363507514',gallery:{Croco:['1268237729','1263357975'],Mostarda:['1263357996'],Preto:['1263358018','1263358033','1263357982']}}
};
test('four bags are the only additions to the 45 previously published rules',()=>{
 assert.equal(Object.keys(previous).length,45);assert.equal(Object.keys(current).length,49);
 for(const [id,rule] of Object.entries(previous))assert.deepEqual(current[id],rule,id);
 assert.deepEqual(Object.keys(current).filter(id=>!Object.hasOwn(previous,id)).sort(),Object.values(expected).map(x=>x.id).sort());
});
test('saved native observations validate 17 photos in 16 colors, with six explicitly empty colors',()=>{
 let native=0,variants=0,displayed=0,empty=0;
 for(const [key,{id,gallery}] of Object.entries(expected)){
  const capture=normalize(JSON.parse(fs.readFileSync(path.join(dir,files[key]),'utf8'))),rule=current[id];
  assert.deepEqual(rule.gallery,gallery,key);assert.equal(rule.axis,0);
  const result=getVerifiedGallery(modelFor(capture),rule);assert.ok(result,key);
  for(const color of result.colors)assert.deepEqual(color.images.map(x=>x.id),gallery[color.name],key+' '+color.name);
  native+=capture.gallery.length;variants+=capture.rows.length;displayed+=Object.values(gallery).flat().length;empty+=Object.values(gallery).filter(x=>!x.length).length;
 }
 assert.deepEqual({native,variants,displayed,empty},{native:71,variants:16,displayed:17,empty:6});
});
test('legacy shared native image exception is restricted to the empty Croco color of Jussara',()=>{
 assert.deepEqual(current['364500285'].legacySharedEmptyColors,['Croco']);
 for(const [id,rule] of Object.entries(current))if(id!=='364500285')assert.equal(rule.legacySharedEmptyColors,undefined,id);
 assert.deepEqual(current['364500285'].gallery.Croco,[]);
});
