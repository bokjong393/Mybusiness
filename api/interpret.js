/* PAY ME — optional server-side AI proxy
 *
 * NOT used by the GitHub Pages build. Deploy this on Vercel / Netlify /
 * Cloudflare and set window.PAY_ME_CONFIG.proxyUrl = 'api/interpret' in
 * index.html, and visitors get AI reading without supplying a key of their own.
 *
 * The point of this file is that the API key stays in a deployment environment
 * variable and never reaches the browser. Set ANTHROPIC_API_KEY or GEMINI_API_KEY
 * in your host's dashboard — never in this repository.
 *
 * Like the browser path, this endpoint returns categories and hours ONLY.
 * All pricing and arithmetic happens client-side in assets/js/engine.js.
 */

// Mirrors assets/js/data.js, which is the source of truth for these keys.
const TASK_KEYS = [
  'cooking', 'cleaning', 'laundry', 'childcare', 'eldercare',
  'tutoring', 'haircare', 'errands', 'repairs', 'admin', 'emotional'
];

const SYSTEM_PROMPT = [
  "You convert a description of someone's unpaid household work into structured data.",
  'Return ONLY a JSON object, no prose and no code fences.',
  'Shape: {"entries":[{"key":"<category key>","hours":<number>}],"job_title":"<string>","review":"<string>"}',
  'Valid category keys, and nothing else: ' + TASK_KEYS.join(', ') + '.',
  'hours is hours PER WEEK as a number.',
  'If they describe frequency ("every night", "twice a week"), estimate weekly hours sensibly.',
  'If no duration is given for a task, estimate a modest, believable weekly figure.',
  'Never invent money amounts, rates or totals — you output categories and hours only.',
  'job_title is a funny mock corporate title for someone doing this work unpaid, max 6 words.',
  'review is one dry, deadpan line of fake corporate HR feedback about being unpaid, max 22 words.',
  "Keep the humour warm and self-deprecating. Never blame or insult the person's family."
].join('\n');

function extractJson(text) {
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/* Never pass model output through untouched: drop unknown keys and coerce
 * hours, so a confused response cannot corrupt the client's payslip. */
function sanitise(payload) {
  const entries = [];
  if (payload && Array.isArray(payload.entries)) {
    for (const entry of payload.entries.slice(0, 12)) {
      if (!entry || !TASK_KEYS.includes(entry.key)) continue;
      const hours = Number(entry.hours);
      if (!Number.isFinite(hours) || hours <= 0) continue;
      entries.push({ key: entry.key, hours: Math.min(hours, 168) });
    }
  }
  return {
    entries,
    job_title: typeof payload?.job_title === 'string' ? payload.job_title.slice(0, 60) : '',
    review: typeof payload?.review === 'string' ? payload.review.slice(0, 200) : ''
  };
}

async function callClaude(text, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'server-side-fallback-2026-07-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      // Short classification, and a live demo cannot wait on deep reasoning.
      output_config: { effort: 'low' },
      // Route around a policy decline instead of returning nothing.
      fallbacks: 'default',
      messages: [{ role: 'user', content: text }]
    })
  });

  if (!response.ok) throw new Error(`Claude API ${response.status}`);
  const data = await response.json();
  if (data.stop_reason === 'refusal') throw new Error('Model declined the request');

  return extractJson(
    (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
  );
}

async function callGemini(text, apiKey) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='
    + encodeURIComponent(apiKey);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
    })
  });

  if (!response.ok) throw new Error(`Gemini API ${response.status}`);
  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return extractJson(parts.map((p) => p.text || '').join(''));
}

export default async function handler(req, res) {
  // Health probe: lets the client confirm the function exists before using it.
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, service: 'payme-interpret' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST.' });
  }

  const text = String(req.body?.text || '').slice(0, 1200);
  if (text.length < 8) {
    return res.status(400).json({ error: 'Describe your week in a sentence or two.' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!anthropicKey && !geminiKey) {
    return res.status(501).json({ error: 'No AI provider configured on this deployment.' });
  }

  try {
    const raw = anthropicKey
      ? await callClaude(text, anthropicKey)
      : await callGemini(text, geminiKey);

    const clean = sanitise(raw);
    if (!clean.entries.length) {
      return res.status(422).json({ error: 'Could not identify any household tasks.' });
    }
    return res.status(200).json(clean);
  } catch (error) {
    // The client falls back to its built-in classifier, so a failure here
    // degrades the experience rather than breaking it.
    return res.status(502).json({ error: 'Upstream AI request failed.' });
  }
}
