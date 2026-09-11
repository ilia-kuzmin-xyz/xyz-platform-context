const STAGES = [
    { n: 1, title: '1 · Configure', blurb: 'Set up once per project: the ladder, the types, and which task guards which rung.' },
    { n: 2, title: '2 · Template', blurb: 'Write the task once, version it, and never rewrite answered history.' },
    { n: 3, title: '3 · Register', blurb: 'Put real assets and systems on the project and tie them to the model.' },
    { n: 4, title: '4 · Execute', blurb: 'Answer the task, record the evidence, clear the rung.' },
  ];

  /* ══════════════════════════════════════════════════════════════════════
     MAINTAINING THIS MAP — read before editing anything below.

     WHY IT EXISTS
     The commissioning domain is held in three places at once: the screens
     people use, the Supabase bridge we write today, and the api-v2 schema
     that replaces it. Nobody could hold the mapping in their head, and the
     places where the three disagree were being rediscovered one incident at
     a time. This map is the shared answer.

     THE MODEL — three literals, everything else derives from them
       LAYERS    a way of describing the domain: a set of screens, a store,
                 or a proposal about a store. Order here is the stacking
                 order on a card and the column order in the window.
       TABLES    the column registry: type, primary key, foreign-key target
                 and permitted values, per store layer. Machine-read.
       CONCEPTS  one entry per idea in the domain, with `sheets` (what each
                 layer calls it) and `fields` (the same attribute named in
                 each layer).

     No CSS rule, no function and no markup names a layer. Colour arrives as
     --layer, depth as --depth, both set from LAYERS at build time. If you
     are about to write `if (layer.key === 'api')`, the model is missing a
     property — add the property instead.

     FOUR RULES THAT KEEP IT HONEST
       1. Nothing is typed from memory. Every column name, type, key and
          value set is read from source. See REGENERATING below. A plausible
          column name is worse than a missing one, because it gets believed.
       2. A proposal is a delta, never a copy. Give it `extends: '<layer>'`
          and the added/changed/unchanged reading is computed by diffing.
          Hand-labelled diffs rot silently: the api-v2 status tracker still
          lists five gaps that the DDL closed months ago, and that is exactly
          the failure this rule prevents.
       3. Three states, not two. A cell can hold a value, hold nothing
          deliberately, or be TBD — planned but not yet designed. Collapsing
          TBD into "nothing" states the opposite of what is true.
       4. Provenance or it stays out. A layer that makes claims carries
          `source` naming the document and the date it was read. A layer
          seeded from somebody's recollection is the thing this map exists
          to stop.

     ADDING A LAYER — one edit
     Add an entry to LAYERS. The toggle, the legend chip, the sheet colour,
     the stacking depth and the comparison column all follow. Add a colour
     token to all three palettes (:root, the prefers-color-scheme block, and
     [data-theme="dark"]) if you are introducing a new one. A layer with
     `role: 'surface'` names screens and is excluded from alignment; a layer
     with `role: 'store'` is a place data lives.

     ADDING A PROPOSAL LAYER
       extends:     the layer it proposes changes to (makes it a delta)
       sparse:      true, so it appears only on the concepts it speaks about
       provisional: true, so it draws hatched and never reads as built
       source:      document and date
     Then add `<key>:` entries to the concepts it touches. Anything you do
     not mention shows as unchanged, which is the correct default.

     ADDING OR EDITING A CONCEPT
     `id` is stable and permanent — the window, the saved board layout and
     any link into the map key off it, so renaming `name` is safe but
     renaming `id` loses people's saved positions. `sheets.<layer>.table`
     is what ties the concept to the column registry; without it the window
     cannot resolve types or badges, and the coverage line goes quiet.
     A field row is `{ ux, bridge, api, note }` — one key per layer, so a new
     layer is a new key and never a change of shape.

     REGENERATING THE COLUMN REGISTRY
     `npm run schema`, then `npm run check`. Do not edit data/ by hand.
       ours    the live dev database, over Supabase's Management API. Needs
               SUPABASE_ACCESS_TOKEN (a personal access token — no database
               password). Columns, types, keys and value sets all come from
               pg_catalog, so there is one source and it cannot lag.
       theirs  XYZReality/PostgreSQLDatabase — Database/xyz/Tables for columns
               and primary keys, Database/xyz/Constraints for foreign keys.
               Value sets live in TypeScript: XYZPlatformApi,
               src/types/commissioning.types.ts. No database to read, so this
               is their schema as committed, not as deployed.
     A caution earned the hard way: a foreign key belongs to one table. The
     generated TypeScript lists relationships in a shape that invites applying
     one to every table sharing the column name, which fabricated 39 of them.
     Read constraints from pg_constraint, keyed on conrelid.

     WHAT IS DELIBERATELY NOT HERE
     A proposed-Supabase layer. Its definition is written below, commented
     out, because no written plan exists to seed it from — see rule 4.
     ══════════════════════════════════════════════════════════════════════ */

  /* ─────────────────────────────────────────────────────────── layers
     Add a layer by adding one entry here. The toggles, the sheet
     colours, the stacking order and the comparison columns are all
     derived from this list, so nothing else needs touching. Give a
     speculative layer `provisional: true` and it draws hatched, so a
     proposal never reads as something that already exists. */
  const LAYERS = [
    { key: 'ux', tag: 'UX', label: 'Screens', column: 'On screen', role: 'surface', colour: 'var(--ux)' },
    { key: 'bridge', tag: 'Supa', label: 'Supabase bridge', column: 'Supabase', role: 'store', colour: 'var(--bridge)' },
    { key: 'api', tag: 'Api-v2', label: 'api-v2', column: 'api-v2', role: 'store', colour: 'var(--api)' },

    /* A proposal, not a store. `extends` makes it a delta: added and changed are
       worked out by diffing against that layer, never hand-labelled, so it
       cannot quietly claim a gap that has since been filled. `sparse` keeps it
       off every card it says nothing about. */
    { key: 'apiNext', tag: 'Api-v2 next', label: 'Proposed api-v2', column: 'Proposed', role: 'store',
      colour: 'var(--future)', provisional: true, sparse: true, extends: 'api',
      source: 'Commissioning API status tracker (PAPI-3330), read 9 Sep 2026' },

    /* The same shape for the other direction, once a written plan exists:
      { key: 'bridgeNext', tag: 'Supa next', label: 'Proposed Supabase', column: 'Proposed',
        role: 'store', colour: 'var(--future-2)', provisional: true, sparse: true,
        extends: 'bridge', source: '…' },
       Left out on purpose — nothing is written down for it yet, and a layer
       seeded from memory is the thing this map exists to stop. */
    
    /* A worked example — uncomment to see a fourth sheet appear on every
       card, in the toggles, and as a column in the comparison window:
      { key: 'future', tag: 'Next', label: 'Proposed', column: 'Proposed',
        role: 'store', colour: 'var(--future)', provisional: true },
       then add `future:` to any concept’s sheets and to its field rows. */
  ];

  /* A planned table whose columns nobody has designed yet. Distinct from an
     empty cell, which claims the opposite — that there is deliberately
     nothing there. */
  const TBD = Symbol.for('not specified yet');

  /* ─────────────────────────────────────────────────────────── tables
     The real column lists, read from the live dev schema and from
     PostgreSQLDatabase Database/xyz/Tables. Keyed by layer, so a new
     store layer brings its own set. The window uses these to say how
     much of a table a concept actually accounts for. */
  /* The column registry now lives in data/columns.json, generated by
     tools/build-columns.mjs and loaded ahead of this file as data/columns.js.
     Run `npm run schema` to refresh it, then `npm run check` to confirm the
     concepts below still resolve against it. Never edit the output by hand. */

  /* ───────────────────────────────────────────────────────── concepts
     One entry per concept. `sheets` is what the card shows per layer:
     either a label (plus the table it names) or `absent` with the
     reason. `fields` rows are the same attribute named in each layer —
     a row is just an object keyed by layer, so a new layer is a new
     key and never a change of shape. */
  const CONCEPTS = [
    // ── stage 1
    {
      id: 'workflow',
      stage: 1,
      name: 'Workflow',
      sheets: {
        ux: { label: 'Project Settings → Workflow', detail: 'Creates the Default workflow if the project has none' },
        bridge: { label: 'workflow', table: 'workflow', detail: 'Named sequence of rungs; the oldest acts as the default' },
        api: { label: 'CommissioningWorkflow', table: 'CommissioningWorkflow', detail: 'The workflow a type follows' },
      },
      fields: [
        { ux: 'Workflow name', bridge: 'name', api: 'Name' },
        { ux: 'Description', bridge: 'description' },
      ],
    },
    
    {
      id: 'a-rung-of-the-ladder',
      stage: 1,
      name: 'A rung of the ladder',
      sheets: {
        ux: { label: 'Project Settings → Workflow', detail: 'Lists the rungs in order; the colour is the tag' },
        bridge: { label: 'readiness_step', table: 'readiness_step', detail: 'Name, colour, position. Renamed from `tag` on 11 Aug' },
        api: { label: 'ReadinessGate', table: 'ReadinessGate', detail: 'Ordered checkpoint (GateOrder); colour drives the mobile tag' },
      },
      fields: [
        { ux: 'Rung name', bridge: 'name', api: 'Name' },
        { ux: 'Colour', bridge: 'color', api: 'Colour', note: 'Free in both tables. But the screens draw a fixed ladder — red, yellow, green for assets, blue and white for system requirements — so a rung of any other colour is stored and never shown.' },
        { ux: 'Order in the ladder', bridge: 'position', api: 'GateOrder' },
        { ux: 'Description', bridge: 'description' },
        { ux: 'Belongs to workflow', bridge: 'workflow_id', api: 'CommissioningWorkflowId' },
        { ux: 'Installed', bridge: 'element_task_status', api: 'ElementInstallationStatus', note: 'Shown as a tag but deliberately not a rung: install status belongs to the 3D element, outside the workflow.' },
        { bridge: 'workflow_step.position', note: 'We also order rungs through a join table; api-v2 puts the order on the gate itself.' },
      ],
      note: 'Two ladders are drawn, both fixed in the frontend: red / yellow / green for an asset, blue / white for what a system asks of its members. The table underneath takes any name and colour, so the schema is more general than the screens — by decision, not by accident.',
    },
    
    {
      id: 'asset-type',
      stage: 1,
      name: 'Asset type',
      flag: true,
      sheets: {
        ux: { label: 'Project Settings → Types', detail: 'Opening a type shows its rungs and the tasks on them' },
        bridge: { label: 'asset_type', table: 'asset_type', detail: 'Its workflow_id is what gives every asset of the type a ladder' },
        api: { label: 'AssetType', table: 'AssetType', detail: 'Asset class, tied to a workflow' },
      },
      fields: [
        { ux: 'Type name', bridge: 'name', api: 'Name' },
        { ux: 'Description', bridge: 'description' },
        { ux: 'Workflow — the ladder', bridge: 'workflow_id', api: 'CommissioningWorkflowId', note: 'Nullable for us, NOT NULL for them. Seven dev rows are null, so they cannot migrate as they stand.' },
      ],
      note: 'The single point of failure for the ladder: workflow_id is nullable, and the viewer import leaves it null. Seven such types on dev, all 27 Aug. Live bug.',
    },
    
    {
      id: 'system-type',
      stage: 1,
      name: 'System type',
      sheets: {
        ux: { label: 'Project Settings → Types', detail: 'The system side of the same screen' },
        bridge: { label: 'system_type', table: 'system_type', detail: 'Its own workflow, separate from the asset one' },
        api: { label: 'SystemType', table: 'SystemType', detail: 'System class, tied to a workflow' },
      },
      fields: [
        { ux: 'Type name', bridge: 'name', api: 'Name' },
        { ux: 'Description', bridge: 'description' },
        { ux: 'Workflow', bridge: 'workflow_id', api: 'CommissioningWorkflowId' },
      ],
    },
    
    {
      id: 'task-guarding-a-rung-asset',
      stage: 1,
      name: 'Task guarding a rung — asset',
      sheets: {
        ux: { label: 'Type editor → Add task', detail: 'Pick a rung, pick a template from the library' },
        bridge: { label: 'asset_type_task', table: 'asset_type_task', detail: 'Also workflow_step_task and readiness_task_link, both older' },
        api: { label: 'AssetTypeReadinessGateTask', table: 'AssetTypeReadinessGateTask', detail: 'Template gating a gate, per asset type' },
      },
      fields: [
        { ux: 'Rung', bridge: 'readiness_step_id', api: 'ReadinessGateId' },
        { ux: 'Task template', bridge: 'task_template_id', api: 'CommissioningTaskId' },
        { ux: 'Asset type', bridge: 'asset_type_id', api: 'AssetTypeId' },
        { ux: 'Workflow', bridge: 'workflow_id', api: 'CommissioningWorkflowId' },
        { ux: 'Order shown', bridge: 'position' },
        { ux: 'Bucket', bridge: 'bucket', note: 'Ours separates the asset’s own tasks from what a system asks of it. api-v2 has no bucket.' },
      ],
      note: 'Three bridge tables say roughly this, written at different times. Only asset_type_task is read by the current screens.',
    },
    
    {
      id: 'task-guarding-a-rung-system',
      stage: 1,
      name: 'Task guarding a rung — system',
      sheets: {
        ux: { label: 'Type editor → Add task', detail: 'Includes what the system asks of its member assets' },
        bridge: { label: 'system_type_task', table: 'system_type_task' },
        api: { label: 'SystemTypeReadinessGateTask', table: 'SystemTypeReadinessGateTask', detail: 'Template gating a gate, per system type' },
      },
      fields: [
        { ux: 'Rung', bridge: 'readiness_step_id', api: 'ReadinessGateId' },
        { ux: 'Task template', bridge: 'task_template_id', api: 'CommissioningTaskId' },
        { ux: 'System type', bridge: 'system_type_id', api: 'SystemTypeId' },
        { ux: 'Workflow', bridge: 'workflow_id', api: 'CommissioningWorkflowId' },
        { ux: 'Order shown', bridge: 'position' },
        { ux: 'Bucket', bridge: 'bucket' },
      ],
    },
    
    {
      id: 'which-types-fit-which-systems',
      stage: 1,
      name: 'Which types fit which systems',
      flag: true,
      sheets: {
        ux: { absent: 'No screen — we never ask' },
        bridge: { absent: 'No table — any asset may join any system' },
        api: { label: 'AssetTypeSystemTypeMapping', table: 'AssetTypeSystemTypeMapping', detail: 'Constrains membership by type' },
      },
      fields: [
        { ux: 'Asset type', api: 'AssetTypeId' },
        { ux: 'System type', api: 'SystemTypeId' },
      ],
      note: 'api-v2 constrains membership by type and we do not. Our existing data may not satisfy that constraint at cutover — worth checking before it becomes a migration failure.',
    },
    
    // ── stage 2
    {
      id: 'folder',
      stage: 2,
      name: 'Folder',
      sheets: {
        ux: { label: 'Project Settings → Task library', detail: 'The tree the catalogue is browsed through' },
        bridge: { label: 'task_folder', table: 'task_folder', detail: 'Self-referencing parent_id' },
        api: { label: 'CommissioningTaskFolder', table: 'CommissioningTaskFolder', detail: 'Self-referencing folder tree' },
      },
      fields: [
        { ux: 'Folder name', bridge: 'name', api: 'Name' },
        { ux: 'Parent folder', bridge: 'parent_id', api: 'ParentCommissioningTaskFolderId' },
      ],
    },
    
    {
      id: 'task-definition',
      stage: 2,
      name: 'Task definition',
      sheets: {
        ux: { label: 'Project Settings → Task library', detail: 'Create, edit as a new version, or import from a spreadsheet' },
        bridge: { label: 'task_template', table: 'task_template', detail: 'Name, description, kind, requires_sign_off, current version' },
        api: { label: 'CommissioningTask', table: 'CommissioningTask', detail: 'The task definition' },
        apiNext: { label: 'CommissioningTask + disciplines', detail: 'D9 — disciplines named as missing' },
      },
      fields: [
        { ux: 'Task name', bridge: 'name', api: 'Name' },
        { ux: 'Description', bridge: 'description', api: 'CommissioningTaskVersion.Description', note: 'Ours sits on the task, theirs on the version — so theirs can change per revision.' },
        { ux: 'Kind (Checklist / FPT / IST)', bridge: 'type', api: 'CommissioningTaskType', apiNext: 'CommissioningTaskType + disciplines' },
        { ux: 'Folder', bridge: 'folder_id', api: 'CommissioningTaskFolderId' },
        { ux: 'Needs sign-off', bridge: 'requires_sign_off', api: 'ChecklistItem.ResponseType = SIGNATURE', note: 'Ours is a flag on the task; theirs is an item you answer.' },
        { ux: 'Current version', bridge: 'current_version_id', api: 'CommissioningTaskVersion.IsCurrentVersion', note: 'Ours points at it, theirs flags it. Same fact, opposite direction.' },
        { ux: 'Archived', api: 'IsArchived / ArchivedOn', note: 'No archive on our side — deleting is the only option.' },
        { ux: 'Library template', bridge: 'portfolio_template_id', api: 'CommissioningTaskVersion.IsTemplate', note: 'Theirs is a flag on the version, not on the task.' },
      ],
    },
    
    {
      id: 'version-of-a-task',
      stage: 2,
      name: 'Version of a task',
      sheets: {
        ux: { label: 'Project Settings → Template builder', detail: 'Editing publishes a new version rather than changing the old one' },
        bridge: { label: 'task_template_version', table: 'task_template_version', detail: 'A run pins the version it answered' },
        api: { label: 'CommissioningTaskVersion', table: 'CommissioningTaskVersion', detail: 'One revision of a task' },
      },
      fields: [
        { ux: 'Version', bridge: 'version', api: 'VersionName', note: 'Ours an integer, theirs free text.' },
        { ux: 'Change note', bridge: 'change_note' },
        { ux: 'Required signatures', bridge: 'signing_slots', api: 'ChecklistItem.Config', note: 'Both model this. Ours per version as signing_slots; theirs inside a signature item’s Config, as required and witnessRequired.' },
        { ux: 'Is current', bridge: 'task_template.current_version_id', api: 'IsCurrentVersion' },
        { ux: 'Description', bridge: 'task_template.description', api: 'Description' },
      ],
      note: 'The reason re-wording a template never rewrites answered history.',
    },
    
    {
      id: 'section-of-a-task',
      stage: 2,
      name: 'Section of a task',
      flag: true,
      sheets: {
        ux: { label: 'Project Settings → Template builder → Task settings', detail: 'The Preconditions switch; the runner gates the steps behind them' },
        bridge: { label: 'task_item.section_type', table: 'task_item', detail: 'A header row carrying PRECONDITIONS or TEST_STEPS' },
        api: { label: 'CommissioningTaskVersionHeader', table: 'CommissioningTaskVersionHeader', detail: 'A real header row: nestable, sort order, assignee' },
      },
      fields: [
        { ux: 'Section name', bridge: 'task_item.label', api: 'HeaderTitle' },
        { ux: 'Which section', bridge: 'task_item.section_type', api: 'SectionType', note: 'Same four values — PRECONDITIONS, TEST_STEPS, DETAILS, OVERVIEW. Ours is a column on a fake header row; theirs is a real table.' },
        { ux: 'Order', bridge: 'task_item.position', api: 'SortOrder' },
        { ux: 'Nested under', bridge: 'task_item.parent_task_item_id', api: 'ParentCommissioningTaskVersionHeaderId' },
        { ux: 'Assigned to', bridge: 'task_item.assigned_to', api: 'AssignedTo' },
      ],
      note: 'We fake a header with a row in the item list. api-v2 gives it its own table, with nesting and an assignee we have nowhere to put.',
    },
    
    {
      id: 'the-question-itself',
      stage: 2,
      name: 'The question itself',
      flag: true,
      sheets: {
        ux: { label: 'Project Settings → Template builder', detail: 'Added from the element palette' },
        bridge: { label: 'task_item', table: 'task_item', detail: 'type, label, must_pass, allow_na, unit, and the declared shape of a reading or a grid' },
        api: { label: 'ChecklistItem', table: 'ChecklistItem', detail: 'Response type plus a jsonb Config — the unit lives in there' },
      },
      fields: [
        { ux: 'Prompt', bridge: 'label', api: 'Title' },
        { ux: 'Help text', api: 'Description' },
        { ux: 'Answer type', bridge: 'type', api: 'ResponseType' },
        { ux: 'Must pass', bridge: 'must_pass', api: 'Config.required' },
        { ux: 'Allow N/A', bridge: 'allow_na', api: 'Config.allowNA' },
        { ux: 'Unit', bridge: 'unit', api: 'Config.values[].unit' },
        { ux: 'Declared value slots', bridge: 'value_fields', api: 'Config.values', note: 'Landed 10 Sep. A reading item declares named slots — id, name, Number or Text, unit, min and max — as jsonb, the shape signing_slots already used. Until then the builder could author one and the execution RPC rejected it.' },
        { ux: 'Min / max', bridge: 'value_fields', api: 'Config.values[].min / Config.values[].max', note: 'Both sides can bound a reading now; ours arrived inside value_fields on 10 Sep.' },
        { ux: 'Table columns and cells', bridge: 'table_columns / table_cells', api: 'Config.columns', note: 'Landed 11 Sep, following the same pattern: a grid declares its headers and starting cells as jsonb. api-v2 pairs Config.columns with a rowCount rather than storing the cells.' },
        { ux: 'Evidence required', bridge: 'evidence_required', api: 'Config.acceptedFiles' },
      ],
      note: 'api-v2 treats a question as reusable across tasks; ours belongs to one version. Their whole Config is one jsonb blob; ours is spread across unit, value_fields, table_columns and table_cells — the same facts, held in four columns rather than one document.',
    },
    
    {
      id: 'where-the-question-sits',
      stage: 2,
      name: 'Where the question sits',
      flag: true,
      sheets: {
        ux: { label: 'Project Settings → Template builder', detail: 'Drag to reorder, nest under a group' },
        bridge: { label: 'task_item.sort_order', table: 'task_item', detail: 'Same row as the question — order and identity are one thing' },
        api: { label: 'CommissioningTaskVersionItem', table: 'CommissioningTaskVersionItem', detail: 'Places a reusable question under a header at a sort order' },
      },
      fields: [
        { ux: 'Order', bridge: 'task_item.position', api: 'SortOrder' },
        { ux: 'Under which section', bridge: 'task_item.section_type', api: 'CommissioningTaskVersionHeaderId', note: 'Ours by section name, theirs by a real header id.' },
        { ux: 'Which question', bridge: 'task_item (the same row)', api: 'ChecklistItemId', note: 'Ours is one row that is both the question and its placement; theirs links to a question shared across tasks.' },
        { ux: 'Which version', bridge: 'task_item.task_template_version_id', api: 'CommissioningTaskVersionId' },
      ],
      note: 'The third api-v2 table our one task_item stands in for. Splitting it is the biggest single piece of the cutover.',
    },
    
    // ── stage 3
    {
      id: 'asset',
      stage: 3,
      name: 'Asset',
      flag: true,
      sheets: {
        ux: { label: 'Asset register import · Viewer import', detail: 'Two importers, and they do not agree' },
        bridge: { label: 'asset', table: 'asset', detail: 'Name, type, serial, location, critical' },
        api: { label: 'Asset', table: 'Asset', detail: 'The asset, under its type' },
      },
      fields: [
        { ux: 'Name', bridge: 'name', api: 'Name' },
        { ux: 'Asset type', bridge: 'asset_type_id', api: 'AssetTypeId' },
        { ux: 'Serial number', bridge: 'serial_number', api: 'SerialNumber' },
        { ux: 'Manufacturer', bridge: 'manufacturer', api: 'Manufacturer' },
        { ux: 'Model number', bridge: 'model_number', api: 'ModelNumber' },
        { ux: 'Location', bridge: 'location', api: 'Location' },
        { ux: 'Critical', bridge: 'critical', api: 'IsCritical' },
        { ux: 'Drawing number', bridge: 'drawing_number', note: 'Import columns with no api-v2 home yet.' },
        { ux: 'System label', bridge: 'system_label' },
        { ux: 'Parent asset', api: 'ParentAssetId', note: 'They nest assets; we do not.' },
      ],
      note: 'Project Settings import gives new types the project workflow; the viewer import does not. Same screen family, two behaviours, one missing ladder.',
    },
    
    {
      id: 'system',
      stage: 3,
      name: 'System',
      sheets: {
        ux: { label: 'Viewer → Systems panel', detail: 'Systems and their members, optionally nested' },
        bridge: { label: 'system', table: 'system', detail: 'parent_id for nesting' },
        api: { label: 'CommissioningSystem', table: 'CommissioningSystem', detail: 'The system, under its type' },
      },
      fields: [
        { ux: 'Name', bridge: 'name', api: 'Name' },
        { ux: 'System type', bridge: 'system_type_id', api: 'SystemTypeId' },
        { ux: 'Parent system', bridge: 'parent_id', api: 'ParentCommissioningSystemId' },
        { ux: 'Critical', bridge: 'critical', api: 'IsCritical' },
      ],
    },
    
    {
      id: 'asset-inside-a-system',
      stage: 3,
      name: 'Asset inside a system',
      sheets: {
        ux: { label: 'Viewer → Systems panel', detail: 'Add or remove members' },
        bridge: { label: 'asset_system_membership', table: 'asset_system_membership', detail: 'Records when it joined and when it left' },
        api: { label: 'AssetSystemMapping', table: 'AssetSystemMapping', detail: 'Asset-to-system placement' },
      },
      fields: [
        { ux: 'Asset', bridge: 'asset_id', api: 'AssetId' },
        { ux: 'System', bridge: 'system_id', api: 'CommissioningSystemId' },
        { ux: 'Joined', bridge: 'joined_at / member_from' },
        { ux: 'Left', bridge: 'member_to', note: 'They soft-delete the mapping instead of dating it out.' },
        { ux: 'Deleted', bridge: 'is_deleted / deleted_at / deleted_by', api: 'IsDeleted / DeletedOn / DeletedBy' },
      ],
    },
    
    {
      id: 'link-to-the-3d-model',
      stage: 3,
      name: 'Link to the 3D model',
      flag: true,
      sheets: {
        ux: { label: 'Viewer → Assets panel', detail: 'Link an asset to an element; unique per asset, so relinking reassigns' },
        bridge: { label: 'asset_element_link', table: 'asset_element_link', detail: 'Also system_element_link, for systems' },
        api: { absent: 'No table — the platform does not model this' },
      },
      fields: [
        { ux: 'Linked element', bridge: 'element_id', note: 'api-v2 keys installation to a ModelElementId but has no asset-to-element table.' },
        { ux: 'Asset', bridge: 'asset_id' },
        { ux: 'Confirmed by', bridge: 'confirmed_by' },
      ],
      note: 'The 3D link is a viewer concept api-v2 has no place for. Either it grows one, or this stays behind in Supabase after everything else moves.',
    },
    
    {
      id: 'installed',
      stage: 3,
      name: 'Installed',
      flag: true,
      sheets: {
        ux: { label: 'Viewer → Assets panel', detail: 'Mark as installed works off the element id, with nothing selected in 3D' },
        bridge: { label: 'element_task_status', table: 'element_task_status', detail: 'Status per element and template' },
        api: { label: 'ElementInstallationStatus', table: 'ElementInstallationStatus', detail: 'Predates commissioning; status per model element' },
      },
      fields: [
        { ux: 'Element', bridge: 'element_id', api: 'ModelElementId' },
        { ux: 'Status', bridge: 'status', api: 'InstallationStatus' },
        { ux: 'Updated', bridge: 'updated_at', api: 'LastModifiedOn' },
        { ux: 'Per task template', bridge: 'task_template_id', note: 'We key status per element and template; they key it per element only.' },
        { ux: 'Planned status', api: 'PlanStatus' },
        { ux: 'Check date', api: 'InstallationCheckDate' },
        { ux: 'Modified from', api: 'LastModifiedFrom', note: 'Which app wrote it — Holosite, Platform.' },
      ],
      note: 'Installed is an element-level flag, not an asset one, which is why marking it needs no 3D selection. api-v2 already has this table — but it keys status per element only, where we key it per element and template, and it carries a planned status and a check date we do not.',
    },
    
    // ── stage 4
    {
      id: 'work-required',
      stage: 4,
      name: 'Work required',
      sheets: {
        ux: { label: 'Viewer → Tasks panel', detail: 'The list of what this asset still owes' },
        bridge: { label: 'task_instance', table: 'task_instance', detail: 'This template, on this asset, gating this rung' },
        api: { label: 'AssetTask', table: 'AssetTask', detail: 'A task assigned to an asset, with a status' },
        apiNext: { label: 'System-level tasks and readiness', detail: 'D6 — named as absent; no table proposed yet' },
      },
      fields: [
        { ux: 'Task', bridge: 'task_template_id', api: 'CommissioningTaskId' },
        { ux: 'Asset', bridge: 'asset_id', api: 'AssetId' },
        { ux: 'System', bridge: 'system_id', note: 'We put tasks on systems too. api-v2 has assets only.', apiNext: 'system-level task' },
        { ux: 'Rung it gates', bridge: 'readiness_step_id', note: 'They reach the gate through AssetTypeReadinessGateTask rather than storing it here.' },
        { ux: 'Status', bridge: 'status', api: 'Status' },
        { ux: 'Assignee', bridge: 'assignee', api: 'AssignedTo' },
        { ux: 'Due date', api: 'DueDate' },
        { ux: 'Assigned when / by', api: 'AssignedOn / AssignedBy' },
        { ux: 'Blocked reason', bridge: 'blocked_reason' },
        { ux: 'Schedule activity', api: 'ActivityId', note: 'Their task can hang off a programme activity.' },
        { ux: 'Version pinned', bridge: 'task_template_version_id' },
      ],
    },
    
    {
      id: 'one-run-of-a-task',
      stage: 4,
      name: 'One run of a task',
      sheets: {
        ux: { label: 'Task runner', detail: 'Preconditions, grouped items, readings, verdict' },
        bridge: { label: 'task_execution', table: 'task_execution', detail: 'Sequence, outcome, who, started, finished' },
        api: { label: 'AssetTaskExecution', table: 'AssetTaskExecution', detail: 'IN_PROGRESS → PENDING_SIGN_OFF → COMPLETED / FAILED / BLOCKED' },
      },
      fields: [
        { ux: 'Attempt', bridge: 'sequence', note: 'They order runs by InsertedOn instead.' },
        { ux: 'Version answered', bridge: 'task_template_version_id', api: 'CommissioningTaskVersionId' },
        { ux: 'Started', bridge: 'started_at', api: 'StartedOn' },
        { ux: 'Finished', bridge: 'completed_at', api: 'FinishedOn' },
        { ux: 'Outcome', bridge: 'outcome', api: 'Status', note: 'Their set is richer: PASS, PASS_WITH_COMMENTS, FAILED, BLOCKED, plus PENDING_SIGN_OFF.' },
        { ux: 'Abandoned', bridge: 'aborted_at / aborted_by', api: 'Status = ABORTED', note: 'Added 10 Sep. A run can now be abandoned and restarted rather than left open, which is what api-v2 already meant by ABORTED — a gap that closed itself.' },
        { ux: 'Overall comment', bridge: 'outcome_note', api: 'TaskExecutionComment.Comment' },
        { ux: 'Who ran it', bridge: 'executed_by', api: 'CreatedBy' },
        { ux: 'Failed items', bridge: 'failed_item_count' },
        { ux: 'Questions as answered', bridge: 'definition_snapshot / definition_sha256', note: 'We freeze the wording. They do not need to: a ChecklistItem is immutable, so editing one creates a new row.' },
      ],
      note: 'A finished run is frozen; a re-run adds another. Both sides agree on this.',
    },
    
    {
      id: 'an-answer',
      stage: 4,
      name: 'An answer',
      sheets: {
        ux: { label: 'Task runner', detail: 'Pass / fail / N-A, a reading, a value' },
        bridge: { label: 'task_execution_item', table: 'task_execution_item', detail: 'response, value, evidence_ref, who, when' },
        api: { label: 'TaskExecutionChecklistResponse', table: 'TaskExecutionChecklistResponse', detail: 'One jsonb payload shaped by the response type' },
      },
      fields: [
        { ux: 'Answer', bridge: 'response / answer_json', api: 'Response (jsonb)', note: 'Ours in columns, theirs one payload shaped by the question’s ResponseType.' },
        { ux: 'Reading', bridge: 'value', api: 'Response.values[].value' },
        { ux: 'Note', bridge: 'note', api: 'TaskExecutionComment', note: 'Ours belongs to the item; theirs to the whole run.' },
        { ux: 'Evidence', bridge: 'evidence_ref', api: 'Response.fileReferenceIds' },
        { ux: 'Who / when', bridge: 'answered_by / answered_at', api: 'CreatedBy / InsertedOn' },
        { ux: 'Which question', bridge: 'definition_item_id', api: 'CommissioningTaskVersionItemId' },
        { ux: 'Must pass', bridge: 'must_pass', api: 'ChecklistItem Config.required' },
        { ux: 'Prompt as shown', bridge: 'label', note: 'Copied at answer time on our side.' },
      ],
      note: 'We answer in columns, api-v2 answers in jsonb. Translatable, but not a straight column mapping.',
    },
    
    {
      id: 'a-note-against-an-answer',
      stage: 4,
      name: 'A note against an answer',
      flag: true,
      sheets: {
        ux: { label: 'Task runner → Add note', detail: 'A note on the item you are answering' },
        bridge: { label: 'task_execution_item.note', table: 'task_execution_item', detail: 'Added 3 Sep with the runner' },
        api: { label: 'TaskExecutionComment', table: 'TaskExecutionComment', detail: 'Belongs to the whole run, not to an item' },
        apiNext: { label: 'TaskExecutionComment + item link', detail: 'Tracker: “consider linking to CommissioningTaskVersionItemId”' },
      },
      fields: [
        { ux: 'Note', bridge: 'task_execution_item.note', api: 'TaskExecutionComment.Comment', apiNext: 'TaskExecutionComment.Comment' },
        { ux: 'Which item', bridge: 'the same row', note: 'Their comment has no item link, so the connection is lost. The tracker already proposes the fix: link the comment to CommissioningTaskVersionItemId. Worth saying yes to before it is built the other way.', apiNext: 'CommissioningTaskVersionItemId' },
        { ux: 'Who / when', bridge: 'answered_by / answered_at', api: 'CreatedBy / InsertedOn' },
      ],
      note: 'The nearest thing api-v2 has, but it hangs off the run — so which item the note was about is lost.',
    },
    
    {
      id: 'sign-off',
      stage: 4,
      name: 'Sign-off',
      flag: true,
      sheets: {
        ux: { label: 'Task runner → Sign off', detail: 'Name, capacity, date, drawn signature' },
        bridge: { label: 'task_execution_signature', table: 'task_execution_signature', detail: 'Who signed, in what capacity, when' },
        api: { label: 'ChecklistItem, ResponseType SIGNATURE', table: 'TaskExecutionChecklistResponse', detail: 'A signature is a question you answer, not a table' },
        apiNext: { label: 'CommissioningTask + witness / prepared roles', detail: 'D9 — roles named as missing from the schema' },
      },
      fields: [
        { ux: 'Signatory', bridge: 'signatory_name', api: 'Response.signedBy' },
        { ux: 'Role or capacity', bridge: 'role', note: 'No capacity in their payload.', apiNext: 'witness / prepared role' },
        { ux: 'Signed at', bridge: 'signed_at', api: 'Response.signedOn' },
        { ux: 'Signature image', bridge: 'signature_ref', api: 'Response (file reference)' },
        { ux: 'Which party', bridge: 'party_key' },
        { ux: 'Witness', api: 'ChecklistItem.Config / Response.witnessedBy', note: 'They model a witness; we do not.' },
        { ux: 'Which signatures are required', bridge: 'task_template_version.signing_slots', api: 'ChecklistItem.Config', apiNext: 'witness / prepared role' },
      ],
      note: 'api-v2 has no signature table because a signature is a checklist item: Config carries required and witnessRequired, and the answer carries signedBy, signedOn and witnessedBy. So a signature has a home — but our role, party and drawn image do not, and they model a witness we never ask for.',
    },
    
    {
      id: 'rung-cleared-or-overridden',
      stage: 4,
      name: 'Rung cleared, or overridden',
      flag: true,
      sheets: {
        ux: { label: 'Readiness ladder · Override', detail: 'Override needs a reason and cascades down the rungs' },
        bridge: { label: 'asset_readiness', table: 'asset_readiness', detail: 'achieved, overridden, reason, and who and when' },
        api: { label: 'AssetReadiness', table: 'AssetReadiness', detail: 'IsAchieved, IsOverridden, OverrideReason' },
        apiNext: { label: 'AssetReadiness + progress rollup', detail: 'Per-gate counts and a percentage, computed not stored' },
      },
      fields: [
        { ux: 'Achieved', bridge: 'is_achieved', api: 'IsAchieved', apiNext: 'IsAchieved + progress rollup' },
        { ux: 'Achieved on', bridge: 'achieved_on', api: 'AchievedOn' },
        { ux: 'Overridden', bridge: 'is_overridden', api: 'IsOverridden' },
        { ux: 'Reason', bridge: 'override_reason', api: 'OverrideReason' },
        { ux: 'Who / when', bridge: 'modified_by / modified_at', api: 'LastModifiedBy / LastModifiedOn', note: 'Neither side has a dedicated overridden-by; both stamp the last modifier.' },
        { ux: 'Asset', bridge: 'asset_id', api: 'AssetId' },
        { ux: 'Rung', bridge: 'readiness_step_id', api: 'ReadinessGateId' },
        { api: 'AssetTypeId / CommissioningWorkflowId', note: 'Carried so a composite key proves the gate belongs to the type’s own workflow.' },
      ],
      note: 'Neither side has a dedicated overridden-by or overridden-on: both stamp the last modifier (ours modified_by / modified_at, theirs LastModifiedBy / LastModifiedOn). Good enough for the date-time the design puts on the tag, as long as nothing else touches the row afterwards.',
    },
    
    {
      id: 'audit-trail',
      stage: 4,
      name: 'Audit trail',
      sheets: {
        ux: { absent: 'No screen yet — written, never shown' },
        bridge: { label: 'activity_log_entry', table: 'activity_log_entry', detail: 'Actor, verb, subject, reason, detail. Append-only' },
        api: { label: 'AssetTaskStatusHistory', table: 'AssetTaskStatusHistory', detail: 'Append-only record of every status a task moved through' },
      },
      fields: [
        { ux: 'Who', bridge: 'actor', api: 'CreatedBy' },
        { ux: 'What happened', bridge: 'verb', api: 'Status', note: 'Ours records any verb; theirs records the status moved to.' },
        { ux: 'About what', bridge: 'subject_kind / subject_id', api: 'AssetTaskId', note: 'Ours any subject; theirs tasks only.' },
        { ux: 'Reason', bridge: 'reason' },
        { ux: 'Detail', bridge: 'detail' },
        { ux: 'When', bridge: 'at', api: 'InsertedOn' },
      ],
      note: 'Ours logs any action; theirs logs status changes only. Ours is the broader shape.',
    },
    
    {
      id: 'issue-raised-during-a-run',
      stage: 4,
      name: 'Issue raised during a run',
      flag: true,
      sheets: {
        ux: { absent: 'No screen — not built' },
        bridge: { absent: 'No table — not built' },
        api: { label: 'TaskExecutionIssue', table: 'TaskExecutionIssue', detail: 'Links a run to an Issue' },
      },
      fields: [
        { ux: 'Run', api: 'AssetTaskExecutionId' },
        { ux: 'Issue', api: 'IssueId' },
      ],
      note: 'Raising an issue off a failed task exists in api-v2 and nowhere on our side. A feature we owe, not a mapping problem.',
    },
    
    {
      id: 'evidence-file',
      stage: 4,
      name: 'Evidence file',
      flag: true,
      sheets: {
        ux: { label: 'Task runner → Evidence', detail: 'Mobile attaches; web only stores a reference' },
        bridge: { label: 'commissioning_file', table: 'commissioning_file', detail: 'A reference to a file held in XYZ Platform, never the bytes. Merged 8 Sep' },
        api: { label: 'CommissioningTaskFileReferenceMapping', table: 'CommissioningTaskFileReferenceMapping', detail: 'Landed 11 Sep — a file reference attached to a task definition' },
        apiNext: { label: 'AssetDocument · CommissioningSystemDocument', detail: 'D11 — two of the three link tables are still named only' },
      },
      fields: [
        { ux: 'File name', bridge: 'file_name', apiNext: TBD },
        { ux: 'Type / size', bridge: 'file_type / file_size_bytes', apiNext: TBD },
        { ux: 'Platform reference', bridge: 'file_reference_id', api: 'TaskExecutionChecklistResponse.Response', note: 'Both point at a file held in XYZ Platform rather than storing bytes. The three api-v2 link tables are named but undesigned, so our file model is ahead of theirs and could shape it.', apiNext: TBD },
        { ux: 'Checksum', bridge: 'sha256', apiNext: TBD },
        { ux: 'Checksum trusted from', bridge: 'sha256_provenance / size_provenance', apiNext: TBD, note: 'Whether the client confirmed the bytes or the platform merely reported them — the difference between evidence and hearsay.' },
        { ux: 'Discarded', bridge: 'discarded_at / discarded_by', apiNext: TBD, note: 'Added 10 Sep. A registration whose upload never completed can be discarded instead of lingering as a reference to nothing.' },
        { ux: 'Attached to', bridge: 'commissioning_file_association', note: 'Ours can attach a file to a run, an item, a signature or an asset.', apiNext: 'AssetDocument / …VersionDocument / …SystemDocument' },
      ],
      note: 'Merged and not yet in use. Mobile needs a bucket and a whole-project download endpoint; neither is decided.',
    },
    
    {
      id: 'offline-submit',
      stage: 4,
      name: 'Offline submit',
      flag: true,
      sheets: {
        ux: { label: 'Mobile app', detail: 'A whole run, captured offline, sent once' },
        bridge: { label: 'commissioning_apply_operation_v1()', detail: 'With a receipt table, so a retry returns the first answer' },
        api: { absent: 'No equivalent — this exists because the bridge does' },
      },
      fields: [
        { ux: 'Operation id', bridge: 'commissioning_operation_receipt.operation_id' },
        { ux: 'Request / answer kept', bridge: 'commissioning_operation_receipt.request / commissioning_operation_receipt.response', note: 'So a mobile retry gets the first answer back instead of doing the work twice.' },
        { ux: 'Written by protocol', bridge: 'task_execution.write_protocol' },
        { ux: 'Lifecycle revision', bridge: 'task_instance.lifecycle_revision' },
      ],
      note: 'Once this touches a task, triggers refuse every direct write to it — so web can no longer save that task. Web adopts the same function, or mobile stays off shared tasks.',
    },
    
  ];
