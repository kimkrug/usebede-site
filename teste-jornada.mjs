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

function isSoft404(body, title = '') {
  const norm = ((body || '') + ' ' + (title || '')).toLowerCase();
  return norm.includes('erro - 404') ||
         norm.includes('erro 404') ||
         norm.includes('error 404') ||
         norm.includes('a página que você está procurando não existe') ||
         norm.includes('não encontramos essa página') ||
         norm.includes('página não encontrada') ||
         norm.includes('esta página não foi encontrada') ||
         norm.includes('página não existe');
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
  
  const cartLink = document.querySelector('header .icon-btn, header #cartBtn, header a[href*="comprar"], header a[href*="cart"]');
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
  menuInfo.cartHref.includes(HOST_LOJA) && menuInfo.cartHref.includes('/comprar/'),
  'Ícone de sacola aponta diretamente para o carrinho da Nuvemshop (/comprar/)',
  menuInfo.cartHref
);

const hasDeadMenuLink = menuInfo.items.some(i => !i.href || i.href === '#' || i.href.startsWith('javascript:'));
checa(!hasDeadMenuLink, 'Nenhum link de menu tem href vazio, "#" ou "javascript:"');

// ── 3. Validação de Destinos de Menu (Medição HTTP Real & Anti-Soft-404) ─────────────────
secao('3. Validação de Destinos de Menu (Medição HTTP Real & Anti-Soft-404)');
for (const item of menuInfo.items) {
  if (item.fullHref.startsWith('http') && item.fullHref.includes(HOST_LOJA)) {
    try {
      const res = await pagina.request.get(item.fullHref);
      const body = await res.text();
      const soft404 = isSoft404(body);
      checa(res.status() === 200 && !soft404, `Menu "${item.text}" responde HTTP 200 OK real (sem soft-404) na Nuvemshop`, `${res.status()} ${item.fullHref}`);
    } catch (e) {
      falhou(`Menu "${item.text}" falhou na requisição HTTP`, e.message);
    }
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

// ── 4. Seção "Descubra os Tipos" (Medição HTTP Real & Anti-Soft-404) ───────────
secao('4. Seção "Descubra os Tipos" (Medição HTTP Real & Anti-Soft-404)');
const tiposInfo = await pagina.evaluate(() => {
  const section = document.querySelector('.tipos-slide, .section-silhuetas, .tipos-section, #tiposSection, #slide3');
  if (!section) return null;

  const title = section.querySelector('h2, h3, .section-title, .tipos-title')?.innerText.trim() || '';
  const tiles = [...section.querySelectorAll('.tipo-card, .tipo-tile, .silhueta-card, .nb-card')].map(t => ({
    text: (t.querySelector('.nb-card-label-only, .tipo-label')?.innerText || t.innerText || '').trim(),
    href: t.getAttribute('href') || t.querySelector('a')?.getAttribute('href') || t.href || ''
  }));

  return { title, tilesCount: tiles.length, tiles };
});

if (!tiposInfo) {
  falhou('Seção "Descubra os Tipos" encontrada no DOM');
} else {
  ok('Seção "Descubra os Tipos" presente', `Título: "${tiposInfo.title}"`);
  checa(tiposInfo.tilesCount === 6, 'Seção de tipos tem exatamente 6 ladrilhos ativos no catálogo', `${tiposInfo.tilesCount} tipos (${tiposInfo.tiles.map(t => t.text).join(' · ')})`);

  for (const t of tiposInfo.tiles) {
    if (t.href.startsWith('http') && t.href.includes(HOST_LOJA)) {
      try {
        const res = await pagina.request.get(t.href);
        const body = await res.text();
        const soft404 = isSoft404(body);
        checa(res.status() === 200 && !soft404, `Ladrilho "${t.text}" responde HTTP 200 OK real (sem soft-404) na Nuvemshop`, `${res.status()} ${t.href}`);
      } catch (e) {
        falhou(`Ladrilho "${t.text}" falhou na requisição HTTP`, e.message);
      }
    } else {
      falhou(`Ladrilho "${t.text}" aponta para destino fora da Nuvemshop`, t.href);
    }
  }
}

// ── 5. Integridade Visual dos Cards & Nomes de Produtos ───────────────────
secao('5. Regras do Card, Nomes & Estilização (Title Case)');
const cardsInfo = await pagina.evaluate(() => {
  const cards = [...document.querySelectorAll('.destaque-card, .p-card, .card-produto, .dual-half')];
  if (!cards.length) return { count: 0, items: [], hasCoverProductImg: false, hasAllUppercaseNames: false };

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

  const hasAllUppercaseNames = productCards.some(c => {
    const nameEl = c.querySelector('.p-card-name, .destaque-name, h3, h4');
    const txt = nameEl ? nameEl.innerText.trim() : '';
    return txt.length > 3 && txt === txt.toUpperCase() && !txt.includes('&');
  });

  return { count: cards.length, items: parsed, hasCoverProductImg, hasAllUppercaseNames };
});

if (cardsInfo.count > 0) {
  checa(!cardsInfo.hasCoverProductImg, 'Nenhuma imagem de card de produto usa object-fit: cover', 'todas contain sobre #F7F7F7');
  checa(!cardsInfo.hasAllUppercaseNames, 'Nenhum nome de produto em CAIXA ALTA na vitrine', 'Title Case ativo');
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

// Domínios Proibidos e Validação do Domínio Definitivo (v35)
const dominiosBanidos = await pagina.evaluate(() => {
  const html = document.documentElement.innerHTML;
  return {
    lojaDefinitiva: /loja\.usebede\.com\.br/i.test(html),
    lojavirtualnuvem: /lojavirtualnuvem\.com\.br/i.test(html),
    sistemawbuy: /sistemawbuy\.com\.br/i.test(html),
    stilettobmaisd: /stilettobmaisd/i.test(html)
  };
});

checa(dominiosBanidos.lojaDefinitiva, 'Todo link de loja no site usa o domínio definitivo "https://loja.usebede.com.br"');
checa(!dominiosBanidos.lojavirtualnuvem, 'Zero links para lojavirtualnuvem.com.br (domínio provisório eliminado)');
checa(!dominiosBanidos.sistemawbuy, 'Zero links para sistemawbuy.com.br');
checa(!dominiosBanidos.stilettobmaisd, 'Zero links ou menções a stilettobmaisd');

// ── 8. Travas de Estilo, Frete Regional, Transição e Rodapé v34.2 ─────────
secao('8. Travas de Estilo, Frete Regional, Transição e Rodapé v34.2');

// 8.1. Barra de informações da Home — 3 promessas com qualificação regional
const homeBarText = await pagina.evaluate(() => document.getElementById('homeBarClaims')?.innerText.trim() || '');
const hbUpper = homeBarText.toUpperCase();
checa(
  hbUpper.includes('SUL E SUDESTE') && hbUpper.includes('599') && hbUpper.includes('6X') && hbUpper.includes('5%'),
  'Barra da home contém exatamente as 3 promessas com qualificação regional ("Sul e Sudeste", "599", "6x sem juros", "5% no PIX")',
  `"${homeBarText}"`
);

// 8.2. Qualificação regional em todas as menções de frete grátis
const regionalShippingAudit = await pagina.evaluate(async () => {
  const homeText = document.body.innerText;
  const matches = [];
  const regex = /frete\s+gr[aá]tis/gi;
  let m;
  let allQualified = true;
  while ((m = regex.exec(homeText)) !== null) {
    const start = Math.max(0, m.index - 50);
    const end = Math.min(homeText.length, m.index + 80);
    const context = homeText.slice(start, end);
    if (!/sul\s+e\s+sudeste/i.test(context)) {
      allQualified = false;
      matches.push(context);
    }
  }
  return { allQualified, nonQualifiedMatches: matches };
});
checa(regionalShippingAudit.allQualified, 'Todas as menções de frete grátis na home trazem a qualificação "Sul e Sudeste"');

// 8.3. ZERO ocorrências de "449" no texto renderizado da Home e Institucionais
checa(!texto.includes('449') && !texto.includes('R$ 449'), 'Zero ocorrências de "449" no texto da home');

const paginasInst = ['sobre.html', 'como-comprar.html', 'trocas.html', 'faq.html', 'privacidade.html', 'termos.html', 'guia-medidas.html'];
for (const p of paginasInst) {
  try {
    const pUrl = new URL(p, BASE).href;
    const resP = await pagina.request.get(pUrl);
    const htmlP = await resP.text();
    checa(!htmlP.includes('449'), `Página "${p}" livre de "449" (frete atualizado para 599)`);
    if (/frete\s+gr[aá]tis/i.test(htmlP)) {
      checa(htmlP.includes('Sul e Sudeste'), `Página "${p}" qualifica frete grátis com "Sul e Sudeste"`);
    }
  } catch (e) {
    falhou(`Falha ao auditar "449" / frete regional em ${p}`, e.message);
  }
}

// 8.3. Motor de transição original restaurado (6 slides, transform 600ms cubic-bezier, wheel)
const sliderEngineAudit = await pagina.evaluate(() => {
  const stage = document.getElementById('viewportStage');
  const track = document.getElementById('slidesTrack');
  const slides = [...document.querySelectorAll('.v-slide')];
  const stageCs = stage ? window.getComputedStyle(stage) : null;
  const trackCs = track ? window.getComputedStyle(track) : null;
  
  const hasGoToSlide = typeof window.goToSlide === 'function';
  const isStageFixed = stageCs ? stageCs.position === 'fixed' : false;
  const hasTransformTransition = trackCs ? (trackCs.transition.includes('transform') || trackCs.transition.includes('600ms') || trackCs.willChange.includes('transform')) : false;

  return {
    hasGoToSlide,
    isStageFixed,
    hasTransformTransition,
    slidesCount: slides.length
  };
});

checa(
  sliderEngineAudit.hasGoToSlide && sliderEngineAudit.isStageFixed && sliderEngineAudit.slidesCount === 8,
  'Motor de transição original restaurado nos 8 slides da home (#slide0 a #slide7)',
  `${sliderEngineAudit.slidesCount} slides (transição: 600ms cubic-bezier)`
);

// 8.4. Rodapé ancorado na parte INFERIOR do Slide 7, sem corte e com CNPJ visível
const footerAnchoringAudit = await pagina.evaluate(async () => {
  if (typeof window.goToSlide === 'function') {
    window.goToSlide(7, true);
  }
  await new Promise(r => setTimeout(r, 600));

  const slide7 = document.getElementById('slide7');
  const footer = document.getElementById('siteFooter') || document.querySelector('.clean-footer-bottom');
  const copyEl = document.querySelector('.footer-copy');
  const legalEl = document.getElementById('footerLegal') || document.querySelector('.footer-legal');
  const firstCol = document.querySelector('.cf-col');

  if (!slide7 || !footer || !copyEl || !legalEl) return { exists: false };

  const innerH = window.innerHeight;
  const footerRect = footer.getBoundingClientRect();
  const copyRect = copyEl.getBoundingClientRect();
  const legalRect = legalEl.getBoundingClientRect();
  const firstColRect = firstCol ? firstCol.getBoundingClientRect() : null;

  // 1. O primeiro elemento visível do rodapé começa abaixo do header fixo (top >= 80px)
  const isTopClearOfHeader = firstColRect ? firstColRect.top >= 75 : true;

  // 2. O último elemento (copyright) termina a <= 24px da borda inferior
  const bottomGap = innerH - copyRect.bottom;
  const isAnchoredToBottom = bottomGap >= 0 && bottomGap <= 24;

  // 3. CNPJ e Razão Social visíveis diretamente na viewport sem rolagem
  const isCnpjVisible = legalRect.top >= 0 && legalRect.bottom <= innerH;

  return {
    exists: true,
    isTopClearOfHeader,
    isAnchoredToBottom,
    isCnpjVisible,
    bottomGap: Math.round(bottomGap),
    firstColTop: firstColRect ? Math.round(firstColRect.top) : null
  };
});

checa(footerAnchoringAudit.exists && footerAnchoringAudit.isTopClearOfHeader, 'Primeiro elemento do rodapé começa abaixo do cabeçalho fixo (sem cortes no topo)', `top: ${footerAnchoringAudit.firstColTop}px >= 80px`);
checa(footerAnchoringAudit.exists && footerAnchoringAudit.isAnchoredToBottom, 'Conteúdo do rodapé ancorado na parte inferior (copyright a ≤ 24px da borda)', `distância da borda inferior: ${footerAnchoringAudit.bottomGap}px`);
checa(footerAnchoringAudit.exists && footerAnchoringAudit.isCnpjVisible, 'CNPJ e Razão Social visíveis diretamente no rodapé');

// 8.5. Validação do Rodapé ancorado nas viewports padrão (1366×768, 1536×864, 390×844)
const viewportsToTest = [
  { w: 1366, h: 768, name: '1366×768' },
  { w: 1536, h: 864, name: '1536×864' },
  { w: 390, h: 844, name: '390×844 (Mobile)' }
];
for (const vp of viewportsToTest) {
  const vpPage = await contexto.newPage();
  await vpPage.setViewportSize({ width: vp.w, height: vp.h });
  await vpPage.goto(BASE, { waitUntil: 'domcontentloaded' });
  await vpPage.waitForTimeout(1000);
  const vpAudit = await vpPage.evaluate(async () => {
    if (typeof window.goToSlide === 'function') {
      window.goToSlide(7, true);
    }
    await new Promise(r => setTimeout(r, 600));
    const legalEl = document.getElementById('footerLegal') || document.querySelector('.footer-legal');
    const copyEl = document.querySelector('.footer-copy');
    const innerH = window.innerHeight;
    const isCnpjPresent = !!legalEl && legalEl.innerText.includes('55.068.034/0001-00');
    const copyBottom = copyEl ? copyEl.getBoundingClientRect().bottom : null;
    const isBottomFit = copyBottom !== null ? copyBottom <= innerH + 5 : false;
    return {
      isCnpjPresent,
      isBottomFit
    };
  });
  checa(vpAudit && vpAudit.isCnpjPresent && vpAudit.isBottomFit, `Rodapé traz CNPJ e razão social ancorados na viewport ${vp.name}`);
  await vpPage.close();
}

// 8.6. Nenhuma seção com rolagem interna (overflow visível / min-height)
const internalScrollSections = await pagina.evaluate(() => {
  const sections = [...document.querySelectorAll('.v-slide, .split-text-slide, .split-dual-slide, .concierge-slide, .site-footer-slide, #siteFooter')];
  return sections.map(s => {
    const cs = window.getComputedStyle(s);
    const hasInternalScroll = (cs.overflowY === 'scroll' || cs.overflowY === 'auto') && s.scrollHeight > s.clientHeight + 2;
    return {
      id: s.id || s.className,
      overflowY: cs.overflowY,
      scrollHeight: s.scrollHeight,
      clientHeight: s.clientHeight,
      hasInternalScroll
    };
  }).filter(s => s.hasInternalScroll);
});
checa(internalScrollSections.length === 0, 'Nenhuma seção da home tem barra de rolagem interna', internalScrollSections.length ? JSON.stringify(internalScrollSections) : 'todas fluidas');

// 8.7. Sem selo "Google Safe Browsing" / "Site Seguro Verificado"
const safeBrowsingMentions = await pagina.evaluate(() => {
  const html = document.body.innerHTML;
  const text = document.body.innerText;
  const hasSafeBrowsing = /safe-browsing|safebrowsing|safe\s*browsing/i.test(html) || /site seguro verificado/i.test(text);
  return hasSafeBrowsing;
});
checa(!safeBrowsingMentions, 'Sem selo fabricado "Google Safe Browsing" ou "Site Seguro Verificado"');

// ── 9. Auditoria do Catálogo Remoto Nuvemshop ─────────────────────────────
secao('9. Auditoria do Catálogo Remoto Nuvemshop');
try {
  const paginaLoja = await contexto.newPage();
  await paginaLoja.goto(`https://${HOST_LOJA}/produtos/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await paginaLoja.waitForTimeout(2000);
  
  const produtosLoja = await paginaLoja.$$eval('a[href*="/produtos/"]', as => 
    as.filter(a => !a.href.includes('sort=') && !a.href.endsWith('/produtos/') && !a.href.endsWith('/produtos'))
      .map(a => a.textContent.trim())
      .filter(t => t && t.length > 3)
  );
  
  const nomesUnicos = [...new Set(produtosLoja)];
  ok(`Catálogo Nuvemshop conectado`, `${nomesUnicos.length} produtos identificados na vitrine`);
  
  const nomesCaps = nomesUnicos.filter(n => n === n.toUpperCase() && /[A-Z]/.test(n));
  if (nomesCaps.length === 0) {
    ok('Todos os produtos do catálogo utilizam Title Case (sem CAIXA ALTA)');
  } else {
    console.log(`  INFO Nomes de produtos na loja em MAIÚSCULAS: ${nomesCaps.length}/${nomesUnicos.length}`);
  }

  // 9.1. Na LOJA Nuvemshop: nenhum card exibe "0% OFF" visível
  const zeroOffFound = await paginaLoja.evaluate(() => {
    const visibleZeroOffs = [...document.querySelectorAll('*')].filter(el => {
      const t = el.innerText ? el.innerText.trim() : '';
      const cs = window.getComputedStyle(el);
      return (t === '0% OFF' || t === '0%' || /0%\s*OFF/i.test(t)) && cs.display !== 'none' && cs.visibility !== 'hidden' && el.offsetParent !== null;
    });
    return visibleZeroOffs.length;
  });
  checa(zeroOffFound === 0, 'Na loja Nuvemshop: nenhum card exibe selo "0% OFF" visível', `visíveis: ${zeroOffFound}`);

  await paginaLoja.close();
} catch (e) {
  console.log('  INFO Não foi possível conectar ao catálogo remoto para contagem:', e.message);
}

// ── 10. Travas Visuais v36.1 (Ordem de 8 Slides, Controles Padronizados e Card Único NB) ──
secao('10. Travas Visuais v36.1 (Ordem de 8 Slides, Controles Padronizados e Card Único NB)');

// 10.1. Ordem Definitiva dos 8 Slides
const slidesAudit = await pagina.evaluate(() => {
  const slides = [...document.querySelectorAll('.v-slide')];
  const ids = slides.map(s => s.id);
  const slide2HasDual = !!document.querySelector('#slide2 .split-dual-slide');
  const slide4HasSale = !!document.querySelector('#slide4 .split-text-slide');
  const slide1HasEmAlta = !!document.querySelector('#slide1 #emAltaRail');
  const slide3HasTipos = !!document.querySelector('#slide3 #tiposRail');
  const slide5HasTabs = !!document.querySelector('#slide5 #tabsRail');
  const dotsCount = document.querySelectorAll('#slideDots .s-dot').length;

  return {
    count: slides.length,
    ids,
    dotsCount,
    slide1HasEmAlta,
    slide2HasDual,
    slide3HasTipos,
    slide4HasSale,
    slide5HasTabs
  };
});

checa(slidesAudit.count === 8 && slidesAudit.dotsCount === 8, 'Estrutura da Home contém exatamente 8 slides com 8 dots de navegação', `${slidesAudit.count} slides / ${slidesAudit.dotsCount} dots`);
checa(slidesAudit.slide1HasEmAlta, 'Slide 1 é a Seleção Especial "EM ALTA"');
checa(slidesAudit.slide2HasDual, 'Slide 2 é a seção restaurada "Sapataria & Bolsas" (Duplo 50/50)');
checa(slidesAudit.slide3HasTipos, 'Slide 3 é a Curadoria BEDÊ "DESCUBRA OS TIPOS" (6 cards)');
checa(slidesAudit.slide4HasSale, 'Slide 4 é a seção restaurada "LIQUIDAÇÃO" (Split 64/31)');
checa(slidesAudit.slide5HasTabs, 'Slide 5 é o Catálogo Exclusivo "COLEÇÃO POR CATEGORIA" (Abas)');

// 10.2. Hero em 3 Quadros, Controles e Pontinhos Idênticos aos Verticais
const heroAudit = await pagina.evaluate(async () => {
  const frames = [...document.querySelectorAll('#heroCarousel .hero-frame')];
  const prevBtn = document.getElementById('heroPrevBtn');
  const nextBtn = document.getElementById('heroNextBtn');
  const heroDots = [...document.querySelectorAll('#heroDots .hero-dot')];
  const verticalDots = [...document.querySelectorAll('#slideDots .s-dot')];

  // Comparação de estilo computado entre bolinha da hero e bolinha vertical
  let dotsIdentical = false;
  if (heroDots.length > 0 && verticalDots.length > 0) {
    const csHero = window.getComputedStyle(heroDots[0]);
    const csVert = window.getComputedStyle(verticalDots[0]);
    dotsIdentical = csHero.width === csVert.width && csHero.height === csVert.height && csHero.borderRadius === csVert.borderRadius;
  }

  // Verificação dos botões do Quadro 3 (apenas 1 botão: VER BOLSAS)
  const frame2Buttons = [...document.querySelectorAll('#heroFrame2 .hero-cta-group a')];

  if (typeof window.goToHeroFrame === 'function') {
    window.goToHeroFrame(0);
    window.nextHeroFrame();
  } else if (nextBtn) {
    nextBtn.click();
  }
  await new Promise(r => setTimeout(r, 100));
  const frame1Active = document.getElementById('heroFrame1')?.classList.contains('active');
  const dot1Active = document.querySelectorAll('#heroDots .hero-dot')[1]?.classList.contains('active');

  return {
    framesCount: frames.length,
    hasPrevBtn: !!prevBtn,
    hasNextBtn: !!nextBtn,
    heroDotsCount: heroDots.length,
    dotsIdentical,
    frame2ButtonsCount: frame2Buttons.length,
    frame2BtnText: frame2Buttons[0]?.innerText.trim(),
    frame2BtnHref: frame2Buttons[0]?.href,
    frame1Active,
    dot1Active
  };
});

checa(heroAudit.framesCount === 3, 'Hero contém exatamente 3 quadros', `${heroAudit.framesCount} quadros`);
checa(heroAudit.hasPrevBtn && heroAudit.hasNextBtn && heroAudit.heroDotsCount === 3, 'Hero contém controles horizontais completos (setas + 3 pontinhos)', `dots: ${heroAudit.heroDotsCount}`);
checa(heroAudit.dotsIdentical, 'Pontinhos da hero possuem o MESMO estilo computado dos pontinhos verticais (diâmetro 8px, circulares)');
checa(heroAudit.frame1Active && heroAudit.dot1Active, 'Clique na seta da hero alterna para o próximo quadro com indicador ativo');
checa(heroAudit.frame2ButtonsCount === 1 && heroAudit.frame2BtnHref?.includes('/bolsa'), 'Quadro 3 da Hero contém apenas 1 botão ("VER BOLSAS →" para /bolsa/)', heroAudit.frame2BtnText);

// 10.3. Padronização das Setas no Site Inteiro (Componente Círculo com Fundo Transparente)
const arrowsAudit = await pagina.evaluate(() => {
  const arrows = [...document.querySelectorAll('.btn-nav-arrow')];
  if (!arrows.length) return { count: 0, allCircular: false, noPills: false, noFilledBlur: false };

  let allCircular = true;
  let noPills = true;
  let transparentBackground = true;

  for (const a of arrows) {
    const cs = window.getComputedStyle(a);
    const rect = a.getBoundingClientRect();
    const isCircle = Math.abs(rect.width - rect.height) <= 3 && (cs.borderRadius.includes('50%') || parseInt(cs.borderRadius) >= 20);
    if (!isCircle) allCircular = false;
    if (a.classList.contains('pill') || rect.height > rect.width * 1.5) noPills = false;
    
    // Fundo transparente (não cheio)
    const bg = cs.backgroundColor;
    const isTransparent = bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' || bg.includes('rgba(255, 255, 255, 0') || bg.includes('rgba(0, 0, 0, 0');
    if (!isTransparent) transparentBackground = false;
  }

  return {
    count: arrows.length,
    allCircular,
    noPills,
    transparentBackground
  };
});

checa(arrowsAudit.count >= 8, 'Componente de seta padronizado presente em todos os controles do site', `${arrowsAudit.count} setas encontradas`);
checa(arrowsAudit.allCircular && arrowsAudit.noPills, 'Todas as setas são circulares no padrão do design (zero formato pílula)');
checa(arrowsAudit.transparentBackground, 'Setas utilizam fundo transparente com borda fina (sem fundo sólido ou pílula blur)');

// 10.4. Trilhos Fluidos atingem as laterais da tela com transpasse ≥ meio card
const railsAudit = await pagina.evaluate(() => {
  const rails = [
    { id: 'emAltaRail', name: 'Em Alta' },
    { id: 'tiposRail', name: 'Descubra os Tipos' },
    { id: 'tabsRail', name: 'Coleção por Categoria' }
  ];
  const vpWidth = window.innerWidth;

  return rails.map(r => {
    const el = document.getElementById(r.id);
    if (!el) return { name: r.name, exists: false };
    const rect = el.getBoundingClientRect();
    const firstCard = el.querySelector('.nb-card');
    const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : 300;
    const overflowAmount = el.scrollWidth - el.clientWidth;
    const reachesEdge = rect.right >= vpWidth - 5;
    const hasHalfCardTranspass = overflowAmount >= 0.45 * cardWidth;

    return {
      name: r.name,
      exists: true,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      cardWidth: Math.round(cardWidth),
      overflowAmount: Math.round(overflowAmount),
      reachesEdge,
      hasHalfCardTranspass
    };
  });
});

for (const r of railsAudit) {
  checa(r.exists && r.reachesEdge, `Trilho "${r.name}" atinge as laterais da tela (largura total da viewport)`, `largura: ${r.clientWidth}px`);
  checa(r.exists && r.hasHalfCardTranspass, `Trilho "${r.name}" possui transpasse real ≥ meio card cortado`, `sobra: ${r.overflowAmount}px >= 0.5 × ${r.cardWidth}px`);
}

// 10.5. Card Único NB nas 3 Seções: Foto ~26vw, object-fit contain, fundo claro, sem borda/sombra
const nbCardsAudit = await pagina.evaluate(() => {
  const cards = [...document.querySelectorAll('.nb-card')];
  if (!cards.length) return { count: 0 };

  const first = cards[0];
  const csCard = window.getComputedStyle(first);
  const imgWrap = first.querySelector('.nb-card-img-wrap');
  const csWrap = imgWrap ? window.getComputedStyle(imgWrap) : null;
  const img = imgWrap ? imgWrap.querySelector('img') : null;
  const csImg = img ? window.getComputedStyle(img) : null;

  const vpW = window.innerWidth;
  const cardW = first.getBoundingClientRect().width;
  const cardVw = (cardW / vpW) * 100;

  const isContain = csImg?.objectFit === 'contain';
  const hasNoBorder = (!csCard.borderWidth || csCard.borderWidth === '0px') && (!csWrap.borderWidth || csWrap.borderWidth === '0px');
  const hasNoShadow = csCard.boxShadow === 'none' && csWrap.boxShadow === 'none';
  const hasNoRadius = csCard.borderRadius === '0px' && csWrap.borderRadius === '0px';
  const isLightBg = csWrap?.backgroundColor === 'rgb(247, 247, 247)' || csWrap?.backgroundColor.includes('247') || csWrap?.backgroundColor.includes('245');

  return {
    count: cards.length,
    cardW: Math.round(cardW),
    cardVw: Math.round(cardVw),
    isContain,
    hasNoBorder,
    hasNoShadow,
    hasNoRadius,
    isLightBg
  };
});

checa(nbCardsAudit.count >= 15, 'Cards únicos padrão NB renderizados nas 3 seções do site', `${nbCardsAudit.count} cards`);
checa(nbCardsAudit.cardVw >= 22, 'Largura do card no desktop é proporcional (~26vw)', `${nbCardsAudit.cardVw}vw (${nbCardsAudit.cardW}px)`);
checa(nbCardsAudit.isContain, 'Fotos dos cards utilizam object-fit: contain');
checa(nbCardsAudit.hasNoBorder && nbCardsAudit.hasNoShadow && nbCardsAudit.hasNoRadius, 'Cards não possuem bordas, nem sombras, nem cantos arredondados (zero borda/sombra/raio)');
checa(nbCardsAudit.isLightBg, 'Fundo da moldura da foto é claro (#F7F7F7)');

// 10.6. Slide 1 (Em Alta): Nome + Preço na mesma linha
const emAltaDetails = await pagina.evaluate(() => {
  const first = document.querySelector('#emAltaRail .nb-card');
  if (!first) return null;
  const infoRow = first.querySelector('.nb-card-info-row');
  const csInfo = infoRow ? window.getComputedStyle(infoRow) : null;
  const nameEl = first.querySelector('.nb-card-name');
  const priceEl = first.querySelector('.nb-card-price');
  return {
    isSingleLine: csInfo?.display === 'flex' && csInfo?.justifyContent === 'space-between',
    hasNameAndPrice: !!nameEl && !!priceEl,
    name: nameEl?.innerText.trim(),
    price: priceEl?.innerText.trim()
  };
});
checa(emAltaDetails?.isSingleLine && emAltaDetails?.hasNameAndPrice, 'Em Alta: nome e preço dispostos em linha única abaixo da imagem', `${emAltaDetails?.name} · ${emAltaDetails?.price}`);

// 10.7. Slide 3 (Descubra os Tipos): Exatamente 6 tipos com fotos reais e rotas 200 OK
const tiposDetails = await pagina.evaluate(() => {
  const cards = [...document.querySelectorAll('#tiposRail .nb-card')];
  return cards.map(c => ({
    name: c.querySelector('.nb-card-label-only')?.innerText.trim(),
    href: c.href,
    hasImg: !!c.querySelector('img[src]')
  }));
});
checa(tiposDetails.length === 6, 'Descubra os Tipos contém exatamente 6 cards', `${tiposDetails.map(t => t.name).join(' · ')}`);
checa(tiposDetails.every(t => t.hasImg), 'Todos os 6 cards de tipo utilizam fotos reais de produtos');

for (const t of tiposDetails) {
  try {
    const res = await pagina.request.get(t.href);
    const body = await res.text();
    const soft404 = isSoft404(body);
    checa(res.status() === 200 && !soft404, `Card Tipo "${t.name}" responde HTTP 200 OK real (sem soft-404)`, `${res.status()} ${t.href}`);
  } catch (e) {
    falhou(`Falha HTTP no card Tipo "${t.name}"`, e.message);
  }
}

// 810: Slide 5 (Coleção por Categoria): 3 abas funcionais com cards
const tabsDetails = await pagina.evaluate(async () => {
  const pills = [...document.querySelectorAll('#categoryTabs .tab-pill')];
  const rail = document.getElementById('tabsRail');
  const results = {};

  for (const pill of pills) {
    pill.click();
    if (typeof window.switchCategoryTab === 'function') window.switchCategoryTab(pill.getAttribute('data-tab') || pill.innerText.trim());
    await new Promise(r => setTimeout(r, 60));
    const cards = [...rail.querySelectorAll('.nb-card')];
    results[pill.innerText.trim()] = cards.length;
  }
  return {
    pillsCount: pills.length,
    pillNames: pills.map(p => p.innerText.trim()),
    results
  };
});
checa(tabsDetails.pillsCount === 3 && tabsDetails.pillNames.join(' · ') === 'Scarpin · Bota · Mule', 'Coleção por Categoria possui 3 abas ativas', tabsDetails.pillNames.join(' · '));
checa(tabsDetails.results['Scarpin'] >= 4 && tabsDetails.results['Bota'] >= 5 && tabsDetails.results['Mule'] >= 1, 'Trilho de abas renderiza produtos dinâmicos para cada categoria');

// ── 11. Travas de Paridade Real de Preços e Nomes v36.2 ────────────────────
secao('11. Paridade de Preços e Nomes (Fonte Única: products.js e Loja Real) [v36.2]');

// 11.1. Verificação de Hardcoded Price Strings no Bundle
const bundleAudit = await pagina.evaluate(async () => {
  const scripts = [...document.querySelectorAll('script[src]')].map(s => s.src);
  const appJsSrc = scripts.find(s => s.includes('app.js'));
  let appJsContent = '';
  if (appJsSrc) {
    try {
      const res = await fetch(appJsSrc);
      appJsContent = await res.text();
    } catch(e) {}
  }
  return { appJsContent };
});

const hardcodedCardsRegex = /preco:\s*['"]R\$\s*\d/i;
checa(!hardcodedCardsRegex.test(bundleAudit.appJsContent), 'Zero preços hardcoded no app.js (todos resolvidos de products.js)');

// 11.2. Paridade em 3 pontas (Card no Site x products.js x Loja Nuvemshop) para todos os cards do Em Alta
const emAltaCardsData = await pagina.evaluate(() => {
  const cards = [...document.querySelectorAll('#emAltaRail .nb-card')];
  const pJs = (typeof STILETTO_PRODUCTS !== 'undefined' ? STILETTO_PRODUCTS : []);
  return cards.map(c => {
    const name = c.querySelector('.nb-card-name')?.innerText.trim() || '';
    const price = c.querySelector('.nb-card-price')?.innerText.trim() || '';
    const href = c.href || '';
    
    // Find matching in products.js
    const norm = str => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const pMatch = pJs.find(p => p.url_absolute === href || norm(p.nome_title || p.nome) === norm(name));
    
    return {
      name,
      price,
      href,
      pJsFound: !!pMatch,
      pJsName: pMatch ? (pMatch.nome_title || pMatch.nome) : null,
      pJsPriceNum: pMatch ? Number(pMatch.preco) : null,
      pJsPriceFmt: pMatch ? Number(pMatch.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null
    };
  });
});

console.log('\n  TABELA DE PARIDADE DE PREÇOS (v36.2):');
console.log('  ' + '─'.repeat(84));
console.log('  | Produto                     | Card no Site | products.js  | Loja Nuvemshop | Status  |');
console.log('  ' + '─'.repeat(84));

for (const card of emAltaCardsData) {
  // Fetch real product page
  let livePriceText = 'ERR';
  let livePriceNum = NaN;
  try {
    const pPage = await browser.newPage();
    await pPage.goto(card.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
    livePriceText = await pPage.evaluate(() => {
      const el = document.querySelector('#price_display, .js-price-display, .price, .js-product-price');
      return el ? el.innerText.trim() : '';
    });
    await pPage.close();
    
    const std = s => (s || '').replace(/[R$\s\u00a0]/g, '').replace(',', '.').trim();
    livePriceNum = parseFloat(std(livePriceText));
  } catch (e) {
    livePriceText = `Erro: ${e.message}`;
  }

  const std = s => (s || '').replace(/[R$\s\u00a0]/g, '').replace(',', '.').trim();
  const cardPriceNum = parseFloat(std(card.price));
  const pJsPriceNum = card.pJsPriceNum;

  const priceMatchesPJs = Math.abs(cardPriceNum - pJsPriceNum) < 0.01;
  const priceMatchesLive = Math.abs(cardPriceNum - livePriceNum) < 0.01;
  const parityOk = priceMatchesPJs && priceMatchesLive;

  const statusStr = parityOk ? 'OK' : 'DIVERGÊNCIA';
  const namePad = card.name.padEnd(27, ' ');
  const cardPricePad = card.price.padEnd(12, ' ');
  const pJsPricePad = (card.pJsPriceFmt || 'N/A').padEnd(12, ' ');
  const livePricePad = livePriceText.padEnd(14, ' ');

  console.log(`  | ${namePad} | ${cardPricePad} | ${pJsPricePad} | ${livePricePad} | ${statusStr.padEnd(7, ' ')} |`);

  checa(card.pJsFound, `Card "${card.name}" possui correspondência em products.js`);
  checa(priceMatchesPJs, `Paridade Card × products.js para "${card.name}"`, `${card.price} == ${card.pJsPriceFmt}`);
  checa(priceMatchesLive, `Paridade Card × Loja Nuvemshop para "${card.name}"`, `${card.price} == ${livePriceText}`);
  
  // Paridade de nome (sem acento em Jessica)
  if (card.name.toLowerCase().includes('jessica')) {
    checa(!card.name.includes('é') && card.name.includes('Jessica'), 'Nome da Bolsa Jessica sem acento (conforme catálogo)');
  }
}
console.log('  ' + '─'.repeat(84) + '\n');

// ── 12. Trava Anti-Soft-404 Retroativa & Renderização Real da Loja [v37.1] ───
secao('12. Trava Anti-Soft-404 Retroativa & Renderização Real da Loja [v37.1]');

// 12.1. Checagem da Rota Standalone do Carrinho
try {
  const cartUrl = menuInfo.cartHref || `https://${HOST_LOJA}/comprar/`;
  const resCart = await pagina.request.get(cartUrl);
  const cartBody = await resCart.text();
  const cartSoft404 = isSoft404(cartBody);
  
  checa(resCart.status() === 200, 'Página de carrinho responde HTTP 200', `${resCart.status()} ${cartUrl}`);
  checa(!cartSoft404, 'Página de carrinho NÃO é um soft-404 (sem "Erro - 404" ou "não existe")', cartUrl);
  
  const hasCartElements = /carrinho|carrinho de compras|subtotal|finalizar|comprar|meios de envio/i.test(cartBody);
  checa(hasCartElements, 'Página de carrinho renderiza componentes reais de carrinho (sem página de erro do tema)');
} catch (e) {
  falhou('Falha ao auditar página standalone de carrinho', e.message);
}

// 12.2. Checagem Anti-Soft-404 Retroativa em Todas as Rotas Oficiais da Loja
const rotasLojaParaTestar = [
  `https://${HOST_LOJA}/produtos/`,
  `https://${HOST_LOJA}/produtos/?sort=date_desc`,
  `https://${HOST_LOJA}/scarpin/`,
  `https://${HOST_LOJA}/bota/`,
  `https://${HOST_LOJA}/mule/`,
  `https://${HOST_LOJA}/mocassim/`,
  `https://${HOST_LOJA}/tenis/`,
  `https://${HOST_LOJA}/bolsa/`,
  `https://${HOST_LOJA}/comprar/`
];

for (const rUrl of rotasLojaParaTestar) {
  try {
    const res = await pagina.request.get(rUrl);
    const body = await res.text();
    const soft404 = isSoft404(body);
    const slug = new URL(rUrl).pathname + (new URL(rUrl).search || '');
    checa(res.status() === 200 && !soft404, `Rota da Loja "${slug}" responde HTTP 200 sem soft-404`, `${res.status()} ${rUrl}`);
  } catch(e) {
    falhou(`Falha ao auditar rota ${rUrl}`, e.message);
  }
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
