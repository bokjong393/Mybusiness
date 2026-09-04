#!/usr/bin/env node
/**
 * Ayoka — live smoke test.
 *
 *   npm run smoke
 *
 * Makes ONE real API call (costs about $0.05) and reports:
 *   - whether your key works
 *   - what the call actually cost in tokens
 *   - whether prompt caching is working
 *   - whether the output looks like the product it is supposed to be
 *
 * Run this after you deploy, and again any time you change lib/prompts.js.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { PACK_BY_ID } from '../lib/packs.js';
import { SYSTEM_PROMPT, buildUserTurn } from '../lib/prompts.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(here, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\nANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.\n');
  process.exit(1);
}

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// A deliberately thin, messy brief — exactly what a real client sends.
const pack = PACK_BY_ID.proposal;
const input = {
  brief: 'hi i saw ur work. we are a small skincare brand in accra, need a proper logo and maybe packaging. budget is flexible but not too much. how soon can u start? also do u do instagram posts',
  service: 'Brand identity design for consumer product startups',
  proof: '',
  price: '',
  pricing_model: 'fixed',
  timeline: '',
};
const ctx = { language: 'en', currency: 'GHS', currencySymbol: '₵', tone: 'warm' };

console.log(`\nAyoka smoke test — model ${MODEL}`);
console.log('Generating a proposal from a deliberately vague brief...\n');
const started = Date.now();

let text = '';
const stream = client.messages.stream({
  model: MODEL,
  max_tokens: 8000,
  output_config: { effort: process.env.ANTHROPIC_EFFORT || 'medium' },
  system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
  messages: [{ role: 'user', content: buildUserTurn(pack, input, ctx) }],
});

for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    text += event.delta.text;
    process.stdout.write(event.delta.text);
  }
}
const final = await stream.finalMessage();
const seconds = ((Date.now() - started) / 1000).toFixed(1);

if (final.stop_reason === 'refusal') {
  console.error('\n\nThe model declined this request. That is unusual for a proposal — check lib/prompts.js.\n');
  process.exit(1);
}

const u = final.usage || {};
const inCost = ((u.input_tokens || 0) / 1e6) * 5 + ((u.cache_creation_input_tokens || 0) / 1e6) * 6.25 + ((u.cache_read_input_tokens || 0) / 1e6) * 0.5;
const outCost = ((u.output_tokens || 0) / 1e6) * 25;

console.log('\n\n' + '─'.repeat(64));
console.log(`  Time                 ${seconds}s`);
console.log(`  Stop reason          ${final.stop_reason}`);
console.log(`  Input tokens         ${u.input_tokens ?? '?'}`);
console.log(`  Cache written        ${u.cache_creation_input_tokens ?? 0}`);
console.log(`  Cache read           ${u.cache_read_input_tokens ?? 0}`);
console.log(`  Output tokens        ${u.output_tokens ?? '?'}`);
console.log(`  Approx cost          $${(inCost + outCost).toFixed(4)}   (Opus 5 list price)`);
console.log('─'.repeat(64));

// ---- Quality assertions: does the output behave like the product? --------
const banned = ['hope this email finds you well', 'passionate about', 'results-driven',
  'take your business to the next level', 'circling back', 'just checking in', 'game-changer'];
const checks = [
  ['has the warning section', /before you send this/i.test(text)],
  ['quotes in the right currency', text.includes('₵') || /GHS/.test(text)],
  ['mirrors the brief back', /understand/i.test(text)],
  ['uses no banned phrases', !banned.some((p) => text.toLowerCase().includes(p))],
  ['invented no fake experience', !/\b\d+\+?\s*years? of experience\b/i.test(text)],
  ['flags the missing proof', /(proof|portfolio|result|case stud|testimonial|number)/i.test(text)],
  ['long enough to be real', text.length > 1200],
];

let failed = 0;
console.log('');
for (const [name, ok] of checks) {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}

if (u.cache_read_input_tokens === 0 && u.cache_creation_input_tokens === 0) {
  console.log('\n  Note: nothing was cached. That is normal on the very first call.');
  console.log('  Run this twice in a row — the second run should show "Cache read" above 0.');
  console.log('  If it never does, something variable crept into lib/prompts.js.');
}

console.log(failed
  ? `\n${failed} quality check(s) failed. Read the output above before you sell this.\n`
  : '\nAll quality checks passed. The product works.\n');
process.exit(failed ? 1 : 0);
