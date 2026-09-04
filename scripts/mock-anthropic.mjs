/**
 * A fake Anthropic Messages endpoint that speaks the real SSE wire format.
 * Lets us exercise the entire path (browser -> server -> handler -> SDK ->
 * stream -> browser render) without spending money or needing a key.
 */
import http from 'node:http';

const SAMPLE = `## What I understand you need

You are a skincare brand in Accra going into **retail**, and your current mark
disappears at shelf distance. That is a real cost, not a taste problem.

## How I would approach it

1. **Shelf test** - photograph your current pack at 2 metres.
2. **Mark design** - three directions, one recommended.
3. **System** - colour, type, and the rules for applying them.

## Investment

**[GHS 12,000]** for the full identity. A 50% deposit starts the work.

Here is the message to send back:

\`\`\`
Hi - thanks for reaching out. Before I quote properly, two questions:
what is the retail launch date, and do you have the packaging dielines?
\`\`\`

| Phase | Deliverable | Week |
|---|---|---|
| 1 | Shelf audit | 1 |
| 2 | Mark | 2-3 |

---

## Before you send this

- I invented no experience for you. Add one real result before sending.
- **[GHS 12,000]** is a placeholder - set your own number.
- Ask about the Instagram work separately; do not bundle it in free.
`;

let lastRequest = null;

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    if (!req.url.includes('/v1/messages')) {
      res.writeHead(404).end('{}');
      return;
    }
    lastRequest = JSON.parse(body || '{}');

    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    send('message_start', {
      type: 'message_start',
      message: {
        id: 'msg_mock', type: 'message', role: 'assistant', model: 'claude-opus-5',
        content: [], stop_reason: null, stop_sequence: null,
        usage: { input_tokens: 12, output_tokens: 1, cache_creation_input_tokens: 900, cache_read_input_tokens: 0 },
      },
    });
    send('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } });

    // Chunk it the way a real stream arrives, so the client-side incremental
    // Markdown rendering is genuinely exercised.
    const chunks = SAMPLE.match(/[\s\S]{1,40}/g) || [];
    let i = 0;
    const tick = setInterval(() => {
      if (i < chunks.length) {
        send('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: chunks[i++] } });
        return;
      }
      clearInterval(tick);
      send('content_block_stop', { type: 'content_block_stop', index: 0 });
      send('message_delta', {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn', stop_sequence: null },
        usage: { output_tokens: 1840 },
      });
      send('message_stop', { type: 'message_stop' });
      res.end();
    }, 6);
  });
});

server.listen(3222, () => console.log('mock anthropic on :3222'));

// Expose what the SDK actually sent, so the test can assert on the request shape.
http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(lastRequest));
}).listen(3223);
