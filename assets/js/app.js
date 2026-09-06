/* PAY ME — interface wiring
 *
 * Holds UI state, talks to the engine for every number, and to the payslip
 * renderer for the artifact. Deliberately dependency-free and framework-free:
 * a one-page static build has nothing to install, nothing to bundle, and
 * nothing that can fail to load during a live demo.
 */
(function () {
  'use strict';

  var Data = window.PayMeData;
  var Engine = window.PayMeEngine;
  var Payslip = window.PayMePayslip;
  var AI = window.PayMeAI;

  var state = {
    name: '',
    hours: {},          // taskKey -> hours per week
    tier: 'typical',
    rateOverrides: {},
    jobTitle: null,
    review: null,
    source: 'chips',
    ref: null,
    lastResult: null
  };

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  var DEFAULT_HOURS = 3;

  /* Embedded builds (a sandboxed artifact frame) cannot start a download and
   * cannot open a share sheet. There, the payslip is presented as an ordinary
   * <img> so long-press "save image" still works, and the buttons that would
   * silently do nothing are removed rather than left to disappoint. */
  var EMBEDDED = !!(window.PAY_ME_CONFIG && window.PAY_ME_CONFIG.embedded);

  /* ------------------------------------------------------------- helpers */

  function show(el) { el.classList.remove('is-hidden'); }
  function hide(el) { el.classList.add('is-hidden'); }

  function makeRef() {
    var seed = (state.name || 'anon') + Object.keys(state.hours).join('') + Date.now();
    var hash = 0;
    for (var i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    return 'PM-' + Math.abs(hash).toString(36).toUpperCase().slice(0, 6).padEnd(6, '0');
  }

  function periodLabel() {
    var now = new Date();
    return 'w/e ' + now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /* Seed derived from the answers, so a given payslip keeps one identity
   * across re-renders instead of reshuffling its title on every repaint. */
  function seed() {
    return (state.name || 'anon') + '|' + Object.keys(state.hours).sort().map(function (k) {
      return k + ':' + state.hours[k];
    }).join(',');
  }

  function setStatus(el, message, tone) {
    el.textContent = message || '';
    if (tone) el.setAttribute('data-tone', tone);
    else el.removeAttribute('data-tone');
  }

  /* --------------------------------------------------------------- chips */

  function renderChips() {
    var host = $('#task-chips');
    host.innerHTML = '';
    Data.TASKS.forEach(function (task) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.setAttribute('aria-pressed', state.hours[task.key] != null ? 'true' : 'false');
      chip.dataset.task = task.key;
      chip.innerHTML = '<span class="chip__emoji" aria-hidden="true"></span><span></span>';
      chip.firstChild.textContent = task.emoji;
      chip.lastChild.textContent = task.label;
      chip.addEventListener('click', function () { toggleTask(task.key); });
      host.appendChild(chip);
    });
  }

  function toggleTask(key) {
    if (state.hours[key] != null) delete state.hours[key];
    else state.hours[key] = DEFAULT_HOURS;
    syncTaskViews();
  }

  function syncTaskViews() {
    $$('.chip').forEach(function (chip) {
      chip.setAttribute('aria-pressed', state.hours[chip.dataset.task] != null ? 'true' : 'false');
    });
    renderHours();

    var stepHours = $('#step-hours');
    if (Object.keys(state.hours).length) show(stepHours);
    else hide(stepHours);

    // Keep a visible payslip in sync with edits instead of going stale.
    if (state.lastResult && !$('#step-result').classList.contains('is-hidden')) runPayroll({ quiet: true });
  }

  /* --------------------------------------------------------------- hours */

  function renderHours() {
    var host = $('#hours-list');
    host.innerHTML = '';

    Data.TASKS.forEach(function (task) {
      if (state.hours[task.key] == null) return;

      var row = document.createElement('div');
      row.className = 'hours__row';

      var label = document.createElement('div');
      label.className = 'hours__label';
      var name = document.createElement('span');
      name.className = 'hours__name';
      name.textContent = task.emoji + '  ' + task.label;
      label.appendChild(name);
      if (task.rate === null) {
        var badge = document.createElement('span');
        badge.className = 'hours__unpriced';
        badge.textContent = 'hours only';
        label.appendChild(badge);
      }
      row.appendChild(label);

      var stepper = document.createElement('div');
      stepper.className = 'stepper';

      var minus = document.createElement('button');
      minus.type = 'button';
      minus.textContent = '−';
      minus.setAttribute('aria-label', 'Decrease hours for ' + task.label);

      var input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = '168';
      input.step = '0.5';
      input.value = state.hours[task.key];
      input.setAttribute('aria-label', 'Hours per week for ' + task.label);

      var plus = document.createElement('button');
      plus.type = 'button';
      plus.textContent = '+';
      plus.setAttribute('aria-label', 'Increase hours for ' + task.label);

      function commit(value) {
        state.hours[task.key] = Engine.clampHours(value);
        input.value = state.hours[task.key];
        updateTotal();
        if (state.lastResult && !$('#step-result').classList.contains('is-hidden')) runPayroll({ quiet: true });
      }

      minus.addEventListener('click', function () { commit(Math.max(0, state.hours[task.key] - 0.5)); });
      plus.addEventListener('click', function () { commit(state.hours[task.key] + 0.5); });
      input.addEventListener('change', function () { commit(input.value); });

      stepper.appendChild(minus);
      stepper.appendChild(input);
      stepper.appendChild(plus);

      var unit = document.createElement('span');
      unit.className = 'stepper__unit';
      unit.textContent = 'hrs';
      stepper.appendChild(unit);
      row.appendChild(stepper);

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'hours__remove';
      remove.innerHTML = '&times;';
      remove.setAttribute('aria-label', 'Remove ' + task.label);
      remove.addEventListener('click', function () { toggleTask(task.key); });
      row.appendChild(remove);

      host.appendChild(row);
    });

    updateTotal();
  }

  function updateTotal() {
    var total = Object.keys(state.hours).reduce(function (sum, key) {
      return sum + Engine.clampHours(state.hours[key]);
    }, 0);
    $('#hours-total').textContent = total > 0
      ? 'Total unpaid hours this week: ' + Engine.formatHours(total)
      : '';
  }

  /* ------------------------------------------------------- rates & tiers */

  function renderTiers() {
    var host = $('#tier-picker');
    host.innerHTML = '';
    Data.TIERS.forEach(function (tier) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'tier';
      button.setAttribute('aria-pressed', state.tier === tier.id ? 'true' : 'false');
      button.textContent = tier.label;
      button.title = tier.note;
      button.addEventListener('click', function () {
        state.tier = tier.id;
        state.rateOverrides = {}; // a tier change resets manual edits, or the two fight
        renderTiers();
        renderRates();
        if (state.lastResult) runPayroll({ quiet: true });
      });
      host.appendChild(button);
    });
  }

  function renderRates() {
    var body = $('#rates-body');
    body.innerHTML = '';
    Data.TASKS.forEach(function (task) {
      var row = document.createElement('tr');

      var name = document.createElement('th');
      name.scope = 'row';
      name.textContent = task.label;
      row.appendChild(name);

      var comparator = document.createElement('td');
      comparator.textContent = task.blurb;
      row.appendChild(comparator);

      var rateCell = document.createElement('td');
      if (task.rate === null) {
        rateCell.className = 'unpriced';
        rateCell.textContent = 'not priced';
      } else {
        var input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = '50';
        input.value = Engine.resolveRate(task.key, state.tier, state.rateOverrides);
        input.setAttribute('aria-label', 'Hourly rate for ' + task.label);
        input.addEventListener('change', function () {
          var value = Number(input.value);
          if (isFinite(value) && value >= 0) state.rateOverrides[task.key] = value;
          if (state.lastResult) runPayroll({ quiet: true });
        });
        rateCell.appendChild(input);
      }
      row.appendChild(rateCell);
      body.appendChild(row);
    });
  }

  /* --------------------------------------------------------------- facts */

  function renderFacts() {
    var host = $('#facts-grid');
    host.innerHTML = '';
    Data.FACTS.forEach(function (fact) {
      var block = document.createElement('div');
      block.className = 'fact';
      var stat = document.createElement('p');
      stat.className = 'fact__stat';
      stat.textContent = fact.stat;
      var body = document.createElement('p');
      body.className = 'fact__body';
      body.textContent = fact.body;
      var source = document.createElement('p');
      source.className = 'fact__source';
      source.textContent = 'Source: ' + fact.source;
      block.appendChild(stat);
      block.appendChild(body);
      block.appendChild(source);
      host.appendChild(block);
    });
  }

  /* ------------------------------------------------------------- payroll */

  function runPayroll(options) {
    options = options || {};
    var entries = Object.keys(state.hours).map(function (key) {
      return { key: key, hours: state.hours[key] };
    });

    var result = Engine.compute({
      entries: entries,
      tier: state.tier,
      rateOverrides: state.rateOverrides
    });

    if (result.isEmpty) {
      setStatus($('#interpret-status'), 'Pick at least one task first.', 'error');
      return;
    }

    state.lastResult = result;
    if (!state.ref) state.ref = makeRef();

    var key = seed();
    var model = {
      name: (state.name || 'You').slice(0, 24),
      period: periodLabel(),
      jobTitle: state.jobTitle || Engine.pickDeterministic(Data.JOB_TITLES, key),
      review: state.review || Engine.pickDeterministic(Data.REVIEWS, key),
      status: result.band.en,
      ref: state.ref,
      siteLabel: location.host || 'pay-me',
      result: result
    };

    var canvas = $('#payslip-canvas');
    Payslip.render(canvas, model);

    if (EMBEDDED) {
      var img = $('#payslip-img');
      img.src = canvas.toDataURL('image/png');
      img.hidden = false;
      canvas.hidden = true;
    }

    renderSummary(result, model);

    var sourceLabel = {
      chips: 'Calculated in your browser. No data left this device.',
      local: 'Read by the built-in classifier, priced in your browser. No data left this device.',
      proxy: 'Read by AI through this site’s own server function, priced in your browser.',
      claude: 'Read by Claude, priced in your browser — the model never touched the arithmetic.',
      gemini: 'Read by Gemini, priced in your browser — the model never touched the arithmetic.'
    }[state.source] || '';
    $('#result-source').textContent = sourceLabel;

    show($('#step-result'));
    if (!options.quiet) {
      $('#step-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderSummary(result, model) {
    var host = $('#summary');
    host.innerHTML = '';

    var table = document.createElement('table');
    table.innerHTML =
      '<thead><tr><th scope="col">Task</th><th scope="col" class="num">Hours</th>' +
      '<th scope="col" class="num">₦/hr</th><th scope="col" class="num">Value</th></tr></thead>';

    var tbody = document.createElement('tbody');
    result.lines.forEach(function (line) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<th scope="row"></th><td class="num"></td><td class="num"></td><td class="num"></td>';
      tr.children[0].textContent = line.label;
      tr.children[1].textContent = Engine.formatHours(line.hours);
      tr.children[2].textContent = line.priced ? Engine.formatNaira(line.rate) : '—';
      tr.children[3].textContent = line.priced ? Engine.formatNaira(line.amount) : 'not priced';
      tbody.appendChild(tr);
    });

    var totalRow = document.createElement('tr');
    totalRow.className = 'is-total';
    totalRow.innerHTML = '<th scope="row">This week</th><td class="num"></td><td class="num"></td><td class="num"></td>';
    totalRow.children[1].textContent = Engine.formatHours(result.totalHours);
    totalRow.children[3].textContent = Engine.formatNaira(result.weeklyValue);
    tbody.appendChild(totalRow);

    table.appendChild(tbody);
    host.appendChild(table);

    var headline = document.createElement('p');
    headline.className = 'summary__headline';
    headline.textContent = 'That is ' + Engine.formatNaira(result.monthlyValue) + ' a month, or '
      + Engine.formatNaira(result.annualValue) + ' a year, of work nobody invoiced for.';
    host.appendChild(headline);

    void model;
  }

  /* ---------------------------------------------------------- AI reading */

  async function interpretFreeform() {
    var text = $('#freeform').value.trim();
    var status = $('#interpret-status');

    if (text.length < 8) {
      setStatus(status, 'Write a sentence or two first.', 'error');
      return;
    }

    var button = $('[data-action="interpret"]');
    button.disabled = true;
    setStatus(status, 'Turning invisible work into a timesheet…');

    try {
      var reading = await AI.interpret(text, text);

      if (!reading.entries.length) {
        setStatus(status, 'Could not pick out any tasks — try the chips above instead.', 'error');
        return;
      }

      reading.entries.forEach(function (entry) {
        state.hours[entry.key] = entry.hours;
      });
      state.jobTitle = reading.jobTitle;
      state.review = reading.review;
      state.source = reading.source || 'local';

      syncTaskViews();
      show($('#step-hours'));
      setStatus(status, 'Found ' + reading.entries.length + ' task'
        + (reading.entries.length === 1 ? '' : 's') + '. Check the hours below before we run payroll.');
      $('#step-hours').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      setStatus(status, 'That did not work — use the chips above instead.', 'error');
    } finally {
      button.disabled = false;
    }
  }

  /* ------------------------------------------------------ export & share */

  function exportFilename() {
    return 'pay-me-payslip-' + (state.ref || 'draft') + '.png';
  }

  /* Hosted in a sandboxed frame, the page cannot start a download itself;
   * the host mediates it. Ask for that ability at runtime and only then offer
   * the button — otherwise the long-press hint stands. */
  var hostDownloads = null;

  async function connectHostDownloads() {
    if (!EMBEDDED || !window.claude || typeof window.claude.use !== 'function') return;
    try {
      hostDownloads = await window.claude.use('downloads');
    } catch (err) {
      hostDownloads = null;
    }
    if (!hostDownloads) return;

    // Capability confirmed — restore the real affordance.
    var button = document.createElement('button');
    button.className = 'btn btn--primary';
    button.dataset.action = 'download';
    button.textContent = 'Download payslip';
    var actions = $('.result__actions');
    if (actions) actions.insertBefore(button, actions.firstChild);
    $('#save-hint').hidden = true;
  }

  async function saveViaHost() {
    var status = $('#share-status');
    try {
      var blob = await Payslip.toBlob($('#payslip-canvas'));
      await hostDownloads.save({ filename: exportFilename(), data: blob });
      setStatus(status, 'Saved as ' + exportFilename());
    } catch (err) {
      var code = err && err.code;
      if (code === 'declined') {
        setStatus(status, '');
      } else if (code === 'rate_limited') {
        setStatus(status, 'One save at a time — try again in a moment.', 'error');
      } else {
        $('#save-hint').hidden = false;
        setStatus(status, 'Could not save automatically. Tap and hold the payslip instead.', 'error');
      }
    }
  }

  async function downloadPayslip() {
    if (hostDownloads) return saveViaHost();

    var status = $('#share-status');
    try {
      var blob = await Payslip.toBlob($('#payslip-canvas'));
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = exportFilename();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Revoke late: some browsers abort the download if the URL dies too soon.
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      setStatus(status, 'Saved as ' + exportFilename());
    } catch (err) {
      setStatus(status, 'Could not save the image. Long-press the payslip to save it instead.', 'error');
    }
  }

  async function sharePayslip() {
    var status = $('#share-status');
    try {
      var blob = await Payslip.toBlob($('#payslip-canvas'));
      var file = new File([blob], exportFilename(), { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My household payslip',
          text: 'Apparently my household owes me ' + Engine.formatNaira(state.lastResult.outstanding) + ' this week.'
        });
        setStatus(status, '');
        return;
      }
      // No file sharing on this browser — downloading is the universal fallback.
      await downloadPayslip();
    } catch (err) {
      if (err && err.name === 'AbortError') return; // user dismissed the sheet
      setStatus(status, 'Sharing is not available here — use Download instead.', 'error');
    }
  }

  /* ------------------------------------------------------------- actions */

  function loadSample() {
    state.name = $('#employee-name').value.trim() || 'Amaka';
    $('#employee-name').value = state.name;
    state.hours = { cooking: 6, cleaning: 4, tutoring: 3, errands: 2, laundry: 2.5, emotional: 5 };
    state.jobTitle = null;
    state.review = null;
    state.source = 'chips';
    state.ref = null;
    syncTaskViews();
    runPayroll();
  }

  function resetAll() {
    state.name = '';
    state.hours = {};
    state.jobTitle = null;
    state.review = null;
    state.source = 'chips';
    state.ref = null;
    state.lastResult = null;
    state.rateOverrides = {};
    $('#employee-name').value = '';
    $('#freeform').value = '';
    setStatus($('#interpret-status'), '');
    setStatus($('#share-status'), '');
    hide($('#step-result'));
    syncTaskViews();
    $('#builder').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function saveKey() {
    var provider = $('#ai-provider').value;
    var key = $('#ai-key').value.trim();
    var status = $('#key-status');

    if (!provider || !key) {
      AI.saveCredentials('', '');
      $('#ai-key').value = '';
      setStatus(status, 'Cleared. Using the built-in classifier.');
      return;
    }
    var ok = AI.saveCredentials(provider, key);
    $('#ai-key').value = '';
    setStatus(status, ok
      ? 'Saved in this browser only. Free-text reading will now use ' + (provider === 'anthropic' ? 'Claude' : 'Gemini') + '.'
      : 'This browser blocked local storage, so the key was not saved.', ok ? null : 'error');
  }

  /* ----------------------------------------------------------------- init */

  function init() {
    renderChips();
    renderTiers();
    renderRates();
    renderFacts();
    renderHours();

    $('#employee-name').addEventListener('input', function (event) {
      state.name = event.target.value;
      if (state.lastResult && !$('#step-result').classList.contains('is-hidden')) runPayroll({ quiet: true });
    });

    var saved = AI.loadCredentials();
    if (saved.provider) $('#ai-provider').value = saved.provider;

    if (EMBEDDED) {
      // Start in the state that always works, then upgrade if the host allows.
      $('[data-action="download"]').remove();
      $('[data-action="share"]').remove();
      $('#save-hint').hidden = false;
      connectHostDownloads();
    } else if (navigator.share) {
      show($('[data-action="share"]'));
    }

    var actions = {
      start: function () { $('#builder').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#employee-name').focus(); },
      sample: loadSample,
      interpret: interpretFreeform,
      run: runPayroll,
      download: downloadPayslip,
      share: sharePayslip,
      edit: function () { $('#step-hours').scrollIntoView({ behavior: 'smooth', block: 'start' }); },
      reset: resetAll,
      'save-key': saveKey
    };

    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-action]');
      if (!trigger) return;
      var handler = actions[trigger.dataset.action];
      if (handler) handler();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
