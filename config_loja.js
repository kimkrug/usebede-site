/**
 * Arquivo de Configuração da Loja BEDÊ Stiletto
 * Dados da Empresa e Domínio Nuvemshop
 */
const CFG_LOJA = {
    dominioLoja: "https://bedestiletto.lojavirtualnuvem.com.br",
    razaoSocial: 'Stiletto Bd Boutique Ltda',
    cnpj: '55.068.034/0001-00',
    nomeFantasia: 'BEDÊ',
    endereco: 'Rua Cirurgião Vaz Ferreira, 457 · Centro · Viamão/RS',
    whatsapp: '(51) 98015-0391',
    descontoPix: 5,
    primeiraTrocaGratisDias: null,
    freteGratisAcimaDe: 599,
    freteGratisRegioes: [],
    freteGratisEstados: [],
    parcelamentoMax: 6,
    instagram: '@usebede.com.br',
    instagramUrl: 'https://www.instagram.com/usebede.com.br/'
};

if (typeof module !== 'undefined') module.exports = { CFG_LOJA };
