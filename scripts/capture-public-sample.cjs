'use strict';
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const response=await fetch('https://loja.usebede.com.br/produtos/scarpin-martta-medio/',{signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('HTTP '+response.status);
 const html=await response.text();
 const destination=path.resolve(__dirname,'../../outputs/catalogo-revisao/martta-publica.html');
 fs.writeFileSync(destination,html);
 console.log(destination);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
