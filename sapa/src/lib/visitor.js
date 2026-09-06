/* Anonymous visitor identity.
 *
 * A random ID in localStorage — no fingerprinting, no cross-site identifier,
 * nothing derived from the device. Clearing site data genuinely resets it.
 */

const VISITOR_KEY = 'sapa.visitor_id';
const NAME_KEY = 'sapa.display_name';
const SESSION_KEY = 'sapa.session_started';

export const MAX_NAME_LENGTH = 40;
export const ANONYMOUS_NAME = 'Anonymous Survivor';

function randomId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 24);
    const bytes = new Uint8Array(12);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Non-cryptographic fallback where crypto is unavailable. Only ever used
    // to count visits, never for anything security-sensitive.
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function write(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

/** Stable per-browser ID. Created on first call, reused thereafter. */
export function getVisitorId() {
  let id = read(VISITOR_KEY);
  if (!id) {
    id = `visitor_${randomId()}`;
    write(VISITOR_KEY, id);
  }
  return id;
}

/** True the first time this browser is seen (used to count unique visitors). */
export function isNewVisitor() {
  return !read(VISITOR_KEY);
}

/* Names are user-supplied text that lands in an admin table. Filter by code
 * point rather than a regex class: drop C0/C1 control characters and angle
 * brackets, collapse whitespace, then cap the length. */
export function sanitiseName(raw) {
  if (typeof raw !== 'string') return '';
  const cleaned = Array.from(raw)
    .filter((char) => {
      const code = char.codePointAt(0);
      if (code < 32 || code === 127) return false;
      if (code >= 128 && code <= 159) return false;
      return char !== '<' && char !== '>';
    })
    .join('');
  return cleaned.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
}

export function getDisplayName() {
  return read(NAME_KEY) || '';
}

export function setDisplayName(name) {
  const clean = sanitiseName(name);
  if (!clean) return '';
  write(NAME_KEY, clean);
  return clean;
}

export function displayNameOrAnonymous() {
  return getDisplayName() || ANONYMOUS_NAME;
}

/** One "visit" per browser tab session, so a refresh is not a new visit. */
export function startSession() {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return { isNewSession: false, startedAt: existing };
    const startedAt = new Date().toISOString();
    sessionStorage.setItem(SESSION_KEY, startedAt);
    return { isNewSession: true, startedAt };
  } catch {
    return { isNewSession: true, startedAt: new Date().toISOString() };
  }
}

/** Wipe every local trace of this browser's use of the app. */
export function resetLocalData() {
  const keys = [VISITOR_KEY, NAME_KEY, 'sapa.scenario', 'sapa.result', 'sapa.best_battle', 'sapa.name_prompted'];
  try { keys.forEach((key) => localStorage.removeItem(key)); } catch { /* storage blocked */ }
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* storage blocked */ }
}
