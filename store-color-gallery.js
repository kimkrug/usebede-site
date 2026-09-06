/* Audited image/color presentation. No edits to catalogue, stock or cart. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BedeColorGallery=api;})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  const MAP={'364500780':{axis:1,colors:{Dourada:['1266855344'],Prata:['1266899517']}}};
  function imageURL(value){try{const u=new URL(value,'https://loja.usebede.com.br');return u.protocol==='https:'&&/(^|\.)mitiendanube\.com$/.test(u.hostname)&&!u.username&&!u.password&&!u.port?u.href:null;}catch(_){return null;}}
  function verified(productId,variants,images){
    const rule=MAP[String(productId)];if(!rule||!Array.isArray(variants)||!variants.length||variants.length>500||!Array.isArray(images))return null;
    if(variants.some(v=>!v||String(v.product_id)!==String(productId)||!v.id||!v.sku)||new Set(variants.map(v=>String(v.id))).size!==variants.length||new Set(variants.map(v=>v.sku)).size!==variants.length)return null;
    const entries=Object.entries(rule.colors),expected=entries.flatMap(([,ids])=>ids),names=[...new Set(variants.map(v=>v['option'+rule.axis]))];
    if(images.length!==expected.length||new Set(images.map(i=>String(i.id))).size!==images.length||images.some(i=>!expected.includes(String(i.id))||!imageURL(i.url)))return null;
    if(names.length!==entries.length||names.some(n=>!Object.hasOwn(rule.colors,n))||variants.some(v=>!rule.colors[v['option'+rule.axis]].includes(String(v.image))))return null;
    return{axis:rule.axis,colors:entries.map(([name,ids])=>({name,soldOut:variants.filter(v=>v['option'+rule.axis]===name).every(v=>v.available===false),images:ids.map(id=>({id,url:imageURL(images.find(i=>String(i.id)===id).url)}))}))};
  }
  const CSS=`
    .bede-color-gallery{margin:0 0 18px;width:100%;background:#fff;color:#000}.bede-color-gallery>a{display:block}
    .bede-color-gallery>a>img{display:block;width:100%;height:min(70vh,760px);min-height:300px;object-fit:contain;object-position:center;background:#fff}
    .bede-color-gallery figcaption{text-align:center;font-size:11px;line-height:1.5;margin:10px 0}
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
    let figure=null,nav=null,key='',timer=null,failed=false;
    function read(){
      const group=form.querySelector('.js-product-variants-group[data-variation-id="'+MAP[id].axis+'"]'),select=group?.querySelector('select.js-variation-option');
      if(!select)return null;let variants;try{variants=JSON.parse(root.getAttribute('data-variants'));}catch(_){return null;}
      const images=Array.from(area.querySelectorAll('.js-swiper-product .js-product-slide[data-image]')).map(slide=>({id:slide.getAttribute('data-image'),url:slide.querySelector('a.js-product-slide-link')?.getAttribute('href')}));
      const model=verified(id,variants,images),chosen=model?.colors.find(color=>color.name===select.value);
      return chosen?{group,model,chosen}:null;
    }
    function restore(){figure?.remove();nav?.remove();figure=nav=null;key='';area.classList.remove('bede-original-color-gallery');}
    function update(){
      timer=null;if(failed)return;const state=read();if(!state){restore();return;}
      const next=JSON.stringify(state.model)+'|'+state.chosen.name;if(next===key)return;key=next;
      if(!figure){figure=doc.createElement('figure');figure.className='bede-color-gallery';area.insertAdjacentElement('beforebegin',figure);}
      figure.replaceChildren();
      const link=doc.createElement('a');link.href=state.chosen.images[0].url;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label','Ampliar foto — '+state.chosen.name);
      const image=doc.createElement('img');image.alt=(root.querySelector('h1')?.textContent?.trim()||'Produto')+' — '+state.chosen.name;image.decoding='async';
      image.onload=()=>{if(image.isConnected)area.classList.add('bede-original-color-gallery');};
      image.onerror=()=>{if(image.isConnected){failed=true;restore();}};image.src=state.chosen.images[0].url;link.appendChild(image);figure.appendChild(link);
      const caption=doc.createElement('figcaption');caption.textContent=state.chosen.name+' · toque na foto para ampliar';figure.appendChild(caption);
      if(!nav){
        nav=doc.createElement('section');nav.className='bede-colors-gallery-nav';nav.setAttribute('aria-label','Cores deste modelo');state.group.insertAdjacentElement('afterend',nav);
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
      }
      nav.querySelectorAll('button[data-color]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.color===state.chosen.name)));
    }
    function schedule(){if(timer===null&&!failed)timer=win.setTimeout(update,40);}
    const initial=read();if(!initial)return null;
    const style=doc.createElement('style');style.textContent=CSS;doc.head.appendChild(style);
    const observer=new win.MutationObserver(schedule);observer.observe(form,{subtree:true,childList:true});
    form.addEventListener('change',schedule);form.addEventListener('click',schedule);win.addEventListener('pageshow',schedule);
    win.__bedeColorGallery={refresh:schedule};update();return win.__bedeColorGallery;
  }
  return{verified,imageURL,start};
});
