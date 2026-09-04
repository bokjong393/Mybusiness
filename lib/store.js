/**
 * Ayoka — usage store.
 *
 * Counts runs and output tokens per UTC day so a viral post cannot hand you a
 * bill you cannot pay. Keeps everything in memory and mirrors it to a JSON
 * file when one is configured.
 *
 * HONEST LIMITATION: on serverless (Vercel/Netlify), each cold start gets a
 * fresh process, so these counters reset and the effective limit is per
 * instance, not global. That is fine as a first line of defence, but it is NOT
 * your real spend cap. Your real spend cap is the hard monthly limit you set in
 * the Anthropic Console. Set it before you launch. When traffic justifies it,
 * swap this file for Vercel KV or Upstash Redis — the interface below is
 * deliberately tiny so that is a one-file change.
 */
import fs from 'node:fs';
import path from 'node:path';

const today = () => new Date().toISOString().slice(0, 10);

export function createStore({ file = null } = {}) {
  let state = { day: today(), runs: {}, outputTokens: 0, totalRuns: 0 };

  if (file && fs.existsSync(file)) {
    try {
      const loaded = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (loaded && loaded.day === today()) state = loaded;
    } catch {
      // A corrupt counter file must never take the product down.
    }
  }

  function rollover() {
    if (state.day !== today()) state = { day: today(), runs: {}, outputTokens: 0, totalRuns: 0 };
  }

  function persist() {
    if (!file) return;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(state));
    } catch {
      // Read-only filesystem (most serverless hosts). In-memory still works.
    }
  }

  return {
    /** Runs used today by this identity (an IP for free users, a licence key for paid). */
    runsFor(id) {
      rollover();
      return state.runs[id] || 0;
    },
    outputTokensToday() {
      rollover();
      return state.outputTokens;
    },
    record(id, outputTokens = 0) {
      rollover();
      state.runs[id] = (state.runs[id] || 0) + 1;
      state.outputTokens += outputTokens;
      state.totalRuns += 1;
      persist();
    },
    snapshot() {
      rollover();
      return { ...state, uniqueIdentities: Object.keys(state.runs).length };
    },
  };
}
