'use strict';
// Source contracts only: these checks do not replace viewport/overflow browser QA.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.resolve(__dirname, '..', name), 'utf8');
const css = read('style.css');
const html = read('index.html');
const app = read('home-app.js');
const store = read('store-enhancements.js');
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function rules(source, selector) {
  return [...source.matchAll(new RegExp(escape(selector) + '\\s*\\{([^{}]*)\\}', 'g'))].map(match => match[1]);
}
function lastRule(source, selector) {
  const found = rules(source, selector);
  assert.ok(found.length, 'Missing CSS selector: ' + selector);
  return Object.fromEntries(found.at(-1).split(';').filter(part => part.trim()).map(part => {
    const split = part.indexOf(':');
    return [part.slice(0, split).trim(), part.slice(split + 1).trim()];
  }));
}
function includesProperties(actual, expected) {
  for (const [property, value] of Object.entries(expected)) assert.equal(actual[property], value, property);
}

test('source: sale CTA keeps its scoped 24px top spacing', () => {
  assert.match(html, /id="slideSaleBtn"/);
  includesProperties(lastRule(css, '#slideSaleBtn'), { 'margin-top': '24px' });
});

test('source: skeleton spans reserve block image and text space without fake products', () => {
  assert.match(app, /const placeholders = document\.createElement\('div'\); placeholders\.className = 'home-catalog-skeletons'; placeholders\.setAttribute\('aria-hidden', 'true'\)/);
  assert.match(app, /for \(const className of \['home-catalog-skeleton-image', 'home-catalog-skeleton-line', 'home-catalog-skeleton-line home-catalog-skeleton-line-short'\]\)\s*\{\s*const shape = document\.createElement\('span'\); shape\.className = className; card\.appendChild\(shape\);/);
  includesProperties(lastRule(css, '.home-catalog-skeleton-image'), { display: 'block', width: '100%', 'aspect-ratio': '1' });
  includesProperties(lastRule(css, '.home-catalog-skeleton-line'), { display: 'block', height: '10px', width: '72%' });
  includesProperties(lastRule(css, '.home-catalog-skeleton-line-short'), { width: '32%' });
  const loop = app.match(/for \(let i = 0; i < 4; i\+\+\)\s*\{([\s\S]*?)placeholders\.appendChild\(card\);/);
  assert.ok(loop);
  assert.doesNotMatch(loop[1], /createElement\(['"](?:img|a|button)['"]\)|price|sku|href|src\s*=/i);
});

test('source: footer uses an auto spacer without shrinking content and retains vertical overflow access', () => {
  assert.match(html, /<section class="v-slide site-footer-slide"[^>]*>\s*<footer class="clean-footer-bottom site-footer"/);
  assert.ok(rules(css, '.site-footer-slide').some(rule => /display:\s*flex\s*;/.test(rule) && /flex-direction:\s*column\s*;/.test(rule)));
  includesProperties(lastRule(css, '.site-footer-slide'), {
    'justify-content': 'flex-start', 'padding-bottom': 'max(24px, env(safe-area-inset-bottom))'
  });
  includesProperties(lastRule(css, '.site-footer-slide .clean-footer-bottom'), { 'margin-top': 'auto', 'flex-shrink': '0' });
  assert.ok(rules(css, '.clean-footer-bottom').some(rule => /overflow:\s*visible\s*;/.test(rule)));
  // The inline slide rule deliberately overrides the older stylesheet overflow:hidden.
  assert.match(app, /slides\.forEach\(slide => \{ slide\.style\.overflowY = 'auto'; slide\.style\.overscrollBehaviorY = 'contain'; \}\)/);
  assert.match(app, /if \(\/\(auto\|scroll\)\/\.test\(style\.overflowY\) && element\.scrollHeight > element\.clientHeight \+ 2\)/);
});

test('source: floating WhatsApp keeps native contact link and a padded, closed silhouette', () => {
  const floating = html.match(/<a\b[^>]*class="whatsapp-float-btn"[^>]*>([\s\S]*?)<\/a>/);
  assert.ok(floating);
  assert.match(floating[0], /href="https:\/\/wa\.me\/5551996704954\?/);
  assert.match(floating[0], /aria-label="Falar com a BEDÊ no WhatsApp"/);
  assert.match(floating[1], /<svg viewBox="-1 -1 26 26" aria-hidden="true" focusable="false">/);
  const paths = [...floating[1].matchAll(/<path\b([^>]*?)\bd="([^"]+)"[^>]*\/>/g)];
  assert.equal(paths.length, 2, 'Closed backdrop and original interior glyph stay separate');
  assert.match(paths[0][1], /class="bede-whatsapp-outline"/);
  assert.match(paths[0][2], /^M\.057 24/);
  assert.match(paths[0][2], /z$/i);
  assert.match(paths[1][2], /z$/i);
  assert.notEqual(paths[0][2], paths[1][2]);
  assert.equal((html.match(/class="bede-whatsapp-outline"/g) || []).length, 1);
});

test('source: WhatsApp black outline is scoped to its silhouette, not all SVG glyphs', () => {
  includesProperties(lastRule(css, '.whatsapp-float-btn'), { background: 'transparent', border: '0', 'border-radius': '0', 'box-shadow': 'none' });
  includesProperties(lastRule(css, '.whatsapp-float-btn svg'), { width: '100%', height: '100%', fill: '#fff', stroke: 'none' });
  includesProperties(lastRule(css, '.whatsapp-float-btn .bede-whatsapp-outline'), { fill: '#000', stroke: '#000', 'stroke-width': '.8', 'stroke-linejoin': 'round' });
  assert.equal(rules(css, '.whatsapp-float-btn .bede-whatsapp-outline').length, 1);
});

test('source: cart badge sizing is header-only, white-on-black, and allows multidigit width', () => {
  const embedded = store.match(/style\.textContent = `([\s\S]*?)`;/);
  assert.ok(embedded);
  const cartSelectors = [...embedded[1].matchAll(/([^{}]+)\{[^{}]*\}/g)]
    .map(match => match[1].replace(/\/\*[\s\S]*?\*\//g, '').trim())
    .filter(selector => /ajax-cart|js-cart-widget-amount/.test(selector));
  assert.deepEqual(cartSelectors, ['header #ajax-cart>a', 'header #ajax-cart .js-cart-widget-amount.badge']);
  includesProperties(lastRule(embedded[1], 'header #ajax-cart>a'), { 'min-width': '44px', 'min-height': '44px', overflow: 'visible' });
  includesProperties(lastRule(embedded[1], 'header #ajax-cart .js-cart-widget-amount.badge'), {
    'min-width': '20px', width: 'auto', height: '20px', 'min-height': '20px',
    padding: '0 5px!important', background: '#000!important', color: '#fff!important', 'white-space': 'nowrap'
  });
  assert.doesNotMatch(rules(embedded[1], 'header #ajax-cart .js-cart-widget-amount.badge')[0], /(?:^|;)\s*content\s*:/);
  assert.doesNotMatch(store.replace(embedded[0], ''), /ajax-cart|js-cart-widget-amount/, 'Runtime must not select or overwrite the native counter');
});

test('source: rail cues override legacy mobile hiding while hidden buttons and groups stay hidden', () => {
  const button = lastRule(css, '.home-rail-cues .home-rail-cue');
  assert.match(button.display, /^inline-flex\s*!important$/);
  includesProperties(button, { position: 'static', width: '44px', height: '44px', background: 'transparent !important', border: '0 !important', 'border-radius': '0 !important', 'pointer-events': 'auto' });
  includesProperties(lastRule(css, '.home-rail-cues'), { position: 'absolute', left: 'var(--home-cue-x, 0px)', top: 'var(--home-cue-y, 0px)', transform: 'translate(-50%, -50%)', 'pointer-events': 'none' });
  includesProperties(lastRule(css, '.home-rail-cues .home-rail-cue:hover'), { background: 'transparent !important', border: '0 !important' });
  assert.match(lastRule(css, '.home-rail-cues[hidden]').display, /^none\s*!important$/);
  assert.match(lastRule(css, '.home-rail-cues .home-rail-cue[hidden]').display, /^none\s*!important$/);
  // The explicit [hidden] selector has greater specificity than the visible cue.
  // Keeping it after the visible rule also prevents an accidental later equal-scope reset.
  assert.ok(css.lastIndexOf('.home-rail-cues .home-rail-cue[hidden]') > css.lastIndexOf('.home-rail-cues .home-rail-cue {'));
});

test('source: every home rail has a white square photo area, pale-grey outline and empty gutters, without changing source RGB', () => {
  assert.ok(rules(css, '.nb-card-img-wrap').some(rule => /aspect-ratio:\s*1;/.test(rule) && /background:\s*#ffffff;/.test(rule)));
  assert.ok(rules(css, '.nb-card-img-wrap').some(rule => /border:\s*1px solid #e9e9e9 !important;/.test(rule)));
  includesProperties(lastRule(css, '.nb-rail-wrapper.home-rail-cues-ready'), { '--home-cue-size': '44px' });
  includesProperties(lastRule(css, '.home-rail-cues-ready .nb-card-img-wrap'), { 'padding-inline': 'var(--home-cue-size)' });
  includesProperties(lastRule(css, '.home-rail-cues-ready .nb-card-img-wrap img'), { 'max-width': '100%', 'max-height': '100%', 'object-fit': 'contain' });
  includesProperties(lastRule(css, '.home-rail-cues-ready .nb-card:hover'), { opacity: '1' });
  // The more specific mobile Types selector must not override horizontal gutters.
  assert.equal(lastRule(css, '#tiposRail .nb-card-img-wrap')['padding-block'], '10px');
  assert.equal(lastRule(css, '#tiposRail .nb-card-img-wrap').padding, undefined);
  const photoRules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(match => /nb-card-img-wrap/.test(match[1])).map(match => match[2]).join('\n');
  assert.doesNotMatch(photoRules, /(?:mix-blend-mode|filter|opacity|visibility)\s*:/);
  assert.doesNotMatch(photoRules, /object-fit:\s*cover|display:\s*none/);
});
