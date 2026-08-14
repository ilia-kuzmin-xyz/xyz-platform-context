# PLT-3051 — recommended action (DRAFT ONLY — execute nothing)

**Date:** 2026-08-14 · **Status at triage:** In Analysis, assigned to Darminder, actively being
looked at.

## Chosen action: (a) one internal comment to Darminder — leave it In Analysis

Not Ready for Dev (no confirmed defect location yet — five candidates, `context.md` §4). Not With
Technical Support (nothing needs the customer; this is reproducible in-house on any element). Not
Blocked (Darminder has it and is working). Nobody is waiting on us.

**Is there anything worth saying at all, given he's already on it?** Yes, and specifically because
of *where* he said he'd start. Both comments frame this as "should Forge be providing this data" —
which points the investigation at Forge and at the translation. Reading the code, the property DB is
already loaded in full on the Editor (`viewer-service.ts:948-953`), and there is a **hardcoded
five-name category whitelist between Forge and the panel** that would throw away perfectly good
Forge data without a trace (`element-properties-service.ts:7,171-173,200`). That is our code, not
Forge's, and it is the cheaper thing to check first. Sending him that is not duplicating his work —
it redirects it by one step.

### Draft internal comment (to Darminder Atker) — DRAFT ONLY

> Darminder, one thing to check before going at the Forge side: we filter the properties down to
> five hardcoded groups — Constraints, Identity Data, Phasing, Dimensions, Other — both in the
> `getBulkProperties2` call and again when the results come back
> (`element-properties-service.ts:7`, `:171`, `:200`). Anything in another Revit parameter group is
> dropped silently, and the panel still draws all five headings whether or not they have content, so
> a model whose data sits outside those five looks exactly like this. Quickest way to tell: select
> one element and call `getBulkProperties2` with no `categoryFilter`, and see what `displayCategory`
> values actually come back. If they're outside the five, it's ours; if nothing comes back at all,
> then it really is a Forge/translation question.
>
> Two other things that would produce the same screenshot: if more than one element is selected the
> sections stay empty until you expand one, that's deliberate (`scene-properties.tsx:71`); and if
> the panel is blank rather than showing five empty headings, that's a different path —
> `getInstanceTree()` at `element-properties-service.ts:28` has no null guard and would take the
> whole panel down. Worth knowing which of the two the customer is seeing.

*(One owner, one primary check that returns a value, the two alternatives compressed into a second
paragraph so they don't compete with it. File references are kept because the recipient is the
frontend lead — this is not a message to product.)*

## Before or alongside — free, no code

1. **Open the two attachments** (`image-20260813-133539.png`, `image-20260813-133547.png`) — both
   403 to this run, see `context.md` §6. The first screenshot very likely settles blank-panel vs
   five-empty-accordions, and the header reads "N selected", which settles the multi-select
   hypothesis outright. Two of five hypotheses die on one image.
2. **Confirm which surface** — the Editor's Web Viewer or the Dashboard's 3D view. The Dashboard
   loads models with `skipPropertyDb: true` (`use-model-loader.tsx:239-244`) and has no element
   properties at all by design, so if that is where the customer was looking, this is a product
   conversation and not a bug. Worth asking Yash, who took the report.
3. **Confirm the model's file type** (RVT vs NWD/NWC) — if the federation is a Navisworks export,
   the whitelist would miss on every element in the project, which fits a project-scope report.

## Follow-through if H1 confirms (not executed here)

The fix is small and local: stop hardcoding `DEFAULT_SECTION_NAMES` and build the section map from
whatever `displayCategory` values the model returns, keeping the five as an *ordering* preference
rather than a filter. Both the `categoryFilter` argument (`:171-173`) and the receive-side guard
(`:200`) have to change together — dropping only one leaves the other still filtering. Worth a
warning log on the discard path either way; it is currently completely silent, which is why this
took a ticket to notice.

**What remains unverified:** everything about LVN BL1-2 specifically. The mechanism above is read
line-by-line and I am confident in what the code does; which of the five candidates explains *this*
report is not established, and cannot be from this repo. Nothing here was built or run.
