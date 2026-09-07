/* Audited image/color presentation. No edits to catalogue, stock or cart. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BedeColorGallery=api;})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  // New rules with retired images require an exact, audited binding for EVERY variant.
  // Keep old images in the native gallery/admin; this module never deletes those nodes.
  const MAP={
    "364500647":{"axis":1,"colors":{"Cinza":["1267281639"],"Preto":["1263329122"]},"gallery":{"Cinza":["1267281639","1263329113","1263329117"],"Preto":["1263329122"]},"retired":["1263329113","1263329117","1263324856","1263324863","1263324868"],"bindings":[{"id":"1587976741","sku":"3137-34-CINZA","image":"1267281639","options":["34","Cinza",null]},{"id":"1587976735","sku":"3137-34-PRETO","image":"1263329122","options":["34","Preto",null]},{"id":"1587976740","sku":"3137-35-CINZA","image":"1267281639","options":["35","Cinza",null]},{"id":"1587976729","sku":"3137-35-PRETO","image":"1263329122","options":["35","Preto",null]},{"id":"1587976737","sku":"3137-36-CINZA","image":"1267281639","options":["36","Cinza",null]},{"id":"1587976717","sku":"3137-36-PRETO","image":"1263329122","options":["36","Preto",null]},{"id":"1587976736","sku":"3137-37-CINZA","image":"1267281639","options":["37","Cinza",null]},{"id":"1587976714","sku":"3137-37-PRETO","image":"1263329122","options":["37","Preto",null]},{"id":"1587976713","sku":"3137-38-CINZA","image":"1267281639","options":["38","Cinza",null]},{"id":"1587976715","sku":"3137-38-PRETO","image":"1263329122","options":["38","Preto",null]}]},
    "364500521":{"axis":1,"colors":{"Caramelo":["1267284080"],"Preto":["1263359609"]},"gallery":{"Caramelo":["1267284080","1263359596","1263359646"],"Preto":["1263359609","1263359629","1263359657"]},"retired":["1263359596","1263359629","1263359646","1263359657","1263329654","1263329658","1263329666","1263329673","1263329679","1263322427","1263322436","1263322447","1263322460","1263322467","1263294174","1263294183","1263294192","1263294206","1263294213"],"bindings":[{"id":"1587976144","sku":"3114-34-CARAMELO","image":"1267284080","options":["34","Caramelo",null]},{"id":"1587976135","sku":"3114-34-PRETO","image":"1263359609","options":["34","Preto",null]},{"id":"1587976118","sku":"3114-35-CARAMELO","image":"1267284080","options":["35","Caramelo",null]},{"id":"1587976123","sku":"3114-35-PRETO","image":"1263359609","options":["35","Preto",null]},{"id":"1587976142","sku":"3114-36-CARAMELO","image":"1267284080","options":["36","Caramelo",null]},{"id":"1587976147","sku":"3114-36-PRETO","image":"1263359609","options":["36","Preto",null]},{"id":"1587976120","sku":"3114-37-CARAMELO","image":"1267284080","options":["37","Caramelo",null]},{"id":"1587976131","sku":"3114-37-PRETO","image":"1263359609","options":["37","Preto",null]},{"id":"1587976140","sku":"3114-38-CARAMELO","image":"1267284080","options":["38","Caramelo",null]},{"id":"1587976149","sku":"3114-38-PRETO","image":"1263359609","options":["38","Preto",null]},{"id":"1587976138","sku":"3114-39-CARAMELO","image":"1267284080","options":["39","Caramelo",null]},{"id":"1587976125","sku":"3114-39-PRETO","image":"1263359609","options":["39","Preto",null]}]},
    "363515143":{"axis":1,"colors":{"Azul":["1266826515"],"Caramelo":["1263359085"],"Off White":["1263359043"],"Preto":["1263359054"],"Rosa Claro":["1263359075"]},"gallery":{"Azul":["1266826515","1263359040"],"Caramelo":["1263359085"],"Off White":["1263359043"],"Preto":["1263359054"],"Rosa Claro":["1263359075"]},"retired":["1266782369","1263359040","1263359064","1263331804","1263331812","1263331820","1263331824","1263331835","1263331840","1263292275","1263292285","1263292297","1263292310","1263292321","1263292337","1260008531"],"bindings":[{"id":"1585066067","sku":"3102-34-AZUL","image":"1266826515","options":["34","Azul",null]},{"id":"1585066176","sku":"3102-34-CARAMELO","image":"1263359085","options":["34","Caramelo",null]},{"id":"1585066196","sku":"3102-34-OFFWHITE","image":"1263359043","options":["34","Off White",null]},{"id":"1585066187","sku":"3102-34-PRETO","image":"1263359054","options":["34","Preto",null]},{"id":"1585066031","sku":"3102-34-ROSACLARO","image":"1263359075","options":["34","Rosa Claro",null]},{"id":"1585066065","sku":"3102-35-AZUL","image":"1266826515","options":["35","Azul",null]},{"id":"1585066173","sku":"3102-35-CARAMELO","image":"1263359085","options":["35","Caramelo",null]},{"id":"1585066134","sku":"3102-35-OFFWHITE","image":"1263359043","options":["35","Off White",null]},{"id":"1585066183","sku":"3102-35-PRETO","image":"1263359054","options":["35","Preto",null]},{"id":"1585066029","sku":"3102-35-ROSACLARO","image":"1263359075","options":["35","Rosa Claro",null]},{"id":"1585066062","sku":"3102-36-AZUL","image":"1266826515","options":["36","Azul",null]},{"id":"1585066170","sku":"3102-36-CARAMELO","image":"1263359085","options":["36","Caramelo",null]},{"id":"1585066102","sku":"3102-36-OFFWHITE","image":"1263359043","options":["36","Off White",null]},{"id":"1585066180","sku":"3102-36-PRETO","image":"1263359054","options":["36","Preto",null]},{"id":"1585066027","sku":"3102-36-ROSACLARO","image":"1263359075","options":["36","Rosa Claro",null]},{"id":"1585066215","sku":"3102-37-AZUL","image":"1266826515","options":["37","Azul",null]},{"id":"1585066168","sku":"3102-37-CARAMELO","image":"1263359085","options":["37","Caramelo",null]},{"id":"1585066081","sku":"3102-37-OFFWHITE","image":"1263359043","options":["37","Off White",null]},{"id":"1585066208","sku":"3102-37-PRETO","image":"1263359054","options":["37","Preto",null]},{"id":"1585066191","sku":"3102-37-ROSACLARO","image":"1263359075","options":["37","Rosa Claro",null]},{"id":"1585066059","sku":"3102-38-AZUL","image":"1266826515","options":["38","Azul",null]},{"id":"1585066164","sku":"3102-38-CARAMELO","image":"1263359085","options":["38","Caramelo",null]},{"id":"1585066077","sku":"3102-38-OFFWHITE","image":"1263359043","options":["38","Off White",null]},{"id":"1585066200","sku":"3102-38-PRETO","image":"1263359054","options":["38","Preto",null]},{"id":"1585066025","sku":"3102-38-ROSACLARO","image":"1263359075","options":["38","Rosa Claro",null]},{"id":"1585066043","sku":"3102-39-AZUL","image":"1266826515","options":["39","Azul",null]},{"id":"1585066150","sku":"3102-39-CARAMELO","image":"1263359085","options":["39","Caramelo",null]},{"id":"1585066072","sku":"3102-39-OFFWHITE","image":"1263359043","options":["39","Off White",null]},{"id":"1585066177","sku":"3102-39-PRETO","image":"1263359054","options":["39","Preto",null]},{"id":"1585066020","sku":"3102-39-ROSACLARO","image":"1263359075","options":["39","Rosa Claro",null]}]},
    "364501004":{"axis":1,"colors":{"Marrom":[],"Preto":["1267259700"]},"gallery":{"Marrom":[],"Preto":["1267259700","1263365911"]},"retired":["1263365902","1263365911","1263315518","1263315535"],"bindings":[{"id":"1587978396","sku":"3210-39-MARROM","image":"1263365902","options":["39","Marrom",null]},{"id":"1587978397","sku":"3210-38-MARROM","image":"1263365902","options":["38","Marrom",null]},{"id":"1587978399","sku":"3210-37-MARROM","image":"1263365902","options":["37","Marrom",null]},{"id":"1587978401","sku":"3210-36-MARROM","image":"1263365902","options":["36","Marrom",null]},{"id":"1587978403","sku":"3210-35-MARROM","image":"1263365902","options":["35","Marrom",null]},{"id":"1587978404","sku":"3210-34-MARROM","image":"1263365902","options":["34","Marrom",null]},{"id":"1587978406","sku":"3210-39-PRETO","image":"1267259700","options":["39","Preto",null]},{"id":"1587978408","sku":"3210-38-PRETO","image":"1267259700","options":["38","Preto",null]},{"id":"1587978410","sku":"3210-37-PRETO","image":"1267259700","options":["37","Preto",null]},{"id":"1587978413","sku":"3210-36-PRETO","image":"1267259700","options":["36","Preto",null]},{"id":"1587978414","sku":"3210-35-PRETO","image":"1267259700","options":["35","Preto",null]},{"id":"1587978417","sku":"3210-34-PRETO","image":"1267259700","options":["34","Preto",null]}]},
    "364499928":{"mode":"single","approved":["1267240615"],"gallery":["1267240615","1263652434","1263652484"],"retired":["1263652434","1263652484","1263353968","1263353982","1263335604","1263335607","1263273987","1263273998"],"bindings":[{"id":"1587973979","sku":"3012-34","image":"1267240615","options":["34",null,null]},{"id":"1587973983","sku":"3012-35","image":"1267240615","options":["35",null,null]},{"id":"1587973987","sku":"3012-36","image":"1267240615","options":["36",null,null]},{"id":"1587973990","sku":"3012-37","image":"1267240615","options":["37",null,null]},{"id":"1587973992","sku":"3012-38","image":"1267240615","options":["38",null,null]},{"id":"1587973994","sku":"3012-39","image":"1267240615","options":["39",null,null]}]},
    "363507458":{"axis":1,"colors":{"Taupe":["1263656110"],"Preto":["1263656085"],"Blush":["1267201850"]},"gallery":{"Taupe":["1263656110"],"Preto":["1263656085"],"Blush":["1267201850","1263656053"]},"retired":["1263656053","1263357026","1263357041","1263357050","1263333398","1263333401","1263333403","1263283376","1263283387","1263283403","1260007275"],"bindings":[{"id":"1585039821","sku":"3041-34-TAUPE","image":"1263656110","options":["34","Taupe",null]},{"id":"1585039836","sku":"3041-35-TAUPE","image":"1263656110","options":["35","Taupe",null]},{"id":"1585039863","sku":"3041-36-TAUPE","image":"1263656110","options":["36","Taupe",null]},{"id":"1585039870","sku":"3041-37-TAUPE","image":"1263656110","options":["37","Taupe",null]},{"id":"1585039874","sku":"3041-38-TAUPE","image":"1263656110","options":["38","Taupe",null]},{"id":"1585039878","sku":"3041-34-PRETO","image":"1263656085","options":["34","Preto",null]},{"id":"1585039881","sku":"3041-35-PRETO","image":"1263656085","options":["35","Preto",null]},{"id":"1585039885","sku":"3041-36-PRETO","image":"1263656085","options":["36","Preto",null]},{"id":"1585039891","sku":"3041-37-PRETO","image":"1263656085","options":["37","Preto",null]},{"id":"1585039898","sku":"3041-38-PRETO","image":"1263656085","options":["38","Preto",null]},{"id":"1585039902","sku":"3041-34-BLUSH","image":"1267201850","options":["34","Blush",null]},{"id":"1585039905","sku":"3041-35-BLUSH","image":"1267201850","options":["35","Blush",null]},{"id":"1585039907","sku":"3041-36-BLUSH","image":"1267201850","options":["36","Blush",null]},{"id":"1585039910","sku":"3041-37-BLUSH","image":"1267201850","options":["37","Blush",null]},{"id":"1585039913","sku":"3041-38-BLUSH","image":"1267201850","options":["38","Blush",null]}]},
    "364499897":{"axis":1,"colors":{"Bordô":["1267205547"],"Vermelho":["1263353613"]},"gallery":{"Bordô":["1267205547","1263353597","1263353603"],"Vermelho":["1263353613","1263353626"]},"retired":["1263353597","1263353603","1263353626","1263335485","1263335488","1263335490","1263335493","1263273253","1263273266","1263273288","1263273304"],"bindings":[{"id":"1587973880","sku":"3010-34-BORDO","image":"1267205547","options":["34","Bordô",null]},{"id":"1587973884","sku":"3010-38-VERMELHO","image":"1263353613","options":["38","Vermelho",null]},{"id":"1587973887","sku":"3010-37-VERMELHO","image":"1263353613","options":["37","Vermelho",null]},{"id":"1587973890","sku":"3010-36-VERMELHO","image":"1263353613","options":["36","Vermelho",null]},{"id":"1587973896","sku":"3010-35-VERMELHO","image":"1263353613","options":["35","Vermelho",null]},{"id":"1587973899","sku":"3010-34-VERMELHO","image":"1263353613","options":["34","Vermelho",null]},{"id":"1587973902","sku":"3010-38-BORDO","image":"1267205547","options":["38","Bordô",null]},{"id":"1587973906","sku":"3010-37-BORDO","image":"1267205547","options":["37","Bordô",null]},{"id":"1587973909","sku":"3010-36-BORDO","image":"1267205547","options":["36","Bordô",null]},{"id":"1587973912","sku":"3010-35-BORDO","image":"1267205547","options":["35","Bordô",null]}]},
    "364499960":{"axis":1,"colors":{"Cinza":[],"Preto":["1263354226"],"Marrom":["1267208806"]},"gallery":{"Cinza":[],"Preto":["1263354226","1263354232"],"Marrom":["1267208806","1263354206","1263354207"]},"retired":["1263354206","1263354207","1263354232","1263334785","1263334787","1263334789","1263334792","1263274415","1263274430","1263274447","1263274461"],"bindings":[{"id":"1587974075","sku":"3015-37-CINZA","image":"1263354206","options":["37","Cinza",null]},{"id":"1587974078","sku":"3015-35-PRETO","image":"1263354226","options":["35","Preto",null]},{"id":"1587974079","sku":"3015-37-MARROM","image":"1267208806","options":["37","Marrom",null]},{"id":"1587974081","sku":"3015-36-MARROM","image":"1267208806","options":["36","Marrom",null]},{"id":"1587974083","sku":"3015-36-CINZA","image":"1263354206","options":["36","Cinza",null]},{"id":"1587974086","sku":"3015-35-CINZA","image":"1263354206","options":["35","Cinza",null]},{"id":"1587974087","sku":"3015-37-PRETO","image":"1263354226","options":["37","Preto",null]},{"id":"1587974089","sku":"3015-36-PRETO","image":"1263354226","options":["36","Preto",null]},{"id":"1587974092","sku":"3015-34-PRETO","image":"1263354226","options":["34","Preto",null]},{"id":"1587974094","sku":"3015-35-MARROM","image":"1267208806","options":["35","Marrom",null]},{"id":"1587974096","sku":"3015-34-MARROM","image":"1267208806","options":["34","Marrom",null]},{"id":"1587974098","sku":"3015-34-CINZA","image":"1263354206","options":["34","Cinza",null]}]},
    "364500089":{"axis":1,"colors":{"Cacau":["1267212487"],"Preto":["1263653899"],"Malbec":["1263653803"]},"gallery":{"Cacau":["1267212487","1263653731","1263653760"],"Preto":["1263653899"],"Malbec":["1263653803","1263653850"]},"retired":["1263653731","1263653760","1263653850","1263355337","1263355347","1263355359","1263355366","1263355375","1263334099","1263334101","1263334111","1263334119","1263334121","1263276797","1263276802","1263276816","1263276834","1263276846"],"bindings":[{"id":"1587974405","sku":"3026-37-CACAU","image":"1267212487","options":["37","Cacau",null]},{"id":"1587974406","sku":"3026-34-PRETO","image":"1263653899","options":["34","Preto",null]},{"id":"1587974408","sku":"3026-38-MALBEC","image":"1263653803","options":["38","Malbec",null]},{"id":"1587974410","sku":"3026-37-MALBEC","image":"1263653803","options":["37","Malbec",null]},{"id":"1587974412","sku":"3026-35-MALBEC","image":"1263653803","options":["35","Malbec",null]},{"id":"1587974413","sku":"3026-34-MALBEC","image":"1263653803","options":["34","Malbec",null]},{"id":"1587974414","sku":"3026-38-PRETO","image":"1263653899","options":["38","Preto",null]},{"id":"1587974418","sku":"3026-37-PRETO","image":"1263653899","options":["37","Preto",null]},{"id":"1587974419","sku":"3026-36-PRETO","image":"1263653899","options":["36","Preto",null]},{"id":"1587974421","sku":"3026-35-PRETO","image":"1263653899","options":["35","Preto",null]},{"id":"1587974424","sku":"3026-38-CACAU","image":"1267212487","options":["38","Cacau",null]},{"id":"1587974425","sku":"3026-36-CACAU","image":"1267212487","options":["36","Cacau",null]},{"id":"1587974429","sku":"3026-35-CACAU","image":"1267212487","options":["35","Cacau",null]},{"id":"1587974430","sku":"3026-34-CACAU","image":"1267212487","options":["34","Cacau",null]},{"id":"1587974432","sku":"3026-36-MALBEC","image":"1263653803","options":["36","Malbec",null]}]},
    "364500288":{"axis":1,"colors":{"Marsala":["1267224111"],"Preto":["1263333810"],"Verniz":["1263333825"],"Rosado":["1263333817"]},"gallery":{"Marsala":["1267224111","1263333806","1263333808"],"Preto":["1263333810"],"Verniz":["1263333825"],"Rosado":["1263333817"]},"retired":["1263333806","1263333808","1263286737","1263286746","1263286757","1263286774","1263286791"],"bindings":[{"id":"1587974946","sku":"3060-35-MARSALA","image":"1267224111","options":["35","Marsala",null]},{"id":"1587974949","sku":"3060-39-PRETO","image":"1263333810","options":["39","Preto",null]},{"id":"1587974951","sku":"3060-38-PRETO","image":"1263333810","options":["38","Preto",null]},{"id":"1587974953","sku":"3060-37-PRETO","image":"1263333810","options":["37","Preto",null]},{"id":"1587974955","sku":"3060-36-PRETO","image":"1263333810","options":["36","Preto",null]},{"id":"1587974958","sku":"3060-35-PRETO","image":"1263333810","options":["35","Preto",null]},{"id":"1587974961","sku":"3060-34-PRETO","image":"1263333810","options":["34","Preto",null]},{"id":"1587974962","sku":"3060-39-MARSALA","image":"1267224111","options":["39","Marsala",null]},{"id":"1587974965","sku":"3060-38-MARSALA","image":"1267224111","options":["38","Marsala",null]},{"id":"1587974967","sku":"3060-37-MARSALA","image":"1267224111","options":["37","Marsala",null]},{"id":"1587974969","sku":"3060-36-MARSALA","image":"1267224111","options":["36","Marsala",null]},{"id":"1587974971","sku":"3060-34-MARSALA","image":"1267224111","options":["34","Marsala",null]},{"id":"1587974972","sku":"3060-39-VERNIZ","image":"1263333825","options":["39","Verniz",null]},{"id":"1587974974","sku":"3060-38-VERNIZ","image":"1263333825","options":["38","Verniz",null]},{"id":"1587974976","sku":"3060-37-VERNIZ","image":"1263333825","options":["37","Verniz",null]},{"id":"1587974978","sku":"3060-36-VERNIZ","image":"1263333825","options":["36","Verniz",null]},{"id":"1587974980","sku":"3060-35-VERNIZ","image":"1263333825","options":["35","Verniz",null]},{"id":"1587974983","sku":"3060-39-ROSADO","image":"1263333817","options":["39","Rosado",null]},{"id":"1587974985","sku":"3060-38-ROSADO","image":"1263333817","options":["38","Rosado",null]},{"id":"1587974987","sku":"3060-37-ROSADO","image":"1263333817","options":["37","Rosado",null]},{"id":"1587974999","sku":"3060-36-ROSADO","image":"1263333817","options":["36","Rosado",null]},{"id":"1587975002","sku":"3060-35-ROSADO","image":"1263333817","options":["35","Rosado",null]},{"id":"1587975004","sku":"3060-34-ROSADO","image":"1263333817","options":["34","Rosado",null]},{"id":"1587975006","sku":"3060-34-VERNIZ","image":"1263333825","options":["34","Verniz",null]}]},
    "364500305":{"axis":1,"colors":{"Nude":[],"Verde":["1267219163"]},"gallery":{"Nude":[],"Verde":["1267219163","1263358085"]},"retired":["1263358085","1263333011","1263286815"],"bindings":[{"id":"1587975018","sku":"3063-38-NUDE","image":"1263358085","options":["38","Nude",null]},{"id":"1587975020","sku":"3063-39-VERDE","image":"1267219163","options":["39","Verde",null]},{"id":"1587975022","sku":"3063-38-VERDE","image":"1267219163","options":["38","Verde",null]},{"id":"1587975025","sku":"3063-37-VERDE","image":"1267219163","options":["37","Verde",null]},{"id":"1587975026","sku":"3063-35-VERDE","image":"1267219163","options":["35","Verde",null]},{"id":"1587975029","sku":"3063-39-NUDE","image":"1263358085","options":["39","Nude",null]},{"id":"1587975032","sku":"3063-37-NUDE","image":"1263358085","options":["37","Nude",null]},{"id":"1587975034","sku":"3063-36-NUDE","image":"1263358085","options":["36","Nude",null]},{"id":"1587975036","sku":"3063-36-VERDE","image":"1267219163","options":["36","Verde",null]},{"id":"1587975041","sku":"3063-35-NUDE","image":"1263358085","options":["35","Nude",null]}]},
    "364500321":{"mode":"single","approved":["1267216265"],"gallery":["1267216265","1263333117","1263333122","1263333130"],"retired":["1263333117","1263333122","1263333130","1263287145","1263287158","1263287170"],"bindings":[{"id":"1587975084","sku":"3069-35","image":"1267216265","options":["35",null,null]},{"id":"1587975086","sku":"3069-39","image":"1267216265","options":["39",null,null]},{"id":"1587975087","sku":"3069-36","image":"1267216265","options":["36",null,null]},{"id":"1587975088","sku":"3069-34","image":"1267216265","options":["34",null,null]},{"id":"1587975089","sku":"3069-33","image":"1267216265","options":["33",null,null]},{"id":"1587975091","sku":"3069-38","image":"1267216265","options":["38",null,null]},{"id":"1587975095","sku":"3069-37","image":"1267216265","options":["37",null,null]}]},
    "364500483":{"axis":1,"colors":{"Marsala":["1263329396"],"Onix":["1267221895"],"Ferrari":["1263329399"],"Nude":[],"Preto":[]},"gallery":{"Marsala":["1263329396"],"Onix":["1267221895","1263329394"],"Ferrari":["1263329399"],"Nude":[],"Preto":[]},"retired":["1263329394","1263322042","1263322044","1263322053","1263293387","1263293395","1263293415"],"bindings":[{"id":"1587975906","sku":"3110-36-MARSALA","image":"1263329396","options":["36","Marsala",null]},{"id":"1587975909","sku":"3110-37-MARSALA","image":"1263329396","options":["37","Marsala",null]},{"id":"1587975910","sku":"3110-38-ONIX","image":"1267221895","options":["38","Onix",null]},{"id":"1587975911","sku":"3110-33-FERRARI","image":"1263329399","options":["33","Ferrari",null]},{"id":"1587975913","sku":"3110-39-ONIX","image":"1267221895","options":["39","Onix",null]},{"id":"1587975915","sku":"3110-34-NUDE","image":"1263329394","options":["34","Nude",null]},{"id":"1587975916","sku":"3110-33-ONIX","image":"1267221895","options":["33","Onix",null]},{"id":"1587975918","sku":"3110-39-MARSALA","image":"1263329396","options":["39","Marsala",null]},{"id":"1587975919","sku":"3110-33-MARSALA","image":"1263329396","options":["33","Marsala",null]},{"id":"1587975920","sku":"3110-39-FERRARI","image":"1263329399","options":["39","Ferrari",null]},{"id":"1587975922","sku":"3110-36-ONIX","image":"1267221895","options":["36","Onix",null]},{"id":"1587975926","sku":"3110-35-ONIX","image":"1267221895","options":["35","Onix",null]},{"id":"1587975929","sku":"3110-34-ONIX","image":"1267221895","options":["34","Onix",null]},{"id":"1587975931","sku":"3110-38-MARSALA","image":"1263329396","options":["38","Marsala",null]},{"id":"1587975934","sku":"3110-34-MARSALA","image":"1263329396","options":["34","Marsala",null]},{"id":"1587975938","sku":"3110-38-FERRARI","image":"1263329399","options":["38","Ferrari",null]},{"id":"1587975941","sku":"3110-37-FERRARI","image":"1263329399","options":["37","Ferrari",null]},{"id":"1587975945","sku":"3110-36-FERRARI","image":"1263329399","options":["36","Ferrari",null]},{"id":"1587975950","sku":"3110-35-FERRARI","image":"1263329399","options":["35","Ferrari",null]},{"id":"1587975954","sku":"3110-34-FERRARI","image":"1263329399","options":["34","Ferrari",null]},{"id":"1587975958","sku":"3110-37-ONIX","image":"1267221895","options":["37","Onix",null]},{"id":"1587975960","sku":"3110-35-MARSALA","image":"1263329396","options":["35","Marsala",null]},{"id":"1587975963","sku":"3110-39-PRETO","image":"1263329394","options":["39","Preto",null]},{"id":"1587975965","sku":"3110-38-PRETO","image":"1263329394","options":["38","Preto",null]},{"id":"1587975972","sku":"3110-37-PRETO","image":"1263329394","options":["37","Preto",null]},{"id":"1587975980","sku":"3110-36-PRETO","image":"1263329394","options":["36","Preto",null]},{"id":"1587975985","sku":"3110-36-NUDE","image":"1263329394","options":["36","Nude",null]},{"id":"1587975988","sku":"3110-35-NUDE","image":"1263329394","options":["35","Nude",null]},{"id":"1587975993","sku":"3110-37-NUDE","image":"1263329394","options":["37","Nude",null]},{"id":"1587975996","sku":"3110-33-PRETO","image":"1263329394","options":["33","Preto",null]},{"id":"1587975997","sku":"3110-35-PRETO","image":"1263329394","options":["35","Preto",null]},{"id":"1587975999","sku":"3110-34-PRETO","image":"1263329394","options":["34","Preto",null]},{"id":"1587976004","sku":"3110-33-NUDE","image":"1263329394","options":["33","Nude",null]},{"id":"1587976005","sku":"3110-38-NUDE","image":"1263329394","options":["38","Nude",null]},{"id":"1587976006","sku":"3110-39-NUDE","image":"1263329394","options":["39","Nude",null]}]},
    "364500989":{"axis":1,"colors":{"Castanho Avermelhado":["1267220238"],"Oliva":["1263365473"]},"gallery":{"Castanho Avermelhado":["1267220238","1263365445","1263365452"],"Oliva":["1263365473","1263365482"]},"retired":["1263365445","1263365452","1263365482","1263314978","1263314986","1263315003","1263315021"],"bindings":[{"id":"1587978322","sku":"3208-34-CASTANHOAVER","image":"1267220238","options":["34","Castanho Avermelhado",null]},{"id":"1587978342","sku":"3208-34-OLIVA","image":"1263365473","options":["34","Oliva",null]},{"id":"1587978318","sku":"3208-35-CASTANHOAVER","image":"1267220238","options":["35","Castanho Avermelhado",null]},{"id":"1587978337","sku":"3208-35-OLIVA","image":"1263365473","options":["35","Oliva",null]},{"id":"1587978316","sku":"3208-36-CASTANHOAVER","image":"1267220238","options":["36","Castanho Avermelhado",null]},{"id":"1587978333","sku":"3208-36-OLIVA","image":"1263365473","options":["36","Oliva",null]},{"id":"1587978314","sku":"3208-37-CASTANHOAVER","image":"1267220238","options":["37","Castanho Avermelhado",null]},{"id":"1587978328","sku":"3208-37-OLIVA","image":"1263365473","options":["37","Oliva",null]},{"id":"1587978311","sku":"3208-38-CASTANHOAVER","image":"1267220238","options":["38","Castanho Avermelhado",null]},{"id":"1587978326","sku":"3208-38-OLIVA","image":"1263365473","options":["38","Oliva",null]},{"id":"1587978310","sku":"3208-39-CASTANHOAVER","image":"1267220238","options":["39","Castanho Avermelhado",null]},{"id":"1587978309","sku":"3208-39-OLIVA","image":"1263365473","options":["39","Oliva",null]}]},
    "364500034":{"mode":"single","approved":["1267123949"],"gallery":["1267123949","1263354749","1263354761"],"retired":["1263354749","1263354761","1263334921","1263334924","1263275159","1263275174"],"bindings":[{"id":"1587974275","sku":"3022-33","image":"1267123949","options":["33",null,null]},{"id":"1587974272","sku":"3022-34","image":"1267123949","options":["34",null,null]},{"id":"1587974268","sku":"3022-35","image":"1267123949","options":["35",null,null]},{"id":"1587974266","sku":"3022-36","image":"1267123949","options":["36",null,null]},{"id":"1587974263","sku":"3022-37","image":"1267123949","options":["37",null,null]},{"id":"1587974260","sku":"3022-38","image":"1267123949","options":["38",null,null]}]},
    "364500815":{"axis":1,"colors":{"Caramelo":["1267172003"],"Preto":["1263361103"]},"gallery":{"Caramelo":["1267172003","1263361087"],"Preto":["1263361103","1263361134"]},"retired":["1263361087","1263361134","1263321488","1263321495","1263321504"],"bindings":[{"id":"1587977498","sku":"3183-36-CARAMELO","image":"1267172003","options":["36","Caramelo",null]},{"id":"1587977501","sku":"3183-38-CARAMELO","image":"1267172003","options":["38","Caramelo",null]},{"id":"1587977503","sku":"3183-37-CARAMELO","image":"1267172003","options":["37","Caramelo",null]},{"id":"1587977508","sku":"3183-35-CARAMELO","image":"1267172003","options":["35","Caramelo",null]},{"id":"1587977512","sku":"3183-33-CARAMELO","image":"1267172003","options":["33","Caramelo",null]},{"id":"1587977514","sku":"3183-38-PRETO","image":"1263361103","options":["38","Preto",null]},{"id":"1587977517","sku":"3183-37-PRETO","image":"1263361103","options":["37","Preto",null]},{"id":"1587977520","sku":"3183-36-PRETO","image":"1263361103","options":["36","Preto",null]},{"id":"1587977522","sku":"3183-35-PRETO","image":"1263361103","options":["35","Preto",null]},{"id":"1587977525","sku":"3183-34-PRETO","image":"1263361103","options":["34","Preto",null]},{"id":"1587977527","sku":"3183-33-PRETO","image":"1263361103","options":["33","Preto",null]},{"id":"1587977530","sku":"3183-34-CARAMELO","image":"1267172003","options":["34","Caramelo",null]}]},
    "364500892":{"axis":1,"colors":{"Preta":["1267175262"],"Marrom":[]},"gallery":{"Preta":["1267175262","1263362372"],"Marrom":[]},"retired":["1263362372","1263318373"],"bindings":[{"id":"1587977890","sku":"3192-37-PRETA","image":"1267175262","options":["37","Preta",null]},{"id":"1587977895","sku":"3192-35-MARROM","image":"1263362372","options":["35","Marrom",null]},{"id":"1587977898","sku":"3192-38-MARROM","image":"1263362372","options":["38","Marrom",null]},{"id":"1587977900","sku":"3192-37-MARROM","image":"1263362372","options":["37","Marrom",null]},{"id":"1587977905","sku":"3192-36-MARROM","image":"1263362372","options":["36","Marrom",null]},{"id":"1587977907","sku":"3192-34-MARROM","image":"1263362372","options":["34","Marrom",null]},{"id":"1587977908","sku":"3192-33-MARROM","image":"1263362372","options":["33","Marrom",null]},{"id":"1587977911","sku":"3192-36-PRETA","image":"1267175262","options":["36","Preta",null]},{"id":"1587977912","sku":"3192-35-PRETA","image":"1267175262","options":["35","Preta",null]},{"id":"1587977913","sku":"3192-34-PRETA","image":"1267175262","options":["34","Preta",null]},{"id":"1587977915","sku":"3192-33-PRETA","image":"1267175262","options":["33","Preta",null]},{"id":"1587977918","sku":"3192-38-PRETA","image":"1267175262","options":["38","Preta",null]}]},
    "364501326":{"axis":1,"colors":{"Preto":["1267122281"],"Café":[]},"gallery":{"Preto":["1267122281","1263283992"],"Café":[]},"retired":["1263283992"],"bindings":[{"id":"1587979918","sku":"3314-34-PRETO","image":"1267122281","options":["34","Preto",null]},{"id":"1587979921","sku":"3314-35-PRETO","image":"1267122281","options":["35","Preto",null]},{"id":"1587979924","sku":"3314-36-PRETO","image":"1267122281","options":["36","Preto",null]},{"id":"1587979925","sku":"3314-37-PRETO","image":"1267122281","options":["37","Preto",null]},{"id":"1587979928","sku":"3314-38-PRETO","image":"1267122281","options":["38","Preto",null]},{"id":"1587979930","sku":"3314-34-CAFE","image":"1263283992","options":["34","Café",null]},{"id":"1587979932","sku":"3314-35-CAFE","image":"1263283992","options":["35","Café",null]},{"id":"1587979935","sku":"3314-36-CAFE","image":"1263283992","options":["36","Café",null]},{"id":"1587979937","sku":"3314-37-CAFE","image":"1263283992","options":["37","Café",null]},{"id":"1587979940","sku":"3314-38-CAFE","image":"1263283992","options":["38","Café",null]}]},
    "364501392":{"axis":1,"colors":{"Preto":["1267119359"],"Café":["1263369398"]},"gallery":{"Preto":["1267119359","1263369391"],"Café":["1263369398"]},"retired":["1263369391","1263347466","1263347471","1263284468","1263284475"],"bindings":[{"id":"1587980252","sku":"3324-34-PRETO","image":"1267119359","options":["34","Preto",null]},{"id":"1587980255","sku":"3324-35-PRETO","image":"1267119359","options":["35","Preto",null]},{"id":"1587980257","sku":"3324-36-PRETO","image":"1267119359","options":["36","Preto",null]},{"id":"1587980258","sku":"3324-38-PRETO","image":"1267119359","options":["38","Preto",null]},{"id":"1587980259","sku":"3324-39-PRETO","image":"1267119359","options":["39","Preto",null]},{"id":"1587980261","sku":"3324-37-PRETO","image":"1267119359","options":["37","Preto",null]},{"id":"1587980262","sku":"3324-34-CAFE","image":"1263369398","options":["34","Café",null]},{"id":"1587980264","sku":"3324-35-CAFE","image":"1263369398","options":["35","Café",null]},{"id":"1587980266","sku":"3324-36-CAFE","image":"1263369398","options":["36","Café",null]},{"id":"1587980267","sku":"3324-37-CAFE","image":"1263369398","options":["37","Café",null]},{"id":"1587980269","sku":"3324-38-CAFE","image":"1263369398","options":["38","Café",null]},{"id":"1587980273","sku":"3324-39-CAFE","image":"1263369398","options":["39","Café",null]}]},
    // Dourado: four exact size-only bindings; all six original assets retained.
    '364500246':{mode:'single',approved:['1267066076'],gallery:["1267066076","1263356188","1263356193"],retired:['1263356188','1263356193','1263334441','1263334443','1263281551','1263281564'],bindings:[
      {id:'1587974760',sku:'3037-35',image:'1267066076',options:['35',null,null]},
      {id:'1587974755',sku:'3037-36',image:'1267066076',options:['36',null,null]},
      {id:'1587974752',sku:'3037-37',image:'1267066076',options:['37',null,null]},
      {id:'1587974745',sku:'3037-38',image:'1267066076',options:['38',null,null]}
    ]},
    '364500780':{axis:1,colors:{Dourada:['1266855344'],Prata:['1266899517']},gallery:{"Dourada":["1266855344"],"Prata":["1266899517"]},retired:[],bindings:[{"id":"1587977373","sku":"3173-34-DOURADA","image":"1266855344","options":["34","Dourada",null]},{"id":"1587977375","sku":"3173-39-PRATA","image":"1266899517","options":["39","Prata",null]},{"id":"1587977378","sku":"3173-38-PRATA","image":"1266899517","options":["38","Prata",null]},{"id":"1587977379","sku":"3173-37-PRATA","image":"1266899517","options":["37","Prata",null]},{"id":"1587977382","sku":"3173-36-PRATA","image":"1266899517","options":["36","Prata",null]},{"id":"1587977384","sku":"3173-35-PRATA","image":"1266899517","options":["35","Prata",null]},{"id":"1587977386","sku":"3173-34-PRATA","image":"1266899517","options":["34","Prata",null]},{"id":"1587977391","sku":"3173-39-DOURADA","image":"1266855344","options":["39","Dourada",null]},{"id":"1587977392","sku":"3173-38-DOURADA","image":"1266855344","options":["38","Dourada",null]},{"id":"1587977394","sku":"3173-37-DOURADA","image":"1266855344","options":["37","Dourada",null]},{"id":"1587977397","sku":"3173-36-DOURADA","image":"1266855344","options":["36","Dourada",null]},{"id":"1587977399","sku":"3173-35-DOURADA","image":"1266855344","options":["35","Dourada",null]}]},
    // Martta: public image/variant bindings confirmed after the native save, 2026-09-06.
    '364501337':{axis:1,colors:{Preto:['1266967783']},gallery:{"Preto":["1266967783","1263284006"]},retired:['1263284006'],bindings:[
      {id:'1587979950',sku:'3315-34-PRETO',image:'1266967783',options:['34','Preto',null]},
      {id:'1587979956',sku:'3315-35-PRETO',image:'1266967783',options:['35','Preto',null]},
      {id:'1587979960',sku:'3315-36-PRETO',image:'1266967783',options:['36','Preto',null]},
      {id:'1587979963',sku:'3315-37-PRETO',image:'1266967783',options:['37','Preto',null]},
      {id:'1587979966',sku:'3315-38-PRETO',image:'1266967783',options:['38','Preto',null]}
    ]},
    // Bella: isolated shot, then worn shot; original native assets remain reversible.
    '364501384':{axis:1,colors:{Preto:['1266970460','1266970459']},gallery:{"Preto":["1266970460","1263284416","1263284404"]},retired:['1263284404','1263284416'],bindings:[
      {id:'1587980213',sku:'3322-34-PRETO',image:'1266970460',options:['34','Preto',null]},
      {id:'1587980215',sku:'3322-35-PRETO',image:'1266970460',options:['35','Preto',null]},
      {id:'1587980218',sku:'3322-36-PRETO',image:'1266970460',options:['36','Preto',null]},
      {id:'1587980222',sku:'3322-37-PRETO',image:'1266970460',options:['37','Preto',null]},
      {id:'1587980224',sku:'3322-38-PRETO',image:'1266970460',options:['38','Preto',null]}
    ]},
    // Cruzado: one audited photo, size axis only; all four original assets retained.
    '364500371':{mode:'single',approved:['1266976473'],gallery:["1266976473","1263332523","1263332530"],retired:['1263332523','1263332530','1263288319','1263288334'],bindings:[
      {id:'1587975302',sku:'3079-34',image:'1266976473',options:['34',null,null]},
      {id:'1587975304',sku:'3079-38',image:'1266976473',options:['38',null,null]},
      {id:'1587975308',sku:'3079-37',image:'1266976473',options:['37',null,null]},
      {id:'1587975311',sku:'3079-36',image:'1266976473',options:['36',null,null]},
      {id:'1587975314',sku:'3079-35',image:'1266976473',options:['35',null,null]}
    ]},
    // Verniz Nude: one approved photo; original gallery and native availability retained.
    '364500362':{mode:'single',approved:['1266977371'],gallery:["1266977371","1263332467","1263332473"],retired:['1263332467','1263332473','1263288163','1263288182'],bindings:[
      {id:'1587975261',sku:'3077-34',image:'1266977371',options:['34',null,null]},
      {id:'1587975265',sku:'3077-35',image:'1266977371',options:['35',null,null]},
      {id:'1587975266',sku:'3077-37',image:'1266977371',options:['37',null,null]},
      {id:'1587975267',sku:'3077-38',image:'1266977371',options:['38',null,null]},
      {id:'1587975269',sku:'3077-36',image:'1266977371',options:['36',null,null]}
    ]},
    // Croco: the audited V2 photo; four source assets remain in the native gallery.
    '364500357':{mode:'single',approved:['1266979119'],gallery:["1266979119","1263332440","1263332444"],retired:['1263332440','1263332444','1263288075','1263288087'],bindings:[
      {id:'1587975247',sku:'3076-34',image:'1266979119',options:['34',null,null]},
      {id:'1587975250',sku:'3076-38',image:'1266979119',options:['38',null,null]},
      {id:'1587975253',sku:'3076-37',image:'1266979119',options:['37',null,null]},
      {id:'1587975256',sku:'3076-35',image:'1266979119',options:['35',null,null]},
      {id:'1587975258',sku:'3076-36',image:'1266979119',options:['36',null,null]}
    ]},
    // Leona: one approved photo, full five-variant evidence and five retained originals.
    '363506708':{mode:'single',approved:['1266980380'],gallery:["1266980380","1263330536","1263330542"],retired:['1263330536','1263330542','1263288821','1263288831','1260008172'],bindings:[
      {id:'1585036796',sku:'3088-38',image:'1266980380',options:['38',null,null]},
      {id:'1585036804',sku:'3088-37',image:'1266980380',options:['37',null,null]},
      {id:'1585036808',sku:'3088-35',image:'1266980380',options:['35',null,null]},
      {id:'1585036813',sku:'3088-34',image:'1266980380',options:['34',null,null]},
      {id:'1585036817',sku:'3088-36',image:'1266980380',options:['36',null,null]}
    ]},
    // Ariana Verniz: four exact size-only bindings, five originals kept reversible.
    '363506702':{mode:'single',approved:['1266981269'],gallery:["1266981269","1263333039","1263333041"],retired:['1263333039','1263333041','1263286922','1263286930','1260007991'],bindings:[
      {id:'1585036762',sku:'3067-38',image:'1266981269',options:['38',null,null]},
      {id:'1585036765',sku:'3067-36',image:'1266981269',options:['36',null,null]},
      {id:'1585036773',sku:'3067-35',image:'1266981269',options:['35',null,null]},
      {id:'1585036777',sku:'3067-34',image:'1266981269',options:['34',null,null]}
    ]},
    // Lyon Napa: one approved image, five exact size bindings and six originals retained.
    '364500317':{mode:'single',approved:['1266982039'],gallery:["1266982039","1263358176","1263358186"],retired:['1263358176','1263358186','1263333061','1263333063','1263286996','1263287003'],bindings:[
      {id:'1587975071',sku:'3068-39',image:'1266982039',options:['39',null,null]},
      {id:'1587975073',sku:'3068-38',image:'1266982039',options:['38',null,null]},
      {id:'1587975074',sku:'3068-37',image:'1266982039',options:['37',null,null]},
      {id:'1587975076',sku:'3068-36',image:'1266982039',options:['36',null,null]},
      {id:'1587975077',sku:'3068-34',image:'1266982039',options:['34',null,null]}
    ]},
    // Boneca: six size-only bindings; four source photos remain reversible.
    '364499940':{mode:'single',approved:['1267014575'],gallery:["1267014575","1263335620","1263335624"],retired:['1263335620','1263335624','1263274059','1263274068'],bindings:[
      {id:'1587974011',sku:'3013-34',image:'1267014575',options:['34',null,null]},
      {id:'1587974025',sku:'3013-39',image:'1267014575',options:['39',null,null]},
      {id:'1587974032',sku:'3013-38',image:'1267014575',options:['38',null,null]},
      {id:'1587974036',sku:'3013-37',image:'1267014575',options:['37',null,null]},
      {id:'1587974039',sku:'3013-36',image:'1267014575',options:['36',null,null]},
      {id:'1587974043',sku:'3013-35',image:'1267014575',options:['35',null,null]}
    ]},
    // Verniz Preto: one approved photo, five size-only bindings and all originals retained.
    '364500367':{mode:'single',approved:['1267018094'],gallery:["1267018094","1263332495","1263332500"],retired:['1263332495','1263332500','1263288237','1263288250'],bindings:[
      {id:'1587975277',sku:'3078-34',image:'1267018094',options:['34',null,null]},
      {id:'1587975285',sku:'3078-38',image:'1267018094',options:['38',null,null]},
      {id:'1587975288',sku:'3078-37',image:'1267018094',options:['37',null,null]},
      {id:'1587975292',sku:'3078-36',image:'1267018094',options:['36',null,null]},
      {id:'1587975295',sku:'3078-35',image:'1267018094',options:['35',null,null]}
    ]},
    // Montaria Couro: native save confirmed; five size bindings, three originals retained.
    '364500386':{mode:'single',approved:['1267024727'],gallery:["1267024727","1263358382"],retired:['1263358382','1263332615','1263288610'],bindings:[
      {id:'1587975366',sku:'3084-38',image:'1267024727',options:['38',null,null]},
      {id:'1587975369',sku:'3084-37',image:'1267024727',options:['37',null,null]},
      {id:'1587975371',sku:'3084-36',image:'1267024727',options:['36',null,null]},
      {id:'1587975374',sku:'3084-35',image:'1267024727',options:['35',null,null]},
      {id:'1587975376',sku:'3084-34',image:'1267024727',options:['34',null,null]}
    ]},
    // Lari Veneto: four size-only bindings and all nine source photos retained.
    '364500239':{mode:'single',approved:['1267027196'],gallery:["1267027196","1263356160","1263356166"],retired:['1263356157','1263356160','1263356166','1263334427','1263334428','1263334434','1263281446','1263281469','1263281484'],bindings:[
      {id:'1587974724',sku:'3036-38',image:'1267027196',options:['38',null,null]},
      {id:'1587974727',sku:'3036-37',image:'1267027196',options:['37',null,null]},
      {id:'1587974734',sku:'3036-36',image:'1267027196',options:['36',null,null]},
      {id:'1587974737',sku:'3036-35',image:'1267027196',options:['35',null,null]}
    ]},
    // Coimbra Couro: four size-only bindings; all eight source photos remain reversible.
    '364499989':{mode:'single',approved:['1267028908'],gallery:["1267028908","1263652612","1263652639"],retired:['1263652612','1263652639','1263354328','1263354332','1263334816','1263334819','1263274674','1263274693'],bindings:[
      {id:'1587974150',sku:'3018-35',image:'1267028908',options:['35',null,null]},
      {id:'1587974155',sku:'3018-37',image:'1267028908',options:['37',null,null]},
      {id:'1587974159',sku:'3018-36',image:'1267028908',options:['36',null,null]},
      {id:'1587974162',sku:'3018-34',image:'1267028908',options:['34',null,null]}
    ]},
    // Fivela Prateada: five size-only bindings, six native originals preserved.
    '364500375':{mode:'single',approved:['1267035164'],gallery:["1267035164","1263358269","1263358289"],retired:['1263358269','1263358289','1263332568','1263332572','1263288451','1263288469'],bindings:[
      {id:'1587975324',sku:'3080-34',image:'1267035164',options:['34',null,null]},
      {id:'1587975336',sku:'3080-35',image:'1267035164',options:['35',null,null]},
      {id:'1587975335',sku:'3080-36',image:'1267035164',options:['36',null,null]},
      {id:'1587975333',sku:'3080-37',image:'1267035164',options:['37',null,null]},
      {id:'1587975329',sku:'3080-38',image:'1267035164',options:['38',null,null]}
    ]},
    // Brecia: five audited size-only bindings and all eight original assets retained.
    '364500025':{mode:'single',approved:['1267037175'],gallery:["1267037175","1263356015","1263356022"],retired:['1263356015','1263356022','1263354675','1263354681','1263334907','1263334911','1263275065','1263275073'],bindings:[
      {id:'1587974240',sku:'3021-37',image:'1267037175',options:['37',null,null]},
      {id:'1587974243',sku:'3021-38',image:'1267037175',options:['38',null,null]},
      {id:'1587974251',sku:'3021-36',image:'1267037175',options:['36',null,null]},
      {id:'1587974253',sku:'3021-35',image:'1267037175',options:['35',null,null]},
      {id:'1587974255',sku:'3021-34',image:'1267037175',options:['34',null,null]}
    ]},
    // Helena: five size-only bindings; all three originals kept in the native gallery.
    '364500939':{mode:'single',approved:['1267039299'],gallery:["1267039299","1263320185","1263320205","1263320214"],retired:['1263320185','1263320205','1263320214'],bindings:[
      {id:'1587978102',sku:'3197-38',image:'1267039299',options:['38',null,null]},
      {id:'1587978104',sku:'3197-37',image:'1267039299',options:['37',null,null]},
      {id:'1587978107',sku:'3197-36',image:'1267039299',options:['36',null,null]},
      {id:'1587978111',sku:'3197-35',image:'1267039299',options:['35',null,null]},
      {id:'1587978113',sku:'3197-34',image:'1267039299',options:['34',null,null]}
    ]},
    // Montaria Lia: native Cor=Preto preserved, with six exact post-save bindings.
    '364501366':{axis:1,colors:{Preto:['1267015050']},gallery:{"Preto":["1267015050","1263369345","1263369374"]},retired:['1263369345','1263369374','1263284379','1263284395'],bindings:[
      {id:'1587980094',sku:'3320-34-PRETO',image:'1267015050',options:['34','Preto',null]},
      {id:'1587980098',sku:'3320-35-PRETO',image:'1267015050',options:['35','Preto',null]},
      {id:'1587980100',sku:'3320-36-PRETO',image:'1267015050',options:['36','Preto',null]},
      {id:'1587980103',sku:'3320-37-PRETO',image:'1267015050',options:['37','Preto',null]},
      {id:'1587980118',sku:'3320-38-PRETO',image:'1267015050',options:['38','Preto',null]},
      {id:'1587980121',sku:'3320-39-PRETO',image:'1267015050',options:['39','Preto',null]}
    ]},
    // Flavia: six post-save size bindings; all five native originals retained.
    '364500961':{mode:'single',approved:['1267053460'],gallery:["1267053460","1263317052","1263317073","1263317080","1263317091","1263317122"],retired:['1263317052','1263317073','1263317080','1263317091','1263317122'],bindings:[
      {id:'1587978196',sku:'3202-38',image:'1267053460',options:['38',null,null]},
      {id:'1587978200',sku:'3202-39',image:'1267053460',options:['39',null,null]},
      {id:'1587978202',sku:'3202-37',image:'1267053460',options:['37',null,null]},
      {id:'1587978205',sku:'3202-36',image:'1267053460',options:['36',null,null]},
      {id:'1587978207',sku:'3202-35',image:'1267053460',options:['35',null,null]},
      {id:'1587978209',sku:'3202-34',image:'1267053460',options:['34',null,null]}
    ]},
    // Bruna: six post-save size bindings; both native original photos retained.
    '364500797':{mode:'single',approved:['1267062711'],gallery:["1267062711","1263321119","1263321139"],retired:['1263321119','1263321139'],bindings:[
      {id:'1587977429',sku:'3178-37',image:'1267062711',options:['37',null,null]},
      {id:'1587977436',sku:'3178-39',image:'1267062711',options:['39',null,null]},
      {id:'1587977439',sku:'3178-38',image:'1267062711',options:['38',null,null]},
      {id:'1587977440',sku:'3178-36',image:'1267062711',options:['36',null,null]},
      {id:'1587977442',sku:'3178-35',image:'1267062711',options:['35',null,null]},
      {id:'1587977444',sku:'3178-34',image:'1267062711',options:['34',null,null]}
    ]},
    // Sofi: six native size-only bindings; no artificial color axis.
    '364500789':{mode:'single',approved:['1267016141'],gallery:["1267016141","1263321056","1263321027","1263321064","1263321099"],retired:['1263321027','1263321056','1263321064','1263321099'],bindings:[
      {id:'1587977407',sku:'3177-34',image:'1267016141',options:['34',null,null]},
      {id:'1587977409',sku:'3177-39',image:'1267016141',options:['39',null,null]},
      {id:'1587977412',sku:'3177-38',image:'1267016141',options:['38',null,null]},
      {id:'1587977414',sku:'3177-36',image:'1267016141',options:['36',null,null]},
      {id:'1587977417',sku:'3177-35',image:'1267016141',options:['35',null,null]},
      {id:'1587977421',sku:'3177-37',image:'1267016141',options:['37',null,null]}
    ]}
  };
  function imageURL(value){try{const u=new URL(value,'https://loja.usebede.com.br');return u.protocol==='https:'&&/(^|\.)mitiendanube\.com$/.test(u.hostname)&&!u.username&&!u.password&&!u.port?u.href:null;}catch(_){return null;}}
  function getVerifiedGallery(model,rule=MAP[String(model?.productId)]){
    const {productId,variants,images}=model||{};
    const single=rule?.mode==='single',explicitGallery=!!rule&&Object.hasOwn(rule,'gallery');
    if(!rule||!String(productId||'').match(/^[1-9]\d*$/)||(!single&&(![0,1,2].includes(rule.axis)||!rule.colors||typeof rule.colors!=='object'||Array.isArray(rule.colors)))||!Array.isArray(variants)||!variants.length||variants.length>500||!Array.isArray(images))return null;
    if(single&&(rule.axis!==undefined||rule.colors!==undefined||!Array.isArray(rule.approved)||!rule.approved.length||rule.approved.length>30||variants.some(v=>v?.option1!=null||v?.option2!=null)))return null;
    if(variants.some(v=>!v||String(v.product_id)!==String(productId)||!String(v.id||'').match(/^[1-9]\d*$/)||typeof v.sku!=='string'||!v.sku)||new Set(variants.map(v=>String(v.id))).size!==variants.length||new Set(variants.map(v=>v.sku)).size!==variants.length)return null;
    const entries=single?[['',rule.approved]]:Object.entries(rule.colors),retired=rule.retired===undefined?[]:rule.retired;
    if(!entries.length||entries.length>30||!Array.isArray(retired)||entries.some(([name,ids])=>(!single&&!name)||!Array.isArray(ids)||(!ids.length&&!explicitGallery)||ids.length>30))return null;
    const approved=entries.flatMap(([,ids])=>ids),expected=[...approved,...retired];
    if(expected.length>100||expected.some(id=>typeof id!=='string'||!id.match(/^[1-9]\d*$/))||new Set(expected).size!==expected.length)return null;
    if(images.length!==expected.length||images.some(i=>!i||!expected.includes(String(i.id))||!imageURL(i.url))||new Set(images.map(i=>String(i.id))).size!==images.length)return null;
    let displayed=entries;
    if(explicitGallery){
      if(single){if(!Array.isArray(rule.gallery))return null;displayed=[['',rule.gallery]];}
      else{
        if(!rule.gallery||typeof rule.gallery!=='object'||Array.isArray(rule.gallery)||Object.keys(rule.gallery).length!==entries.length||entries.some(([name])=>!Object.hasOwn(rule.gallery,name)))return null;
        displayed=entries.map(([name])=>[name,rule.gallery[name]]);
      }
      if(displayed.some(([,ids])=>!Array.isArray(ids)||ids.length>100))return null;
      const allDisplayed=displayed.flatMap(([,ids])=>ids);
      if(allDisplayed.some(id=>typeof id!=='string'||!expected.includes(id))||new Set(allDisplayed).size!==allDisplayed.length)return null;
      for(let i=0;i<entries.length;i++){
        const covers=entries[i][1],ids=displayed[i][1];
        // Cover stays first. Originals require an explicit per-color assignment;
        // neither another color's cover nor a repeated/multicolor frame can leak.
        if((ids.length&&ids[0]!==covers[0])||ids.some(id=>!covers.includes(id)&&!retired.includes(id)))return null;
      }
    }
    if(single){if(variants.some(v=>!rule.approved.includes(String(v.image))))return null;}
    else{const names=[...new Set(variants.map(v=>v['option'+rule.axis]))];if(names.length!==entries.length||names.some(n=>!Object.hasOwn(rule.colors,n))||variants.some(v=>{const covers=rule.colors[v['option'+rule.axis]];return covers.length?!covers.includes(String(v.image)):!explicitGallery||!retired.includes(String(v.image));}))return null;}
    if(explicitGallery||single||retired.length||rule.bindings!==undefined){
      if(!Array.isArray(rule.bindings)||rule.bindings.length!==variants.length||new Set(rule.bindings.map(b=>String(b?.id))).size!==variants.length)return null;
      for(const v of variants){
        const binding=rule.bindings.find(b=>b&&String(b.id)===String(v.id));
        if(!binding||binding.sku!==v.sku||typeof binding.image!=='string'||binding.image!==String(v.image)||!Array.isArray(binding.options)||binding.options.length!==3||binding.options.some((option,index)=>option!==(v['option'+index]??null)))return null;
      }
    }
    return{axis:single?null:rule.axis,single,retired:retired.slice(),colors:displayed.map(([name,ids])=>({name,soldOut:variants.filter(v=>single||v['option'+rule.axis]===name).every(v=>v.available===false),images:ids.map(id=>({id,url:imageURL(images.find(i=>String(i.id)===id).url)}))}))};
  }
  function verified(productId,variants,images){return getVerifiedGallery({productId,variants,images});}
  const CSS=`
    .bede-color-gallery{margin:0 0 18px;width:100%;background:#fff;color:#000}.bede-color-gallery>a{display:block}
    .bede-color-gallery>a>img{display:block;width:100%;height:min(70vh,760px);min-height:300px;object-fit:contain;object-position:center;background:#fff}
    .bede-color-gallery figcaption{text-align:center;font-size:11px;line-height:1.5;margin:10px 0}
    .bede-color-gallery-status>p{display:flex;align-items:center;justify-content:center;min-height:300px;padding:24px;text-align:center;box-sizing:border-box;font:400 14px/1.5 Montserrat,sans-serif}
    .bede-color-photo-nav{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin:12px 0}.bede-color-photo-nav button{display:block;min-width:64px;min-height:64px;padding:3px;border:1px solid #ddd;background:#fff;color:#000;cursor:pointer}.bede-color-photo-nav img{display:block;width:60px;height:60px;object-fit:contain;background:#fff}.bede-color-photo-nav button[aria-pressed="true"]{border-color:#000;box-shadow:inset 0 -2px #000}.bede-color-photo-nav button:focus-visible{outline:2px solid #000;outline-offset:3px}
    .bede-colors-gallery-nav{margin:0 0 24px;color:#000}.bede-colors-gallery-nav h2{font-size:14px;font-weight:500;margin:0 0 12px}
    .bede-colors-gallery-nav>div{display:flex;gap:10px;flex-wrap:wrap}.bede-colors-gallery-nav button{width:90px;padding:6px;display:flex;flex-direction:column;align-items:center;gap:5px;border:1px solid #ddd;border-radius:0;background:#fff;color:#000;font:400 11px/1.4 Montserrat,sans-serif;cursor:pointer}
    .bede-colors-gallery-nav img{width:76px;height:76px;object-fit:contain;background:#fff}.bede-colors-gallery-nav small{font-size:10px}
    .bede-colors-gallery-nav button[aria-pressed="true"]{border-color:#000;box-shadow:inset 0 -2px #000}.bede-colors-gallery-nav button:focus-visible{outline:2px solid #000;outline-offset:3px}
    .bede-original-color-gallery{display:none!important}@media(max-width:767px){.bede-color-gallery>a>img{height:56vh;min-height:260px;max-height:560px}}
  `;
  function start(win=typeof window!=='undefined'?window:null){
    if(!win||!win.document)return null;if(win.__bedeColorGallery)return win.__bedeColorGallery;
    const doc=win.document,root=doc.querySelector('#single-product[data-store="product-detail"]'),form=root?.querySelector('form#product_form');
    const id=/^product-form-([1-9]\d*)$/.exec(form?.getAttribute('data-store')||'')?.[1];if(!id||!MAP[id])return null;
    const area=root.querySelector('[data-store="product-image-'+id+'"]');if(!area||area.contains(form))return null;
    const strictGallery=Object.hasOwn(MAP[id],'gallery');
    let figure=null,nav=null,key='',timer=null,loadTimer=null,pendingImage=null,generation=0,failed=false,retryable=false,stopped=false,nativeState=null;
    const selectedPhotos=new Map();
    function read(){
      const single=MAP[id].mode==='single';let group=null,select=null;
      if(!single){const groups=form.querySelectorAll('.js-product-variants-group[data-variation-id="'+MAP[id].axis+'"]');if(groups.length!==1)return null;group=groups[0];const selects=group.querySelectorAll('select.js-variation-option');if(selects.length!==1||selects[0].getAttribute('name')!=='variation['+MAP[id].axis+']')return null;select=selects[0];}
      else if(Array.from(form.querySelectorAll('.js-product-variants-group[data-variation-id]')).some(g=>g.getAttribute('data-variation-id')!=='0'))return null;
      let variants;try{variants=JSON.parse(root.getAttribute('data-variants'));}catch(_){return null;}
      const images=Array.from(area.querySelectorAll('.js-swiper-product .js-product-slide[data-image]')).map(slide=>({id:slide.getAttribute('data-image'),url:slide.querySelector('a.js-product-slide-link')?.getAttribute('href')}));
      const model=verified(id,variants,images),chosen=single?model?.colors[0]:model?.colors.find(color=>color.name===select.value);
      return chosen?{group,model,chosen}:null;
    }
    function restore(){
      generation++;retryable=false;if(loadTimer!==null)win.clearTimeout(loadTimer);loadTimer=null;
      if(pendingImage)pendingImage.onload=pendingImage.onerror=null;pendingImage=null;
      figure?.remove();nav?.remove();figure=nav=null;key='';area.classList.remove('bede-original-color-gallery');
      if(nativeState){for(const name of ['aria-hidden','inert']){const value=nativeState[name];if(value===null)area.removeAttribute(name);else area.setAttribute(name,value);}nativeState=null;}
    }
    function concealNative(){if(!nativeState)nativeState={'aria-hidden':area.getAttribute('aria-hidden'),inert:area.getAttribute('inert')};area.setAttribute('aria-hidden','true');area.setAttribute('inert','');area.classList.add('bede-original-color-gallery');}
    function selection(state){const index=Math.max(0,Math.min(selectedPhotos.get(state.chosen.name)||0,state.chosen.images.length-1)),photo=state.chosen.images[index]||null;return{index,photo,next:JSON.stringify(state.model)+'|'+state.chosen.name+'|'+(photo?.id||'empty')};}
    function photoNavigation(state,index){
      if(state.chosen.images.length<2)return null;
      const colorLabel=state.chosen.name?' — '+state.chosen.name:'';
      const photos=doc.createElement('div');photos.className='bede-color-photo-nav';photos.setAttribute('role','group');photos.setAttribute('aria-label','Fotos'+colorLabel);
      state.chosen.images.forEach((item,i)=>{const button=doc.createElement('button');button.type='button';button.setAttribute('data-bede-photo',item.id);button.setAttribute('aria-label','Ver foto '+(i+1)+' de '+state.chosen.images.length+colorLabel);button.setAttribute('aria-pressed',String(i===index));const thumb=doc.createElement('img');thumb.src=item.url;thumb.alt='';thumb.loading='lazy';button.appendChild(thumb);button.addEventListener('click',()=>{const current=read();if(current?.chosen.name===state.chosen.name&&current.chosen.images.some(p=>p.id===item.id)){selectedPhotos.set(state.chosen.name,i);retry();}});photos.appendChild(button);});return photos;
    }
    function mount(readyFigure,state){
      figure?.remove();nav?.remove();nav=null;figure=readyFigure;area.insertAdjacentElement('beforebegin',figure);concealNative();
      if(state&&!state.model.single&&state.model.colors.length>1){
        nav=doc.createElement('section');nav.className='bede-colors-gallery-nav';nav.setAttribute('aria-label','Cores deste modelo');state.group.insertAdjacentElement('afterend',nav);
        const heading=doc.createElement('h2');heading.textContent='Cores deste modelo';nav.appendChild(heading);
        const list=doc.createElement('div');nav.appendChild(list);
        for(const color of state.model.colors){
          const button=doc.createElement('button');button.type='button';button.dataset.color=color.name;
          if(color.images.length){const thumb=doc.createElement('img');thumb.src=color.images[0].url;thumb.alt='';thumb.loading='lazy';button.appendChild(thumb);}
          const label=doc.createElement('span');label.textContent=color.name;button.appendChild(label);
          if(!color.images.length){const note=doc.createElement('small');note.textContent='Foto indisponível';button.appendChild(note);}
          if(color.soldOut){const note=doc.createElement('small');note.textContent='Esgotado';button.appendChild(note);}
          button.addEventListener('click',()=>{
            const current=read(),native=Array.from(current?.group.querySelectorAll('a.js-insta-variant[data-option]')||[]).find(a=>a.getAttribute('data-option')===color.name);
            if(native&&native.getAttribute('aria-disabled')!=='true')native.click();schedule();
          });list.appendChild(button);
        }
        nav.querySelectorAll('button[data-color]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.color===state.chosen.name)));
      }
    }
    function status(message,state=null,index=0){
      const ready=doc.createElement('figure');ready.className='bede-color-gallery bede-color-gallery-status';
      const text=doc.createElement('p');text.setAttribute('role','status');text.textContent=message+(state?.chosen.name?' — '+state.chosen.name:'');ready.appendChild(text);
      const photos=state?photoNavigation(state,index):null;if(photos)ready.appendChild(photos);mount(ready,state);
    }
    function update(){
      timer=null;if(failed||stopped)return;const state=read();if(!state){if(strictGallery&&key==='unverified'&&figure)return;restore();if(strictGallery){key='unverified';status('Foto indisponível');}return;}
      const {index,photo,next}=selection(state);if(next===key)return;
      const focusPhoto=doc.activeElement?.getAttribute('data-bede-photo');restore();key=next;const token=generation;
      if(!photo){status('Foto indisponível',state);return;}
      if(strictGallery)status('Carregando foto',state,index);
      const readyFigure=doc.createElement('figure');readyFigure.className='bede-color-gallery';
      const colorLabel=state.chosen.name?' — '+state.chosen.name:'';
      const link=doc.createElement('a');link.href=photo.url;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label','Ampliar foto '+(index+1)+' de '+state.chosen.images.length+colorLabel);
      const image=doc.createElement('img');image.alt=(root.querySelector('h1')?.textContent?.trim()||'Produto')+colorLabel+' — foto '+(index+1);image.decoding='async';link.appendChild(image);readyFigure.appendChild(link);
      const caption=doc.createElement('figcaption');caption.textContent=(state.chosen.name?state.chosen.name+' · ':'')+'foto '+(index+1)+' de '+state.chosen.images.length+' · toque na foto para ampliar';readyFigure.appendChild(caption);
      const photos=photoNavigation(state,index);if(photos)readyFigure.appendChild(photos);
      function fail(){
        if(token!==generation||stopped||pendingImage!==image)return;
        if(!strictGallery){failed=true;restore();return;}
        const current=read();if(!current||selection(current).next!==next){key='';update();return;}
        if(loadTimer!==null)win.clearTimeout(loadTimer);loadTimer=null;image.onload=image.onerror=null;pendingImage=null;
        retryable=true;status('Foto indisponível',current,index);
      }
      function commit(){
        if(token!==generation||stopped||pendingImage!==image||!image.naturalWidth)return;
        const current=read();
        if(!current||selection(current).next!==next){if(strictGallery){key='';update();}else{restore();schedule();}return;}
        if(loadTimer!==null)win.clearTimeout(loadTimer);loadTimer=null;image.onload=image.onerror=null;pendingImage=null;
        mount(readyFigure,state);
        if(focusPhoto&&(!doc.activeElement||doc.activeElement===doc.body))figure.querySelector('button[data-bede-photo="'+photo.id+'"]')?.focus();
      }
      pendingImage=image;image.onload=commit;image.onerror=fail;loadTimer=win.setTimeout(fail,6000);image.src=photo.url;
      if(image.complete&&image.naturalWidth)commit();
    }
    function schedule(){if(timer===null&&!failed&&!stopped)timer=win.setTimeout(update,40);}
    // Only explicit controls retry a failed photo; observers/native events retain the settled key.
    function retry(){if(retryable)key='';schedule();}
    const initial=read();if(!initial&&!strictGallery)return null;
    const style=doc.createElement('style');style.textContent=CSS;doc.head.appendChild(style);
    const observer=new win.MutationObserver(schedule);observer.observe(form,{subtree:true,childList:true});
    observer.observe(root,{attributes:true,attributeFilter:['data-variants']});
    observer.observe(area,{subtree:true,childList:true,attributes:true,attributeFilter:['data-image','href']});
    form.addEventListener('change',schedule);form.addEventListener('click',schedule);win.addEventListener('pageshow',schedule);
    win.__bedeColorGallery={refresh(){if(stopped)return;failed=false;retry();},stop(){stopped=true;if(timer!==null)win.clearTimeout(timer);timer=null;observer.disconnect();form.removeEventListener('change',schedule);form.removeEventListener('click',schedule);win.removeEventListener('pageshow',schedule);restore();style.remove();delete win.__bedeColorGallery;}};update();return win.__bedeColorGallery;
  }
  return{verified,getVerifiedGallery,imageURL,start};
});
