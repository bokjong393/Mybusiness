/* Build a single self-contained HTML page from a multi-file site in this repo.
 *
 * Used to publish a project anywhere that wants one file with no external
 * requests (a sandboxed artifact frame, an offline copy, a USB stick).
 * Generating it from the same sources means the standalone build cannot drift
 * from the real app — there is only ever one implementation.
 *
 * Usage:
 *   node tools/build-standalone.mjs <outfile> [--src <dir>] [--fragment]
 *
 *   --src       project directory containing index.html (default: repo root)
 *   --fragment  strip the document skeleton, for hosts that supply their own
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1];
};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.resolve(repoRoot, flag('--src') || '.');
const out = path.resolve(repoRoot, argv.find((a) => !a.startsWith('--') && a !== flag('--src'))
  || 'dist/standalone.html');

const read = (rel) => fs.readFileSync(path.join(srcDir, rel), 'utf8');

let html = read('index.html');

// Inline the stylesheet(s).
const styleRefs = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)];
const inlined = [];
for (const [tag, href] of styleRefs) {
  const css = read(href);
  inlined.push(css);
  // NOTE: the replacement MUST be a function. As a string, "$$" is an escape
  // meaning a literal "$", which silently rewrote app.js's `var $$ = ...`
  // (querySelectorAll) into `var $ = ...` and broke every DOM lookup.
  html = html.replace(tag, () => `<style>\n${css}\n</style>`);
}

// Inline every script, in the order the page declares them.
const scriptRefs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)];
const sources = [];
for (const [tag, src] of scriptRefs) {
  const source = read(src);
  sources.push(source);
  html = html.replace(tag, () => `<script>\n/* ── ${src} ── */\n${source}\n</script>`);
}

// Standalone builds run embedded: no downloads, no share sheet, no proxy.
const configMatch = html.match(/window\.(\w*CONFIG)\s*=\s*\{([^}]*)\};/);
if (!configMatch) throw new Error('No window.*CONFIG block found to mark as embedded.');
html = html.replace(configMatch[0],
  () => `window.${configMatch[1]} = {${configMatch[2].trim().replace(/,$/, '')}, embedded: true };`);

// --fragment strips the document skeleton for hosts that supply their own
// (a Claude Artifact wraps the file in <!doctype>/<head>/<body> at publish
// time, so shipping our own would nest documents).
if (argv.includes('--fragment')) {
  // Galleries show the title as a name beside dozens of others, so drop the
  // tagline the full site keeps after the dash.
  const title = html.match(/<title>([\s\S]*?)<\/title>/)[1].split('—')[0].trim();
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

// Verify each inlined file survived intact — a silent mangling here ships a
// broken page that still looks fine in the file listing.
for (const source of [...sources, ...inlined]) {
  if (!html.includes(source)) throw new Error('An inlined file was altered during inlining');
}
if (!html.includes('embedded: true')) throw new Error('Embedded flag was not applied.');

// Fail loudly rather than shipping a page with a dead reference.
const leftovers = html.match(/(?:src|href)="assets\/[^"]+"/g);
if (leftovers) throw new Error('Un-inlined local assets remain: ' + leftovers.join(', '));

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`Wrote ${path.relative(repoRoot, out)} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB, `
  + `${sources.length} scripts, zero external requests)`);
