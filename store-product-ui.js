/* BEDÊ PDP presentation: native color controls and commerce remain authoritative. */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.BedeProductUI=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
  'use strict';
  const instances=new WeakMap();
  const isColorLabel=value=>/^(cor|cores|color|colour)$/.test(String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/:$/,'').trim());
  const css=`
    #single-product.bede-product-ui .js-product-name{color:#000;font-size:clamp(22px,2.2vw,30px);font-weight:600;line-height:1.18;letter-spacing:.015em;margin-bottom:14px!important;overflow-wrap:anywhere}
    #single-product.bede-product-ui #product_form{margin-top:24px!important}
    #single-product.bede-product-ui #product_form .js-product-variants-group{margin-bottom:20px!important;text-align:left!important}
    #single-product.bede-product-ui #product_form .form-label{color:#000;font-size:12px;font-weight:600;line-height:1.5;letter-spacing:.025em;text-align:left!important}
    #single-product.bede-product-ui .bede-color-name{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:auto!important;height:auto!important;min-width:44px;min-height:44px;max-width:100%;padding:10px 14px!important;margin:0 8px 8px 0!important;background:#fff!important;color:#000!important;border:1px solid #000!important;border-radius:0!important;white-space:normal;overflow-wrap:anywhere;vertical-align:top;text-decoration:none!important;font-size:12px;line-height:1.4;cursor:pointer}
    #single-product.bede-product-ui .bede-color-name .btn-variant-content{display:inline!important;width:auto!important;height:auto!important;min-width:0!important;padding:0!important;margin:0!important;background:none!important;border:0!important;border-radius:0!important;color:inherit!important;font:inherit!important;line-height:inherit!important}
    #single-product.bede-product-ui .bede-color-name.selected{background:#000!important;color:#fff!important}
    #single-product.bede-product-ui .bede-color-name:focus-visible{outline:2px solid #000;outline-offset:3px;box-shadow:0 0 0 3px #fff}
    #single-product.bede-product-ui .bede-color-name[aria-disabled="true"],#single-product.bede-product-ui .bede-color-name.disabled{opacity:.55;cursor:default}
    @media(max-width:767px){#single-product.bede-product-ui .js-product-name{font-size:22px;margin-bottom:12px!important}#single-product.bede-product-ui #product_form{margin-top:20px!important}#single-product.bede-product-ui .bede-color-name{padding:10px 12px!important}}
  `;
  function start(options={}){
    const win=options.window||root,doc=options.document||win.document;
    if(!doc||typeof doc.querySelectorAll!=='function')return null;
    if(instances.has(doc))return instances.get(doc);
    let product=null,form=null,observer=null,timer=null,stopped=false,ready=false,spaceTarget=null;
    const records=new Map(),listeners=[];
    const set=(node,name,value)=>{if(node.getAttribute(name)!==value)node.setAttribute(name,value);};
    const listen=(node,type,callback)=>{node.addEventListener(type,callback);listeners.push([node,type,callback]);};
    const enabled=anchor=>!anchor.hasAttribute('disabled')&&anchor.getAttribute('aria-disabled')!=='true'&&!anchor.classList.contains('disabled')&&!anchor.closest('[inert]');
    function target(event){
      const anchor=event.target?.closest?.('a.js-insta-variant[data-option]');
      return anchor&&records.has(anchor)&&product?.contains(anchor)?anchor:null;
    }
    function keydown(event){
      const anchor=target(event);if(!anchor||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||!enabled(anchor))return;
      if(event.key==='Enter'){
        // An anchor with href already receives exactly one native Enter click.
        if(anchor.hasAttribute('href'))return;
        event.preventDefault();if(!event.repeat)anchor.click();
      }else if(event.key===' '||event.key==='Spacebar'){
        event.preventDefault();if(!event.repeat)spaceTarget=anchor;
      }
    }
    function keyup(event){
      if(event.key!==' '&&event.key!=='Spacebar')return;
      const anchor=target(event),pending=spaceTarget;spaceTarget=null;
      if(!pending||anchor!==pending||event.defaultPrevented||!enabled(anchor)||event.altKey||event.ctrlKey||event.metaKey)return;
      event.preventDefault();anchor.click();
    }
    function refresh(){
      timer=null;if(stopped||!product||!form||!product.contains(form))return;
      for(const group of form.querySelectorAll('.js-product-variants-group')){
        const labels=Array.from(group.querySelectorAll('label'));
        if(!labels.some(label=>isColorLabel(label.textContent)))continue;
        const selects=group.querySelectorAll('select.js-variation-option'),axis=group.getAttribute('data-variation-id');
        if(selects.length!==1||!/^([0-2])$/.test(axis||'')||selects[0].getAttribute('name')!=='variation['+axis+']')continue;
        const values=Array.from(selects[0].options).map(option=>option.value);
        if(!values.length||new Set(values).size!==values.length)continue;
        const anchors=Array.from(group.querySelectorAll('a.js-insta-variant[data-option]')).filter(a=>a.closest('.js-product-variants-group')===group);
        if(!anchors.length||new Set(anchors.map(a=>a.getAttribute('data-option'))).size!==anchors.length)continue;
        if(anchors.some(a=>a.getAttribute('data-variation-id')!==axis||!values.includes(a.getAttribute('data-option'))||a.querySelectorAll('.btn-variant-content').length!==1))continue;
        for(const anchor of anchors){
          const value=anchor.getAttribute('data-option');if(!value||!value.trim())continue;
          const content=anchor.querySelector('.btn-variant-content');
          if(anchor.classList.contains('btn-variant-color'))anchor.classList.remove('btn-variant-color');
          if(!anchor.classList.contains('bede-color-name'))anchor.classList.add('bede-color-name');
          for(const property of Array.from(content.style)){if(/^(background|border)(-|$)/.test(property))content.style.removeProperty(property);}
          if(content.textContent!==value)content.textContent=value;
          if(!records.has(anchor)){
            const pressed=!anchor.hasAttribute('href')&&!anchor.hasAttribute('aria-pressed')&&(!anchor.hasAttribute('role')||anchor.getAttribute('role')==='button');
            records.set(anchor,{pressed});
            if(!anchor.hasAttribute('href')){if(!anchor.hasAttribute('role'))set(anchor,'role','button');if(!anchor.hasAttribute('tabindex'))set(anchor,'tabindex','0');}
          }
          if(records.get(anchor).pressed)set(anchor,'aria-pressed',anchor.classList.contains('selected')?'true':'false');
        }
      }
    }
    function schedule(){if(!stopped&&timer===null)timer=win.setTimeout(refresh,30);}
    function initialize(){
      if(stopped||ready)return;ready=true;
      const products=doc.querySelectorAll('#single-product');
      if(products.length!==1||products[0].getAttribute('data-store')!=='product-detail')return;
      product=products[0];const forms=product.querySelectorAll('form#product_form');if(forms.length!==1)return;form=forms[0];
      if(!doc.getElementById('bede-product-ui-style')){const style=doc.createElement('style');style.id='bede-product-ui-style';style.textContent=css;doc.head.appendChild(style);}
      product.classList.add('bede-product-ui');refresh();
      listen(product,'keydown',keydown);listen(product,'keyup',keyup);listen(product,'focusout',()=>{spaceTarget=null;});
      listen(form,'change',schedule);listen(product,'click',schedule);
      if(typeof win.MutationObserver==='function'){
        observer=new win.MutationObserver(records=>{if(records.some(r=>r.type==='childList'||r.target?.closest?.('a.js-insta-variant[data-option]')||r.target?.classList?.contains('js-product-variants-group')))schedule();});
        observer.observe(form,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','data-option','aria-disabled']});
      }
    }
    const controller={refresh:schedule,stop(){stopped=true;spaceTarget=null;win.clearTimeout(timer);observer?.disconnect();listeners.forEach(([node,type,fn])=>node.removeEventListener(type,fn));}};
    instances.set(doc,controller);
    if(doc.readyState==='loading')listen(doc,'DOMContentLoaded',initialize);else initialize();
    return controller;
  }
  return{start,isColorLabel};
});
