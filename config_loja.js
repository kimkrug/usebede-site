/**
 * Arquivo de Configuração da Loja BEDÊ Stiletto
 * Dados da Empresa Confirmados em 20/08/2026
 */
const CFG_LOJA = {
    dominioLoja: "https://www.stilettobmaisd.com.br",
    razaoSocial: 'Stiletto Bd Boutique Ltda',   // CONFIRMADO 20/08/2026
    cnpj: '55.068.034/0001-00',                 // CONFIRMADO 20/08/2026
    nomeFantasia: 'BEDÊ',                       // CONFIRMADO 20/08/2026
    endereco: 'Rua Cirurgião Vaz Ferreira, 457 · Centro · Viamão/RS',
    whatsapp: '(51) 98015-0391',
    descontoPix: 5,                             // CONFIRMADO 20/08/2026
    primeiraTrocaGratisDias: null,              // CONFIRMADO 20/08/2026: apenas 7 dias do CDC
    freteGratisAcimaDe: 449,                    // CONFIRMADO 20/08/2026
    freteGratisRegioes: ['Sul', 'Sudeste'],
    freteGratisEstados: ['RS','SC','PR','SP','RJ','MG','ES'],
    parcelamentoMax: null                       // PENDENTE [A CONFIRMAR] — aguardando confirmação do que a WBuy permite
};

if (typeof module !== 'undefined') module.exports = { CFG_LOJA };
