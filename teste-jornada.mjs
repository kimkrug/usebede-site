/**
 * BEDÊ — teste de jornada.
 *
 * Percorre o caminho que uma cliente percorre e falha se algo quebrar.
 * Roda antes de cada commit. Se este script sair com erro, não commite.
 *
 * Uso:
 *   node teste-jornada.mjs                     -> testa o preview
 *   node teste-jornada.mjs http://localhost:3000  -> testa outro endereço
 *
 * Instalação, uma vez só:
 *   npm install -D playwright
 *   npx playwright install chromium
 */

import { chromium } from 'playwright';

const URL_PADRAO =
  'https://siteusebede-git-preview-v10-degradation-kimkrugs-projects.vercel.app/';
const BASE = process.argv[2] || URL_PADRAO;
const HOST_LOJA = 'loja.usebede.com.br';

// Avisos conhecidos e aceitos. Qualquer outro erro reprova.
const AVISOS_ACEITOS = [/\[BEDÊ\] elementos ausentes no HTML/];

let falhas = 0;
let passos = 0;

function ok(msg, detalhe = '') {
  passos++;
  console.log(`  OK   ${msg}${detalhe ? '  → ' + detalhe : ''}`);
}
function falhou(msg, detalhe = '') {
  passos++;
  falhas++;
  console.log(`  FALHA ${msg}${detalhe ? '  → ' + detalhe : ''}`);
}
function checa(cond, msg, detalhe = '') {
  cond ? ok(msg, detalhe) : falhou(msg, detalhe);
  return cond;
}
function secao(titulo) {
  console.log(`\n${titulo}`);
}

const navegador = await chromium.launch();
const pagina = await navegador.newPage();

const errosConsole = [];
pagina.on('console', (m) => {
  if (m.type() !== 'error' && m.type() !== 'warning') return;
  const texto = m.text();
  if (AVISOS_ACEITOS.some((r) => r.test(texto))) return;
  errosConsole.push(`[${m.type()}] ${texto}`);
});
pagina.on('pageerror', (e) => errosConsole.push(`[exception] ${e.message}`));

console.log(`\nTestando: ${BASE}`);

// ── 1. Carregamento ────────────────────────────────────────────────────────
secao('1. Carregamento');
await pagina.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'cb=' + Date.now(), {
  waitUntil: 'networkidle',
});
await pagina.waitForTimeout(1500);

checa(errosConsole.length === 0, 'Sem erros no console', errosConsole.join(' | ') || 'nenhum');

// ── 2. Dados do catálogo ───────────────────────────────────────────────────
secao('2. Dados do catálogo');
const dados = await pagina.evaluate((hostLoja) => {
  const P = typeof STILETTO_PRODUCTS !== 'undefined' ? STILETTO_PRODUCTS : null;
  if (!P) return { erro: 'STILETTO_PRODUCTS não existe' };

  const hosts = new Set();
  let semSku = 0, negativos = 0, semEstoque = 0, variacoes = 0;

  for (const p of P) {
    try { hosts.add(new URL(p.url_absolute).host); } catch { hosts.add('(inválido)'); }
    let temPositiva = false;
    for (const cor of Object.values(p.estoque_por_cor || {})) {
      for (const v of Object.values(cor)) {
        variacoes++;
        const q = Number(v.qtd);
        if (q < 0) negativos++;
        if (q > 0) temPositiva = true;
        if (!v.sku) semSku++;
      }
    }
    if (!temPositiva) semEstoque++;
  }

  return {
    total: P.length,
    hosts: [...hosts],
    variacoes, semSku, negativos, semEstoque,
    comPrecoAntigo: P.filter((p) => p.preco_antigo).length,
  };
}, HOST_LOJA);

if (dados.erro) {
  falhou('Catálogo carregado', dados.erro);
} else {
  checa(dados.total > 100, 'Catálogo tem produtos', `${dados.total} produtos`);
  checa(dados.hosts.length === 1 && dados.hosts[0] === HOST_LOJA,
    'Todos os links apontam para a loja', dados.hosts.join(', '));
  checa(dados.semSku === 0, 'Toda variação tem sku', `${dados.semSku} sem sku de ${dados.variacoes}`);
  checa(dados.negativos === 0, 'Nenhuma quantidade negativa', `${dados.negativos} negativas`);
  checa(dados.semEstoque === 0, 'Nenhum produto sem estoque na vitrine', `${dados.semEstoque} zerados`);
}

// ── 3. Menus ───────────────────────────────────────────────────────────────
secao('3. Menus');
const menus = await pagina.evaluate(() => ({
  chips: (document.getElementById('filterChips') || { children: [] }).children.length,
  desktop: (document.getElementById('desktopSubMenu') || { children: [] }).children.length,
  mobile: (document.getElementById('mobSubCategories') || { children: [] }).children.length,
}));
checa(menus.chips > 0, 'Chips preenchidos', `${menus.chips} itens`);
checa(menus.desktop > 0, 'Dropdown do desktop preenchido', `${menus.desktop} itens`);
checa(menus.mobile > 0, 'Gaveta mobile preenchida', `${menus.mobile} itens`);

// ── 4. Nenhum menu leva a lista vazia ──────────────────────────────────────
secao('4. Coleções');
const varredura = await pagina.evaluate(async () => {
  // Os destinos vêm dos TRÊS containers de menu, independente de o container
  // estar visível no momento (o dropdown do desktop nasce fechado, a gaveta
  // mobile nasce escondida — e mesmo assim seus itens precisam funcionar).
  const containers = ['filterChips', 'desktopSubMenu', 'mobSubCategories'];
  const destinos = new Set();

  for (const id of containers) {
    const box = document.getElementById(id);
    if (!box) continue;
    for (const el of box.querySelectorAll('[onclick*=openCollection]')) {
      const m = el.getAttribute('onclick').match(/openCollection\('([^']+)'/);
      if (m) destinos.add(m[1]);
    }
  }

  // Os chips usam filterCat em vez de openCollection em algumas versões.
  for (const el of document.querySelectorAll('#filterChips [onclick*=filterCat]')) {
    const m = el.getAttribute('onclick').match(/filterCat\('([^']+)'/);
    if (m) destinos.add(m[1]);
  }

  const r = {};
  for (const c of destinos) {
    openCollection(c);
    await new Promise((res) => setTimeout(res, 400));
    const g = document.querySelector('.collection-grid');
    const vazio = g && g.innerText.includes('Nenhum produto encontrado');
    r[c] = vazio ? 0 : g ? g.children.length : -1;
  }
  return r;
});

const nDestinos = Object.keys(varredura).length;

// Trava contra cobertura silenciosa: se a varredura encontrar quase nada,
// é o teste que quebrou, não o site. Um teste que não testa precisa reprovar.
checa(
  nDestinos >= 10,
  'A varredura encontrou os destinos de menu',
  `${nDestinos} destinos`
);

for (const [cat, n] of Object.entries(varredura)) {
  checa(n > 0, `Coleção "${cat}" tem produtos`, `${n} cards`);
}

// ── 4b. Nenhum item de menu visível leva a lugar nenhum ────────────────────
secao('4b. Itens de menu que não abrem coleção');
const orfaos = await pagina.evaluate(() => {
  const vis = (e) => {
    const c = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return c.display !== 'none' && c.visibility !== 'hidden' &&
           c.opacity !== '0' && (r.width > 0 || r.height > 0);
  };
  // Itens visíveis de navegação que NÃO chamam openCollection nem filterCat.
  // Um item assim precisa ter um destino provado — senão é enfeite que frustra.
  const nav = [...document.querySelectorAll(
    '.nav-item, .mob-nav-link, .sub-link, .mob-sub-link, [class*=nav] a'
  )];
  return nav
    .filter(vis)
    .filter((e) => {
      const oc = e.getAttribute('onclick') || '';
      return !/openCollection|filterCat/.test(oc);
    })
    .map((e) => ({
      texto: (e.innerText || '').trim().slice(0, 30),
      acao: (e.getAttribute('onclick') || e.getAttribute('href') || '').slice(0, 50),
    }))
    .filter((x) => x.texto);
});

if (orfaos.length === 0) {
  ok('Todo item de menu visível abre uma coleção');
} else {
  for (const o of orfaos) {
    falhou(`Item de menu "${o.texto}" não abre coleção`, o.acao);
  }
}

// ── 5. Jornada de compra ───────────────────────────────────────────────────
secao('5. Jornada de compra');
const jornada = await pagina.evaluate(async () => {
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const cats = [...new Set(STILETTO_PRODUCTS.map((p) => p.categoria))];

  // procura um produto com cor que tenha tamanho disponível
  for (const cat of cats) {
    openCollection(cat);
    await esperar(400);
    const grid = document.querySelector('.collection-grid');
    if (!grid || !grid.children.length) continue;

    for (let i = 0; i < Math.min(grid.children.length, 5); i++) {
      grid.children[i].click();
      await esperar(700);

      const modal = document.getElementById('productModal');
      if (!modal || !modal.classList.contains('open')) {
        return { erro: 'modal não abriu' };
      }

      const cores = [...document.getElementById('pmColors').children];
      for (let c = 0; c < cores.length; c++) {
        cores[c].click();
        await esperar(350);
        const disp = [...document.getElementById('pmSizes').children]
          .filter((b) => !b.classList.contains('disabled'));
        if (!disp.length) continue;

        disp[0].click();
        await esperar(500);

        const nome = document.getElementById('pmName').innerText.trim();
        const tam = disp[0].innerText.trim();
        const btn = document.getElementById('pmAddBtn');
        const href = btn.getAttribute('href') || '';

        const prod = STILETTO_PRODUCTS.find((p) => p.nome === nome);
        let esperado = null;
        for (const [corNome, tams] of Object.entries(prod.estoque_por_cor || {})) {
          if (tams[tam] && href.includes(tams[tam].sku)) esperado = { corNome, ...tams[tam] };
        }

        addCurrentToSelection();
        await esperar(700);
        const gaveta = document.getElementById('cartBody').innerText;

        return {
          nome, tam, href,
          textoBotao: btn.innerText.trim(),
          skuBate: !!esperado,
          qtdEsperada: esperado ? esperado.qtd : null,
          gaveta,
          precoZero: /R\$\s*0,00/.test(gaveta),
        };
      }
      if (typeof closeProduct === 'function') closeProduct();
      await esperar(300);
    }
  }
  return { erro: 'nenhum produto com variação disponível encontrado' };
});

if (jornada.erro) {
  falhou('Jornada de compra', jornada.erro);
} else {
  ok('Produto aberto', `${jornada.nome} tam ${jornada.tam}`);
  checa(/COMPRAR/i.test(jornada.textoBotao), 'Botão de compra ativou', jornada.textoBotao);
  checa(jornada.href.includes(HOST_LOJA), 'Link aponta para a loja', jornada.href);
  checa(jornada.href.includes('?sku='), 'Link usa o parâmetro sku');
  checa(jornada.skuBate, 'O sku do link é o da combinação escolhida');
  checa(jornada.qtdEsperada > 0, 'A variação escolhida tem estoque', `qtd ${jornada.qtdEsperada}`);
  checa(!jornada.precoZero, 'A seleção não mostra R$ 0,00');
  checa(/·/.test(jornada.gaveta), 'A seleção mostra cor e tamanho',
    jornada.gaveta.replace(/\n+/g, ' ').slice(0, 80));
}

// ── 6. Texto visível ───────────────────────────────────────────────────────
secao('6. Texto da página');
const texto = await pagina.evaluate(() => document.body.innerText);
checa(!/\bnull\b/i.test(texto), 'Sem "null" no texto');
checa(!/A CONFIRMAR/i.test(texto), 'Sem marcador "A CONFIRMAR"');
checa(!/Sul e Sudeste/i.test(texto), 'Sem promessa de frete regional');

const ofertas = (texto.match(/\d+% ?OFF/gi) || []).filter((s) => !/^5% ?OFF$/i.test(s));
checa(ofertas.length === 0, 'Sem percentual de desconto inventado', ofertas.join(', ') || 'nenhum');

// ── Resultado ──────────────────────────────────────────────────────────────
await navegador.close();

console.log(`\n${'─'.repeat(56)}`);
if (falhas === 0) {
  console.log(`APROVADO — ${passos} verificações, nenhuma falha.`);
  process.exit(0);
} else {
  console.log(`REPROVADO — ${falhas} de ${passos} verificações falharam.`);
  console.log('Não commite enquanto houver falha.');
  process.exit(1);
}
