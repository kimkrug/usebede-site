'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {collectCatalogue} = require('../api/catalogo.js');
(async () => {
  const data = await collectCatalogue();
  const dir = path.resolve(__dirname, '../../outputs/catalogo-revisao');
  fs.mkdirSync(dir, {recursive:true});
  fs.writeFileSync(path.join(dir, 'catalogo-publico-atual.json'), JSON.stringify(data,null,2));
  console.log(JSON.stringify({at:data.fetchedAt,pages:data.pages,total:data.products.length,categories:data.categories,
    promotions:data.products.filter(p=>p.compareAtCents).length,samples:data.products.slice(0,2)},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
