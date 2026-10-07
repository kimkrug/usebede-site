'use strict';
// Presentation-only regression: no image processing, catalogue writes or network.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const home=fs.readFileSync(path.join(root,'style.css'),'utf8');
const store=fs.readFileSync(path.join(root,'store-enhancements.js'),'utf8');
function blocks(css,selector){return [...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m=>m[1].split(',').some(s=>s.trim()===selector)).map(m=>m[2]);}
test('home product frames have only white background and a pale-grey one-pixel outline',()=>{
  const frames=blocks(home,'.nb-card-img-wrap');
  assert.ok(frames.some(x=>/border:\s*1px solid #e9e9e9 !important/.test(x)));
  assert.ok(frames.some(x=>/box-sizing:\s*border-box/.test(x)));
  for(const frame of frames){
    for(const m of frame.matchAll(/background(?:-color)?:\s*([^;]+);/g))assert.match(m[1],/^#(?:fff|ffffff)$/);
    assert.doesNotMatch(frame,/border:\s*(?:none|0)\b/);
  }
});
test('native store and offer frames use the same white and grey-outline treatment',()=>{
  for(const selector of ['.product-item-image-container.item-image','.bede-offer-image-link']){
    const frame=blocks(store,selector).find(x=>/border:1px solid #e9e9e9!important/.test(x));
    assert.ok(frame,selector);assert.match(frame,/background:#fff!important/);assert.match(frame,/box-sizing:border-box/);
    assert.match(frame,/border-radius:0!important/);assert.match(frame,/box-shadow:none!important/);
  }
});
test('the photo surface has no second border or grey fill',()=>{
  for(const selector of ['.product-item-image-container img.product-item-image','.bede-offer-image-link img']){
    const image=blocks(store,selector).find(x=>/background:#fff!important/.test(x));
    assert.ok(image,selector);assert.match(image,/border:0!important/);assert.doesNotMatch(image,/filter:|mix-blend-mode:|opacity:|object-fit:\s*cover/);
  }
});
test('home keeps contained original photos and transparent arrows',()=>{
  assert.match(home,/\.home-rail-cues-ready \.nb-card-img-wrap img\s*\{[^}]*object-fit:\s*contain/);
  assert.match(home,/\.home-rail-cues \.home-rail-cue\s*\{[^}]*background:\s*transparent !important[^}]*border:\s*0 !important/);
});
