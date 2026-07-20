# PLT-2909 — recommended action (DRAFT ONLY — do not execute)

> Playbook rule applied: **"the diff is the diagnosis."** We conclude 2909 is most
> likely **not** the same root cause as 2882 (opposite symptom shape; different
> symptom-producing code path). So the drafted action **gently un-conflates them** and
> hands over **one** concrete test that settles which family 2909 belongs to — rather
> than assert a verdict. Nothing is posted to Jira; a human reviews and sends.

## Recommended next step

**Post one comment on PLT-2909**, replying to Ilia (who owns the ticket) and cc Yash
(who already raised the doubt). Keep 2909 **In Analysis**; do **not** link it to 2882 as
"duplicate/same cause". If anything, **link it to PLT-2385** as related.

### Why this and not "wait for the 2882 fix"

- The symptom is the **opposite shape** to 2882: 2909 shows **too many** models,
  2882 shows **nothing**. The 2882 fix (removing links that resolve to nothing) does not
  touch the 2909 code path (a model node added *despite* zero resolved dbIds).
- 2882's own root cause is **currently disputed** (David Webb, BE). Pinning 2909 to an
  unconfirmed theory compounds risk.
- 2909 fits **PLT-2385** (shared Revit unique IDs → one element fans out to several
  models; links not pruned on re-version), which is already Ready-For-Dev.

## Drafted comment (message-craft per playbook: routed, hypothesis-as-question, one test, explicit scoping)

> @Ilia Kuzmin @Yash Patel — I looked at the code path behind the "linked models" panel
> and I think Yash's instinct is right: this is probably **not** the same root cause as
> PLT-2882, even though it's the same linking area.
>
> The shapes are opposite. PLT-2882 = select/isolate returns **nothing** (links point at
> elements that no longer exist, so they get dropped). PLT-2909 = the panel shows **too
> many** models (extra models that contain none of the activity's linked elements). One
> is under-inclusion, the other over-inclusion — different code paths, different fixes.
>
> Mechanism I found: the panel maps each linked element to **every** model row it has in
> `project_element_list` (one element ID can legitimately belong to several models —
> shared Revit unique IDs), and it still renders a model node **even when that element's
> geometry doesn't resolve in that model**. That over-lists models. This looks much
> closer to **PLT-2385** (DC10 links retained across PC + QA models via shared unique
> IDs) than to 2882.
>
> One test settles it — for `CY-5200` on `29475-16-RL3` / ATL08:
> 1. list the linked `modelElementId`s for the activity;
> 2. for each, run `SELECT modelId, sourceFileElementId FROM project_element_list WHERE
>    modelElementId = '<id>'` — **do any single IDs come back under more than one
>    modelId?**
> 3. for each extra model shown in the panel, is the element's `sourceFileElementId`
>    actually present in that model's geometry, or is it a **bare node** with no
>    resolvable dbId?
>
> - If IDs fan out across live models → it's the **PLT-2385** shared-ID family (link
>   dedup / lifecycle, BE/data-pipeline).
> - If the extra models are **superseded versions** whose rows lingered → that's a
>   re-version/stale-metadata issue (shares 2385's mechanism #6; only *loosely* related
>   to 2882).
> - Either way the fix differs from 2882, so I'd keep them as separate tickets and link
>   this one to 2385 instead. Happy to pair on the query.
>
> Separately and unrelated: the "couldn't generate session id" error you hit is its own
> thing — not part of this symptom. If it keeps happening, let's raise it on its own so
> it doesn't muddy this one. What did the error say?

## Message-craft checklist (from playbook § Message craft)

- **Routed, one owner:** addressed to Ilia (owner), cc Yash (raised the doubt).
- **Hypotheses as questions**, not assertions ("do any single IDs come back under more
  than one modelId?", "is the element actually present in that model's geometry?").
- **The diff is the diagnosis:** one closed, runnable test with three branches, each
  mapping to a concrete family/owner.
- **Explicit scoping:** states plainly this is likely *not* 2882 and *why*; proposes
  linking to 2385 instead of 2882.
- **Side-signal split loudly:** the "generate session id" error is quarantined into its
  own closing paragraph, labelled unrelated, with a routed one-line question — not folded
  into the main analysis.
- **No premature closure / no prod action:** this is analysis + a test request only.

## Do NOT (guardrails)

- Do **not** mark 2909 a duplicate of 2882, and do **not** assume the 2882 fix covers it.
- Do **not** merge 2909 into the 2385 cluster automatically either — link as *related*
  and let the query confirm the family first.
- Do **not** speculate on the two screenshots' contents (NEEDS HUMAN in context.md).
- Do **not** conflate the session-id error with the linked-models symptom.
- Draft only — a human sends any Jira comment / link / transition.
