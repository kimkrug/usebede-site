'use strict';
// Synthetic unit-test fixture based on the documented legacy shared-image case.
// This fixture is not a production observation or import authorization.
const test=require('node:test'),assert=require('node:assert/strict');
const {getVerifiedGallery}=require('../store-color-gallery.js');
function fixture(){
 const model={productId:'364500285',images:[{id:'1263358045',url:'https://dcdn-us.mitiendanube.com/stores/008/137/758/products/original-66e8611cba0b9-9377b58a6d66ef008217882608076950-1024-1024.webp'}],variants:[
  {id:'1587974939',sku:'3056-CROCO',product_id:'364500285',option0:'Croco',option1:null,option2:null,image:'1263358045',available:true},
  {id:'1587974938',sku:'3056-PRETO',product_id:'364500285',option0:'Preto',option1:null,option2:null,image:'1263358045',available:false}
 ]};
 const rule={axis:0,legacySharedEmptyColors:['Croco'],colors:{Croco:[],Preto:['1263358045']},gallery:{Croco:[],Preto:['1263358045']},retired:[],bindings:model.variants.map(v=>({id:v.id,sku:v.sku,image:v.image,options:[v.option0,null,null]}))};
 return {model,rule};
}
test('explicitly missing Croco stays empty even when old native photo is also Preto cover',()=>{
 const {model,rule}=fixture(),out=getVerifiedGallery(model,rule);assert.ok(out);assert.deepEqual(out.colors.find(c=>c.name==='Croco').images,[]);assert.equal(out.colors.find(c=>c.name==='Preto').images[0].id,'1263358045');
});
test('a missing color cannot leak another color image into its displayed gallery',()=>{
 const {model,rule}=fixture();rule.gallery.Croco=['1263358045'];assert.equal(getVerifiedGallery(model,rule),null);
});
test('empty shared-native color still requires exact audited SKU and image bindings',()=>{
 for(const key of ['sku','image']){const {model,rule}=fixture();rule.bindings[0][key]='999999';assert.equal(getVerifiedGallery(model,rule),null);}
});
test('unknown native image is rejected even for an explicitly empty color',()=>{
 const {model,rule}=fixture();model.variants[0].image='999999';rule.bindings[0].image='999999';assert.equal(getVerifiedGallery(model,rule),null);
});
test('shared-native missing color requires explicit gallery and complete binding coverage',()=>{
 const a=fixture();delete a.rule.gallery;assert.equal(getVerifiedGallery(a.model,a.rule),null);
 const b=fixture();b.rule.bindings.pop();assert.equal(getVerifiedGallery(b.model,b.rule),null);
});
test('shared-native exception is explicit and cannot authorize unknown, duplicate or nonempty colors',()=>{
 for(const value of [undefined,'Croco',['Azul'],['Croco','Croco'],['Preto']]){const {model,rule}=fixture();rule.legacySharedEmptyColors=value;assert.equal(getVerifiedGallery(model,rule),null);}
});
