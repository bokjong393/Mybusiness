/* =========================================================================
   Ayoka Studio — the app.
   No framework, no build step. Fetches the generator catalogue from the API
   so the form definitions live in exactly one place (lib/packs.js).
   ========================================================================= */

const $ = (id) => document.getElementById(id);
const root = document.documentElement;

/* ---------------------------------------------------------------- state */
const state = {
  packs: [],
  currencies: [],
  languages: [],
  tones: [],
  active: null,
  license: '',
  tier: 'free',
  ui: 'en',
  busy: false,
  markdown: '',
};

const store = {
  get(k, fallback = null) { try { const v = localStorage.getItem('ayoka-' + k); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem('ayoka-' + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem('ayoka-' + k); } catch {} },
};

/* ------------------------------------------------------------------ i18n */
const T = {
  en: {
    licence: 'Licence', choose: 'What do you need to write?', generate: 'Generate',
    generating: 'Writing...', draft: 'Your draft', copy: 'Copy', copied: 'Copied',
    download: 'Download', recent: 'Recent drafts',
    emptyMsg: 'Pick a generator, paste what the client actually sent you, and press Generate.',
    disclaimer: 'Always read the "Before you send this" section at the bottom of every draft.',
    licTitle: 'Your licence key', licBody: 'Paste the key from your receipt email. It is stored on this device only.',
    save: 'Save', remove: 'Remove', buy: 'Buy a licence',
    locked: 'is part of the {tier} plan.', unlock: 'Unlock it',
    free: 'Free plan', runsLeft: '{n} runs left today', noRuns: 'No runs left today',
    licOk: 'Active: {tier} plan.', licNone: 'No licence saved - you are on the free plan.',
    required: 'Please fill in the fields marked with *.',
    netErr: 'Could not reach the server. Check your connection and try again.',
    copyFail: 'Copy failed - select the text and copy it manually.',
    truncated: '*(cut off at the length limit - shorten your input and run it again for the ending)*',
  },
  fr: {
    licence: 'Licence', choose: 'Que devez-vous ecrire ?', generate: 'Generer',
    generating: 'Redaction...', draft: 'Votre brouillon', copy: 'Copier', copied: 'Copie',
    download: 'Telecharger', recent: 'Brouillons recents',
    emptyMsg: 'Choisissez un generateur, collez ce que le client vous a reellement envoye, puis cliquez sur Generer.',
    disclaimer: 'Lisez toujours la section "Avant d\'envoyer" a la fin de chaque brouillon.',
    licTitle: 'Votre cle de licence', licBody: 'Collez la cle recue par e-mail. Elle est stockee uniquement sur cet appareil.',
    save: 'Enregistrer', remove: 'Retirer', buy: 'Acheter une licence',
    locked: 'fait partie de la formule {tier}.', unlock: 'Debloquer',
    free: 'Formule gratuite', runsLeft: '{n} generations restantes aujourd\'hui', noRuns: 'Plus de generations aujourd\'hui',
    licOk: 'Active : formule {tier}.', licNone: 'Aucune licence - vous etes sur la formule gratuite.',
    required: 'Merci de remplir les champs marques d\'un *.',
    netErr: 'Serveur injoignable. Verifiez votre connexion et reessayez.',
    copyFail: 'Copie impossible - selectionnez le texte et copiez-le manuellement.',
    truncated: '*(coupe a la limite de longueur - raccourcissez votre saisie et relancez pour obtenir la fin)*',
  },
};
const t = (key, vars = {}) =>
  (T[state.ui][key] || T.en[key] || key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

function applyUiLanguage() {
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  document.documentElement.lang = state.ui;
}

/* ------------------------------------------------------- safe markdown */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Minimal Markdown -> HTML. Everything is HTML-escaped first, so model output
 * can never inject markup. Supports what the prompts actually produce:
 * headings, bold, italic, inline code, fenced blocks, lists, tables, rules.
 */
function md(src) {
  const blocks = [];
  // Pull fenced code out first so its contents are never processed as Markdown.
  const text = esc(src).replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => {
    blocks.push(code.replace(/\n$/, ''));
    return `\nBLOCKPLACEHOLDER${blocks.length - 1}\n`;
  });

  const inline = (s) => s
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  let html = '';
  let list = null;   // 'ul' | 'ol' | null
  let table = null;  // array of rows

  const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
  const closeTable = () => {
    if (!table) return;
    const [head, ...body] = table;
    html += '<table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
      body.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
    table = null;
  };

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    const placeholder = /^BLOCKPLACEHOLDER(\d+)$/.exec(line.trim());

    if (placeholder) {
      closeList(); closeTable();
      html += `<pre><code>${blocks[Number(placeholder[1])]}</code></pre>`;
      continue;
    }
    // Table rows: | a | b |   (the |---|---| separator is skipped)
    if (/^\|.*\|$/.test(line.trim())) {
      closeList();
      const cells = line.trim().slice(1, -1).split('|').map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      (table ||= []).push(cells);
      continue;
    }
    closeTable();

    if (!line.trim()) { closeList(); continue; }
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) { closeList(); html += '<hr>'; continue; }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { closeList(); const lvl = Math.min(h[1].length + 1, 4); html += `<h${lvl}>${inline(h[2])}</h${lvl}>`; continue; }

    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      const want = ul ? 'ul' : 'ol';
      if (list !== want) { closeList(); html += `<${want}>`; list = want; }
      html += `<li>${inline((ul || ol)[1])}</li>`;
      continue;
    }
    closeList();
    html += `<p>${inline(line)}</p>`;
  }
  closeList(); closeTable();
  return html;
}

/* ---------------------------------------------------------------- banner */
function banner(html, kind = 'err') {
  $('banner').innerHTML = html ? `<div class="banner banner-${kind}">${html}</div>` : '';
}

/* ------------------------------------------------------------- rendering */
const TIER_RANK = { free: 0, starter: 1, pro: 2 };
const allowed = (pack) => TIER_RANK[state.tier] >= TIER_RANK[pack.tier];

function renderPicker() {
  $('picker').innerHTML = state.packs.map((p) => `
    <button type="button" class="pick${allowed(p) ? '' : ' locked'}" data-pack="${p.id}"
            aria-pressed="${state.active?.id === p.id}" title="${esc(p[state.ui].blurb)}">
      ${allowed(p) ? '' : '<span class="lk">&#128274;</span>'}
      <span class="ico">${p.icon}</span>
      <span class="nm">${esc(p[state.ui].name)}</span>
    </button>`).join('');
}

function renderForm() {
  const p = state.active;
  if (!p) return;
  $('pack-title').textContent = `${p.icon} ${p[state.ui].name}`;
  $('pack-blurb').textContent = p[state.ui].blurb;

  const saved = store.get('draft-' + p.id, {}) || {};
  $('form').innerHTML = p.fields.map((f) => {
    const v = saved[f.name] ?? '';
    const label = `<label for="f-${f.name}">${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ''}</label>`;
    const attrs = `id="f-${f.name}" name="${f.name}" ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''}`;
    let control;
    if (f.type === 'textarea') control = `<textarea ${attrs} rows="${f.rows || 5}">${esc(v)}</textarea>`;
    else if (f.type === 'select') control = `<select ${attrs}>${f.options.map((o) => `<option value="${esc(o.value)}"${o.value === v ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
    else if (f.type === 'number') control = `<input type="number" ${attrs} value="${esc(v)}" ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''}>`;
    else control = `<input type="text" ${attrs} value="${esc(v)}" ${f.maxLength ? `maxlength="${f.maxLength}"` : ''}>`;
    return `<div class="field">${label}${control}</div>`;
  }).join('');

  if (!allowed(p)) {
    const tierName = p.tier === 'pro' ? 'Pro' : 'Starter';
    banner(`&#128274; <strong>${esc(p[state.ui].name)}</strong> ${t('locked', { tier: tierName })} <a href="/#pricing">${t('unlock')}</a>`, 'lock');
  } else {
    banner('');
  }
  $('go').disabled = !allowed(p);
}

function renderMeter() {
  $('meter').textContent = state.tier === 'free' ? t('free') : t('licOk', { tier: state.tier });
}

function renderHistory() {
  const items = store.get('history', []) || [];
  $('hist-panel').style.display = items.length ? '' : 'none';
  $('hist').innerHTML = items.map((h, i) => `
    <button type="button" data-hist="${i}">
      ${h.icon} ${esc(h.name)}<br><span class="when">${new Date(h.at).toLocaleString()}</span>
    </button>`).join('');
}

/* ------------------------------------------------------------ generation */
async function run() {
  if (state.busy || !state.active) return;
  const p = state.active;

  const input = {};
  for (const f of p.fields) {
    const el = $('f-' + f.name);
    input[f.name] = el ? el.value.trim() : '';
  }
  const missing = p.fields.filter((f) => f.required && !input[f.name]);
  if (missing.length) {
    banner(t('required'));
    $('f-' + missing[0].name)?.focus();
    return;
  }
  store.set('draft-' + p.id, input);

  state.busy = true;
  state.markdown = '';
  banner('');
  $('go').disabled = true;
  $('go').querySelector('span').textContent = t('generating');
  $('empty').hidden = true;
  $('out').hidden = false;
  $('out').innerHTML = '<span class="cursor"></span>';
  $('copy').disabled = true;
  $('download').disabled = true;

  let painting = false;
  const paint = () => {
    if (painting) return;
    painting = true;
    requestAnimationFrame(() => {
      $('out').innerHTML = md(state.markdown) + '<span class="cursor"></span>';
      painting = false;
    });
  };

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pack: p.id,
        input,
        language: $('language').value,
        currency: $('currency').value,
        tone: $('tone').value,
        license: state.license || undefined,
      }),
    });

    if (!res.body) throw new Error('no stream');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let failed = null;

    const consume = (line) => {
      if (!line.trim()) return;
      let msg;
      try { msg = JSON.parse(line); } catch { return; }
      if (msg.type === 'delta') { state.markdown += msg.text; paint(); }
      else if (msg.type === 'meta' && typeof msg.runsLeft === 'number') {
        $('meter').textContent = msg.runsLeft > 0 ? t('runsLeft', { n: msg.runsLeft }) : t('noRuns');
      }
      else if (msg.type === 'error') failed = msg;
      else if (msg.type === 'done' && msg.truncated) state.markdown += '\n\n---\n' + t('truncated');
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      lines.forEach(consume);
    }
    consume(buffer);

    if (failed) {
      const extra = ['locked', 'rate_limited'].includes(failed.code) ? ` <a href="/#pricing">${t('unlock')}</a>` : '';
      banner(esc(failed.message) + extra, failed.code === 'locked' ? 'lock' : 'err');
      if (!state.markdown) { $('out').hidden = true; $('empty').hidden = false; }
    }

    if (state.markdown) {
      $('out').innerHTML = md(state.markdown);
      $('copy').disabled = false;
      $('download').disabled = false;
      const history = store.get('history', []) || [];
      history.unshift({ id: p.id, name: p[state.ui].name, icon: p.icon, at: Date.now(), markdown: state.markdown });
      store.set('history', history.slice(0, 8));
      renderHistory();
    }
  } catch (err) {
    console.error(err);
    banner(t('netErr'));
    if (!state.markdown) { $('out').hidden = true; $('empty').hidden = false; }
  } finally {
    state.busy = false;
    $('go').disabled = !allowed(p);
    $('go').querySelector('span').textContent = t('generate');
  }
}

/* ------------------------------------------------------------------ boot */
async function boot() {
  const savedTheme = store.get('theme');
  if (savedTheme) root.dataset.theme = savedTheme;
  $('theme').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    store.set('theme', root.dataset.theme);
  });

  let data;
  try {
    const res = await fetch('/api/catalogue');
    data = await res.json();
  } catch {
    banner(t('netErr'));
    return;
  }
  Object.assign(state, data);

  state.license = store.get('license', '') || '';
  state.tier = store.get('tier', 'free') || 'free';
  state.ui = store.get('ui', null) || ((navigator.language || 'en').startsWith('fr') ? 'fr' : 'en');

  $('language').innerHTML = state.languages.map((l) => `<option value="${l.code}">${esc(l.label)}</option>`).join('');
  $('currency').innerHTML = state.currencies.map((c) => `<option value="${c.code}">${esc(c.symbol)} ${c.code}</option>`).join('');
  const renderTones = () => {
    $('tone').innerHTML = state.tones.map((x) => `<option value="${x.code}">${esc(x[state.ui] || x.en)}</option>`).join('');
    $('tone').value = store.get('tone', 'warm') || 'warm';
  };
  $('language').value = state.ui;
  $('currency').value = store.get('currency', 'NGN') || 'NGN';
  renderTones();

  state.active = state.packs.find((p) => p.id === store.get('pack')) || state.packs[0];

  applyUiLanguage();
  renderPicker();
  renderForm();
  renderMeter();
  renderHistory();

  /* ---- events ---- */
  $('picker').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pack]');
    if (!b) return;
    state.active = state.packs.find((p) => p.id === b.dataset.pack);
    store.set('pack', state.active.id);
    renderPicker();
    renderForm();
  });

  $('go').addEventListener('click', run);

  $('language').addEventListener('change', (e) => {
    state.ui = e.target.value;
    store.set('ui', state.ui);
    renderTones();
    applyUiLanguage();
    renderPicker(); renderForm(); renderMeter(); renderHistory();
  });
  $('currency').addEventListener('change', (e) => store.set('currency', e.target.value));
  $('tone').addEventListener('change', (e) => store.set('tone', e.target.value));

  $('copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(state.markdown);
      const span = $('copy').querySelector('span');
      span.textContent = t('copied');
      setTimeout(() => { span.textContent = t('copy'); }, 1600);
    } catch { banner(t('copyFail')); }
  });

  $('download').addEventListener('click', () => {
    const blob = new Blob([state.markdown], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ayoka-${state.active.id}-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  $('hist').addEventListener('click', (e) => {
    const b = e.target.closest('[data-hist]');
    if (!b) return;
    const item = (store.get('history', []) || [])[Number(b.dataset.hist)];
    if (!item) return;
    state.markdown = item.markdown;
    $('empty').hidden = true;
    $('out').hidden = false;
    $('out').innerHTML = md(item.markdown);
    $('copy').disabled = false;
    $('download').disabled = false;
    $('out-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---- licence modal ---- */
  const modal = $('lic-modal');
  $('lic-btn').addEventListener('click', () => {
    $('lic-input').value = state.license;
    $('lic-status').textContent = state.license ? t('licOk', { tier: state.tier }) : t('licNone');
    modal.showModal();
  });
  modal.addEventListener('close', () => {
    if (modal.returnValue === 'clear') {
      state.license = '';
      state.tier = 'free';
      store.del('license'); store.del('tier');
      renderPicker(); renderForm(); renderMeter();
      return;
    }
    if (modal.returnValue !== 'save') return;
    const key = $('lic-input').value.trim().toUpperCase();
    if (!key) return;
    // The server is the authority on tier; this local read only decides which
    // buttons look unlocked. A forged key fails at the first generation.
    const tier = /^AYK-P/.test(key) ? 'pro' : /^AYK-S/.test(key) ? 'starter' : 'free';
    state.license = key;
    state.tier = tier;
    store.set('license', key); store.set('tier', tier);
    renderPicker(); renderForm(); renderMeter();
    banner(t('licOk', { tier }), 'ok');
  });
}

boot();
