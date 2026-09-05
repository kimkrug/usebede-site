/* BEDÊ theme presentation only. Native product/cart/account/checkout remain authoritative. */
(function () {
  'use strict';
  if (window.__bedeStoreUI) return;
  window.__bedeStoreUI = true;
  const HOME = 'https://www.usebede.com.br';
  const STORE = 'https://loja.usebede.com.br';
  const model = window.BedeCatalog;
  const config = typeof CFG_LOJA !== 'undefined' ? CFG_LOJA : {};
  const offerState = { loading: false, lastAttemptAt: null, timer: null, validUntil: 0 };
  const categoryTerms = { scarpin:'Scarpin', sandalia:'Sandália', rasteirinha:'Rasteirinha', chinelo:'Chinelo',
    papete:'Papete', mocassim:'Mocassim', mule:'Mule', slingback:'Slingback', sapatilha:'Sapatilha', sapato:'Sapato',
    tamanco:'Tamanco', tenis:'Tênis', bota:'Bota', coturno:'Coturno', bolsa:'Bolsa', mochila:'Mochila', clutch:'Clutch', carteira:'Carteira' };
  const money = cents => (cents / 100).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
  const style = document.createElement('style');
  style.textContent = `
    .bede-category-access{display:flex;gap:10px;overflow:auto;overscroll-behavior-x:contain;padding:12px 0 18px;scrollbar-width:thin}
    .bede-category-access a{flex:0 0 auto;color:#14284a;border:1px solid #d9dce2;border-radius:2px;padding:10px 14px;font:500 12px Montserrat,sans-serif;text-decoration:none;min-height:40px}
    .bede-category-access a:hover,.bede-category-access a:focus-visible{background:#14284a;color:#fff}
    .bede-product-help{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0 20px;font:500 12px/1.6 Montserrat,sans-serif}
    .bede-product-help a{color:#14284a;text-decoration:underline;text-underline-offset:3px;padding:5px 0}
    .bede-shipping-progress{margin:14px 0;padding:14px;background:#f7f6f2;color:#14284a;border-left:2px solid #14284a;font:400 12px/1.65 Montserrat,sans-serif;text-align:left}
    .bede-shipping-progress strong{font-weight:600}.bede-shipping-progress p{margin:0 0 5px}.bede-shipping-progress small{display:block;font-size:11px;line-height:1.5}
    .bede-offers{color:#14284a;font-family:Montserrat,sans-serif}.bede-offers-intro{max-width:640px;line-height:1.7;margin:0 0 24px}
    .bede-offers-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px 16px}
    .bede-offer-card{color:inherit;text-decoration:none}.bede-offer-card img{display:block;width:100%;aspect-ratio:4/5;object-fit:contain;background:#fff}
    .bede-offer-card h2{font-size:12px;font-weight:500;line-height:1.65;margin:12px 0 8px}.bede-offer-card del{font-size:12px;color:#737782;margin-right:8px}.bede-offer-card strong{font-size:14px;font-weight:600}
    .bede-offers-empty{padding:44px 20px;text-align:center;background:#f7f6f2}.bede-offers-empty h2{font-size:23px;font-weight:400;margin-bottom:14px}.bede-offers-empty a{display:inline-block;margin-top:12px;padding:13px 20px;background:#14284a;color:white;text-decoration:none;font-size:12px}
    .bede-offers-native[hidden]{display:none!important}
    @media(max-width:767px){.bede-offers-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 10px}.bede-category-access{margin-right:-12px}.bede-offers-empty{padding:32px 16px}}
  `;
  document.head.appendChild(style);
  function numericSizes() {
    document.querySelectorAll('.js-product-variants-group').forEach(group => {
      const select = group.querySelector('select.js-variation-option');
      if (!select) return;
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
  function categoryAccess() {
    const heading=document.querySelector('h1');
    if(!heading || !document.querySelector('.js-product-table') || document.getElementById('bede-category-access') || !model) return;
    const nav=document.createElement('nav');nav.id='bede-category-access';nav.className='bede-category-access';nav.setAttribute('aria-label','Encontre por tipo de produto');
    const searches=model.CATEGORIES.filter(c=>categoryTerms[c.key]).flatMap(c=>c.key==='papete'?[['Papetes','Papete'],['Birkens','Birken']]:c.key==='mule'?[['Mules','Mule'],['Clogs','Clog']]:[[c.label,categoryTerms[c.key]]]);
    [['Todos',STORE+'/produtos/'],...searches.map(([label,term])=>[label,STORE+'/search/?q='+encodeURIComponent(term)]),['Ofertas',STORE+'/produtos/?bede_ofertas=1']].forEach(([label,url])=>{
      const a=document.createElement('a');a.href=url;a.textContent=label;nav.appendChild(a);
    });
    heading.insertAdjacentElement('afterend',nav);
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
      content.innerHTML=offers.map(p=>`<a class="bede-offer-card" href="${model.escapeHTML(p.url)}"><img src="${model.escapeHTML(p.image)}" alt="${model.escapeHTML(p.name)}" loading="lazy" width="480" height="600"><h2>${model.escapeHTML(p.name)}</h2><del>${model.escapeHTML(money(p.compareAtCents))}</del><strong>${p.priceRange?'A partir de ':''}${model.escapeHTML(money(p.priceCents))}</strong></a>`).join('');
    }catch(_){offerState.validUntil=0;empty('Não foi possível consultar as ofertas.','Tente novamente em instantes. O catálogo completo continua disponível.');}
    finally{offerState.loading=false;scheduleOffers(offerState.validUntil?Math.min(120000,offerState.validUntil-Date.now()):120000);}
  }
  function init(){
    numericSizes();productHelp();categoryAccess();shippingMessage();offersView();
    let shippingTimer=null;
    // Native AJAX can replace the subtotal node or create a drawer lazily.
    new MutationObserver(()=>{window.clearTimeout(shippingTimer);shippingTimer=window.setTimeout(shippingMessage,50);}).observe(document.body,{attributes:true,attributeFilter:['data-priceraw'],childList:true,subtree:true});
    window.addEventListener('pageshow',event=>{if(event.persisted){numericSizes();shippingMessage();offersView();}});
    window.addEventListener('pagehide',event=>{window.clearTimeout(offerState.timer);offerState.timer=null;if(event.persisted&&isOffersRoute())clearOffers();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){window.clearTimeout(offerState.timer);offerState.timer=null;}else offersView();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());
