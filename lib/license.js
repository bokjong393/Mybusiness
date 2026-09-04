/**
 * Ayoka — offline-verifiable licence keys.
 *
 * A key looks like:  AYK-P0-9F3KQ2XM-7H2N4P8RQ1
 *                        │ │ │        └ 10-char HMAC signature
 *                        │ │ └ 8 random chars (makes each key unique)
 *                        │ └ expiry in days since epoch, base36 ("0" = lifetime)
 *                        └ tier: S = Starter, P = Pro
 *
 * The signature is HMAC-SHA256 over the core, keyed with LICENSE_SECRET. That
 * means the server can validate any key it ever issued without a database —
 * which is exactly what you want when you are selling through Gumroad or
 * Paystack and do not run one yet.
 *
 * Refunds and chargebacks are handled with a denylist (data/revoked.json),
 * because you cannot un-issue a signature.
 */
import crypto from 'node:crypto';

// Crockford-style alphabet: no I, L, O, U — nothing a customer can mistype.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const TIER_CHAR = { starter: 'S', pro: 'P' };
const CHAR_TIER = { S: 'starter', P: 'pro' };

function encodeBase32(buf, length) {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[buf[i % buf.length] % ALPHABET.length];
  return out;
}

function sign(core, secret) {
  const mac = crypto.createHmac('sha256', secret).update(core).digest();
  return encodeBase32(mac, 10);
}

function daysSinceEpoch(date = new Date()) {
  return Math.floor(date.getTime() / 86400000);
}

/**
 * Mint a licence key.
 * @param {'starter'|'pro'} tier
 * @param {string} secret        LICENSE_SECRET
 * @param {number|null} validDays  null / 0 for a lifetime key
 */
export function mintLicense(tier, secret, validDays = null) {
  const tierChar = TIER_CHAR[tier];
  if (!tierChar) throw new Error(`Unknown tier: ${tier}. Use "starter" or "pro".`);
  if (!secret || secret.length < 16) throw new Error('LICENSE_SECRET must be at least 16 characters.');

  const expDay = validDays ? daysSinceEpoch() + Number(validDays) : 0;
  const rand = encodeBase32(crypto.randomBytes(16), 8);
  const core = `${tierChar}${expDay.toString(36).toUpperCase()}-${rand}`;
  return `AYK-${core}-${sign(core, secret)}`;
}

/**
 * Verify a licence key.
 * @returns {{valid: boolean, tier?: string, reason?: string, expiresOn?: string}}
 */
export function verifyLicense(key, secret, revokedList = []) {
  if (!key || typeof key !== 'string') return { valid: false, reason: 'missing' };

  const clean = key.trim().toUpperCase().replace(/\s+/g, '');
  const m = /^AYK-([SP])([0-9A-Z]+)-([0-9A-Z]{8})-([0-9A-Z]{10})$/.exec(clean);
  if (!m) return { valid: false, reason: 'malformed' };

  const [, tierChar, expB36, rand, providedSig] = m;
  const core = `${tierChar}${expB36}-${rand}`;
  const expectedSig = sign(core, secret);

  // Constant-time compare — both strings are the same fixed length by construction.
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, reason: 'invalid' };
  }

  if (revokedList.includes(clean)) return { valid: false, reason: 'revoked' };

  const expDay = parseInt(expB36, 36);
  if (expDay > 0 && daysSinceEpoch() > expDay) {
    return { valid: false, reason: 'expired', expiresOn: new Date(expDay * 86400000).toISOString().slice(0, 10) };
  }

  return {
    valid: true,
    tier: CHAR_TIER[tierChar],
    key: clean,
    expiresOn: expDay > 0 ? new Date(expDay * 86400000).toISOString().slice(0, 10) : null,
  };
}
