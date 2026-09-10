/**
 * Checks the hand-written model against the generated registry — `npm run check`.
 *
 * The map's whole claim is that it was read from source. That claim survives
 * exactly as long as something keeps checking it, because the registry moves
 * every time a migration lands while the concepts are written by hand. This is
 * that something. Run it after `npm run schema`, and in CI if it ever gets one.
 *
 * It deliberately does NOT check prose. A field value like "the same row" or
 * "witness / prepared role" is a sentence, not a column, and saying so is the
 * point of the row. Only values shaped like identifiers are resolved.
 */
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, ''));
const ROOT = path.join(HERE, '..');

const TABLES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'columns.json'), 'utf8'));

/* model.js is a classic script, so it is read and evaluated rather than
   imported. Only the three literals are needed. */
const source = fs.readFileSync(path.join(ROOT, 'model.js'), 'utf8');
const literal = (name, open, close) => {
  const at = source.indexOf(`const ${name} = ${open}`);
  if (at < 0) throw new Error(`${name} not found in model.js`);
  const from = at + `const ${name} = `.length;
  let depth = 0;
  for (let i = from; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "'" || ch === '"') {
      const quote = ch;
      i += 1;
      while (i < source.length && source[i] !== quote) i += source[i] === '\\' ? 2 : 1;
      continue;
    }
    if (ch === '/' && source[i + 1] === '/') { while (i < source.length && source[i] !== '\n') i += 1; continue; }
    if (ch === '/' && source[i + 1] === '*') { i = source.indexOf('*/', i) + 1; continue; }
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return eval(`(${source.slice(from, i + 1)})`);
    }
  }
  throw new Error(`unterminated ${name}`);
};

const problems = [];
const fail = (where, what) => problems.push(`${where}: ${what}`);

const TBD = Symbol.for('not specified yet');
const LAYERS = literal('LAYERS', '[', ']');
const CONCEPTS = literal('CONCEPTS', '[', ']');

/* coverage-model.js only adds to those two, so applying it here checks the
   coverage board by the same rules — otherwise its layer would be exactly the
   unchecked hand-written data this tool exists to catch. */
const coveragePath = path.join(ROOT, 'coverage-model.js');
if (fs.existsSync(coveragePath)) {
  const warnings = [];
  new Function('LAYERS', 'CONCEPTS', 'console',
    fs.readFileSync(coveragePath, 'utf8'))(LAYERS, CONCEPTS, { warn: m => warnings.push(m) });
  warnings.forEach(warning => problems.push(`coverage-model.js: ${warning}`));
}

/* ────────────────────────────────────────────────────────────────── layers */
const keys = new Set();
for (const layer of LAYERS) {
  const where = `layer ${layer.key ?? '(no key)'}`;
  for (const field of ['key', 'tag', 'label', 'column', 'role', 'colour']) {
    if (!layer[field]) fail(where, `missing \`${field}\``);
  }
  if (keys.has(layer.key)) fail(where, 'duplicate key');
  keys.add(layer.key);
  const ROLES = ['surface', 'store', 'status'];
  if (!ROLES.includes(layer.role)) fail(where, `role must be one of ${ROLES.join(', ')}, not ${layer.role}`);
  if (layer.extends && !LAYERS.some(other => other.key === layer.extends)) {
    fail(where, `extends \`${layer.extends}\`, which is not a layer`);
  }
  if (layer.extends && !layer.source) fail(where, 'a proposal layer needs `source` — provenance or it stays out');
  if (layer.extends && layer.role !== 'store') fail(where, 'a proposal extends a store, so its role must be store');
}

const layerOf = key => LAYERS.find(layer => layer.key === key);
const stores = LAYERS.filter(layer => layer.role === 'store');

/* ──────────────────────────────────────────────────────────────── concepts */
const ids = new Set();
let rows = 0;
let resolved = 0;
let prose = 0;

/** A value naming one or more identifiers, rather than a sentence about them. */
const IDENTIFIER = /^[A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)?(?:\(\))?$/;

for (const concept of CONCEPTS) {
  const where = `concept ${concept.id ?? concept.name ?? '(unnamed)'}`;
  if (!concept.id) fail(where, 'missing `id`');
  if (ids.has(concept.id)) fail(where, 'duplicate id');
  ids.add(concept.id);
  if (!concept.name) fail(where, 'missing `name`');
  if (!Number.isInteger(concept.stage)) fail(where, 'missing or non-integer `stage`');

  for (const [key, sheet] of Object.entries(concept.sheets ?? {})) {
    const layer = layerOf(key);
    if (!layer) { fail(where, `sheet for \`${key}\`, which is not a layer`); continue; }
    if (!sheet.absent && !sheet.label) fail(where, `sheet ${key} has neither a label nor \`absent\``);
    if (sheet.table && !TABLES[key]?.[sheet.table]) {
      fail(where, `sheet ${key} names table \`${sheet.table}\`, which is not in the registry`);
    }
  }

  for (const [index, row] of (concept.fields ?? []).entries()) {
    rows += 1;
    const at = `${where} field ${index + 1}`;

    for (const key of Object.keys(row)) {
      if (key !== 'note' && !layerOf(key)) fail(at, `key \`${key}\` is not a layer`);
    }

    for (const layer of stores) {
      const value = row[layer.key];
      if (value === undefined) continue;

      if (value === TBD) {
        if (!layer.provisional) fail(at, `TBD on \`${layer.key}\`, which is not a provisional layer`);
        continue;
      }
      if (typeof value !== 'string' || !value.trim()) { fail(at, `\`${layer.key}\` is empty`); continue; }

      // A delta layer's value describes a change, so it is not resolved here.
      if (layer.extends) continue;

      const registry = TABLES[layer.key] ?? {};
      const own = concept.sheets?.[layer.key]?.table;

      for (const part of value.split(/\s*\/\s*/)) {
        const bare = part.trim().replace(/\(\)$/, '');
        if (!IDENTIFIER.test(bare)) { prose += 1; continue; }

        const [first, second] = bare.split('.');

        if (!second) {
          // A bare name is either a column of this concept's own table, or a
          // reference to another table — both are things the map legitimately
          // says.
          if (own && registry[own]?.[first]) { resolved += 1; continue; }
          if (registry[first]) { resolved += 1; continue; }
          fail(at, own
            ? `\`${first}\` is neither a column of ${own} nor a table, on ${layer.key}`
            : `\`${first}\` on ${layer.key} has no table to resolve against`
              + ' — give the sheet a `table`, or qualify the value');
          continue;
        }

        if (registry[first]) {
          if (registry[first][second]) { resolved += 1; continue; }
          fail(at, `\`${first}.${second}\` is not a column in the registry`);
          continue;
        }
        // Not a table, so `first` should be a column of this concept's table
        // and `second` a path inside it — how a jsonb payload is addressed.
        if (own && registry[own]?.[first]) { resolved += 1; continue; }
        fail(at, `\`${bare}\` on ${layer.key} resolves to neither a table nor a column of ${own ?? '(no table)'}`);
      }
    }
  }
}

/* ─────────────────────────────────────────────────────────────────── report */
console.log(`  ${LAYERS.length} layers · ${CONCEPTS.length} concepts · ${rows} field rows`);
console.log(`  ${resolved} values resolved against the registry · ${prose} read as prose`);

if (problems.length) {
  console.error(`\n  ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n`);
  for (const problem of problems) console.error(`    ${problem}`);
  console.error('');
  process.exit(1);
}
console.log('  no problems\n');
