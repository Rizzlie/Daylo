import { createServer, request as proxyRequest } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain' };

export function createFrontend(root, apiOrigin) {
  const directory = resolve(root);
  return createServer(async (request, response) => {
    if (request.url === '/api' || request.url.startsWith('/api/')) {
      const upstream = proxyRequest(new URL(request.url, apiOrigin), {
        method: request.method, headers: { ...request.headers, host: new URL(apiOrigin).host },
      }, (reply) => {
        response.writeHead(reply.statusCode, reply.headers);
        reply.pipe(response);
      });
      upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end(); });
      request.pipe(upstream);
      return;
    }
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      const file = resolve(directory, `.${pathname}`);
      if (!file.startsWith(`${directory}${sep}`) && file !== directory) {
        response.writeHead(403); response.end(); return;
      }
      const target = !extname(pathname) ? resolve(directory, 'index.html') : file;
      const body = await readFile(target);
      response.writeHead(200, { 'content-type': contentTypes[extname(target)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      response.end(body);
    } catch { response.writeHead(404); response.end(); }
  });
}
