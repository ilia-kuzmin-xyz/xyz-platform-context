/**
 * The coverage board: the same 28 concepts, with two more layers on top.
 *
 *   Landed        a gap the design had, that a Supabase migration has since
 *                 filled. These are the parts that used to be drawn from
 *                 stand-in data behind SCHEMA_PREVIEW, which is now off.
 *   UI ahead      something the screens or the Figma offer that no working
 *                 storage path carries.
 *
 * The second one has a distinction worth keeping. "UI ahead" is rarely "there
 * is no column" any more — usually the column exists and nothing is wired to
 * it, because the schema moved after the UI was written. A stranded column is
 * a much cheaper problem than a missing one, and reads the same on a screen,
 * so the sheets say which it is.
 *
 * Purely additive: it pushes onto LAYERS and CONCEPTS from model.js, so the
 * map and this board never fall out of step. Load it between model.js and
 * app.js.
 *
 * Read from source on 10 Sep 2026: hc-frontend PR #2186 at the PLT-2968 head,
 * and the live dev schema in data/columns.json.
 */

LAYERS.push(
  {
    key: 'landed',
    tag: 'Landed',
    label: 'Landed in Supabase',
    column: 'Landed',
    role: 'status',
    colour: 'var(--landed)',
    sparse: true,
  },
  {
    key: 'ahead',
    tag: 'UI ahead',
    label: 'UI ahead of the data',
    column: 'UI ahead of the data',
    role: 'status',
    colour: 'var(--ahead)',
    sparse: true,
    provisional: true,
  },
);

/** Adds a sheet and its rows to a concept that already exists on the map. */
function annotate(id, sheets, fields = []) {
  const concept = CONCEPTS.find(one => one.id === id);
  if (!concept) {
    console.warn(`coverage: no concept "${id}" — the map was renamed under it`);
    return;
  }
  Object.assign(concept.sheets, sheets);
  concept.fields = [...(concept.fields ?? []), ...fields];
  if (sheets.ahead) concept.flag = true;
}

/* ─────────────────────────────────────────── what the migrations delivered */

annotate('section-of-a-task', {
  landed: {
    label: 'task_item.section_type',
    detail: '3 Sep — preconditions stopped being a preview and became a section',
  },
}, [
  { ux: 'Preconditions gate the steps', landed: 'Drawn from real data since 3 Sep' },
]);

annotate('the-question-itself', {
  landed: { label: 'task_item.unit', detail: '3 Sep — the unit beside a reading' },
}, [
  { ux: 'Unit beside a reading', landed: 'Was a stand-in until 3 Sep' },
]);

annotate('a-note-against-an-answer', {
  landed: { label: 'task_execution_item.note', detail: '3 Sep — a note against the item, not the run' },
});

annotate('one-run-of-a-task', {
  landed: {
    label: 'task_execution.outcome_note',
    detail: '3 Sep, with the outcome set widened to passWithComments; abort added 10 Sep',
  },
}, [
  { ux: 'Pass with comments', landed: 'Verdict and its comment both stored since 3 Sep' },
]);

annotate('where-the-question-sits', {
  landed: {
    label: 'task_item.parent_task_item_id · assigned_to',
    detail: '4 Sep — a header became a group that nests and carries an assignee',
  },
});

annotate('evidence-file', {
  landed: {
    label: 'commissioning_file · commissioning_file_association',
    detail: '8 Sep — a file can be registered and attached to a run, an item or a signature',
  },
});

/* ──────────────────────────── what the screens offer and nothing carries yet */

annotate('sign-off', {
  ahead: {
    label: 'Expected signatories · drawn signature',
    detail: 'Both have somewhere to live now. Neither is wired.',
  },
}, [
  {
    ux: 'The signatories a test expects, some mandatory',
    bridge: 'task_template_version.signing_slots',
    ahead: 'Column exists, nothing reads it',
    note: 'The runner leaves the expected-signatory list out on the grounds that nothing models it. signing_slots is a jsonb column on the version and is not referenced anywhere in hc-frontend, so the place exists and the wiring does not.',
  },
  {
    ux: 'Sign by drawing',
    bridge: 'task_execution_signature.signature_ref',
    ahead: 'Column exists, nothing writes it',
    note: 'Left out because signature_ref pointed at a bucket that did not exist. commissioning_file_association.signature_id landed on 8 Sep, so a drawn signature now has a home.',
  },
  {
    ux: 'Submission blocked until the mandatory ones are in',
    ahead: 'Not built — needs the list above first',
  },
]);

annotate('an-answer', {
  ahead: {
    label: 'Add media on a step',
    detail: 'evidence_ref is read and never written; the file tables are unused',
  },
}, [
  {
    ux: 'Add media on a step',
    bridge: 'task_execution_item.evidence_ref',
    ahead: 'Read, never written',
    note: 'The item card leaves the Add Media button out for want of a bucket. commissioning_file_association.execution_item_id landed on 8 Sep and hc-frontend references the file tables zero times.',
  },
]);

annotate('work-required', {
  ahead: {
    label: 'Raise issue · block a step · assign an item',
    detail: 'One has no table at all; two have columns nothing uses',
  },
}, [
  {
    ux: 'Raise an issue from a step',
    ahead: 'No table anywhere in the bridge',
    note: 'api-v2 has TaskExecutionIssue. We have nothing, so this is a feature owed rather than a wiring job.',
  },
  {
    ux: 'Block a task, with a reason',
    bridge: 'task_instance.blocked_reason',
    ahead: 'Whole-task only — a step cannot be blocked',
    note: 'The design blocks a step. The reason is stored against the instance, so blocking one step would read as blocking the task.',
  },
  {
    ux: 'Who an item is assigned to',
    bridge: 'task_instance_item.assignee',
    ahead: 'Column unused — the runner shows answered_by instead',
    note: 'The runner reads task_execution_item.answered_by into the field it calls the assignee, so the screen shows who answered rather than who was asked.',
  },
]);
