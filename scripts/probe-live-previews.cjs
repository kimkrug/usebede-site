const fs=require('node:fs'),path=require('node:path'),p=require('../store-enhancements');
const out=path.resolve(__dirname,'../../outputs/ui-refinement-2026-09-06/live-pdp');
(async()=>{fs.mkdirSync(out,{recursive:true});for(const slug of ['rasteirinha-paris','bota-catia','slingback-sofia','scarpin-martta']){
 const url='https://loja.usebede.com.br/produtos/'+slug+'/';
 try{const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)}),html=await response.text();
 fs.writeFileSync(path.join(out,slug+'.html'),html);let result;try{result=p.parseProductHTML(html);}catch(e){result={error:e.message};}
 console.log(JSON.stringify({slug,status:response.status,bytes:html.length,groups:(html.match(/js-product-variants-group/g)||[]).length,result}));
 }catch(e){console.log(JSON.stringify({slug,error:e.message,cause:e.cause?.message}));}
}})();
