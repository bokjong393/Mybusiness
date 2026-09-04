/**
 * Ayoka — the generation endpoint, written once and reused by every host.
 *
 * `generate()` is deliberately host-agnostic: it takes a parsed body and a
 * `write` callback, so the same code backs the local node:http server, a Vercel
 * function, and anything else you deploy to later.
 *
 * The wire format is newline-delimited JSON (one object per line):
 *   {"type":"meta",  "pack":"proposal","tier":"pro","runsLeft":57}
 *   {"type":"delta", "text":"## What I understand…"}
 *   {"type":"done",  "outputTokens":1840,"cached":true}
 *   {"type":"error", "code":"rate_limited","message":"…"}
 */
import Anthropic from '@anthropic-ai/sdk';
import { PACK_BY_ID, CURRENCIES, tierAllows } from './packs.js';
import { SYSTEM_PROMPT, buildUserTurn } from './prompts.js';
import { verifyLicense } from './license.js';

const CURRENCY_BY_CODE = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));

/** Output ceiling per run. This is a cost decision, not a quality one: the
 *  longest generator (Scope & Agreement) lands around 3k tokens, so 8k is
 *  generous headroom while capping the worst case at roughly $0.20 a run. */
const MAX_TOKENS = 8000;

let client = null;
function getClient(apiKey) {
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

class UserError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Validate the submitted fields against the pack's own field definitions. */
function validateInput(pack, raw) {
  const input = {};
  for (const field of pack.fields) {
    let value = raw?.[field.name];
    if (value === undefined || value === null) value = '';
    value = String(value).trim();

    if (!value) {
      if (field.required) throw new UserError('missing_field', `"${field.label}" is required.`);
      input[field.name] = '';
      continue;
    }
    if (field.minLength && value.length < field.minLength) {
      throw new UserError('short_field', `"${field.label}" needs at least ${field.minLength} characters — give me something to work with.`);
    }
    if (field.maxLength && value.length > field.maxLength) {
      value = value.slice(0, field.maxLength);
    }
    if (field.type === 'number') {
      const n = Number(value);
      if (!Number.isFinite(n)) throw new UserError('bad_field', `"${field.label}" must be a number.`);
      if (field.min !== undefined && n < field.min) throw new UserError('bad_field', `"${field.label}" must be at least ${field.min}.`);
      if (field.max !== undefined && n > field.max) throw new UserError('bad_field', `"${field.label}" must be at most ${field.max}.`);
      value = n;
    }
    if (field.type === 'select' && field.options && !field.options.some((o) => o.value === value)) {
      throw new UserError('bad_field', `"${field.label}" has an unexpected value.`);
    }
    input[field.name] = value;
  }
  return input;
}

function loadRevoked(env) {
  if (!env.REVOKED_LICENSES) return [];
  return env.REVOKED_LICENSES.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
}

/**
 * @param {object}   opts
 * @param {object}   opts.body   parsed JSON request body
 * @param {string}   opts.ip     caller IP, for the free-tier limit
 * @param {object}   opts.env    process.env (or a subset)
 * @param {object}   opts.store  created by createStore()
 * @param {Function} opts.write  (obj) => void — emits one NDJSON line
 */
export async function generate({ body, ip, env, store, write }) {
  const pack = PACK_BY_ID[body?.pack];
  if (!pack) throw new UserError('unknown_pack', 'That generator does not exist.', 404);

  // ---- Licence -----------------------------------------------------------
  let tier = null;
  let licenseKey = null;
  if (body.license) {
    const result = verifyLicense(body.license, env.LICENSE_SECRET || '', loadRevoked(env));
    if (!result.valid) {
      const messages = {
        malformed: 'That licence key does not look right. It should start with AYK- and have four parts.',
        invalid: 'That licence key is not valid. Check for typos, or reply to your receipt email.',
        expired: 'That licence has expired. Renew it to keep going.',
        revoked: 'That licence has been revoked.',
      };
      throw new UserError('bad_license', messages[result.reason] || 'Licence check failed.', 403);
    }
    tier = result.tier;
    licenseKey = result.key;
  }

  if (!tierAllows(tier, pack)) {
    throw new UserError(
      'locked',
      `"${pack.en.name}" is part of the ${pack.tier === 'pro' ? 'Pro' : 'Starter'} plan.`,
      402,
    );
  }

  // ---- Rate limits -------------------------------------------------------
  const identity = licenseKey || `ip:${ip}`;
  const limit = licenseKey
    ? Number(env.PAID_RUNS_PER_DAY_PER_LICENSE || 60)
    : Number(env.FREE_RUNS_PER_DAY_PER_IP || 3);
  const used = store.runsFor(identity);

  if (used >= limit) {
    throw new UserError(
      'rate_limited',
      licenseKey
        ? `You have used all ${limit} runs for today. They reset at midnight UTC.`
        : `You have used your ${limit} free runs for today. A licence unlocks ${env.PAID_RUNS_PER_DAY_PER_LICENSE || 60} a day.`,
      429,
    );
  }

  // ---- Global spend guard ------------------------------------------------
  const budget = Number(env.DAILY_OUTPUT_TOKEN_BUDGET || 200000);
  if (store.outputTokensToday() >= budget) {
    throw new UserError(
      'budget_exhausted',
      'Ayoka has hit its daily capacity. Please try again tomorrow — nothing is wrong with your account.',
      503,
    );
  }

  // ---- Build the request -------------------------------------------------
  const input = validateInput(pack, body.input);
  const language = body.language === 'fr' ? 'fr' : 'en';
  const currency = CURRENCY_BY_CODE[body.currency] || CURRENCY_BY_CODE.USD;
  const ctx = {
    language,
    currency: currency.code,
    currencySymbol: currency.symbol,
    tone: body.tone,
  };

  write({
    type: 'meta',
    pack: pack.id,
    tier: tier || 'free',
    runsLeft: Math.max(0, limit - used - 1),
    language,
    currency: currency.code,
  });

  const anthropic = getClient(env.ANTHROPIC_API_KEY);
  const model = env.ANTHROPIC_MODEL || 'claude-opus-5';

  const stream = anthropic.messages.stream({
    model,
    max_tokens: MAX_TOKENS,
    // effort is the main cost dial. "medium" holds quality on short business
    // copy; raise to "high" if you ever measure it losing something.
    output_config: { effort: env.ANTHROPIC_EFFORT || 'medium' },
    system: [
      // Stable prefix — see the warning at the top of prompts.js.
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: buildUserTurn(pack, input, ctx) }],
  });

  let charsOut = 0;
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      charsOut += event.delta.text.length;
      write({ type: 'delta', text: event.delta.text });
    }
  }

  const final = await stream.finalMessage();

  // Opus 5 can decline a request outright: HTTP 200 with stop_reason "refusal"
  // and no usable content. Check it before trusting the body.
  if (final.stop_reason === 'refusal') {
    store.record(identity, final.usage?.output_tokens || 0);
    throw new UserError(
      'declined',
      'I could not write that one. Rephrase the brief and try again — and if it keeps happening, email support.',
      422,
    );
  }

  const outputTokens = final.usage?.output_tokens || Math.ceil(charsOut / 4);
  store.record(identity, outputTokens);

  write({
    type: 'done',
    outputTokens,
    stopReason: final.stop_reason,
    truncated: final.stop_reason === 'max_tokens',
    cacheRead: final.usage?.cache_read_input_tokens || 0,
    cacheWrite: final.usage?.cache_creation_input_tokens || 0,
  });
}

export { UserError };
