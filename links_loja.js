/**
 * BEDÊ Stiletto — Configuração Centralizada de Links da Loja
 * Plataforma: NUVEMSHOP (v32 — URLs Definitivas de Categorias e Produtos)
 */

const LOJA_BASE = 'https://bedestiletto.lojavirtualnuvem.com.br';

const LINKS_LOJA = {
  // Rotas Nativas e Confirmadas da Nuvemshop
  loja:            LOJA_BASE + '/',
  todos:           LOJA_BASE + '/produtos/',
  carrinho:        LOJA_BASE + '/cart/',
  contato:         LOJA_BASE + '/contato/',
  novidades:       LOJA_BASE + '/produtos/?sort=date_desc',

  // Categorias Ativas (6 tipos com estoque real no catálogo v32)
  scarpin:         LOJA_BASE + '/scarpin/',
  bota:            LOJA_BASE + '/bota/',
  mule:            LOJA_BASE + '/mule/',
  mocassim:        LOJA_BASE + '/mocassim/',
  tenis:           LOJA_BASE + '/tenis/',
  bolsa:           LOJA_BASE + '/bolsa/',

  // Categorias Inativas no momento (aguardando novos produtos)
  sandalia:        LOJA_BASE + '/sandalia/',
  papete:          LOJA_BASE + '/papete/',
  rasteirinha:     LOJA_BASE + '/rasteirinha/',
  slingback:       LOJA_BASE + '/slingback/',
  tamanco:         LOJA_BASE + '/tamanco/',
  sapatilha:       LOJA_BASE + '/sapatilha/',
  chinelo:         LOJA_BASE + '/chinelo/'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LOJA_BASE, LINKS_LOJA };
}
