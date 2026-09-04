import { generate, UserError } from '../lib/handler.js';
import { createStore } from '../lib/store.js';
import { mintLicense } from '../lib/license.js';

const SECRET = 'a-secret-long-enough-for-testing-123';
const env = { LICENSE_SECRET: SECRET, ANTHROPIC_API_KEY: 'sk-ant-fake', FREE_RUNS_PER_DAY_PER_IP: '2', PAID_RUNS_PER_DAY_PER_LICENSE: '5', DAILY_OUTPUT_TOKEN_BUDGET: '1000' };
const store = createStore();
const noop = () => {};
let pass = 0, fail = 0;

async function expectError(label, body, code, opts = {}) {
  try {
    await generate({ body, ip: opts.ip || '1.2.3.4', env: opts.env || env, store: opts.store || store, write: noop });
    console.log(`✗ ${label}: expected ${code}, got success`); fail++;
  } catch (e) {
    if (e.code === code) { console.log(`✓ ${label} → ${code}`); pass++; }
    else { console.log(`✗ ${label}: expected ${code}, got ${e.code} (${e.message})`); fail++; }
  }
}

const proBody = (extra = {}) => ({ pack: 'proposal', currency: 'NGN', language: 'en', input: { brief: 'x'.repeat(60), service: 'branding', pricing_model: 'fixed' }, ...extra });

await expectError('unknown pack', { pack: 'nope' }, 'unknown_pack');
await expectError('locked pro pack, no licence', { pack: 'scope', input: {} }, 'locked');
await expectError('locked starter pack, no licence', { pack: 'pricing', input: {} }, 'locked');
await expectError('bad licence key', proBody({ license: 'AYK-P0-AAAAAAAA-BBBBBBBBBB' }), 'bad_license');
await expectError('missing required field', { pack: 'proposal', input: { service: 'x' } }, 'missing_field');
await expectError('too-short field', { pack: 'proposal', input: { brief: 'hi', service: 'x' } }, 'short_field');
await expectError('bad select value', { pack: 'proposal', input: { brief: 'x'.repeat(60), service: 'x', pricing_model: 'wat' } }, 'bad_field');
await expectError('non-numeric price', { pack: 'proposal', input: { brief: 'x'.repeat(60), service: 'x', price: 'abc' } }, 'bad_field');

// A valid starter licence must still be blocked from a Pro pack.
const starterKey = mintLicense('starter', SECRET);
await expectError('starter licence on pro pack', { pack: 'scope', license: starterKey, input: {} }, 'locked');

// Rate limiting: burn the free allowance, then confirm the block.
const rlStore = createStore();
rlStore.record('ip:9.9.9.9'); rlStore.record('ip:9.9.9.9');
await expectError('free tier exhausted', proBody(), 'rate_limited', { ip: '9.9.9.9', store: rlStore });

// A licensed user is tracked by key, not IP, so a shared IP does not block them.
const proKey = mintLicense('pro', SECRET);
const budgetStore = createStore();
budgetStore.record('someone', 1500); // over the 1000-token daily budget
await expectError('daily budget guard', proBody({ license: proKey }), 'budget_exhausted', { store: budgetStore });

// Verify a well-formed request gets past every guard and only fails at the network.
try {
  await generate({ body: proBody({ license: proKey }), ip: '5.5.5.5', env, store: createStore(), write: noop });
  console.log('✗ valid request: unexpectedly succeeded with a fake key'); fail++;
} catch (e) {
  if (e instanceof UserError) { console.log(`✗ valid request blocked by a guard: ${e.code}`); fail++; }
  else { console.log(`✓ valid request passed all guards, failed at API as expected (${e.constructor.name})`); pass++; }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
