/* A dependency-free static server, for looking at the map locally.
   Vercel does not run this — it serves the same files directly. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 4321;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const wanted = url.pathname === '/' ? '/index.html' : url.pathname;

  // Resolve inside ROOT, so a crafted path cannot walk out of the folder.
  const file = path.join(ROOT, path.normalize(wanted).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(file, (error, body) => {
    if (error) {
      response.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
      return;
    }
    response.writeHead(200, {
      'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    }).end(body);
  });
});

server.listen(PORT, () => {
  console.log(`Commissioning node map — http://localhost:${PORT}`);
});
