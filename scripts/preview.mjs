#!/usr/bin/env node
// Trusted development server for the static export, including dotted Pages paths.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
const { values } = parseArgs({ options: { port: { type: 'string', default: '3112' }, 'base-path': { type: 'string', default: '' } } });
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid preview port');
const base = values['base-path'].replace(/\/$/, '');
const root = fs.realpathSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../apps/site/out'));
const within = file => { const rel = path.relative(root, file); return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel)); };
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if (base && pathname === base) { res.writeHead(302, { Location: `${base}/` }).end(); return; }
    if (base && !pathname.startsWith(`${base}/`)) { res.writeHead(404).end(); return; }
    let file = path.resolve(root, `.${pathname.slice(base.length)}`);
    if (!within(file)) { res.writeHead(403).end(); return; }
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!within(fs.realpathSync(file)) || !fs.statSync(file).isFile()) { res.writeHead(403).end(); return; }
    const size = fs.statSync(file).size;
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Content-Length': size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => process.stdout.write(`Static preview: http://127.0.0.1:${port}${base}/\n`));
