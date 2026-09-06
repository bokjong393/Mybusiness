/* PAY ME — deterministic valuation engine
 *
 * This file owns ALL arithmetic. No language model is ever asked to multiply,
 * price, or total anything: the AI only ever turns free text into category
 * labels and hour guesses, which land here as ordinary numbers.
 *
 * Method: replacement cost. For each task, estimated value = hours x the
 * illustrative hourly cost of buying that service in the market. Replacement
 * cost is used rather than opportunity cost so that two people doing identical
 * housework get identical valuations regardless of their earning power.
 */
(function (root) {
  'use strict';

  var Data = root.PayMeData;

  function clampHours(value) {
    var n = Number(value);
    if (!isFinite(n) || n <= 0) return 0;
    // A week has 168 hours. Anything beyond that is a typo, not a workload.
    return Math.min(n, 168);
  }

  function round(n) {
    return Math.round(n);
  }

  /* Effective rate for a task: an explicit user override wins, otherwise the
   * base rate scaled by the selected tier. Unpriced tasks stay null forever —
   * no tier or override can put a price on emotional labour.
   */
  function resolveRate(key, tierId, overrides) {
    var task = Data.TASK_BY_KEY[key];
    if (!task || task.rate === null) return null;

    if (overrides && overrides[key] != null) {
      var override = Number(overrides[key]);
      if (isFinite(override) && override >= 0) return round(override);
    }

    var tier = Data.TIERS.filter(function (t) { return t.id === tierId; })[0]
      || Data.TIERS.filter(function (t) { return t.id === 'typical'; })[0];
    return round(task.rate * tier.multiplier);
  }

  function bandFor(totalHours) {
    for (var i = 0; i < Data.BANDS.length; i++) {
      if (totalHours <= Data.BANDS[i].maxHours) return Data.BANDS[i];
    }
    return Data.BANDS[Data.BANDS.length - 1];
  }

  /* entries: [{ key, hours }] — hours are per week.
   * Returns a fully-resolved payslip with nothing left to compute downstream.
   */
  function compute(input) {
    input = input || {};
    var entries = Array.isArray(input.entries) ? input.entries : [];
    var tierId = input.tier || 'typical';
    var overrides = input.rateOverrides || {};

    // Merge duplicates: two "cooking" entries are one line on a payslip.
    var merged = {};
    var order = [];
    entries.forEach(function (entry) {
      if (!entry || !Data.TASK_BY_KEY[entry.key]) return;
      var hours = clampHours(entry.hours);
      if (hours <= 0) return;
      if (merged[entry.key] == null) {
        merged[entry.key] = 0;
        order.push(entry.key);
      }
      merged[entry.key] = clampHours(merged[entry.key] + hours);
    });

    var lines = order.map(function (key) {
      var task = Data.TASK_BY_KEY[key];
      var hours = merged[key];
      var rate = resolveRate(key, tierId, overrides);
      var priced = rate !== null;
      return {
        key: key,
        label: task.label,
        emoji: task.emoji,
        hours: hours,
        rate: rate,
        priced: priced,
        amount: priced ? round(hours * rate) : 0
      };
    });

    var totalHours = lines.reduce(function (sum, l) { return sum + l.hours; }, 0);
    var pricedHours = lines.reduce(function (s, l) { return l.priced ? s + l.hours : s; }, 0);
    var unpricedHours = round((totalHours - pricedHours) * 100) / 100;
    var weeklyValue = lines.reduce(function (sum, l) { return sum + l.amount; }, 0);

    // Biggest single contributor — the payslip calls this out by name.
    var topLine = lines.reduce(function (best, l) {
      if (!l.priced) return best;
      return (!best || l.amount > best.amount) ? l : best;
    }, null);

    var band = bandFor(totalHours);

    return {
      lines: lines,
      totalHours: round(totalHours * 100) / 100,
      pricedHours: round(pricedHours * 100) / 100,
      unpricedHours: unpricedHours,
      weeklyValue: weeklyValue,
      monthlyValue: round(weeklyValue * Data.WEEKS_PER_MONTH),
      annualValue: round(weeklyValue * Data.WEEKS_PER_YEAR),
      amountPaid: 0,
      outstanding: weeklyValue,
      blendedHourly: pricedHours > 0 ? round(weeklyValue / pricedHours) : 0,
      topLine: topLine,
      band: band,
      tier: tierId,
      isEmpty: lines.length === 0
    };
  }

  /* ₦1,234 — no decimals. Naira amounts below one naira are noise here. */
  function formatNaira(amount) {
    var n = Math.round(Number(amount) || 0);
    return '₦' + n.toLocaleString('en-NG');
  }

  /* 3, 3.5, 12 — trailing .0 is visual clutter on a payslip. */
  function formatHours(hours) {
    var n = Number(hours) || 0;
    return (Math.round(n * 10) / 10).toString();
  }

  /* Deterministic pick so the same payslip keeps the same job title across
   * re-renders and re-downloads, instead of reshuffling on every repaint.
   */
  function pickDeterministic(list, seed) {
    var hash = 0;
    var str = String(seed || '');
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return list[Math.abs(hash) % list.length];
  }

  root.PayMeEngine = {
    compute: compute,
    resolveRate: resolveRate,
    bandFor: bandFor,
    clampHours: clampHours,
    formatNaira: formatNaira,
    formatHours: formatHours,
    pickDeterministic: pickDeterministic
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
