/**
 * Ayoka — standalone server.
 *
 * Runs the whole product from one process: static site + API. No framework, no
 * build step. `npm start` works on your laptop and on any Node host
 * (Render, Railway, Fly, a VPS). Vercel users get api/generate.js instead.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, UserError } from './lib/handler.js';
import { createStore } from './lib/store.js';
import { publicCatalogue, CURRENCIES, LANGUAGES, TONES } from './lib/packs.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(here, 'public');
const PORT = Number(process.env.PORT || 3000);

// Load .env if present — keeps `npm start` working without extra tooling.
const envFile = path.join(here, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const store = createStore({ file: path.join(here, 'data', 'usage.json') });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function readBody(req, limitBytes = 200_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limitBytes) {
        reject(new UserError('too_large', 'That request is too large.', 413));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new UserError('bad_json', 'Could not read that request.', 400));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  if (rel === '/app') rel = '/app.html';
  if (!path.extname(rel)) rel += '.html';

  // Contain every path inside public/ — no traversal out of the web root.
  const full = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!full.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<h1>404</h1><p><a href="/">Back to Ayoka</a></p>');
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(full)] || 'application/octet-stream',
      'cache-control': path.extname(full) === '.html' ? 'no-cache' : 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url || '/';

  if (url.startsWith('/api/health')) {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
      hasLicenseSecret: Boolean(process.env.LICENSE_SECRET),
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-5',
      usage: store.snapshot(),
    }));
    return;
  }

  if (url.startsWith('/api/catalogue')) {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' });
    res.end(JSON.stringify({ packs: publicCatalogue(), currencies: CURRENCIES, languages: LANGUAGES, tones: TONES }));
    return;
  }

  if (url.startsWith('/api/generate')) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ type: 'error', code: 'method', message: 'POST only.' }));
      return;
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        type: 'error',
        code: 'not_configured',
        message: 'ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.',
      }));
      return;
    }

    let headersSent = false;
    const write = (obj) => {
      if (!headersSent) {
        res.writeHead(200, {
          'content-type': 'application/x-ndjson; charset=utf-8',
          'cache-control': 'no-store',
          'x-accel-buffering': 'no',
        });
        headersSent = true;
      }
      res.write(JSON.stringify(obj) + '\n');
    };

    try {
      const body = await readBody(req);
      await generate({ body, ip: clientIp(req), env: process.env, store, write });
      res.end();
    } catch (err) {
      const status = err instanceof UserError ? err.status : 500;
      const payload = {
        type: 'error',
        code: err.code || 'server_error',
        message: err instanceof UserError ? err.message : 'Something broke on our side. Try again in a moment.',
      };
      if (!(err instanceof UserError)) console.error('[ayoka] generate failed:', err);
      if (headersSent) {
        // Already streaming — deliver the error inside the stream.
        res.write(JSON.stringify(payload) + '\n');
        res.end();
      } else {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(payload));
      }
    }
    return;
  }

  serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`\n  Ayoka running → http://localhost:${PORT}`);
  console.log(`  API key: ${process.env.ANTHROPIC_API_KEY ? 'set ✓' : 'MISSING ✗  (copy .env.example → .env)'}`);
  console.log(`  Licence secret: ${process.env.LICENSE_SECRET ? 'set ✓' : 'MISSING ✗'}\n`);
});
