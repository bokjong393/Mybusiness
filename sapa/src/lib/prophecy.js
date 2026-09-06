/* AI commentary client.
 *
 * The model is asked for three short strings and nothing else. It never sees
 * a request to compute anything, and its reply is never parsed for numbers —
 * every figure on screen comes from sapaEngine.js.
 *
 * Calls a same-origin serverless route so the API key stays server-side.
 * Any failure (no route deployed, no key, rate limit, refusal) falls back to
 * the local commentary bank, which is the default experience.
 */

import { getFallbackCommentary } from './fallbackProphecies.js';

const ROUTE = '/api/prophecy';
const TIMEOUT_MS = 6000;

/* Opt-in. A static deploy (GitHub Pages) has no serverless route, so calling
 * it would guarantee a failed request and a console error on every forecast.
 * Set VITE_AI_ENABLED=true only where api/prophecy.js is actually deployed;
 * everywhere else the built-in commentary bank is the intended experience. */
const AI_ENABLED = String(import.meta.env?.VITE_AI_ENABLED || '').toLowerCase() === 'true';

let routeAvailable = null; // null = untested, false = give up for this session

export async function getCommentary({ riskId, riskLabel, runwayDays, survives, seed = '' }) {
  const fallback = getFallbackCommentary(riskId, seed);
  if (!AI_ENABLED || routeAvailable === false) return fallback;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // Only the classification and the day count are sent. No balance, no
      // spending, no name, no date.
      body: JSON.stringify({ riskId, riskLabel, runwayDays, survives }),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!response.ok) {
      // Stop retrying for this session on any failure: a second attempt would
      // just add another console error without changing the outcome.
      routeAvailable = false;
      return fallback;
    }

    const data = await response.json();
    routeAvailable = true;

    return {
      diagnosis: clean(data.diagnosis) || fallback.diagnosis,
      suggestion: clean(data.suggestion) || fallback.suggestion,
      prophecy: clean(data.prophecy) || fallback.prophecy,
      source: 'ai'
    };
  } catch {
    // Includes the abort on timeout. Never surfaced to the user as an error —
    // the local commentary is a complete experience on its own.
    return fallback;
  }
}

function clean(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, 220);
}
