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
    return{status:'known',sizes,colors,multipleOptions:axes.length>(colorKey?2:1)};
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
  return{isSizeAxis,isColorAxis,compareSizes,previewFromVariants,parseProductHTML};
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
  const offerState = { loading: false, lastAttemptAt: null, timer: null, validUntil: 0 };
  const money = cents => (cents / 100).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
  const style = document.createElement('style');
  style.textContent = `
    .bede-card-image-link{display:block}.bede-offer-image-link{position:relative;display:block}
    .bede-card-overlay{position:absolute;inset:auto 0 0;z-index:3;display:flex;flex-direction:column;gap:6px;padding:22px 14px 16px;background:linear-gradient(transparent,rgba(255,255,255,.97) 24%);color:#000;text-align:center;opacity:0;transform:translateY(5px);transition:opacity .18s ease,transform .18s ease;pointer-events:none;font:500 12px/1.5 Montserrat,sans-serif}
    .bede-card-overlay-name{font-weight:600}.bede-card-overlay-cta{display:inline-flex;align-items:center;justify-content:center;align-self:center;box-sizing:border-box;min-height:44px;max-width:100%;padding:8px 14px;background:#000!important;color:#fff!important;border:1px solid #000;text-decoration:none!important}
    .bede-card-ready:focus-within .bede-card-overlay{opacity:1;transform:none}
    .bede-card-product-link{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-height:44px;max-width:100%;padding:8px 14px;font:500 12px/1.5 Montserrat,sans-serif;background:#000!important;color:#fff!important;border:1px solid #000;text-decoration:none!important}
    .bede-card-preview{margin:4px 0 16px;min-height:62px;padding:0 8px;color:#000;text-align:center;font:400 11px/1.6 Montserrat,sans-serif;overflow-wrap:anywhere}
    .bede-card-preview p{margin:4px 0}.bede-card-preview summary{min-height:44px;padding:7px 2px;cursor:pointer;font-weight:500;list-style-position:inside}.bede-card-preview small{display:block;font-size:10px;line-height:1.55;color:#000}.bede-card-preview ul{list-style:none;margin:8px 0;padding:10px;background:#f7f6f2;text-align:left}.bede-card-preview li+li{margin-top:6px}
    .bede-card-ready a:focus-visible,.bede-card-preview summary:focus-visible{outline:2px solid #000;outline-offset:3px}
    .bede-card-ready .bede-card-product-link:focus-visible{box-shadow:0 0 0 3px #fff;outline:2px solid #000;outline-offset:3px}
    @media(hover:hover) and (pointer:fine){.bede-card-ready:hover .bede-card-overlay{opacity:1;transform:none}}
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
    @media(max-width:767px){.bede-offers-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 10px}.bede-offers-empty{padding:32px 16px}.bede-card-preview{padding:0 2px}.bede-card-overlay-name{font-size:11px}}
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
  const cards=new Map(),previewCache=new Map(),queued=new Set(),pending=[],controllers=new Set();
  const PREVIEW_TTL=60000,MAX_READS_PER_MINUTE=48;
  let activeReads=0,previewTimer=null,previewTimerAt=0,budgetStart=Date.now(),readCount=0,generation=0,pageActive=true;
  function productURL(value){
    try{const url=new URL(value,STORE);return url.origin===STORE&&!url.username&&!url.password&&!url.search&&!url.hash&&/^\/produtos\/[^/]+\/$/.test(url.pathname)?url.href:'';}catch(_){return'';}
  }
  function selectedColor(card){
    for(const group of card.querySelectorAll('.js-product-variants-group')){
      if(!presentation.isColorAxis(group.querySelector('label')?.textContent))continue;
      const select=group.querySelector('select.js-variation-option');
      if(select&&select.value)return select.value;
    }
    return null;
  }
  function renderPreview(record,data){
    const color=selectedColor(record.card),signature=JSON.stringify([data,color]);
    if(record.signature===signature)return;
    record.signature=signature;const area=record.preview;area.replaceChildren();
    const line=text=>{const p=document.createElement('p');p.textContent=text;area.appendChild(p);};
    if(!data||data.status==='loading'){line('Consultando tamanhos…');return;}
    if(data.status==='not-sized'){line('Confira as opções na página do produto.');return;}
    if(data.status!=='known'){line('Tamanhos: consulte na página do produto.');return;}
    const exact=color?data.colors.find(c=>c.name===color):null;
    if(color&&!exact){line('Confira os tamanhos da cor selecionada no produto.');return;}
    const sizes=exact?exact.sizes:data.sizes;
    if(!sizes.length){line(exact?'Sem tamanhos com estoque confirmado nesta cor.':'Sem tamanhos com estoque confirmado.');return;}
    const description='Tamanhos com estoque: '+sizes.join(' · ');
    if(data.colors.length>1&&!exact){
      const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=description;details.appendChild(summary);
      const list=document.createElement('ul');
      data.colors.forEach(c=>{const li=document.createElement('li');li.textContent=c.name+': '+(c.sizes.length?c.sizes.join(' · '):'sem estoque confirmado');list.appendChild(li);});
      details.appendChild(list);area.appendChild(details);
      const note=document.createElement('small');note.textContent='Em pelo menos uma cor. Toque para conferir as cores.';area.appendChild(note);
    }else{line(description);if(exact||data.colors.length===1)line('Cor: '+(exact||data.colors[0]).name);}
    const note=document.createElement('small');note.textContent=data.multipleOptions?'Prévia por tamanho; confirme a combinação completa no produto.':'Prévia de disponibilidade; confirme tamanho e cor no produto.';area.appendChild(note);
  }
  function applyPreview(url,data){for(const record of cards.values())if(record.url===url)renderPreview(record,data);}
  function schedulePreviews(delay=30000){
    if(!pageActive||document.hidden||!cards.size)return;
    const remaining=[...previewCache.values()].map(c=>c.until-Date.now()).filter(ms=>ms>0);
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
    renderPreview(record,{status:'loading'});
    if(!queued.has(record.url)){queued.add(record.url);pending.push({url:record.url,id:record.id});}
    pumpPreviews();
  }
  function refreshPreviews(){
    for(const [card,record] of cards){
      if(!document.body.contains(card)){cards.delete(card);if(cardObserver)cardObserver.unobserve(card);continue;}
      const cached=previewCache.get(record.url);
      if(!cached||cached.until<=Date.now())renderPreview(record,{status:'unknown'});
      if(record.visible)requestPreview(record);
    }
    schedulePreviews();
  }
  async function readPreview(job){
    const epoch=generation,controller=new AbortController();controllers.add(controller);activeReads++;
    const timeout=window.setTimeout(()=>controller.abort(),8000);
    let data={status:'unknown'};
    try{
      const response=await fetch(job.url,{method:'GET',credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
      if(!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))throw new Error('Product unavailable');
      const html=await response.text();
      data=presentation.parseProductHTML(html,job.id);
    }catch(_){/* Failure is an explicit unknown preview, never invented stock. */}
    finally{
      window.clearTimeout(timeout);controllers.delete(controller);activeReads--;if(epoch===generation)queued.delete(job.url);
      if(epoch===generation&&pageActive&&!document.hidden){
        previewCache.delete(job.url);previewCache.set(job.url,{data,until:Date.now()+PREVIEW_TTL});
        while(previewCache.size>96)previewCache.delete(previewCache.keys().next().value);
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
      if(!imageLink||!url||!name||info.tagName==='A')continue;
      const overlay=document.createElement('span');overlay.className='bede-card-overlay';overlay.setAttribute('aria-hidden','true');
      const title=document.createElement('span');title.className='bede-card-overlay-name';title.textContent=name;overlay.appendChild(title);
      const cta=document.createElement('span');cta.className='bede-card-overlay-cta';cta.textContent='Ver produto';overlay.appendChild(cta);imageLink.appendChild(overlay);imageLink.classList.add('bede-card-image-link');
      const link=document.createElement('a');link.className='bede-card-product-link';link.href=url;link.textContent='Ver produto';link.setAttribute('aria-label','Ver produto: '+name);info.appendChild(link);
      const preview=document.createElement('div');preview.className='bede-card-preview';info.appendChild(preview);
      const record={card,url,id:card.getAttribute('data-product-id')||null,preview,visible:!cardObserver&&cards.size<24,signature:''};cards.set(card,record);card.classList.add('bede-card-ready');renderPreview(record,{status:'loading'});
      if(cardObserver)cardObserver.observe(card);else if(cards.size<=24&&!card.closest('[hidden]'))requestPreview(record);else renderPreview(record,{status:'unknown'});
      card.addEventListener('focusin',()=>{record.visible=true;requestPreview(record);});
      card.addEventListener('mouseenter',()=>{record.visible=true;requestPreview(record);},{passive:true});
    }
    schedulePreviews();
  }
  function pausePreviews(){
    generation++;window.clearTimeout(previewTimer);previewTimer=null;previewTimerAt=0;pending.length=0;queued.clear();previewCache.clear();
    controllers.forEach(controller=>controller.abort());
    // Clear stale availability before BFCache restore or returning to the tab.
    for(const record of cards.values())renderPreview(record,{status:'unknown'});
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
  function init(){
    numericSizes();productHelp();enhanceCards();shippingMessage();offersView();
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
