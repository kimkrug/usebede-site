/* BEDÊ theme presentation only. Native product/cart/account/checkout remain authoritative. */
(function(root,factory){
  const presentation=factory();
  if(typeof module==='object'&&module.exports)module.exports=presentation;
  else root.BedeStorePresentation=presentation;
})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/:$/,'').trim();
  const isSizeAxis=value=>/^(tamanho|tamanhos|numeracao|numero|size|sizes)$/.test(normalize(value));
  const isColorAxis=value=>/^(cor|cores|color|colour)$/.test(normalize(value));
  const compareSizes=(a,b)=>{
    const numeric=/^\d{1,3}(?:[.,]\d{1,2})?$/;
    if(numeric.test(a)&&numeric.test(b))return Number(a.replace(',','.'))-Number(b.replace(',','.'));
    return a.localeCompare(b,'pt-BR',{numeric:true,sensitivity:'base'});
  };
  function decode(value){
    return String(value).replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')
      .replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return code>0&&code<=0x10ffff?String.fromCodePoint(code):'';}).replace(/&amp;/g,'&');
  }
  function attribute(tag,name){
    const match=tag.match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')','i'));
    return match?decode(match[1]??match[2]):'';
  }
  function previewFromVariants(variants,axes,expectedId){
    const unknown={status:'unknown',sizes:[],colors:[]};
    if(!Array.isArray(variants)||!variants.length||variants.length>500||!Array.isArray(axes)||!axes.length)return unknown;
    if(axes.some(a=>!Number.isInteger(a.index)||a.index<0||a.index>2)||new Set(axes.map(a=>a.index)).size!==axes.length)return unknown;
    if(variants.some(v=>!v||!v.id||!v.sku||!v.product_id||(expectedId&&String(v.product_id)!==String(expectedId)))||new Set(variants.map(v=>String(v.product_id))).size!==1)return unknown;
    if(new Set(variants.map(v=>String(v.id))).size!==variants.length||new Set(variants.map(v=>String(v.sku))).size!==variants.length)return unknown;
    const sizeAxes=axes.filter(a=>isSizeAxis(a.name)),colorAxes=axes.filter(a=>isColorAxis(a.name));
    if(sizeAxes.length===0)return{status:'not-sized',sizes:[],colors:[]};
    if(sizeAxes.length!==1||colorAxes.length>1)return unknown;
    const sizeKey='option'+sizeAxes[0].index,colorKey=colorAxes.length?'option'+colorAxes[0].index:null;
    if(variants.some(v=>typeof v[sizeKey]!=='string'||!v[sizeKey].trim()||(colorKey&&(typeof v[colorKey]!=='string'||!v[colorKey].trim()))))return unknown;
    // Availability alone can also describe unlimited stock or contact-only items.
    // Only positive finite stock on a visible, purchasable exact variant is a preview.
    const confirmed=variants.filter(v=>v.available===true&&v.is_visible===true&&v.contact!==true&&typeof v.stock==='number'&&Number.isFinite(v.stock)&&v.stock>0);
    const sizes=[...new Set(confirmed.map(v=>v[sizeKey].trim()))].sort(compareSizes);
    const colors=colorKey?[...new Set(variants.map(v=>v[colorKey].trim()))].map(color=>({name:color,sizes:[...new Set(confirmed.filter(v=>v[colorKey].trim()===color).map(v=>v[sizeKey].trim()))].sort(compareSizes)})):[];
    const imageBindings=[];
    if(colorKey)for(const v of variants){
      const imageId=/^[1-9]\d*$/.test(String(v.image))?String(v.image):null;
      let imageURL=null;try{const u=new URL(v.image_url,'https://loja.usebede.com.br');if(u.protocol==='https:'&&/(^|\.)mitiendanube\.com$/.test(u.hostname)&&!u.username&&!u.password&&!u.port)imageURL=u.href;}catch(_){}
      if(!imageId||!imageURL)continue;
      let binding=imageBindings.find(b=>b.id===imageId&&b.url===imageURL);
      if(!binding){binding={id:imageId,url:imageURL,colors:[]};imageBindings.push(binding);}
      const color=v[colorKey].trim();if(!binding.colors.includes(color))binding.colors.push(color);
    }
    return{status:'known',sizes,colors,imageBindings,multipleOptions:axes.length>(colorKey?2:1)};
  }
  function resolveCardPreview(data,evidence={}){
    const unknown={status:'unknown',sizes:[],color:null,message:'Consultar tamanhos',note:'Veja as opções no produto.'};
    if(!data||data.status==='idle')return{...unknown,status:'idle',message:'Prévia de tamanhos',note:'Disponível ao visualizar o produto.'};
    if(data.status==='queued')return{...unknown,status:'queued',message:'Aguardando consulta…',note:''};
    if(data.status==='loading')return{...unknown,status:'loading',message:data.retrying?'Consultando novamente…':'Consultando tamanhos…',note:''};
    if(data.status==='error')return{...unknown,status:'error',reason:data.reason||'unknown',message:data.reason==='structure'?'Não foi possível confirmar os tamanhos':'Não foi possível consultar agora',note:data.retryPending?'Nova tentativa em instantes.':'Veja as opções no produto.'};
    if(data.status==='not-sized')return{...unknown,status:'not-sized',message:'Consultar opções',note:''};
    if(data.status!=='known'||!Array.isArray(data.colors)||!Array.isArray(data.sizes))return unknown;
    let chosen=null;
    if(evidence.color!==null&&evidence.color!==undefined){
      const matches=data.colors.filter(c=>c.name===evidence.color);
      if(matches.length!==1)return unknown;chosen=matches[0];
    }else if(data.colors.length===1)chosen=data.colors[0];
    else if(data.colors.length>1){
      const urls=new Set();for(const value of evidence.imageURLs||[]){
        try{const u=new URL(value,'https://loja.usebede.com.br');if(u.protocol==='https:'&&/(^|\.)mitiendanube\.com$/.test(u.hostname)&&!u.username&&!u.password&&!u.port)urls.add(u.href);}catch(_){}
      }
      const bindings=Array.isArray(data.imageBindings)?data.imageBindings:[];
      const matched=bindings.filter(b=>urls.has(b.url)||(evidence.imageId&&b.id===String(evidence.imageId)));
      const ids=[...new Set(matched.map(b=>b.id))];
      // A reused image ID stays ambiguous even when its CDN URLs differ.
      const colors=ids.length===1?[...new Set(bindings.filter(b=>b.id===ids[0]).flatMap(b=>b.colors))]:[];
      if(ids.length===1&&colors.length===1&&(!evidence.imageId||ids[0]===String(evidence.imageId)))chosen=data.colors.find(c=>c.name===colors[0]);
      if(!chosen){
        if(data.colors.some(c=>!c||typeof c.name!=='string'||!c.name||!Array.isArray(c.sizes)||c.sizes.some(s=>typeof s!=='string'||!s))||new Set(data.colors.map(c=>c.name)).size!==data.colors.length)return unknown;
        return{...unknown,status:'by-color',message:'Tamanhos por cor',groups:data.colors.map(c=>({name:c.name,sizes:[...c.sizes].sort(compareSizes)})),multipleOptions:Boolean(data.multipleOptions),note:data.multipleOptions?'Confirme a combinação no produto.':'Prévia por cor · confira no produto.'};
      }
    }
    const sizes=chosen?chosen.sizes:data.sizes;
    if(!Array.isArray(sizes))return unknown;
    return{status:'known',color:chosen?.name||null,sizes:[...sizes].sort(compareSizes),
      message:sizes.length?'Tamanhos com estoque':'Sem estoque confirmado',
      note:data.multipleOptions?'Confirme a combinação no produto.':'Prévia · confirme no produto.'};
  }
  function parseProductHTML(html,expectedId){
    if(typeof html!=='string'||html.length>2500000)throw new Error('Invalid product document');
    // Parse inert text only: never execute remote scripts or attach remote HTML.
    let raw='';
    for(const match of html.matchAll(/<(?:div|section)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)){
      if(attribute(match[1],'data-store')==='product-detail'){raw=attribute(match[1],'data-variants');break;}
    }
    if(!raw)throw new Error('Native variants unavailable');
    const variants=JSON.parse(raw),axes=[];
    for(const match of html.matchAll(/<div\b[^>]*class=["'][^"']*\bjs-product-variants-group\b[^"']*["'][^>]*>/gi)){
      const index=attribute(match[0],'data-variation-id');
      const label=html.slice(match.index+match[0].length,match.index+match[0].length+1200).match(/<label\b[^>]*>([\s\S]*?)<\/label>/i);
      if(!/^[0-2]$/.test(index)||!label)continue;
      axes.push({index:Number(index),name:decode(label[1].replace(/<[^>]*>/g,'')).trim()});
    }
    return previewFromVariants(variants,axes,expectedId);
  }
  function initialVariantImage(variants,selections,productId){
    const numericId=value=>/^[1-9]\d*$/.test(String(value))&&Number.isSafeInteger(Number(value));
    if(!numericId(productId)||!Array.isArray(variants)||!variants.length||variants.length>500||!Array.isArray(selections)||!selections.length||selections.length>3)return null;
    if(variants.some(v=>!v||!numericId(v.id)||String(v.product_id)!==String(productId))||new Set(variants.map(v=>String(v.id))).size!==variants.length)return null;
    if(selections.some(s=>!s||!Number.isInteger(s.index)||s.index<0||s.index>2||typeof s.value!=='string'||!s.value)||new Set(selections.map(s=>s.index)).size!==selections.length)return null;
    const axes=[0,1,2].filter(i=>variants.some(v=>v['option'+i]!==null&&v['option'+i]!==undefined&&v['option'+i]!==''));
    if(axes.length!==selections.length||axes.some(i=>!selections.some(s=>s.index===i)||variants.some(v=>typeof v['option'+i]!=='string'||!v['option'+i])))return null;
    const matches=variants.filter(v=>selections.every(s=>v['option'+s.index]===s.value));
    if(matches.length!==1||!numericId(matches[0].image))return null;
    return{productId:String(productId),variantId:String(matches[0].id),imageId:String(matches[0].image)};
  }
  function createInitialGalleryAlignment(doc,runtime){
    // One initial native thumbnail click only. No variant/selection/cart writes.
    const roots=doc.querySelectorAll('#single-product');
    if(roots.length!==1)return{start(){},cancel(){}};
    const root=roots[0],listeners=[];let done=false,started=false,timer=null,deadlineTimer=null,previous=null,attempts=0;
    function cancel(){
      if(done)return;done=true;runtime.clearTimeout(timer);runtime.clearTimeout(deadlineTimer);
      listeners.forEach(([target,type,fn])=>target.removeEventListener(type,fn,true));
    }
    function listen(target,type,fn){target.addEventListener(type,fn,true);listeners.push([target,type,fn]);}
    const relevant=target=>target?.closest?.('#single-product')===root&&Boolean(target.closest('.js-swiper-product, .js-swiper-product-thumbs, .js-product-variants-group, .js-variation-option, .js-insta-variant'));
    const human=event=>{if(event.isTrusted===true&&(event.type==='keydown'||relevant(event.target)))cancel();};
    ['pointerdown','mousedown','touchstart','click','keydown','change'].forEach(type=>listen(doc,type,human));
    listen(runtime,'pagehide',cancel);listen(doc,'visibilitychange',()=>{if(doc.hidden)cancel();});
    function read(){
      if(root.isConnected===false||doc.hidden||root.getAttribute('data-store')!=='product-detail')return null;
      const forms=root.querySelectorAll('form#product_form'),galleries=root.querySelectorAll('.js-swiper-product'),thumbContainers=root.querySelectorAll('.js-swiper-product-thumbs');
      if(forms.length!==1||galleries.length!==1||thumbContainers.length!==1)return null;
      const form=forms[0],gallery=galleries[0],formId=/^product-form-([1-9]\d*)$/.exec(form.getAttribute('data-store')||'')?.[1];
      if(!formId||!(gallery.classList.contains('swiper-container-initialized')||gallery.classList.contains('swiper-initialized')))return null;
      const selects=Array.from(form.querySelectorAll('select.js-variation-option'));
      const selections=selects.map(select=>({index:Number(/^variation\[([0-2])\]$/.exec(select.getAttribute('name')||'')?.[1]??NaN),value:select.value}));
      if(selects.some(select=>select.multiple||select.selectedOptions?.length!==1))return null;
      const raw=root.getAttribute('data-variants');if(!raw||raw.length>2500000)return null;
      let variants;try{variants=JSON.parse(raw);}catch(_){return null;}
      const match=initialVariantImage(variants,selections,formId);if(!match)return null;
      const slides=Array.from(gallery.querySelectorAll('.js-product-slide')),targetSlides=slides.filter(slide=>slide.getAttribute('data-image')===match.imageId);
      const active=slides.filter(slide=>slide.classList.contains('swiper-slide-active'));
      if(targetSlides.length!==1||active.length!==1)return null;
      const slide=targetSlides[0],position=slide.getAttribute('data-image-position'),activeImage=active[0].getAttribute('data-image');
      if(!/^(0|[1-9]\d*)$/.test(position||'')||!Number.isSafeInteger(Number(position))||!/^\d+$/.test(activeImage||'')||slides.filter(s=>s.getAttribute('data-image-position')===position).length!==1)return null;
      const thumbs=Array.from(thumbContainers[0].querySelectorAll('a.js-product-thumb')).filter(t=>t.getAttribute('data-thumb-loop')===position&&!t.classList.contains('js-product-thumb-modal'));
      if(thumbs.length!==1)return null;const thumb=thumbs[0];
      if(thumb.getAttribute('href')!=='#'||thumb.getAttribute('aria-disabled')==='true'||thumb.hasAttribute('data-video_id')||thumb.hasAttribute('data-video-id')||thumb.closest('[inert]')||typeof thumb.click!=='function')return null;
      return{form,gallery,slide,thumb,alreadyActive:slide===active[0],key:JSON.stringify([match,selections,position,activeImage])};
    }
    const same=(a,b)=>a&&b&&a.key===b.key&&a.form===b.form&&a.gallery===b.gallery&&a.slide===b.slide&&a.thumb===b.thumb;
    function poll(){
      if(done)return;if(doc.hidden||++attempts>27){cancel();return;}
      let current;try{current=read();}catch(_){cancel();return;}
      if(current?.alreadyActive){cancel();return;}
      if(same(previous,current)){
        let fresh;try{fresh=read();}catch(_){cancel();return;}
        if(!same(current,fresh)){cancel();return;}
        cancel();try{fresh.thumb.click();}catch(_){/* Native gallery failure is never retried. */}return;
      }
      previous=current;timer=runtime.setTimeout(poll,150);
    }
    function start(){
      if(done||started)return;started=true;
      if(doc.hidden||relevant(doc.activeElement)){cancel();return;}
      deadlineTimer=runtime.setTimeout(cancel,4000);timer=runtime.setTimeout(poll,0);
    }
    return{start,cancel};
  }
  return{isSizeAxis,isColorAxis,compareSizes,previewFromVariants,parseProductHTML,resolveCardPreview,initialVariantImage,createInitialGalleryAlignment};
});
(function () {
  'use strict';
  if(typeof window==='undefined'||typeof document==='undefined')return;
  if (window.__bedeStoreUI) return;
  window.__bedeStoreUI = true;
  const HOME = 'https://www.usebede.com.br';
  const STORE = 'https://loja.usebede.com.br';
  const model = window.BedeCatalog;
  const presentation=window.BedeStorePresentation;
  const config = typeof CFG_LOJA !== 'undefined' ? CFG_LOJA : {};
  const initialGalleryAlignment=presentation.createInitialGalleryAlignment(document,window);
  const offerState = { loading: false, lastAttemptAt: null, timer: null, validUntil: 0 };
  const money = cents => (cents / 100).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
  const style = document.createElement('style');
  style.textContent = `
    /* Keep the native amount and updates; only give the badge room to breathe. */
    header #ajax-cart>a{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-width:44px;min-height:44px;padding:0!important;margin-right:6px;overflow:visible}
    header #ajax-cart .js-cart-widget-amount.badge{display:inline-flex!important;align-items:center;justify-content:center;box-sizing:border-box;position:absolute;top:-3px;right:-4px;left:auto;transform:none;min-width:20px;width:auto;height:20px;min-height:20px;padding:0 5px!important;border:1px solid #fff;border-radius:999px;background:#000!important;color:#fff!important;font:600 11px/1 Montserrat,sans-serif;letter-spacing:0;white-space:nowrap;text-align:center}
    .bede-card-image-link{display:block}.bede-offer-image-link{position:relative;display:block}
    .bede-card-overlay{position:absolute;inset:auto 0 0;z-index:3;box-sizing:border-box;display:flex;flex-direction:column;gap:4px;max-height:none;padding:16px 10px 10px;background:linear-gradient(transparent,rgba(255,255,255,.98) 12%);color:#000;text-align:center;opacity:0;transform:translateY(5px);transition:opacity .18s ease,transform .18s ease;pointer-events:none;font:500 12px/1.4 Montserrat,sans-serif}
    .bede-card-overlay-name{font-weight:600;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;line-height:1.35;max-height:2.7em}.bede-card-overlay-cta{display:inline-flex;align-items:center;justify-content:center;align-self:center;flex-shrink:0;box-sizing:border-box;min-height:44px;max-width:100%;padding:8px 14px;background:#000!important;color:#fff!important;border:1px solid #000;text-decoration:none!important}
    .bede-card-ready:focus-within .bede-card-overlay{opacity:1;transform:none}
    .bede-card-preview{display:block;flex:0 0 auto;min-height:0;max-height:none;overflow:visible;margin:0;padding:0;color:#000;text-align:center;font:400 11px/1.35 Montserrat,sans-serif;white-space:normal;overflow-wrap:anywhere}
    .bede-card-preview span{display:block}.bede-card-preview-label{font-size:10px}.bede-card-preview-sizes{font-weight:600;font-size:12px;line-height:1.4}.bede-card-preview-note{font-size:9px;line-height:1.3}
    .bede-card-preview-color{font-size:10px;line-height:1.4;white-space:normal;overflow:visible;overflow-wrap:anywhere;word-break:normal}
    .bede-card-mobile-info{display:none}
    .bede-card-mobile-preview{display:block;flex:0 0 auto;min-height:0;max-height:none;overflow:visible;margin:0;padding:0;color:#000;text-align:left;font:400 11px/1.35 Montserrat,sans-serif;white-space:normal;overflow-wrap:anywhere}
    .bede-card-mobile-preview span{display:block}
    .bede-card-mobile-cta{display:flex;align-items:center;justify-content:center;box-sizing:border-box;min-height:44px;width:100%;max-width:100%;padding:8px 14px;background:#000!important;color:#fff!important;border:1px solid #000;text-decoration:none!important;font:500 11px/1.4 Montserrat,sans-serif}
    .bede-card-ready a:focus-visible{outline:2px solid #000;outline-offset:3px}
    .bede-card-ready .bede-card-image-link:focus-visible{box-shadow:0 0 0 3px #fff;outline:2px solid #000;outline-offset:3px}
    @media(hover:hover) and (pointer:fine){.bede-card-ready:hover .bede-card-overlay{opacity:1;transform:none}}
    @media(hover:none),(pointer:coarse){.bede-card-overlay{opacity:1;transform:none}}
    @media(prefers-reduced-motion:reduce){.bede-card-overlay{transition:none;transform:none}}
    .bede-product-help{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0 20px;font:500 12px/1.6 Montserrat,sans-serif}
    .bede-product-help a{color:#000;text-decoration:underline;text-underline-offset:3px;padding:5px 0}
    .bede-shipping-progress{margin:14px 0;padding:14px;background:#f7f6f2;color:#000;border-left:2px solid #000;font:400 12px/1.65 Montserrat,sans-serif;text-align:left}
    .bede-shipping-progress strong{font-weight:600}.bede-shipping-progress p{margin:0 0 5px}.bede-shipping-progress small{display:block;font-size:11px;line-height:1.5}
    .bede-offers{color:#000;font-family:Montserrat,sans-serif}.bede-offers-intro{max-width:640px;line-height:1.7;margin:0 0 24px}
    .bede-offers-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px 16px}
    .bede-offer-card{color:inherit;text-decoration:none}.bede-offer-card img{display:block;width:100%;aspect-ratio:4/5;object-fit:contain;background:#fff}
    .bede-offer-card h2{font-size:12px;font-weight:500;line-height:1.65;margin:12px 0 8px}.bede-offer-card del{font-size:12px;color:#000;margin-right:8px}.bede-offer-card strong{font-size:14px;font-weight:600}
    .bede-offers-empty{padding:44px 20px;text-align:center;background:#f7f6f2}.bede-offers-empty h2{font-size:23px;font-weight:400;margin-bottom:14px}.bede-offers-empty a{display:inline-block;margin-top:12px;padding:13px 20px;background:#000;color:white;text-decoration:none;font-size:12px}
    .bede-offers-native[hidden]{display:none!important}
    @media(max-width:767px){.bede-offers-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 10px}.bede-offers-empty{padding:32px 16px}.bede-card-overlay{opacity:1;transform:none;gap:2px;padding:10px 6px 6px;max-height:none}.bede-card-preview{max-height:none}.bede-card-preview .bede-card-preview-redundant-heading,.bede-card-preview .bede-card-preview-generic-note{display:none}.bede-card-overlay-name{font-size:10px}.bede-card-overlay-cta{font-size:11px;padding:7px 11px}}
    @media(max-width:767px),(hover:none),(pointer:coarse){.bede-card-ready .bede-card-overlay{display:none}.bede-card-mobile-info{display:flex;position:static;flex-direction:column;gap:8px;margin:8px 0 0;padding:0;min-width:0;max-height:none;overflow:visible;background:transparent;color:#000;text-align:left}.bede-card-mobile-preview .bede-card-preview-redundant-heading,.bede-card-mobile-preview .bede-card-preview-generic-note{display:none}}
  `;
  document.head.appendChild(style);
  function numericSizes() {
    document.querySelectorAll('.js-product-variants-group').forEach(group => {
      const select = group.querySelector('select.js-variation-option');
      const label=group.querySelector('label');
      if (!select || !label || !presentation.isSizeAxis(label.textContent)) return;
      const options = Array.from(select.options);
      if (options.length < 2 || !options.every(o => /^\d{1,2}(?:[.,]\d)?$/.test(o.value))) return;
      const number = value => Number(value.replace(',', '.'));
      const sorted = options.slice().sort((a,b)=>number(a.value)-number(b.value));
      const selected = select.value;
      if (!sorted.every((o,i)=>o===options[i])) sorted.forEach(option=>select.appendChild(option));
      select.value = selected;
      const buttons = Array.from(group.querySelectorAll('a.js-insta-variant[data-option]'));
      if (buttons.length === options.length && new Set(buttons.map(b=>b.dataset.option)).size === options.length && buttons.every(b=>options.some(o=>o.value===b.dataset.option))) {
        const parent = buttons[0].parentElement;
        if (buttons.every(b=>b.parentElement===parent)) {
          const ordered=buttons.slice().sort((a,b)=>number(a.dataset.option)-number(b.dataset.option));
          if (!ordered.every((button,i)=>button===buttons[i])) ordered.forEach(button=>parent.appendChild(button));
        }
      }
    });
  }
  function productHelp() {
    const variants = document.querySelector('.js-product-variants');
    if (!variants || document.getElementById('bede-product-help')) return;
    const help = document.createElement('nav'); help.id='bede-product-help'; help.className='bede-product-help'; help.setAttribute('aria-label','Ajuda para escolher seu produto');
    [['Guia de tamanhos','/guia-medidas.html'],['Trocas e devoluções','/trocas.html']].forEach(([label,path])=>{
      const link=document.createElement('a');link.href=HOME+path;link.textContent=label;help.appendChild(link);
    });
    variants.insertAdjacentElement('afterend',help);
  }
  function shippingMessage() {
    const subtotal=document.querySelector('.js-cart-subtotal[data-priceraw]');
    const oldBox=document.getElementById('bede-shipping-progress');
    if (!subtotal) { if(oldBox)oldBox.remove(); return; }
    const raw=subtotal.getAttribute('data-priceraw');
    const threshold=Math.round(Number(config.freteGratisAcimaDe)*100);
    const regions=Array.isArray(config.freteGratisRegioes)?config.freteGratisRegioes.filter(r=>typeof r==='string'&&r.trim()):[];
    if (!/^\d+$/.test(raw||'') || !Number.isSafeInteger(Number(raw)) || !Number.isSafeInteger(threshold) || threshold<=0 || !regions.length) { if(oldBox)oldBox.remove(); return; }
    const current=Number(raw);
    let box=document.getElementById('bede-shipping-progress');
    if(!box){box=document.createElement('div');box.id='bede-shipping-progress';box.className='bede-shipping-progress';box.setAttribute('role','status');box.setAttribute('aria-live','polite');subtotal.parentElement.insertAdjacentElement('afterend',box);}
    const regionText=regions.join(' e ');
    const key=current+'|'+threshold+'|'+regionText;
    if(box.dataset.state===key)return;
    box.dataset.state=key; box.replaceChildren();
    const p=document.createElement('p');const strong=document.createElement('strong');
    strong.textContent=current<threshold?`Faltam ${money(threshold-current)} para atingir o valor mínimo do frete grátis.`:'Você atingiu o valor mínimo do frete grátis.';
    p.appendChild(strong);box.appendChild(p);
    const note=document.createElement('small');note.textContent=`Válido para ${regionText}, em PAC ou Jadlog Econômico. Confirme a elegibilidade pelo CEP e pelo total após descontos no checkout.`;box.appendChild(note);
  }
  // The published native menu is the only type navigation. No duplicate bar.
  const cards=new Map(),previewCache=new Map(),previewFailures=new Map(),queued=new Set(),pending=[],controllers=new Set();
  const PREVIEW_TTL=60000,PREVIEW_RETRY_DELAY=10000,MAX_READS_PER_MINUTE=48;
  let activeReads=0,previewTimer=null,previewTimerAt=0,budgetStart=Date.now(),readCount=0,generation=0,pageActive=true;
  function productURL(value){
    try{const url=new URL(value,STORE);return url.origin===STORE&&!url.username&&!url.password&&!url.search&&!url.hash&&/^\/produtos\/[^/]+\/$/.test(url.pathname)?url.href:'';}catch(_){return'';}
  }
  function selectedColor(card){
    const values=[];
    for(const group of card.querySelectorAll('.js-product-variants-group')){
      if(!presentation.isColorAxis(group.querySelector('label')?.textContent))continue;
      const select=group.querySelector('select.js-variation-option');
      if(select&&select.value)values.push(select.value);
    }
    return values.length===1?values[0]:values.length?'':null;
  }
  function renderPreview(record,data){
    const evidence={color:selectedColor(record.card),imageURLs:[],imageId:null};
    const images=Array.from(record.imageLink.querySelectorAll('img'));
    const featured=images.filter(img=>img.classList.contains('item-image-featured'));
    const image=featured.length===1?featured[0]:images.length===1?images[0]:null;
    if(image){
      evidence.imageId=image.getAttribute('data-image');
      for(const value of [image.currentSrc,image.getAttribute('src'),image.getAttribute('data-src')])if(value)evidence.imageURLs.push(value);
      for(const name of ['srcset','data-srcset'])for(const part of (image.getAttribute(name)||'').split(',')){
        const value=part.trim().split(/\s+/)[0];if(value)evidence.imageURLs.push(value);
      }
    }
    const view=presentation.resolveCardPreview(data,evidence),signature=JSON.stringify(view);
    if(record.signature===signature)return;
    record.signature=signature;const areas=[record.preview,record.mobilePreview];
    for(const area of areas){area.replaceChildren();area.setAttribute('data-bede-preview-state',view.status);area.setAttribute('data-bede-preview-reason',view.reason||'');}
    const line=(text,className)=>{for(const area of areas){const span=document.createElement('span');span.className=className;span.textContent=text;area.appendChild(span);}};
    const grouped=Array.isArray(view.groups)?view.groups:[],visibleGroups=grouped.slice(0,2);
    const colorRowsExplainSizes=view.status==='by-color'&&visibleGroups.some(c=>c.sizes.length>0);
    if(view.color)line('Cor: '+view.color,'bede-card-preview-label');
    line(view.message,'bede-card-preview-label'+(colorRowsExplainSizes?' bede-card-preview-redundant-heading':''));
    if(view.sizes.length)line(view.sizes.join(' · '),'bede-card-preview-sizes');
    const colorLines=visibleGroups.map(c=>c.name+': '+(c.sizes.length?c.sizes.join(' · '):'Sem estoque confirmado'));
    colorLines.forEach(text=>line(text,'bede-card-preview-color'));
    const otherColors=grouped.length-2;
    const note=otherColors>0?'+'+otherColors+(otherColors===1?' cor':' cores')+' no produto.'+(view.multipleOptions?' Confirme a combinação.':''):view.note;
    // Mobile hides only repeated successful-preview copy. Warnings, additional
    // colors and full accessible link text stay intact; desktop keeps all copy.
    const genericNote=(view.status==='known'&&view.sizes.length>0||colorRowsExplainSizes)&&
      (note==='Prévia · confirme no produto.'||note==='Prévia por cor · confira no produto.');
    if(note)line(note,'bede-card-preview-note'+(genericNote?' bede-card-preview-generic-note':''));
    // Desktop uses its original image link; touch exposes a plain product link
    // below the native description. Both retain the full availability caveat.
    const accessibleLabel=[record.name,view.color?'Cor: '+view.color:'',view.message,view.sizes.join(', '),...colorLines,note,'Ver produto'].filter(Boolean).join('. ');
    record.imageLink.setAttribute('aria-label',accessibleLabel);record.mobileCTA.setAttribute('aria-label',accessibleLabel);
  }
  function applyPreview(url,data){for(const record of cards.values())if(record.url===url)renderPreview(record,data);}
  function schedulePreviews(delay=30000){
    if(!pageActive||document.hidden||!cards.size)return;
    const remaining=[...previewCache.values()].map(c=>c.until-Date.now()).filter(ms=>ms>0);
    remaining.push(...[...previewFailures.values()].filter(f=>f.retryAt!==null).map(f=>f.retryAt-Date.now()).filter(ms=>ms>0));
    if(remaining.length)delay=Math.min(delay,...remaining);
    const at=Date.now()+delay;
    // Unrelated lazy-image mutations must not postpone the stock expiry forever.
    if(previewTimer!==null&&previewTimerAt<=at)return;
    window.clearTimeout(previewTimer);previewTimerAt=at;
    previewTimer=window.setTimeout(()=>{previewTimer=null;previewTimerAt=0;refreshPreviews();pumpPreviews();},delay);
  }
  function requestPreview(record){
    if(!pageActive||document.hidden||!record.visible)return;
    const cached=previewCache.get(record.url);
    if(cached&&cached.until>Date.now()){renderPreview(record,cached.data);return;}
    const failure=previewFailures.get(record.url);
    if(failure){
      renderPreview(record,failure.data);
      if(failure.retryAt===null||Date.now()<failure.retryAt||!retryVisible(record)){schedulePreviews();return;}
    }
    if(queued.has(record.url)){renderPreview(record,{status:pending.some(j=>j.url===record.url)?'queued':'loading',retrying:Boolean(failure)});return;}
    renderPreview(record,{status:'queued'});
    queued.add(record.url);pending.push({url:record.url,id:record.id,retry:Boolean(failure)});
    pumpPreviews();
  }
  function retryVisible(record){
    if(!pageActive||document.hidden||!record.visible||!document.body.contains(record.card)||typeof record.card.getBoundingClientRect!=='function')return false;
    const rect=record.card.getBoundingClientRect();
    return rect.width>0&&rect.height>0&&rect.bottom>0&&rect.right>0&&rect.top<window.innerHeight&&rect.left<window.innerWidth;
  }
  function refreshPreviews(){
    for(const [card,record] of cards){
      if(!document.body.contains(card)){cards.delete(card);if(cardObserver)cardObserver.unobserve(card);continue;}
      const cached=previewCache.get(record.url);
      if(!cached||cached.until<=Date.now())renderPreview(record,previewFailures.get(record.url)?.data||{status:'idle'});
      if(record.visible)requestPreview(record);
    }
    for(const url of previewFailures.keys())if(![...cards.values()].some(r=>r.url===url))previewFailures.delete(url);
    schedulePreviews();
  }
  async function readPreview(job){
    const epoch=generation,controller=new AbortController();controllers.add(controller);activeReads++;
    let timedOut=false;
    const timeout=window.setTimeout(()=>{timedOut=true;controller.abort();},8000);
    let data={status:'error',reason:'network'},retryable=false;
    applyPreview(job.url,{status:'loading',retrying:job.retry});
    try{
      const response=await fetch(job.url,{method:'GET',credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
      if(!response.ok){data={status:'error',reason:'http'};retryable=response.status===429||response.status>=500;}
      else if(!(response.headers.get('content-type')||'').includes('text/html'))data={status:'error',reason:'structure'};
      else{
        const html=await response.text();
        try{data=presentation.parseProductHTML(html,job.id);if(!['known','not-sized'].includes(data.status))data={status:'error',reason:'structure'};}
        catch(_){data={status:'error',reason:'structure'};}
      }
    }catch(_){data={status:'error',reason:timedOut?'timeout':'network'};retryable=true;}
    finally{
      window.clearTimeout(timeout);controllers.delete(controller);activeReads--;if(epoch===generation)queued.delete(job.url);
      if(epoch===generation&&pageActive&&!document.hidden){
        previewCache.delete(job.url);
        if(data.status==='error'){
          const retryPending=retryable&&!job.retry;data={...data,retryPending};
          // At most one additional attempt per consecutive failure episode.
          // Structural failures and the second transient failure stay explicit,
          // with no recurring request loop. Hiding/leaving clears all previews.
          previewFailures.set(job.url,{data,retryAt:retryPending?Date.now()+PREVIEW_RETRY_DELAY:null});
        }else{
          previewFailures.delete(job.url);previewCache.set(job.url,{data,until:Date.now()+PREVIEW_TTL});
          while(previewCache.size>96)previewCache.delete(previewCache.keys().next().value);
        }
        applyPreview(job.url,data);
      }
      pumpPreviews();schedulePreviews();
    }
  }
  function pumpPreviews(){
    if(!pageActive||document.hidden)return;
    if(Date.now()-budgetStart>=60000){budgetStart=Date.now();readCount=0;}
    while(activeReads<3&&pending.length&&readCount<MAX_READS_PER_MINUTE){
      const job=pending.shift();
      if(![...cards.values()].some(r=>r.url===job.url&&r.visible&&document.body.contains(r.card))){queued.delete(job.url);continue;}
      if(job.retry&&![...cards.values()].some(r=>r.url===job.url&&retryVisible(r))){queued.delete(job.url);continue;}
      readCount++;readPreview(job);
    }
    if(pending.length&&readCount>=MAX_READS_PER_MINUTE)schedulePreviews(Math.max(1000,60000-(Date.now()-budgetStart)));
  }
  const cardObserver=typeof window.IntersectionObserver==='function'?new window.IntersectionObserver(entries=>{
    for(const entry of entries){const record=cards.get(entry.target);if(!record)continue;record.visible=entry.isIntersecting;if(record.visible)requestPreview(record);}
  },{rootMargin:'160px 0px'}):null;
  function enhanceCards(){
    const found=[...document.querySelectorAll('.js-item-product[data-product-type="list"]'),...document.querySelectorAll('article.bede-offer-card')];
    for(const card of found){
      if(cards.has(card)){const record=cards.get(card),cached=previewCache.get(record.url);if(cached&&cached.until>Date.now())renderPreview(record,cached.data);continue;}
      const imageLink=card.querySelector('a.js-product-item-image-link-private')||card.querySelector('a.bede-offer-image-link');
      const url=productURL(imageLink?.getAttribute('href')||imageLink?.href);
      const name=(card.querySelector('.js-item-name')||card.querySelector('h2'))?.textContent?.trim();
      const info=card.querySelector('.item-description')||card;
      if(!imageLink||!url||!name||info.tagName==='A'||imageLink.contains(info)||info.closest('.js-item-image-padding')||info.closest('.product-item-image-container'))continue;
      // Swiper may clone an already enhanced card without our Map entry.
      // Rebuild only our presentation artifacts; native nodes stay untouched.
      for(const selector of ['.bede-card-mobile-info','.bede-card-mobile-preview','.bede-card-overlay','.bede-card-preview','.bede-card-product-link']){
        card.querySelectorAll(selector).forEach(artifact=>artifact.remove());
      }
      const overlay=document.createElement('span');overlay.className='bede-card-overlay';overlay.setAttribute('aria-hidden','true');
      const title=document.createElement('span');title.className='bede-card-overlay-name';title.textContent=name;overlay.appendChild(title);
      const preview=document.createElement('span');preview.className='bede-card-preview';overlay.appendChild(preview);
      const cta=document.createElement('span');cta.className='bede-card-overlay-cta';cta.textContent='Ver produto';overlay.appendChild(cta);imageLink.appendChild(overlay);imageLink.classList.add('bede-card-image-link');
      // The native image link is absolute inside a padding-ratio box. Touch
      // information must instead live in normal description flow, after its
      // original name/price, with a plain navigation link and no purchase hook.
      const mobileInfo=document.createElement('div');mobileInfo.className='bede-card-mobile-info';
      const mobilePreview=document.createElement('span');mobilePreview.className='bede-card-mobile-preview';mobilePreview.setAttribute('aria-hidden','true');mobileInfo.appendChild(mobilePreview);
      const mobileCTA=document.createElement('a');mobileCTA.className='bede-card-mobile-cta';mobileCTA.setAttribute('href',url);mobileCTA.textContent='Ver produto';mobileInfo.appendChild(mobileCTA);info.appendChild(mobileInfo);
      const record={card,url,name,imageLink,id:card.getAttribute('data-product-id')||null,preview,mobilePreview,mobileCTA,visible:!cardObserver&&cards.size<24,signature:''};cards.set(card,record);card.classList.add('bede-card-ready');renderPreview(record,{status:'idle'});
      if(cardObserver)cardObserver.observe(card);else if(cards.size<=24&&!card.closest('[hidden]'))requestPreview(record);
      card.addEventListener('focusin',()=>{record.visible=true;requestPreview(record);});
      card.addEventListener('mouseenter',()=>{record.visible=true;requestPreview(record);},{passive:true});
      imageLink.addEventListener('load',()=>{const cached=previewCache.get(url);if(cached&&cached.until>Date.now())renderPreview(record,cached.data);},true);
    }
    schedulePreviews();
  }
  function pausePreviews(){
    generation++;window.clearTimeout(previewTimer);previewTimer=null;previewTimerAt=0;pending.length=0;queued.clear();previewCache.clear();previewFailures.clear();
    controllers.forEach(controller=>controller.abort());
    // Clear stale availability before BFCache restore or returning to the tab.
    for(const record of cards.values())renderPreview(record,{status:'idle'});
  }
  function isOffersRoute() { return new URL(location.href).searchParams.get('bede_ofertas')==='1' && /^\/produtos\/?$/.test(location.pathname); }
  function scheduleOffers(delay) {
    window.clearTimeout(offerState.timer);offerState.timer=null;
    if(!document.hidden&&isOffersRoute())offerState.timer=window.setTimeout(offersView,Math.max(0,delay));
  }
  function offersLayout() {
    if(!isOffersRoute())return null;
    const native=document.querySelector('[data-store="category-grid-0"]');
    if(!native)return null;
    const heading=document.querySelector('h1');if(heading)heading.textContent='Ofertas';
    document.title='Ofertas | BEDÊ Stiletto';
    // Hide the product grid only. Its parent can also contain filters, banners,
    // newsletter or footer; those siblings must not be hidden indiscriminately.
    native.classList.add('bede-offers-native');native.hidden=true;
    const area=native.parentElement;
    area.querySelectorAll('a[href="/produtos/page/2/"]').forEach(link=>{
      const pager=link.closest('.row.justify-content-center.align-items-center.mt-4');
      if(pager&&pager!==area&&area.contains(pager)&&!pager.contains(native)){
        pager.classList.add('bede-offers-native');pager.hidden=true;
      }
    });
    let section=document.getElementById('bede-offers');
    if(section)return document.getElementById('bede-offers-content');
    section=document.createElement('section');section.id='bede-offers';section.className='bede-offers';section.setAttribute('aria-label','Produtos com preço promocional');native.insertAdjacentElement('afterend',section);
    const intro=document.createElement('p');intro.className='bede-offers-intro';intro.textContent='Somente produtos com preço promocional cadastrado na loja. Descontos por forma de pagamento não entram nesta seleção.';section.appendChild(intro);
    const content=document.createElement('div');content.id='bede-offers-content';section.appendChild(content);return content;
  }
  function clearOffers() {
    const content=offersLayout();if(!content)return null;
    content.className='';content.replaceChildren();content.setAttribute('role','status');content.textContent='Consultando ofertas…';return content;
  }
  async function offersView() {
    if(!isOffersRoute()||offerState.loading)return;
    const content=clearOffers();if(!content)return;
    window.clearTimeout(offerState.timer);offerState.timer=null;offerState.validUntil=0;
    if(document.hidden)return;
    const empty=(title,explanation)=>{content.setAttribute('role','status');content.className='bede-offers-empty';content.replaceChildren();const h=document.createElement('h2');h.textContent=title;content.appendChild(h);const p=document.createElement('p');p.textContent=explanation;content.appendChild(p);const a=document.createElement('a');a.href=STORE+'/produtos/';a.textContent='Explorar todos os produtos';content.appendChild(a);};
    if(!model){empty('Não foi possível consultar as ofertas.','O catálogo completo continua disponível.');return;}
    const elapsed=offerState.lastAttemptAt===null?Infinity:Date.now()-offerState.lastAttemptAt;
    if(elapsed<20000){scheduleOffers(20000-elapsed);return;}
    offerState.loading=true;offerState.lastAttemptAt=Date.now();
    try{
      const response=await fetch(HOME+'/api/catalogo',{method:'GET',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw new Error('Unavailable');
      const data=await response.json();
      const now=Date.now(),stamp=typeof data.fetchedAt==='string'?Date.parse(data.fetchedAt):NaN,start=typeof data.startedAt==='string'?Date.parse(data.startedAt):NaN;
      if(!Number.isFinite(stamp)||!Number.isFinite(start)||start>stamp||now-start>=150000||stamp>now+30000||!Array.isArray(data.products)||!data.products.length)throw new Error('Stale');
      const products=data.products.map(model.normalizeProduct);if(products.some(p=>!p)||new Set(products.map(p=>p.id)).size!==products.length)throw new Error('Invalid');
      offerState.validUntil=now+150000-Math.max(0,now-start);
      const offers=products.filter(p=>p.available&&model.getPromotion(p));
      if(!offers.length){empty('Nenhuma oferta no momento.','Assim que houver produtos remarcados, eles aparecerão aqui.');return;}
      content.removeAttribute('role');content.className='bede-offers-grid';
      content.innerHTML=offers.map(p=>`<article class="bede-offer-card"><a class="bede-offer-image-link" href="${model.escapeHTML(p.url)}" aria-label="${model.escapeHTML(p.name)}"><img src="${model.escapeHTML(p.image)}" alt="${model.escapeHTML(p.name)}" loading="lazy" width="480" height="600"></a><a href="${model.escapeHTML(p.url)}"><h2>${model.escapeHTML(p.name)}</h2><del>${model.escapeHTML(money(p.compareAtCents))}</del><strong>${p.priceRange?'A partir de ':''}${model.escapeHTML(money(p.priceCents))}</strong></a></article>`).join('');
      enhanceCards();
    }catch(_){offerState.validUntil=0;empty('Não foi possível consultar as ofertas.','Tente novamente em instantes. O catálogo completo continua disponível.');}
    finally{offerState.loading=false;scheduleOffers(offerState.validUntil?Math.min(120000,offerState.validUntil-Date.now()):120000);}
  }
  function loadVisualModules(){
    // Versioned, same-owner presentation modules. A load failure leaves native UI intact.
    for(const [file,name] of [['store-product-ui.js','BedeProductUI'],['store-filter-bar.js','BedeNativeFilters'],['store-color-gallery.js','BedeColorGallery']]){
      if(window[name]){window[name].start();continue;}
      const id='bede-module-'+name;if(document.getElementById(id))continue;
      const script=document.createElement('script');script.id=id;script.defer=true;
      script.src=HOME+'/'+file+'?v=20260906_ui1';
      script.onload=()=>{try{window[name]?.start();}catch(_){/* Preserve native presentation on failure. */}};
      document.head.appendChild(script);
    }
  }
  function init(){
    loadVisualModules();
    initialGalleryAlignment.start();numericSizes();productHelp();enhanceCards();shippingMessage();offersView();
    let shippingTimer=null;
    // Native AJAX can replace the subtotal node or create a drawer lazily.
    new MutationObserver(()=>{window.clearTimeout(shippingTimer);shippingTimer=window.setTimeout(()=>{numericSizes();productHelp();enhanceCards();shippingMessage();},50);}).observe(document.body,{attributes:true,attributeFilter:['data-priceraw'],childList:true,subtree:true});
    document.addEventListener('change',event=>{
      const card=event.target?.closest?.('.js-item-product'),record=cards.get(card);
      if(!record)return;const cached=previewCache.get(record.url);
      if(cached&&cached.until>Date.now())renderPreview(record,cached.data);else requestPreview(record);
    });
    window.addEventListener('pageshow',event=>{if(event.persisted){pageActive=true;numericSizes();enhanceCards();refreshPreviews();shippingMessage();offersView();}});
    window.addEventListener('pagehide',event=>{pageActive=false;pausePreviews();window.clearTimeout(offerState.timer);offerState.timer=null;if(event.persisted&&isOffersRoute())clearOffers();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){pausePreviews();window.clearTimeout(offerState.timer);offerState.timer=null;}else{refreshPreviews();offersView();}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());
