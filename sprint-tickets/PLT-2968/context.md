# PLT-2968 — Asset details, readiness tag **override** context menu

**Type:** Task (Critical) · **Domain:** Commissioning / viewer Assets panel
**Jira:** https://xyzreality.atlassian.net/browse/PLT-2968 · **Sibling:** PLT-2967 (same kebab menu)

**Status after 2026-08-24 run: `Analysis In Progress`. Genuinely not built. No branch, no PR.**

---

## 2026-08-24 — real work, but blocked on three decisions

### Where it goes

`assets-panel/readiness-ladder.tsx`. The kebab (`:178`) and its `StyledMenu` (`:242`) already
exist with one item, `View tasks`. **Adding a second menu item is trivial. Everything behind it
is not.**

### Blocker 1 — no override exists in the model

Grepped the app: nothing readiness-shaped uses "override" (only test-fixture `overrides` params).
The commissioning table census in `commissioning/data-layer.md` (verified 12 Aug 2026, 14 tables
on both `dev` and `stable`) has **no override table and no override column**:

`asset`, `asset_type`, `asset_element_link`, `task_template`, `task_item`, `task_instance`,
`task_instance_item`, `task_folder`, `tag`, `workflow`, `workflow_tag`, `workflow_tag_task`,
`readiness_task_link`, `element_task_status`.

So persistence is undecided: a new `readiness_override` table (asset × workflow step + who/when/
why), columns on an existing row, or client-only for the MVP — which carries the standing
commissioning caveat that it is per-browser and invisible to teammates.

### Blocker 2 — an override changes the readiness cascade, and that reaches far

`use-readiness-steps.ts:52-56` derives everything from task instances alone:

```
achieved  ⇔  the step has ≥1 instance AND every instance is complete
active    =  the FIRST non-achieved step
locked    =  neither achieved nor active
```

The moment a tag can be achieved by fiat, that rule changes — and the same rule (or a copy) drives:

- the tag chip on the asset list and asset cards — `use-asset-current-tag.ts`
- the "Affects Systems" step rows on the detail panel (the reason `use-readiness-steps` was
  extracted in the first place — see its docblock: two copies of the rule would drift)
- the viewer's readiness colouring and legend — PLT-2990 / PLT-2991 (PR #2170)
- whatever the Commissioning dashboard counts as complete

If an override is meant to be **cosmetic only**, that has to be said explicitly, because
"the tag status should update with override" reads as "counts as achieved".

### Blocker 3 — the modal's fields are unknown

The three screenshots don't come through the Jira API and
`Commissioning Platform (standalone).html` is 403 to `WebFetch` and rejected by the `Artifact`
tool. "Complete details" could be a reason, free text, evidence, a signatory, an explicit date.

### Questions posted on the ticket

1. Does an overridden tag count as **achieved** (unlocking the next tag, changing chip/colour) or
   is it annotation only?
2. What fields, and which are mandatory?
3. Persistence — BE/Supabase ticket needed, or client-only MVP?
4. Can it be revoked? What if the underlying tasks later complete or re-open?
5. Permission-gated, or any project member?

1–3 unblock implementation.

### Next run

Once answered, the build order is: extend the ladder's `StyledMenu` → override modal → thread the
override into `use-readiness-steps` so `achievedOf()` consults it → then check every consumer in
Blocker 2. Do **not** patch `achieved` in the ladder component only; the rule was deliberately
centralised in the hook.

---

## 2026-08-25 — second run: still blocked, no new information

Re-checked at the start of the scheduled run. **No answer posted; the 08-24 analysis stands.**

- Ticket is still `Analysis In Progress`; the only comment is our own 08-24 clarification.
- **Did not re-comment** — re-asking the same questions would only bury the original ask.
- **The design screenshots are unreachable from this environment, confirmed twice.** Jira's
  `/rest/api/3/attachment/content/<id>` is **403** without a bearer token and the MCP `fetch` tool
  takes an ARI, not a URL. The `claude.ai/design/p/...` share link is equally closed. Don't retry.
- Blockers 1 and 2 (no override anywhere in the data model; the readiness cascade in
  `use-readiness-steps.ts:52` reaches the asset chip, Affects Systems, the viewer legend and the
  dashboard) are **design/persistence decisions, not research gaps**. More code reading will not
  resolve them, which is why this run did not attempt it.

This one is the riskier of the pair — it is `Critical` priority but needs a persistence decision
and touches the readiness cascade app-wide. Worth raising verbally rather than waiting on Jira.

### 2026-08-25 — verified the 08-24 claims independently, and one of them was too optimistic

Re-read the code rather than trusting the previous run's summary. Three corrections/refinements
that change the blast radius, all confirmed by grep on `PLT-2953` (post-merge with master):

1. **The achieved rule is duplicated across two hooks, not centralised.**
   `use-readiness-steps.ts:53-56` computes `achievedOf` (`list.length > 0 && list.every(isInstanceComplete)`),
   and its own doc comment (`:32-35`) says it was extracted precisely so that "two copies of the
   achieved/locked rule would [not] drift". But `use-asset-current-tag.ts:120` still has its own
   independent copy — `statuses.every(entry => isInstanceComplete(entry.status, entry.type))`.
   So an override has to be threaded into **both**, or the ladder and the asset card/viewer colour
   will disagree about the same asset. The 08-24 note's "the rule was deliberately centralised in
   the hook" is only half true — believe the grep, not the comment.

2. **Two different hooks are both called `useReadinessSteps`.** `app/hooks/useReadinessSteps.ts:23`
   takes `(projectId)` and returns the project's **tag catalogue**;
   `assets-panel/use-readiness-steps.ts:37` takes `(projectId, assetId, assetTypeId)` and returns
   **one asset's ladder**. `use-asset-current-tag.ts` imports the *former*. Easy to wire the wrong
   one — check the import path, not the name.

3. **The viewer legend does not add a third copy.** PLT-2990/PLT-2991 merged to master today
   (`e296a98`) and `legend/use-legend-items.ts` only maps the tag catalogue to label+colour rows
   (`:34-44`); it derives no achieved state. Element *colouring* goes through the
   `use-asset-current-tag` path, so it is covered by correction 1 rather than being separate.

Net effect: the override has **two** derivation sites to change, not one, and the second one feeds
the viewer. That makes "client-only for the MVP" noticeably less attractive — two hooks reading a
per-browser override is where drift will show up first.
