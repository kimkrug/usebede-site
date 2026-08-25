/**
 * BEDÊ Stiletto — Configuração Centralizada de Links da Loja
 * Plataforma: NUVEMSHOP (v32.2 — Categorias Definitivas e Vínculo Confirmado)
 */

const LOJA_BASE = 'https://loja.usebede.com.br';

const LINKS_LOJA = {
  // Rotas Nativas e Confirmadas da Nuvemshop
  loja:            LOJA_BASE + '/',
  todos:           LOJA_BASE + '/produtos/',
  carrinho:        LOJA_BASE + '/cart/',
  contato:         LOJA_BASE + '/contato/',
  novidades:       LOJA_BASE + '/produtos/?sort=date_desc',

  // Categorias Ativas e Confirmadas (HTTP 200 com produtos dentro)
  scarpin:         LOJA_BASE + '/scarpin/',
  bota:            LOJA_BASE + '/bota/',
  mule:            LOJA_BASE + '/mule/',
  mocassim:        LOJA_BASE + '/mocassim/',
  tenis:           LOJA_BASE + '/tenis/',
  bolsa:           LOJA_BASE + '/bolsa/',

  // Categorias Inativas no catálogo atual (redirecionam para catálogo geral)
  sandalia:        LOJA_BASE + '/produtos/',
  papete:          LOJA_BASE + '/produtos/',
  rasteirinha:     LOJA_BASE + '/produtos/',
  slingback:       LOJA_BASE + '/produtos/',
  tamanco:         LOJA_BASE + '/produtos/',
  sapatilha:       LOJA_BASE + '/produtos/',
  chinelo:         LOJA_BASE + '/produtos/'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LOJA_BASE, LINKS_LOJA };
}
