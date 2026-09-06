/* Unit tests for the minutes engine.
 * The comedy depends on the document being well-formed every time — a meeting
 * with no chairman, or the same elder seconding their own motion, breaks it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

for (const file of ['data.js', 'engine.js']) {
  vm.runInThisContext(fs.readFileSync(new URL(`../assets/js/${file}`, import.meta.url), 'utf8'));
}
const { VPEngine: E, VPData: D } = globalThis;

test('splits a compound complaint into separate agenda items', () => {
  const incidents = E.classify(D.SAMPLE);
  assert.ok(incidents.length >= 3, 'a four-part bad week should not collapse to one item');
  const categories = incidents.map((i) => i.category);
  assert.ok(categories.includes('romance'));
  assert.ok(categories.includes('money'));
});

test('routes complaints to the right department', () => {
  assert.equal(E.departmentFor('my transfer is still pending').key, 'money');
  assert.equal(E.departmentFor('the bus broke down in traffic').key, 'transport');
  assert.equal(E.departmentFor('my crush left me on read').key, 'romance');
  assert.equal(E.departmentFor('my data finished mid upload').key, 'tech');
  assert.equal(E.departmentFor('I have a headache and fever').key, 'health');
});

test('unrecognisable misfortune still gets a department', () => {
  const dept = E.departmentFor('everything is just somehow');
  assert.equal(dept.key, 'general', 'General Wahala is the catch-all, never a crash');
});

test('the same input always produces the same document', () => {
  const incidents = E.classify(D.SAMPLE);
  const a = E.generate({ name: 'Peace', incidents });
  const b = E.generate({ name: 'Peace', incidents });
  assert.equal(a.ref, b.ref, 'reference number must be stable across re-renders');
  assert.deepEqual(a.present, b.present);
  assert.deepEqual(a.items.map((i) => i.motion), b.items.map((i) => i.motion));
});

test('different people get different meetings', () => {
  const incidents = E.classify(D.SAMPLE);
  const a = E.generate({ name: 'Peace', incidents });
  const b = E.generate({ name: 'Divine', incidents });
  assert.notEqual(a.ref, b.ref);
});

test('every meeting is chaired and nobody attends twice', () => {
  for (const name of ['Peace', 'Divine', 'Amaka', 'Tunde', 'Zainab', 'Ope']) {
    const doc = E.generate({ name, incidents: E.classify(D.SAMPLE) });
    assert.ok(doc.present.includes('The Chairman'), `${name}: meeting needs a chairman`);
    assert.equal(new Set(doc.present).size, doc.present.length, `${name}: duplicate attendee`);
    for (const absentee of doc.absent) {
      assert.ok(!doc.present.includes(absentee.role),
        `${name}: ${absentee.role} cannot be both present and absent`);
    }
  }
});

test('the Chairman always presides and signs', () => {
  // Seat one is rendered as "(presiding)" and the signature block is signed
  // by the Chairman, so anyone else in seat one contradicts the document.
  for (const name of ['Peace', 'Divine', 'Amaka', 'Tunde', 'Zainab', 'Ope', 'Ada', 'Bola', 'Ify', 'Musa']) {
    const doc = E.generate({ name, incidents: E.classify(D.SAMPLE) });
    assert.equal(doc.present[0], 'The Chairman', `${name}: wrong person presiding`);
    assert.equal(doc.chairman, 'The Chairman');
    assert.equal(new Set(doc.present).size, doc.present.length, `${name}: chairman seated twice`);
  }
});

test('a motion is never seconded by its own mover', () => {
  for (const name of ['Peace', 'Divine', 'Amaka', 'Tunde', 'Zainab', 'Ope', 'Ada', 'Bola']) {
    const doc = E.generate({ name, incidents: E.classify(D.SAMPLE) });
    for (const item of doc.items) {
      assert.notEqual(item.movedBy, item.secondedBy,
        `${name}: ${item.movedBy} seconded their own motion`);
    }
  }
});

test('the subject name is substituted into every motion', () => {
  const doc = E.generate({ name: 'peace', incidents: E.classify(D.SAMPLE) });
  assert.equal(doc.subject, 'Peace', 'names are title-cased for the letterhead');
  for (const item of doc.items) {
    assert.ok(!item.motion.includes('{subject}'), 'unsubstituted placeholder leaked into a motion');
  }
  for (const line of doc.aob) {
    assert.ok(!line.includes('{subject}'), 'unsubstituted placeholder leaked into AOB');
  }
});

test('a missing name still produces a valid document', () => {
  const doc = E.generate({ incidents: E.classify(D.SAMPLE) });
  assert.equal(doc.subject, 'The Subject');
  assert.ok(doc.items.length > 0);
});

test('empty input produces an empty document rather than a crash', () => {
  const doc = E.generate({ name: 'Peace', incidents: [] });
  assert.equal(doc.isEmpty, true);
  assert.equal(doc.items.length, 0);
  assert.ok(doc.present.length > 0, 'the committee still meets, with nothing to discuss');
});

test('agenda is capped so one rant cannot produce a fifty-page document', () => {
  const long = Array.from({ length: 30 }, (_, i) => `problem number ${i} happened to me`).join(', ');
  assert.ok(E.classify(long).length <= 8);
});

test('attendees are roles, never realistic personal names', () => {
  // The satire only stays safe while it points at an invented committee.
  for (const role of D.ATTENDEES) {
    assert.ok(/^(The |Secretary|Head|Deputy|Committee|Treasurer|Officer|Director|Coordinator)/.test(role),
      `"${role}" reads like a real person's name`);
  }
});

test('every department can supply a motion', () => {
  for (const dept of D.DEPARTMENTS) {
    assert.ok(dept.motions.length >= 3, `${dept.key} needs motion variety`);
    for (const motion of dept.motions) {
      assert.ok(motion.includes('{subject}'), `${dept.key} motion must address the subject`);
    }
  }
});
