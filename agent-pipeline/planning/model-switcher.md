# Model Switcher in Chat — Concept

> **Status: CONCEPT — needs design review before implementation.**
> Do NOT implement until concept is reviewed and approved.

## Problem

The pipeline model is hardcoded in `agents/config.py` as `claude-opus-4-7`. Users have no way to trade latency for cost (or vice versa) per request. A quick question doesn't need Opus; a complex multi-domain dashboard might.

---

## What we want

A per-request model selector in the chat input area. User can pick:
- **Opus** (default) — highest quality, ~30–55 s compose
- **Sonnet** — faster + cheaper, slightly lower quality
- **Opus Fast mode** — Opus with faster output streaming (if available as a separate flag)

The selected model persists for the session (not per-message) but can be changed at any time.

---

## Backend changes

### `POST /api/chat` — new optional `model` field

```json
{
  "message": "...",
  "model": "claude-opus-4-7" | "claude-sonnet-4-6" | null
}
```

- `null` or absent → use `ANTHROPIC_MODEL` from `agents/config.py` (current behaviour, unchanged)
- Explicit value → override for this request only

`artifact_composer.py` receives the model override and passes it to the Anthropic streaming call. Same for `ask_agent.py` and `clarifier.py` (or only the composer — clarifier and ask use Haiku regardless).

**Security note**: should we allowlist models on the backend to prevent clients sending arbitrary model IDs? Probably yes — validate against a known list.

### Pricing

`agents/config.py` currently hardcodes cost constants. With per-request model, cost logging needs to look up the right constants per-model. Table-driven pricing lookup.

---

## Frontend changes

### UI placement options

**Option A — Toggle in text field (inline)**

Small model badge/button alongside the send button:
```
┌─────────────────────────────────┬────────┬────────┐
│  Type your message...           │ [Opus▾]│  Send  │
└─────────────────────────────────┴────────┴────────┘
```
Click → dropdown with 3 options. Currently selected model shown as badge.

**Pros**: always visible, minimal footprint.
**Cons**: adds visual noise to the main input.

**Option B — Settings icon → popover**

A small ⚙ icon right of the text field. Click → popover with model + other settings (use_cache toggle, skip_clarifier, etc.).

**Pros**: groups all "advanced" settings; cleaner main input.
**Cons**: model is not immediately visible; extra click.

**Option C — Keyboard shortcut / command**

Type `/opus`, `/sonnet` as a slash command prefix to set the model for this message.

**Pros**: power-user friendly; zero UI added.
**Cons**: discoverable only if user knows about it; inconsistent with the rest of the UI.

---

## "Fast mode" — what is it?

The user mentioned "Opus fast mode." This likely refers to the pipeline's ability to stream faster (not a different Claude model). Options:
- **Claude Opus with faster sampling** — the API doesn't currently have a "fast mode" toggle; faster = cheaper model or lower `max_tokens`
- **Speed-optimized pipeline** — reduce number of MCP probes, use cached profile, skip clarifier — this is a pipeline config, not a model change
- **Streaming token priority** — some providers offer streaming-optimized endpoints

This needs clarification: is "fast mode" a different model or a pipeline mode (fewer phases)?

---

## State management

Model selection lives in `useCanvas.ts` as `selectedModel: ModelId | null`. Default `null` (use pipeline default).

Persisted: `canvas:model:v1` in localStorage (like the existing `canvas:mode:v1` dashboard/ask toggle). Per-user preference, not per-session.

---

## Open questions

1. **Scope of override**: does the model affect only the composer? Or also clarifier, ask agent, brief agent? (Clarifier probably always stays cheap; ask agent might benefit from Sonnet.)

2. **What is "fast mode"?** Need to confirm: is this a separate model endpoint, Opus with reduced `max_tokens`, or a pipeline mode (skip phases)?

3. **Show cost in UI?** After a turn completes, the `done` event includes `estimated_cost_usd`. Should we show this per-turn in the chat? Useful context when picking a model.

4. **Default model locked per project?** Some projects might always want Sonnet (simple dashboards); others always need Opus (complex multi-domain). Per-project default could be set in settings.

5. **Backend allowlist**: which model IDs do we support? Current: `claude-opus-4-7`. Add: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`?

---

## Files that would change

| File | Change |
|------|--------|
| `agents/config.py` | `SUPPORTED_MODELS` list + per-model pricing table |
| `agents/artifact_composer.py` | Accept + forward `model` override to Anthropic API call |
| `agents/ask_agent.py` | Same |
| `server.py` | Parse `model` from request body; validate against allowlist; pass through |
| `useCanvas.ts` | `selectedModel` state + localStorage persistence |
| `ChatPanel.tsx` | Model selector UI (Option A/B/C) |
| `canvas.types.ts` | `ModelId` type |

---

## Not implementing until

- [ ] "Fast mode" definition clarified (model vs. pipeline mode)
- [ ] UI placement option chosen (A/B/C)
- [ ] Model allowlist confirmed
- [ ] Scope of override agreed (composer only vs. all agents)
- [ ] Cost display decision made (show per-turn cost in chat?)
