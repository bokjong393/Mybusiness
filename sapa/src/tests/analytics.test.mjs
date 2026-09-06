/* Tests for visitor identity and the analytics helper.
 *
 * The critical property under test is that analytics NEVER breaks the app.
 * With no Supabase configured — which is the default the app ships in —
 * every call must resolve quietly instead of throwing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

/* Browser storage stubs, installed before the modules are imported so the
 * storage-reading code sees them. */
function makeStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    _size: () => store.size
  };
}

globalThis.localStorage = makeStorage();
globalThis.sessionStorage = makeStorage();

// Imported dynamically so the stubs above are in place first.
const visitor = await import('../lib/visitor.js');
const analytics = await import('../lib/analytics.js');

test('a visitor id is generated once and then reused', () => {
  localStorage.clear();
  assert.equal(visitor.isNewVisitor(), true);

  const first = visitor.getVisitorId();
  assert.match(first, /^visitor_[a-z0-9]+$/i);
  assert.equal(visitor.isNewVisitor(), false);
  assert.equal(visitor.getVisitorId(), first, 'the same browser must keep the same id');
});

test('two fresh browsers get different ids', () => {
  localStorage.clear();
  const a = visitor.getVisitorId();
  localStorage.clear();
  const b = visitor.getVisitorId();
  assert.notEqual(a, b);
});

test('the id is anonymous — it encodes nothing about the device', () => {
  localStorage.clear();
  const id = visitor.getVisitorId();
  // Not derived from anything: purely random, and long enough not to collide.
  assert.ok(id.length >= 16);
  assert.ok(!id.includes('@') && !id.includes('.'));
});

test('a visit is counted once per session, not once per page load', () => {
  sessionStorage.clear();
  const first = visitor.startSession();
  assert.equal(first.isNewSession, true);

  const second = visitor.startSession();
  assert.equal(second.isNewSession, false, 'a refresh in the same tab is the same visit');
  assert.equal(second.startedAt, first.startedAt);

  sessionStorage.clear();
  assert.equal(visitor.startSession().isNewSession, true, 'a new tab session is a new visit');
});

test('display names are optional and fall back to Anonymous Survivor', () => {
  localStorage.clear();
  assert.equal(visitor.getDisplayName(), '');
  assert.equal(visitor.displayNameOrAnonymous(), 'Anonymous Survivor');

  visitor.setDisplayName('Peace');
  assert.equal(visitor.getDisplayName(), 'Peace');
  assert.equal(visitor.displayNameOrAnonymous(), 'Peace');
});

test('names are sanitised and length-capped before storage', () => {
  assert.equal(visitor.sanitiseName('  Peace   Sossa  '), 'Peace Sossa');
  assert.equal(visitor.sanitiseName('<b>Peace</b>'), 'bPeace/b', 'angle brackets are stripped');
  assert.equal(visitor.sanitiseName('P'.repeat(100)).length, visitor.MAX_NAME_LENGTH);
  assert.equal(visitor.sanitiseName(''), '');
  assert.equal(visitor.sanitiseName(null), '');
  assert.equal(visitor.sanitiseName(12345), '');

  // Control characters must not survive into an admin table.
  const withControls = `Pe${String.fromCharCode(0)}ace${String.fromCharCode(27)}`;
  assert.equal(visitor.sanitiseName(withControls), 'Peace');
});

test('an empty name never overwrites a stored one', () => {
  localStorage.clear();
  visitor.setDisplayName('Peace');
  visitor.setDisplayName('   ');
  assert.equal(visitor.getDisplayName(), 'Peace');
});

test('reset clears every local trace', () => {
  localStorage.clear();
  sessionStorage.clear();
  visitor.getVisitorId();
  visitor.setDisplayName('Peace');
  localStorage.setItem('sapa.scenario', '{"currentCash":85000}');
  localStorage.setItem('sapa.result', '{"runwayDays":15}');

  visitor.resetLocalData();

  assert.equal(visitor.getDisplayName(), '');
  assert.equal(localStorage.getItem('sapa.scenario'), null);
  assert.equal(localStorage.getItem('sapa.result'), null);
  assert.equal(visitor.isNewVisitor(), true, 'a reset user is a brand new visitor');
});

test('analytics is disabled when no backend is configured', () => {
  assert.equal(analytics.isEnabled(), false);
});

test('tracking never throws when analytics is disabled', async () => {
  // This is the property that matters most: an unconfigured or broken
  // backend must not be able to break the product.
  await assert.doesNotReject(() => analytics.trackEvent('meter_completed', { runwayBand: '15-30' }));
  await assert.doesNotReject(() => analytics.initializeVisitor());
  await assert.doesNotReject(() => analytics.incrementFeatureCount('meter_count'));
  await assert.doesNotReject(() => analytics.recordMeterStarted());
  await assert.doesNotReject(() => analytics.recordPlayAgain());
  await assert.doesNotReject(() => analytics.recordBattleEventAnswered({ category: 'social', optionId: 'go', direction: 'closer' }));
});

test('disabled reads return safe empty values rather than failing', async () => {
  assert.equal(await analytics.getPublicStats(), null, 'null means "hide the counter", not "show zero"');
  assert.equal(await analytics.getAdminStats(), null);
  assert.deepEqual(await analytics.getTopUsers(), []);
  assert.deepEqual(await analytics.getRecentActivity(), []);
});

test('an empty event name is rejected without throwing', async () => {
  assert.equal(await analytics.trackEvent(''), false);
  assert.equal(await analytics.trackEvent(null), false);
});

test('recording a meter result still works with analytics off, and bands the inputs', async () => {
  // The call must succeed; separately, bands.js (covered in the engine tests)
  // guarantees the values would have been widened before transmission.
  await assert.doesNotReject(() => analytics.recordMeterCompleted({
    currentCash: 85342, weeklySpending: 31500, runwayDays: 15,
    riskId: 'number', hasIncome: true, hasExpense: true
  }));
});

test('updating a display name works offline and still sanitises', async () => {
  localStorage.clear();
  const stored = await analytics.updateDisplayName('  Peace <script>  ');
  assert.equal(stored, 'Peace script');
  assert.equal(visitor.getDisplayName(), 'Peace script');
});

test('storage being unavailable does not crash identity handling', () => {
  const realLocal = globalThis.localStorage;
  // Simulate a browser with site data blocked entirely.
  globalThis.localStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); }
  };
  try {
    assert.doesNotThrow(() => visitor.getVisitorId());
    assert.doesNotThrow(() => visitor.setDisplayName('Peace'));
    assert.doesNotThrow(() => visitor.resetLocalData());
    assert.equal(visitor.getDisplayName(), '');
  } finally {
    globalThis.localStorage = realLocal;
  }
});
