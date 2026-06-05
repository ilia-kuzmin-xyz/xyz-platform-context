# ASK — Ask Mode

## What it does

`mode='ask'` bypasses the artifact composer. The pipeline runs the ask agent instead, which generates a JS spec rather than a TSX dashboard:

```ts
{ type: 'number'|'table'|'list', label: string, fn: string, followUp?: string, domainsRead: string[] }
```

`fn` is a function body `(data) => value` that computes a result from hydrated project data. Hydrators still run to provide `fn` with domain data.

The result renders inline in the assistant chat bubble — not in ArtifactPanel. No "View dashboard" button.

## Frontend execution

`executeAskSpec(spec, data)` in `useCanvas.ts` runs `fn` against the supplied data synchronously and returns the value/table/list. The chat bubble renders the result from `askSnapshot.value`.

What's stored in `AskResultEntry`:
```ts
{ id, messageId, question, type, label, fn, followUp, domainsRead, createdAt }
```

What's NOT stored: the computed value (`askSnapshot`). It can be 96k+ rows and is always re-derivable from `fn` + fresh data.

## On session restore

For each `AskResultEntry` in the restored session:
1. `rehydrateSession()` fires one `mode:'hydrate'` request for the union of all ask + dashboard domains.
2. Once `done` arrives, `executeAskSpec(spec, freshData)` runs for every ask result.
3. `askSnapshot.status` transitions from `'hydrating'` → populated. Chat bubble re-renders with the inline result.

ChatPanel shows "Loading latest data…" with a spinner while `askSnapshot.status === 'hydrating'`.

## Key files

| File | Role |
|------|------|
| `useCanvas.ts` | `executeAskSpec`, ask SSE handlers (`ask_spec`, `ask_error`), rehydration logic |
| `ChatPanel.tsx` | Inline ask result rendering + hydrating spinner |
| `canvas.types.ts` | `AskResultEntry`, `AskSnapshot`, `AskState` |
