/**
 * Regenerates the column registry — `npm run schema`.
 *
 * Reads both stores from source and writes data/columns.json (canonical, for
 * tooling and diffs) plus data/columns.js (the same object as a script tag, so
 * the page gets it synchronously). One run writes both, so they cannot drift.
 *
 * Sources
 *   ours    `supabase gen types` against the dev project, plus the
 *           xyz-supabase migrations for primary keys and permitted values —
 *           neither of which appears in the generated types.
 *   theirs  PostgreSQLDatabase's DDL and constraint files, fetched with `gh`
 *           and cached under tools/.cache, plus the value sets api-v2 keeps in
 *           TypeScript rather than in CHECK constraints.
 *
 * Nothing here is hand-maintained. If a number in the page disagrees with the
 * database, re-run this rather than editing the output.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, ''));
const ROOT = path.join(HERE, '..');
const CACHE = path.join(HERE, '.cache');

const DEV_PROJECT = process.env.SUPABASE_PROJECT_ID ?? 'ohmzwpcilvxpozljllle';
const MIGRATIONS = process.env.XYZ_SUPABASE_DIR
  ? path.join(process.env.XYZ_SUPABASE_DIR, 'supabase', 'migrations')
  : path.join(ROOT, '..', '..', 'xyz-supabase', 'supabase', 'migrations');

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
];

/* ElementInstallationStatus predates commissioning, so it is created in the
   model-redesign migration alongside many unrelated tables. Only that one is
   wanted here. */
const API_EXTRA = [{ file: '030_xyz_b_model_redesign', only: ['ElementInstallationStatus'] }];

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

/* ─────────────────────────────────────────────────── ours: generated types */
function devTypes() {
  const cached = path.join(CACHE, 'dev-schema.ts');
  if (process.env.SUPABASE_TYPES) return fs.readFileSync(process.env.SUPABASE_TYPES, 'utf8');
  console.log(`  reading the dev schema (project ${DEV_PROJECT})…`);
  const ts = execFileSync('supabase',
    ['gen', 'types', 'typescript', '--project-id', DEV_PROJECT],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(cached, ts);
  return ts;
}

const ts = devTypes();

for (const block of ts.matchAll(/\n      (\w+): \{\n        Row: \{\n([\s\S]*?)\n        \}\n/g)) {
  const [, table, body] = block;
  const cols = {};
  for (const line of body.split('\n')) {
    const m = line.match(/^\s+(\w+):\s*(.+?)\s*$/);
    if (m) cols[m[1]] = { t: m[2].replace(/\s*\|\s*null$/, '') + (/\| null$/.test(m[2]) ? '?' : '') };
  }
  out.bridge[table] = cols;
}

for (const rel of ts.matchAll(/foreignKeyName: "[^"]*"\s*\n\s*columns: \[([^\]]*)\]\s*\n\s*isOneToOne: \w+\s*\n\s*referencedRelation: "([^"]+)"/g)) {
  const columns = rel[1].split(',').map(s => s.trim().replace(/"/g, '')).filter(Boolean);
  for (const table of Object.values(out.bridge)) {
    for (const col of columns) if (table[col] && !table[col].fk) table[col].fk = rel[2];
  }
}

/* ──────────────────────────── ours: primary keys and permitted values */
if (!fs.existsSync(MIGRATIONS)) {
  console.error(`\n  migrations not found at ${MIGRATIONS}`);
  console.error('  clone XYZReality/xyz-supabase (branch develop) and either put it beside');
  console.error('  this repo or set XYZ_SUPABASE_DIR to it. Keys and value sets need it.\n');
  process.exit(1);
}

/**
 * Migrations are read from `origin/develop`, not from the working tree.
 *
 * The clone is usually sitting on whatever branch someone was last working on,
 * which is behind develop — and reading that silently produced a registry with
 * three primary keys and four value sets missing. The branch is the fact we
 * want; the checkout is an accident.
 */
const BRANCH = process.env.XYZ_SUPABASE_BRANCH ?? 'origin/develop';
const repoDir = path.join(MIGRATIONS, '..', '..');
let readMigration;
let migrations;

try {
  execFileSync('git', ['-C', repoDir, 'fetch', '--quiet', 'origin'], { stdio: 'ignore' });
  const listed = execFileSync('git',
    ['-C', repoDir, 'ls-tree', '--name-only', BRANCH, 'supabase/migrations/'],
    { encoding: 'utf8' });
  migrations = listed.split('\n').filter(f => f.endsWith('.sql')).sort();
  readMigration = file => execFileSync('git', ['-C', repoDir, 'show', `${BRANCH}:${file}`],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  console.log(`  reading ${migrations.length} migrations from ${BRANCH}…`);
} catch {
  migrations = fs.readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort();
  readMigration = file => fs.readFileSync(path.join(MIGRATIONS, path.basename(file)), 'utf8');
  console.log(`  ${BRANCH} unavailable — reading ${migrations.length} migrations from the working tree,`
    + ' which may be behind');
}

/* Half these tables were created under an older name and renamed later, so a
   create-table body must be looked up through the renames. */
const renamed = new Map();
for (const file of migrations) {
  const sql = readMigration(file);
  for (const r of sql.matchAll(/alter table\s+(?:if exists\s+)?(?:public\.)?(\w+)\s+rename\s+to\s+(\w+)/gi)) {
    renamed.set(r[1], r[2]);
  }
}
const currentName = name => {
  let seen = name;
  const guard = new Set();
  while (renamed.has(seen) && !guard.has(seen)) { guard.add(seen); seen = renamed.get(seen); }
  return seen;
};

for (const file of migrations) {
  const sql = readMigration(file);

  for (const create of sql.matchAll(/create table (?:if not exists )?(?:public\.)?(\w+)\s*\(([\s\S]*?)\n\);/gi)) {
    const table = out.bridge[currentName(create[1])];
    if (!table) continue;
    for (const line of create[2].split('\n')) {
      const col = line.trim().match(/^(\w+)\s+[a-z]/i);
      if (col && /primary key/i.test(line) && table[col[1]]) table[col[1]].pk = true;
    }
    const composite = create[2].match(/primary key \(([^)]+)\)/i);
    if (composite && !/^\s*\w+\s+[a-z]/i.test(composite[0])) {
      composite[1].split(',').forEach(c => { if (table[c.trim()]) table[c.trim()].pk = true; });
    }
  }

  /* Value sets, scoped to the table the CHECK is on — several tables have a
     `status` column and they do not share a value set. A CHECK often spans
     lines, so whitespace is flattened first. Last migration wins: a widened
     CHECK replaces the one it replaced in the database. */
  const flat = sql.replace(/\s+/g, ' ');
  const applyChecks = (declared, text) => {
    const table = out.bridge[currentName(declared)];
    if (!table) return;
    for (const check of text.matchAll(/check \( ?(?:(\w+) is null or )?(\w+) in \(([^)]*)\)/gi)) {
      const list = check[3].split(',').map(v => v.trim().replace(/'/g, '')).filter(Boolean);
      if (list.length && table[check[2]]) table[check[2]].en = list;
    }
  };
  for (const create of flat.matchAll(/create table (?:if not exists )?(?:public\.)?(\w+) \(([\s\S]*?)\); /gi)) {
    applyChecks(create[1], create[2]);
  }
  for (const alter of flat.matchAll(/alter table (?:if exists )?(?:public\.)?(\w+)([\s\S]*?);/gi)) {
    applyChecks(alter[1], alter[2]);
  }
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
console.log(`    total   ${count('bridge') + count('api')} columns\n`);
