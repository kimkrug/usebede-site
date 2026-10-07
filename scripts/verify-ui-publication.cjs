'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../home-release-ui-2026-09-06');
const output=path.resolve(__dirname,'../../outputs/ui-refinement-2026-09-06');
const files=['home-ui.js','style.css','store-enhancements.js','store-product-ui.js','store-filter-bar.js','store-color-gallery.js'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const results=await Promise.all(files.map(async file=>{
  const expected=sha(fs.readFileSync(path.join(root,file))),url='https://www.usebede.com.br/'+file+'?v=20260906_ui1';
  try{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});const b=Buffer.from(await r.arrayBuffer()),actual=sha(b);
   return{file,url,status:r.status,expected,actual,match:r.ok&&actual===expected,cacheControl:r.headers.get('cache-control')};
  }catch(e){return{file,url,expected,match:false,error:e.message};}
 }));
 const report={capturedAt:new Date().toISOString(),allMatch:results.every(r=>r.match),files:results};
 fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'publicacao-verificada.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));if(!report.allMatch)process.exitCode=2;
})().catch(e=>{console.error(e.message);process.exitCode=1;});
