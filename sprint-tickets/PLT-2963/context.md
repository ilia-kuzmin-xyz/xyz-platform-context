# PLT-2963 — Infinite Canvas: speed up report generation and viewer data preparation

**First seen 2026-08-08.** Status was `Open` (eligible). **Moved to `Analysis In Progress` +
clarification comment posted** (comment id 109177).

## ⭐ Headline: near-total overlap with PLT-3025 (which is Dev In Progress)
Compared line by line against `../PLT-3025/context.md` and the live ticket, **PLT-3025 restates**:
the same baselines on the same project (API 2 FULL PROJECT -xv2, 1.4M elements / 502 rooms;
hydration 30–50s, rooms rollup ~60s, warm ~2.4s), the same *"move MCP reads onto the faster
schema"*, the same *"pre-warm on project open"*, the same
`xyz_get_projects_project_id_schedules_schedule_revision_id → request_failed` trap **verbatim**,
and the same acceptance criterion **including the unfilled `<target>` placeholder**.

PLT-3025 then adds the T1/T2 server-side persistence design and a second, unrelated half
(published reports as dashboard tabs).

**Proposed split, offered on the ticket:**
- **PLT-2963 = the viewer / first-paint half** — mount the viewer independently of the rest of the
  report, stop it blocking first paint, persist the 2.46MB mapping with the session.
- **PLT-3025 = the caching / persistence half.**

These are genuinely independent and touch different code. Left as-is, both tickets re-point the
same fetches at the same new schema and will collide.

## Other blockers raised
- **`<target>` is literally unfilled** in the acceptance criteria of *both* tickets. Not signable.
- **Repo scope:** most of half 1 lives in `XYZ_AgentPipeline/`, which is **not in this routine's
  accessible repo set** (hc-frontend, xyz-platform-context, XYZPlatformApi, hc-iam). Only the
  viewer/first-paint items are actionable from here.

## Domain reading (already in this repo — don't start from code)
`agent-pipeline/caching.md`, `agent-pipeline/phases.md`, `canvas/artifact-and-hydration.md`,
`canvas/project-data-cache.md`, `dashboard/README.md`.

## Confidence
**3/10** as written (duplication + unspecified target + repo scope).
**7/10 for the frontend/viewer half alone** if the split is agreed — that part is well specified
and does not depend on the caching work.

---

## 2026-08-10 — the frontend/viewer half is now fully traced in code (was: description-only)

Previous entries compared **descriptions**. This run read the actual code, so the first-paint
problem is no longer a paraphrase of the ticket — it has line numbers, and it **narrows the
solution space in a way that matters to whoever answers the duplication question.**

### The blocking chain, end to end (hc-frontend, master `4ad83a7`)

1. Canvas state starts with `viewerMapping: null` — `CanvasPage/useCanvas.ts:749`.
2. On restore, the mapping is **deliberately not persisted with the session** and is **refetched**:
   `useCanvas.ts:2082-2085`, then `ensureViewerMapping()` → `fetch(${CANVAS_API}/viewer-mapping/<pipelineProjectId>)`
   at `:2099`, with 3 retries + backoff (`:2116-2119`) and an empty-sentinel fallback so the viewer
   still mounts uncoloured rather than hanging forever (`:2122-2127`).
3. **While `viewerMapping` is null, the WHOLE dashboard is replaced by the loading skeleton** —
   `components/ArtifactPanel.tsx:407`:
   ```ts
   if (needsViewer && (!isActive || !viewerMapping)) { … <ViewerLoading /> … }
   ```
   `needsViewer` is just `/ForgeViewer/.test(d.tsx)` (`:394`). `ViewerLoading` (`:329-343`) is the
   full-panel *"Loading 3D model data…"* the ticket describes. **This is the ticket's "nothing else
   on screen" — it is not the viewer block loading, it is the entire report being withheld.**

### Why "mount the viewer separately from the rest of the report" fights the architecture

`ArtifactPanel.tsx:395-406` documents the constraint in the code itself: a viewer dashboard embeds
the mapping as a **static JSON import baked into the Sandpack bundle at mount**. Sandpack **will not
re-run that import on a later `updateFile`** (HMR reports *"nothing hot updated"*), and toggling the
runner key to force a remount **races the async refetch** — the sandbox sometimes compiles against
the empty mapping and never colours (intermittent on reload). Hence: mount the viewer runner exactly
once, only when active **and** the mapping is in hand, with a stable key.

That is also why the report is one bundle: TSX + `props.data` + `/viewer-mapping.json` compile
together. Cross-check with `canvas/artifact-and-hydration.md` § *Sandpack mount gate* — **"Mount
Sandpack exactly once, with final hydrated data"**, because every `props.data` change re-bundles
(100 s+ for a session with 16 dashboards).

### Consequence: the acceptance criterion picks the design

> *"Restored dashboards paint non-viewer content in <3s cold; viewer fills in after"*

Under the current single-bundle + static-import design this **cannot be met as written**. Only three
ways out, and they are not equal:

| Option (ticket's wording) | Verdict |
|---|---|
| **Persist the mapping with the session** (*"now it's 2.46MB, was 9.37MB"*) | ✅ **Smallest, fits every existing invariant.** Mapping is present at first render → `viewerMapping` non-null → the `:407` gate never trips → dashboard mounts once, fully. No new Sandpack instance, no race. |
| **Pre-warm the fetch on project open** | ⚠️ Helps warm, **does not remove the gate** — still async, still races a genuinely cold project. Mitigation, not a fix. |
| **Mount the viewer separately from the rest of the report** | ❌ Needs **two Sandpack instances**, contradicting the *mount-exactly-once* invariant and doubling bundler cost. Biggest change, worst fit. |

A fourth, not in the ticket: route the mapping through `props.data` as a normal domain. Doesn't help
on its own — the artifact still mounts once with final hydrated data, so the report would keep
waiting; it only helps if the viewer block is additionally allowed to tolerate late data, which is
exactly what the static import prevents.

### ⭐ The stale-rationale finding (this is the one to act on)

`useCanvas.ts:2083-2085` says:

> *"The grouped mapping (**~8MB**) is deliberately NOT persisted with the session; restored
> dashboards that embed a viewer refetch it here."*

**The size in that comment is out of date.** PLT-2963 and PLT-3025 both state the mapping is now
**2.46MB (was 9.37MB)**. So the "too big to persist" rationale that produced the refetch-on-restore
design **no longer holds at current payload size** — and option 1 above is simply *revisiting a
decision whose premise changed*, not new architecture. Update that comment when the decision is made,
either way.

### Does this unblock the ticket? No — but it shrinks it

Still held, for the reason recorded on 08-08: the **PLT-2963 / PLT-3025 duplication is unanswered**,
and PLT-3025 is `Dev In Progress` (so someone may be in this code). But the split proposed on the
ticket now has code behind it: **PLT-3025's half is server-side T1/T2 persistence keyed on
project + artefact id; PLT-2963's half is session-persisting a 2.46MB client payload in
`useCanvas.ts` + the `ArtifactPanel.tsx:407` gate.** Different files, different layers — genuinely
independent, as claimed.

**Remaining decision before code (small, but real):** persisting 2.46MB into *every* session that
embeds a viewer dashboard is a storage tradeoff — the mapping is per-**project**, sessions are
per-**user**, so N sessions on one project each carry their own copy. Worth a yes/no rather than an
assumption; the alternative is persisting it per-project alongside the hydration records (which
already live in project storage, per `artifact-and-hydration.md`).

## Confidence — updated
- **3/10** for the ticket as written (duplication + unfilled `<target>` + `XYZ_AgentPipeline/` is
  outside this routine's repo set) — unchanged.
- **9/10** (was 7) for the **frontend/viewer half**, *if* the split is agreed and the
  per-user-vs-per-project storage question above gets a one-line answer. The change itself is now
  well understood: persist + restore the mapping, then the `:407` gate stops firing.
