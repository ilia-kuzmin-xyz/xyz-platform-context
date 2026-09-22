/**
 * Regenerates the column registry — `npm run schema`.
 *
 * Reads both stores from source and writes data/columns.json (canonical, for
 * tooling and diffs) plus data/columns.js (the same object as a script tag, so
 * the page gets it synchronously). One run writes both, so they cannot drift.
 *
 * Sources
 *   ours    the live dev database, over the Management API — columns, types,
 *           keys and permitted values all from the one place. Needs
 *           SUPABASE_ACCESS_TOKEN; see tools/supabase-schema.mjs.
 *   theirs  PostgreSQLDatabase's DDL and constraint files, fetched with `gh`
 *           and cached under tools/.cache, plus the value sets api-v2 keeps in
 *           TypeScript rather than in CHECK constraints. There is no database
 *           to read, so this is their schema as committed, not as deployed.
 *
 * Nothing here is hand-maintained. If a number in the page disagrees with the
 * database, re-run this rather than editing the output.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readSupabase, reuseVerifiedBridge } from './supabase-schema.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, ''));
const ROOT = path.join(HERE, '..');
const CACHE = path.join(HERE, '.cache');

const DEV_PROJECT = process.env.SUPABASE_PROJECT_ID ?? 'ohmzwpcilvxpozljllle';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const API_REPO = 'XYZReality/PostgreSQLDatabase';
const API_TABLES = [
  '115_xyz_element_install_status', '116_xyz_commissioning_workflow', '117_xyz_readiness_gate',
  '118_xyz_asset_type', '119_xyz_system_type', '120_xyz_asset_type_system_type_map',
  '121_xyz_commissioning_task', '122_xyz_asset_type_readiness_gate_task',
  '123_xyz_system_type_readiness_gate_task', '124_xyz_commissioning_task_folder',
  '125_xyz_commissioning_task_version', '126_xyz_checklist_item',
  '127_xyz_commissioning_task_version_header', '128_xyz_commissioning_task_version_item',
  '129_xyz_asset', '130_xyz_commissioning_system', '131_xyz_asset_system_map',
  '133_xyz_asset_task', '134_xyz_asset_task_status_history', '135_xyz_asset_readiness',
  '136_xyz_asset_task_execution', '137_xyz_task_execution_checklist_response',
  '138_xyz_task_execution_comment', '139_xyz_task_execution_issue',
  // Adds ReadinessGate.Colour — omit it and the rung concept loses its colour.
  '142_xyz_readiness_gate_metadata',
  '143_xyz_commissioning_task_file_reference_mapping',
  // Version-scoped media, the counterpart to 143's task-level reference material:
  // api-v2 splits what our commissioning_file_association keeps in one table.
  '144_xyz_commissioning_task_version_file_reference_mapping',
  // Two more owners, two more tables (16 Sep). Ours are the asset_id and
  // system_id branches of the one association, so this pair costs us nothing
  // and costs them a table each — the clearest illustration on the map of how
  // the two file models diverge.
  '145_xyz_asset_file_reference_mapping',
  '146_xyz_commissioning_system_file_reference_mapping',
  // Their activity log (22 Sep), against our activity_log_entry.
  '147_xyz_commissioning_audit_event',
  // Readiness for a system, "with AssetReadiness parity" (21 Sep) — the parity
  // our system_readiness has had all along.
  '147_xyz_system_readiness',
];
const API_CONSTRAINTS = [
  '064_xyz_commissioning_workflow', '065_xyz_readiness_gate', '066_xyz_asset_type',
  '067_xyz_system_type', '068_xyz_asset_type_system_type_mapping', '069_xyz_commissioning_task',
  '070_xyz_asset_type_readiness_gate_task', '071_xyz_system_type_readiness_gate_task',
  '072_xyz_commissioning_task_folder', '073_xyz_commissioning_task_version',
  '074_xyz_checklist_item', '075_xyz_commissioning_task_version_header',
  '076_xyz_commissioning_task_version_item', '077_xyz_asset', '078_xyz_commissioning_system',
  '079_xyz_asset_system_mapping', '082_xyz_asset_readiness', '083_xyz_asset_task',
  '084_xyz_asset_task_execution', '085_xyz_task_execution_checklist_response',
  '086_xyz_task_execution_comment', '087_xyz_task_execution_issue',
  '088_xyz_asset_task_status_history',
  '101_xyz_commissioning_task_file_reference_mapping',
  '102_xyz_commissioning_task_version_file_reference_mapping',
  // A SECOND constraints file for AssetTaskExecution, alongside 084 — api-v2's
  // own note explains why 084 cannot be edited. Both have to be read or the
  // execution-lineage foreign key is invisible here.
  '103_xyz_asset_task_execution_lineage',
  '104_xyz_asset_file_reference_mapping',
  '105_xyz_commissioning_system_file_reference_mapping',
  '107_xyz_system_readiness',
  '108_xyz_commissioning_audit_event',
];

/* ElementInstallationStatus predates commissioning, so it is created in the
   model-redesign migration alongside many unrelated tables. Only that one is
   wanted here. */
const API_EXTRA = [{ file: '030_xyz_b_model_redesign', only: ['ElementInstallationStatus'] }];

/* Constraints files in range that were looked at and left out. Only FOREIGN
   KEYs are read out of this folder, so a file that adds none changes nothing
   here however relevant its table is. */
const API_CONSTRAINTS_IGNORED = {
  '060_xyz_activity_progress_alter': 'progress, not commissioning',
  '061_xyz_activity_progress_history_alter': 'progress, not commissioning',
  '062_xyz_portfolio_alter': 'portfolio, not commissioning',
  '063_xyz_exchange_rate_alter': 'exchange rates, not commissioning',
  '080_xyz_model_element_asset': 'hangs ModelElement off Asset — the model side, which this map does not draw',
  '081_xyz_commissioning_workflow_name_unique': 'a unique key; no foreign key to read',
  '082_xyz_system_type_name_unique': 'a unique key; no foreign key to read',
  '089_xyz_issue_comment': 'issues',
  '090_xyz_check_list': 'the retired checklist tables',
  '092_xyz_readiness_gate_metadata': 'drops two checks on ReadinessGate; no foreign key to read',
  '093_xyz_readiness_gate_unique': 'a unique key; no foreign key to read',
  '094_xyz_commissioning_task_unique': 'a unique key; no foreign key to read',
  '095_xyz_asset_system_mapping_unique': 'a unique key; no foreign key to read',
  // These two are the only place api-v2 states a commissioning value set in the
  // database rather than in TypeScript. Both agree with API_VALUES below, which
  // is why nothing is read from them — but they are the file to check first if
  // a value set on the map ever looks wrong.
  '095_xyz_commissioning_task_version_header_section_type_constraint':
    'a CHECK on SectionType matching the set API_VALUES already carries',
  '096_xyz_commissioning_task_type': 'a CHECK on CommissioningTaskType matching the set API_VALUES already carries',
  '097_xyz_asset_name_case_insensitive': 'a unique key; no foreign key to read',
  '098_xyz_asset_type_name_case_insensitive': 'a unique key; no foreign key to read',
  '099_xyz_commissioning_system_name_case_insensitive': 'a unique key; no foreign key to read',
  '100_xyz_system_type_name_case_insensitive': 'a unique key; no foreign key to read',
  '106_xyz_commissioning_system': 'a unique key backing 105\'s file mapping; no foreign key to read',
};

/* Files in the same numeric range that were looked at and left out. Recorded
   so the audit below stays quiet until something genuinely new appears — a
   warning that fires on every run is one nobody reads. */
const API_IGNORED = {
  '115_xyz_model_alter': 'model, not commissioning',
  '115_xyz_room_capture_point': 'capture points',
  '132_xyz_model_element_alter': 'model elements',
  '140_xyz_issue_comment_alter': 'issues',
  '142_xyz_drop_check_list': 'a cleanup, creates nothing',
};

/** api-v2's value sets live in TypeScript enums, not in CHECK constraints. */
const API_VALUES = {
  'CommissioningTaskVersionHeader.SectionType': ['PRECONDITIONS', 'TEST_STEPS', 'DETAILS', 'OVERVIEW'],
  'CommissioningTask.CommissioningTaskType': ['CHECKLIST', 'FPT', 'IST'],
  'CommissioningTaskVersion.CommissioningTaskType': ['CHECKLIST', 'FPT', 'IST'],
  'AssetTask.Status': ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'BLOCKED'],
  'AssetTaskStatusHistory.Status': ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'BLOCKED'],
  'AssetTaskExecution.Status': ['IN_PROGRESS', 'PENDING_SIGN_OFF', 'PASS', 'PASS_WITH_COMMENTS', 'FAILED', 'BLOCKED', 'ABORTED'],
  'ChecklistItem.ResponseType': ['PASS_FAIL_NA', 'FILE_UPLOAD', 'TABLE', 'STATIC_TEXT', 'VALUES', 'SIGNATURE'],
};

const out = { bridge: {}, api: {} };

/* ─────────────────────────────────────────────────────── ours: live schema */
if (TOKEN) {
  console.log(`  reading the live dev schema (project ${DEV_PROJECT})…`);
  out.bridge = readSupabase(DEV_PROJECT, TOKEN);
} else {
  /* No token: reuse the stored bridge block, but only once `gen types` has
     confirmed table for table and column for column that it still matches the
     database. Refuses rather than guessing, so this can never quietly publish
     a stale half. api-v2 moves on its own schedule and is read from `gh`, so
     most refreshes need nothing from Supabase but this check. */
  const previous = path.join(ROOT, 'data', 'columns.json');
  if (!fs.existsSync(previous)) {
    console.error('\n  SUPABASE_ACCESS_TOKEN is not set, and there is no previous');
    console.error('  data/columns.json to verify and reuse. Create a token at');
    console.error('  supabase.com/dashboard/account/tokens and export it.\n');
    process.exit(1);
  }
  console.log('  no token — verifying the stored dev schema against the CLI…');
  out.bridge = reuseVerifiedBridge(DEV_PROJECT, JSON.parse(fs.readFileSync(previous, 'utf8')).bridge);
  console.log('  stored dev schema confirmed current; reused unchanged');
}

/* ───────────────────────────────────────────── theirs: DDL and constraints */
function apiFile(kind, name) {
  const dir = path.join(CACHE, kind);
  const file = path.join(dir, `${name}.sql`);
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  const folder = kind === 'tables' ? 'Tables' : 'Constraints';
  const suffix = kind === 'tables' ? '' : '_constraints';
  const body = execFileSync('gh',
    ['api', `repos/${API_REPO}/contents/Database/xyz/${folder}/${name}${suffix}.sql`, '--jq', '.content'],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const sql = Buffer.from(body.trim(), 'base64').toString('utf8');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, sql);
  return sql;
}

/**
 * Names every DDL file in the commissioning range that the lists above do not
 * mention — in BOTH folders.
 *
 * The lists are curated on purpose — the same numeric range holds model,
 * issue and cleanup migrations that are not commissioning tables, so pulling
 * the range in wholesale would put unrelated api-v2 tables on the map. But
 * curation fails silently: PAPI-3919 added CommissioningTaskFileReferenceMapping
 * and the map went on saying api-v2 had no file table at all, because nothing
 * looked. This looks, and refuses to be quiet about it.
 *
 * Constraints are audited for the same reason, and because they failed the same
 * way once already: PAPI-3752's lineage constraints arrived in their own file
 * while this checked only Tables, so the new column was picked up and the
 * foreign key that gives it its meaning was not. A table's constraints are not
 * reliably one file per table — 084 and 103 both belong to AssetTaskExecution —
 * so matching them up by name would go on missing exactly this case.
 *
 * It reports rather than includes. Whether a new file belongs on the map is a
 * judgement, and a generator should not be making it.
 */
function unlisted() {
  const RANGES = {
    Tables: {
      inRange: /^1(1[5-9]|[2-4][0-9])_/,
      listed: new Set([...API_TABLES, ...API_EXTRA.map(extra => extra.file), ...Object.keys(API_IGNORED)]),
    },
    Constraints: {
      inRange: /^(0[6-9][0-9]|1[0-9][0-9])_/,
      // The lists hold the bare name; the folder's files carry a `_constraints`
      // suffix that `apiFile` appends back on. Compared without it, so a file
      // already being read is never reported as missed.
      listed: new Set([...API_CONSTRAINTS, ...Object.keys(API_CONSTRAINTS_IGNORED)]),
    },
  };

  const missed = [];
  for (const [folder, { inRange, listed }] of Object.entries(RANGES)) {
    const names = JSON.parse(execFileSync('gh',
      ['api', `repos/${API_REPO}/contents/Database/xyz/${folder}`, '--jq', '[.[].name]'],
      { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));

    for (const file of names) {
      const name = file.replace(/\.sql$/, '').replace(/_constraints$/, '');
      if (inRange.test(name) && !listed.has(name)) missed.push(`${folder}/${file}`);
    }
  }
  return missed;
}

console.log(`  reading ${API_TABLES.length} api-v2 tables and ${API_CONSTRAINTS.length} constraint files…`);

for (const name of API_TABLES) {
  const body = apiFile('tables', name).split('\n').filter(l => !l.trim().startsWith('--')).join('\n');

  for (const create of body.matchAll(/CREATE TABLE IF NOT EXISTS xyz\."(\w+)"\s*\(([\s\S]*?)\n\);/g)) {
    const [, table, block] = create;
    out.api[table] ??= {};
    for (const line of block.split('\n')) {
      const m = line.trim().match(/^"(\w+)"\s+([A-Z][A-Z0-9 _()]*?)(?:\s+(?:NOT NULL|NULL))?(?:\s+DEFAULT.*)?,?$/);
      if (m && !line.includes('CONSTRAINT')) {
        out.api[table][m[1]] = { t: m[2].trim().toLowerCase().replace('timestamp with time zone', 'timestamptz') };
      }
    }
    const pk = block.match(/PRIMARY KEY \(([^)]+)\)/);
    if (pk) pk[1].split(',').forEach(c => {
      const col = c.trim().replace(/"/g, '');
      if (out.api[table][col]) out.api[table][col].pk = true;
    });
  }

  for (const alter of body.matchAll(/ALTER TABLE xyz\."(\w+)"([\s\S]*?);/g)) {
    const [, table, block] = alter;
    out.api[table] ??= {};
    for (const col of block.matchAll(/ADD COLUMN IF NOT EXISTS "(\w+)"\s+([A-Z][A-Z0-9 _()]*?)(?:\s+(?:NOT NULL|NULL))?(?:\s+DEFAULT|,|$)/g)) {
      out.api[table][col[1]] = { t: col[2].trim().toLowerCase().replace('timestamp with time zone', 'timestamptz') };
    }
  }
}

for (const { file, only } of API_EXTRA) {
  const body = apiFile('tables', file).split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
  for (const create of body.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?xyz\."(\w+)"\s*\(([\s\S]*?)\n\);/g)) {
    const [, table, block] = create;
    if (!only.includes(table)) continue;
    out.api[table] ??= {};
    for (const line of block.split('\n')) {
      const m = line.trim().match(/^"(\w+)"\s+([A-Z][A-Z0-9 _()]*?)(?:\s+(?:NOT NULL|NULL))?(?:\s+DEFAULT.*)?,?$/);
      if (m && !line.includes('CONSTRAINT')) {
        out.api[table][m[1]] = { t: m[2].trim().toLowerCase().replace('timestamp with time zone', 'timestamptz') };
      }
    }
    const pk = block.match(/PRIMARY KEY \(([^)]+)\)/);
    if (pk) pk[1].split(',').forEach(c => {
      const col = c.trim().replace(/"/g, '');
      if (out.api[table][col]) out.api[table][col].pk = true;
    });
  }
}

for (const name of API_CONSTRAINTS) {
  const sql = apiFile('constraints', name);
  for (const fk of sql.matchAll(/ALTER TABLE[\s\S]{0,80}?xyz\."(\w+)"[\s\S]{0,200}?FOREIGN KEY \(([^)]+)\)[\s\S]{0,60}?REFERENCES\s+xyz\."(\w+)"/g)) {
    const [, table, columns, target] = fk;
    columns.split(',').forEach(c => {
      const col = c.trim().replace(/"/g, '');
      if (out.api[table]?.[col] && !out.api[table][col].fk) out.api[table][col].fk = target;
    });
  }
}

for (const [key, values] of Object.entries(API_VALUES)) {
  const [table, column] = key.split('.');
  if (out.api[table]?.[column]) out.api[table][column].en = values;
}

/* ─────────────────────────────────────────────────────────────────── write */
const sortKeys = obj => Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
const registry = { bridge: sortKeys(out.bridge), api: sortKeys(out.api) };

const dataDir = path.join(ROOT, 'data');
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, 'columns.json'), `${JSON.stringify(registry, null, 1)}\n`);
fs.writeFileSync(path.join(dataDir, 'columns.js'),
  '/* Generated by tools/build-columns.mjs — do not edit. Run `npm run schema`. */\n'
  + `const TABLES = ${JSON.stringify(registry)};\n`);

const count = layer => Object.values(registry[layer]).reduce((n, c) => n + Object.keys(c).length, 0);
const flagged = (layer, flag) => Object.values(registry[layer])
  .reduce((n, c) => n + Object.values(c).filter(m => m[flag]).length, 0);

console.log('\n  written data/columns.json and data/columns.js');
for (const layer of ['bridge', 'api']) {
  console.log(`    ${layer.padEnd(7)} ${Object.keys(registry[layer]).length} tables · ${count(layer)} columns`
    + ` · ${flagged(layer, 'pk')} pk · ${flagged(layer, 'fk')} fk · ${flagged(layer, 'en')} value sets`);
}
console.log(`    total   ${count('bridge') + count('api')} columns`);

const missed = unlisted();
if (missed.length) {
  console.log('\n  api-v2 DDL files in the commissioning range that this tool does not read:');
  missed.forEach(name => console.log(`    ${name}`));
  console.log('\n  Decide whether each belongs on the map, then add it to API_TABLES with');
  console.log('  its constraints file, or to API_IGNORED with a reason.\n');
} else {
  console.log('  every api-v2 DDL file in range is read or deliberately ignored\n');
}
