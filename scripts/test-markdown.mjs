/**
 * Ayoka — markdown renderer safety test.
 *
 * The model's output is inserted with innerHTML, so md() must never emit
 * markup that did not come from its own allowlist. This test pulls md()
 * straight out of public/app.js so it can never drift from what ships.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appJs = fs.readFileSync(path.join(here, '..', 'public', 'app.js'), 'utf8');
const escSrc = appJs.match(/const esc = [^\n]+\n/)[0];
const mdSrc = appJs.slice(appJs.indexOf('function md(src)'), appJs.indexOf('/* ---------------------------------------------------------------- banner */'));
const tmp = path.join(here, '..', 'data', '.md-under-test.mjs');
fs.writeFileSync(tmp, escSrc + mdSrc + '\nexport { md };');
const { md } = await import(tmp);
fs.unlinkSync(tmp);

// Only these tags may ever appear in md() output.
const ALLOWED = ['p','h2','h3','h4','ul','ol','li','pre','code','strong','em','hr','table','thead','tbody','tr','th','td','a','span'];

function unsafe(html) {
  const problems = [];
  for (const m of html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g)) {
    const [full, tag, attrs] = m;
    if (!ALLOWED.includes(tag.toLowerCase())) problems.push(`disallowed tag <${tag}>`);
    if (/\son\w+\s*=/i.test(attrs)) problems.push(`event handler in ${full}`);
    if (/(href|src)\s*=\s*["']?\s*(javascript|data|vbscript):/i.test(attrs)) problems.push(`dangerous URL in ${full}`);
  }
  return problems;
}

const cases = [
  ['script tag',          '<script>alert(1)</script>'],
  ['img onerror',         '<img src=x onerror=alert(1)>'],
  ['iframe',              '<iframe src="https://evil.test"></iframe>'],
  ['svg onload',          '<svg onload=alert(1)>'],
  ['js: markdown link',   'See [x](javascript:alert(1)) here'],
  ['data: markdown link', 'See [x](data:text/html,<script>alert(1)</script>) here'],
  ['anchor injection',    '[ok](https://a.test" onmouseover="alert(1))'],
  ['html in fence',       '```\n<img src=x onerror=alert(1)>\n```'],
  ['broken fence',        '```\nunclosed block'],
  ['heading',             '## What I understand you need'],
  ['emphasis',            'Send **this** and *that*.'],
  ['bullets',             '- one\n- two'],
  ['numbered',            '1. first\n2. second'],
  ['fenced message',      'Copy:\n```\nHi Ada,\n\nYour checkout takes 9s.\n```\nDone.'],
  ['table',               '| Item | Amount |\n|---|---|\n| Logo | 250 |'],
  ['rule',                'a\n\n---\n\nb'],
  ['good link',           'See [docs](https://example.com) here'],
  ['inline code',         'Use `AYK-P0-XXXX` key'],
  ['bracket placeholder', '**[YOUR NAME]** goes here'],
  ['french accents',      "## Avant d'envoyer\n- Verifiez le prix"],
  ['empty',               ''],
];

let fail = 0;
for (const [name, input] of cases) {
  let out;
  try { out = md(input); } catch (e) { console.log(`x ${name}: threw ${e.message}`); fail++; continue; }
  const problems = unsafe(out);
  if (problems.length) { console.log(`x ${name}: ${problems.join('; ')}`); fail++; }
  else console.log(`ok ${name.padEnd(20)} ${out.slice(0, 78).replace(/\n/g, ' ')}`);
}

// Spot-check that it renders what it is supposed to, not just that it is safe.
const checks = [
  ['heading becomes h3',  md('## Hi').includes('<h3>Hi</h3>')],
  ['bold renders',        md('**x**').includes('<strong>x</strong>')],
  ['fence renders',       md('```\nabc\n```').includes('<pre><code>abc</code></pre>')],
  ['list renders',        md('- a\n- b').includes('<ul><li>a</li><li>b</li></ul>')],
  ['table renders',       md('| a |\n|---|\n| b |').includes('<th>a</th>')],
  ['good link renders',   md('[d](https://e.test)').includes('href="https://e.test"')],
  ['script is escaped',   md('<script>x</script>').includes('&lt;script&gt;')],
];
for (const [name, pass] of checks) {
  if (pass) console.log(`ok ${name}`);
  else { console.log(`x ${name}`); fail++; }
}

console.log(fail ? `\n${fail} FAILED` : `\nall ${cases.length + checks.length} markdown checks passed`);
process.exit(fail ? 1 : 0);
