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

---

## 2026-08-13 — ⚠️ CORRECTION to the 08-10 recommendation, plus a latent bug found next door

The 08-10 entry above traced the blocking chain correctly (`ArtifactPanel.tsx:407`, the static
JSON import, the refetch at `useCanvas.ts:2099`). **Its recommendation was wrong**, and the
reasoning that produced my "per-session vs per-project storage" question was wrong with it.
Both are corrected here; the 08-10 entry is kept, not deleted, so the error is legible.

### Correction 1 — "persist the mapping with the session" is the wrong option

08-10 ranked *persist-with-session* ✅ smallest-and-best. What it missed is one line up from the
fetch it quoted: **the mapping already has a canonical per-project home on the server.**

`useCanvas.ts:2096-2099`:
```
// The pipeline caches it for 2h, so warm calls are fast.
fetch(`${CANVAS_API}/viewer-mapping/${pipelineProjectId}`)
```
`CanvasGalleryPage/DashboardViewerPage.tsx:104` hits the **same** endpoint.

So the endpoint is already keyed per project and already cached (2h, in pipeline memory).
Persisting per-session would duplicate 2.46MB × N users of a payload that already has one home.

**This also dissolves the question I posted on 08-10** ("per-session or per-project?"). Per-project
already exists. The actual gap is that the pipeline's 2h cache **doesn't survive a restart** — and
that is *precisely* PLT-3025's "persist T1/T2 server-side" half.

⚠️ **Consequence for the split I proposed on the ticket:** the 08-10 entry claimed the two halves
"touch different files, different layers — genuinely independent". **That is now doubtful.** The
best fix for this half routes through the same server-side cache PLT-3025 owns. Do **not** hand
anyone the "viewer vs caching" split as settled — it was built on the wrong premise.

### Correction 2 — there is a fourth option, better than all three in the ticket

The `:407` gate exists because the injected viewer reads the mapping via a **static import**:
`ForgeViewerStatic.ts:22` `import viewerMappingData from "./viewer-mapping.json"`, consumed at
`:205` (`const mapping: any = viewerMappingData`). Confirmed — that constraint is real.

But make the generated viewer read it at **runtime** (`fetch('/viewer-mapping.json')` out of the
Sandpack VFS) and the whole problem inverts:

| | |
|---|---|
| dashboard mounts immediately against an empty mapping | ✅ |
| `ArtifactPanel.tsx:407` gate deleted outright | ✅ |
| viewer colours in whenever the mapping lands | ✅ |
| session persistence needed | **none** |
| server change needed | **none** |
| overlap with PLT-3025 | **none** |

That is the acceptance criterion *"paint non-viewer content in <3s cold; viewer fills in after"* —
which 08-10 said could not be met as written. **It can**, just not via any of the ticket's three
listed routes. Cost: it changes the generated-viewer contract (static-import → runtime-fetch),
which is more than the ticket authorises, so it needs a nod from whoever owns the canvas viewer
before anyone builds it. **Not started for exactly that reason.**

### 🐛 Latent bug found on the way — real regardless of what happens to PLT-2963

`ArtifactSandpack.tsx` `ViewerFilesSync` (~`:229-247`) exists to push **later** mapping/config
updates into the VFS via `updateFile`. Its own comment states the purpose: *"when later viewer
events arrive (e.g. issue enrichment finishes after the base mapping)"*.

**Nothing re-reads those writes.** Both files are static imports in `ForgeViewerStatic.ts`
(`:22`, `:23`), so the mounted bundle never sees an update. Verified repo-wide: the **only**
occurrence of `fetch('/viewer-mapping.json')` anywhere in the app is **inside a comment** at
`ArtifactSandpack.tsx:274`, describing behaviour that does not exist. **No tests on
`ViewerFilesSync`.**

→ Any viewer enrichment completing after the base mapping is **silently dropped**. Issue
enrichment is the case the code itself names.

**Caveat, stated on the ticket too:** only the *injected* viewer component is visible from
hc-frontend. If a pipeline-generated dashboard TSX fetches those files itself, the writes do land
for that dashboard. Needs someone with `XYZ_AgentPipeline/` access to confirm.

Note the symmetry: **option 4 is essentially making `ViewerFilesSync` do what it already believes
it does.** The plumbing is written; it's wired to a static import on the far end.

Posted as comment **109516**.

### Confidence — updated
- **3/10** for the ticket as written — unchanged (duplication *still* unanswered after 5 days,
  `<target>` still blank, most of half 1 lives outside this routine's repo set).
- **9/10 → held, not lowered**, for the FE half — but on **option 4**, not on the 08-10 plan.
  The blocker is no longer a missing fact; it's a yes/no on changing the viewer contract.
- The `ViewerFilesSync` fix is **independently shippable at 8/10** if PLT-2963 stays parked.

---

## 2026-08-14 — ✅ the duplication question answered itself: PLT-3025 shipped this ticket's viewer half

Neither of the two questions outstanding since 08-08 got a human reply (now **6 days**). But they
stopped mattering, because PLT-3025's frontend PR (#2142) was built in the meantime and **the
viewer/first-paint half of this ticket is substantially done.**

### What changed on the PLT-3025 branch

- **`viewer-mapping.json` is gone** — zero references anywhere under `CanvasPage/`. Element data now
  comes from browser DuckDB; the viewer posts SQL to the host page and gets rows back, with named
  queries shipped in `viewer-config.json`.
- **The `ArtifactPanel` whole-dashboard gate is gone** — the condition is now `needsViewer &&
  !isActive`, and the in-place comment says *"The viewer no longer waits on a mapping payload."*

### ⚠️ Supersedes BOTH earlier recommendations in this file

- The **08-10** entry recommended *persist the mapping with the session*. Dead — no mapping exists.
- The **08-13** entry corrected that to *option 4: make the viewer read the mapping at runtime*.
  Also dead, and for a better reason than I gave: the fix wasn't to fetch the mapping later, it was
  to **not have a mapping at all**. My "changes the generated-viewer contract, needs a nod first"
  caveat was directionally right — the contract did change — but it happened under PLT-3025 rather
  than needing a separate decision here.

**Do not act on either entry.** They are kept so the reasoning trail stays legible, not as advice.

### Correction to the 08-13 `ViewerFilesSync` bug report

I reported it as: both VFS files are static imports, so late `updateFile` writes are silently
dropped. **On master that still stands.** On the PLT-3025 branch it is *half* fixed — the mapping is
gone so the enrichment case I named can no longer occur, but `viewer-config.json` remains a static
import (`ForgeViewerStatic.ts:46`) while `ViewerFilesSync` still writes to it. Same shape, far
smaller blast radius (config is small and settled at mount; the mapping was large and genuinely
late). **Downgraded from "shippable standalone fix" to "not worth its own ticket".**

### Recommendation posted (comment 109647)

Close PLT-2963 as superseded — **but** three items in it are untouched by PLT-3025 and would be
dropped on the floor by a plain duplicate-close:

1. Activate a template from the user's prompt (+ serve a matched artefact directly instead of
   regenerating) — **not in PLT-3025 at all**
2. Hydration records have no max age (the `viewer` record was 27 days old and holds the model urn)
3. Room Readiness drill-down: GC actual % + handover milestones — still blocked on where that data
   lives, not on code

Offered to take (1) and (2) as a small self-contained ticket — neither touches PLT-3025's files.

### Confidence

- **Ticket as written: 2/10** — down from 3/10, because most of what it asks for is now either done
  or a duplicate. It is a scoping decision, not a coding task.
- **The three orphan items: 8/10** for (1) and (2) once someone says they want them.

---

## 2026-08-15 — deliberately silent: nothing new, and the ticket is one decision from resolution

**No comment posted this run, on purpose.** Four clarification comments now sit on this ticket
(08-08, 08-10, 08-13, 08-14). The 08-14 one is a day old and ends in a direct, answerable question
("is there anything in the *also outstanding* list you want as a ticket?"). Posting a fifth would be
noise, not information — there is no new code, no new finding, and no new fact since yesterday.

Re-verified this run, nothing moved:
- Status still `Analysis In Progress`.
- No human reply on any of the three open questions — duplication with PLT-3025 (**7 days**),
  the unfilled `<target>` in the acceptance criteria (**7 days**), scope of the orphan items (1 day).
- PLT-3025's #2142 is **merged to master** (14 Aug 17:10), so the viewer/first-paint half described
  in the 08-14 entry above is now on `master`, not just on a branch. That strengthens the
  close-as-superseded recommendation; it does not change it.

**Standing position (unchanged):** this is a scoping decision, not a coding task. The three orphan
items — template activation from prompt, hydration-record max age, Room Readiness drill-down —
are the only scope a plain duplicate-close would drop. (1) and (2) remain 8/10 and self-contained
the moment someone asks for them.

**Guidance for the next run:** do not post again unless there is genuinely new code or a reply.
If this is still silent by ~08-20, the useful escalation is a nudge to a named person rather than
another analysis comment on the ticket.
