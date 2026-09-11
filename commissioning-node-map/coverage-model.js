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
 * Read from source on 11 Sep 2026: hc-frontend PR #2186 at the PLT-2968 head,
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
  {
    key: 'designed',
    tag: 'Designed',
    label: 'Designed, not built',
    column: 'Designed, not built',
    role: 'status',
    colour: 'var(--designed)',
    sparse: true,
    provisional: true,
    source: 'Commissioning Platform (standalone) prototype — the template editor in '
      + 'Project settings → Task library, read 11 Sep 2026',
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
  landed: {
    label: 'task_item.unit · value_fields · table_columns · table_cells',
    detail: '3 Sep the unit; 10 and 11 Sep the declared shape of a reading and of a grid',
  },
}, [
  { ux: 'Unit beside a reading', landed: 'Was a stand-in until 3 Sep' },
  {
    ux: 'A reading with named value slots',
    bridge: 'value_fields',
    landed: '10 Sep — authored, then rejected on save, now stored',
    note: 'The builder has authored inputField items for weeks while apply_execution refused any definition containing one, because task_item had nowhere to put the slots. The column and the RPC landed together.',
  },
  {
    ux: 'A table with columns and rows',
    bridge: 'table_columns / table_cells',
    landed: '11 Sep — the same gap, closed the same way',
    note: 'The grid editor had the same problem as inputField and was fixed to the pattern it set.',
  },
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
}, [
  {
    ux: 'Reference document on a task',
    api: 'CommissioningTaskFileReferenceMapping',
    landed: '11 Sep, on their side',
    note: 'api-v2 grew its first file link table. It attaches a file reference to a task definition, which is our referenceDocument association — so the two sides now agree about a document on a task, and still not about evidence on a run.',
  },
]);

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

/* ───────────────────────────── what the design has and the screens do not yet

   The opposite direction from "UI ahead": here the prototype shows something
   the builder has not been given, and in five of the six the column is already
   waiting. Read off the template editor on 11 Sep, after a rail that was mine
   rather than the design's came out of the builder.                          */

annotate('where-the-question-sits', {
  designed: {
    label: 'Nested items · drag to reorder',
    detail: 'Both lists are trees in the prototype, dragged into order',
  },
}, [
  {
    ux: 'Preconditions and items nest under a group',
    bridge: 'task_item.parent_task_item_id',
    designed: 'Storage landed 4 Sep; the builder’s lists are flat',
    note: 'The prototype draws preconditions and task items with the same recursive node, indented by depth. The runner already reads groups; only the builder cannot make one.',
  },
  {
    ux: 'Drag an item into place',
    bridge: 'task_item.position',
    designed: 'Order is stored; the builder has no drag',
    note: 'Every row in the prototype carries a drag handle, and the form elements are dragged in from the rail.',
  },
]);

annotate('section-of-a-task', {
  designed: {
    label: 'Assign a group to someone',
    detail: 'A group row reads “Assigned to:” with an avatar and a name',
  },
}, [
  {
    ux: 'Who a group is assigned to',
    bridge: 'task_item.assigned_to',
    designed: 'Column landed 4 Sep; the builder never offers it',
    note: 'api-v2 has the same field on its header table. Both stores are ready and no screen writes it.',
  },
]);

annotate('evidence-file', {
  designed: {
    label: 'Reference documents on a template',
    detail: '“Available to the engineer on site” — attach, list, remove',
  },
}, [
  {
    ux: 'Reference documents on a template',
    bridge: 'commissioning_file_association.task_template_version_id',
    api: 'CommissioningTaskFileReferenceMapping',
    designed: 'Both stores have a place; nothing attaches one',
    note: 'Ours landed 8 Sep as an association type, theirs on 11 Sep as its own table. This is the one place the two sides already agree about files.',
  },
]);

annotate('task-guarding-a-rung-asset', {
  designed: {
    label: 'Target asset type and rung, while editing the template',
    detail: 'Two selects in the identity card, beside the description',
  },
}, [
  {
    ux: 'Set the target asset type and the rung it gates',
    bridge: 'asset_type_task.asset_type_id / asset_type_task.readiness_step_id',
    designed: 'Only reachable from the type editor',
    note: 'The mapping exists and is authored elsewhere — Project Settings → Types → Add task. The design puts it on the template too, so an author never leaves the editor to say what the task is for.',
  },
]);

annotate('the-question-itself', {
  designed: {
    label: 'Field preview',
    detail: 'A collapsed strip down the right of the editor',
  },
}, [
  {
    ux: 'See a field as the engineer will',
    designed: 'Pure UI — nothing to store',
    note: 'The only one of these six that needs no column at all.',
  },
]);
