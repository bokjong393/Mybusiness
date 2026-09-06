/* Build a single self-contained HTML page from the multi-file site.
 *
 * Used to publish PAY ME anywhere that wants one file with no external
 * requests (a sandboxed artifact frame, an offline copy, a USB stick).
 * Generating it from the same sources means the standalone build cannot
 * drift away from the real app — there is only ever one implementation.
 *
 * Usage: node tools/build-standalone.mjs [outfile]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || path.join(root, 'dist', 'pay-me-standalone.html');

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

let html = read('index.html');

// Inline the stylesheet.
const css = read('assets/css/styles.css');
// NOTE: the replacement MUST be a function. As a string, "$$" is an escape
// meaning a literal "$", which silently rewrote app.js's `var $$ = ...`
// (querySelectorAll) into `var $ = ...` and broke every DOM lookup.
html = html.replace(
  /<link rel="stylesheet" href="assets\/css\/styles\.css">/,
  () => `<style>\n${css}\n</style>`
);

// Inline every script, in the order the page loads them.
const scripts = ['data.js', 'engine.js', 'payslip.js', 'ai.js', 'app.js'];
for (const name of scripts) {
  const source = read(`assets/js/${name}`);
  html = html.replace(
    new RegExp(`<script src="assets/js/${name.replace('.', '\\.')}"></script>`),
    () => `<script>\n/* ── assets/js/${name} ── */\n${source}\n</script>`
  );
}

// Standalone builds run embedded: no downloads, no share sheet, no proxy.
html = html.replace(
  'window.PAY_ME_CONFIG = { proxyUrl: null };',
  'window.PAY_ME_CONFIG = { proxyUrl: null, embedded: true };'
);

// Verify each script survived inlining intact — a silent mangling here ships
// a broken page that still looks fine in the file listing.
for (const name of scripts) {
  const source = read(`assets/js/${name}`);
  if (!html.includes(source)) throw new Error(`assets/js/${name} was altered during inlining`);
}
if (!html.includes(css)) throw new Error('styles.css was altered during inlining');

// Fail loudly rather than shipping a page with a dead reference.
const leftovers = html.match(/(?:src|href)="assets\/[^"]+"/g);
if (leftovers) throw new Error('Un-inlined local assets remain: ' + leftovers.join(', '));
if (!html.includes('embedded: true')) throw new Error('Embedded flag was not applied.');

/* --fragment strips the document skeleton for hosts that supply their own
 * (a Claude Artifact wraps the file in <!doctype>/<head>/<body> at publish
 * time, so shipping our own would nest documents). */
if (process.argv.includes('--fragment')) {
  // Galleries show the title as a name beside dozens of others, so drop the
  // tagline the full site keeps after the dash.
  const title = html.match(/<title>([\s\S]*?)<\/title>/)[1].split('\u2014')[0].trim();
  const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
  const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
  html = `<title>${title}</title>\n${style}\n${body.trim()}\n`;

  // Match whole tags only — <header> must not read as <head>.
  for (const tag of ['!doctype', 'html', 'head', 'body']) {
    if (new RegExp(`<${tag}[\\s>]`, 'i').test(html)) {
      throw new Error(`Fragment still contains a <${tag}> tag`);
    }
  }
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`Wrote ${out} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB, zero external requests)`);
