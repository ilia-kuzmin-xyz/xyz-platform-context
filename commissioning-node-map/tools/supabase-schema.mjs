/**
 * Reads our side of the map straight from the database.
 *
 * Everything — columns, types, nullability, primary keys, foreign keys and
 * permitted values — comes from one place: the live dev schema, over the
 * Management API's query endpoint.
 *
 * This replaces reading half of it from the xyz-supabase migrations. That was
 * a proxy for the database rather than the database, and it was wrong in both
 * directions: it missed four primary keys, and it would have reported a key or
 * a value set from a migration that had been merged but not yet applied.
 *
 * Needs SUPABASE_ACCESS_TOKEN — a personal access token from
 * supabase.com/dashboard/account/tokens. No database password, and no schema
 * changes. Keep it in the environment; it must never be committed.
 */
import { execFileSync } from 'node:child_process';

const API = 'https://api.supabase.com/v1/projects';

export function query(project, token, sql) {
  const out = execFileSync('curl', [
    '-s', '--fail-with-body',
    '-H', `Authorization: Bearer ${token}`,
    '-H', 'Content-Type: application/json',
    '-X', 'POST', `${API}/${project}/database/query`,
    '-d', JSON.stringify({ query: sql }),
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

  const rows = JSON.parse(out);
  if (!Array.isArray(rows)) {
    throw new Error(`unexpected reply from the query endpoint: ${out.slice(0, 200)}`);
  }
  return rows;
}

/* Postgres spells a few types at length; the api-v2 DDL uses the short forms,
   and the map puts the two side by side. */
const shorten = type => type
  .replace('timestamp with time zone', 'timestamptz')
  .replace('timestamp without time zone', 'timestamp')
  .replace('character varying', 'varchar')
  .replace('double precision', 'float8');

const COLUMNS = `
select t.relname::text                        as tbl,
       a.attname::text                        as col,
       format_type(a.atttypid, a.atttypmod)   as typ,
       a.attnotnull                           as required
from pg_attribute a
join pg_class t on t.oid = a.attrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relkind in ('r', 'v', 'm', 'p')
  and a.attnum > 0
  and not a.attisdropped
order by t.relname, a.attnum`;

/* conkey carries the columns a constraint is on, which is more reliable than
   reading them back out of the constraint's text. */
const CONSTRAINTS = `
select t.relname::text as tbl,
       c.contype::text as kind,
       (select array_agg(a.attname::text order by k.ord)
          from unnest(c.conkey) with ordinality k(attnum, ord)
          join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as cols,
       (select r.relname::text from pg_class r where r.oid = c.confrelid) as target,
       pg_get_constraintdef(c.oid) as def
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public' and c.contype in ('p', 'f', 'c')
order by t.relname, c.conname`;

/** Every quoted literal in an `= ANY (ARRAY[...])`, in the order written. */
function permittedValues(def) {
  const list = def.match(/ARRAY\[(.*?)\]/s);
  if (!list) return null;
  const values = [...list[1].matchAll(/'((?:[^']|'')*)'/g)].map(m => m[1].replace(/''/g, "'"));
  return values.length ? values : null;
}

export function readSupabase(project, token) {
  const tables = {};

  for (const row of query(project, token, COLUMNS)) {
    (tables[row.tbl] ??= {})[row.col] = { t: shorten(row.typ) + (row.required ? '' : '?') };
  }

  for (const row of query(project, token, CONSTRAINTS)) {
    const table = tables[row.tbl];
    if (!table) continue;
    const cols = row.cols ?? [];

    if (row.kind === 'p') {
      cols.forEach(col => { if (table[col]) table[col].pk = 1; });
      continue;
    }
    if (row.kind === 'f') {
      /* A column can sit in more than one composite key — asset_type_task's
         workflow_id is in both (asset_type_id, workflow_id) and
         (readiness_step_id, workflow_id). Keeping only the first made the
         output depend on the order rows came back in, which showed up as a
         change that had not happened. Keep every target, in name order. */
      cols.forEach(col => {
        if (!table[col]) return;
        const targets = table[col].fk ? table[col].fk.split(' / ') : [];
        if (!targets.includes(row.target)) targets.push(row.target);
        table[col].fk = targets.join(' / ');
      });
      continue;
    }
    /* A value set is a CHECK on exactly one column. A multi-column CHECK says
       something about the row, not about a column's domain. */
    if (cols.length === 1 && table[cols[0]]) {
      const values = permittedValues(row.def);
      if (values) table[cols[0]].en = values;
    }
  }

  return tables;
}

/**
 * The bridge half WITHOUT a personal access token, for the common case where
 * only api-v2 has moved.
 *
 * The Management API is the only source that carries keys and value sets, so
 * there is no way to regenerate this half without a token. What there IS, is a
 * way to prove the stored half is still current: the Supabase CLI is logged in
 * on a developer's machine already, and `gen types` reads the same live schema
 * over that login. It reports every table and column and none of the keys, which
 * is exactly enough to answer "has anything changed?" and not enough to rebuild.
 *
 * So this reuses the previously generated block only after checking it name for
 * name against the live schema, and refuses if a single table or column differs.
 * The block stays generated output; its currency is verified rather than assumed,
 * which is the only property that matters for a file nothing hand-maintains.
 */
export function reuseVerifiedBridge(project, stored) {
  /* Named candidates rather than `shell: true`: a shell would concatenate the
     arguments into a command line instead of passing them (Node's DEP0190),
     and `project` has no business being parsed by anything. Windows installs
     put a different extension on the CLI depending on the installer — scoop an
     .exe, npm a .cmd — so try them in turn rather than guessing one. */
  const candidates = process.platform === 'win32'
    ? ['supabase.exe', 'supabase.cmd', 'supabase']
    : ['supabase'];
  const args = ['gen', 'types', 'typescript', '--project-id', project];
  const opts = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };

  let types;
  for (const cli of candidates) {
    try {
      types = execFileSync(cli, args, opts);
      break;
    } catch (error) {
      /* Only "there is no such executable" is worth trying the next name for.
         A CLI that ran and failed (not logged in, no such project) is the
         answer, not a reason to try a different spelling of the same tool. */
      if (error.code !== 'ENOENT') throw error;
    }
  }
  if (types === undefined) {
    throw new Error(`the Supabase CLI was not found (tried ${candidates.join(', ')}).`
      + ' Install it, or set SUPABASE_ACCESS_TOKEN to read the schema over the Management API instead.');
  }

  const live = {};
  const body = types.slice(types.indexOf('public: {'));
  for (const m of body.matchAll(/\n {6}(\w+): \{\n {8}Row: \{\n([\s\S]*?)\n {8}\}/g)) {
    live[m[1]] = new Set([...m[2].matchAll(/^ {10}(\w+)\??:/gm)].map(c => c[1]));
  }
  if (Object.keys(live).length === 0) {
    throw new Error('`supabase gen types` returned no tables — is the CLI logged in?');
  }

  const differences = [];
  for (const name of new Set([...Object.keys(live), ...Object.keys(stored)])) {
    if (!live[name]) { differences.push(`${name}: gone from the database`); continue; }
    if (!stored[name]) { differences.push(`${name}: new table`); continue; }
    for (const col of live[name]) if (!stored[name][col]) differences.push(`${name}.${col}: new column`);
    for (const col of Object.keys(stored[name])) if (!live[name].has(col)) differences.push(`${name}.${col}: gone`);
  }
  if (differences.length) {
    throw new Error(
      'the stored bridge schema is out of date, so it cannot be reused:\n    '
      + differences.join('\n    ')
      + '\n  Set SUPABASE_ACCESS_TOKEN and run again to regenerate it.');
  }
  return stored;
}
