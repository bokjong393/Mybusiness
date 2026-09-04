#!/usr/bin/env node
/**
 * Ayoka — licence key minting.
 *
 * Run this after every sale, paste the key into the delivery email.
 *
 *   node scripts/mint-license.mjs --new-secret        make a LICENSE_SECRET
 *   node scripts/mint-license.mjs pro                 lifetime Pro key
 *   node scripts/mint-license.mjs starter             lifetime Starter key
 *   node scripts/mint-license.mjs pro --days 365      one-year Pro key
 *   node scripts/mint-license.mjs pro --count 10      ten keys (for a bundle deal)
 *   node scripts/mint-license.mjs --check AYK-...     verify a key a customer sent you
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mintLicense, verifyLicense } from '../lib/license.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(here, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

if (args.includes('--new-secret')) {
  console.log('\nAdd this to your .env (and to your host\'s environment variables):\n');
  console.log(`LICENSE_SECRET=${crypto.randomBytes(32).toString('base64url')}\n`);
  console.log('Keep it secret. If you change it later, every key you have already sold stops working.\n');
  process.exit(0);
}

const secret = process.env.LICENSE_SECRET;
if (!secret || secret.length < 16 || secret === 'change-me-to-a-long-random-string') {
  console.error('\n✗ LICENSE_SECRET is not set (or is still the placeholder).');
  console.error('  Run:  node scripts/mint-license.mjs --new-secret\n');
  process.exit(1);
}

const checkKey = flag('check');
if (checkKey) {
  const result = verifyLicense(checkKey, secret);
  console.log(result.valid
    ? `\n✓ Valid ${result.tier.toUpperCase()} licence${result.expiresOn ? `, expires ${result.expiresOn}` : ' (lifetime)'}\n`
    : `\n✗ Not valid — reason: ${result.reason}\n`);
  process.exit(result.valid ? 0 : 1);
}

const tier = (args[0] || '').toLowerCase();
if (!['starter', 'pro'].includes(tier)) {
  console.error('\nUsage: node scripts/mint-license.mjs <starter|pro> [--days N] [--count N]\n');
  process.exit(1);
}

const days = flag('days') ? Number(flag('days')) : null;
const count = Number(flag('count', 1));

console.log(`\n${count} × ${tier.toUpperCase()} licence${days ? ` (${days} days)` : ' (lifetime)'}:\n`);
for (let i = 0; i < count; i++) console.log('  ' + mintLicense(tier, secret, days));
console.log('\nLog every key you issue against the buyer\'s email — see business/04-operations-runbook.md.\n');
