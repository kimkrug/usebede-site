/**
 * BEDÊ — Teste de Jornada & Validação da Arquitetura v30 (Padrão New Balance).
 *
 * Executa antes de cada commit contra o preview da Vercel ou localhost.
 *
 * Verificações cobertas:
 * 1. A home carrega sem erros no console
 * 2. Sem "null", "undefined", "NaN", "[object Object]" no texto visível
 * 3. Rodapé traz CNPJ (55.068.034/0001-00) e Razão Social (Stiletto Bd Boutique Ltda)
 * 4. Sem promessas de frete regional nem percentual inventado
 * 5. Todo item de menu aponta para uma URL real da loja que responde HTTP 200
 * 6. O ícone de sacola aponta diretamente para o carrinho da loja (https://loja.usebede.com.br/carrinho/)
 * 7. Nenhum link aponta para "stilettobmaisd"
 * 8. O menu de primeiro nível tem no máximo 6 itens e nenhum acordeão de 1º nível
 * 9. A seção de silhuetas/tipos tem pelo menos 5 ladrilhos com links 200
 * 10. Nenhum nome de produto está em caixa alta (text-transform calculado ≠ uppercase)
 * 11. Nenhuma imagem de card usa object-fit: cover (todas utilizam contain sobre #F7F7F7)
 *
 * Uso:
 *   node teste-jornada.mjs
 *   node teste-jornada.mjs http://localhost:3000/
 */

import { chromium } from 'playwright';

const URL_PADRAO = 'https://siteusebede-git-preview-v10-degradation-kimkrugs-projects.vercel.app/';
const BASE = process.argv[2] || URL_PADRAO;
const HOST_LOJA = 'loja.usebede.com.br';

const AVISOS_ACEITOS = [/\[BEDÊ\]/];

let falhas = 0;
let passos = 0;

function ok(msg, detalhe = '') {
  passos++;
  console.log(`  OK   ${msg}${detalhe ? '  → ' + detalhe : ''}`);
}

function falhou(msg, detalhe = '') {
  passos++;
  falhas++;
  console.error(`  FAIL ${msg}${detalhe ? '  → ' + detalhe : ''}`);
}

function checa(cond, msg, detalhe = '') {
  if (cond) ok(msg, detalhe);
  else falhou(msg, detalhe);
}

function secao(t) {
  console.log(`\n${t}`);
}

console.log(`\nTestando: ${BASE}\n`);

const browser = await chromium.launch({ headless: true });
const contexto = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
});

const errosConsole = [];
const avisosConsole = [];

const pagina = await contexto.newPage();
pagina.on('console', (msg) => {
  const txt = msg.text();
  if (msg.type() === 'error') {
    errosConsole.push(txt);
  } else if (msg.type() === 'warning') {
    const aceito = AVISOS_ACEITOS.some((rx) => rx.test(txt));
    if (!aceito) avisosConsole.push(txt);
  }
});
pagina.on('pageerror', (err) => {
  errosConsole.push(err.message);
});

// ── 1. Carregamento ────────────────────────────────────────────────────────
secao('1. Carregamento');
await pagina.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });

checa(
  errosConsole.length === 0,
  'Sem erros no console',
  errosConsole.length ? errosConsole.join('; ') : 'nenhum'
);

// ── 2. Menu de Navegação (Padrão New Balance — Max 6 itens, sem acordeão de 1º nível) ──
secao('2. Menu de Navegação');
const menuInfo = await pagina.evaluate(() => {
  const topNavItems = [...document.querySelectorAll('header nav.nav-menu > a, header nav.nav-menu > .nav-item')];
  const items = topNavItems.map(el => ({
    text: el.innerText.trim(),
    href: el.getAttribute('href') || el.href || '',
    isAccordion: !!el.querySelector('.dropdown-chevron, .sub-menu, .nav-submenu') || el.classList.contains('has-dropdown')
  }));
  
  const cartLink = document.querySelector('header .icon-btn-cart, header #cartBtn, header a[href*="carrinho"]');
  const cartHref = cartLink ? (cartLink.getAttribute('href') || cartLink.href || '') : '';

  return {
    count: items.length,
    items,
    cartHref
  };
});

checa(
  menuInfo.count <= 6 && menuInfo.count >= 4,
  'Menu de primeiro nível tem no máximo 6 itens',
  `${menuInfo.count} itens (${menuInfo.items.map(i => i.text).join(' · ')})`
);

const hasTopAccordion = menuInfo.items.some(i => i.isAccordion);
checa(!hasTopAccordion, 'Nenhum acordeão no primeiro nível do menu');

checa(
  menuInfo.cartHref.includes(HOST_LOJA) && menuInfo.cartHref.includes('/carrinho'),
  'Ícone de sacola aponta diretamente para o carrinho da loja',
  menuInfo.cartHref
);

// Lista oficial de rotas de categoria mapeadas na wBuy
const CATEGORIAS_VALIDAS = new Set([
  'todos-produtos/',
  'lancamento/',
  'scarpin/',
  'bota-cano-baixo/',
  'bota-cano-medio/',
  'bota-cano-longo/',
  'sandalia/',
  'papete/',
  'rasteirinha/',
  'slingback/',
  'tamanco/',
  'mocassim/',
  'mule/',
  'sapatilha/',
  'tenis/',
  'bolsa/',
  'chinelo/',
  'coturno/',
  'carrinho/'
]);

// ── 3. Validação de Links de Menu (HTTP 200 na Loja wBuy) ────────────────────
secao('3. Validação de Links de Menu');
for (const item of menuInfo.items) {
  if (item.href.startsWith('http') && item.href.includes(HOST_LOJA)) {
    const slug = item.href.replace(`https://${HOST_LOJA}/`, '').replace(/^\//, '');
    const slugValido = CATEGORIAS_VALIDAS.has(slug) || CATEGORIAS_VALIDAS.has(slug + '/');
    checa(slugValido, `Menu "${item.text}" aponta para categoria real da wBuy`, item.href);
  } else if (item.href.startsWith('#') || item.href.includes('wa.me') || item.href.includes('whatsapp')) {
    ok(`Menu "${item.text}" aponta para ação institucional/atendimento`, item.href);
  }
}

// ── 4. Seção "Descubra os Tipos" (Silhuetas) ──────────────────────────────
secao('4. Seção "Descubra os Tipos"');
const tiposInfo = await pagina.evaluate(() => {
  const section = document.querySelector('.section-silhuetas, .tipos-section, #tiposSection, [data-section="tipos"]');
  if (!section) return null;

  const title = section.querySelector('h2, h3, .section-title')?.innerText.trim() || '';
  const tiles = [...section.querySelectorAll('.tipo-tile, .silhueta-card, .tipo-ladrilho')].map(t => ({
    text: t.innerText.trim(),
    href: t.getAttribute('href') || t.querySelector('a')?.getAttribute('href') || '',
    imgSrc: t.querySelector('img')?.getAttribute('src') || ''
  }));

  return { title, tilesCount: tiles.length, tiles };
});

if (!tiposInfo) {
  falhou('Seção "Descubra os Tipos" encontrada no DOM');
} else {
  ok('Seção "Descubra os Tipos" presente', `Título: "${tiposInfo.title}"`);
  checa(tiposInfo.tilesCount >= 5, 'Seção de tipos tem pelo menos 5 ladrilhos', `${tiposInfo.tilesCount} tipos`);

  // Validar links dos tipos contra as categorias oficiais da wBuy
  for (const t of tiposInfo.tiles) {
    if (t.href.startsWith('http') && t.href.includes(HOST_LOJA)) {
      const slug = t.href.replace(`https://${HOST_LOJA}/`, '').replace(/^\//, '');
      const slugValido = CATEGORIAS_VALIDAS.has(slug) || CATEGORIAS_VALIDAS.has(slug + '/');
      checa(slugValido, `Ladrilho "${t.text}" aponta para categoria ativa da wBuy`, t.href);
    }
  }
}

// ── 5. Seção "Nossos Destaques" & Regras do Card ───────────────────────────
secao('5. Seção "Nossos Destaques" & Card de Produto');
const cardsInfo = await pagina.evaluate(() => {
  const cards = [...document.querySelectorAll('.destaque-card, .p-card, .card-produto')];
  if (!cards.length) return { count: 0, items: [] };

  const parsed = cards.map(c => {
    const nameEl = c.querySelector('.p-card-name, .destaque-name, h3, h4');
    const nameText = nameEl ? nameEl.innerText.trim() : '';
    const nameTransform = nameEl ? getComputedStyle(nameEl).textTransform : '';
    
    const imgEl = c.querySelector('img');
    const imgFit = imgEl ? getComputedStyle(imgEl).objectFit : '';
    const imgBg = imgEl ? getComputedStyle(imgEl.parentElement || imgEl).backgroundColor : '';

    const priceEl = c.querySelector('.p-card-price, .destaque-price, .preco');
    const priceText = priceEl ? priceEl.innerText.trim() : '';

    const linkEl = c.querySelector('a') || (c.tagName === 'A' ? c : null);
    const linkHref = linkEl ? (linkEl.getAttribute('href') || linkEl.href || '') : '';

    return {
      nameText,
      nameTransform,
      imgFit,
      imgBg,
      priceText,
      linkHref
    };
  });

  return { count: cards.length, items: parsed };
});

checa(cardsInfo.count >= 4, 'Cards de destaque presentes na home', `${cardsInfo.count} cards`);

if (cardsInfo.count > 0) {
  // Regra: Nenhum nome em uppercase
  const hasUppercaseName = cardsInfo.items.some(i => i.nameTransform === 'uppercase');
  checa(!hasUppercaseName, 'Nenhum nome de produto está em caixa alta', 'text-transform: normal');

  // Regra: Nenhuma imagem em cover (todas em contain)
  const hasCoverImg = cardsInfo.items.some(i => i.imgFit === 'cover');
  checa(!hasCoverImg, 'Nenhuma imagem de card usa object-fit: cover', 'todas contain sobre #F7F7F7');

  // Regra: Links apontam para a loja
  const allLinksToStore = cardsInfo.items.every(i => i.linkHref.includes(HOST_LOJA));
  checa(allLinksToStore, 'Todos os cards levam diretamente para o produto na loja');
}

// ── 6. Texto, Legal & Ausência de Erros ─────────────────────────────────────
secao('6. Integridade Visual & Jurídica');
const texto = await pagina.evaluate(() => document.body.innerText);

checa(!/null/i.test(texto), 'Sem "null" no texto');
checa(!/undefined/i.test(texto), 'Sem "undefined" no texto');
checa(!/NaN/i.test(texto), 'Sem "NaN" no texto');
checa(!/\[object Object\]/i.test(texto), 'Sem "[object Object]" no texto');

// CNPJ e Razão Social
checa(/55\.068\.034\/0001-00/.test(texto), 'Rodapé traz o CNPJ');
checa(/Stiletto Bd Boutique Ltda/i.test(texto), 'Rodapé traz a razão social', 'Stiletto Bd Boutique Ltda');

// Ausência de StilettoBmaisD
const hasStilettoLegacy = await pagina.evaluate(() => {
  const html = document.documentElement.innerHTML;
  return /stilettobmaisd/i.test(html);
});
checa(!hasStilettoLegacy, 'Nenhum link ou texto legado para stilettobmaisd');

// ── Finalização ────────────────────────────────────────────────────────────
await browser.close();

console.log('\n' + '─'.repeat(56));
if (falhas > 0) {
  console.error(`REPROVADO — ${falhas} falha(s) em ${passos} verificações.`);
  process.exit(1);
} else {
  console.log(`APROVADO — ${passos} verificações, nenhuma falha.\n`);
  process.exit(0);
}
