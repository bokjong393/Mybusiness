/* PAY ME — payslip renderer
 *
 * Draws the share artifact directly onto a canvas rather than rasterising the
 * DOM. The exported image IS the product, so it must not depend on a CDN
 * library that can fail on a slow network or mangle fonts mid-demo. Native
 * canvas means the PNG a user downloads is byte-identical to what they saw.
 *
 * Everything is drawn in a 1080px-wide logical space and scaled by the device
 * pixel ratio, so the export is crisp on a phone screen and in a group chat.
 */
(function (root) {
  'use strict';

  var E = root.PayMeEngine;

  var W = 1080;
  var PAD = 76;
  var INK = '#17150F';
  var MUTED = '#6B6255';
  var RULE = '#B9B0A0';
  var PAPER = '#F6F3EA';
  var STAMP = '#B33A3A';

  var MONO = '"Courier New", "DejaVu Sans Mono", "Liberation Mono", monospace';
  var SERIF = 'Georgia, "Times New Roman", "Liberation Serif", serif';
  var SANS = '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif';

  function font(weight, size, family) {
    return weight + ' ' + size + 'px ' + family;
  }

  /* Letterspacing is not portable via ctx.letterSpacing across all browsers,
   * so tracked-out labels are drawn glyph by glyph. */
  function trackedText(ctx, text, x, y, spacing) {
    var cursor = x;
    for (var i = 0; i < text.length; i++) {
      ctx.fillText(text[i], cursor, y);
      cursor += ctx.measureText(text[i]).width + spacing;
    }
    return cursor - x - spacing;
  }

  function trackedWidth(ctx, text, spacing) {
    var total = 0;
    for (var i = 0; i < text.length; i++) {
      total += ctx.measureText(text[i]).width + spacing;
    }
    return total - spacing;
  }

  function rule(ctx, y, color, weight) {
    ctx.strokeStyle = color || RULE;
    ctx.lineWidth = weight || 1;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
  }

  function dottedLeader(ctx, fromX, toX, y) {
    if (toX - fromX < 12) return;
    ctx.save();
    ctx.strokeStyle = RULE;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    ctx.moveTo(fromX, y);
    ctx.lineTo(toX, y);
    ctx.stroke();
    ctx.restore();
  }

  function wrap(ctx, text, maxWidth) {
    var words = String(text).split(/\s+/);
    var lines = [];
    var line = '';
    words.forEach(function (word) {
      var attempt = line ? line + ' ' + word : word;
      if (ctx.measureText(attempt).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = attempt;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  /* Perforated paper edge — the visual cue that this is a torn-off document. */
  function perforate(ctx, y, facingDown) {
    var radius = 11;
    var step = 34;
    ctx.fillStyle = PAPER;
    ctx.beginPath();
    for (var x = step / 2; x < W; x += step) {
      ctx.moveTo(x, y);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    for (var cx = step / 2; cx < W; cx += step) {
      ctx.moveTo(cx + radius, y);
      ctx.arc(cx, y, radius, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    void facingDown;
  }

  /* Deterministic barcode so one payslip always exports the same bars. */
  function barcode(ctx, y, seed) {
    var hash = 0;
    var text = String(seed);
    for (var i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;

    var x = PAD;
    var limit = W - PAD;
    ctx.fillStyle = INK;
    var i2 = 0;
    while (x < limit - 2) {
      hash = (hash * 1103515245 + 12345) & 0x7fffffff;
      var width = 1 + (hash % 4);
      if (i2 % 2 === 0) ctx.fillRect(x, y, width, 54);
      x += width + 1;
      i2++;
    }
  }

  function stamp(ctx, x, y, label) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.2);
    ctx.globalAlpha = 0.62;
    ctx.strokeStyle = STAMP;
    ctx.fillStyle = STAMP;
    ctx.lineWidth = 4;

    ctx.font = font('bold', 46, SANS);
    var textWidth = trackedWidth(ctx, label, 5);
    var boxW = textWidth + 56;
    var boxH = 82;

    ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
    ctx.strokeRect(-boxW / 2 + 7, -boxH / 2 + 7, boxW - 14, boxH - 14);
    ctx.textBaseline = 'middle';
    trackedText(ctx, label, -textWidth / 2, 2, 5);
    ctx.restore();
  }

  var BOTTOM_PAD = 58;

  /* Two-pass layout. The real height depends on the line count AND on how the
   * review text happens to wrap, so the document paints itself once offscreen
   * to discover where it actually ends, then paints for real at that size.
   * A formula was guessing this before and silently clipped the footer. */
  function paint(ctx, model) {
    var result = model.result;

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, 4200);

    // Header band
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, 96);
    ctx.fillStyle = PAPER;
    ctx.font = font('bold', 21, SANS);
    trackedText(ctx, 'HOUSEHOLD PAYROLL', PAD, 58, 4.5);
    ctx.font = font('normal', 19, MONO);
    var ref = 'REF ' + model.ref;
    ctx.fillText(ref, W - PAD - ctx.measureText(ref).width, 58);

    var y = 190;

    // Masthead
    ctx.fillStyle = INK;
    ctx.font = font('normal', 92, SERIF);
    ctx.fillText('Payslip', PAD, y);

    ctx.fillStyle = MUTED;
    ctx.font = font('normal', 20, SANS);
    var sub = 'The one your household never ran';
    ctx.fillText(sub, W - PAD - ctx.measureText(sub).width, y - 10);

    y += 44;
    rule(ctx, y, INK, 2.5);

    // Meta grid
    y += 46;
    var colB = PAD + 470;
    function meta(label, value, x, yy) {
      ctx.fillStyle = MUTED;
      ctx.font = font('bold', 15, SANS);
      trackedText(ctx, label, x, yy, 2.4);
      ctx.fillStyle = INK;
      ctx.font = font('normal', 27, SERIF);
      ctx.fillText(value, x, yy + 36);
    }
    meta('EMPLOYEE', model.name, PAD, y);
    meta('PAY PERIOD', model.period, colB, y);
    y += 84;
    meta('POSITION', model.jobTitle, PAD, y);
    meta('EMPLOYER', 'My Family Ltd.', colB, y);

    y += 90;
    rule(ctx, y, RULE, 1);

    // Table header
    y += 34;
    var xHrs = W - PAD - 430;
    var xRate = W - PAD - 300;
    var xAmt = W - PAD;
    ctx.fillStyle = MUTED;
    ctx.font = font('bold', 14, SANS);
    trackedText(ctx, 'DESCRIPTION', PAD, y, 2.2);
    ctx.textAlign = 'right';
    ctx.fillText('HRS', xHrs, y);
    ctx.fillText('RATE/HR', xRate, y);
    ctx.fillText('AMOUNT', xAmt, y);
    ctx.textAlign = 'left';

    y += 12;
    rule(ctx, y, RULE, 1);

    // Line items
    y += 34;
    result.lines.forEach(function (line) {
      ctx.fillStyle = INK;
      ctx.font = font('normal', 25, SERIF);
      var label = line.label + (line.priced ? '' : ' *');
      ctx.fillText(label, PAD, y);
      var labelEnd = PAD + ctx.measureText(label).width + 12;

      ctx.font = font('normal', 23, MONO);
      ctx.textAlign = 'right';
      var hrs = E.formatHours(line.hours);
      dottedLeader(ctx, labelEnd, xHrs - ctx.measureText(hrs).width - 12, y - 8);
      ctx.fillText(hrs, xHrs, y);

      if (line.priced) {
        ctx.fillText(E.formatNaira(line.rate), xRate, y);
        ctx.fillText(E.formatNaira(line.amount), xAmt, y);
      } else {
        ctx.fillStyle = MUTED;
        ctx.fillText('—', xRate, y);
        ctx.fillText('not priced', xAmt, y);
      }
      ctx.textAlign = 'left';
      y += 52;
    });

    // Totals
    y += 6;
    rule(ctx, y, INK, 2.5);
    y += 44;

    function totalRow(label, value, opts) {
      opts = opts || {};
      ctx.fillStyle = opts.muted ? MUTED : INK;
      ctx.font = font('bold', 15, SANS);
      trackedText(ctx, label, PAD, y, 2.4);
      ctx.font = font(opts.bold ? 'bold' : 'normal', opts.size || 27, MONO);
      ctx.textAlign = 'right';
      ctx.fillText(value, xAmt, y + 2);
      ctx.textAlign = 'left';
      y += opts.gap || 48;
    }

    totalRow('HOURS WORKED', E.formatHours(result.totalHours) + ' hrs');
    totalRow('ESTIMATED REPLACEMENT VALUE', E.formatNaira(result.weeklyValue));
    totalRow('AMOUNT ACTUALLY PAID', E.formatNaira(0), { muted: true, gap: 40 });

    // Balance box — the punchline
    var boxTop = y - 6;
    var boxH = 128;
    ctx.fillStyle = INK;
    ctx.fillRect(PAD, boxTop, W - PAD * 2, boxH);

    ctx.fillStyle = PAPER;
    ctx.font = font('bold', 16, SANS);
    trackedText(ctx, 'BALANCE OUTSTANDING', PAD + 30, boxTop + 46, 3);
    ctx.font = font('bold', 62, MONO);
    ctx.textAlign = 'right';
    ctx.fillText(E.formatNaira(result.outstanding), W - PAD - 30, boxTop + 100);
    ctx.textAlign = 'left';

    y = boxTop + boxH + 52;

    // Status + annual projection
    ctx.fillStyle = INK;
    ctx.font = font('bold', 25, SANS);
    ctx.fillText(model.status, PAD, y);
    y += 38;
    ctx.fillStyle = MUTED;
    ctx.font = font('normal', 22, SANS);
    ctx.fillText('At this rate: ' + E.formatNaira(result.annualValue) + ' a year.', PAD, y);

    // Stamp sits in the clear space beside these two short lines, never over
    // the figures — an illegible total defeats the entire point of the image.
    stamp(ctx, W - PAD - 165, y - 40, 'UNPAID');

    y += 44;

    // Performance review
    if (model.review) {
      ctx.fillStyle = INK;
      ctx.font = font('italic normal', 24, SERIF);
      wrap(ctx, '\u201C' + model.review + '\u201D', W - PAD * 2).forEach(function (lineText) {
        ctx.fillText(lineText, PAD, y);
        y += 34;
      });
      y += 14;
    }

    // Footnote for unpriced rows
    if (result.unpricedHours > 0) {
      ctx.fillStyle = MUTED;
      ctx.font = font('normal', 17, SANS);
      ctx.fillText('* ' + E.formatHours(result.unpricedHours)
        + ' hrs of emotional support counted, deliberately not priced.', PAD, y);
      y += 34;
    }

    y += 10;
    rule(ctx, y, RULE, 1);
    y += 40;

    barcode(ctx, y, model.ref);
    y += 96;

    ctx.fillStyle = INK;
    ctx.font = font('bold', 24, SANS);
    trackedText(ctx, 'UNPAID WORK IS STILL WORK', PAD, y, 3);
    y += 32;
    ctx.fillStyle = MUTED;
    ctx.font = font('normal', 16, SANS);
    ctx.fillText('Illustrative replacement-cost estimate. Not a wage, not a debt, not a GDP figure.', PAD, y);
    y += 24;
    ctx.fillText(model.siteLabel, PAD, y);

    return y;
  }

  function render(canvas, model) {
    // Pass 1: discover the true content height.
    var probe = document.createElement('canvas');
    probe.width = W;
    probe.height = 4200;
    var H = Math.round(paint(probe.getContext('2d'), model) + BOTTOM_PAD);

    // Pass 2: paint for real, at 2x for a crisp export in a group chat.
    var ratio = Math.min(root.devicePixelRatio || 1, 2) * 2;
    canvas.width = Math.round(W * ratio);
    canvas.height = Math.round(H * ratio);
    canvas.style.width = '100%';
    canvas.style.height = 'auto';

    var ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    paint(ctx, model);

    perforate(ctx, 0);
    perforate(ctx, H);

    return { width: W, height: H };
  }

  function toBlob(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        blob ? resolve(blob) : reject(new Error('Could not export the payslip image.'));
      }, 'image/png');
    });
  }

  root.PayMePayslip = { render: render, toBlob: toBlob };
})(typeof globalThis !== 'undefined' ? globalThis : this);
