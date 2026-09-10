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
order by t.relname`;

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
      cols.forEach(col => { if (table[col] && !table[col].fk) table[col].fk = row.target; });
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
