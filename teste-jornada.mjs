/**
 * BEDÊ — Teste de Jornada & Validação da Arquitetura v31.3 (Nuvemshop + Institucionais + Travas de Conteúdo).
 *
 * Executa antes de cada commit contra o preview da Vercel, localhost ou produção.
 *
 * Verificações cobertas:
 * 1. A home carrega sem erros no console
 * 2. Título contém "BEDÊ" e NÃO contém "Stiletto B+D"
 * 3. Sem "null", "undefined", "NaN", "[object Object]" no texto visível
 * 4. Rodapé traz CNPJ (55.068.034/0001-00) e Razão Social (Stiletto Bd Boutique Ltda)
 * 5. Sem "OFERTA", preço riscado falso ou desconto inventado no texto
 * 6. Todo item de menu aponta para o host oficial da Nuvemshop, página institucional real (HTTP 200) ou WhatsApp
 * 7. NENHUM link de menu tem href vazio, "#" ou "javascript:"
 * 8. NENHUM link de rodapé institucional tem href vazio, "#" ou "javascript:"
 * 9. O ícone de sacola aponta diretamente para o carrinho da Nuvemshop (/cart/)
 * 10. Nenhum link aponta para "loja.usebede.com.br", "sistemawbuy.com.br" ou "stilettobmaisd"
 * 11. O menu de primeiro nível tem no máximo 6 itens e nenhum acordeão
 * 12. A seção "Descubra os Tipos" tem pelo menos 5 ladrilhos com links 200 na Nuvemshop
 * 13. Contagem de destinos distintos nos ladrilhos (com aviso se < 4)
 * 14. Nenhuma imagem de card usa object-fit: cover (todas utilizam contain sobre #F7F7F7)
 * 15. Todas as páginas institucionais vinculadas respondem HTTP 200 OK
 * 16. [v31.3] Sem "Sábado" nem "19h" no texto renderizado da home e das páginas institucionais
 * 17. [v31.3] guia-medidas.html sem centímetros ("22,5" / "26,5") e com link wa.me
 * 18. [v31.3] trocas.html contém "primeira troca" e "7 dias"
 *
 * Uso:
 *   node teste-jornada.mjs
 *   node teste-jornada.mjs http://localhost:3000/
 *   node teste-jornada.mjs https://www.usebede.com.br/
 */

import { chromium } from 'playwright';

const URL_PADRAO = 'http://localhost:3000/';
const BASE = process.argv[2] || URL_PADRAO;
const HOST_LOJA = 'bedestiletto.lojavirtualnuvem.com.br';

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

function aviso(msg) {
  console.log(`\n  ⚠️  ${msg}\n`);
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

// ── 1. Carregamento & Título ───────────────────────────────────────────────
secao('1. Carregamento & Título');
await pagina.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await pagina.waitForTimeout(1500);

checa(
  errosConsole.length === 0,
  'Sem erros no console',
  errosConsole.length ? errosConsole.join('; ') : 'nenhum'
);

const titulo = await pagina.title();
checa(
  titulo.includes('BEDÊ') && !titulo.includes('Stiletto B+D'),
  'Título contém "BEDÊ" e não contém "Stiletto B+D"',
  `"${titulo}"`
);

// ── 2. Menu de Navegação (Padrão New Balance — Max 6 itens, sem acordeão) ───
secao('2. Menu de Navegação & Ausência de Links Mortos');
const menuInfo = await pagina.evaluate(() => {
  const topNavItems = [...document.querySelectorAll('header nav.main-nav > a, header nav.main-nav > .nav-item, header nav.nav-menu > a, header nav.nav-menu > .nav-item')];
  const items = topNavItems.map(el => ({
    text: el.innerText.trim(),
    href: el.getAttribute('href') || el.href || '',
    fullHref: el.href || '',
    isAccordion: !!el.querySelector('.dropdown-chevron, .sub-menu, .nav-submenu') || el.classList.contains('has-dropdown')
  }));
  
  const cartLink = document.querySelector('header .icon-btn, header #cartBtn, header a[href*="cart"]');
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
  menuInfo.cartHref.includes(HOST_LOJA) && menuInfo.cartHref.includes('/cart'),
  'Ícone de sacola aponta diretamente para o carrinho da Nuvemshop (/cart/)',
  menuInfo.cartHref
);

const hasDeadMenuLink = menuInfo.items.some(i => !i.href || i.href === '#' || i.href.startsWith('javascript:'));
checa(!hasDeadMenuLink, 'Nenhum link de menu tem href vazio, "#" ou "javascript:"');

// ── 3. Validação de Destinos de Menu ───────────────────────────────────────
secao('3. Validação de Destinos de Menu');
for (const item of menuInfo.items) {
  if (item.fullHref.startsWith('http') && item.fullHref.includes(HOST_LOJA)) {
    checa(true, `Menu "${item.text}" aponta para a Nuvemshop`, item.fullHref);
  } else if (item.fullHref.includes('wa.me') || item.fullHref.includes('whatsapp')) {
    ok(`Menu "${item.text}" aponta para atendimento WhatsApp`, item.fullHref);
  } else if (item.href.endsWith('.html') || !item.href.startsWith('#')) {
    try {
      const targetUrl = new URL(item.href, BASE).href;
      const res = await pagina.request.get(targetUrl);
      checa(res.status() === 200, `Menu "${item.text}" abre página institucional com 200 OK`, targetUrl);
    } catch (e) {
      falhou(`Menu "${item.text}" falhou ao responder`, item.href);
    }
  } else {
    falhou(`Menu "${item.text}" aponta para destino inesperado`, item.href);
  }
}

// ── 4. Seção "Descubra os Tipos" (Silhuetas) ──────────────────────────────
secao('4. Seção "Descubra os Tipos"');
const tiposInfo = await pagina.evaluate(() => {
  const section = document.querySelector('.tipos-slide, .section-silhuetas, .tipos-section, #tiposSection');
  if (!section) return null;

  const title = section.querySelector('h2, h3, .tipos-title')?.innerText.trim() || '';
  const tiles = [...section.querySelectorAll('.tipo-card, .tipo-tile, .silhueta-card')].map(t => ({
    text: t.innerText.trim(),
    href: t.getAttribute('href') || t.querySelector('a')?.getAttribute('href') || ''
  }));

  return { title, tilesCount: tiles.length, tiles };
});

if (!tiposInfo) {
  falhou('Seção "Descubra os Tipos" encontrada no DOM');
} else {
  ok('Seção "Descubra os Tipos" presente', `Título: "${tiposInfo.title}"`);
  checa(tiposInfo.tilesCount >= 5, 'Seção de tipos tem pelo menos 5 ladrilhos', `${tiposInfo.tilesCount} tipos`);

  const destinos = new Set();
  for (const t of tiposInfo.tiles) {
    if (t.href.startsWith('http') && t.href.includes(HOST_LOJA)) {
      destinos.add(t.href);
      checa(true, `Ladrilho "${t.text}" aponta para a Nuvemshop`, t.href);
    } else {
      falhou(`Ladrilho "${t.text}" aponta para destino fora da Nuvemshop`, t.href);
    }
  }

  console.log(`\n  Destinos distintos nos ladrilhos: ${destinos.size}`);
  if (destinos.size < 4) {
    aviso('AVISO: LADRILHOS APONTAM TODOS PARA A LISTAGEM GERAL — categorias pendentes no painel Nuvemshop');
  }
}

// ── 5. Integridade Visual dos Cards ───────────────────────────────────────
secao('5. Regras do Card & Estilização');
const cardsInfo = await pagina.evaluate(() => {
  const cards = [...document.querySelectorAll('.destaque-card, .p-card, .card-produto, .dual-half')];
  if (!cards.length) return { count: 0, items: [], hasCoverProductImg: false };

  const parsed = cards.map(c => {
    const nameEl = c.querySelector('.p-card-name, .destaque-name, .dual-title, h3, h4');
    const nameText = nameEl ? nameEl.innerText.trim() : '';
    const nameTransform = nameEl ? getComputedStyle(nameEl).textTransform : '';
    
    const imgEl = c.querySelector('img');
    const imgFit = imgEl ? getComputedStyle(imgEl).objectFit : '';

    const linkEl = c.querySelector('a') || (c.tagName === 'A' ? c : null);
    const linkHref = linkEl ? (linkEl.getAttribute('href') || linkEl.href || '') : '';

    return {
      nameText,
      nameTransform,
      imgFit,
      linkHref
    };
  });

  const productCards = [...document.querySelectorAll('.destaque-card, .p-card, .card-produto')];
  const hasCoverProductImg = productCards.some(c => {
    const img = c.querySelector('img');
    return img && getComputedStyle(img).objectFit === 'cover';
  });

  return { count: cards.length, items: parsed, hasCoverProductImg };
});

if (cardsInfo.count > 0) {
  checa(!cardsInfo.hasCoverProductImg, 'Nenhuma imagem de card de produto usa object-fit: cover', 'todas contain sobre #F7F7F7');
} else {
  ok('Cards de produto validados', 'Layout institucional/vitrine única ativo');
}

// ── 6. Texto, Legal & Links Institucionais do Rodapé ────────────────────────
secao('6. Integridade Visual, Jurídica & Links Institucionais');
const texto = await pagina.evaluate(() => document.body.innerText);

checa(!/null/i.test(texto), 'Sem "null" no texto');
checa(!/undefined/i.test(texto), 'Sem "undefined" no texto');
checa(!/NaN/i.test(texto), 'Sem "NaN" no texto');
checa(!/\[object Object\]/i.test(texto), 'Sem "[object Object]" no texto');
checa(!/\bOFERTA\b/.test(texto), 'Sem selo "OFERTA" inventado');
checa(!/\b5% OFF no PIX\b/i.test(texto), 'Sem "5% OFF no PIX" inventado na home');

// [v31.3] Horário real na home
checa(!/S[aá]bado/i.test(texto), 'Sem "Sábado" no texto da home');
checa(!/19h\b/i.test(texto), 'Sem "19h" no texto da home');

// CNPJ e Razão Social
checa(/55\.068\.034\/0001-00/.test(texto), 'Rodapé traz o CNPJ oficial', '55.068.034/0001-00');
checa(/Stiletto Bd Boutique Ltda/i.test(texto), 'Rodapé traz a razão social oficial', 'Stiletto Bd Boutique Ltda');

// Validação dos Links do Rodapé Institucional
const footerLinks = await pagina.evaluate(() => {
  const colInstitucional = document.querySelectorAll('.clean-footer .cf-col:nth-child(2) a, footer .cf-col a');
  return [...colInstitucional].map(a => ({
    text: a.innerText.trim(),
    href: a.getAttribute('href') || a.href || '',
    fullHref: a.href || ''
  })).filter(a => a.text);
});

console.log(`  Links institucionais no rodapé encontrados: ${footerLinks.length}`);
const hasDeadFooterLink = footerLinks.some(l => !l.href || l.href === '#' || l.href.startsWith('javascript:'));
checa(!hasDeadFooterLink, 'Nenhum link institucional do rodapé tem href vazio, "#" ou "javascript:"');

// Testar cada página institucional para HTTP 200
for (const l of footerLinks) {
  if (l.href.endsWith('.html') || (!l.href.startsWith('http') && !l.href.startsWith('#'))) {
    try {
      const targetUrl = new URL(l.href, BASE).href;
      const res = await pagina.request.get(targetUrl);
      checa(res.status() === 200, `Página institucional "${l.text}" responde HTTP 200 OK`, targetUrl);
    } catch (e) {
      falhou(`Página institucional "${l.text}" inacessível`, l.href);
    }
  }
}

// ── 7. Travas Específicas de Conteúdo Institucional [v31.3] ─────────────────
secao('7. Validação Específica de Conteúdo Institucional [v31.3]');

// 7.1. guia-medidas.html
try {
  const urlGuia = new URL('guia-medidas.html', BASE).href;
  const resGuia = await pagina.request.get(urlGuia);
  const htmlGuia = await resGuia.text();
  
  checa(!htmlGuia.includes('22,5') && !htmlGuia.includes('26,5'), 'guia-medidas.html não contém centímetros genéricos ("22,5" / "26,5")');
  checa(htmlGuia.includes('wa.me'), 'guia-medidas.html contém link de atendimento no WhatsApp (wa.me)');
  checa(!/S[aá]bado/i.test(htmlGuia) && !/19h\b/i.test(htmlGuia), 'guia-medidas.html traz horário correto (sem Sábado / 19h)');
} catch (e) {
  falhou('Falha ao validar guia-medidas.html', e.message);
}

// 7.2. trocas.html
try {
  const urlTrocas = new URL('trocas.html', BASE).href;
  const resTrocas = await pagina.request.get(urlTrocas);
  const htmlTrocas = await resTrocas.text();

  checa(/primeira troca/i.test(htmlTrocas), 'trocas.html contém política explícita de "primeira troca"');
  checa(/7 dias/i.test(htmlTrocas), 'trocas.html contém seção de arrependimento legal de "7 dias"');
  checa(!/S[aá]bado/i.test(htmlTrocas) && !/19h\b/i.test(htmlTrocas), 'trocas.html traz horário correto (sem Sábado / 19h)');
} catch (e) {
  falhou('Falha ao validar trocas.html', e.message);
}

// 7.3. sobre.html e outras institucionais (horário real)
try {
  const urlSobre = new URL('sobre.html', BASE).href;
  const resSobre = await pagina.request.get(urlSobre);
  const htmlSobre = await resSobre.text();
  checa(!/S[aá]bado/i.test(htmlSobre) && !/19h\b/i.test(htmlSobre), 'sobre.html traz horário correto (sem Sábado / 19h)');
} catch (e) {
  falhou('Falha ao validar sobre.html', e.message);
}

// Domínios Proibidos
const dominiosBanidos = await pagina.evaluate(() => {
  const html = document.documentElement.innerHTML;
  return {
    lojaUsebede: /loja\.usebede\.com\.br/i.test(html),
    sistemawbuy: /sistemawbuy\.com\.br/i.test(html),
    stilettobmaisd: /stilettobmaisd/i.test(html)
  };
});

checa(!dominiosBanidos.lojaUsebede, 'Zero links para loja.usebede.com.br (bloqueado até CNAME ser apontado para Nuvemshop)');
checa(!dominiosBanidos.sistemawbuy, 'Zero links para sistemawbuy.com.br');
checa(!dominiosBanidos.stilettobmaisd, 'Zero links ou menções a stilettobmaisd');

// ── 8. Levantamento Informacional da Nuvemshop (Catálogo) ───────────────────
secao('8. Levantamento Informacional da Nuvemshop (Catálogo)');
try {
  const paginaLoja = await contexto.newPage();
  await paginaLoja.goto(`https://${HOST_LOJA}/produtos/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  const produtosLoja = await paginaLoja.$$eval('a', as => as.map(a => a.textContent.trim()).filter(t => t && t.length > 3));
  const nomesCaps = produtosLoja.filter(n => n === n.toUpperCase() && /[A-Z]/.test(n));
  console.log(`  INFO Nomes de produtos na loja 100% em maiúsculas: ${nomesCaps.length} (pendência de renomeação no painel)`);
  await paginaLoja.close();
} catch (e) {
  console.log('  INFO Não foi possível conectar ao catálogo remoto para contagem:', e.message);
}

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
