/* VILLAGE PEOPLE — interface wiring
 *
 * The page opens with a finished document already on screen. A joke generator
 * that greets you with an empty form has to be worked for before it is funny,
 * and most people will not do the work.
 */
(function () {
  'use strict';

  var Data = window.VPData;
  var Engine = window.VPEngine;
  var Minutes = window.VPMinutes;
  var AI = window.VPAI;

  var $ = function (sel) { return document.querySelector(sel); };

  /* Sandboxed hosts cannot start downloads or open a share sheet. */
  var EMBEDDED = !!(window.VP_CONFIG && window.VP_CONFIG.embedded);
  var hostDownloads = null;

  var state = { doc: null, source: 'local', isExample: true };

  function setStatus(el, message, tone) {
    el.textContent = message || '';
    if (tone) el.setAttribute('data-tone', tone);
    else el.removeAttribute('data-tone');
  }

  /* ------------------------------------------------------------- rendering */

  function renderQuickChips() {
    var host = $('#quick-chips');
    host.innerHTML = '';
    Data.QUICK_ADD.forEach(function (item) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = item.label;
      chip.addEventListener('click', function () {
        var field = $('#complaint');
        var current = field.value.trim();
        // Chips accumulate into one complaint rather than replacing it —
        // a bad week is usually several things at once.
        field.value = current ? current.replace(/[.\s]+$/, '') + ', ' + item.text : item.text;
        field.focus();
      });
      host.appendChild(chip);
    });
  }

  function transcribe(doc) {
    var lines = [];
    lines.push('THE VILLAGE COUNCIL — OFFICE OF THE COMMITTEE SECRETARIAT');
    lines.push('MINUTES OF THE EXTRAORDINARY MEETING');
    lines.push('COMMITTEE FOR THE DELAY OF ' + doc.subject.toUpperCase() + '’S PROGRESS');
    lines.push('');
    lines.push('REF: ' + doc.ref + '    DATE: ' + doc.date);
    lines.push('TIME: ' + doc.time + '    VENUE: ' + doc.venue);
    lines.push('');
    lines.push('1. ATTENDANCE');
    doc.present.forEach(function (role, i) {
      lines.push('   ' + (i + 1) + '. ' + role + (i === 0 ? ' (presiding)' : ''));
    });
    lines.push('');
    lines.push('   APOLOGIES FOR ABSENCE');
    doc.absent.forEach(function (entry) { lines.push('   ' + entry.role + ' — ' + entry.note); });
    lines.push('');
    lines.push('2. MATTERS ARISING');
    lines.push('   ' + doc.mattersArising);
    lines.push('');
    lines.push('3. RESOLUTIONS');
    doc.items.forEach(function (item) {
      lines.push('   3.' + item.number + ' ' + item.department.toUpperCase());
      lines.push('       Complaint on file: "' + item.complaint + '"');
      lines.push('       MOTION: ' + item.motion);
      lines.push('       Moved by ' + item.movedBy + '; seconded by ' + item.secondedBy + '.');
      lines.push('       RESOLUTION: ' + item.verdict);
      lines.push('');
    });
    lines.push('4. ANY OTHER BUSINESS');
    doc.aob.forEach(function (line, i) { lines.push('   4.' + (i + 1) + ' ' + line); });
    lines.push('');
    lines.push('5. ADJOURNMENT');
    lines.push('   ' + doc.adjournment);
    lines.push('');
    lines.push('SATIRE. These minutes are fictional. No real meeting took place.');
    return lines.join('\n');
  }

  function present(doc) {
    doc.siteLabel = location.host || '';
    state.doc = doc;

    var canvas = $('#minutes-canvas');
    Minutes.render(canvas, doc);

    if (EMBEDDED) {
      var img = $('#minutes-img');
      img.src = canvas.toDataURL('image/png');
      img.hidden = false;
      canvas.hidden = true;
    }

    $('#transcript').textContent = transcribe(doc);
    $('#output-badge').hidden = !state.isExample;

    var sourceLine = {
      local: 'Sorted by the built-in classifier, filed in your browser. Nothing left this device.',
      proxy: 'Sorted by AI through this site’s own server function, filed in your browser.',
      claude: 'Sorted by Claude, filed in your browser — the model never wrote the minutes.',
      gemini: 'Sorted by Gemini, filed in your browser — the model never wrote the minutes.'
    }[state.source] || '';
    $('#source-line').textContent = sourceLine;
  }

  /* ------------------------------------------------------------ generating */

  async function generate() {
    var text = $('#complaint').value.trim();
    var status = $('#status');

    if (text.length < 8) {
      setStatus(status, 'Tell the committee what happened first.', 'error');
      $('#complaint').focus();
      return;
    }

    var button = $('[data-action="generate"]');
    button.disabled = true;
    setStatus(status, 'Obtaining the minutes…');

    try {
      var reading = await AI.interpret(text);

      if (!reading.incidents.length) {
        setStatus(status, 'The committee could not make sense of that. Try describing it plainly.', 'error');
        return;
      }

      state.source = reading.source || 'local';
      state.isExample = false;

      var doc = Engine.generate({ name: $('#subject-name').value, incidents: reading.incidents });

      // A model-written committee note joins Any Other Business, where a stray
      // line reads as minute-taking rather than as the document's backbone.
      if (reading.note) doc.aob.push(reading.note);

      present(doc);
      setStatus(status, doc.items.length + ' resolution'
        + (doc.items.length === 1 ? '' : 's') + ' passed against you.');
      $('#output').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      setStatus(status, 'Something went wrong obtaining the minutes. Try again.', 'error');
    } finally {
      button.disabled = false;
    }
  }

  function again() {
    $('#complaint').value = '';
    $('#subject-name').focus();
    setStatus($('#status'), '');
    setStatus($('#share-status'), '');
    $('#compose').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ------------------------------------------------------ export & sharing */

  function exportFilename() {
    return 'village-people-minutes-' + (state.doc ? state.doc.ref.replace(/\//g, '-') : 'draft') + '.png';
  }

  async function connectHostDownloads() {
    if (!EMBEDDED || !window.claude || typeof window.claude.use !== 'function') return;
    try {
      hostDownloads = await window.claude.use('downloads');
    } catch (err) {
      hostDownloads = null;
    }
    if (!hostDownloads) return;

    var button = document.createElement('button');
    button.className = 'btn btn--primary';
    button.dataset.action = 'download';
    button.textContent = 'Download minutes';
    var actions = $('.output__actions');
    if (actions) actions.insertBefore(button, actions.firstChild);
    $('#save-hint').hidden = true;
  }

  async function download() {
    var status = $('#share-status');
    try {
      var blob = await Minutes.toBlob($('#minutes-canvas'));

      if (hostDownloads) {
        await hostDownloads.save({ filename: exportFilename(), data: blob });
        setStatus(status, 'Saved as ' + exportFilename());
        return;
      }

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
      if (err && err.code === 'declined') return setStatus(status, '');
      if (err && err.code === 'rate_limited') {
        return setStatus(status, 'One save at a time — try again in a moment.', 'error');
      }
      $('#save-hint').hidden = false;
      setStatus(status, 'Could not save. Tap and hold the document instead.', 'error');
    }
  }

  async function share() {
    var status = $('#share-status');
    try {
      var blob = await Minutes.toBlob($('#minutes-canvas'));
      var file = new File([blob], exportFilename(), { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Minutes of the meeting about me',
          text: 'So it was not my fault after all. There were minutes.'
        });
        return setStatus(status, '');
      }
      await download();
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      setStatus(status, 'Sharing is not available here — use Download instead.', 'error');
    }
  }

  function saveKey() {
    var provider = $('#ai-provider').value;
    var key = $('#ai-key').value.trim();
    var status = $('#key-status');

    if (!provider || !key) {
      AI.saveCredentials('', '');
      $('#ai-key').value = '';
      return setStatus(status, 'Cleared. Using the built-in classifier.');
    }
    var ok = AI.saveCredentials(provider, key);
    $('#ai-key').value = '';
    setStatus(status, ok
      ? 'Saved in this browser only.'
      : 'This browser blocked local storage, so the key was not saved.', ok ? null : 'error');
  }

  /* ----------------------------------------------------------------- init */

  function init() {
    renderQuickChips();

    var saved = AI.loadCredentials();
    if (saved.provider) $('#ai-provider').value = saved.provider;

    if (EMBEDDED) {
      $('[data-action="download"]').remove();
      $('[data-action="share"]').remove();
      $('#save-hint').hidden = false;
      connectHostDownloads();
    } else if (navigator.share) {
      $('[data-action="share"]').classList.remove('is-hidden');
    }

    var actions = {
      generate: generate,
      download: download,
      share: share,
      again: again,
      'save-key': saveKey
    };

    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-action]');
      if (!trigger) return;
      var handler = actions[trigger.dataset.action];
      if (handler) handler();
    });

    // Ctrl/Cmd+Enter submits from the textarea.
    $('#complaint').addEventListener('keydown', function (event) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') generate();
    });

    // Open on a finished document so the joke lands before any typing.
    $('#complaint').value = Data.SAMPLE;
    present(Engine.generate({ name: 'Chiamaka', incidents: Engine.classify(Data.SAMPLE) }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
