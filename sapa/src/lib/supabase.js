/* Supabase client factory.
 *
 * The whole app is designed to run with NO Supabase configured — analytics
 * becomes a no-op and the social-proof counter hides itself rather than
 * inventing a number. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to
 * switch it on.
 *
 * Only the anon key ever reaches the browser, and it is constrained by Row
 * Level Security (supabase/policies.sql): the public role may insert events
 * and upsert its own visitor row, and may NOT read the visitors table.
 *
 * The client is created lazily so a missing or broken config can never break
 * first paint.
 */

const url = import.meta.env?.VITE_SUPABASE_URL || '';
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

let client = null;
let loading = null;

export function isConfigured() {
  return Boolean(url && anonKey);
}

/* The SDK is imported dynamically so an app with no analytics configured —
 * the default — never ships it to the browser at all. That matters on mobile
 * data, which is the primary way this app will be opened. */
export async function ensureSupabase() {
  if (!isConfigured()) return null;
  if (client) return client;
  if (!loading) {
    loading = import('@supabase/supabase-js')
      .then(({ createClient }) => {
        client = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
        return client;
      })
      .catch((error) => {
        if (import.meta.env?.DEV) console.warn('[sapa] Supabase client unavailable:', error.message);
        return null;
      });
  }
  return loading;
}

/** Non-blocking accessor for code that runs after ensureSupabase() resolved. */
export function getSupabase() {
  return client;
}
