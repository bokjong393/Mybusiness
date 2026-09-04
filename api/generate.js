/**
 * Vercel adapter. The real logic lives in lib/handler.js so this file stays
 * thin and the same product runs on any host.
 */
import { generate, UserError } from '../lib/handler.js';
import { createStore } from '../lib/store.js';

// No file persistence: serverless filesystems are read-only and ephemeral.
// See the note at the top of lib/store.js about what this does and does not protect.
const store = createStore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ type: 'error', code: 'method', message: 'POST only.' });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ type: 'error', code: 'not_configured', message: 'ANTHROPIC_API_KEY is not set in this deployment.' });
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

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  try {
    await generate({ body, ip, env: process.env, store, write });
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
      res.write(JSON.stringify(payload) + '\n');
      res.end();
    } else {
      res.status(status).json(payload);
    }
  }
}
