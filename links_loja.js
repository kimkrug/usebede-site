/**
 * BEDÊ Stiletto — Configuração Centralizada de Links da Loja
 * Plataforma: NUVEMSHOP
 * 
 * ATENÇÃO: As rotas de categoria individuais ainda não existem no painel da Nuvemshop.
 * O mapeamento provisório direciona para a listagem geral (/produtos/).
 * Quando o Kim criar as categorias no painel da Nuvemshop, basta atualizar as URLs abaixo.
 */

const LOJA_BASE = 'https://bedestiletto.lojavirtualnuvem.com.br';

const LINKS_LOJA = {
  // Rotas Nativas e Confirmadas da Nuvemshop (HTTP 200)
  loja:            LOJA_BASE + '/',
  todos:           LOJA_BASE + '/produtos/',
  carrinho:        LOJA_BASE + '/cart/',
  contato:         LOJA_BASE + '/contato/',
  novidades:       LOJA_BASE + '/produtos/',

  // PROVISÓRIO: Categorias pendentes de criação no painel Nuvemshop
  scarpin:         LOJA_BASE + '/produtos/',   // TODO: trocar para /scarpins/ ou /scarpin/ quando existir
  bota:            LOJA_BASE + '/produtos/',   // TODO: trocar para /botas/ ou /bota/ quando existir
  sandalia:        LOJA_BASE + '/produtos/',   // TODO: trocar para /sandalias/ quando existir
  papete:          LOJA_BASE + '/produtos/',   // TODO: trocar para /papetes/ quando existir
  rasteirinha:     LOJA_BASE + '/produtos/',   // TODO: trocar para /rasteirinhas/ quando existir
  tenis:           LOJA_BASE + '/produtos/',   // TODO: trocar para /tenis/ quando existir
  mocassim:        LOJA_BASE + '/produtos/',   // TODO: trocar para /mocassins/ quando existir
  slingback:       LOJA_BASE + '/produtos/',   // TODO: trocar para /slingbacks/ quando existir
  tamanco:         LOJA_BASE + '/produtos/',   // TODO: trocar para /tamancos/ quando existir
  bolsa:           LOJA_BASE + '/produtos/',   // TODO: trocar para /bolsas/ quando existir
  mule:            LOJA_BASE + '/produtos/',   // TODO: trocar para /mules/ quando existir
  sapatilha:       LOJA_BASE + '/produtos/',   // TODO: trocar para /sapatilhas/ quando existir
  chinelo:         LOJA_BASE + '/produtos/'    // TODO: trocar para /chinelos/ quando existir
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LOJA_BASE, LINKS_LOJA };
}
