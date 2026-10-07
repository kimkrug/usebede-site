/* Auditoria de leitura pública. Não usa autenticação, eval ou endpoints administrativos. */
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const workspace = path.resolve(__dirname, '../..');
const outputDir = path.join(workspace, 'outputs/catalogo-revisao');
const sourceFile = path.join(outputDir, 'catalogo-publico-atual.json');
const historicalFile = path.join(outputDir, 'catalogo-revisao-2026-09-04.json');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const unique = values => [...new Set(values)];
const decode = value => String(value || '').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n))).replace(/&(amp|quot|apos|lt|gt|nbsp);/g, (_, n) => ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' })[n]);
const text = value => decode(String(value || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

function attrs(tag) {
  const result = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4]);
  return result;
}

function scanJSONArray(source, start) {
  assert.equal(source[start], '[', 'Literal deve começar com colchete');
  let depth = 0, inString = false, escaped = false;
  for (let index = start; index < source.length; index++) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '[' || char === '{') depth++;
    else if (char === ']' || char === '}') {
      depth--;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error('Literal LS.variants sem fechamento');
}

function publicVariants(html) {
  const assignment = /\bLS\.variants\s*=\s*/g.exec(html);
  if (!assignment) throw new Error('Literal público LS.variants não encontrado');
  const raw = scanJSONArray(html, assignment.index + assignment[0].length);
  const parsed = JSON.parse(raw);
  assert(Array.isArray(parsed), 'LS.variants não é uma lista JSON');
  return { variants: parsed, literalSha256: sha256(raw) };
}

function elementBlock(html, start, tagName) {
  const token = /<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi;
  token.lastIndex = start;
  let depth = 0, match;
  while ((match = token.exec(html))) {
    if (match[1].toLowerCase() !== tagName.toLowerCase()) continue;
    if (match[0].startsWith('</')) depth--;
    else if (!match[0].endsWith('/>')) depth++;
    if (depth === 0) return html.slice(start, token.lastIndex);
  }
  return '';
}

function optionGroups(html) {
  const result = [];
  for (const match of html.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*>/gi)) {
    const properties = attrs(match[0]);
    if (!(properties.class || '').split(/\s+/).includes('js-product-variants-group')) continue;
    const block = elementBlock(html, match.index, match[1]);
    const label = text(/<label\b[^>]*>([\s\S]*?)<\/label>/i.exec(block)?.[1] || '');
    const select = /<select\b([^>]*)>([\s\S]*?)<\/select>/i.exec(block);
    const options = select ? [...select[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map(item => {
      const properties = attrs(item[1]);
      return { value: properties.value ?? text(item[2]), label: text(item[2]), selected: /\bselected(?:\s|=|$)/i.test(item[1]), disabled: /\bdisabled(?:\s|=|$)/i.test(item[1]) };
    }) : [];
    result.push({ variationId: properties['data-variation-id'] ?? null, name: label.replace(/\s*:\s*$/, ''), selectId: select ? attrs(select[1]).id ?? null : null, nativeOptions: options });
  }
  return result.filter((group, index) => result.findIndex(other => other.variationId === group.variationId && other.selectId === group.selectId) === index);
}

function imageURL(value, pageURL) {
  if (!value || /^(?:data|javascript):/i.test(value)) return null;
  try {
    const url = new URL(decode(value), pageURL);
    if (url.protocol !== 'https:' || !/\.(?:webp|png|jpe?g|avif)(?:$|\?)/i.test(url.pathname + url.search)) return null;
    return url.href;
  } catch { return null; }
}

function galleryImages(html, pageURL) {
  const images = new Map();
  for (const match of html.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*>/gi)) {
    const properties = attrs(match[0]);
    const imageId = properties['data-image-id'] ?? properties['data-image'] ?? properties['data-image_id'];
    if (!/^\d+$/.test(imageId || '')) continue;
    let url = imageURL(properties['data-src'] || properties.src || properties.href, pageURL);
    if (!url && !['img', 'input', 'source'].includes(match[1].toLowerCase())) {
      const block = elementBlock(html, match.index, match[1]);
      for (const nested of block.matchAll(/<(?:img|a|source)\b[^>]*>/gi)) {
        const image = attrs(nested[0]);
        url = imageURL(image['data-src'] || image.src || image.href, pageURL);
        if (url) break;
      }
    }
    if (url && !images.has(String(imageId))) images.set(String(imageId), url);
  }
  return images;
}

function parsePage(html, product) {
  const publicData = publicVariants(html);
  const groups = optionGroups(html);
  const images = galleryImages(html, product.url);
  const variants = publicData.variants.map(variant => {
    const values = Array.isArray(variant.options) ? variant.options : [variant.option0, variant.option1, variant.option2];
    const options = values.map((value, index) => ({ index, name: groups.find(group => String(group.variationId) === String(index))?.name || null, value: value == null ? null : String(value) })).filter(option => option.value !== null && option.value !== '');
    // A PDP real da Nuvemshop usa `image`; normalizamos para image_id no relatório.
    const rawImageId = variant.image_id ?? variant.image;
    const imageId = rawImageId == null || rawImageId === '' ? null : String(rawImageId);
    return {
      id: variant.id == null ? null : String(variant.id),
      sku: variant.sku == null ? null : String(variant.sku),
      options,
      image_id: imageId,
      image_url: imageURL(variant.image_url, product.url) || (imageId ? images.get(imageId) || null : null),
      available: typeof variant.available === 'boolean' ? variant.available : null
    };
  });
  const colorGroup = groups.find(group => /^(?:cor|cores|color|colour)$/i.test(group.name));
  const colorIndex = colorGroup ? Number(colorGroup.variationId) : null;
  const colors = colorGroup ? unique(variants.flatMap(variant => variant.options.filter(option => option.index === colorIndex).map(option => option.value))) : [];
  const imageIds = unique(variants.map(variant => variant.image_id).filter(Boolean));
  const sameImageAcrossColors = colors.length > 1 && imageIds.length === 1 && variants.every(variant => variant.image_id !== null);
  const sizeGroups = groups.filter(group => /tamanho|numera|talla|size/i.test(group.name)).map(group => {
    const order = unique(group.nativeOptions.filter(option => option.value !== '').map(option => option.value));
    const allNumeric = order.length > 1 && order.every(value => /^\d+(?:[.,]\d+)?$/.test(value));
    const sorted = allNumeric ? [...order].sort((a, b) => Number(a.replace(',', '.')) - Number(b.replace(',', '.'))) : null;
    return { name: group.name, variationId: group.variationId, order, numericAscending: allNumeric ? order.every((value, index) => value === sorted[index]) : null, expectedNumericOrder: sorted };
  });
  return {
    handle: product.id, name: product.name, url: product.url,
    productListingImage: product.image || null,
    listingAvailable: product.available,
    literalSha256: publicData.literalSha256,
    variantCount: variants.length,
    optionGroups: groups,
    sizeGroups,
    galleryImages: [...images].map(([image_id, image_url]) => ({ image_id, image_url })),
    colors,
    variants,
    review: {
      multiColorSameImageId: sameImageAcrossColors,
      sameImageId: sameImageAcrossColors ? imageIds[0] : null,
      variantImageIdAbsent: variants.filter(variant => !variant.image_id).length,
      variantImageURLUnresolved: variants.filter(variant => variant.image_id && !variant.image_url).length,
      nativeSizeOrderNotAscending: sizeGroups.some(group => group.numericAscending === false),
      note: 'Um mesmo image_id em várias cores solicita revisão visual; não comprova foto errada. URL não resolvida pelo parser não comprova ausência de imagem na loja.'
    }
  };
}

function selfTest() {
  const raw = '[{"x": "colchete ] e aspas \\\"", "array": [1, 2]}]';
  assert.deepEqual(JSON.parse(scanJSONArray(raw + ';ignored()', 0)), JSON.parse(raw));
  assert.throws(() => publicVariants('LS.variants = [window.evil()];'));
  const html = '<div class="js-product-variants-group" data-variation-id="0"><label>Tamanho:</label><div><select id="variation_0"><option value="38">38</option><option value="34">34</option></select></div></div><div class="js-product-variants-group" data-variation-id="1"><label>Cor:</label><select id="variation_1"><option value="Preto">Preto</option><option value="Marrom">Marrom</option></select></div><a data-image="99"><img data-src="https://example.com/photo.webp"></a><script>LS.variants = [{"id":1,"sku":"a","option0":"38","option1":"Preto","image_id":99},{"id":2,"sku":"b","option0":"34","option1":"Marrom","image_id":99}];</script>';
  const parsed = parsePage(html, { id: 'fixture', name: 'Fixture', url: 'https://loja.usebede.com.br/produtos/fixture/' });
  assert.equal(parsed.variantCount, 2);
  assert.equal(parsed.review.multiColorSameImageId, true);
  assert.equal(parsed.review.nativeSizeOrderNotAscending, true);
  assert.equal(parsed.variants[0].image_url, 'https://example.com/photo.webp');
  assert.equal(parsed.review.variantImageURLUnresolved, 0);
  console.log('Parser: testes offline passaram; nenhum JavaScript da página foi executado.');
}

async function main() {
  if (process.argv.includes('--self-test')) { selfTest(); return; }
  if (process.argv.includes('--sample')) {
    const file = process.argv[process.argv.indexOf('--sample') + 1];
    const html = await fs.readFile(path.resolve(file), 'utf8');
    const data = parsePage(html, { id: 'scarpin-martta-medio', name: 'SCARPIN MARTTA MÉDIO', url: 'https://loja.usebede.com.br/produtos/scarpin-martta-medio/' });
    console.log(JSON.stringify(data, null, 2)); return;
  }
  const source = await fs.readFile(sourceFile);
  const listing = JSON.parse(source);
  assert.equal(listing.products.length, 204, 'Escopo autorizado deve conter exatamente 204 produtos');
  assert.equal(new Set(listing.products.map(product => product.url)).size, 204, 'URLs duplicadas');
  for (const product of listing.products) {
    const url = new URL(product.url);
    assert.equal(url.origin, 'https://loja.usebede.com.br');
    assert(/^\/produtos\/[^/]+\/$/.test(url.pathname) && !url.search && !url.hash, 'URL fora das PDPs públicas autorizadas');
  }
  const startedAt = new Date().toISOString();
  let cursor = 0, completed = 0;
  const results = new Array(listing.products.length);
  async function worker() {
    while (cursor < listing.products.length) {
      const index = cursor++, product = listing.products[index];
      const captureStartedAt = new Date().toISOString();
      try {
        const response = await fetch(product.url, { signal: AbortSignal.timeout(8000), redirect: 'error', headers: { Accept: 'text/html' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length > 8 * 1024 * 1024) throw new Error('HTML excede limite de 8 MiB');
        results[index] = { status: 'ok', captureStartedAt, capturedAt: new Date().toISOString(), htmlSha256: sha256(bytes), htmlBytes: bytes.length, ...parsePage(bytes.toString('utf8'), product) };
      } catch (error) {
        results[index] = { status: 'error', handle: product.id, name: product.name, url: product.url, captureStartedAt, capturedAt: new Date().toISOString(), error: `${error.name}: ${error.message}${error.cause?.code ? ` (${error.cause.code})` : ''}` };
      }
      completed++;
      if (completed % 25 === 0 || completed === listing.products.length) console.log(`Leitura pública: ${completed}/${listing.products.length}`);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  const successful = results.filter(result => result.status === 'ok');
  const variants = successful.flatMap(result => result.variants);
  const historicalBytes = await fs.readFile(historicalFile);
  const history = JSON.parse(historicalBytes);
  const ambiguous = history.produtos.filter(product => product.ambiguidadesDeNome?.length).map(product => {
    const current = successful.find(result => result.handle === product.handle);
    return { handle: product.handle, name: product.nome, historicalReasons: product.ambiguidadesDeNome, historicalCategory: product.categoriaHiper, url: current?.url || null, currentPublicRead: !!current, colors: current?.colors || [], review: current?.review || null };
  });
  const photoReview = successful.filter(result => result.review.multiColorSameImageId || result.review.variantImageIdAbsent || result.review.variantImageURLUnresolved || ambiguous.some(item => item.handle === result.handle)).map(result => ({
    handle: result.handle, name: result.name, url: result.url, listingAvailable: result.listingAvailable, colors: result.colors, galleryImages: result.galleryImages, ...result.review,
    ambiguousName: ambiguous.some(item => item.handle === result.handle),
    priorityScore: (result.listingAvailable ? 1 : 0) + (result.review.multiColorSameImageId ? 4 : 0) + (result.review.variantImageIdAbsent ? 3 : 0) + (result.review.variantImageURLUnresolved ? 2 : 0) + (ambiguous.some(item => item.handle === result.handle) ? 2 : 0)
  })).sort((a, b) => b.priorityScore - a.priorityScore || a.name.localeCompare(b.name, 'pt-BR'));
  const report = {
    startedAt, completedAt: new Date().toISOString(),
    source: { path: path.relative(workspace, sourceFile), sha256: sha256(source), listingStartedAt: listing.startedAt, listingFetchedAt: listing.fetchedAt },
    historicalAmbiguitySource: { path: path.relative(workspace, historicalFile), sha256: sha256(historicalBytes), generatedAt: history.geradoEm || null },
    method: { concurrency: 3, timeoutMs: 8000, retries: 0, authentication: false, writesToPlatforms: false, parser: 'HTML público + literal LS.variants por scanner balanceado e JSON.parse, sem eval', redirects: 'error' },
    limitations: [
      'Captura sequencial concorrente, não snapshot atômico nem leitura de administração.',
      'image_id repetido entre cores é indício para revisão visual, não diagnóstico de foto errada.',
      'image_url não resolvida é limitação da associação no HTML; não significa que a PDP esteja sem foto.',
      'Ordem de tamanhos refere-se às opções dos selects nativos presentes no HTML desta captura; não prova ordem visual modificada por JavaScript.',
      'Disponibilidade é a declaração pública; não foi confrontada com estoque físico ou checkout.',
      'A lista de 12 nomes ambíguos vem de relatório histórico identificado, não de reconhecimento visual automático.'
    ],
    totals: { productsRequested: 204, productsRead: successful.length, productsFailed: results.length - successful.length, variantsRead: variants.length, uniqueSKUs: new Set(variants.map(variant => variant.sku).filter(Boolean)).size, variantsMissingSKU: variants.filter(variant => !variant.sku).length, multiColorProducts: successful.filter(result => result.colors.length > 1).length, multiColorSameImageIdProducts: successful.filter(result => result.review.multiColorSameImageId).length, variantImageIdAbsent: variants.filter(variant => !variant.image_id).length, variantImageURLUnresolved: variants.filter(variant => variant.image_id && !variant.image_url).length, productsNativeSizeOrderNotAscending: successful.filter(result => result.review.nativeSizeOrderNotAscending).length, ambiguousNames: ambiguous.length },
    products: results, ambiguousNames: ambiguous, photoReview
  };
  const serialized = JSON.stringify(report, null, 2) + '\n';
  const stamp = report.completedAt.replace(/[:.]/g, '-');
  const jsonName = `AUDITORIA_VARIACOES_PUBLICAS_${stamp}.json`;
  const txtName = `RESUMO_VARIACOES_PUBLICAS_${stamp}.txt`;
  const lines = [
    'BEDÊ — AUDITORIA DE VARIAÇÕES E IMAGENS PÚBLICAS', `Início UTC: ${startedAt}`, `Conclusão UTC: ${report.completedAt}`, `Fonte: ${report.source.path}`, `SHA-256 da fonte: ${report.source.sha256}`, `Fonte histórica dos nomes: ${report.historicalAmbiguitySource.path}`, `SHA-256 histórico: ${report.historicalAmbiguitySource.sha256}`, `Dados JSON: ${jsonName}`, `SHA-256 do JSON: ${sha256(serialized)}`, '',
    'SOMENTE LEITURA PÚBLICA. Nenhum cadastro, preço, estoque ou imagem foi alterado.', '', 'TOTAIS', ...Object.entries(report.totals).map(([key, value]) => `${key}: ${value}`), '',
    'LIMITES', ...report.limitations.map(item => `- ${item}`), '', '12 NOMES PARA CONFERÊNCIA DE CLASSIFICAÇÃO E FOTO', ...ambiguous.map(item => `${item.name} | ${item.url || item.handle} | origem histórica: ${item.historicalCategory || 'sem classificação'} | ${item.historicalReasons.join('; ')}`), '',
    'FILA DE REVISÃO VISUAL (PRIORIDADE HEURÍSTICA; NÃO É VEREDITO DE FOTO ERRADA)', ...photoReview.map((item, index) => `${index + 1}. ${item.name} | ${item.url} | cores: ${item.colors.join(', ') || 'não medidas'} | mesma imagem em cores: ${item.multiColorSameImageId ? 'sim — revisar' : 'não sinalizado'} | IDs ausentes: ${item.variantImageIdAbsent} | URLs não resolvidas: ${item.variantImageURLUnresolved} | nome ambíguo: ${item.ambiguousName ? 'sim' : 'não'}`), '',
    'FALHAS DE CAPTURA/PARSER', ...results.filter(result => result.status === 'error').map(item => `${item.name} | ${item.url} | ${item.error}`)
  ];
  await fs.writeFile(path.join(outputDir, jsonName), serialized, { flag: 'wx' });
  await fs.writeFile(path.join(outputDir, txtName), lines.join('\n') + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ json: path.join(outputDir, jsonName), txt: path.join(outputDir, txtName), sha256: sha256(serialized), totals: report.totals }, null, 2));
  if (report.totals.productsFailed) process.exitCode = 2;
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { scanJSONArray, publicVariants, optionGroups, galleryImages, parsePage };
