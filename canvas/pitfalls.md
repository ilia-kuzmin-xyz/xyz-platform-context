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
