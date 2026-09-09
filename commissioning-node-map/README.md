# Commissioning Node Map

One domain held in three places at once: the **screens** people use, the **Supabase bridge**
we write today, and the **api-v2 schema** that replaces it. Each card on the board is a single
concept, carrying the three names it goes by as offset overlay sheets; clicking one opens a
column-by-column comparison with keys, types and permitted values.

## Run it

```bash
npm run dev
```

Then open http://localhost:4321. There is no build step and no dependencies — `server.js` is a
small static file server, and the page is plain HTML, CSS and two scripts.

## Deploy to Vercel

Import this repository and set:

| Setting | Value |
|---|---|
| Root Directory | `commissioning-node-map` |
| Framework Preset | Other |
| Build Command | *(none)* |
| Output Directory | `.` |

`vercel.json` already declares the same thing, so in most cases importing the repo and setting
the root directory is enough. Vercel serves the files directly; it never runs `server.js`.

## The files

| File | What it holds |
|---|---|
| `index.html` | the document and the page's markup |
| `styles.css` | all styling; layer colours arrive as `--layer`, so no rule names a layer |
| `model.js` | the data — `LAYERS`, `TABLES`, `CONCEPTS` |
| `app.js` | the board, the overlay stacks and the comparison window |
| `server.js` | local static server, for `npm run dev` only |

## Changing it

**Read the contract at the top of `model.js` first.** It explains the model, the four rules that
keep the map honest, how to add a layer or a proposal layer, and the exact commands to
regenerate the column registry from source. The short version:

- Adding a **layer** is one entry in `LAYERS`. The toggle, legend chip, sheet colour, stacking
  depth and comparison column all follow.
- Adding a **proposal** layer needs `extends`, `sparse`, `provisional` and `source`, so that
  added/changed/unchanged is computed by diffing rather than hand-labelled.
- A concept's `id` is permanent — it keys the saved board layout in each viewer's browser.

Nothing in `model.js` is typed from memory. Every column name, type, key and value set is read
from the live dev schema, the `xyz-supabase` migrations, and `PostgreSQLDatabase`'s DDL and
constraint files.

## Note on contents

This repository is public. The map describes internal table and column names for both the
Supabase bridge and api-v2, and references internal tickets. That is consistent with the rest of
this repo, but worth knowing before sharing the deployed URL widely.
