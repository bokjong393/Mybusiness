/* SAPA ANALYTICS — first-party usage tracking.
 *
 * Design rules, in priority order:
 *   1. The app must never break because analytics broke. Every exported
 *      function resolves; none of them throw. A dead network, a missing
 *      config, a rejected RLS policy — all degrade to a silent no-op.
 *   2. No raw financial values leave the browser. Callers pass amounts and
 *      this module widens them into bands before sending anything.
 *   3. All Supabase access lives here. UI components never import the client.
 *
 * Writes go through SECURITY DEFINER database functions rather than direct
 * table access, so the anon key can record activity without being able to
 * read anybody's row. See supabase/schema.sql and supabase/policies.sql.
 */

import { ensureSupabase, isConfigured } from './supabase.js';
import {
  getVisitorId, getDisplayName, setDisplayName, sanitiseName,
  startSession as startLocalSession, displayNameOrAnonymous
} from './visitor.js';
import { cashBand, spendingBand, runwayBand, survivalBand } from './bands.js';

const DEV = Boolean(import.meta.env?.DEV);

/** Analytics is only "on" when a backend is actually configured. */
export function isEnabled() {
  return isConfigured();
}

/* Single choke point for failure. Anything that goes wrong is swallowed;
 * in development it is logged once so it is debuggable, in production it is
 * silent so a user never sees a broken app because a counter failed. */
async function safe(label, run, fallback = null) {
  if (!isEnabled()) return fallback;
  try {
    const db = await ensureSupabase();
    if (!db) return fallback;
    return await run(db);
  } catch (error) {
    if (DEV) console.warn(`[sapa analytics] ${label} failed:`, error?.message || error);
    return fallback;
  }
}

/* ─────────────────────────────────────────────── visitor lifecycle */

/**
 * Ensure this browser has a visitor row and count the visit.
 * Safe to call on every app open — the database function upserts and only
 * increments visit_count once per session token it is given.
 */
export async function initializeVisitor() {
  const visitorId = getVisitorId();
  const session = startLocalSession();

  await safe('initializeVisitor', (db) =>
    db.rpc('sapa_touch_visitor', {
      p_visitor_id: visitorId,
      p_display_name: getDisplayName() || null,
      p_count_visit: session.isNewSession
    }).then(throwOnError)
  );

  if (session.isNewSession) await trackEvent('app_open');
  return { visitorId, isNewSession: session.isNewSession };
}

/** Attach an optional display name to this visitor. */
export async function updateDisplayName(rawName) {
  const clean = sanitiseName(rawName);
  if (!clean) return '';
  setDisplayName(clean);

  await safe('updateDisplayName', (db) =>
    db.rpc('sapa_set_display_name', {
      p_visitor_id: getVisitorId(),
      p_display_name: clean
    }).then(throwOnError)
  );

  await trackEvent('name_submitted', { hasName: true });
  return clean;
}

export function startSession() {
  return startLocalSession();
}

/* ─────────────────────────────────────────────── events */

/**
 * Record one product event. Metadata must already be privacy-safe — this
 * function does not inspect it, so callers use the record* helpers below
 * rather than assembling metadata by hand.
 */
export async function trackEvent(eventName, metadata = {}) {
  if (!eventName) return false;
  const ok = await safe('trackEvent', (db) =>
    db.rpc('sapa_track_event', {
      p_visitor_id: getVisitorId(),
      p_event_name: String(eventName).slice(0, 64),
      p_metadata: metadata || {}
    }).then(throwOnError).then(() => true),
  false);
  return Boolean(ok);
}

/** Bump one of the per-visitor feature counters (whitelisted server-side). */
export async function incrementFeatureCount(counter) {
  return safe('incrementFeatureCount', (db) =>
    db.rpc('sapa_bump_counter', {
      p_visitor_id: getVisitorId(),
      p_counter: counter
    }).then(throwOnError).then(() => true),
  false);
}

/* ─────────────────────────────────────────────── recorders
 * These are the only functions UI code should call. Each one converts real
 * figures into bands before anything is sent. */

export function recordAppOpen() {
  return trackEvent('app_open');
}

export function recordDemoStarted(surface) {
  return trackEvent('demo_started', { surface });
}

export function recordMeterStarted() {
  return trackEvent('meter_started');
}

/** Note the banded arguments: no exact cash, spend or date is ever sent. */
export async function recordMeterCompleted({ currentCash, weeklySpending, runwayDays, riskId, hasIncome, hasExpense }) {
  await incrementFeatureCount('meter_count');
  return trackEvent('meter_completed', {
    cashBand: cashBand(currentCash),
    spendingBand: spendingBand(weeklySpending),
    runwayBand: runwayBand(runwayDays),
    riskLevel: riskId,
    hasFutureIncome: Boolean(hasIncome),
    hasFutureExpense: Boolean(hasExpense)
  });
}

export async function recordBattleStarted({ runwayDays } = {}) {
  await incrementFeatureCount('battle_started_count');
  return trackEvent('battle_started', { runwayBand: runwayBand(runwayDays) });
}

export function recordBattleEventAnswered({ category, optionId, direction }) {
  return trackEvent('battle_event_answered', { category, optionId, direction });
}

export async function recordBattleCompleted({ rankId, survivedDays, daysBeyond }) {
  await incrementFeatureCount('battle_completed_count');
  return trackEvent('battle_completed', {
    rank: rankId,
    survivalBand: survivalBand(survivedDays),
    performance: daysBeyond >= 0 ? 'beat-forecast' : 'below-forecast'
  });
}

export function recordBattleFailed({ rankId, survivedDays }) {
  return trackEvent('battle_failed', {
    rank: rankId,
    survivalBand: survivalBand(survivedDays)
  });
}

export async function recordLabOpened() {
  await incrementFeatureCount('lab_count');
  return trackEvent('lab_opened');
}

export function recordLabScenario({ scenarioId, direction }) {
  return trackEvent('lab_scenario_tested', { scenario: scenarioId, direction });
}

export async function recordShare({ surface }) {
  await incrementFeatureCount('share_count');
  return trackEvent('result_shared', { surface });
}

export async function recordDownload({ surface }) {
  await incrementFeatureCount('download_count');
  return trackEvent('result_downloaded', { surface });
}

export function recordPlayAgain() {
  return trackEvent('play_again');
}

export function recordChallengeCreated({ days }) {
  return trackEvent('challenge_created', { survivalBand: survivalBand(days) });
}

export function recordChallengeOpened({ days }) {
  return trackEvent('challenge_opened', { survivalBand: survivalBand(days) });
}

/* ─────────────────────────────────────────────── reads */

/**
 * Aggregate counts safe to show publicly. Returns null when analytics is off
 * or the call fails, and the homepage hides the counter entirely rather than
 * displaying a fabricated number.
 */
export async function getPublicStats() {
  return safe('getPublicStats', async (db) => {
    const { data, error } = await db.rpc('sapa_public_stats');
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return {
      uniqueVisitors: Number(row.unique_visitors) || 0,
      meterCompleted: Number(row.meter_completed) || 0,
      battlesStarted: Number(row.battles_started) || 0,
      battlesCompleted: Number(row.battles_completed) || 0
    };
  });
}

/** Full analytics for the admin dashboard. Requires an authenticated session. */
export async function getAdminStats(since = null) {
  return safe('getAdminStats', async (db) => {
    const { data, error } = await db.rpc('sapa_admin_stats', { p_since: since });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    const uniqueVisitors = Number(row.unique_visitors) || 0;
    const totalVisits = Number(row.total_visits) || 0;
    const returning = Number(row.returning_visitors) || 0;
    const meter = Number(row.meter_completed) || 0;
    const started = Number(row.battles_started) || 0;
    const completed = Number(row.battles_completed) || 0;
    const shares = Number(row.shares) || 0;
    const sharers = Number(row.sharing_visitors) || 0;

    const rate = (numerator, denominator) => (denominator > 0 ? (numerator / denominator) * 100 : 0);

    return {
      uniqueVisitors,
      totalVisits,
      returningVisitors: returning,
      namedVisitors: Number(row.named_visitors) || 0,
      meterCompleted: meter,
      battlesStarted: started,
      battlesCompleted: completed,
      labUses: Number(row.lab_uses) || 0,
      shares,
      downloads: Number(row.downloads) || 0,
      // Derived engagement metrics, computed here so the dashboard stays dumb.
      battleCompletionRate: rate(completed, started),
      shareRate: rate(sharers, uniqueVisitors),
      meterToBattleRate: rate(started, meter),
      returningRate: rate(returning, uniqueVisitors),
      averageVisitsPerUser: uniqueVisitors > 0 ? totalVisits / uniqueVisitors : 0
    };
  });
}

/** Per-visitor rows for the admin SURVIVORS table. */
export async function getTopUsers({ limit = 25, since = null } = {}) {
  return safe('getTopUsers', async (db) => {
    const { data, error } = await db.rpc('sapa_admin_visitors', { p_limit: limit, p_since: since });
    if (error) throw error;
    return (data || []).map((row) => ({
      name: row.display_name || 'Anonymous Survivor',
      isNamed: Boolean(row.display_name),
      firstSeen: row.first_seen_at,
      lastSeen: row.last_seen_at,
      visits: Number(row.visit_count) || 0,
      meter: Number(row.meter_count) || 0,
      battlesStarted: Number(row.battle_started_count) || 0,
      battlesCompleted: Number(row.battle_completed_count) || 0,
      lab: Number(row.lab_count) || 0,
      shares: Number(row.share_count) || 0
    }));
  }, []);
}

/** Recent activity feed. Never includes financial values. */
export async function getRecentActivity({ limit = 20 } = {}) {
  return safe('getRecentActivity', async (db) => {
    const { data, error } = await db.rpc('sapa_admin_activity', { p_limit: limit });
    if (error) throw error;
    return (data || []).map((row) => ({
      name: row.display_name || 'Anonymous Survivor',
      event: row.event_name,
      at: row.created_at
    }));
  }, []);
}

function throwOnError(response) {
  if (response?.error) throw response.error;
  return response;
}

export { displayNameOrAnonymous };
