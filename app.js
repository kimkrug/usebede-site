/**
 * BEDE Stiletto — App Engine (byNV Blueprint)
 * Fullpage slider · Tipos section · Transition overlay · Modals
 */

// ── OVERLAY DE TRANSIÇÃO PARA wBUY ─────────────────────────────
// Intercepta qualquer navegação para loja.usebede.com.br e exibe
// um overlay BEDÊ por ~700ms antes de redirecionar — criando a
// ilusão de continuidade entre os dois domínios.
window.irParaLoja = function(url) {
  var ov = document.getElementById('pageTransition');
  if (!ov) { window.location.href = url; return; }
  ov.classList.add('active');
  setTimeout(function() {
    window.location.href = url;
  }, 750);
};
// ────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  function loadCart() {
    try {
      if (typeof localStorage === 'undefined') return [];
      // Limpeza de chave legada sem os campos novos
      if (localStorage.getItem('bede_cart')) {
        localStorage.removeItem('bede_cart');
      }
      const raw = localStorage.getItem('bede_cart_v2');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(item => 
        item &&
        typeof item.id !== 'undefined' &&
        item.name &&
        item.size &&
        item.cor &&
        typeof item.price === 'number' &&
        item.price > 0 &&
        typeof item.qty === 'number' &&
        item.qty > 0
      );
    } catch (e) {
      return [];
    }
  }

  // ── STATE ──────────────────────────────────────────────────
  const S = {
    slide: 0,
    total: 5,
    busy: false,
    collOpen: false,
    filter: 'ALL',
    sizeFilter: 'ALL',
    colorFilter: 'ALL',
    priceFilter: 'ALL',
    searchQuery: '',
    product: null,
    size: null,
    cart: loadCart(),
    wishlist: JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem('bede_wishlist')) || '[]')
  };

  // Filtro na origem: exclui inativos, registros vazios e produtos sem imagem
  const RAW_PRODUCTS = typeof STILETTO_PRODUCTS !== 'undefined' ? STILETTO_PRODUCTS : [];
  const PRODUCTS = RAW_PRODUCTS.filter(p => {
    const name = (p.nome || '').trim().toLowerCase();
    const isInactive = name === 'inativo' || name.startsWith('inativo') || name === '' || p.inativo === true || p.status === 'inativo' || p.ativo === false;
    const hasPhoto = !!p.foto && p.foto.trim() !== '';
    return !isInactive && hasPhoto;
  });
    // ── CONFIGURAÇÕES DA LOJA (LIDAS DE CONFIG_LOJA.JS) ───────
  const CFG_SRC = (typeof CFG_LOJA !== 'undefined' && CFG_LOJA) ? CFG_LOJA : (typeof CONFIG_LOJA !== 'undefined' ? CONFIG_LOJA : {});
  const CFG = {
    razaoSocial: CFG_SRC.razaoSocial || 'Stiletto Bd Boutique Ltda',
    cnpj: CFG_SRC.cnpj || '55.068.034/0001-00',
    nomeFantasia: CFG_SRC.nomeFantasia || 'BEDÊ',
    endereco: CFG_SRC.endereco || 'Rua Cirurgião Vaz Ferreira, 457 · Centro · Viamão/RS',
    whatsapp: CFG_SRC.whatsapp ? CFG_SRC.whatsapp.replace(/\D/g, '') : '5551980150391',
    whatsappFormatado: CFG_SRC.whatsapp || '(51) 98015-0391',
    descontoPix: CFG_SRC.descontoPix !== undefined ? CFG_SRC.descontoPix : 5,
    primeiraTrocaGratisDias: CFG_SRC.primeiraTrocaGratisDias !== undefined ? CFG_SRC.primeiraTrocaGratisDias : null,
    freteGratisAcimaDe: CFG_SRC.freteGratisAcimaDe !== undefined ? CFG_SRC.freteGratisAcimaDe : 449,
    freteGratisRegioes: CFG_SRC.freteGratisRegioes || [],
    freteGratisEstados: CFG_SRC.freteGratisEstados || [],
    parcelamentoMax: CFG_SRC.parcelamentoMax !== undefined ? CFG_SRC.parcelamentoMax : 6,
    dominioLoja: CFG_SRC.dominioLoja || 'https://loja.usebede.com.br',
    horario: 'Segunda a Sábado · 9h às 19h'
  };
  const WA = CFG.whatsapp;

  // ── DOM ────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const D = {
    stage:      $('viewportStage'),
    track:      $('slidesTrack'),
    header:     $('siteHeader'),
    logoImg:    $('logoImg'),
    dots:       document.querySelectorAll('.s-dot'),
    // Coleção, Banner & Barra Sticky
    collView:   $('collectionView'),
    collStickyBar: $('collStickyBar'),
    collTitle:  $('collectionTitle'),
    collBannerImg: $('collBannerImg'),
    collBannerEyebrow: $('collBannerEyebrow'),
    collBannerDesc: $('collBannerDesc'),
    collProductCount: $('collProductCount'),
    collGrid:   $('collectionGrid'),
    chips:      document.querySelectorAll('.f-chip'),
    btnClearFilters: $('btnClearFilters'),
    btnCondensedFilters: $('btnCondensedFilters'),
    activeFiltersBadge: $('activeFiltersBadge'),
    filtersDrawer: $('filtersDrawer'),
    filtersDrawerOverlay: $('filtersDrawerOverlay'),
    whatsappFloatBtn: document.querySelector('.whatsapp-float-btn'),
    // Busca
    headerSearchWrap: $('headerSearchWrap'),
    headerSearchExpand: $('headerSearchExpand'),
    headerSearchInput: $('headerSearchInput'),
    // Produto
    prodModal:  $('productModal'),
    pmImg:      $('pmImg'),
    pmThumbnails: $('pmThumbnails'),
    pmCat:      $('pmCat'),
    pmName:     $('pmName'),
    pmPrice:    $('pmPrice'),
    pmOld:      $('pmOld'),
    pmPix:      $('pmPix'),
    pmInst:     $('pmInst'),
    pmSizes:    $('pmSizes'),
    pmAddBtn:   $('pmAddBtn'),
    pmWaBtn:    $('pmWaDirectBtn'),
    pmDesc:     $('pmDesc'),
    // Cart
    cartOverlay:$('cartOverlay'),
    cartDrawer: $('cartDrawer'),
    cartPill:   $('cartPill'),
    cartHead:   $('cartCountHead'),
    cartBody:   $('cartBody'),
    cartSub:    $('cartSubtotal'),
    cartPix:    $('cartPix'),
    cartBtn:    $('cartBtn'),
    cartCheckout:$('cartCheckout'),
    // Wishlist
    wishlistPill: $('wishlistPill'),
    // Guia
    guideOvl:  $('guideOverlay')
  };

  const faltando = Object.entries(D).filter(([k, v]) => !v).map(([k]) => k);
  if (faltando.length) console.warn('[BEDÊ] elementos ausentes no HTML:', faltando);

  // ── UTILS ──────────────────────────────────────────────────
  const fmt = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // ── INJEÇÃO DINÂMICA DE PROMESSAS COMERCIAIS ─────────────
  function aplicarConfigLoja() {
    // 1. Barra superior / Home
    const homeBar = $('homeBarClaims');
    if (homeBar) {
      homeBar.textContent = CFG.parcelamentoMax
        ? `Frete grátis acima de R$ ${CFG.freteGratisAcimaDe} · até ${CFG.parcelamentoMax}x`
        : `Frete grátis acima de R$ ${CFG.freteGratisAcimaDe} · ⚡ ${CFG.descontoPix}% no PIX`;
    }

    // 2. Gaveta Mobile
    const mobClaims = $('mobDrawerClaims');
    if (mobClaims) {
      mobClaims.textContent = CFG.parcelamentoMax ? `Boutique em Viamão · RS · até ${CFG.parcelamentoMax}x sem juros` : `Boutique em Viamão · RS`;
    }
    const mobWa = $('mobDrawerWa');
    if (mobWa) {
      mobWa.href = `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent('Olá! Gostaria de um atendimento personalizado na BEDÊ.')}`;
    }

    // 3. Botão Flutuante WA
    const floatWa = $('floatingWaBtn');
    if (floatWa) {
      floatWa.href = `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent('Olá! Gostaria de um atendimento personalizado na BEDÊ Stiletto.')}`;
    }

    // 4. Slide 3 WA
    const slide3Wa = $('slide3WaBtn');
    if (slide3Wa) {
      slide3Wa.href = `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent('Olá! Gostaria de um atendimento personalizado na BEDÊ Stiletto.')}`;
    }

    // 5. Rodapé
    const footWa = $('footerWa');
    if (footWa) {
      footWa.textContent = `WhatsApp: ${CFG.whatsappFormatado || CFG.whatsapp}`;
      footWa.href = `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent('Olá! Gostaria de falar com a BEDÊ.')}`;
    }
    const footAddr = $('footerAddress');
    if (footAddr) footAddr.textContent = CFG.endereco;
    const footHor = $('footerHorario');
    if (footHor) footHor.textContent = CFG.horario;
    const footPix = $('footerPixTag');
    if (footPix) footPix.textContent = `PIX ${CFG.descontoPix}% OFF`;
    const footCartao = $('footerCartaoTag');
    if (footCartao) footCartao.textContent = CFG.parcelamentoMax ? `Cartão em até ${CFG.parcelamentoMax}x` : 'Cartão de Crédito';
    const footLeg = $('footerLegal');
    if (footLeg) footLeg.textContent = `${CFG.razaoSocial} · CNPJ ${CFG.cnpj} · ${CFG.endereco}`;

    // 6. Modal de Produto Perk
    const pmPerk = $('pmPerkTroca');
    if (pmPerk) {
      pmPerk.textContent = 'Troca facilitada pelo WhatsApp';
    }

    // 7. Carrinho
    const cartPixLbl = $('cartPixLabel');
    if (cartPixLbl) cartPixLbl.textContent = `⚡ No PIX (${CFG.descontoPix}% OFF)`;
    const cartInstLbl = $('cartInstLabel');
    if (cartInstLbl) {
      cartInstLbl.textContent = CFG.parcelamentoMax ? `Até ${CFG.parcelamentoMax}x sem juros` : '';
      cartInstLbl.style.display = CFG.parcelamentoMax ? '' : 'none';
    }
  }

  // ── INIT ───────────────────────────────────────────────────
  function init() {
    aplicarConfigLoja();
    setupSlider();
    setupCart();
    setupCollectionScroll();
    updateCartBadge();
    updateWishlistBadge();
    updateActiveFiltersBadge();
    updateSaleUI();
    renderMenus();
    goToSlide(0, true);
  }

  // ============================================================
  // FULLPAGE SLIDER — TRILHO VERTICAL CONTÍNUO (byNV EXACT)
  // ============================================================
  window.goToSlide = function (idx, instant) {
    if (S.collOpen) return;
    idx = Math.max(0, Math.min(S.total - 1, idx));
    if (idx === S.slide && !instant) return;
    if (S.busy && !instant) return;

    S.busy = true;
    S.slide = idx;

    if (D.track) {
      D.track.style.transition = instant ? 'none' : 'transform 600ms cubic-bezier(0.25, 1, 0.5, 1)';
      D.track.style.transform = `translateY(-${idx * 100}%)`;
    }

    if (D.header) {
      if (idx === 0) {
        D.header.className = 'site-header ghost';
        if (D.logoImg) D.logoImg.src = 'assets/brand/logo_header_branco.svg';
      } else {
        D.header.className = 'site-header solid-light';
        if (D.logoImg) D.logoImg.src = 'assets/brand/logo_header_preto.svg';
      }
    }

    if (D.dots) D.dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    setTimeout(() => { S.busy = false; }, instant ? 0 : 550);
  };

  function setupSlider() {
    window.addEventListener('wheel', e => {
      if (S.collOpen) return;
      e.preventDefault();
      if (S.busy) return;
      if (e.deltaY > 15) {
        goToSlide(S.slide + 1);
      } else if (e.deltaY < -15) {
        goToSlide(S.slide - 1);
      }
    }, { passive: false });

    let ty = 0;
    window.addEventListener('touchstart', e => {
      if (S.collOpen) return;
      ty = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', e => {
      if (S.collOpen) return;
      const dy = ty - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 35) {
        if (dy > 0) goToSlide(S.slide + 1);
        else goToSlide(S.slide - 1);
      }
    }, { passive: true });

    window.addEventListener('keydown', e => {
      if (S.collOpen) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goToSlide(S.slide + 1);
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goToSlide(S.slide - 1);
      }
    });
  }

  // ============================================================
  // BUSCA PROEMINENTE & EXPANSÍVEL NO HEADER
  // ============================================================
  window.toggleHeaderSearch = function () {
    const expand = document.getElementById('headerSearchExpand');
    const input = document.getElementById('headerSearchInput');
    if (!expand) return;
    const isOpen = expand.classList.toggle('open');
    if (isOpen && input) {
      input.focus();
    }
  };

  window.handleHeaderSearch = function (val) {
    S.searchQuery = (val || '').trim();
    if (!S.collOpen) {
      openCollection('ALL');
    } else {
      
    const saleMax = descontoMaximoReal(PRODUCTS);
    const saleHeadline = document.getElementById('saleHeadline');
    const saleSection = document.getElementById('saleSection');
    if (saleHeadline) {
      if (saleMax) {
        saleHeadline.textContent = `ATÉ ${saleMax}% OFF`;
        if (saleSection) saleSection.style.display = 'block';
      } else {
        saleHeadline.textContent = `LIQUIDAÇÃO`;
        // Se nenhum produto em promoção, oculta o banner numérico ou seção se configurado
      }
    }

    renderGrid();
    updateSaleUI();
    }
  };

  window.executeHeaderSearch = function () {
    if (!S.collOpen) openCollection('ALL');
  };

  window.clearHeaderSearch = function () {
    S.searchQuery = '';
    const input = document.getElementById('headerSearchInput');
    const expand = document.getElementById('headerSearchExpand');
    if (input) input.value = '';
    if (expand) expand.classList.remove('open');
    renderGrid();
  };

  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('headerSearchWrap');
    const expand = document.getElementById('headerSearchExpand');
    if (expand && wrap && !wrap.contains(e.target) && expand.classList.contains('open')) {
      if (!S.searchQuery) expand.classList.remove('open');
    }
  });

  // ============================================================
  // WISHLIST (FAVORITOS)
  // ============================================================
  window.isWishlisted = function (id) {
    return S.wishlist.includes(String(id));
  };

  window.toggleWishlist = function (id, btn) {
    id = String(id);
    const idx = S.wishlist.indexOf(id);
    if (idx > -1) {
      S.wishlist.splice(idx, 1);
      if (btn) btn.classList.remove('active');
    } else {
      S.wishlist.push(id);
      if (btn) btn.classList.add('active');
    }
    localStorage.setItem('bede_wishlist', JSON.stringify(S.wishlist));
    updateWishlistBadge();
    if (S.filter === 'WISHLIST') renderGrid();
  };

  function updateWishlistBadge() {
    if (!D.wishlistPill) return;
    const count = S.wishlist.length;
    D.wishlistPill.textContent = count;
    D.wishlistPill.style.display = count > 0 ? 'flex' : 'none';
  }

  window.openWishlist = function () {
    openCollection('WISHLIST');
  };

  // ============================================================
  // SCROLL DO OVERLAY — AUTO-HIDE DIRECIONAL & ESTADO CONDENSADO
  // ============================================================
  function setupCollectionScroll() {
    if (!D.collView) return;
    let lastY = 0;
    let ticking = false;

    D.collView.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = D.collView.scrollTop;
          const delta = currentY - lastY;
          const isDrawerOpen = D.filtersDrawer && D.filtersDrawer.classList.contains('open');

          // 1. Estado Condensado (scrollY > 120px) — Reduz barra para <= 64px em 1 linha
          if (D.collStickyBar) {
            D.collStickyBar.classList.toggle('is-condensed', currentY > 120);
          }

          // 2. Auto-hide direcional (scrollY > 200px)
          if (!isDrawerOpen) {
            const atBottom = (currentY + D.collView.clientHeight) >= (D.collView.scrollHeight - 50);

            if (currentY < 100 || atBottom) {
              if (D.collStickyBar) D.collStickyBar.classList.remove('is-hidden');
              if (D.whatsappFloatBtn) D.whatsappFloatBtn.classList.remove('is-hidden');
            } else if (Math.abs(delta) >= 8) {
              if (delta > 0 && currentY > 200) {
                // Rolando para baixo -> esconde barra sticky e botão WhatsApp
                if (D.collStickyBar) D.collStickyBar.classList.add('is-hidden');
                if (D.whatsappFloatBtn) D.whatsappFloatBtn.classList.add('is-hidden');
              } else if (delta < 0) {
                // Rolando para cima -> reaparece imediatamente
                if (D.collStickyBar) D.collStickyBar.classList.remove('is-hidden');
                if (D.whatsappFloatBtn) D.whatsappFloatBtn.classList.remove('is-hidden');
              }
            }
          }

          lastY = currentY;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    // Fechar drawer de filtros no teclado ESC
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && D.filtersDrawer && D.filtersDrawer.classList.contains('open')) {
        closeFiltersDrawer();
      }
    });
  }

  // ============================================================
  // DRAWER DE FILTROS & BADGE NUMÉRICO
  // ============================================================
  window.openFiltersDrawer = function () {
    if (!D.filtersDrawer || !D.filtersDrawerOverlay) return;
    D.filtersDrawerOverlay.classList.add('open');
    D.filtersDrawer.classList.add('open');
    D.filtersDrawerOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  window.closeFiltersDrawer = function () {
    if (!D.filtersDrawer || !D.filtersDrawerOverlay) return;
    D.filtersDrawerOverlay.classList.remove('open');
    D.filtersDrawer.classList.remove('open');
    D.filtersDrawerOverlay.setAttribute('aria-hidden', 'true');
    if (!S.collOpen) document.body.style.overflow = '';
  };

  // ── FIXAÇÃO DE SCROLL DINÂMICO POR ESTABILIDADE (TETO 1500ms) ─────────────
  function fixarScroll(view, alvo, msMax = 1500) {
    const fim = performance.now() + msMax;
    let estavel = 0;
    const tick = () => {
      const target = typeof alvo === 'function' ? alvo() : alvo;
      if (Math.abs(view.scrollTop - target) > 4) {
        view.scrollTop = target;
        estavel = 0;
      } else {
        estavel++;
      }
      if (estavel < 10 && performance.now() < fim) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  // Helper global para resetar o scroll para o topo da grade com a barra visível
  window.resetCollectionScroll = function () {
    const view = (typeof D !== 'undefined' && D.collView) || document.getElementById('collectionView');
    if (!view) return;

    const getAlvo = () => {
      const grid = document.querySelector('.collection-grid');
      const bar = document.querySelector('.collection-sticky-bar');
      if (!grid) return 0;
      const barHeight = bar ? bar.offsetHeight : 0;
      return Math.max(0, grid.offsetTop - barHeight - 8);
    };

    const targetAlvo = getAlvo();
    view.scrollTop = targetAlvo;
    fixarScroll(view, getAlvo, 1500);
  };

  function updateActiveFiltersBadge() {
    let count = 0;
    if (S.sizeFilter && S.sizeFilter !== 'ALL') count++;
    if (S.colorFilter && S.colorFilter !== 'ALL') count++;
    if (S.priceFilter && S.priceFilter !== 'ALL') count++;
    if (S.searchQuery) count++;

    if (D.activeFiltersBadge) {
      D.activeFiltersBadge.textContent = count;
      D.activeFiltersBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  // ============================================================
  // FILTROS MULTI-CRITÉRIO (TAMANHO, COR, PREÇO)
  // ============================================================
  window.setFilterSize = function (size, btn) {
    S.sizeFilter = size;
    document.querySelectorAll('#filterSizes .sz-filter-pill, #drawerSizes .sz-filter-pill').forEach(b => {
      const match = b.getAttribute('onclick')?.includes(`'${size}'`);
      b.classList.toggle('active', !!match);
    });
    updateActiveFiltersBadge();
    renderGrid();
    window.resetCollectionScroll();
  };

  window.setFilterColor = function (color, btn) {
    S.colorFilter = color;
    document.querySelectorAll('#filterColors .col-filter-pill, #drawerColors .col-filter-pill').forEach(b => {
      const match = b.getAttribute('onclick')?.includes(`'${color}'`);
      b.classList.toggle('active', !!match);
    });
    updateActiveFiltersBadge();
    renderGrid();
    window.resetCollectionScroll();
  };

  window.setFilterPrice = function (price, btn) {
    S.priceFilter = price;
    document.querySelectorAll('#filterPrices .prc-filter-pill, #drawerPrices .prc-filter-pill').forEach(b => {
      const match = b.getAttribute('onclick')?.includes(`'${price}'`);
      b.classList.toggle('active', !!match);
    });
    updateActiveFiltersBadge();
    renderGrid();
    window.resetCollectionScroll();
  };

  window.resetAllFilters = function () {
    S.sizeFilter = 'ALL';
    S.colorFilter = 'ALL';
    S.priceFilter = 'ALL';
    S.searchQuery = '';
    const searchInput = document.getElementById('headerSearchInput');
    if (searchInput) searchInput.value = '';

    document.querySelectorAll('#filterSizes .sz-filter-pill, #drawerSizes .sz-filter-pill').forEach((b, i) => {
      b.classList.toggle('active', b.getAttribute('onclick')?.includes("'ALL'"));
    });
    document.querySelectorAll('#filterColors .col-filter-pill, #drawerColors .col-filter-pill').forEach((b, i) => {
      b.classList.toggle('active', b.getAttribute('onclick')?.includes("'ALL'"));
    });
    document.querySelectorAll('#filterPrices .prc-filter-pill, #drawerPrices .prc-filter-pill').forEach((b, i) => {
      b.classList.toggle('active', b.getAttribute('onclick')?.includes("'ALL'"));
    });

    updateActiveFiltersBadge();
    renderGrid();
    window.resetCollectionScroll();
  };

  // ============================================================
  // COLEÇÃO / CATÁLOGO & BANNER EDITORIAL CONTEXTUAL
  // ============================================================
  const CATEGORY_META = {
    ALL: {
      title: 'Coleção Completa',
      eyebrow: 'Curadoria BEDÊ · Uso Real & Sofisticação',
      desc: 'Design autoral com palmilhas anatômicas de amortecimento contínuo e couros nobres selecionados.',
      img: 'assets/split_shoes.jpg?v=crop_v3'
    },
    NOVIDADES: {
      title: 'Novidades da Temporada',
      eyebrow: 'Lançamentos Exclusivos · Inverno 2026',
      desc: 'Silhuetas marcantes e recortes contemporâneos para elevar qualquer produção do dia à noite.',
      img: 'assets/split_shoes.jpg?v=crop_v3'
    },
    CALÇADOS: {
      title: 'Calçados Femininos',
      eyebrow: 'Sapataria Fina & Saltos Anatômicos',
      desc: 'Scarpins, sandálias, botas e mules com acabamento artesanal e conforto incomparável.',
      img: 'assets/split_shoes.jpg?v=crop_v3'
    },
    SCARPIN: {
      title: 'Scarpins & Saltos Nobres',
      eyebrow: 'Ateliê & Alfaiataria',
      desc: 'O clássico redesenhado para liberdade total de movimento e sofisticação atemporal.',
      img: 'assets/split_shoes.jpg?v=crop_v3'
    },
    SANDÁLIA: {
      title: 'Sandálias & Tiras Finas',
      eyebrow: 'Festa, Eventos & Alto Verão',
      desc: 'Tiras delicadas com firmeza impecável no calcanhar e estabilidade em cada passo.',
      img: 'assets/split_shoes.jpg?v=crop_v3'
    },
    BOTA: {
      title: 'Botas & Coturnos',
      eyebrow: 'Cano Curto, Médio e Longo',
      desc: 'Couros premium com solados anatômicos que combinam proteção, presença e imponência.',
      img: 'assets/split_editorial.jpg?v=showroom_v1'
    },
    'TÊNIS': {
      title: 'Tênis Urbanos & Casuais',
      eyebrow: 'Design Cosmopolita & Conforto Máximo',
      desc: 'Solados macios e couros selecionados para um caminhar elegante em qualquer ocasião.',
      img: 'assets/split_shoes.jpg?v=crop_v3'
    },
    MOCASSIM: {
      title: 'Mocassins & Loafers',
      eyebrow: 'Elegância Contemporânea & Praticidade',
      desc: 'Estrutura flexível e forração macia para um caminhar leve e cosmopolita.',
      img: 'assets/split_shoes.jpg?v=crop_v3'
    },
    MULE: {
      title: 'Mules & Tamancos',
      eyebrow: 'Calce Fácil & Charme Imediato',
      desc: 'Praticidade com o refinamento característico da silhueta BEDÊ.',
      img: 'assets/split_shoes.jpg?v=crop_v3'
    },
    SLINGBACK: {
      title: 'Slingbacks & Calcanhar Aberto',
      eyebrow: 'Silhueta Feminina & Conforto de Ateliê',
      desc: 'Tiras traseiras anatômicas com saltos estruturados para estabilidade impecável.',
      img: 'assets/split_shoes.jpg?v=crop_v3'
    },
    SAPATILHA: {
      title: 'Sapatilhas Finas',
      eyebrow: 'Clássicos do Dia a Dia',
      desc: 'Bicos estruturados e almofadados internos para o máximo aconchego aos pés.',
      img: 'assets/split_shoes.jpg?v=crop_v3'
    },
    BOLSA: {
      title: 'Bolsas & Acessórios',
      eyebrow: 'Couro Autêntico & Metais Nobres',
      desc: 'Bolsas estruturadas, tiracolos e totes com divisórias funcionais para o cotidiano exigente.',
      img: 'assets/split_bags.jpg?v=crop_v3'
    },
    'LIQUIDAÇÃO': {
      title: 'Special Sale · Liquidação',
      eyebrow: 'Oportunidades Especiais de Curadoria',
      desc: 'Peças selecionadas com condições exclusivas e a mesma excelência de acabamento.',
      img: 'assets/split_editorial.jpg?v=showroom_v1'
    },
    WISHLIST: {
      title: 'Minha Lista de Desejos',
      eyebrow: 'Seus Favoritos Salvos',
      desc: 'Suas peças prediletas salvas para consultar ou enviar diretamente para a consultora no WhatsApp.',
      img: 'assets/split_shoes.jpg?v=crop_v3'
    }
  };

  window.openCollection = function (cat) {
    S.filter = cat || 'ALL';
    S.collOpen = true;
    document.body.style.overflow = 'hidden';
    D.header.classList.remove('ghost');
    if (D.logoImg) D.logoImg.src = 'assets/brand/logo_header_preto.svg';

    const meta = CATEGORY_META[cat] || CATEGORY_META.ALL;
    if (D.collTitle) D.collTitle.textContent = meta.title;
    if (D.collBannerEyebrow) D.collBannerEyebrow.textContent = meta.eyebrow;
    if (D.collBannerDesc) D.collBannerDesc.textContent = meta.desc;
    if (D.collBannerImg) D.collBannerImg.src = meta.img;

    // Sincronizar chips
    D.chips.forEach(c => {
      const chipCat = c.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] || 'ALL';
      c.classList.toggle('active', chipCat === cat);
    });

    renderGrid();
    D.collView.classList.add('active');
    D.collView.scrollTop = 0;
  };

  window.closeCollection = function () {
    S.collOpen = false;
    document.body.style.overflow = '';
    D.collView.classList.remove('active');
    closeFiltersDrawer();
    
    if (S.slide === 0) {
      D.header.className = 'site-header ghost';
      if (D.logoImg) D.logoImg.src = 'assets/brand/logo_header_branco.svg';
    } else {
      D.header.className = 'site-header solid-light';
      if (D.logoImg) D.logoImg.src = 'assets/brand/logo_header_preto.svg';
    }
  };

  window.filterCat = function (cat, btn) {
    S.filter = cat;
    document.querySelectorAll('.f-chip').forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const meta = CATEGORY_META[cat] || CATEGORY_META.ALL;
    if (D.collTitle) D.collTitle.textContent = meta.title;
    if (D.collBannerEyebrow) D.collBannerEyebrow.textContent = meta.eyebrow;
    if (D.collBannerDesc) D.collBannerDesc.textContent = meta.desc;
    if (D.collBannerImg) D.collBannerImg.src = meta.img;

    renderGrid();
    window.resetCollectionScroll();
  };

  // ============================================================
  // RENDER GRID COM FILTROS MULTI-CRITÉRIO & HOVER ZOOM DUAL IMAGE
  // ============================================================
  function renderGrid() {
    let list = PRODUCTS;
    const f = (S.filter || 'ALL').toUpperCase();

    // 1. Filtro de Categoria
    if (f === 'NOVIDADES') {
      list = list.filter(p => p.novidade);
    } else if (f === 'CALÇADOS') {
      list = list.filter(p => !(p.categoria || '').toUpperCase().includes('BOLSA'));
    } else if (f === 'BOTA') {
      list = list.filter(p => (p.categoria || '').toUpperCase().includes('BOTA') || (p.categoria || '').toUpperCase().includes('COTURNO'));
    } else if (f === 'TÊNIS' || f === 'TENIS') {
      list = list.filter(p => (p.categoria || '').toUpperCase().includes('TÊNIS') || (p.categoria || '').toUpperCase().includes('TENIS'));
    } else if (f === 'LIQUIDAÇÃO') {
      list = list.filter(p => p.preco_antigo && Number(p.preco_antigo) > Number(p.preco));
    } else if (f === 'WISHLIST') {
      list = list.filter(p => S.wishlist.includes(String(p.id)));
    } else if (f !== 'ALL') {
      list = list.filter(p => (p.categoria || '').toUpperCase().includes(f));
    }

    // 2. Filtro de Numeração / Tamanho
    if (S.sizeFilter && S.sizeFilter !== 'ALL') {
      list = list.filter(p => (p.tamanhos || []).includes(S.sizeFilter));
    }

    // 3. Filtro de Cor / Tonalidade
    if (S.colorFilter && S.colorFilter !== 'ALL') {
      const targetCol = S.colorFilter.toUpperCase();
      list = list.filter(p => {
        const fullText = ((p.nome || '') + ' ' + (p.descricao || '') + ' ' + (p.categoria || '')).toUpperCase();
        return fullText.includes(targetCol);
      });
    }

    // 4. Filtro de Faixa de Preço
    if (S.priceFilter && S.priceFilter !== 'ALL') {
      if (S.priceFilter === 'ATE200') {
        list = list.filter(p => Number(p.preco || 0) <= 200);
      } else if (S.priceFilter === '200A350') {
        list = list.filter(p => Number(p.preco || 0) > 200 && Number(p.preco || 0) <= 350);
      } else if (S.priceFilter === 'ACIMA350') {
        list = list.filter(p => Number(p.preco || 0) > 350);
      }
    }

    // 5. Busca por texto livre
    if (S.searchQuery) {
      const q = S.searchQuery.toUpperCase();
      list = list.filter(p => {
        const fullText = ((p.nome || '') + ' ' + (p.descricao || '') + ' ' + (p.categoria || '')).toUpperCase();
        return fullText.includes(q);
      });
    }

    // Atualizar contador e botão de limpar filtros
    const hasActiveSubFilters = S.sizeFilter !== 'ALL' || S.colorFilter !== 'ALL' || S.priceFilter !== 'ALL' || S.searchQuery;
    if (D.btnClearFilters) D.btnClearFilters.style.display = hasActiveSubFilters ? 'inline-flex' : 'none';
    if (D.collProductCount) {
      D.collProductCount.textContent = `${list.length} ${list.length === 1 ? 'modelo encontrado' : 'modelos encontrados'}`;
    }

    if (!list.length) {
      D.collGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:4rem 1rem;color:#777;">
          <p style="font-size:16px;font-weight:500;margin-bottom:8px;color:#000404;">
            Nenhum produto encontrado com os filtros selecionados.
          </p>
          <p style="font-size:13px;font-weight:300;color:#888;">
            Tente remover alguns filtros para visualizar mais modelos da coleção.
          </p>
          <button onclick="resetAllFilters()" style="margin-top:18px;padding:10px 22px;background:#000404;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;">Limpar Todos os Filtros</button>
        </div>`;
      return;
    }

    D.collGrid.innerHTML = list.map(p => {
      const pr = Number(p.preco || 0);
      const old = Number(p.preco_antigo || 0);
      const inst = (pr / 6).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      const pix = (pr * 0.95).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      const sizes = p.tamanhos || ['34','35','36','37','38','39'];
      const isFav = isWishlisted(p.id);

      // Foto primária e secundária (alternância suave de ângulo no hover)
      const primaryPhoto = p.foto;
      const secondaryPhoto = (p.fotos && p.fotos.length > 1) ? p.fotos[1] : primaryPhoto;

      return `
        <div class="p-card" onclick="openProduct('${p.id}')">
          <div class="p-card-img loading">
            <img class="p-img-primary" src="${primaryPhoto}" alt="${p.nome}" loading="lazy" onload="this.parentElement.classList.remove('loading')" onerror="this.onerror=null;this.closest('.p-card')?.classList.add('img-fallback');this.style.display='none';">
            ${secondaryPhoto !== primaryPhoto ? `<img class="p-img-secondary" src="${secondaryPhoto}" alt="${p.nome} - uso" loading="lazy" onerror="this.remove()">` : ''}
            
            <button class="p-card-wish-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation();toggleWishlist('${p.id}', this)" title="${isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}" aria-label="Favoritar">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
            <div class="p-card-actions">
              <button class="p-card-quickview" onclick="event.stopPropagation();openProduct('${p.id}')">Ver Rápido</button>
              <button class="p-card-quickadd" onclick="event.stopPropagation();quickAddToCart('${p.id}')">Comprar</button>
            </div>
          </div>
          
          <span class="p-card-cat">${p.categoria || 'Calçados'}</span>
          <p class="p-card-name">${p.nome}</p>

          <div class="p-card-sizes">
            ${sizes.map(s => `<span class="sz-pill">${s}</span>`).join('')}
          </div>

          <div class="p-card-price-row">
            <span class="p-card-price">${fmt(pr)}</span>
            ${old > pr ? `<span class="p-card-old">${fmt(old)}</span>` : ''}
          </div>
          
          <span class="p-card-pix">⚡ R$ ${pix} no PIX (5% OFF)</span>
          ${CFG.parcelamentoMax ? `<span class="p-card-inst">ou até ${CFG.parcelamentoMax}x de R$ ${(pr / CFG.parcelamentoMax).toFixed(2)}</span>` : ''}
        </div>`;
    }).join('');
  }

  // Ação rápida de comprar direto no card
  window.quickAddToCart = function (id) {
    const p = PRODUCTS.find(x => String(x.id) === String(id));
    if (!p) return;
    const defaultColor = (p.cores && p.cores[0]) || 'Única';
    const defaultSize = (p.tamanhos && p.tamanhos[0]) || '36';
    addToCart(p, defaultSize, defaultColor);
    openCart();
  };

  // Mobile Accordion
  window.toggleMobAccordion = function (el) {
    if (!el) return;
    const parent = el.closest('.mob-accordion');
    if (parent) parent.classList.toggle('open');
  };

  // ============================================================
  
  // ============================================================
  // PRODUTO MODAL COM SELEÇÃO DE COR, TAMANHO E DEEP-LINK WBUY
  // ============================================================
  window.updateVariationUI = function() {
    const p = S.product;
    if (!p) return;
    
    // 1. Fotos por cor
    if (S.selectedColor && p.fotos_por_cor && p.fotos_por_cor[S.selectedColor] && p.fotos_por_cor[S.selectedColor].length > 0) {
      D.pmImg.src = p.fotos_por_cor[S.selectedColor][0];
    } else if (p.foto) {
      D.pmImg.src = p.foto;
    }
    
    // 2. Cores (Color pills)
    const colContainer = document.getElementById('pmColors');
    if (colContainer && p.cores) {
      let colHtml = '';
      p.cores.forEach(c => {
        const isActive = (S.selectedColor === c);
        colHtml += `<span class="col-pill ${isActive ? 'active' : ''}" 
          onclick="selectColor('${c}', this)">
          ${c}
        </span>`;
      });
      colContainer.innerHTML = colHtml;
      colContainer.style.display = p.cores.length > 0 ? 'flex' : 'none';
    }
    
    // 3. Tamanhos (Size pills - recalcula disponibilidade para a cor selecionada)
    const szContainer = document.getElementById('pmSizes');
    if (szContainer && p.tamanhos) {
      let szHtml = '';
      p.tamanhos.forEach(sz => {
        let isAvailable = true;
        let idVar = null;
        
        if (S.selectedColor && p.estoque_por_cor && p.estoque_por_cor[S.selectedColor]) {
          const varData = p.estoque_por_cor[S.selectedColor][sz];
          if (!varData || Number(varData.qtd || 0) <= 0) {
            isAvailable = false;
          } else {
            idVar = varData.id_variacao;
          }
        }
        
        const isActive = (S.size === sz && isAvailable);
        const isDisabled = !isAvailable;
        
        szHtml += `<span class="sz-pill ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''}" 
          onclick="selectSize('${sz}', this)">
          ${sz}
        </span>`;
      });
      szContainer.innerHTML = szHtml;
    }
    
    // 4. Montar Deep Link WBuy com id_variacao (Esconder se for catálogo antigo sem url_absolute)
    const btnBuy = document.getElementById('pmAddBtn');
    if (btnBuy) {
      if (!p.url_absolute || !p.estoque_por_cor) {
        // Catálogo antigo (v10 Etapa 3): Oculta o botão 'Comprar agora' para evitar duplicação do botão de WhatsApp
        btnBuy.style.display = 'none';
        btnBuy.onclick = null;
      } else {
        let idVar = null;
        let urlVar = null;
        if (S.selectedColor && S.size && p.estoque_por_cor && p.estoque_por_cor[S.selectedColor]) {
          const v = p.estoque_por_cor[S.selectedColor][S.size];
          if (v && Number(v.qtd || 0) > 0) {
            idVar = v.id_variacao;
            urlVar = v.url_variacao || (v.sku ? (p.url_absolute + "?sku=" + v.sku) : p.url_absolute);
          }
        }
        
        if (p.url_absolute && S.selectedColor && S.size && (urlVar || idVar)) {
          let targetUrl = urlVar || p.url_absolute;
          if (typeof CFG_LOJA !== 'undefined' && CFG_LOJA.dominioLoja) {
            targetUrl = targetUrl.replace(/^https?:\/\/[^\/]+/, CFG_LOJA.dominioLoja);
          }
          btnBuy.href = targetUrl;
          btnBuy.style.display = 'flex';
          btnBuy.style.opacity = '1';
          btnBuy.style.pointerEvents = 'auto';
          btnBuy.textContent = 'Comprar agora';
          btnBuy.onclick = function (e) {
            e.preventDefault();
            const vData = (p.estoque_por_cor && p.estoque_por_cor[S.selectedColor]) ? p.estoque_por_cor[S.selectedColor][S.size] : null;
            const sku = vData ? vData.sku : null;
            if (!sku) {
              window.location.href = targetUrl;
              return;
            }
            btnBuy.textContent = 'Levando para o checkout...';
            btnBuy.style.opacity = '0.85';
            btnBuy.style.pointerEvents = 'none';
            enviarParaLoja([{
              sku: sku,
              qty: 1,
              name: p.nome,
              size: S.size,
              cor: S.selectedColor,
              price: p.preco
            }], btnBuy);
          };
        } else {
          btnBuy.href = 'javascript:void(0)';
          btnBuy.style.display = 'flex';
          btnBuy.style.opacity = '0.5';
          btnBuy.style.pointerEvents = 'none';
          btnBuy.textContent = 'Selecione cor e tamanho';
          btnBuy.onclick = null;
        }
      }
    }
  };

  window.openProduct = function (id) {
    const p = PRODUCTS.find(x => String(x.id) === String(id));
    if (!p) return;
    S.product = p;
    S.size = null;
    S.selectedColor = null;
    
    // Auto-seleciona cor se houver apenas uma
    if (p.cores && p.cores.length === 1) {
      S.selectedColor = p.cores[0];
    }

    const pr = Number(p.preco || 0);
    const old = Number(p.preco_antigo || 0);

    D.pmImg.src = p.foto;
    D.pmImg.alt = p.nome;
    D.pmCat.textContent = p.categoria || 'Calçados';
    D.pmName.textContent = p.nome;
    D.pmPrice.textContent = fmt(pr);
    
    if (old > pr) {
      D.pmOld.textContent = fmt(old);
      D.pmOld.style.display = 'inline';
    } else {
      D.pmOld.style.display = 'none';
    }

    if (D.pmPix) D.pmPix.style.display = 'none';
    if (D.pmInst) D.pmInst.style.display = 'none';

    D.pmDesc.textContent = p.descricao || 'Acabamento artesanal nobre com palmilha anatômica e design contemporâneo.';

    updateVariationUI();

    // Gerenciamento de Avaliações Reais (AVALIACOES.js)
    const revSection = $('pmReviewsSection');
    const ratingBadge = $('pmRatingBadge');
    const revList = $('pmReviewsList');
    const revStatBadge = $('pmRevStatBadge');
    const reviews = (typeof AVALIACOES !== 'undefined' && Array.isArray(AVALIACOES)) ? AVALIACOES : [];

    if (!reviews.length) {
      if (revSection) revSection.style.display = 'none';
      if (ratingBadge) ratingBadge.style.display = 'none';
      if (revList) revList.innerHTML = '';
    } else {
      if (revSection) revSection.style.display = 'block';
      if (ratingBadge) ratingBadge.style.display = 'inline-flex';
      
      const avg = (reviews.reduce((acc, r) => acc + Number(r.nota || 5), 0) / reviews.length).toFixed(1);
      const stars = '★'.repeat(Math.round(avg)) + '☆'.repeat(Math.max(0, 5 - Math.round(avg)));
      
      if (ratingBadge) {
        ratingBadge.title = `${avg} de 5 baseado em ${reviews.length} avaliações`;
        ratingBadge.innerHTML = `<span class="pm-rating-stars">${stars}</span><span class="pm-rating-score">${avg}</span>`;
      }
      
      if (revStatBadge) {
        const recCount = reviews.filter(r => r.recomenda === true).length;
        const recHtml = (recCount > 0) ? `<span class="pm-rev-rec">${Math.round((recCount / reviews.length) * 100)}% recomendam</span>` : '';
        revStatBadge.innerHTML = `
          <span class="pm-rev-big-score">${avg}</span>
          <div class="pm-rev-stat-info">
            <span class="pm-rev-stars">${stars}</span>
            ${recHtml}
          </div>
        `;
      }
      
      if (revList) {
        revList.innerHTML = reviews.map(r => `
          <div class="pm-review-card">
            <div class="pm-review-top">
              <div class="pm-reviewer-info">
                <span class="pm-reviewer-name">${r.nome || 'Cliente'}</span>
                ${r.verificada ? '<span class="pm-reviewer-verified">✓ Compra Verificada</span>' : ''}
              </div>
              <span class="pm-review-date">${r.data || ''}</span>
            </div>
            <div class="pm-review-rating">${'★'.repeat(Number(r.nota || 5))}</div>
            <p class="pm-review-text">"${r.texto || ''}"</p>
            ${r.tamanho ? `<span class="pm-review-tag">Tamanho: ${r.tamanho}</span>` : ''}
          </div>
        `).join('');
      }
    }

    // Galeria de miniaturas de fotos (contextuais / still / detalhes)
    const allPhotos = (p.fotos && p.fotos.length > 0) ? p.fotos : [p.foto];
    if (D.pmThumbnails) {
      if (allPhotos.length > 1) {
        D.pmThumbnails.style.display = 'flex';
        D.pmThumbnails.innerHTML = allPhotos.map((f, i) => `
          <div class="pm-thumb ${i === 0 ? 'active' : ''}" onclick="switchProductPhoto('${f}', this)">
            <img src="${f}" alt="${p.nome} - miniatura ${i + 1}">
          </div>
        `).join('');
      } else {
        D.pmThumbnails.style.display = 'none';
      }
    }

    if (D.prodModal) D.prodModal.classList.add('open');
  };

  window.switchProductPhoto = function (src, el) {
    if (D.pmImg) D.pmImg.src = src;
    document.querySelectorAll('.pm-thumb').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
  };

  window.closeProduct = function () {
    if (D.prodModal) D.prodModal.classList.remove('open');
    S.product = null;
    if (!S.collOpen && D.header) D.header.classList.add('ghost');
  };

  window.selectColor = function (c, btn) {
    S.selectedColor = c;
    S.size = null;
    updateVariationUI();
  };

  window.selectSize = function (s, btn) {
    if (btn && btn.classList.contains('disabled')) return;
    S.size = s;
    updateVariationUI();
  };

  window.addCurrentToSelection = function () {
    const p = S.product;
    if (!p) return;
    if (!S.size) {
      alert('Selecione cor e tamanho');
      return;
    }
    addToCart(p, S.size, S.selectedColor);
    closeProduct();
    openCart();
  };

  if (D.pmWaBtn) {
    D.pmWaBtn.addEventListener('click', () => {
      if (!S.product) return;
      const size = S.size || 'Não informada';
      const cor = S.selectedColor || 'Única';
      const msg = encodeURIComponent(
        `Olá! Gostaria de atendimento para comprar o modelo:\n\n*${S.product.nome}*\nCor: *${cor}* — Tamanho: *${size}* — *${fmt(S.product.preco)}*\n\nComo finalizamos o pagamento?`
      );
      window.open(`https://wa.me/${WA}?text=${msg}`, '_blank');
    });
  }

  // ============================================================
  // CARRINHO & CONTA
  // ============================================================
  window.toggleAccountMenu = function (e) {
    if (e) e.stopPropagation();
    const pop = document.getElementById('accountPopover');
    if (pop) pop.classList.toggle('open');
  };

  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('accountMenuWrapper');
    const pop = document.getElementById('accountPopover');
    if (pop && wrap && !wrap.contains(e.target)) {
      pop.classList.remove('open');
    }
  });

  /**
   * =========================================================================
   * ENVIAR SELEÇÃO DO SITE PARA O CARRINHO DA LOJA WBUY
   * =========================================================================
   * 
   * ARQUITETURA & MOTIVAÇÃO TÉCNICA:
   * 
   * 1. CORS & FORM SUBMISSION:
   *    O endpoint /shop_func.php da wBuy não suporta requisições fetch/XHR
   *    diretas de origens cruzadas por ausência de headers CORS permissivos.
   *    No entanto, envios de <form method="POST"> com target para um <iframe>
   *    oculto contornam o bloqueio de CORS do navegador.
   * 
   * 2. COOKIES DE MESMO SITE (eTLD+1):
   *    Como o site (www.usebede.com.br) e a loja (loja.usebede.com.br)
   *    compartilham o domínio raiz "usebede.com.br", os cookies de sessão da
   *    loja trafegam com os formulários POST sem serem classificados como
   *    cookies de terceiros (Third-Party Cookies).
   * 
   * 3. CONTRATO DO ENDPOINT WBUY:
   *    POST https://loja.usebede.com.br/shop_func.php
   *    - funcao=adicionar_produto
   *    - sku={sku}
   *    - quantidade={qty}
   *    - campo_anotacao=
   *    - evento_tipo=
   *    Cada requisição adiciona 1 SKU. O envio é sequencial com espaçamento.
   * 
   * 4. DEPENDÊNCIA:
   *    Este mecanismo depende exclusivamente de ambos os subdomínios estarem sob
   *    usebede.com.br. Caso a loja mude de domínio base no futuro, a estratégia
   *    deverá ser reavaliada.
   * =========================================================================
   */
  async function enviarParaLoja(itens, triggerBtn) {
    const LOJA = CFG.dominioLoja || 'https://loja.usebede.com.br';
    const btn = triggerBtn || document.getElementById('cartCheckoutLoja');

    // Validação estrita: enviar apenas SKUs reais que existem no catálogo carregado
    const validos = (itens || []).filter(it => {
      if (!it.sku) return false;
      return PRODUCTS.some(p => {
        if (!p.estoque_por_cor) return false;
        return Object.values(p.estoque_por_cor).some(tams =>
          Object.values(tams).some(v => v.sku === it.sku)
        );
      });
    });

    if (!validos.length) {
      window.location.href = LOJA + '/carrinho/';
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.classList.add('loading');
      btn.style.opacity = '0.85';
      btn.style.cursor = 'wait';
      btn.style.pointerEvents = 'none';
    }

    const ifr = document.createElement('iframe');
    ifr.name = 'wbuySacola';
    ifr.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;visibility:hidden;opacity:0;pointer-events:none;';
    document.body.appendChild(ifr);

    function enviarUm(sku, qtd) {
      return new Promise(resolve => {
        const f = document.createElement('form');
        f.method = 'POST';
        f.action = LOJA + '/shop_func.php';
        f.target = 'wbuySacola';

        const campo = (n, v) => {
          const i = document.createElement('input');
          i.type = 'hidden';
          i.name = n;
          i.value = v;
          f.appendChild(i);
        };

        campo('funcao', 'adicionar_produto');
        campo('sku', sku);
        campo('quantidade', String(qtd || 1));
        campo('campo_anotacao', '');
        campo('evento_tipo', '');
        document.body.appendChild(f);

        let resolvido = false;
        const pronto = () => {
          if (resolvido) return;
          resolvido = true;
          f.remove();
          setTimeout(resolve, 500); // Fôlego entre requisições para persistência da sessão wBuy
        };

        ifr.onload = pronto;
        f.submit();
        setTimeout(pronto, 2500); // Fallback de segurança caso onload não dispare
      });
    }

    try {
      const total = validos.length;
      for (let i = 0; i < total; i++) {
        const it = validos[i];
        if (btn) {
          btn.textContent = `Enviando ${i + 1} de ${total}...`;
        }
        await enviarUm(it.sku, it.qty || 1);
      }

      if (btn) {
        btn.textContent = 'Levando sua seleção para o checkout...';
      }
      const disc = document.getElementById('cartDisclaimer');
      if (disc) {
        disc.textContent = 'Confira sua sacola na próxima tela — o estoque é confirmado lá.';
        disc.style.display = 'block';
      }

      // Mudança 1 — A gaveta esvazia depois do envio (único carrinho na loja)
      S.cart = [];
      saveCart();
      updateCartBadge();
      try {
        localStorage.setItem('bede_enviado_em', String(Date.now()));
      } catch (e) {}

      await new Promise(r => setTimeout(r, 600));
    } catch (e) {
      console.error('[BEDÊ] Erro no envio da seleção para a loja:', e);
    } finally {
      if (ifr.parentNode) ifr.parentNode.removeChild(ifr);
      window.location.href = LOJA + '/carrinho/';
    }
  }

  function setupCart() {
    if (D.cartBtn) D.cartBtn.addEventListener('click', openCart);
    if (D.cartOverlay) D.cartOverlay.addEventListener('click', closeCart);

    // 1. Botão Principal: Finalizar compra na loja wBuy
    const checkoutLojaBtn = document.getElementById('cartCheckoutLoja');
    if (checkoutLojaBtn) {
      checkoutLojaBtn.addEventListener('click', () => {
        if (!S.cart.length) return;
        enviarParaLoja(S.cart);
      });
    }

    // 2. Botão Secundário: Falar com Consultora no WhatsApp
    const checkoutWaBtn = document.getElementById('cartCheckoutWa') || document.getElementById('cartCheckout');
    if (checkoutWaBtn) {
      checkoutWaBtn.addEventListener('click', () => {
        if (!S.cart.length) return;
        let msg = `Olá! Gostaria de enviar a minha seleção da vitrine BEDÊ:\n\n`;
        S.cart.forEach((it, i) => {
          msg += `*${i + 1}. ${it.name}*\n`;
          msg += `Cor: ${it.cor} | Tam: ${it.size} | Qtd: ${it.qty} | Valor: ${fmt(it.price * it.qty)}`;
          if (it.sku || it.idVar) {
            msg += ` (Cód: ${it.sku || it.idVar})`;
          }
          msg += `\n\n`;
        });
        const total = S.cart.reduce((acc, it) => acc + (it.price * it.qty), 0);
        msg += `*Total estimado:* ${fmt(total)}\n\n`;
        msg += "Poderiam confirmar a disponibilidade e os valores por favor?";
        window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank');
      });
    }
  }

  window.openCart = function () {
    renderCart();
    if (D.cartOverlay) D.cartOverlay.classList.add('open');
    if (D.cartDrawer) D.cartDrawer.classList.add('open');
  };

  window.closeCart = function () {
    if (D.cartOverlay) D.cartOverlay.classList.remove('open');
    if (D.cartDrawer) D.cartDrawer.classList.remove('open');
  };

  function addToCart(p, size, cor) {
    try {
      localStorage.removeItem('bede_enviado_em');
    } catch (e) {}

    const selectedColor = cor || S.selectedColor || 'Única';
    const selectedSize = size || S.size || '36';
    let idVar = null;
    let sku = null;
    if (p.estoque_por_cor && p.estoque_por_cor[selectedColor] && p.estoque_por_cor[selectedColor][selectedSize]) {
      const vData = p.estoque_por_cor[selectedColor][selectedSize];
      idVar = vData.id_variacao || null;
      sku = vData.sku || null;
    }
    const priceNum = Number(p.preco || 0);

    const ex = S.cart.find(i => i.id === p.id && i.size === selectedSize && i.cor === selectedColor);
    if (ex) {
      ex.qty++;
    } else {
      S.cart.push({
        id: p.id,
        name: p.nome,
        img: p.foto,
        size: selectedSize,
        cor: selectedColor,
        price: priceNum,
        idVar: idVar,
        sku: sku,
        qty: 1
      });
    }
    saveCart();
    updateCartBadge();
  }

  window.removeItem = function (idx) {
    S.cart.splice(idx, 1);
    saveCart();
    updateCartBadge();
    renderCart();
  };

  function saveCart() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bede_cart_v2', JSON.stringify(S.cart));
      }
    } catch (e) {}
  }

  function updateCartBadge() {
    const n = S.cart.reduce((t, i) => t + i.qty, 0);
    if (D.cartPill) {
      D.cartPill.textContent = n;
      const hasItems = n > 0;
      D.cartPill.classList.toggle('visible', hasItems);
    }
    if (D.cartHead) D.cartHead.textContent = n;

    if (n > 0) {
      if (D.cartBtn) D.cartBtn.classList.add('cart-bump');
      if (D.cartPill) D.cartPill.classList.add('bump');
      setTimeout(() => {
        if (D.cartBtn) D.cartBtn.classList.remove('cart-bump');
        if (D.cartPill) D.cartPill.classList.remove('bump');
      }, 450);
    }
  }

  function renderCart() {
    const sub = S.cart.reduce((t, i) => t + (Number(i.price) || 0) * i.qty, 0);
    const totalQty = S.cart.reduce((t, i) => t + i.qty, 0);
    if (D.cartSub) D.cartSub.textContent = fmt(sub);
    if (D.cartPix) D.cartPix.textContent = fmt(sub * (1 - CFG.descontoPix / 100));
    
    const sumCount = document.getElementById('cartSummaryCount');
    if (sumCount) {
      sumCount.textContent = `${totalQty} ${totalQty === 1 ? 'produto' : 'produtos'}`;
    }

    if (!D.cartBody) return;

    if (!S.cart.length) {
      const foot = document.querySelector('.cart-foot');
      if (foot) foot.style.display = 'none';

      let enviadoRecente = false;
      try {
        const rawEnviado = localStorage.getItem('bede_enviado_em');
        if (rawEnviado) {
          const t = Number(rawEnviado);
          // Válido se enviado nas últimas 12 horas
          if (Date.now() - t < 12 * 3600 * 1000) {
            enviadoRecente = true;
          }
        }
      } catch (e) {}

      if (enviadoRecente) {
        const LOJA = CFG.dominioLoja || 'https://loja.usebede.com.br';
        D.cartBody.innerHTML = `
          <div style="text-align:center;padding:2.5rem 1rem;color:#000404;">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#000404" stroke-width="1.5" style="margin-bottom:14px;">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p style="font-size:15px;font-weight:600;color:#000404;margin-bottom:8px;letter-spacing:0.02em;">Sua seleção foi enviada para a loja.</p>
            <p style="font-size:12px;font-weight:300;color:#737378;margin-bottom:24px;line-height:1.5;">O estoque e o pagamento são confirmados diretamente no carrinho da boutique.</p>
            <div style="display:flex;flex-direction:column;gap:10px;max-width:280px;margin:0 auto;">
              <a href="${LOJA}/carrinho/" class="btn-solid-pill" style="display:block;text-decoration:none;text-align:center;">
                Ver minha sacola na loja &rarr;
              </a>
              <button class="btn-outline-pill" onclick="closeCart()">
                Continuar navegando
              </button>
            </div>
          </div>`;
        return;
      }

      D.cartBody.innerHTML = `
        <div style="text-align:center;padding:3.5rem 1rem;color:#888;">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" style="margin-bottom:12px;">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <p style="font-size:14px;font-weight:500;color:#000404;margin-bottom:4px;">Sua seleção está vazia</p>
          <p style="font-size:12px;font-weight:300;color:#888;">Explore nossa curadoria e adicione suas peças favoritas.</p>
        </div>`;
      return;
    }

    const foot = document.querySelector('.cart-foot');
    if (foot) foot.style.display = 'block';
    const disc = document.getElementById('cartDisclaimer');
    if (disc) disc.style.display = 'none';

    D.cartBody.innerHTML = S.cart.map((it, i) => `
      <div class="cart-item">
        <img class="cart-item-img" src="${it.img}" alt="${it.name}">
        <div class="cart-item-info">
          <p class="cart-item-name">${it.name}</p>
          <div class="cart-item-meta">
            <span>${it.cor} · Tam: <strong>${it.size}</strong></span>
            <span>·</span>
            <span>Qtd: <strong>${it.qty}</strong></span>
          </div>
          <p class="cart-item-price">${fmt((Number(it.price) || 0) * it.qty)}</p>
        </div>
        <button class="cart-item-remove" onclick="removeItem(${i})" aria-label="Remover item" title="Remover">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>`
    ).join('');
  }

  // ============================================================
  // GUIA DE MEDIDAS & MODAIS INSTITUCIONAIS
  // ============================================================
  window.openSizeGuide = function () { if (D.guideOvl) D.guideOvl.classList.add('open'); };
  window.closeSizeGuide = function () { if (D.guideOvl) D.guideOvl.classList.remove('open'); };

    const instData = {
    sobre: {
      title: 'Sobre a BEDÊ Stiletto',
      body: `
        <div style="text-align:center;margin-bottom:18px;">
          <img src="assets/hero_fachada_loja_bede.jpg" alt="Boutique BEDÊ em Viamão" style="width:100%;max-height:220px;object-fit:cover;border-radius:8px;margin-bottom:12px;" onerror="this.style.display='none'">
        </div>
        <p style="margin-bottom:14px;line-height:1.6;">Fundada com o propósito de unir elegância atemporal, curadoria refinada e conforto absoluto, a <strong>BEDÊ Stiletto</strong> nasceu da dedicação familiar em criar uma experiência única de calçados e acessórios femininos.</p>
        <p style="margin-bottom:14px;line-height:1.6;">Nossa boutique física está localizada no coração de Viamão/RS. Cada modelo é selecionado cuidadosamente para valorizar o estilo da mulher contemporânea em todas as ocasiões, desde o dia a dia até momentos especiais.</p>
        <div style="background:var(--color-surface,#f8f8f8);padding:14px 16px;border-radius:8px;border-left:3px solid var(--color-text,#111);margin-top:16px;">
          <p style="margin:0;font-size:13px;color:var(--color-muted,#666);"><strong>Boutique Física:</strong> Rua Cirurgião Vaz Ferreira, 457 · Centro · Viamão/RS<br><strong>Atendimento:</strong> Segunda a Sábado · 9h às 19h</p>
        </div>
      `
    },
    como_comprar: {
      title: 'Como Comprar',
      body: `
        <p style="margin-bottom:14px;line-height:1.6;">Comprar na <strong>BEDÊ</strong> é simples, seguro e com atendimento personalizado direto pelo WhatsApp:</p>
        <ol style="margin-left:20px;margin-bottom:18px;line-height:1.7;">
          <li style="margin-bottom:10px;"><strong>Navegue pelo Catálogo:</strong> Escolha seus sapatos ou bolsas favoritos e selecione sua numeração.</li>
          <li style="margin-bottom:10px;"><strong>Monte sua Sacola:</strong> Adicione os produtos desejados à sacola de compras.</li>
          <li style="margin-bottom:10px;"><strong>Atendimento no WhatsApp:</strong> Clique em <em>"Fechar Pedido"</em>. Você será direcionada para falar diretamente com nossa consultora.</li>
          <li style="margin-bottom:10px;"><strong>Confirmação e Pagamento:</strong> Confirmamos o estoque, tiramos dúvidas sobre o calce e enviamos o link de pagamento seguro (PIX ou Cartão de Crédito).</li>
          <li><strong>Envio ou Retirada:</strong> Seu pedido é embalado com carinho e enviado para seu endereço ou disponibilizado para retirada na boutique.</li>
        </ol>
        <div style="background:var(--color-surface,#f8f8f8);padding:12px 16px;border-radius:8px;text-align:center;">
          <span style="font-size:13px;font-weight:600;">⚡ Precisa de ajuda com numeração? Fale com a consultora pelo WhatsApp!</span>
        </div>
      `
    },
    trocas: {
      title: 'Trocas & Devoluções',
      body: `
        <p style="margin-bottom:14px;line-height:1.6;">Nosso compromisso é com a sua total satisfação. Se você precisar trocar ou devolver seu calçado, o processo é ágil e humanizado:</p>
        <ul style="margin-left:20px;margin-bottom:16px;line-height:1.7;">
          <li style="margin-bottom:8px;"><strong>Direito de Devolução / Arrependimento:</strong> Até 7 dias corridos após o recebimento, conforme o Código de Defesa do Consumidor.</li>
          <li style="margin-bottom:8px;"><strong>Troca Facilitada:</strong> Solicitação feita diretamente pelo nosso canal de atendimento no WhatsApp.</li>
          <li style="margin-bottom:8px;"><strong>Condições do Produto:</strong> O calçado deve estar sem sinais de uso, em perfeito estado, com etiqueta e na embalagem original da BEDÊ.</li>
        </ul>
        <p style="margin-bottom:14px;line-height:1.6;">Para solicitar sua troca, basta enviar uma mensagem no nosso WhatsApp informando o número do pedido ou seu nome completo.</p>
      `
    },
    faq: {
      title: 'Perguntas Frequentes (FAQ)',
      body: `
        <div style="display:flex;flex-direction:column;gap:16px;line-height:1.6;">
          <div>
            <h5 style="margin:0 0 4px 0;font-size:15px;color:var(--color-text,#111);">1. Como escolher a minha numeração?</h5>
            <p style="margin:0;font-size:14px;color:var(--color-muted,#555);">Nossos calçados seguem a fôrma padrão brasileira. Você pode consultar nosso Guia de Medidas no site ou chamar nossa consultora no WhatsApp para orientações sobre o calce específico de cada modelo.</p>
          </div>
          <div>
            <h5 style="margin:0 0 4px 0;font-size:15px;color:var(--color-text,#111);">2. Quais são as formas de pagamento?</h5>
            <p style="margin:0;font-size:14px;color:var(--color-muted,#555);">Aceitamos PIX com ${CFG.descontoPix}% de desconto${CFG.parcelamentoMax ? ` e Cartão de Crédito em até ${CFG.parcelamentoMax}x sem juros` : ''}.</p>
          </div>
          <div>
            <h5 style="margin:0 0 4px 0;font-size:15px;color:var(--color-text,#111);">3. Qual é o prazo de entrega?</h5>
            <p style="margin:0;font-size:14px;color:var(--color-muted,#555);">O prazo de entrega é informado no fechamento do pedido, conforme o CEP de entrega. Compras acima de R$ 449 têm frete grátis.</p>
          </div>
          <div>
            <h5 style="margin:0 0 4px 0;font-size:15px;color:var(--color-text,#111);">4. Posso retirar meu pedido na loja física?</h5>
            <p style="margin:0;font-size:14px;color:var(--color-muted,#555);">Sim! Você pode fazer o pedido pelo site/WhatsApp e retirar diretamente na nossa boutique em Viamão/RS sem nenhum custo de frete.</p>
          </div>
        </div>
      `
    },
    privacidade: {
      title: 'Política de Privacidade',
      body: `
        <p style="margin-bottom:14px;line-height:1.6;">A <strong>Stiletto Bd Boutique Ltda</strong> valoriza e respeita a privacidade de suas clientes. Seus dados pessoais (nome, telefone, endereço e e-mail) são tratados com total sigilo e proteção, em conformidade com a LGPD (Lei Geral de Proteção de Dados - Lei nº 13.709/2018).</p>
        <p style="margin-bottom:14px;line-height:1.6;"><strong>Uso das Informações:</strong> Seus dados são utilizados estritamente para o processamento de pedidos, entrega segura e atendimento de suporte via WhatsApp.</p>
        <p style="margin-bottom:14px;line-height:1.6;"><strong>Compartilhamento:</strong> Não comercializamos nem repassamos seus dados a terceiros, exceto com parceiros logísticos indispensáveis para a entrega de suas compras.</p>
        <p style="margin-bottom:14px;line-height:1.6;">Você tem o direito de solicitar a confirmação, correção ou exclusão definitiva de seus dados cadastrais a qualquer momento através do nosso canal oficial de atendimento.</p>
        <div style="font-size:12px;color:var(--color-muted,#777);margin-top:16px;border-top:1px solid var(--color-border,#eee);padding-top:10px;">
          ${CFG.razaoSocial} · CNPJ ${CFG.cnpj} · ${CFG.endereco}
        </div>
      `
    },
    termos: {
      title: 'Termos de Compra e Uso',
      body: `
        <p style="margin-bottom:12px;line-height:1.6;">Ao navegar e realizar compras na boutique da <strong>BEDÊ</strong>, você concorda com nossos termos e condições gerais de atendimento e comercialização.</p>
        <p style="margin-bottom:12px;line-height:1.6;"><strong>Pagamentos:</strong> Aceitamos PIX com ${CFG.descontoPix}% de desconto${CFG.parcelamentoMax ? ` e parcelamento no cartão em até ${CFG.parcelamentoMax}x sem juros` : ''}.</p>
        <p style="margin-bottom:12px;line-height:1.6;"><strong>Disponibilidade:</strong> Nossos produtos possuem estoque limitado por numeração. Em caso de indisponibilidade simultânea, nossa equipe entrará em contato imediato para substituição ou estorno integral.</p>
        <p style="margin-bottom:12px;line-height:1.6;"><strong>Propriedade Intelectual:</strong> Todos os logotipos, fotografias, textos e marcas presentes neste site são de propriedade exclusiva da BEDÊ.</p>
      `
    }
  };

  window.openInstitutionalModal = function (type) {
    const data = instData[type];
    if (!data) return;
    const titleEl = document.getElementById('instTitle');
    const bodyEl = document.getElementById('instBody');
    const overlay = document.getElementById('instOverlay');
    if (titleEl) titleEl.textContent = data.title;
    if (bodyEl) bodyEl.innerHTML = data.body;
    if (overlay) overlay.classList.add('open');
  };

  window.closeInstitutionalModal = function () {
    const overlay = document.getElementById('instOverlay');
    if (overlay) overlay.classList.remove('open');
  };

  // ============================================================
  // MENU MOBILE (HAMBURGER DRAWER)
  // ============================================================
  window.toggleMobileMenu = function () {
    const drawer = document.getElementById('mobileDrawer');
    const ovl = document.getElementById('mobileDrawerOverlay');
    if (drawer && drawer.classList.contains('open')) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  };

  window.openMobileMenu = function () {
    const drawer = document.getElementById('mobileDrawer');
    const ovl = document.getElementById('mobileDrawerOverlay');
    if (drawer) drawer.classList.add('open');
    if (ovl) ovl.classList.add('open');
  };

  window.closeMobileMenu = function () {
    const drawer = document.getElementById('mobileDrawer');
    const ovl = document.getElementById('mobileDrawerOverlay');
    if (drawer) drawer.classList.remove('open');
    if (ovl) ovl.classList.remove('open');
  };


  // ============================================================
  // MENUS DINÂMICOS — chips, dropdown desktop e gaveta mobile
  // Gerados a partir das categorias presentes em PRODUCTS.
  // NUNCA editar as listas no HTML diretamente.
  // ============================================================
  const MENU_NAV = [
    { key: 'SCARPIN',            label: 'Scarpins & Saltos',    group: 'calcados' },
    { key: 'BOTA',               label: 'Botas & Coturnos',     group: 'calcados' },
    { key: 'SANDÁLIA',           label: 'Sandálias & Festa',    group: 'calcados' },
    { key: 'PAPETE',             label: 'Papetes & Rasteiras',  group: 'calcados' },
    { key: 'MOCASSIM',           label: 'Mocassins & Loafers',  group: 'calcados' },
    { key: 'MULE',               label: 'Mules & Tamancos',     group: 'calcados' },
    { key: 'TÊNIS',              label: 'Tênis Contemporâneos', group: 'calcados' },
    { key: 'SLINGBACK',          label: 'Slingbacks',           group: 'calcados' },
    { key: 'SAPATILHA',          label: 'Sapatilhas',           group: 'calcados' },
    { key: 'CHINELO',            label: 'Chinelos',             group: 'calcados' },
    { key: 'RASTEIRINHA',        label: 'Rasteirinhas',         group: 'calcados' },
    { key: 'TAMANCO',            label: 'Tamancos',             group: 'calcados' },
    { key: 'BOLSA',              label: 'Bolsas & Acessórios',  group: 'bolsas'   }
  ];

  function hasProductsForKey(key) {
    return PRODUCTS.some(p => {
      const cat = (p.categoria || '').toUpperCase();
      if (key === 'BOTA') return cat.includes('BOTA') || cat.includes('COTURNO');
      if (key === 'TÊNIS') return cat.includes('TÊNIS') || cat.includes('TENIS');
      return cat.includes(key.toUpperCase());
    });
  }

  function renderMenus() {
    const activeNav = MENU_NAV.filter(item => hasProductsForKey(item.key));

    // — Chips de categoria (barra de filtros na vitrine) —
    const chipsContainer = document.getElementById('filterChips');
    if (chipsContainer) {
      let html = `<button class="f-chip active" onclick="filterCat('ALL',this)">Todos</button>`;
      activeNav.forEach(item => {
        html += `<button class="f-chip" onclick="filterCat('${item.key}',this)">${item.label}</button>`;
      });
      // Liquidação: só aparece se existir produto com preco_antigo real
      const temLiquidacao = PRODUCTS.some(p => p.preco_antigo && Number(p.preco_antigo) > Number(p.preco));
      if (temLiquidacao) {
        html += `<button class="f-chip" id="chipLiquidacao" onclick="filterCat('LIQUIDAÇÃO',this)">Sale / Off</button>`;
      }
      chipsContainer.innerHTML = html;
    }

    // — Dropdown do desktop (submenu Calçados no header) —
    const desktopSubMenu = document.getElementById('desktopSubMenu');
    if (desktopSubMenu) {
      const calcadoItems = activeNav.filter(i => i.group === 'calcados');
      const bolsaItems   = activeNav.filter(i => i.group === 'bolsas');
      let html = `<a href="#" onclick="openCollection('CALÇADOS');return false;" class="sub-link view-all-link">Ver Todos os Calçados</a>`;
      calcadoItems.forEach(item => {
        html += `<a href="#" onclick="openCollection('${item.key}');return false;" class="sub-link">${item.label}</a>`;
      });
      bolsaItems.forEach(item => {
        html += `<a href="#" onclick="openCollection('${item.key}');return false;" class="sub-link">${item.label}</a>`;
      });
      desktopSubMenu.innerHTML = html;
    }

    // — Gaveta mobile (accordion de Calçados) —
    const mobSub = document.getElementById('mobSubCategories');
    if (mobSub) {
      let html = `<a href="#" onclick="openCollection('CALÇADOS');closeMobileMenu();return false;" class="mob-sub-link highlight">Ver Todos os Calçados</a>`;
      activeNav.forEach(item => {
        html += `<a href="#" onclick="openCollection('${item.key}');closeMobileMenu();return false;" class="mob-sub-link">${item.label}</a>`;
      });
      mobSub.innerHTML = html;
    }
  }

  // ── START ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

  window.buyViaWhatsAppDirect = function() {
  const p = S.product;
  if (!p) return;
  const size = S.size || 'Não informada';
  const cor = S.selectedColor || 'Única';
  const WA = (typeof CFG !== 'undefined' && CFG.whatsapp) ? CFG.whatsapp : '5551980150391';
  let msg = `Olá! Gostaria de falar com uma consultora sobre o produto:\n\n*${p.nome}*\nCor: ${cor}\nTamanho: ${size}\n\nPoderiam me atender?`;
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank');
};

  
  window.descontoMaximoReal = function(produtos) {
    const descontos = (produtos || [])
      .filter(p => p.preco_antigo && Number(p.preco_antigo) > Number(p.preco))
      .map(p => (Number(p.preco_antigo) - Number(p.preco)) / Number(p.preco_antigo) * 100);
    if (!descontos.length) return null;
    return Math.floor(Math.max(...descontos) / 5) * 5;
  };

  
;

  window.updateSaleUI = function() {
    const saleMax = descontoMaximoReal(PRODUCTS);
    const temPromo = (saleMax !== null);

    // 1. Menu do topo (Desktop)
    const navSale = document.getElementById('navSaleItem') || document.querySelector('.sale-tag');
    if (navSale) navSale.style.display = temPromo ? '' : 'none';

    // 2. Menu da gaveta (Mobile)
    const mobNavSale = document.getElementById('mobNavSaleItem') || document.querySelector('.mob-nav-link.highlight');
    if (mobNavSale) mobNavSale.style.display = temPromo ? '' : 'none';

    // 3. Slide 2: Seção e botão "Ver Liquidação"
    const saleSection = document.getElementById('saleSection') || document.querySelector('.split-hero-sale');
    if (saleSection) saleSection.style.display = temPromo ? '' : 'none';

    const slideSaleBtn = document.getElementById('slideSaleBtn');
    if (slideSaleBtn) slideSaleBtn.style.display = temPromo ? '' : 'none';

    const saleHeadline = document.getElementById('saleHeadline');
    if (saleHeadline && temPromo) {
      saleHeadline.textContent = `ATÉ ${saleMax}% OFF`;
    }

    const mobSaleHeadline = document.getElementById('mobSaleHeadline');
    if (mobSaleHeadline) {
      mobSaleHeadline.textContent = temPromo ? `Special Sale (Até ${saleMax}% OFF)` : 'Special Sale';
    }

    // 4. Chip de filtro
    const chipSale = document.getElementById('chipLiquidacao') || document.querySelector('[onclick*="LIQUIDA"]');
    if (chipSale) chipSale.style.display = temPromo ? '' : 'none';

    // 5. Dot do carrossel para o Slide 2 (Liquidação)
    const dots = document.querySelectorAll('.s-dot');
    if (dots && dots[2]) dots[2].style.display = temPromo ? '' : 'none';
  };

})();
