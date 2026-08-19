# PLT-3044 — "CH08x - Dashboard showing Disciplines that we do not track such as Procurement, Design and Milestone" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-3044
- **Status:** Open · **Priority:** Medium
- **Reporter:** Yash Patel · **Assignee:** Darminder Atker
- **Created + last updated:** 2026-08-13 (all activity same day)
- **Attachments:** none
- **Project:** CH08x (same client family as PLT-3040, "CH08-Minooka", triaged 2026-08-12)
- **Domain slug:** `filter-system` — the report is about what the **Project Area** filter section
  offers, i.e. FLT (`dashboard/flt-filter-system.md`), not about a progress number

---

## 2026-08-14 — first triage. Already resolved conversationally; recorded for the archive

New folder this run — there was no prior investigation of this ticket.

### The report (verbatim description)

> "Can I ask it to be removed from the dashboard discipline visualization please? Client doesnt want
> to see it there. It comes up once we filter the 'Project Area' under filters. Thanks, Thiago Santos"

Relayed by Yash from the client's Thiago Santos. In plain terms: under **Filters → Project Area**,
the dashboard offers values the client does not track — **Procurement, Design, Milestone** — and they
want them gone.

### Chronology — three comments, all 2026-08-13, and the third closes it

| Author | Comment |
|---|---|
| Thomas Masdin | "@Yash @Pietro @Mostafa This seems to have been made on Holosite board by mistake?" |
| Pietro Desiato | "moved" |
| **Mostafa Kamel Hussien** | **"@Pietro already raised it with Hussein. Its about how they map the schedule. nothing from our side. I think we can close the ticket."** |

**Mostafa's comment is a product verdict, not a hypothesis.** He states three things: (a) the cause is
how the client maps their schedule, (b) it has already been raised with the client's own side
(Hussein), and (c) close the ticket. Nobody has contradicted him, and the ticket has sat Open with no
further activity since.

### Why this run did not re-diagnose it

Per the run protocol's "know when to stop": the owning product person has given a cause and a
disposition on the same day the ticket was filed, and the remedial action sits with the client's
schedule team. Re-deriving the mechanism from the parquets would produce a finding nobody is waiting
for. What follows is one paragraph for future reference only.

### Mechanism, for reference only — how a "Project Area" value gets into the filter panel

**Verified by reading the code, not by running anything.** "Project Area" is not a first-class
dashboard concept. Discipline and Package are the only two *core* category types; everything else —
phase, area, zone, and anything else the client's schedule carries — is a **dynamic category type**
rendered generically. `buildDynamicCategoryTypes` (`app/pages/organisation/ViewerPage/components/dashboard-panels/common/dashboard-filters/dashboard-filter-utils.ts:238-306`,
invoked from `extractFilterOptions` at `:181`) takes the category types the project defines
(`categoryMappingService.getCategoryTypes()`, filtered to non-core at `:243-246`) and populates each
section with the **distinct values actually present in the client's own schedule data** — the
`availableCategoryValues$` stream the schedule service derives from the `activity_categories_flat`
DuckDB table (`services/dashboard-schedule/dashboard-schedule-service.ts:68-73`, consumed at
`dashboard-bar/filters/dashboard-filters.tsx:81-91`). A type with no schedule values is skipped
outright (`dashboard-filter-utils.ts:278`).

**There is no allow-list and no curation anywhere in that path.** Whatever distinct values the
client's schedule mapping puts in that column is exactly what the panel offers — so "Procurement",
"Design" and "Milestone" appearing under Project Area means those strings are in the client's
schedule category mapping. That is precisely Mostafa's "it's about how they map the schedule; nothing
from our side", and it is why the fix is upstream in their mapping rather than in our filter panel.

**Pattern fit:** this is Pattern 2 (`recurring-defect-patterns.md`) in its cleanest form — the
frontend renders faithfully and the content is upstream — with a twist worth noting: it is the
*inverse* of Pattern 3, where the filter panel silently **hides** categories the client expects
(`progress-queries-v2-api.ts:577`, zero-weight rows dropped). Same panel, opposite complaint. Here
the panel shows everything the schedule contains, and the complaint is that this is too much. Both
come from the panel having no editorial layer between the source data and the user.

### Adjacent ticket, deliberately kept separate

**PLT-3040 (CH08-Minooka, triaged 2026-08-12)** is the same client family and also concerns category
naming in the filter panel, but it is a different mechanism — an id→name join fallback producing a
*phantom* package that shows a sibling's numbers
(`use-progress-panel-data.tsx:253-259`, `dashboard-filter-utils.ts:57,86`; see that folder). **Do not
merge the two.** PLT-3040 is a real frontend defect with code merged against it (`b700eb3`);
PLT-3044 is upstream data. They share a client and a screen, nothing else.

### What remains UNVERIFIED

1. **That "Procurement / Design / Milestone" are in fact values of a dynamic category column** rather
   than actual Discipline values. The reporter says both "discipline visualization" *and* "under
   Project Area", which are two different filter sections. Nobody has posted a screenshot (no
   attachments on the ticket), and this run did not query the project. It does not change the
   disposition — both paths are populated from client schedule data — but if this ever reopens, that
   is the first thing to pin down.
2. **What exactly was raised with Hussein, and whether the client's schedule team accepted it.**
   Mostafa says "already raised"; the outcome is not on the ticket and is not visible from here.
3. **Whether the client also expects these values gone from anywhere other than the filter panel**
   (e.g. the progress breakdown). The description mentions "discipline visualization" as well as the
   filter, so the ask may be wider than one dropdown. Unasked.
4. **Nothing was run against CH08x.** No query, no project inspection — this environment has no
   access, and the ticket did not warrant requesting it.

### Ownership note for the record

The ticket sits **assigned to Darminder** (fullstack lead) and **Open**, which reads as "a developer
owes work on this" — while product has already said there is no work. Left as-is here; the
recommended action addresses it.

## 2026-08-19 — re-verified, one new comment not yet accounted for

Live fetch: status/priority/assignee all unchanged, but Jira now has **4 comments, not 3** — a
comment from **Yash Patel, 2026-08-18T09:19**, was added: a bare smartlink to
`https://support.xyzreality.com/a/tickets/7628`, no accompanying text. Nobody has opened that
external support-ticket link (out of scope for this repo's tooling); it may just be Yash's own
cross-reference for the close-out, or it may carry new client content. It does not visibly
contradict Mostafa's 08-13 "nothing from our side, close it" verdict, so the close-out recommendation
below stands, but the folder had not recorded this comment before now — flagging so the next run (or
whoever executes the close) checks ticket #7628 first rather than assuming it's inert.

Recommended action still unposted, now **5 consecutive runs** (08-14 → 08-19).
