/* Serverless commentary route (Vercel-compatible).
 *
 * The AI key lives ONLY in this server-side environment variable. It is never
 * prefixed with VITE_, so it is never inlined into the browser bundle.
 *
 * The model writes three short strings. It is given a risk band and a day
 * count and is explicitly forbidden from producing figures — every number the
 * user sees was computed by src/lib/sapaEngine.js before this route was called.
 */

const SYSTEM_PROMPT = [
  'You write short, funny commentary for SAPA, a Nigerian financial survival simulator.',
  '"Sapa" is Nigerian slang for being suddenly broke.',
  'Return ONLY a JSON object: {"diagnosis":"...","suggestion":"...","prophecy":"..."}',
  'diagnosis: one witty line about the situation, max 22 words.',
  'suggestion: ONE practical, non-judgemental money action, max 22 words.',
  'prophecy: a very short punchy line for a share card, max 10 words.',
  'NEVER output any number, amount, date, or day count. You are given the result; you only describe it.',
  'Light Nigerian humour, mostly plain English. Do not write everything in Pidgin.',
  'Never shame the user for being broke. Never mention tribe, religion, or politics.',
  'No financial advice involving loans, betting, crypto or investments.'
].join('\n');

export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json({ ok: true, service: 'sapa-prophecy' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  // 501 tells the client to stop retrying for this session.
  if (!apiKey) return res.status(501).json({ error: 'No AI provider configured.' });

  const { riskId, riskLabel, runwayDays, survives } = req.body || {};
  const situation = survives
    ? `Risk band: ${riskLabel}. Their money outlasts the forecast horizon.`
    : `Risk band: ${riskLabel} (${riskId}). Their money runs out in roughly ${Number(runwayDays) || 0} days.`;

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'server-side-fallback-2026-07-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-5',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        // Short creative writing, not a reasoning task — and a user is
        // watching a spinner while this runs.
        output_config: { effort: 'low' },
        // Route around a policy decline rather than returning nothing.
        fallbacks: 'default',
        messages: [{ role: 'user', content: situation }]
      })
    });

    if (!upstream.ok) return res.status(502).json({ error: 'Upstream AI request failed.' });

    const data = await upstream.json();
    if (data.stop_reason === 'refusal') return res.status(502).json({ error: 'Declined.' });

    const text = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) return res.status(502).json({ error: 'Unparseable reply.' });

    const parsed = JSON.parse(text.slice(start, end + 1));
    return res.status(200).json({
      diagnosis: String(parsed.diagnosis || '').slice(0, 220),
      suggestion: String(parsed.suggestion || '').slice(0, 220),
      prophecy: String(parsed.prophecy || '').slice(0, 120)
    });
  } catch {
    // The client falls back to local commentary, so this degrades quietly.
    return res.status(502).json({ error: 'Commentary unavailable.' });
  }
}
