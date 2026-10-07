# BEDÊ Stiletto — site editorial (www.usebede.com.br)

Home editorial e páginas institucionais em HTML/CSS/JS puro, publicadas no Vercel (projeto `site_usebede`, repositório `kimkrug/usebede-site`). A loja, as variantes, a sacola, a conta e o checkout são **nativos da Nuvemshop** em `loja.usebede.com.br`. Este repositório não tem checkout, estoque nem preço próprios.

| Parte | Arquivos |
|---|---|
| Home (seções, hero, vitrines, rodapé) | `index.html`, `style.css`, `home-app.js`, `home-ui.js` |
| Catálogo da home (leitura pública da Nuvemshop) | `api/catalogo.js` (função Vercel, só GET), `catalog-model.js` |
| Institucionais | `sobre.html`, `como-comprar.html`, `trocas.html`, `faq.html`, `privacidade.html`, `termos.html`, `guia-medidas.html`, `institutional-ui.js`, `404.html` |
| Complementos carregados **pela loja** | `store-enhancements.js` → `store-product-ui.js`, `store-filter-bar.js`, `store-color-gallery.js` |
| Condições e links | `config_loja.js`, `links_loja.js` |
| SEO | `robots.txt`, `sitemap.xml`, canonical em cada página |
| Legado (não carregado pela home; não reativar) | `app.js`, `products.js`, `avaliacoes.js`, `sync_log.json` |

## Comandos
Node 22 ou mais novo. `npm ci` uma vez instala só ferramentas locais de QA (Playwright, sharp, axe-core).

| O quê | Comando |
|---|---|
| Testes (offline, sem rede) | `npm test` |
| Prévia da home com catálogo simulado | `set BEDE_PREVIEW_FIXTURE=1` e `set BEDE_PREVIEW_FRESH_FIXTURE=1`, depois `node scripts/preview-server.cjs` → http://127.0.0.1:8765/ (selo “SIMULAÇÃO LOCAL” visível; preços e fotos de 05/09) |
| Prévia com falha simulada no catálogo | acrescentar `set BEDE_PREVIEW_FAULT=http-503` (ou `hang`, `truncated`, `null-products`, `duplicate`, `stale`, `http-429`, `http-500`) |
| Prévia da loja com páginas salvas (compra bloqueada) | `node scripts/preview-store-integrated.cjs` → http://127.0.0.1:8767/review?view=paris&w=390 |
| Regressão visual | `npx playwright install chromium webkit` uma vez; `node scripts/qa-visual.cjs --out <pasta> --engines chromium --flows`, depois `--engines webkit --merge`; para comparar, `--compare <baseline>` |
| Acessibilidade (axe + teclado) | `node scripts/qa-a11y.cjs --out <pasta> --engines chromium` |
| Desempenho (laboratório) | `node scripts/qa-perf.cjs --runs 3` |
| Resiliência do catálogo | `node scripts/qa-resiliencia.cjs --out <pasta>` |
| Produção = commit esperado? (só GET) | `node scripts/auditar-producao.cjs origin/main` |
| Fotos novas → regra da galeria | `node scripts/galeria-ler-pdp.cjs <pdp.html>` e `node scripts/galeria-regra-do-manifesto.cjs <manifesto.csv> <pdp.html> <id>` |

Memória: rode um navegador por vez (`--engines chromium`, depois `webkit --merge`). Sem `--out`, os scripts de QA gravam pastas dentro do projeto, que o `.gitignore` já exclui.

## Nunca rodar
- `teste-jornada.mjs`: aponta para **produção** e clica em “adicionar ao carrinho”.
- `scripts/preview-store.cjs --capture`, scripts `preparar-*`, `gerar-*`, `conferir-*`, uploads, migrações e qualquer automação de admin (Nuvemshop, Bling, Hiper, WBuy).
- Nada que altere estoque, preço, pedido, pagamento, DNS ou o projeto no Vercel.

## Publicar e reverter
Só com aprovação explícita da Kim. Registro completo: `outputs/claude-code-2026-10-07/R5-4_publicacao.md` (pasta irmã, fora do Git).

**Atenção: o projeto Vercel `site_usebede` tem integração com o GitHub.** Todo push para `main` publica em produção automaticamente; pushes de outras branches geram previews **públicos** (o desta branch de trabalho expõe as 4 bolsas e `scripts/`).

**`.vercelignore`** tira do bundle publicado os legados não usados por nenhuma página (`products.js`, `sync_log.json`, `teste-jornada.mjs`, `app.js`, `avaliacoes.js`, `MOBILE E DESKTOP - HERO/`) e as ferramentas (`scripts/`, `tests/`, `*.md`, `.env*`). Os arquivos continuam no repositório. `tests/vercelignore.test.cjs` falha se algum arquivo de runtime ou asset referenciado for ignorado. Vale para deploys pela CLI e pelo GitHub.

Procedimento (ensaiado nas rodadas 4 e 5):
1. Monte uma branch `release/...` sobre `origin/main` só com os arquivos de runtime alterados. **Nunca** faça merge desta branch de trabalho em `main`: ela tem o `store-color-gallery.js` de 49 regras e as ferramentas de QA.
2. Portões: `npm test`; `node scripts/auditar-producao.cjs` (exit 0 = produção igual a `origin/main`); `vercel whoami`; anote o deployment atual (`vercel ls site_usebede --prod`), que é o alvo de rollback.
3. Pasta limpa: `git worktree add ../deploy-x release/...`. O vínculo fica em `.vercel/` (só IDs, ignorada pelo Git): copie-a para a worktree, ou `vercel link --cwd ../deploy-x --project prj_sRtutzx7Fca15ALivZuz2BGMS5cH --team kimkrugs-projects --non-interactive`. **Se a CLI criar `.env.local` (token), apague sem abrir** e rode `git -C ../deploy-x checkout -- .gitignore`.
4. `vercel deploy --prod --yes --cwd ../deploy-x`; confira ao vivo com `node scripts/auditar-producao.cjs release/...` (exit 0).
5. `git push origin release/...` e `git push origin release/...:main` (fast-forward, **sem force**). Isso dispara **outro** deploy automático do mesmo commit: espere virar produção e repita a auditoria.
6. `git worktree remove ../deploy-x`.

Reverter: `vercel rollback <url-do-deployment-anotado>` (ou “Promote to Production” no painel) e conferir com `node scripts/auditar-producao.cjs <commit-anterior>`. No Git: `git revert` do commit da release e push para `main` (que publica).

## Regras de conteúdo
Não inventar medidas, materiais, reviews nem alt de produto; foto de uma cor nunca aparece em outra (ausência é explícita, “Foto indisponível”). Condições comerciais, hero e políticas só mudam com decisão da Kim. Galeria por cor e troca de fotos: `04_RECEBIMENTO_NOVAS_FOTOS.md` (handoff) e `R2-6_ensaio_fotos.md`.
