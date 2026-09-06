/* VILLAGE PEOPLE — minutes engine
 *
 * Builds the entire committee document deterministically. A language model is
 * only ever asked to read a messy sentence into incidents; it never writes the
 * minutes, because the comedy lives in the bureaucratic FORM — numbered items,
 * movers and seconders, resolutions carried — and a model left to freestyle
 * loses that form by the second paragraph.
 *
 * Seeded from the input, so the same bad week always yields the same minutes:
 * a document that reshuffled its attendees on every re-render would not feel
 * like a record of anything.
 */
(function (root) {
  'use strict';

  var Data = root.VPData;

  function hashString(text) {
    var hash = 2166136261;
    var str = String(text || '');
    for (var i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  /* mulberry32 — small, fast, and good enough that picks don't visibly cycle. */
  function makeRandom(seed) {
    var state = hashString(seed) || 1;
    return function () {
      state |= 0;
      state = (state + 0x6D2B79F5) | 0;
      var t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(random, list) {
    return list[Math.floor(random() * list.length) % list.length];
  }

  /* Draw without replacement, so one meeting cannot list the same elder twice. */
  function pickMany(random, list, count) {
    var pool = list.slice();
    var out = [];
    var wanted = Math.min(count, pool.length);
    for (var i = 0; i < wanted; i++) {
      out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
    }
    return out;
  }

  function titleCase(text) {
    var trimmed = String(text || '').trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : trimmed;
  }

  /* ------------------------------------------------------- classification */

  function departmentFor(text) {
    var lower = String(text || '').toLowerCase();
    var best = null;
    var bestScore = 0;

    Data.DEPARTMENTS.forEach(function (dept) {
      var score = 0;
      dept.keywords.forEach(function (word) {
        if (lower.indexOf(word) !== -1) score += word.length; // longer match = stronger signal
      });
      if (score > bestScore) {
        bestScore = score;
        best = dept;
      }
    });

    return best || Data.DEPARTMENT_BY_KEY.general;
  }

  /* Split a free-text complaint into separate agenda items. Splitting on
   * clause boundaries keeps "my data finished AND the bus broke down" as two
   * grievances for two different departments, which is the joke. */
  function classify(text) {
    var raw = String(text || '');
    var clauses = raw
      .split(/[,.;\n]|\band\b|\balso\b|\bthen\b|\bplus\b/i)
      .map(function (clause) { return clause.trim(); })
      .filter(function (clause) { return clause.length > 6; });

    if (!clauses.length && raw.trim().length > 3) clauses = [raw.trim()];

    var incidents = [];
    var seen = {};
    clauses.slice(0, 8).forEach(function (clause) {
      var dept = departmentFor(clause);
      var key = dept.key + '|' + clause.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      incidents.push({ category: dept.key, summary: clause.slice(0, 160) });
    });

    return incidents;
  }

  /* ------------------------------------------------------------ generation */

  function referenceNumber(random) {
    var year = new Date().getFullYear();
    var serial = String(Math.floor(random() * 9000) + 1000);
    return 'VC/CDP/' + year + '/' + serial;
  }

  function formatDate() {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  /* input: { name, incidents: [{category, summary}] } */
  function generate(input) {
    input = input || {};
    var subject = titleCase(String(input.name || '').trim()) || 'The Subject';
    var incidents = Array.isArray(input.incidents) ? input.incidents.slice(0, 8) : [];

    // Seed from the content so the document is stable for identical input.
    var seedBasis = subject + '::' + incidents.map(function (i) {
      return i.category + ':' + i.summary;
    }).join('|');
    var random = makeRandom(seedBasis);

    var present = pickMany(random, Data.ATTENDEES, 5 + Math.floor(random() * 3));

    // The Chairman chairs every meeting and is always seated first, because
    // seat one is rendered as "(presiding)" and signs the minutes as Chairman.
    // Merely being in the room is not enough — if they are drawn lower down,
    // the presiding label lands on somebody who never signs.
    var chairIndex = present.indexOf('The Chairman');
    if (chairIndex > 0) present.splice(chairIndex, 1);
    if (chairIndex !== 0) present.unshift('The Chairman');

    var remaining = Data.ATTENDEES.filter(function (role) { return present.indexOf(role) === -1; });
    var absent = pickMany(random, remaining, 1 + Math.floor(random() * 2)).map(function (role) {
      return { role: role, note: pick(random, Data.APOLOGIES) };
    });

    var movers = present.slice();

    var items = incidents.map(function (incident, index) {
      var dept = Data.DEPARTMENT_BY_KEY[incident.category] || departmentFor(incident.summary);
      var movedBy = pick(random, movers);
      var others = movers.filter(function (role) { return role !== movedBy; });
      var secondedBy = others.length ? pick(random, others) : 'The Chairman';

      return {
        number: index + 1,
        department: dept.name,
        emoji: dept.emoji,
        complaint: incident.summary,
        motion: pick(random, dept.motions).replace(/\{subject\}/g, subject),
        movedBy: movedBy,
        secondedBy: secondedBy,
        verdict: pick(random, Data.VERDICTS)
      };
    });

    var aob = pickMany(random, Data.AOB, 2).map(function (line) {
      return line.replace(/\{subject\}/g, subject);
    });

    var departmentsInvolved = {};
    items.forEach(function (item) { departmentsInvolved[item.department] = true; });

    return {
      ref: referenceNumber(random),
      subject: subject,
      date: formatDate(),
      venue: pick(random, Data.VENUES),
      time: pick(random, Data.MEETING_TIMES),
      present: present,
      absent: absent,
      mattersArising: pick(random, Data.MATTERS_ARISING),
      items: items,
      aob: aob,
      adjournment: pick(random, Data.ADJOURNMENTS),
      chairman: 'The Chairman',
      secretary: 'Secretary-General',
      stats: {
        motionsPassed: items.length,
        departments: Object.keys(departmentsInvolved).length,
        attendance: present.length
      },
      isEmpty: items.length === 0
    };
  }

  root.VPEngine = {
    generate: generate,
    classify: classify,
    departmentFor: departmentFor,
    makeRandom: makeRandom,
    hashString: hashString
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
