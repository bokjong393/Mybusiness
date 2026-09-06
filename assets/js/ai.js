/* PAY ME — interpretation layer
 *
 * The ONLY jobs a language model is given here:
 *   1. turn a messy sentence about someone's week into task categories + hours
 *   2. write one job title and one performance-review line
 *
 * It is never asked for a rate, a multiplication or a total. Those live in
 * engine.js. That split is deliberate: an LLM inventing naira figures would
 * make the economics indefensible, which is the whole value of the project.
 *
 * Provider order: same-origin proxy -> Claude (BYOK) -> Gemini (BYOK) -> local.
 * The local path is a real keyword classifier, not an error state, so the
 * "describe your week" feature works for a voter with no API key at all.
 */
(function (root) {
  'use strict';

  var Data = root.PayMeData;
  var E = root.PayMeEngine;

  var STORAGE_KEY = 'payme.credentials.v1';
  // Configured in index.html. Null on the static build, which is why the page
  // makes zero network calls until the visitor asks for something.
  var PROXY_URL = (root.PAY_ME_CONFIG || {}).proxyUrl || null;

  var SYSTEM_PROMPT = [
    'You convert a description of someone\'s unpaid household work into structured data.',
    'Return ONLY a JSON object, no prose and no code fences.',
    'Shape: {"entries":[{"key":"<category key>","hours":<number>}],"job_title":"<string>","review":"<string>"}',
    'Valid category keys, and nothing else: ' + Data.TASKS.map(function (t) { return t.key; }).join(', ') + '.',
    'hours is hours PER WEEK as a number. If the person gives a total for the week, use it.',
    'If they describe frequency ("every night", "twice a week"), estimate the weekly hours sensibly.',
    'If no duration is given for a task, estimate a modest, believable weekly figure.',
    'Never invent money amounts, rates or totals — you output categories and hours only.',
    'job_title is a funny mock corporate title for someone doing this work unpaid, max 6 words.',
    'review is one dry, deadpan line of fake corporate HR feedback about being unpaid, max 22 words.',
    'Keep the humour warm and self-deprecating. Never blame or insult the person\'s family.'
  ].join('\n');

  /* ---------------------------------------------------------------- storage */

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

  /* ------------------------------------------------------------ json rescue */

  /* Models occasionally wrap JSON in prose or fences despite instructions.
   * Pull out the widest brace-balanced span rather than failing the request. */
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

  /* Never trust model output straight into the engine: drop unknown keys,
   * coerce hours, and cap list length. */
  function sanitise(payload, seed) {
    var entries = [];
    if (payload && Array.isArray(payload.entries)) {
      payload.entries.slice(0, 12).forEach(function (entry) {
        if (!entry || !Data.TASK_BY_KEY[entry.key]) return;
        var hours = E.clampHours(entry.hours);
        if (hours > 0) entries.push({ key: entry.key, hours: hours });
      });
    }
    var title = payload && typeof payload.job_title === 'string' ? payload.job_title.trim().slice(0, 60) : '';
    var review = payload && typeof payload.review === 'string' ? payload.review.trim().slice(0, 200) : '';
    return {
      entries: entries,
      jobTitle: title || E.pickDeterministic(Data.JOB_TITLES, seed),
      review: review || E.pickDeterministic(Data.REVIEWS, seed)
    };
  }

  /* ------------------------------------------------------------- local path */

  var KEYWORDS = {
    cooking: ['cook', 'cooked', 'cooking', 'food', 'meal', 'kitchen', 'soup', 'stew', 'rice', 'breakfast', 'lunch', 'dinner', 'bake', 'fry'],
    cleaning: ['clean', 'cleaned', 'cleaning', 'sweep', 'swept', 'mop', 'tidy', 'scrub', 'dishes', 'dust', 'parlour'],
    laundry: ['laundry', 'wash', 'washed', 'washing', 'iron', 'ironed', 'ironing', 'clothes'],
    childcare: ['baby', 'babies', 'toddler', 'childcare', 'nanny', 'watch the kids', 'younger ones', 'my nephew', 'my niece'],
    eldercare: ['grandma', 'grandmother', 'grandpa', 'grandfather', 'elderly', 'sick', 'hospital', 'medicine', 'nurse'],
    tutoring: ['homework', 'tutor', 'tutored', 'tutoring', 'teach', 'taught', 'lesson', 'waec', 'jamb', 'exam', 'assignment', 'maths', 'math'],
    haircare: ['hair', 'braid', 'braided', 'braiding', 'plait', 'plaited', 'weave', 'barb', 'salon'],
    errands: ['errand', 'errands', 'market', 'shopping', 'shop', 'buy', 'bought', 'groceries', 'pick up', 'delivery'],
    repairs: ['fix', 'fixed', 'repair', 'repaired', 'generator', 'plumbing', 'wiring', 'broken', 'mend'],
    admin: ['queue', 'queued', 'nepa', 'bank', 'paperwork', 'documents', 'registration', 'bills', 'admin', 'office'],
    emotional: ['listen', 'listened', 'advice', 'therapist', 'counsel', 'comfort', 'emotional', 'talked her', 'talked him', 'support']
  };

  var HOURS_PATTERN = /(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i;
  // Matches "3 times a week", "twice a day", and bare "every night".
  var TIMES_PATTERN = /(?:(\d+|once|twice|thrice)\s*(?:x|times)?\s*)?(?:a|per|every)\s+(day|night|morning|evening|week|weekend)/i;
  var WORD_NUMBERS = { once: 1, twice: 2, thrice: 3 };
  var DAILY_UNITS = ['day', 'night', 'morning', 'evening'];

  /* Split on clause boundaries so "cooked for 3 hours and braided hair for 2"
   * assigns each duration to the right task instead of to both. */
  function localInterpret(text, seed) {
    var clauses = String(text || '').split(/[,.;]|\band\b|\balso\b|\bthen\b/i);
    var found = {};

    clauses.forEach(function (clause) {
      var lower = clause.toLowerCase();
      if (!lower.trim()) return;

      var matched = [];
      Object.keys(KEYWORDS).forEach(function (key) {
        var hit = KEYWORDS[key].some(function (word) { return lower.indexOf(word) !== -1; });
        if (hit) matched.push(key);
      });
      if (!matched.length) return;

      var hours = null;
      var direct = lower.match(HOURS_PATTERN);
      if (direct) {
        hours = parseFloat(direct[1]);
      } else {
        var freq = lower.match(TIMES_PATTERN);
        if (freq) {
          var token = freq[1];
          var count = token == null ? 1
            : (WORD_NUMBERS[token] != null ? WORD_NUMBERS[token] : parseFloat(token));
          if (!isFinite(count) || count <= 0) count = 1;
          var daily = DAILY_UNITS.indexOf(freq[2].toLowerCase()) !== -1;
          // Daily habits: ~1 hr each time, seven times a week.
          // Weekly habits: ~1.5 hrs each time.
          hours = daily ? count * 7 : count * 1.5;
        }
      }
      if (hours === null) hours = 2;

      // Split a shared duration across every task named in the same clause.
      var share = hours / matched.length;
      matched.forEach(function (key) {
        found[key] = (found[key] || 0) + share;
      });
    });

    var entries = Object.keys(found).map(function (key) {
      return { key: key, hours: Math.round(found[key] * 10) / 10 };
    });

    return {
      entries: entries,
      jobTitle: E.pickDeterministic(Data.JOB_TITLES, seed),
      review: E.pickDeterministic(Data.REVIEWS, seed),
      source: 'local'
    };
  }

  /* ---------------------------------------------------------- remote paths */

  function userPrompt(text) {
    return 'Here is my week of unpaid household work:\n\n' + String(text).slice(0, 1200);
  }

  async function callProxy(text) {
    var response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: String(text).slice(0, 1200) })
    });
    if (!response.ok) throw new Error('Proxy returned ' + response.status);
    var data = await response.json();
    return data && data.entries ? data : extractJson(data && data.raw);
  }

  async function callClaude(text, apiKey) {
    var body = {
      model: 'claude-opus-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      // Low effort: this is a short classification, not a reasoning problem,
      // and a live demo cannot afford a long pause before the payslip appears.
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
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });
    }

    // Opt into server-side refusal fallbacks, but never let an unavailable beta
    // break the demo — retry once without it before giving up.
    var response = await send(true);
    if (response.status === 400) response = await send(false);
    if (!response.ok) throw new Error('Claude API returned ' + response.status);

    var data = await response.json();
    if (data.stop_reason === 'refusal') throw new Error('Request was declined by the model.');
    var textOut = (data.content || [])
      .filter(function (block) { return block.type === 'text'; })
      .map(function (block) { return block.text; })
      .join('');
    return extractJson(textOut);
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
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
      })
    });
    if (!response.ok) throw new Error('Gemini API returned ' + response.status);
    var data = await response.json();
    var parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
    return extractJson(parts.map(function (p) { return p.text || ''; }).join(''));
  }

  /* Always resolves. A failure downgrades to the local classifier and reports
   * which path produced the answer, so the UI can be honest about it. */
  async function interpret(text, seed) {
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
        var raw = await attempts[i].run();
        var clean = sanitise(raw, seed);
        if (clean.entries.length) {
          clean.source = attempts[i].source;
          return clean;
        }
      } catch (err) {
        // Deliberately swallowed: the next provider, then the local
        // classifier, will answer. A demo must never show a dead spinner.
        if (root.console && root.console.warn) {
          root.console.warn('[PAY ME] ' + attempts[i].source + ' interpretation failed:', err.message);
        }
      }
    }

    return localInterpret(text, seed);
  }

  root.PayMeAI = {
    interpret: interpret,
    localInterpret: localInterpret,
    loadCredentials: loadCredentials,
    saveCredentials: saveCredentials,
    sanitise: sanitise,
    extractJson: extractJson,
    SYSTEM_PROMPT: SYSTEM_PROMPT
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
