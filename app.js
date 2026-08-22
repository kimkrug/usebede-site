/**
 * BEDÊ Stiletto — Arquitetura de Vitrine Única v30 (Padrão New Balance)
 * 
 * - Navegação direta para a loja wBuy (https://loja.usebede.com.br/)
 * - Seção de Silhuetas ("Descubra os Tipos")
 * - Curadoria de Destaques em trilho horizontal (Foto 1:1 contain, tipografia normal)
 * - Zero estado paralelo de sacola ou catálogo duplicado
 */

(() => {
  'use strict';

  // Curadoria manual de SKUs / IDs da loja wBuy
  const CURADORIA = {
    destaques: [
      '3325661', // Bota Capa Salto Bloco
      '3325664', // Sapato Patrícia
      '3325728', // Scarpin Alice
      '3431626', // Scarpin Luisa
      '3471933', // Sandália Cris
      '4349841', // Tamanco Tessi
      '3325662', // Bota Malha Cano Curto Salto Fino
      '3325663'  // Scarpin Ariana Verniz
    ],
    em_alta: [
      '3325665', // Sandália Lua
      '3325666', // Bota Sara Cano Longo
      '3325667', // Bota Coturno Priscila
      '3325668', // Sandália Scarlet
      '3325670', // Mochila Antifurto
      '3325671', // Scarpin Napa Fivela
      '3325672', // Slingback Alice
      '3325673'  // Tênis Animal
    ]
  };

  const CFG = (typeof CFG_LOJA !== 'undefined') ? CFG_LOJA : {
    dominioLoja: 'https://loja.usebede.com.br',
    whatsapp: '5551980150391',
    razaoSocial: 'Stiletto Bd Boutique Ltda',
    cnpj: '55.068.034/0001-00',
    endereco: 'Rua Cirurgião Vaz Ferreira, 457 · Centro · Viamão/RS',
    descontoPix: 5
  };

  const PRODUCTS = (typeof STILETTO_PRODUCTS !== 'undefined') ? STILETTO_PRODUCTS : [];

  function fmt(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // ============================================================
  // RENDERIZAÇÃO DOS DESTAQUES
  // ============================================================
  function renderDestaques(aba) {
    const rail = document.getElementById('destaquesRail');
    if (!rail) return;

    const ids = CURADORIA[aba] || CURADORIA.destaques;
    
    // Obter produtos da curadoria
    let prods = ids.map(id => PRODUCTS.find(p => String(p.id) === String(id))).filter(Boolean);
    
    // Fallback se não encontrar os IDs exatos
    if (!prods.length) {
      prods = PRODUCTS.slice(0, 8);
    }

    rail.innerHTML = prods.map(p => {
      let targetUrl = p.url_absolute || `${CFG.dominioLoja}/todos-produtos/`;
      if (CFG.dominioLoja) {
        targetUrl = targetUrl.replace(/^https?:\/\/[^\/]+/, CFG.dominioLoja);
      }

      // Formatando nome em Title Case / Natural (não em uppercase)
      const nomeFormatado = p.nome
        ? p.nome.toLowerCase().replace(/(?:^|\s|\/)\S/g, a => a.toUpperCase())
        : 'Produto BEDÊ';

      const precoNum = Number(p.preco || 0);

      return `
        <a href="${targetUrl}" class="destaque-card" title="${p.nome}">
          <div class="destaque-img-wrap">
            <img src="${p.foto}" alt="${p.nome}" class="destaque-img" loading="lazy">
          </div>
          <div class="destaque-info">
            <h3 class="destaque-name">${nomeFormatado}</h3>
            <span class="destaque-attr">${p.categoria || 'Calçados'}</span>
            <p class="destaque-price">${fmt(precoNum)}</p>
          </div>
        </a>
      `;
    }).join('');
  }

  window.switchDestaquesTab = function(aba, btn) {
    document.querySelectorAll('.d-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderDestaques(aba);
  };

  // ============================================================
  // MENU MOBILE
  // ============================================================
  window.toggleMobileMenu = function() {
    const drawer = document.getElementById('mobileDrawer');
    const ovl = document.getElementById('mobileDrawerOverlay');
    if (drawer && ovl) {
      drawer.classList.toggle('open');
      ovl.classList.toggle('open');
    }
  };

  window.closeMobileMenu = function() {
    const drawer = document.getElementById('mobileDrawer');
    const ovl = document.getElementById('mobileDrawerOverlay');
    if (drawer && ovl) {
      drawer.classList.remove('open');
      ovl.classList.remove('open');
    }
  };

  // ============================================================
  // GUIA DE MEDIDAS & MODAIS INSTITUCIONAIS
  // ============================================================
  window.openSizeGuide = function() {
    const ovl = document.getElementById('guideOverlay');
    if (ovl) ovl.classList.add('open');
  };

  window.closeSizeGuide = function() {
    const ovl = document.getElementById('guideOverlay');
    if (ovl) ovl.classList.remove('open');
  };

  window.openInstitutionalModal = function(tipo) {
    const ovl = document.getElementById('instOverlay');
    const title = document.getElementById('instTitle');
    const body = document.getElementById('instBody');
    if (!ovl || !title || !body) return;

    const conteudos = {
      sobre: {
        t: 'Sobre a BEDÊ',
        b: '<p>A <strong>BEDÊ</strong> nasceu com o propósito de unir o design contemporâneo ao conforto anatômico absoluto. Nossa curadoria seleciona couros nobres, acabamentos refinados e palmilhas acolchoadas para mulheres que exigem elegância em todos os passos.</p><p style="margin-top:10px;">Atendimento presencial em nosso showroom em Viamão/RS e envio expresso com entrega segura para todo o Brasil.</p>'
      },
      como_comprar: {
        t: 'Como Comprar',
        b: '<p>1. Navegue pelas silhuetas e selecione o modelo desejado.</p><p>2. Ao clicar no produto, você é direcionada para a nossa boutique oficial wBuy com estoque em tempo real.</p><p>3. Escolha sua numeração, insira o CEP e conclua seu pedido com PIX (5% OFF) ou Cartão de Crédito em até 6x sem juros.</p>'
      },
      trocas: {
        t: 'Trocas & Devoluções',
        b: '<p>Garantimos a <strong>1ª Troca Grátis</strong> em até 7 dias corridos após o recebimento do seu pedido.</p><p>Para solicitar, basta entrar em contato com nossa equipe pelo WhatsApp informando o número do seu pedido.</p>'
      },
      faq: {
        t: 'Perguntas Frequentes (FAQ)',
        b: '<p><strong>Como sei meu número ideal?</strong><br>Consulte nosso Guia de Medidas. A forma dos nossos calçados é padrão brasileira regular.</p><p style="margin-top:10px;"><strong>Qual o prazo de envio?</strong><br>Pedidos são postados em até 24h úteis após a confirmação de pagamento.</p>'
      },
      privacidade: {
        t: 'Política de Privacidade',
        b: '<p>Seus dados pessoais e de pagamento são protegidos por criptografia SSL de ponta a ponta e processados em ambiente 100% seguro com certificação Google Safe Browsing.</p>'
      },
      termos: {
        t: 'Termos de Uso & Compra',
        b: '<p>Todas as transações são intermediadas com total transparência pela plataforma oficial da BEDÊ (Stiletto Bd Boutique Ltda, CNPJ 55.068.034/0001-00).</p>'
      }
    };

    const c = conteudos[tipo] || conteudos.sobre;
    title.textContent = c.t;
    body.innerHTML = c.b;
    ovl.classList.add('open');
  };

  window.closeInstitutionalModal = function() {
    const ovl = document.getElementById('instOverlay');
    if (ovl) ovl.classList.remove('open');
  };

  // ============================================================
  // INICIALIZAÇÃO
  // ============================================================
  document.addEventListener('DOMContentLoaded', () => {
    // Renderizar Destaques na Home
    renderDestaques('destaques');

    // Preencher dados legais no rodapé
    const footWa = document.getElementById('footerWa');
    if (footWa && CFG.whatsapp) {
      footWa.href = `https://wa.me/${CFG.whatsapp}`;
    }
  });

})();
