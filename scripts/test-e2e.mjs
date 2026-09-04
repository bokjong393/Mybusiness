/**
 * Ayoka - browser end-to-end test.
 *
 * Exercises the real UI against a fake Anthropic endpoint, so it costs nothing
 * and needs no API key. Run it before every deploy.
 *
 *   # terminal 1
 *   node scripts/mock-anthropic.mjs
 *
 *   # terminal 2
 *   PORT=3444 ANTHROPIC_API_KEY=sk-ant-mock \
 *     ANTHROPIC_BASE_URL=http://127.0.0.1:3222 \
 *     LICENSE_SECRET=e2e-test-secret-long-enough-here node server.js
 *
 *   # terminal 3
 *   E2E_PRO_KEY=$(LICENSE_SECRET=e2e-test-secret-long-enough-here \
 *     node scripts/mint-license.mjs pro | grep AYK) node scripts/test-e2e.mjs
 *
 * Requires playwright:  npm i -D playwright && npx playwright install chromium
 */
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const PRO_KEY = process.env.E2E_PRO_KEY;
if (!PRO_KEY) {
  console.error('Set E2E_PRO_KEY. See the header comment in this file.');
  process.exit(1);
}
const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const SP = process.env.SHOT_DIR || '.';

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { console.log(`ok   ${name}`); pass++; }
  else { console.log(`FAIL ${name}${detail ? ' -> ' + detail : ''}`); fail++; }
};

const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

// ---------------------------------------------------------------- 1. free run
await page.goto(BASE + '/app', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.pick', { timeout: 5000 });
check('catalogue loads 8 generators', await page.locator('.pick').count() === 8);
check('paid generators show a lock', await page.locator('.pick.locked').count() === 5);
check('Generate is enabled on a free pack', !(await page.locator('#go').isDisabled()));

await page.fill('#f-brief', 'hi i saw ur work. we are a small skincare brand in accra, need a proper logo and maybe packaging. budget is flexible but not too much. how soon can u start?');
await page.fill('#f-service', 'Brand identity design for consumer product startups');
await page.selectOption('#currency', 'GHS');
await page.click('#go');

await page.waitForFunction(() => document.querySelector('#out')?.textContent?.includes('Before you send this'), { timeout: 20000 });
const outText = await page.locator('#out').innerText();

check('output streamed and rendered', outText.length > 500);
check('headings rendered as HTML', await page.locator('#out h3').count() >= 3);
check('fenced message rendered as a copy block', await page.locator('#out pre').count() >= 1);
check('table rendered', await page.locator('#out table').count() === 1);
check('bold rendered', await page.locator('#out strong').count() >= 2);
check('warning section present', outText.includes('Before you send this'));
check('no raw markdown leaked into the DOM', !outText.includes('##') && !outText.includes('**'));
check('Copy button enabled after run', !(await page.locator('#copy').isDisabled()));
check('Download button enabled after run', !(await page.locator('#download').isDisabled()));
const meterText = await page.locator('#meter').innerText();
check('run meter reports remaining runs', /runs left today|No runs left today/.test(meterText), meterText);
check('draft saved to history', await page.locator('#hist button').count() === 1);
await page.screenshot({ path: `${SP}/shot-e2e-output.png` });

// ------------------------------------------------------- 2. locked pack gating
await page.click('[data-pack="invoice"]');
await page.waitForTimeout(250);
check('locked pack disables Generate', await page.locator('#go').isDisabled());
check('locked pack shows an upgrade banner', (await page.locator('.banner-lock').innerText()).toLowerCase().includes('pro'));

// -------------------------------------------------------- 3. licence unlocks it
await page.click('#lic-btn');
await page.fill('#lic-input', PRO_KEY);
await page.click('button[value="save"]');
await page.waitForTimeout(400);
check('licence removes all locks', await page.locator('.pick.locked').count() === 0);
check('licence enables the Pro generator', !(await page.locator('#go').isDisabled()));

// A Pro generation must now actually succeed server-side.
await page.fill('#f-client', 'Accra Skincare Ltd');
await page.fill('#f-freelancer', 'Peace S.');
await page.fill('#f-work', 'Brand identity - logo, colour, type\nPackaging dielines x3');
await page.fill('#f-price', '12000');
await page.click('#go');
await page.waitForFunction(() => document.querySelector('#out')?.textContent?.includes('Before you send this'), { timeout: 20000 });
check('Pro generator runs with a valid licence', (await page.locator('#out').innerText()).length > 500);
check('licence tier shown in the meter', /pro|59|58/i.test(await page.locator('#meter').innerText()));

// ------------------------------------------------------ 4. forged key rejected
await page.click('#lic-btn');
await page.fill('#lic-input', 'AYK-P0-AAAAAAAA-BBBBBBBBBB');
await page.click('button[value="save"]');
await page.waitForTimeout(300);
await page.click('[data-pack="scope"]');
await page.fill('#f-agreed', 'Logo and packaging for a skincare brand, three revision rounds included.');
await page.fill('#f-client', 'Accra Skincare Ltd');
await page.fill('#f-freelancer', 'Peace S.');
await page.fill('#f-price', '12000');
await page.click('#go');
await page.waitForSelector('.banner-err', { timeout: 15000 });
check('forged licence rejected by the server', (await page.locator('.banner-err').innerText()).toLowerCase().includes('not valid'));

// --------------------------------------------------------- 5. French interface
await page.click('#lic-btn');
await page.click('button[value="clear"]');
await page.waitForTimeout(200);
await page.selectOption('#language', 'fr');
await page.waitForTimeout(300);
const frBody = await page.locator('body').innerText();
check('UI switches to French', frBody.includes('Que devez-vous') && frBody.includes('Generer'));
check('generator names translate', (await page.locator('.pick').first().innerText()).includes('Proposition'));
await page.screenshot({ path: `${SP}/shot-e2e-french.png` });

// -------------------------------------------------------- 6. validation + limits
await page.selectOption('#language', 'en');
await page.click('[data-pack="proposal"]');
await page.waitForTimeout(300);
await page.fill('#f-brief', '');
await page.fill('#f-service', '');
await page.click('#go');
await page.waitForTimeout(400);
check('empty required fields blocked client-side', (await page.locator('.banner-err').innerText()).includes('marked with'));

check('no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | '));

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
