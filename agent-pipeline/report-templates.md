# TPL — Named report templates

A **template** makes the composer produce a fixed, approved layout for a
recognised question shape instead of improvising one. First and currently only
template: **Room Readiness**.

Code: `agents/report_templates.py`. Design/status of the first one:
[planning/room-readiness-template.md](planning/room-readiness-template.md).

---

## How it works today

A template is a **prompt fragment**, not a stored file. When one is active, its
text is appended to the composer's system prompt and Claude still generates the
TSX — constrained, but generated.

```
server.py  active_template ─┐
                            ├─ get_template_prompt(name) → str | None
agents/report_templates.py ─┘
                            └─ stream_artifact_composer(..., template_prompt=…)
```

**Placement matters.** The fragment goes in AFTER the two cached static blocks
(base prompt, design system) and before the per-request user prompt. Inserting
it earlier changes the cached prefix and costs a cache miss on the design-system
block for every template request.

**Non-template requests see a byte-identical prompt to before.** That isolation
is the whole safety argument for adding templates, and
`tests/test_composer_prompt_isolation.py` asserts it.

A template dictates WHAT blocks and layout; the design system still owns HOW it
looks. Templates must reference design tokens, not literal hexes, or the two
fight — the one exception is a report matching an approved design 1:1, where the
design's hexes are authoritative (Room Readiness does this, and says so).

---

## Activation

```python
# server.py, after the clarifier
if profile["capabilities"]["rooms"] and clarifier_answers:
    if any("room readiness" in str(v).lower() for v in …):
        active_template = "room_readiness"
```

**Known gap — the survey is the only way in.** Detection is a substring match
over the clarifier answers, so:

| user does | template fires? |
|---|---|
| asks broadly, ticks *Room readiness* in the survey | ✅ |
| asks explicitly, ticks it | ✅ |
| asks explicitly, does not tick it | ❌ generic report |
| **skips the survey** | ❌ generic report, however explicit the ask |

The last row is the defect: `clarifier_answers is None` bypasses detection
entirely. The intended fix is to let **Claude** decide rather than a substring —
and the cheapest place is the clarifier call itself, which already runs on turn
1, already sees the raw message and profile, and already returns JSON. Add a
`"template"` field to its output, persist it on `ThreadState`, and read it on
the compose turn, with the survey tick as an override. That costs no extra LLM
call, because the clarifier runs *before* the user clicks Skip.

Do NOT reach for a keyword function here. It was explicitly rejected: we cannot
predict how people will phrase a request.

---

## Conditional data phases

A template usually needs data no ordinary report fetches. That work must be
gated on the template being active, or every request pays for it.

Room Readiness adds **Phase 0c½** (`rooms_readiness.py`, ~60 s cold, T2-cached
2 h), which runs only when `active_template == "room_readiness"`. It emits
`artifact_data_partial(domain="rooms")` and — because it runs before the viewer
mapper — hands its room→element index over for `roomDbIds`.

Failure downgrades rather than errors: no rollup → `active_template = None` →
generic dashboard.

---

## Adding a template

1. Write the prompt fragment in `report_templates.py`, register it in
   `TEMPLATE_PROMPTS`.
2. Add its option to the clarifier's modules multi-select, gated on a
   `capabilities.*` flag so it is only offered where it can be built.
3. Add any conditional data phase to `server.py`, gated on `active_template`.
4. Extend `test_composer_prompt_isolation.py` so the non-template prompt stays
   byte-identical.

---

## Where this is heading

The current design still pays full generation cost — the composer runs every
time, so a template request is no cheaper or faster than a fresh one (marginally
more expensive: the fragment adds prompt tokens).

The intended end state is two paths: **matches a template → serve the artefact
directly and hydrate it, no Claude tokens, seconds not minutes**; **no match →
generate from scratch as today**. `reference/room-readiness-artifact.tsx` is a
hand-built proof that a fixed artefact hydrates correctly through the normal
data path; wiring it into the pipeline is the remaining step.

Either way the result stays chat-editable — a template is a starting point, and
EDIT intent works on it like any other dashboard.
