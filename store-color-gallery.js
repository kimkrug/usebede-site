/* Audited image/color presentation. No edits to catalogue, stock or cart. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BedeColorGallery=api;})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  // New rules with retired images require an exact, audited binding for EVERY variant.
  // Keep old images in the native gallery/admin; this module never deletes those nodes.
  const MAP={
    '364500780':{axis:1,colors:{Dourada:['1266855344'],Prata:['1266899517']},retired:[]},
    // Martta: public image/variant bindings confirmed after the native save, 2026-09-06.
    '364501337':{axis:1,colors:{Preto:['1266967783']},retired:['1263284006'],bindings:[
      {id:'1587979950',sku:'3315-34-PRETO',image:'1266967783',options:['34','Preto',null]},
      {id:'1587979956',sku:'3315-35-PRETO',image:'1266967783',options:['35','Preto',null]},
      {id:'1587979960',sku:'3315-36-PRETO',image:'1266967783',options:['36','Preto',null]},
      {id:'1587979963',sku:'3315-37-PRETO',image:'1266967783',options:['37','Preto',null]},
      {id:'1587979966',sku:'3315-38-PRETO',image:'1266967783',options:['38','Preto',null]}
    ]},
    // Bella: isolated shot, then worn shot; original native assets remain reversible.
    '364501384':{axis:1,colors:{Preto:['1266970460','1266970459']},retired:['1263284404','1263284416'],bindings:[
      {id:'1587980213',sku:'3322-34-PRETO',image:'1266970460',options:['34','Preto',null]},
      {id:'1587980215',sku:'3322-35-PRETO',image:'1266970460',options:['35','Preto',null]},
      {id:'1587980218',sku:'3322-36-PRETO',image:'1266970460',options:['36','Preto',null]},
      {id:'1587980222',sku:'3322-37-PRETO',image:'1266970460',options:['37','Preto',null]},
      {id:'1587980224',sku:'3322-38-PRETO',image:'1266970460',options:['38','Preto',null]}
    ]},
    // Cruzado: one audited photo, size axis only; all four original assets retained.
    '364500371':{mode:'single',approved:['1266976473'],retired:['1263332523','1263332530','1263288319','1263288334'],bindings:[
      {id:'1587975302',sku:'3079-34',image:'1266976473',options:['34',null,null]},
      {id:'1587975304',sku:'3079-38',image:'1266976473',options:['38',null,null]},
      {id:'1587975308',sku:'3079-37',image:'1266976473',options:['37',null,null]},
      {id:'1587975311',sku:'3079-36',image:'1266976473',options:['36',null,null]},
      {id:'1587975314',sku:'3079-35',image:'1266976473',options:['35',null,null]}
    ]},
    // Verniz Nude: one approved photo; original gallery and native availability retained.
    '364500362':{mode:'single',approved:['1266977371'],retired:['1263332467','1263332473','1263288163','1263288182'],bindings:[
      {id:'1587975261',sku:'3077-34',image:'1266977371',options:['34',null,null]},
      {id:'1587975265',sku:'3077-35',image:'1266977371',options:['35',null,null]},
      {id:'1587975266',sku:'3077-37',image:'1266977371',options:['37',null,null]},
      {id:'1587975267',sku:'3077-38',image:'1266977371',options:['38',null,null]},
      {id:'1587975269',sku:'3077-36',image:'1266977371',options:['36',null,null]}
    ]},
    // Croco: the audited V2 photo; four source assets remain in the native gallery.
    '364500357':{mode:'single',approved:['1266979119'],retired:['1263332440','1263332444','1263288075','1263288087'],bindings:[
      {id:'1587975247',sku:'3076-34',image:'1266979119',options:['34',null,null]},
      {id:'1587975250',sku:'3076-38',image:'1266979119',options:['38',null,null]},
      {id:'1587975253',sku:'3076-37',image:'1266979119',options:['37',null,null]},
      {id:'1587975256',sku:'3076-35',image:'1266979119',options:['35',null,null]},
      {id:'1587975258',sku:'3076-36',image:'1266979119',options:['36',null,null]}
    ]},
    // Leona: one approved photo, full five-variant evidence and five retained originals.
    '363506708':{mode:'single',approved:['1266980380'],retired:['1263330536','1263330542','1263288821','1263288831','1260008172'],bindings:[
      {id:'1585036796',sku:'3088-38',image:'1266980380',options:['38',null,null]},
      {id:'1585036804',sku:'3088-37',image:'1266980380',options:['37',null,null]},
      {id:'1585036808',sku:'3088-35',image:'1266980380',options:['35',null,null]},
      {id:'1585036813',sku:'3088-34',image:'1266980380',options:['34',null,null]},
      {id:'1585036817',sku:'3088-36',image:'1266980380',options:['36',null,null]}
    ]},
    // Ariana Verniz: four exact size-only bindings, five originals kept reversible.
    '363506702':{mode:'single',approved:['1266981269'],retired:['1263333039','1263333041','1263286922','1263286930','1260007991'],bindings:[
      {id:'1585036762',sku:'3067-38',image:'1266981269',options:['38',null,null]},
      {id:'1585036765',sku:'3067-36',image:'1266981269',options:['36',null,null]},
      {id:'1585036773',sku:'3067-35',image:'1266981269',options:['35',null,null]},
      {id:'1585036777',sku:'3067-34',image:'1266981269',options:['34',null,null]}
    ]},
    // Lyon Napa: one approved image, five exact size bindings and six originals retained.
    '364500317':{mode:'single',approved:['1266982039'],retired:['1263358176','1263358186','1263333061','1263333063','1263286996','1263287003'],bindings:[
      {id:'1587975071',sku:'3068-39',image:'1266982039',options:['39',null,null]},
      {id:'1587975073',sku:'3068-38',image:'1266982039',options:['38',null,null]},
      {id:'1587975074',sku:'3068-37',image:'1266982039',options:['37',null,null]},
      {id:'1587975076',sku:'3068-36',image:'1266982039',options:['36',null,null]},
      {id:'1587975077',sku:'3068-34',image:'1266982039',options:['34',null,null]}
    ]},
    // Boneca: six size-only bindings; four source photos remain reversible.
    '364499940':{mode:'single',approved:['1267014575'],retired:['1263335620','1263335624','1263274059','1263274068'],bindings:[
      {id:'1587974011',sku:'3013-34',image:'1267014575',options:['34',null,null]},
      {id:'1587974025',sku:'3013-39',image:'1267014575',options:['39',null,null]},
      {id:'1587974032',sku:'3013-38',image:'1267014575',options:['38',null,null]},
      {id:'1587974036',sku:'3013-37',image:'1267014575',options:['37',null,null]},
      {id:'1587974039',sku:'3013-36',image:'1267014575',options:['36',null,null]},
      {id:'1587974043',sku:'3013-35',image:'1267014575',options:['35',null,null]}
    ]},
    // Verniz Preto: one approved photo, five size-only bindings and all originals retained.
    '364500367':{mode:'single',approved:['1267018094'],retired:['1263332495','1263332500','1263288237','1263288250'],bindings:[
      {id:'1587975277',sku:'3078-34',image:'1267018094',options:['34',null,null]},
      {id:'1587975285',sku:'3078-38',image:'1267018094',options:['38',null,null]},
      {id:'1587975288',sku:'3078-37',image:'1267018094',options:['37',null,null]},
      {id:'1587975292',sku:'3078-36',image:'1267018094',options:['36',null,null]},
      {id:'1587975295',sku:'3078-35',image:'1267018094',options:['35',null,null]}
    ]},
    // Montaria Couro: native save confirmed; five size bindings, three originals retained.
    '364500386':{mode:'single',approved:['1267024727'],retired:['1263358382','1263332615','1263288610'],bindings:[
      {id:'1587975366',sku:'3084-38',image:'1267024727',options:['38',null,null]},
      {id:'1587975369',sku:'3084-37',image:'1267024727',options:['37',null,null]},
      {id:'1587975371',sku:'3084-36',image:'1267024727',options:['36',null,null]},
      {id:'1587975374',sku:'3084-35',image:'1267024727',options:['35',null,null]},
      {id:'1587975376',sku:'3084-34',image:'1267024727',options:['34',null,null]}
    ]},
    // Lari Veneto: four size-only bindings and all nine source photos retained.
    '364500239':{mode:'single',approved:['1267027196'],retired:['1263356157','1263356160','1263356166','1263334427','1263334428','1263334434','1263281446','1263281469','1263281484'],bindings:[
      {id:'1587974724',sku:'3036-38',image:'1267027196',options:['38',null,null]},
      {id:'1587974727',sku:'3036-37',image:'1267027196',options:['37',null,null]},
      {id:'1587974734',sku:'3036-36',image:'1267027196',options:['36',null,null]},
      {id:'1587974737',sku:'3036-35',image:'1267027196',options:['35',null,null]}
    ]},
    // Coimbra Couro: four size-only bindings; all eight source photos remain reversible.
    '364499989':{mode:'single',approved:['1267028908'],retired:['1263652612','1263652639','1263354328','1263354332','1263334816','1263334819','1263274674','1263274693'],bindings:[
      {id:'1587974150',sku:'3018-35',image:'1267028908',options:['35',null,null]},
      {id:'1587974155',sku:'3018-37',image:'1267028908',options:['37',null,null]},
      {id:'1587974159',sku:'3018-36',image:'1267028908',options:['36',null,null]},
      {id:'1587974162',sku:'3018-34',image:'1267028908',options:['34',null,null]}
    ]},
    // Fivela Prateada: five size-only bindings, six native originals preserved.
    '364500375':{mode:'single',approved:['1267035164'],retired:['1263358269','1263358289','1263332568','1263332572','1263288451','1263288469'],bindings:[
      {id:'1587975324',sku:'3080-34',image:'1267035164',options:['34',null,null]},
      {id:'1587975336',sku:'3080-35',image:'1267035164',options:['35',null,null]},
      {id:'1587975335',sku:'3080-36',image:'1267035164',options:['36',null,null]},
      {id:'1587975333',sku:'3080-37',image:'1267035164',options:['37',null,null]},
      {id:'1587975329',sku:'3080-38',image:'1267035164',options:['38',null,null]}
    ]},
    // Brecia: five audited size-only bindings and all eight original assets retained.
    '364500025':{mode:'single',approved:['1267037175'],retired:['1263356015','1263356022','1263354675','1263354681','1263334907','1263334911','1263275065','1263275073'],bindings:[
      {id:'1587974240',sku:'3021-37',image:'1267037175',options:['37',null,null]},
      {id:'1587974243',sku:'3021-38',image:'1267037175',options:['38',null,null]},
      {id:'1587974251',sku:'3021-36',image:'1267037175',options:['36',null,null]},
      {id:'1587974253',sku:'3021-35',image:'1267037175',options:['35',null,null]},
      {id:'1587974255',sku:'3021-34',image:'1267037175',options:['34',null,null]}
    ]},
    // Helena: five size-only bindings; all three originals kept in the native gallery.
    '364500939':{mode:'single',approved:['1267039299'],retired:['1263320185','1263320205','1263320214'],bindings:[
      {id:'1587978102',sku:'3197-38',image:'1267039299',options:['38',null,null]},
      {id:'1587978104',sku:'3197-37',image:'1267039299',options:['37',null,null]},
      {id:'1587978107',sku:'3197-36',image:'1267039299',options:['36',null,null]},
      {id:'1587978111',sku:'3197-35',image:'1267039299',options:['35',null,null]},
      {id:'1587978113',sku:'3197-34',image:'1267039299',options:['34',null,null]}
    ]},
    // Montaria Lia: native Cor=Preto preserved, with six exact post-save bindings.
    '364501366':{axis:1,colors:{Preto:['1267015050']},retired:['1263369345','1263369374','1263284379','1263284395'],bindings:[
      {id:'1587980094',sku:'3320-34-PRETO',image:'1267015050',options:['34','Preto',null]},
      {id:'1587980098',sku:'3320-35-PRETO',image:'1267015050',options:['35','Preto',null]},
      {id:'1587980100',sku:'3320-36-PRETO',image:'1267015050',options:['36','Preto',null]},
      {id:'1587980103',sku:'3320-37-PRETO',image:'1267015050',options:['37','Preto',null]},
      {id:'1587980118',sku:'3320-38-PRETO',image:'1267015050',options:['38','Preto',null]},
      {id:'1587980121',sku:'3320-39-PRETO',image:'1267015050',options:['39','Preto',null]}
    ]},
    // Sofi: six native size-only bindings; no artificial color axis.
    '364500789':{mode:'single',approved:['1267016141'],retired:['1263321027','1263321056','1263321064','1263321099'],bindings:[
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
    const single=rule?.mode==='single';
    if(!rule||!String(productId||'').match(/^[1-9]\d*$/)||(!single&&(![0,1,2].includes(rule.axis)||!rule.colors||typeof rule.colors!=='object'||Array.isArray(rule.colors)))||!Array.isArray(variants)||!variants.length||variants.length>500||!Array.isArray(images))return null;
    if(single&&(rule.axis!==undefined||rule.colors!==undefined||!Array.isArray(rule.approved)||!rule.approved.length||rule.approved.length>30||variants.some(v=>v?.option1!=null||v?.option2!=null)))return null;
    if(variants.some(v=>!v||String(v.product_id)!==String(productId)||!String(v.id||'').match(/^[1-9]\d*$/)||typeof v.sku!=='string'||!v.sku)||new Set(variants.map(v=>String(v.id))).size!==variants.length||new Set(variants.map(v=>v.sku)).size!==variants.length)return null;
    const entries=single?[['',rule.approved]]:Object.entries(rule.colors),retired=rule.retired===undefined?[]:rule.retired;
    if(!entries.length||entries.length>30||!Array.isArray(retired)||entries.some(([name,ids])=>(!single&&!name)||!Array.isArray(ids)||!ids.length||ids.length>30))return null;
    const approved=entries.flatMap(([,ids])=>ids),expected=[...approved,...retired];
    if(expected.length>100||expected.some(id=>typeof id!=='string'||!id.match(/^[1-9]\d*$/))||new Set(expected).size!==expected.length)return null;
    if(images.length!==expected.length||images.some(i=>!i||!expected.includes(String(i.id))||!imageURL(i.url))||new Set(images.map(i=>String(i.id))).size!==images.length)return null;
    if(single){if(variants.some(v=>!rule.approved.includes(String(v.image))))return null;}
    else{const names=[...new Set(variants.map(v=>v['option'+rule.axis]))];if(names.length!==entries.length||names.some(n=>!Object.hasOwn(rule.colors,n))||variants.some(v=>!rule.colors[v['option'+rule.axis]].includes(String(v.image))))return null;}
    if(single||retired.length||rule.bindings!==undefined){
      if(!Array.isArray(rule.bindings)||rule.bindings.length!==variants.length||new Set(rule.bindings.map(b=>String(b?.id))).size!==variants.length)return null;
      for(const v of variants){
        const binding=rule.bindings.find(b=>b&&String(b.id)===String(v.id));
        if(!binding||binding.sku!==v.sku||typeof binding.image!=='string'||binding.image!==String(v.image)||!Array.isArray(binding.options)||binding.options.length!==3||binding.options.some((option,index)=>option!==(v['option'+index]??null)))return null;
      }
    }
    return{axis:single?null:rule.axis,single,retired:retired.slice(),colors:entries.map(([name,ids])=>({name,soldOut:variants.filter(v=>single||v['option'+rule.axis]===name).every(v=>v.available===false),images:ids.map(id=>({id,url:imageURL(images.find(i=>String(i.id)===id).url)}))}))};
  }
  function verified(productId,variants,images){return getVerifiedGallery({productId,variants,images});}
  const CSS=`
    .bede-color-gallery{margin:0 0 18px;width:100%;background:#fff;color:#000}.bede-color-gallery>a{display:block}
    .bede-color-gallery>a>img{display:block;width:100%;height:min(70vh,760px);min-height:300px;object-fit:contain;object-position:center;background:#fff}
    .bede-color-gallery figcaption{text-align:center;font-size:11px;line-height:1.5;margin:10px 0}
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
    let figure=null,nav=null,key='',timer=null,loadTimer=null,pendingImage=null,generation=0,failed=false,stopped=false,nativeState=null;
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
      generation++;if(loadTimer!==null)win.clearTimeout(loadTimer);loadTimer=null;
      if(pendingImage)pendingImage.onload=pendingImage.onerror=null;pendingImage=null;
      figure?.remove();nav?.remove();figure=nav=null;key='';area.classList.remove('bede-original-color-gallery');
      if(nativeState){for(const name of ['aria-hidden','inert']){const value=nativeState[name];if(value===null)area.removeAttribute(name);else area.setAttribute(name,value);}nativeState=null;}
    }
    function concealNative(){nativeState={'aria-hidden':area.getAttribute('aria-hidden'),inert:area.getAttribute('inert')};area.setAttribute('aria-hidden','true');area.setAttribute('inert','');area.classList.add('bede-original-color-gallery');}
    function update(){
      timer=null;if(failed||stopped)return;const state=read();if(!state){restore();return;}
      const index=Math.min(selectedPhotos.get(state.chosen.name)||0,state.chosen.images.length-1),photo=state.chosen.images[index];
      const next=JSON.stringify(state.model)+'|'+state.chosen.name+'|'+photo.id;if(next===key)return;
      const focusPhoto=doc.activeElement?.getAttribute('data-bede-photo');restore();key=next;const token=generation;
      const readyFigure=doc.createElement('figure');readyFigure.className='bede-color-gallery';
      const colorLabel=state.chosen.name?' — '+state.chosen.name:'';
      const link=doc.createElement('a');link.href=photo.url;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label','Ampliar foto '+(index+1)+' de '+state.chosen.images.length+colorLabel);
      const image=doc.createElement('img');image.alt=(root.querySelector('h1')?.textContent?.trim()||'Produto')+colorLabel+' — foto '+(index+1);image.decoding='async';link.appendChild(image);readyFigure.appendChild(link);
      const caption=doc.createElement('figcaption');caption.textContent=(state.chosen.name?state.chosen.name+' · ':'')+'foto '+(index+1)+' de '+state.chosen.images.length+' · toque na foto para ampliar';readyFigure.appendChild(caption);
      if(state.chosen.images.length>1){
        const photos=doc.createElement('div');photos.className='bede-color-photo-nav';photos.setAttribute('role','group');photos.setAttribute('aria-label','Fotos'+colorLabel);
        state.chosen.images.forEach((item,i)=>{const button=doc.createElement('button');button.type='button';button.setAttribute('data-bede-photo',item.id);button.setAttribute('aria-label','Ver foto '+(i+1)+' de '+state.chosen.images.length+colorLabel);button.setAttribute('aria-pressed',String(i===index));const thumb=doc.createElement('img');thumb.src=item.url;thumb.alt='';thumb.loading='lazy';button.appendChild(thumb);button.addEventListener('click',()=>{const current=read();if(current?.chosen.name===state.chosen.name&&current.chosen.images.some(p=>p.id===item.id)){selectedPhotos.set(state.chosen.name,i);schedule();}});photos.appendChild(button);});readyFigure.appendChild(photos);
      }
      function fail(){if(token!==generation||stopped)return;failed=true;restore();}
      function commit(){
        if(token!==generation||stopped||pendingImage!==image||!image.naturalWidth)return;
        const current=read(),currentIndex=current?Math.min(selectedPhotos.get(current.chosen.name)||0,current.chosen.images.length-1):0;
        if(!current||JSON.stringify(current.model)+'|'+current.chosen.name+'|'+current.chosen.images[currentIndex].id!==next){restore();schedule();return;}
        if(loadTimer!==null)win.clearTimeout(loadTimer);loadTimer=null;image.onload=image.onerror=null;pendingImage=null;
        figure=readyFigure;area.insertAdjacentElement('beforebegin',figure);concealNative();
        if(!state.model.single&&state.model.colors.length>1){nav=doc.createElement('section');nav.className='bede-colors-gallery-nav';nav.setAttribute('aria-label','Cores deste modelo');state.group.insertAdjacentElement('afterend',nav);
        const heading=doc.createElement('h2');heading.textContent='Cores deste modelo';nav.appendChild(heading);
        const list=doc.createElement('div');nav.appendChild(list);
        for(const color of state.model.colors){
          const button=doc.createElement('button');button.type='button';button.dataset.color=color.name;
          const thumb=doc.createElement('img');thumb.src=color.images[0].url;thumb.alt='';thumb.loading='lazy';button.appendChild(thumb);
          const label=doc.createElement('span');label.textContent=color.name;button.appendChild(label);
          if(color.soldOut){const note=doc.createElement('small');note.textContent='Esgotado';button.appendChild(note);}
          button.addEventListener('click',()=>{
            const current=read(),native=Array.from(current?.group.querySelectorAll('a.js-insta-variant[data-option]')||[]).find(a=>a.getAttribute('data-option')===color.name);
            if(native&&native.getAttribute('aria-disabled')!=='true')native.click();schedule();
          });list.appendChild(button);
        }
        nav.querySelectorAll('button[data-color]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.color===state.chosen.name)));}
        if(focusPhoto&&(!doc.activeElement||doc.activeElement===doc.body))figure.querySelector('button[data-bede-photo="'+photo.id+'"]')?.focus();
      }
      pendingImage=image;image.onload=commit;image.onerror=fail;loadTimer=win.setTimeout(fail,6000);image.src=photo.url;
      if(image.complete&&image.naturalWidth)commit();
    }
    function schedule(){if(timer===null&&!failed&&!stopped)timer=win.setTimeout(update,40);}
    const initial=read();if(!initial)return null;
    const style=doc.createElement('style');style.textContent=CSS;doc.head.appendChild(style);
    const observer=new win.MutationObserver(schedule);observer.observe(form,{subtree:true,childList:true});
    observer.observe(root,{attributes:true,attributeFilter:['data-variants']});
    observer.observe(area,{subtree:true,childList:true,attributes:true,attributeFilter:['data-image','href']});
    form.addEventListener('change',schedule);form.addEventListener('click',schedule);win.addEventListener('pageshow',schedule);
    win.__bedeColorGallery={refresh(){if(stopped)return;failed=false;schedule();},stop(){stopped=true;if(timer!==null)win.clearTimeout(timer);timer=null;observer.disconnect();form.removeEventListener('change',schedule);form.removeEventListener('click',schedule);win.removeEventListener('pageshow',schedule);restore();style.remove();delete win.__bedeColorGallery;}};update();return win.__bedeColorGallery;
  }
  return{verified,getVerifiedGallery,imageURL,start};
});
