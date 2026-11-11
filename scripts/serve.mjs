import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.PORT || 4174);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const server = createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let destination = resolve(root, `.${path}`);
    if (relative(root, destination).startsWith('..')) { response.writeHead(403); response.end(); return; }
    if ((await stat(destination)).isDirectory()) {
      if (!path.endsWith('/')) { response.writeHead(301, { Location: path + '/' }); response.end(); return; }
      destination = resolve(destination, 'index.html');
    }
    const body = await readFile(destination);
    response.writeHead(200, { 'Content-Type': types[extname(destination)] || 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    const body = await readFile(resolve(root, '404.html')).catch(() => 'Not found');
    response.end(request.method === 'HEAD' ? undefined : body);
  }
});
server.on('error', error => { console.error(`Preview failed: ${error.code}. Choose another PORT if it is in use.`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Resources preview: http://127.0.0.1:${port}/`));