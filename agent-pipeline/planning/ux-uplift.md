# UX Uplift — Brief Mode & Cold Start

> **Status: CONCEPT — not yet implemented.**
> Moved from `XYZ_AgentPipeline/docs/ux-uplift-plan.md`.

## Two gaps

**G1 — Cold start.** User types *"what's up"* with no project on the thread. Resolver fails. User has to retype with a project name. Loses them in the first 30 seconds.

**G2 — One-liner shape mismatch.** User types *"how is it going"*. Today: classified as `FRESH` → 7-question survey → 3 min dashboard. User wanted 3 sentences.

---

## The two surfaces — strict separation

| Lives in chat | Lives on canvas |
|---|---|
| Project disambiguation ("Which project?") | Survey card (explicit dashboard requests only) |
| Brief answers (markdown, conversational) | Generated dashboard (TSX) |
| ASK results (tables, lists) | — |
| Drill-in offers | — |

---

## Scenarios

**Scenario 1 — Cold start**: user types vague message → assistant asks "Which project?" in chat → user names project → brief runs against original question. No error event.

**Scenario 2 — Short question**: *"how is it going"* → classified as `BRIEF` → ~5–8 s → markdown answer in chat with 3 bullets + drill-in offers. Canvas stays empty.

**Scenario 3 — Explicit dashboard**: *"build me a dashboard"* → `FRESH` → existing clarifier survey + composer. Unchanged.

---

## Surface routing

| Question shape | Routes to | Surface |
|---|---|---|
| Vague + no project | Assistant asks back | Chat |
| *"what's up"* / *"how is it going"* / *"catch me up"* | Brief agent | Chat |
| *"build a dashboard"* / *"create a report"* | Clarifier → composer | Canvas |
| *"show me overdue activities"* | ASK agent | Chat |
| OFF_TOPIC | Plain text | Chat |

---

## Changes

### New intent: `BRIEF`

Replace regex classifier with a **single Haiku call** (`classify_intent`) that understands semantic meaning. Old rule-based classifier kept as fallback (`classify_intent_rule_based`). Rules:
- When BRIEF and FRESH both fit → pick BRIEF (user can ask for full dashboard next turn)
- EDIT only valid when `has_prior_artifact=true`
- Max 200 tokens, `temperature=0`, JSON mode, ≤800 ms p99

### New agent: `brief_agent.py`

5 shapes: `overall_health`, `whats_changed`, `schedule_outlook`, `risk_brief`, `progress_snapshot`. Single Haiku call. No new MCP calls — reuses `DataAccessor` + selective hydration per shape.

### Resolver additions

1. **Single-project shortcut**: 1 project → resolve without scoring
2. **Recency tiebreaker**: low-confidence match + 1 recently-accessed project → resolve to it, show "Showing project X — switch?" toast
3. **Plain-text disambiguation**: when neither fires → emit chat message "Which project?" with `pending_question` in thread. Next turn names project → brief runs on held question. No error SSE.

---

## Files changing

| File | Change |
|---|---|
| `agents/intent_classifier.py` | Add `Intent.BRIEF`; async Haiku call + fallback |
| `agents/brief_agent.py` | NEW — 5 shapes |
| `agents/project_resolver.py` | `_only_project()`, `_recent_project()`, `pending_question` handling |
| `agents/thread_store.py` | + `pending_question`, `project_resolution_method`, `last_brief_shape` |
| `agents/clarifier.py` | Skip survey when intent is `BRIEF` |
| `server.py` | `BRIEF` branch; `pending_question` handling; no error SSE on resolver miss |

**No change to:** hydrators, data_accessor, caches, artifact_composer, tools, profiler.

## Two PRs

**PR-1**: classifier + cold start (BRIEF branch returns placeholder).  
**PR-2**: brief_agent.py + wire into BRIEF branch.
