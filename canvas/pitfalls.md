# Canvas — Known Pitfalls

## 1. Profile stub false-satisfaction (dashboard mounts with empty data)

**Symptom**: Sandpack mounts but issues / polygons / progress arrays are empty.

**Cause**: `data_profile` includes keys for ALL domains (lightweight stubs: counts, no row arrays). If `completeHydration` judges domain satisfaction by key presence in the merged accumulator, every domain looks satisfied the moment profile + first real partial arrive — Sandpack mounts before real data is ready.

**Rule**: `runHydrate` keeps `profile` (stubs) and `hydrated` (full payloads) in separate buckets. `completeHydration` judges against `Object.keys(hydrated)` ONLY. Profile keys merged underneath for display, never for completion.

## 2. Stale ref after setState (hydration never starts on restore)

**Symptom**: Session opens, dashboards show loading forever. Clicking "View dashboard" manually works.

**Cause**: `openSession` called `hydrateDashboard(id)` right after `setState` → `stateRef.current` not yet updated → dashboard entry undefined → bail.

**Rule**: Pass dashboard maps and threadId explicitly to `rehydrateSession({ dashboards, askResults, activeDashboardId, threadId })`. Never read from `stateRef` immediately after a setState call.

## 3. CORS on blob download

**Symptom**: `loadSession` throws CORS error on localhost.

**Cause**: `GET /files/{ref}` returns a signed Azure blob URL. Azure storage has no CORS rule for `localhost`.

**Rule**: Use `Storage` axios instance (`ViewerPage/utils/storage-fetch.ts`). On localhost it rewrites blob URLs to `/files/<path>` and webpack proxies to `storage.holosite.dev` (same-origin). On deployed origins it fetches the signed URL directly. Never use raw `fetch(downloadUrl)`.

## 4. Sandpack remount flood

**Symptom**: Dashboard visible but sluggish or flickering; CPU spikes on restore.

**Cause**: Mounting Sandpack before hydration completes and updating `props.data` on every `artifact_data_partial` event triggers repeated full re-bundles.

**Rule**: Use the mount gate. Show a placeholder until `hydrating && status !== 'hydrated'`. Mount once with final data. Freeze `artifact.data` after status flips to `'hydrated'` — ignore subsequent partials for the active dashboard.

## 5. SSE stream closes without a `done` event

**Symptom**: Dashboard stuck on "Loading…" forever (typically after pipeline restart mid-stream).

**Cause**: `onDone` callback never fires if the SSE stream closes abruptly before emitting `done`.

**Rule**: Use a `finish()` pattern that fires exactly once on any stream end — both the normal `done` SSE event AND the stream `close`/`error` event. Always wire both paths.

## 6. EDIT fails on restored session (prior_artifact missing)

**Symptom**: User restores a session, types a follow-up, gets a blank or wrong artifact.

**Cause**: Pipeline `thread_store` is in-memory (6h TTL), wiped on server restart. Composer can't find `last_artifact` for EDIT context.

**Rule**: On EDIT turns against a restored session, send `prior_artifact: { tsx, title, summary, domainsRead }` in the `/api/chat` body. Pipeline falls back to it when `thread.last_artifact` is absent.

---

## Viewer (3D colour visualisation) — see [viewer-colouring.md](viewer-colouring.md)

## 7. Manual `fragId2dbId` visibility loop never converges on large models

**Symptom**: Viewer blank (or a random partial subset) on load; a filter click "fixes" it. `fragment visibility: 0 visible, 15999580 hidden`.

**Cause**: Post-load fragment hiding reads `model.getFragmentList().fragments.fragId2dbId`, which is NOT populated while a 16M-fragment federated model streams. The loop matches 0 (or a random partial) of 16M. A filter click works only because it re-runs later, once geometry is loaded.

**Rule**: Don't hide fragments after load. Use **selective loading** (`loadOptions.ids = statusDbIds`) so only tracked geometry loads, and `setThemingColor` (Forge applies per-fragment as they stream — no matching loop). Filtering uses high-level `viewer.isolate()` / `showAll()`. Retry/stability/`colorEpoch` heuristics do NOT fix an unready map — they were all reverted.

## 8. `< 800000` selective-load cap → "50% coloured, 50% raw"

**Symptom**: Half the model is coloured by status, half shows raw material.

**Cause**: A guard `if (selectiveDbIds.length < 800000)` skipped selective loading for real projects (~1M status dbIds) → the FULL model loaded → untracked elements showed raw.

**Rule**: No upper cap — pass all status dbIds to `loadOptions.ids`, same as the dashboard.

## 9. Sandpack HMR ignores a changed static JSON import

**Symptom**: On restore, viewer stays uncoloured; `mapping has 0 status elements` even though the refetch succeeded. `[HMR] Nothing hot updated`.

**Cause**: ForgeViewer imports `viewer-mapping.json` statically. When the host `updateFile()`s it after mount, Sandpack does an HMR no-op — it won't re-run the module's top-level import.

**Rule**: Mount the viewer runner **once, only when the mapping is already in state** (stable key). Don't mount early and patch via `updateFile`. During generation the pipeline emits `viewer_mapping` BEFORE the skeleton, so the first mount already has it; restore refetches first.

## 10. Sandpack 100001-iteration loop cap kills a 16M-fragment model

**Symptom**: `RangeError: Potential infinite loop: exceeded 100001 iterations`.

**Cause**: Sandpack injects a per-loop iteration counter capped at 100001. A federated model's loops legitimately exceed it. (The native dashboard isn't sandboxed → no cap.)

**Rule**: Ship `/sandbox.config.json` = `{"infiniteLoopProtection": false}` into the VFS for viewer dashboards only. Non-viewer artifacts keep the guard.

## 11. `arr.push(...bigArray)` stack overflow

**Symptom**: `RangeError: Maximum call stack size exceeded` in viewer init.

**Cause**: `selectiveDbIds.push(...ids)` spreads a 200k+ element array as function args → exceeds the argument-count limit. (Array-literal spread `[...arr]` is fine — it iterates.)

**Rule**: Use a loop, never function-call spread, on large arrays.

## 12. Blank canvas looks like a hang (no loading indicator)

**Symptom**: Canvas empty for many seconds on a large model; looks broken.

**Cause**: The model IS loading (16M fragments stream slowly) but `phase` went `ready` right after load kickoff, so no overlay showed.

**Rule**: Keep a determinate loading bar (Forge `PROGRESS_UPDATE_EVENT` → %) up until `applyColours` first paints fragments. Also: paint AFTER `consolidateModel()` (it async-rebuilds meshes and discards visibility set before it).

## 13. Library route (`/canvas/library/:id`) is a separate component

**Symptom**: Viewer coloured on the editable canvas but not on the published/library view; no `[Canvas]` logs.

**Cause**: `DashboardViewerPage` doesn't use `useCanvas`. It rendered the Sandpack runner without `viewerMapping`/`viewerConfig`.

**Rule**: When touching viewer wiring, fix BOTH routes. `DashboardViewerPage` fetches the mapping+config itself from `GET /api/viewer-mapping/:projectId`.

## 14. Fable emits inconsistent `\uXXXX` escaping in artifact text

**Symptom**: Report shows literal `\u2014` instead of `—`.

**Cause**: Fable is inconsistent about backslash count in JSON Unicode escapes; after `json.loads` some render fine (`\u2014`), some show literally (`\u2014`).

**Rule**: Pipeline `_decode_unicode_escapes()` collapses any backslash-escaped `\uXXXX` in tsx/title/summary to the real character before returning.

---

## The Sandpack VFS has a hard payload ceiling (~9MB)

Everything the artefact imports is serialised into the Sandpack iframe, and
`/viewer-mapping.json` dominates it. Past roughly 9MB the bundler fails with
`Couldn't connect to server … ERROR: TIME_OUT` **before it boots** — so it
presents as a network/infra problem, not as anything to do with your data.

This bit us the moment room isolation added 1.19MB of `roomDbIds` to an
already-marginal 8.19MB. The fix was encoding dbId groups as sorted-delta
base36 (9.37MB → 2.46MB), not trimming the feature.

Before adding anything to the viewer mapping, measure it. `statusDbIds` alone
is a million integers.

## A dashboard's `domainsRead` must name real hydration domains only

`completeHydration()` marks a dashboard ready only when **every** entry in its
`domainsRead` appears in the set of domains that actually delivered — which is
only ever `issues, schedule, progress, media, viewer, rooms`.

`project` and `capabilities` are **profile keys, not domains**. Listing them
means the gate never opens: the dashboard keeps whatever data it mounted with
and silently renders empty states. The symptom is domain-shaped ("No 3D model
available for this project") which sends you looking at the model rather than
at the declaration.

Corollary for artefact code: gate the viewer on `data.viewer.urn`, never on
`data.capabilities.viewer`. `capabilities` rides in the profile and can be
absent on a restore even when the model is perfectly available.

## `viewer.isolate()` semantics depend on the ghosting flag

The dashboard sets `setGhosting(false)`, which is right for a status filter —
non-matching elements should vanish. Copy that verbatim for room isolation and
`isolate()` **hides** the remainder instead of ghosting it, so a room holding a
median of 18 elements leaves an apparently empty canvas.

Also note `viewer.isolate([])` *clears* isolation (shows everything) rather than
hiding everything — so an empty visible set silently reverts to the whole
building, which reads as a dead click.

Toggle ghosting with the selection, and set a deterministic home camera after
load: `AggregatedView` restores whatever view the document carried, which on a
federated model is often edge-on or inside the geometry.
