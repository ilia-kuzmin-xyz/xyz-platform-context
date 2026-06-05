# MOD — Modes & Intents

## `mode` field (request body)

Controls which pipeline branches run.

| mode | Runs | Use case |
|------|------|----------|
| `'dashboard'` (default) | All phases (0a → 0b → 0c? → 1 ∥ 2) | Normal chat turn |
| `'ask'` | 0a → 0b → ask_agent → 2 (filtered) | Short computed-value question |
| `'hydrate'` | 0a → 0b → 2 (filtered) | Session restore: re-fetch data for saved TSX |

---

## Intent types (`intent_classifier.py`)

Pure function — no LLM call. Classifies the turn before the composer sees it.

| Intent | Condition | Effect |
|--------|-----------|--------|
| `FRESH` | New question, no prior artifact | Composer writes from scratch |
| `EDIT` | Edit keywords present + prior artifact exists (thread or `prior_artifact` body) | Composer receives prior TSX; edits in place |
| `SKETCH` | `sketch` field in request body | Composer receives tldraw shapes as layout blueprint |
| `SWITCH_PROJECT` | Resolved project differs from thread's sticky project | Clears `last_artifact`; treats as FRESH for the new project |
| `OFF_TOPIC` | Short non-data query | Returns a canned text response; skips hydration |

---

## EDIT turn mechanics

1. `thread_store` holds `last_artifact: { tsx, title, summary, domainsRead }` per thread.
2. Composer receives `prior_artifact_for_composer = thread.last_artifact.tsx`.
3. **Fallback**: if `thread_store` was evicted (pipeline restart), the frontend can send `prior_artifact` in the request body. `server.py` uses it as fallback when the thread has no `last_artifact`. This is why restored sessions can still be edited.

---

## Thread store (`thread_store.py`)

In-memory, LRU max 5000 threads, 6h idle TTL. Holds:
- `project_id` (sticky across turns)
- `project_name`
- `last_artifact` (title + summary + tsx + domainsRead + user_question)
- `turn_count`

`SWITCH_PROJECT` clears `last_artifact`. Thread store is NOT persisted — wiped on server restart. The frontend is the source of truth for artifact TSX.

---

## Ask mode routing

`mode='ask'` → ask_agent generates a spec: `{ type, label, fn, followUp, domainsRead }`. Then hydrators run for only the domains in `domainsRead`. The JS `fn` runs on the frontend against the hydrated data to produce the inline result.
