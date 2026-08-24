/**
 * BEDÊ Stiletto — Configuração Centralizada de Links da Loja
 * Plataforma: NUVEMSHOP (v32.1 — Hotfix Estancar 404)
 */

const LOJA_BASE = 'https://bedestiletto.lojavirtualnuvem.com.br';

const LINKS_LOJA = {
  // Rotas Nativas e Confirmadas da Nuvemshop
  loja:            LOJA_BASE + '/',
  todos:           LOJA_BASE + '/produtos/',
  carrinho:        LOJA_BASE + '/cart/',
  contato:         LOJA_BASE + '/contato/',
  novidades:       LOJA_BASE + '/produtos/?sort=date_desc',

  // PROVISÓRIO (HOTFIX ESTANCAR 404): Categorias apontam para /produtos/ enquanto URLs reais são verificadas
  scarpin:         LOJA_BASE + '/produtos/',
  bota:            LOJA_BASE + '/produtos/',
  mule:            LOJA_BASE + '/produtos/',
  mocassim:        LOJA_BASE + '/produtos/',
  tenis:           LOJA_BASE + '/produtos/',
  bolsa:           LOJA_BASE + '/produtos/',

  // Categorias Inativas no momento
  sandalia:        LOJA_BASE + '/produtos/',
  papete:          LOJA_BASE + '/produtos/',
  rasteirinha:     LOJA_BASE + '/rasteirinha/',
  slingback:       LOJA_BASE + '/slingback/',
  tamanco:         LOJA_BASE + '/tamanco/',
  sapatilha:       LOJA_BASE + '/sapatilha/',
  chinelo:         LOJA_BASE + '/chinelo/'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LOJA_BASE, LINKS_LOJA };
}
