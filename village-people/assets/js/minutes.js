/* VILLAGE PEOPLE — document renderer
 *
 * Draws the minutes onto a canvas. Same reasoning as the rest of this repo:
 * the exported image IS the product, so it must not depend on a CDN
 * rasteriser that can fail on a slow connection mid-demo.
 *
 * The visual language is a typed committee document — foolscap paper, a
 * struck seal, Courier body text, heavy rules. The comedy only lands if the
 * form is played completely straight.
 */
(function (root) {
  'use strict';

  var W = 1080;
  var PAD = 84;
  var BOTTOM_PAD = 60;

  var PAPER = '#EFEFE9';
  var INK = '#1A1A18';
  var FADED = '#5E5B52';
  var RULE = '#9C978A';
  var SEAL = '#2E6B4F';
  var STAMP = '#6B3F86';

  var MONO = '"Courier New", "DejaVu Sans Mono", "Liberation Mono", monospace';
  var SERIF = 'Georgia, "Times New Roman", "Liberation Serif", serif';

  function font(weight, size, family) {
    return weight + ' ' + size + 'px ' + family;
  }

  function trackedText(ctx, text, x, y, spacing) {
    var cursor = x;
    for (var i = 0; i < text.length; i++) {
      ctx.fillText(text[i], cursor, y);
      cursor += ctx.measureText(text[i]).width + spacing;
    }
  }

  function trackedWidth(ctx, text, spacing) {
    var total = 0;
    for (var i = 0; i < text.length; i++) total += ctx.measureText(text[i]).width + spacing;
    return total - spacing;
  }

  function trackedCentered(ctx, text, centerX, y, spacing) {
    trackedText(ctx, text, centerX - trackedWidth(ctx, text, spacing) / 2, y, spacing);
  }

  function rule(ctx, y, color, weight, inset) {
    ctx.strokeStyle = color || RULE;
    ctx.lineWidth = weight || 1;
    ctx.beginPath();
    ctx.moveTo(PAD + (inset || 0), y);
    ctx.lineTo(W - PAD - (inset || 0), y);
    ctx.stroke();
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

  /* Paragraph helper: returns the y position after the block. */
  function paragraph(ctx, text, x, y, maxWidth, lineHeight) {
    wrap(ctx, text, maxWidth).forEach(function (line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    });
    return y;
  }

  /* The council seal: a mango tree, because the meeting is always under one. */
  function drawSeal(ctx, cx, cy, radius) {
    ctx.save();
    ctx.strokeStyle = SEAL;
    ctx.fillStyle = SEAL;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2);
    ctx.stroke();

    // Tree: trunk plus three canopy lobes.
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy + 18);
    ctx.lineTo(cx - 2, cy - 2);
    ctx.lineTo(cx + 2, cy - 2);
    ctx.lineTo(cx + 3, cy + 18);
    ctx.closePath();
    ctx.fill();

    [[-13, -8, 11], [0, -16, 13], [13, -8, 11]].forEach(function (lobe) {
      ctx.beginPath();
      ctx.arc(cx + lobe[0], cy + lobe[1], lobe[2], 0, Math.PI * 2);
      ctx.fill();
    });

    // Ground line under the tree.
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy + 19);
    ctx.lineTo(cx + 20, cy + 19);
    ctx.stroke();

    // Curved legend around the seal.
    function arcText(text, startAngle, sweep, r, size, flip) {
      ctx.font = font('bold', size, SERIF);
      var step = sweep / Math.max(text.length - 1, 1);
      for (var i = 0; i < text.length; i++) {
        var angle = startAngle + step * i;
        ctx.save();
        ctx.translate(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        ctx.rotate(angle + (flip ? -Math.PI / 2 : Math.PI / 2));
        ctx.textAlign = 'center';
        ctx.fillText(text[i], 0, 0);
        ctx.restore();
      }
      ctx.textAlign = 'left';
    }
    arcText('VILLAGE COUNCIL', -Math.PI * 0.92, Math.PI * 0.84, radius - 20, 11, false);
    arcText('EST. LONG AGO', Math.PI * 0.75, -Math.PI * 0.5, radius - 20, 10, true);

    ctx.restore();
  }

  function drawStamp(ctx, x, y, label, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = STAMP;
    ctx.fillStyle = STAMP;
    ctx.lineWidth = 3;

    ctx.font = font('bold', 30, SERIF);
    var textWidth = trackedWidth(ctx, label, 4);
    var boxW = textWidth + 44;
    var boxH = 58;
    ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
    ctx.strokeRect(-boxW / 2 + 5, -boxH / 2 + 5, boxW - 10, boxH - 10);
    ctx.textBaseline = 'middle';
    trackedText(ctx, label, -textWidth / 2, 1, 4);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  /* A deterministic scribble, so a given signatory always signs the same way. */
  function signature(ctx, x, y, width, seed) {
    var random = root.VPEngine.makeRandom(seed);
    ctx.save();
    ctx.strokeStyle = '#2A3F6B';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    var steps = 6;
    for (var i = 1; i <= steps; i++) {
      var px = x + (width / steps) * i;
      var cy1 = y - 18 + random() * 30;
      var cy2 = y - 22 + random() * 34;
      ctx.bezierCurveTo(px - width / steps / 2, cy1, px - width / steps / 4, cy2, px, y - 4 + random() * 8);
    }
    ctx.stroke();
    ctx.restore();
  }

  function paint(ctx, doc) {
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, 6000);

    var center = W / 2;
    var contentWidth = W - PAD * 2;
    var y = 96;

    drawSeal(ctx, center, y, 52);
    y += 96;

    ctx.fillStyle = INK;
    ctx.font = font('bold', 17, SERIF);
    trackedCentered(ctx, 'THE VILLAGE COUNCIL', center, y, 5);
    y += 22;
    ctx.fillStyle = FADED;
    ctx.font = font('normal', 14, SERIF);
    trackedCentered(ctx, 'OFFICE OF THE COMMITTEE SECRETARIAT', center, y, 2.5);
    y += 30;

    rule(ctx, y, INK, 3);
    rule(ctx, y + 5, INK, 1);
    y += 46;

    // Title block
    ctx.fillStyle = INK;
    ctx.font = font('bold', 25, SERIF);
    var title = 'MINUTES OF THE EXTRAORDINARY MEETING';
    ctx.fillText(title, center - ctx.measureText(title).width / 2, y);
    y += 36;

    ctx.font = font('bold', 21, SERIF);
    var committee = 'COMMITTEE FOR THE DELAY OF';
    ctx.fillText(committee, center - ctx.measureText(committee).width / 2, y);
    y += 32;
    ctx.font = font('bold', 30, SERIF);
    var who = (doc.subject + '’S PROGRESS').toUpperCase();
    ctx.fillText(who, center - ctx.measureText(who).width / 2, y);
    y += 40;

    rule(ctx, y, RULE, 1);
    y += 34;

    // Meta block, typed
    ctx.font = font('normal', 17, MONO);
    var metaLeft = [['REF:', doc.ref], ['DATE:', doc.date]];
    var metaRight = [['TIME:', doc.time], ['VENUE:', doc.venue]];
    var colB = PAD + 470;

    metaLeft.forEach(function (row, i) {
      ctx.fillStyle = FADED;
      ctx.fillText(row[0], PAD, y + i * 26);
      ctx.fillStyle = INK;
      ctx.fillText(row[1], PAD + 62, y + i * 26);
    });
    metaRight.forEach(function (row, i) {
      ctx.fillStyle = FADED;
      ctx.fillText(row[0], colB, y + i * 26);
      ctx.fillStyle = INK;
      wrap(ctx, row[1], W - PAD - colB - 70).forEach(function (line, li) {
        ctx.fillText(line, colB + 72, y + i * 26 + li * 22);
      });
    });
    y += 84;

    rule(ctx, y, RULE, 1);
    y += 38;

    function heading(text) {
      ctx.fillStyle = INK;
      ctx.font = font('bold', 15, SERIF);
      trackedText(ctx, text, PAD, y, 3);
      y += 26;
    }

    // 1. Attendance
    heading('1.  ATTENDANCE');
    ctx.font = font('normal', 16, MONO);
    ctx.fillStyle = INK;
    doc.present.forEach(function (role, i) {
      ctx.fillText('    ' + String(i + 1) + '.  ' + role + (i === 0 ? '  (presiding)' : ''), PAD, y);
      y += 24;
    });
    y += 10;

    ctx.fillStyle = FADED;
    ctx.font = font('bold', 13, SERIF);
    trackedText(ctx, 'APOLOGIES FOR ABSENCE', PAD, y, 2);
    y += 22;
    ctx.font = font('normal', 15, MONO);
    doc.absent.forEach(function (entry) {
      ctx.fillText('    ' + entry.role + ' — ' + entry.note, PAD, y);
      y += 22;
    });
    y += 22;

    // 2. Matters arising
    heading('2.  MATTERS ARISING');
    ctx.fillStyle = INK;
    ctx.font = font('normal', 16, MONO);
    y = paragraph(ctx, doc.mattersArising, PAD + 20, y, contentWidth - 20, 24);
    y += 24;

    // 3. Resolutions
    heading('3.  RESOLUTIONS');
    y += 4;

    doc.items.forEach(function (item) {
      ctx.fillStyle = INK;
      ctx.font = font('bold', 16, SERIF);
      var label = '3.' + item.number + '   ' + item.department.toUpperCase();
      y = paragraph(ctx, label, PAD, y, contentWidth, 24);
      y += 6;

      ctx.fillStyle = FADED;
      ctx.font = font('italic normal', 15, MONO);
      y = paragraph(ctx, 'Complaint on file: “' + item.complaint + '”', PAD + 26, y, contentWidth - 26, 22);
      y += 8;

      ctx.fillStyle = INK;
      ctx.font = font('bold', 15, MONO);
      var motionLines = wrap(ctx, 'MOTION: ' + item.motion, contentWidth - 26);
      motionLines.forEach(function (line) {
        ctx.fillText(line, PAD + 26, y);
        y += 23;
      });
      y += 4;

      ctx.font = font('normal', 15, MONO);
      ctx.fillStyle = FADED;
      y = paragraph(ctx, 'Moved by ' + item.movedBy + '; seconded by ' + item.secondedBy + '.',
        PAD + 26, y, contentWidth - 26, 22);

      ctx.fillStyle = INK;
      ctx.font = font('bold', 15, MONO);
      ctx.fillText('RESOLUTION: ' + item.verdict, PAD + 26, y);
      y += 34;
    });

    y += 4;

    // 4. AOB
    heading('4.  ANY OTHER BUSINESS');
    ctx.fillStyle = INK;
    ctx.font = font('normal', 16, MONO);
    doc.aob.forEach(function (line, i) {
      y = paragraph(ctx, '4.' + (i + 1) + '  ' + line, PAD + 20, y, contentWidth - 20, 24);
      y += 10;
    });
    y += 14;

    // 5. Adjournment
    heading('5.  ADJOURNMENT');
    ctx.fillStyle = INK;
    ctx.font = font('normal', 16, MONO);
    y = paragraph(ctx, doc.adjournment, PAD + 20, y, contentWidth - 20, 24);
    y += 56;

    // Signatures
    var sigWidth = 300;
    var rightX = W - PAD - sigWidth;
    signature(ctx, PAD + 20, y, 190, doc.ref + doc.chairman);
    signature(ctx, rightX + 20, y, 190, doc.ref + doc.secretary);
    y += 16;

    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    [PAD, rightX].forEach(function (x) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + sigWidth, y);
      ctx.stroke();
    });
    y += 24;

    ctx.fillStyle = INK;
    ctx.font = font('bold', 14, MONO);
    ctx.fillText(doc.chairman, PAD, y);
    ctx.fillText(doc.secretary, rightX, y);
    y += 20;
    ctx.fillStyle = FADED;
    ctx.font = font('normal', 13, MONO);
    ctx.fillText('Chairman', PAD, y);
    ctx.fillText('Secretary', rightX, y);
    y += 18;

    drawStamp(ctx, center + 40, y - 68, 'CONFIDENTIAL', -0.16);
    y += 44;

    rule(ctx, y, RULE, 1);
    y += 30;

    // The disclaimer is not a legal footnote, it is part of the joke — and it
    // is what keeps the satire aimed at a fictional committee.
    ctx.fillStyle = INK;
    ctx.font = font('bold', 14, SERIF);
    trackedText(ctx, 'SATIRE. THESE MINUTES ARE FICTIONAL.', PAD, y, 2);
    y += 22;
    ctx.fillStyle = FADED;
    ctx.font = font('normal', 13, MONO);
    ctx.fillText('No real meeting took place. Your auntie is probably innocent.', PAD, y);
    y += 20;
    ctx.fillText(doc.siteLabel || '', PAD, y);

    return y;
  }

  function render(canvas, doc) {
    var probe = document.createElement('canvas');
    probe.width = W;
    probe.height = 6000;
    var height = Math.round(paint(probe.getContext('2d'), doc) + BOTTOM_PAD);

    var ratio = Math.min(root.devicePixelRatio || 1, 2) * 2;
    canvas.width = Math.round(W * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = '100%';
    canvas.style.height = 'auto';

    var ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    paint(ctx, doc);
    return { width: W, height: height };
  }

  function toBlob(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        blob ? resolve(blob) : reject(new Error('Could not export the minutes.'));
      }, 'image/png');
    });
  }

  root.VPMinutes = { render: render, toBlob: toBlob };
})(typeof globalThis !== 'undefined' ? globalThis : this);
