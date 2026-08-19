/**
 * BEDE Stiletto — App Engine (byNV Blueprint)
 * Fullpage slider · Collection view · Product modal · Cart drawer
 */
(function () {
  'use strict';

  // ── STATE ──────────────────────────────────────────────────
  const S = {
    slide: 0,
    total: 4,
    busy: false,
    collOpen: false,
    filter: 'ALL',
    sizeFilter: 'ALL',
    colorFilter: 'ALL',
    priceFilter: 'ALL',
    searchQuery: '',
    product: null,
    size: null,
    cart: JSON.parse(localStorage.getItem('bede_cart') || '[]'),
    wishlist: JSON.parse(localStorage.getItem('bede_wishlist') || '[]')
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
  const CFG = (typeof CONFIG_LOJA !== 'undefined' && CONFIG_LOJA) ? CONFIG_LOJA : {
    freteGratisAcimaDe: 299,
    parcelamentoMax: 6,
    descontoPix: 5,
    primeiraTrocaGratisDias: 30,
    descontoMaxLiquidacao: 40,
    cnpj: '45.892.311/0001-80',
    whatsapp: '5551980150391',
    whatsappFormatado: '(51) 98015-0391',
    endereco: 'Rua Cirurgião Vaz Ferreira, 457 · Centro · Viamão/RS',
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
    pmWaBtn:    $('pmWaBtn'),
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

  // ── UTILS ──────────────────────────────────────────────────
  const fmt = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // ── INJEÇÃO DINÂMICA DE PROMESSAS COMERCIAIS ─────────────
  function aplicarConfigLoja() {
    // 1. Barra superior / Home
    const homeBar = $('homeBarClaims');
    if (homeBar) {
      homeBar.textContent = `Frete grátis acima de R$ ${CFG.freteGratisAcimaDe} · ${CFG.parcelamentoMax}x sem juros · ${CFG.descontoPix}% off no PIX`;
    }

    // 2. Gaveta Mobile
    const mobClaims = $('mobDrawerClaims');
    if (mobClaims) {
      mobClaims.textContent = `Boutique em Viamão · RS · ${CFG.parcelamentoMax}x sem juros`;
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
    const footLeg = $('footerLegal');
    if (footLeg) footLeg.textContent = `BEDÊ COMÉRCIO DE CALÇADOS E ACESSÓRIOS LTDA · CNPJ ${CFG.cnpj} · Viamão / RS`;

    // 6. Modal de Produto Perk
    const pmPerk = $('pmPerkTroca');
    if (pmPerk) {
      pmPerk.textContent = `Primeira Troca Grátis e Fácil em até ${CFG.primeiraTrocaGratisDias} Dias`;
    }

    // 7. Carrinho
    const cartPixLbl = $('cartPixLabel');
    if (cartPixLbl) cartPixLbl.textContent = `⚡ No PIX (${CFG.descontoPix}% OFF)`;
    const cartInstLbl = $('cartInstLabel');
    if (cartInstLbl) cartInstLbl.textContent = `Até ${CFG.parcelamentoMax}x sem juros`;
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

    D.track.style.transition = instant ? 'none' : 'transform 600ms cubic-bezier(0.25, 1, 0.5, 1)';
    D.track.style.transform = `translateY(-${idx * 100}%)`;

    if (idx === 0) {
      D.header.className = 'site-header ghost';
      if (D.logoImg) D.logoImg.src = 'assets/brand/logo_header_branco.svg';
    } else {
      D.header.className = 'site-header solid-light';
      if (D.logoImg) D.logoImg.src = 'assets/brand/logo_header_preto.svg';
    }

    D.dots.forEach((d, i) => d.classList.toggle('active', i === idx));
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
      renderGrid();
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

  // Reafirmação contínua de scroll com parada por estabilidade (10 frames consecutivos) e teto de 1500ms
  function fixarScroll(view, alvo, msMax = 1500) {
    const fim = performance.now() + msMax;
    let estavel = 0;
    const tick = () => {
      if (Math.abs(view.scrollTop - alvo) > 4) {
        view.scrollTop = alvo;
        estavel = 0;
      } else {
        estavel++;
      }
      // Para quando o alvo se manteve estável por 10 frames seguidos (~160ms) ou atingiu o tempo máximo
      if (estavel < 10 && performance.now() < fim) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  // Helper global para resetar o scroll para o topo da grade com a barra visível (à prova de corrida)
  window.resetCollectionScroll = function () {
    const view = (typeof D !== 'undefined' && D.collView) || document.getElementById('collectionView');
    if (!view) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const grid = document.querySelector('.collection-grid');
        const bar = document.querySelector('.collection-sticky-bar');
        if (!grid) {
          view.scrollTop = 0;
          return;
        }

        const barHeight = bar ? bar.offsetHeight : 0;
        const alvo = Math.max(0, grid.offsetTop - barHeight - 8);

        // Atribui instantâneo e reafirma continuamente até estabilizar
        view.scrollTop = alvo;
        fixarScroll(view, alvo, 1500);
      });
    });
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
      title: 'Special Sale · Até 40% OFF',
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
          <span class="p-card-inst">ou até 6x de R$ ${inst} sem juros</span>
        </div>`;
    }).join('');
  }

  // Ação rápida de comprar direto no card
  window.quickAddToCart = function (id) {
    const p = PRODUCTS.find(x => String(x.id) === String(id));
    if (!p) return;
    const defaultSize = (p.tamanhos && p.tamanhos[0]) || '36';
    addToCart(p, defaultSize);
    openCart();
  };

  // Mobile Accordion
  window.toggleMobAccordion = function (el) {
    if (!el) return;
    const parent = el.closest('.mob-accordion');
    if (parent) parent.classList.toggle('open');
  };

  // ============================================================
  // PRODUTO MODAL COM GALERIA DE THUMBNAILS & AVALIAÇÕES
  // ============================================================
  window.openProduct = function (id) {
    const p = PRODUCTS.find(x => String(x.id) === String(id));
    if (!p) return;
    S.product = p;
    S.size = (p.tamanhos && p.tamanhos[0]) || '36';

    const pr = Number(p.preco || 0);
    const old = Number(p.preco_antigo || pr * 1.25);

    D.pmImg.src = p.foto;
    D.pmImg.alt = p.nome;
    D.pmCat.textContent = p.categoria || 'Calçados';
    D.pmName.textContent = p.nome;
    D.pmPrice.textContent = fmt(pr);
    D.pmOld.textContent = fmt(old);
    D.pmPix.textContent = `⚡ ${fmt(pr * (1 - CFG.descontoPix / 100))} no PIX (${CFG.descontoPix}% OFF)`;
    D.pmInst.textContent = `ou ${CFG.parcelamentoMax}x de R$ ${(pr / CFG.parcelamentoMax).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} sem juros`;
    D.pmDesc.textContent = p.descricao || 'Acabamento artesanal nobre com palmilha anatômica e design contemporâneo.';

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

    const sizes = p.tamanhos || ['34','35','36','37','38','39','40'];
    D.pmSizes.innerHTML = sizes.map(s =>
      `<button class="sz-btn ${s === S.size ? 'active' : ''}" onclick="selectSize('${s}',this)">${s}</button>`
    ).join('');

    D.prodModal.classList.add('open');
  };

  window.switchProductPhoto = function (src, el) {
    if (D.pmImg) D.pmImg.src = src;
    document.querySelectorAll('.pm-thumb').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
  };

  window.closeProduct = function () {
    D.prodModal.classList.remove('open');
    S.product = null;
    if (!S.collOpen) D.header.classList.add('ghost');
  };

  window.selectSize = function (s, btn) {
    S.size = s;
    document.querySelectorAll('.sz-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
  };

  // Botões do produto
  D.pmAddBtn.addEventListener('click', () => {
    if (!S.product) return;
    addToCart(S.product, S.size);
    closeProduct();
    openCart();
  });

  D.pmWaBtn.addEventListener('click', () => {
    if (!S.product) return;
    const msg = encodeURIComponent(
      `Olá! Gostaria de atendimento para comprar o modelo:\n\n*${S.product.nome}* — Tamanho: *${S.size}* — *${fmt(S.product.preco)}*\n\nComo finalizamos o pagamento?`
    );
    window.open(`https://wa.me/${WA}?text=${msg}`, '_blank');
  });

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

  function setupCart() {
    if (D.cartBtn) D.cartBtn.addEventListener('click', openCart);
    if (D.cartOverlay) D.cartOverlay.addEventListener('click', closeCart);

    const checkoutBtn = document.getElementById('cartCheckout');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (!S.cart.length) return;
        const sub = S.cart.reduce((t, i) => t + i.price * i.qty, 0);
        let msg = `Olá! Gostaria de finalizar meu pedido — *BEDÊ Stiletto*:\n\n`;
        S.cart.forEach((it, i) => {
          msg += `${i + 1}. *${it.name}* (Tam: ${it.size}) × ${it.qty} — ${fmt(it.price * it.qty)}\n`;
        });
        msg += `\n*Total:* ${fmt(sub)}\n*No PIX (${CFG.descontoPix}% OFF):* ${fmt(sub * (1 - CFG.descontoPix / 100))}`;
        window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank');
      });
    }
  }

  window.openCart = function () {
    renderCart();
    D.cartOverlay.classList.add('open');
    D.cartDrawer.classList.add('open');
  };

  window.closeCart = function () {
    D.cartOverlay.classList.remove('open');
    D.cartDrawer.classList.remove('open');
  };

  function addToCart(p, size) {
    const ex = S.cart.find(i => i.id === p.id && i.size === size);
    if (ex) { ex.qty++; }
    else {
      S.cart.push({ id: p.id, name: p.nome, price: Number(p.preco || 0), img: p.foto, size: size || '36', qty: 1 });
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

  function saveCart() { localStorage.setItem('bede_cart', JSON.stringify(S.cart)); }

  function updateCartBadge() {
    const n = S.cart.reduce((t, i) => t + i.qty, 0);
    D.cartPill.textContent = n;
    const hasItems = n > 0;
    D.cartPill.classList.toggle('visible', hasItems);
    if (D.cartHead) D.cartHead.textContent = n;

    if (hasItems) {
      if (D.cartBtn) D.cartBtn.classList.add('cart-bump');
      if (D.cartPill) D.cartPill.classList.add('bump');
      setTimeout(() => {
        if (D.cartBtn) D.cartBtn.classList.remove('cart-bump');
        if (D.cartPill) D.cartPill.classList.remove('bump');
      }, 450);
    }
  }

  function renderCart() {
    const sub = S.cart.reduce((t, i) => t + i.price * i.qty, 0);
    const totalQty = S.cart.reduce((t, i) => t + i.qty, 0);
    if (D.cartSub) D.cartSub.textContent = fmt(sub);
    if (D.cartPix) D.cartPix.textContent = fmt(sub * (1 - CFG.descontoPix / 100));
    
    const sumCount = document.getElementById('cartSummaryCount');
    if (sumCount) {
      sumCount.textContent = `${totalQty} ${totalQty === 1 ? 'produto' : 'produtos'}`;
    }

    if (!S.cart.length) {
      D.cartBody.innerHTML = `
        <div style="text-align:center;padding:3.5rem 1rem;color:#888;">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" style="margin-bottom:12px;">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <p style="font-size:14px;font-weight:500;color:#000404;margin-bottom:4px;">Sua sacola está vazia</p>
          <p style="font-size:12px;font-weight:300;color:#888;">Explore nossa curadoria e adicione suas peças favoritas.</p>
        </div>`;
      return;
    }
    D.cartBody.innerHTML = S.cart.map((it, i) => `
      <div class="cart-item">
        <img class="cart-item-img" src="${it.img}" alt="${it.name}">
        <div class="cart-item-info">
          <p class="cart-item-name">${it.name}</p>
          <div class="cart-item-meta">
            <span>Tam: <strong>${it.size}</strong></span>
            <span>·</span>
            <span>Qtd: <strong>${it.qty}</strong></span>
          </div>
          <p class="cart-item-price">${fmt(it.price * it.qty)}</p>
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
  window.openSizeGuide = function () { D.guideOvl.classList.add('open'); };
  window.closeSizeGuide = function () { D.guideOvl.classList.remove('open'); };

  const instData = {
    sobre: {
      title: 'Sobre a BEDE',
      body: '<p style="margin-bottom:12px;">Fundada com o propósito de unir sofisticação atemporal e conforto absoluto, a <strong>BEDE</strong> nasceu da paixão familiar de Bruna, Jussara e Daniele em criar uma experiência única de moda feminina.</p><p style="margin-bottom:12px;">Nossa curadoria é minuciosa: selecionamos matérias-primas nobres, formas anatômicas e designs contemporâneos que acompanham a mulher moderna em todas as ocasiões.</p><p>Localizada em Viamão/RS, nossa boutique oferece atendimento personalizado, consultoria de estilo e envio para todo o Brasil.</p>'
    },
    privacidade: {
      title: 'Política de Privacidade',
      body: '<p style="margin-bottom:12px;">A <strong>BEDE</strong> valoriza e respeita a privacidade de suas clientes. Seus dados pessoais (como nome, endereço, e-mail e telefone) são coletados exclusivamente para o processamento de pedidos, entrega segura e atendimento personalizado.</p><p style="margin-bottom:12px;">Não comercializamos nem compartilhamos suas informações com terceiros, exceto com parceiros logísticos essenciais para a entrega de suas compras.</p><p>Em conformidade com a LGPD (Lei nº 13.709/2018), você pode solicitar a consulta ou exclusão de seus dados a qualquer momento pelo nosso canal de atendimento.</p>'
    },
    termos: {
      title: 'Termos de Uso',
      body: `<p style="margin-bottom:12px;">Ao navegar e comprar na boutique online da <strong>BEDE</strong>, você concorda com nossos termos e condições de compra, envio e garantia.</p><p style="margin-bottom:12px;"><strong>Pagamentos:</strong> Aceitamos PIX com ${CFG.descontoPix}% de desconto e parcelamento em até ${CFG.parcelamentoMax}x sem juros no cartão de crédito.</p><p style="margin-bottom:12px;"><strong>Trocas e Devoluções:</strong> Garantimos o direito de troca ou devolução em até 7 dias corridos após o recebimento do produto, em perfeito estado na embalagem original.</p><p>Todos os conteúdos, fotografias, logotipos e marcas presentes neste site são de propriedade exclusiva da BEDE.</p>`
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

  // ── START ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

})();
