# PLT-3060 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (b) — post the mechanism to the assignee and recommend moving to Ready For Development

**Owner: Ilia Kuzmin. Addressee: Darminder Atker (assignee), cc Yash Patel.**

Rationale, per `incidents/live-incident-playbook.md`:
- **Not (a) clarifying question first.** The customer's own repro is a complete, numbered,
  unambiguous sequence — nothing about the symptom is in question. The mechanism is also already
  traced to a specific code guard, not a mystery needing more facts from the reporter.
- **Ready For Development, not Blocked or With Technical Support.** Nothing external blocks a fix;
  the guard (`filter-service.ts:803`) and its side effect are both named. This is unusually far along
  for a same-day ticket — worth saying so rather than treating it as a fresh Group A unknown.
- **Not closing the loop entirely ourselves** — the fix approach (when to safely publish
  `allowedDbIdsByModel` on a model-triggered recompute without reintroducing whatever redundant-work
  problem the `executedOutsideFilterPanel` guard was added to avoid) is a real design decision for
  whoever picks this up, not a one-line patch to hand over blind.

## Draft comment (internal, on PLT-3060)

> @Darminder Atker — traced this one. The model switcher (`tree.tsx:79-119`) hides any node whose root
> dbId isn't in `allowedDbIdsByModel` once a filter is active. That map only gets rebuilt when
> `filter-service.ts`'s `onElementsUpdate` runs with `executedOutsideFilterPanel !== true`
> (`:803-813`) — but a newly-opened model triggers `onElementsUpdate` through the *element-load* path
> (`:1059-1073`), which calls `applyFilters(viewer, true)`, i.e. `executedOutsideFilterPanel = true`.
> So the map never gets the new model's entries, the switcher can't find a match for it, and
> `filterTree` drops the whole node — even though the user is trying to open it, not just view it
> filtered. Clearing the filter shows the raw unfiltered list again, which is exactly what the repro
> describes.
>
> Looks fixable by either (a) publishing `allowedDbIdsByModel` for the specific newly-loaded model
> even when `executedOutsideFilterPanel` is true, scoped to just that model so it doesn't reintroduce
> whatever cost that guard exists to avoid, or (b) having the switcher tree treat "loaded but not yet
> in the filter map" the same as "unloaded" (i.e. always show it) rather than treating "not yet
> filtered" as "filtered out." Recommending this go to Ready For Development — the mechanism is
> code-confirmed, not guessed at, and nothing here needs anything further from the customer.
>
> One thing worth a two-minute check before dev: does this reproduce with model filters other than
> "Progress – Linked"? Nothing in the code path is specific to that filter type, so it likely
> generalizes, but worth confirming since it changes how the fix should be tested.

## Why this and not the others

- **Not With Technical Support.** Nothing further is needed from the customer; Yash's own repro
  already has everything.
- **Not Blocked.** No external dependency.

## Follow-through a human should own (not executed here)

- **Pick a fix direction** (scoped map backfill vs. switcher-side "not yet filtered ≠ filtered out"
  treatment) — a real design call, not obvious which is cheaper/safer without seeing the surrounding
  code for the `executedOutsideFilterPanel` guard's original intent.
- **Test across filter types**, not just Progress – Linked, per the open question above.
- **Optional:** watch the attached screen recording for any detail beyond the text repro (e.g. a
  brief flash before the model vanishes, consistent with the 200ms debounce in
  `filter-service.ts:61-69`) — not blocking, the text repro is sufficient to proceed without it.
