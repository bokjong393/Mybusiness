/* VILLAGE PEOPLE — interpretation layer
 *
 * The model does ONE job: split a messy complaint into separate grievances and
 * tag each with a department. It never writes the minutes — the bureaucratic
 * form is the joke, and a model left to freestyle abandons that form fast.
 *
 * Falls back to the deterministic classifier in engine.js, so the page is
 * funny for a visitor with no API key, no network, and no patience.
 */
(function (root) {
  'use strict';

  var Data = root.VPData;
  var Engine = root.VPEngine;

  var STORAGE_KEY = 'villagepeople.credentials.v1';
  var PROXY_URL = (root.VP_CONFIG || {}).proxyUrl || null;

  var CATEGORIES = Data.DEPARTMENTS.map(function (d) { return d.key; });

  var SYSTEM_PROMPT = [
    'You sort a description of someone\'s bad week into separate grievances for a satirical committee.',
    'Return ONLY a JSON object, no prose and no code fences.',
    'Shape: {"incidents":[{"category":"<key>","summary":"<short quote of their own words>"}],"note":"<one line>"}',
    'Valid category keys, and nothing else: ' + CATEGORIES.join(', ') + '.',
    'One incident per distinct misfortune, at most 8. Keep summary under 120 characters.',
    'summary must stay close to the person\'s OWN wording — lightly cleaned up, not rewritten.',
    'note is one deadpan line of committee minute-taking about their week, max 20 words.',
    'HARD RULE: never name, describe or blame any real person. No relatives, no named individuals.',
    'The joke is always aimed at an absurd fictional committee, never at the person or their family.',
    'Keep it warm and self-deprecating. Nothing cruel, nothing about death, illness of others, or real tragedy.'
  ].join('\n');

  function loadCredentials() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (err) {
      return {};
    }
  }

  function saveCredentials(provider, key) {
    try {
      if (!key) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider: provider, key: key }));
      return true;
    } catch (err) {
      return false;
    }
  }

  function extractJson(text) {
    if (!text) return null;
    var start = text.indexOf('{');
    var end = text.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch (err) {
      return null;
    }
  }

  /* Model output is never trusted straight into the engine: unknown categories
   * are re-classified locally rather than passed through. */
  function sanitise(payload) {
    var incidents = [];
    if (payload && Array.isArray(payload.incidents)) {
      payload.incidents.slice(0, 8).forEach(function (entry) {
        if (!entry || typeof entry.summary !== 'string') return;
        var summary = entry.summary.trim().slice(0, 160);
        if (summary.length < 4) return;
        var category = CATEGORIES.indexOf(entry.category) !== -1
          ? entry.category
          : Engine.departmentFor(summary).key;
        incidents.push({ category: category, summary: summary });
      });
    }
    var note = payload && typeof payload.note === 'string' ? payload.note.trim().slice(0, 160) : '';
    return { incidents: incidents, note: note };
  }

  function userPrompt(text) {
    return 'My week went like this:\n\n' + String(text).slice(0, 1200);
  }

  async function callProxy(text) {
    var response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: String(text).slice(0, 1200) })
    });
    if (!response.ok) throw new Error('Proxy returned ' + response.status);
    return response.json();
  }

  async function callClaude(text, apiKey) {
    var body = {
      model: 'claude-opus-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      // A short classification, and nobody waits through a thinking pause
      // for a joke to arrive.
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: userPrompt(text) }]
    };

    async function send(withFallbacks) {
      var headers = {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      };
      var payload = Object.assign({}, body);
      if (withFallbacks) {
        headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
        payload.fallbacks = 'default';
      }
      return fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: headers, body: JSON.stringify(payload)
      });
    }

    // Opt into refusal fallbacks, but never let an unavailable beta kill it.
    var response = await send(true);
    if (response.status === 400) response = await send(false);
    if (!response.ok) throw new Error('Claude API returned ' + response.status);

    var data = await response.json();
    if (data.stop_reason === 'refusal') throw new Error('Request was declined.');
    return extractJson((data.content || [])
      .filter(function (b) { return b.type === 'text'; })
      .map(function (b) { return b.text; }).join(''));
  }

  async function callGemini(text, apiKey) {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='
      + encodeURIComponent(apiKey);
    var response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt(text) }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.9 }
      })
    });
    if (!response.ok) throw new Error('Gemini API returned ' + response.status);
    var data = await response.json();
    var parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
    return extractJson(parts.map(function (p) { return p.text || ''; }).join(''));
  }

  /* Always resolves. Reports which path answered so the UI can be honest. */
  async function interpret(text) {
    var creds = loadCredentials();
    var attempts = [];

    if (PROXY_URL) attempts.push({ source: 'proxy', run: function () { return callProxy(text); } });
    if (creds.key && creds.provider === 'anthropic') {
      attempts.push({ source: 'claude', run: function () { return callClaude(text, creds.key); } });
    }
    if (creds.key && creds.provider === 'gemini') {
      attempts.push({ source: 'gemini', run: function () { return callGemini(text, creds.key); } });
    }

    for (var i = 0; i < attempts.length; i++) {
      try {
        var clean = sanitise(await attempts[i].run());
        if (clean.incidents.length) {
          clean.source = attempts[i].source;
          return clean;
        }
      } catch (err) {
        if (root.console && root.console.warn) {
          root.console.warn('[Village People] ' + attempts[i].source + ' failed:', err.message);
        }
      }
    }

    return { incidents: Engine.classify(text), note: '', source: 'local' };
  }

  root.VPAI = {
    interpret: interpret,
    loadCredentials: loadCredentials,
    saveCredentials: saveCredentials,
    sanitise: sanitise,
    SYSTEM_PROMPT: SYSTEM_PROMPT
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
