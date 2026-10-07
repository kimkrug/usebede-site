/* Prévia local em loopback. Nenhuma escrita ou acesso administrativo. */
'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const PORT = 8765;
const FIXTURE = process.env.BEDE_PREVIEW_FIXTURE === '1';
// Rebase deliberado apenas para QA visual local; nunca simula frescor na API real.
const FRESH_FIXTURE = FIXTURE && process.env.BEDE_PREVIEW_FRESH_FIXTURE === '1';
const requestedDelay = Number(process.env.BEDE_PREVIEW_FIXTURE_DELAY_MS || 0);
const FIXTURE_DELAY_MS = FIXTURE && Number.isFinite(requestedDelay)
  ? Math.min(15000, Math.max(0, Math.floor(requestedDelay))) : 0;
const FIXTURE_FILE = path.resolve(ROOT, '../outputs/catalogo-revisao/catalogo-publico-atual.json');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const DENIED = new Set(['api', 'outputs', 'scripts', 'tests', 'node_modules', 'work']);
const mode = FRESH_FIXTURE ? 'offline-fixture-simulated-timestamp-qa'
  : FIXTURE ? 'offline-fixture-local-only' : 'live-public-store';
const QA_LABEL = 'SIMULAÇÃO LOCAL · TIMESTAMP QA · NÃO AO VIVO';

function resolvePublicFile(requestPath) {
  let decoded;
  try { decoded = decodeURIComponent(requestPath); } catch { return null; }
  if (decoded.includes('\\') || decoded.includes('\0') || !decoded.startsWith('/')) return null;
  const segments = decoded.split('/').filter(Boolean);
  if (segments.some(segment => segment.startsWith('.') || DENIED.has(segment.toLowerCase()) || segment.includes(':'))) return null;
  const relative = segments.length ? segments.join('/') : 'index.html';
  const target = path.resolve(ROOT, relative);
  if (!target.startsWith(ROOT + path.sep) || !MIME[path.extname(target).toLowerCase()]) return null;
  return target;
}

function reject(response, status, message) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(message);
}

async function handleRequest(request, response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Bede-Preview', 'local-loopback');
  response.setHeader('X-Bede-Preview-Mode', mode);
  const allowedHosts = new Set([`${HOST}:${PORT}`, `localhost:${PORT}`]);
  if (!allowedHosts.has(request.headers.host || '')) return reject(response, 403, 'Somente prévia local.');
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    return reject(response, 405, 'Método não permitido.');
  }
  // Valida o caminho bruto antes de new URL poder normalizar ../.
  const rawPath = String(request.url || '/').split('?')[0];
  if (rawPath === '/api/catalogo') {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return reject(response, 405, 'Endpoint de catálogo aceita somente GET.');
    }
    if (FIXTURE) {
      const captured = JSON.parse(await fs.readFile(FIXTURE_FILE, 'utf8'));
      if (FIXTURE_DELAY_MS) await new Promise(resolve => setTimeout(resolve, FIXTURE_DELAY_MS));
      if (response.destroyed) return;
      const simulatedAt = FRESH_FIXTURE ? new Date().toISOString() : null;
      const payload = {
        ...captured,
        ...(FRESH_FIXTURE ? { startedAt: simulatedAt, fetchedAt: simulatedAt } : {}),
        previewOnly: true,
        previewMode: mode,
        previewNote: FRESH_FIXTURE
          ? `${QA_LABEL}. Datas rebaseadas somente em memória para teste visual; preços e saldos continuam sendo um snapshot histórico.`
          : 'Catálogo capturado para QA local; não representa atualização ao vivo.',
        previewMetadata: {
          originalStartedAt: captured.startedAt ?? null,
          originalFetchedAt: captured.fetchedAt ?? null,
          timestampsRebasedForQA: FRESH_FIXTURE,
          simulatedAt,
          fixtureDelayMs: FIXTURE_DELAY_MS
        }
      };
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(payload));
      return;
    }
    return require('../api/catalogo.js')(request, response);
  }
  const target = resolvePublicFile(rawPath);
  if (!target) return reject(response, 404, 'Arquivo não encontrado.');
  let actual, info;
  try { actual = await fs.realpath(target); info = await fs.stat(actual); }
  catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return reject(response, 404, 'Arquivo não encontrado.');
    throw error;
  }
  // Impede escapes por symlink/junction mesmo quando o caminho textual é válido.
  if (!actual.startsWith(ROOT + path.sep) || !info.isFile()) return reject(response, 404, 'Arquivo não encontrado.');
  const extension = path.extname(actual).toLowerCase();
  let bytes = await fs.readFile(actual);
  if (extension === '.html') {
    const label = FRESH_FIXTURE ? QA_LABEL : FIXTURE ? 'PRÉVIA LOCAL · SNAPSHOT' : 'PRÉVIA LOCAL · AO VIVO';
    let html = bytes.toString('utf8').replace(/<title>/i, `<title>[${label}] `);
    if (FRESH_FIXTURE) {
      // Marca inseparável da simulação, inclusive em capturas sem a barra do navegador.
      html = html.replace(/<body\b[^>]*>/i, '$&' + `<aside role="note" data-preview-timestamp-qa style="position:fixed;right:8px;bottom:8px;z-index:2147483647;max-width:calc(100vw - 16px);box-sizing:border-box;padding:4px 8px;border:1px dashed #555;background:#fff;color:#000;font:11px/1.35 sans-serif;pointer-events:none">${QA_LABEL}</aside>`);
    }
    bytes = Buffer.from(html);
  }
  response.setHeader('Content-Type', MIME[extension]);
  response.setHeader('Content-Length', bytes.length);
  response.statusCode = 200;
  response.end(request.method === 'HEAD' ? undefined : bytes);
}

function startServer() {
  const server = http.createServer((request, response) => {
    handleRequest(request, response).catch(error => {
      console.error('Prévia local:', error.message);
      if (!response.headersSent) reject(response, 500, 'Erro na prévia local.');
      else response.end();
    });
  });
  server.listen(PORT, HOST, () => {
    console.log(`PRÉVIA LOCAL: http://${HOST}:${PORT}/`);
    console.log(`Catálogo: ${FRESH_FIXTURE ? QA_LABEL : FIXTURE ? 'SNAPSHOT OFFLINE PARA QA — NÃO É ESTADO AO VIVO' : 'leitura pública ao vivo da Nuvemshop'}`);
    if (FIXTURE) console.log(`Atraso simulado da fixture: ${FIXTURE_DELAY_MS} ms. Arquivo original preservado.`);
    console.log('Loopback somente; sem listagem de diretórios, sem escrita, sem exposição de outputs.');
  });
  return server;
}

if (require.main === module) startServer();
module.exports = { resolvePublicFile, handleRequest, startServer };
