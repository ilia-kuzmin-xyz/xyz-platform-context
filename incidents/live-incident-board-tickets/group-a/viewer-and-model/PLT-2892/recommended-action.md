# PLT-2892 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) — post a short, routed clarifying comment on the ticket

This is a **fresh Major incident with the decisive fact still missing**: we do not know whether the model **never** loads or is merely **slow**, and we do not know whether LVN-BL1's current model version is **fully translated** or still **"Processing"**. Both are cheap to answer today, and they fork the whole diagnosis (backend stuck-translation vs FE/artefact hang). The playbook's Phase 1 is explicit: **facts before theories** — pin the observation and get the backend status before anyone writes code. So the right move is a tight, closed, one-owner-per-question comment, not a status change.

## Why this and not the others

- **Not (b) Ready For Development.** There is **no confirmed FE defect to fix yet.** The leading hypothesis is upstream (a stuck/slow SVF2 translation); the FE simply lacks a timeout for it. Sending to Dev now would either bounce (no repro/root cause) or produce a speculative fix. The genuine FE gap (no load-timeout watchdog — `use-model-loader.tsx:349` comment claims a fallback that doesn't exist) is worth a **follow-up ticket**, but it is a resilience improvement, not this incident's cause.
- **Not (c) With Technical Support (client question).** Yash **already reproduced it internally**, so we don't need the client to gather anything yet — the two facts we need are (1) answerable by Yash from his own repro + the attached screenshot, and (2) a **backend** fact, not a client one. A client ask only becomes correct if Yash's repro can't confirm "does it ever finish".
- **Not (d) Blocked.** Nothing external is legitimately blocking us — every missing fact is gatherable now (screenshot, Yash's repro, backend translation status). Marking it Blocked would entrench a stall the playbook warns against.

## Draft comment to post on PLT-2892 (playbook style — closed, one owner each)

> Triage — need three quick facts before we can route this (each answerable with a value):
>
> 1. @Yash Patel — on your repro, did the model **ever** finish, or is it stuck indefinitely? Roughly how long did you wait, and what's on screen — a **spinner/dark viewport**, the text **"No model selected for reporting…"**, or an **"Error loading 3D model"** box? (The screenshot isn't legible to me — this decides which code path we're in.)
> 2. @Sachin / @Ali — for LVN-BL1's **current federated-model version**, is the Autodesk **SVF2 translation / ingest** complete (`SUCCEEDED`) or still **"Processing"** right now? And was that model **re-uploaded/re-versioned recently** (when)?
> 3. @Darminder Atker — anything in session `platform-web-1b2af15e-0501-45f2-8a43-c0e9ec01a2c5` console/network showing where it stalls — does `Document.load('urn:…')` complete, or does it hang before geometry/colours?
>
> Scoping: only LVN-BL1 is reported so far — if anyone sees another project's dashboard stuck the same way **right now**, flag it (tells us global vs single-model). Working theory (unconfirmed): the version's derivative isn't fully translated, and the dashboard has no load-timeout so it spins forever — but Q2 decides that.

## What each answer unlocks

- **Q1 = "No model selected…" text** → the `accUrn`/current-version didn't resolve (`dashboard-project-service.ts:182-195`), a *different* branch — reframe away from "syncing".
- **Q1 = spinner + Q2 = "Processing"** → confirms the leading hypothesis (stuck/slow translation surfaced as a timeout-less FE spinner). Fix is backend (finish/repair the translation) **plus** an FE follow-up for a load watchdog.
- **Q1 = spinner + Q2 = "SUCCEEDED"** → translation is fine; pivot to the artefact/`element_base_data` path (colours never applied) — an FE/data-pipeline investigation.

## Runner-up

**(c) With Technical Support** — only if Yash cannot answer Q1 from his own repro (e.g. he didn't wait long enough); then Yash relays to the client via Freshdesk #7399: *"does the model ever load if left, say, 15+ minutes, and please attach a browser console/network capture."* I would **not** do this first — it re-loops the client for something we can likely answer internally.

## Follow-through for a human (not executed here)

- If Q2 = "Processing": this is largely a **backend/ops** incident (translation stuck) — keep Darminder as assignee for the FE-timeout follow-up but route the stuck-job to the ingest owner.
- Open a **separate FE ticket** for the missing load-timeout/error watchdog (progress-project spinner can never self-clear; the "fallback timeouts" comments are inaccurate) — a resilience fix independent of this incident's trigger.
- On close, add a `dashboard/pitfalls.md` entry ("dashboard model load has no timeout; a mid-translation `accUrn` or missing artefact → permanent spinner, not an error") and a note in `dashboard/viewer-and-model.md` §"Model resolution".

---

## REVISED comment (2026-07-13 — supersedes the draft above)

Corrections vs the earlier draft: (1) removed the project-rooms conflation (it's unrelated to element status), and (2) reframed Q1 around hang-vs-skip (does the `✓ Loaded element-status` line ever appear) rather than "which input is 0".

> Traced the two console errors — the model geometry loads fine; the sync spinner never clears because the **status/colour pipeline never finishes**, and there's no timeout to end the spinner.
>
> Mechanism (confirmed in code): the element-status load (`loadElementStatusParquet` → `duckdb.loadParquet`) has no timeout on either the download (`Storage.get`, `duckdb-service.ts:412`) or the DuckDB-wasm materialization (`:299-302`). All six loads are gathered by a `Promise.all` with **no timeout** (`dashboard-progress-service.ts:874`); if the element-status load never resolves, `_buildDynamicStatusView()` is never reached, `elementDynamicStatusViewLoaded$` stays false, the colours-applied callback never fires, and `setModelLoading(false)` (only called from that callback for progress projects) never runs → permanent spinner.
>
> One question to confirm hang-vs-skip:
> 1. @Darminder Atker — in the session console, does the line `[📊 INST-STATUS | PARQUET] ✓ Loaded N statuses from parquet` ever appear, and is there a `[Progress] Cannot build dynamic status view - missing data {...}` warning?
>    • No `✓ Loaded` and no warning → the element-status parquet load is **hanging** (download or wasm materialization) — likely an oversized/failing element-status artefact for this model version.
>    • `✓ Loaded` present + warning present → a different input is missing (the warning names which of svf2-object-id-map / status / links / activities is 0).
> 2. @Sachin / @Ali — for LVN-BL1's current model version, how large is the **element-status** parquet, and did the latest ingest run complete cleanly? (A partial/oversized artefact would explain a hanging load.)
>
> Scope: only LVN-BL1 reported so far — flag if any other project's dashboard is stuck the same way right now.
>
> Separately (FE resilience follow-up, not this incident): add a timeout to the parquet download + a timeout/`Promise.race` around the artefact `Promise.all`, and surface a terminal error state so a progress-project spinner can self-clear. Also a minor unrelated bug: `_enrichRoomsWithLevelNames` is guarded on levels but queries the rooms table (`dashboard-360-service.ts:166,439`) → the `project_rooms_raw` console error; degrades only 360 Floor/Room filters.

**Tag:** Darminder (Q1), Sachin/Ali (Q2). **Keep status In Analysis** until Q1 lands — it likely routes to backend/ingest (data), with an FE resilience follow-up.
