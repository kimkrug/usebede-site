'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const base=path.resolve(__dirname,'../../outputs/ui-refinement-2026-09-06/baseline');
const commit='4f069f76086d810ec973e6edac5d304e9e7d807d';
const files=['home-ui.js','style.css','index.html','store-enhancements.js'];
(async()=>{
 fs.mkdirSync(base,{recursive:true});const evidence=[];
 await Promise.all(files.map(async file=>{
  const url=`https://raw.githubusercontent.com/kimkrug/usebede-site/${commit}/${file}`;
  const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw new Error(`${file}: HTTP ${response.status}`);
  const body=Buffer.from(await response.arrayBuffer());fs.writeFileSync(path.join(base,file),body);
  evidence.push({file,commit,url,bytes:body.length,sha256:crypto.createHash('sha256').update(body).digest('hex')});
 }));
 fs.writeFileSync(path.join(base,'manifest.json'),JSON.stringify({capturedAt:new Date().toISOString(),files:evidence},null,2));
 console.log(JSON.stringify(evidence,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
