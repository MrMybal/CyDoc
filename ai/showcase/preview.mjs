import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, extname, isAbsolute, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv.find(value => value.startsWith('--port='))?.slice(7) || 0);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Use --port=0..65535.');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.gif': 'image/gif', '.webm': 'video/webm', '.mp4': 'video/mp4', '.md': 'text/markdown; charset=utf-8' };
const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/') { response.writeHead(302, { Location: './example/' }).end(); return; }
    let target = resolve(root, '.' + pathname);
    const delta = relative(root, target);
    if (delta.startsWith('..') || isAbsolute(delta)) { response.writeHead(403).end(); return; }
    if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html');
    const data = await readFile(target);
    response.writeHead(200, { 'Content-Type': types[extname(target)] || 'text/plain; charset=utf-8', 'Content-Length': data.length, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Local file not found.'); }
});
await new Promise((done, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', done); });
console.log(`Standalone showcase: http://127.0.0.1:${server.address().port}/example/`);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
