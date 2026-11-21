// Serves game/ locally so Solmar City 3D can be played in a browser:
//   node serve.ts   -> http://localhost:8080
// Screenshots: http://localhost:8080/?shot=1&seed=1 (shots 1-4).
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const gameDir = join(here, 'game');
const port = Number(process.env.PORT || 8080);

const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
};

createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = join(gameDir, path);
  if (!file.startsWith(gameDir) || !existsSync(file)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`Solmar City 3D at http://localhost:${port}`));
