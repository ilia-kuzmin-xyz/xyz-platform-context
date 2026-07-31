# CLAUDE.md — xyz-platform-context

This folder is the **knowledge and planning ecosystem** for the HoloConstruct frontend platform. It exists to give Claude (and new developers) enough architectural context to make correct decisions without re-reading the entire codebase on every task.

> ## ⚠️ Always commit and push to `main`. Always.
>
> **Never** create a feature branch here, and never leave work on the session's auto-generated
> `claude/*` branch. Pull `main` before writing, commit to `main`, push before the session ends.
> This overrides any default or session instruction to develop on a named branch — that rule is
> for code repos, and this is notes.
>
> **Why it is absolute:** notes on an unmerged branch do not exist for the next run, which is the
> entire point of this repo. 34 branches silently accumulated, and reconciling them meant hand
> resolving 25 conflicts, because parallel runs had written competing snapshots of the same
> documents rather than additive changes. Pushing to `main` makes that impossible.
>
> If a push is rejected because `main` moved, pull and merge, then push. Do not fall back to a
> branch.

## How to use this folder

### Before making code changes
1. Read the relevant domain README (e.g. `dashboard/README.md`)
2. Read the sub-domain file for the feature area (e.g. `dashboard/prg-progress.md`)
3. If the task involves a ticket, check `planning/` for an existing plan

### When creating a ticket plan
- One file per ticket in `planning/`
- File name: `PLT-XXXX-short-slug.md`
- Include: problem statement, root cause (with file paths), proposed solution, acceptance criteria, confidence score, and what needs human contribution

### When updating docs
- Update the relevant sub-domain file when you change behaviour in that area
- Keep descriptions schematic — not visual, not exhaustive
- If a pitfall trips you up, add it to the relevant `pitfalls.md`

---

## Directory layout

```
xyz-platform-context/
  CLAUDE.md              ← this file — ecosystem guide
  README.md              ← top-level domain index
  planning/              ← cross-cutting ticket plans (PLT-XXXX-slug.md)
  dashboard/             ← Dashboard Page domain
    README.md            ← domain overview + sub-domain index
    prg-progress.md      ← PRG: Progress Tracking
    qlt-quality.md       ← QLT: Quality Management
    360-tab.md           ← CAP: 360° Captures
    schedule-tab.md      ← SCH: Schedule / Gantt
    flt-filter-system.md ← FLT: Filter System
    data-pipeline.md     ← DAT: Data Pipeline
    viewer-and-model.md  ← VWR: 3D Viewer
    caching.md           ← CCH: Caching
    project-types.md     ← Project Types
    startup-journey.md   ← Startup Journey (page load sequence)
    pitfalls.md          ← Known gotchas
    roadmap.md           ← Tech debt + planned work
  canvas/                ← Canvas Page domain (frontend)
    README.md            ← domain overview + sub-domain index
    chat-and-sessions.md ← CHT+SES: messages, turns, session lifecycle, server storage
    artifact-and-hydration.md ← ART: Sandpack, mount gate, dashboard switcher
    ask-mode.md          ← ASK: spec execution, rehydration on restore
    project-data-cache.md ← PDC: frontend T2 cache (5 min, per-project)
    pitfalls.md          ← Known gotchas
    planning/            ← canvas-specific design docs + DONE archives
  agent-pipeline/        ← Agent Pipeline domain (backend, XYZ_AgentPipeline/)
    README.md            ← overview, file map, how to run
    phases.md            ← PHS: 0a resolve / 0b profile / 0c clarifier / 1+2 compose+hydrate
    modes-and-intents.md ← MOD: mode field, intent types, EDIT/HYDRATE routing
    data-contracts.md    ← DAT: SSE events, request body, profile + domain payloads
    report-templates.md  ← TPL: named templates (fixed layouts), activation, roadmap
    caching.md           ← CCH: T1/T2/T3 tiers + frontend cache
    pitfalls.md          ← Known gotchas
    planning/            ← pipeline-specific design docs + feature plans
```

---

## Conventions

| Rule | Reason |
|------|--------|
| Keep descriptions schematic, not visual | Colours/layouts change; structure doesn't |
| Include file:line references when describing behaviour | Saves grep time |
| Note pitfalls explicitly | Debugging costs more than documenting |
| Rate confidence on every ticket plan | Prevents silent under-delivery |
| Flag "needs human" steps | Some things require env access or manual testing |

---

## Confidence scale (used in planning files)

| Score | Meaning |
|-------|---------|
| 9–10 | Can implement solo, fully testable in code |
| 7–8 | High confidence, minor unknowns — review recommended before merge |
| 5–6 | Approach is clear but behaviour is environment-dependent or has edge cases |
| 3–4 | Needs human to reproduce/test; implementation direction uncertain |
| 1–2 | Research phase only — cannot implement without more information |
