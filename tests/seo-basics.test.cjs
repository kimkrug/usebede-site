'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const ORIGIN = 'https://www.usebede.com.br';
const PAGES = ['index.html', 'sobre.html', 'como-comprar.html', 'trocas.html', 'faq.html', 'privacidade.html', 'termos.html', 'guia-medidas.html'];
const canonicalFor = page => ORIGIN + (page === 'index.html' ? '/' : '/' + page);

test('seo: every editorial page declares exactly one absolute www canonical', () => {
  for (const page of PAGES) {
    const tags = read(page).match(/<link\s+rel="canonical"[^>]*>/g) || [];
    assert.equal(tags.length, 1, page);
    assert.match(tags[0], new RegExp('href="' + canonicalFor(page).replace(/[.]/g, '\\.') + '"'), page);
  }
});

test('seo: every editorial page has a non-empty meta description', () => {
  for (const page of PAGES) {
    const match = /<meta\s+name="description"\s+content="([^"]{40,170})">/.exec(read(page));
    assert.ok(match, page);
  }
});

test('seo: robots allows crawling, keeps the API out and points to the sitemap', () => {
  const robots = read('robots.txt');
  assert.match(robots, /^User-agent: \*$/m);
  assert.doesNotMatch(robots, /^Disallow:\s*\/\s*$/m, 'never block the whole site');
  assert.match(robots, /^Disallow: \/api\/$/m);
  assert.match(robots, new RegExp('^Sitemap: ' + ORIGIN.replace(/[.]/g, '\\.') + '/sitemap\\.xml$', 'm'));
});

test('seo: sitemap lists exactly the editorial pages that exist, never store URLs', () => {
  const xml = read('sitemap.xml');
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.deepEqual(urls.sort(), PAGES.map(canonicalFor).sort());
  assert.doesNotMatch(xml, /loja\.usebede/);
  assert.doesNotMatch(xml, /<lastmod>/, 'no invented dates');
});

test('seo: 404 page offers useful exits and is not indexed', () => {
  const html = read('404.html');
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /href="\/"/);
  assert.match(html, /href="https:\/\/loja\.usebede\.com\.br\/produtos\/"/);
  assert.match(html, /href="https:\/\/wa\.me\/5551996704954/);
  // Absolute asset paths: a 404 can be served at any depth.
  assert.doesNotMatch(html, /(?:href|src)="(?!\/|https:|#)[^"]+\.(?:css|svg|png|js)/);
});
