# PLT-3119 — "AEX not shown in portfolio dashboard" — triage context

- **Domain slug:** `progress-tracking` (mechanism is progress-weighting consistency, same family as
  PLT-2917/Pattern 3, not a data-pipeline artefact defect)
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-3119 (id 122104)
- **Type:** Live Incident · **Priority:** Major · **Status:** **With Customer**
- **Assignee:** Yash Patel · **Reporter:** Yash Patel · client project: **AEX01** (tenant **APLD**)
- **Freshdesk:** Ticket 7907 — flipped **Waiting on 3rd line → Waiting on customer** same day
- **Created:** 2026-09-10 12:18/12:26 (two fetches disagree by 8 min, immaterial) · **Comments:** 5
  · **Attachments:** 4, all PNG, all inline in comments · unchanged since 2026-09-10 13:48.

---

## ⚠️ Editorial note (2026-09-14, on this file's own history)

This file was, for one run, silently overwritten wholesale rather than appended to — a violation
of this repo's additive-writing rule (`.claude/CLAUDE.md`). Reconstructed here: the section below,
dated **2026-09-11**, is the original first-pass triage, restored verbatim (it had been committed
to `main` in `d043017`, a large unrelated-looking "chore(node-map)" squash commit — evidently the
same batching-of-unrelated-work pattern this repo's own docs warn about elsewhere). The
**2026-09-14** section underneath it is a second, fully independent pass that did not know the
first one existed (it was briefed as "brand new ticket, no folder") and reached the **same core
conclusion** by a different route — which is a useful cross-check, not a reason to discard either.
Nothing below is deleted; superseded points are labelled as such in place.

## ## 2026-09-11 — initial triage (preserved, first pass)

**Prior-run check:** no folder existed before this. Not a repeat of Pattern 3 in the usual sense
(that pattern is a single project's own dashboard-vs-report mismatch) — this looked like the
**portfolio-membership** analogue: a project's progress weighting disagreeing with its portfolio
peers, the same underlying guard built for **PLT-2911**.

**What "AEX" and "portfolio dashboard" mean:** AEX = project code `APLD-AEX01` (APLD tenant), not a
generic acronym. "Portfolio dashboard" has two candidate implementations in `hc-frontend`: (1) the
native, feature-flagged `PortfolioDashboardPage` (`Portfolio-Dashboard` FF), with a `MilestoneWidget`
("Milestone Performance") and a `ProjectsWidget` ("Projects"); (2) a legacy PowerBI-embedded report
nobody on the FE/platform team has access to or understands (Darminder: *"The one above linked to
PowerBI I am not aware of access or how it works"*). Yash's wording ("Milestone Performance" /
"Project List") matches (1)'s widget naming closely, but — see below — (1)'s own data model cannot
produce the split he reports, so which system the customer is actually looking at was unresolved.

**Comment thread (verbatim reads):**
1. `111937` Yash 12:26 — APLD-AEX01 not appearing in **Project List** within the APLD Portfolio.
   AEX01 was invisible everywhere until **"Include in Portfolio"** was enabled; after enabling +
   refreshing Power BI data it appeared in **Milestone Performance** but still not in **Project
   List**. Two images attached (`64299`, inline `90991b4d…`).
2. `111938` Yash 12:27 — Freshdesk → "Waiting on 3rd line".
3. `111940` Darminder 13:20 — on **our own** feature-flagged Portfolio Dashboard the project **does**
   appear; no visibility into the PowerBI-linked one; asks Mostafa to advise. Attachment `64301`.
4. `111942` Darminder 13:39 — *"Following group discussion including Mostafa the cause of the
   problem is because you cant have both types of calculation logic in the same portfolio which has
   been set for this project"* — attachment `64304` (14KB, much smaller than the others — likely a
   tight crop of one settings field).
5. `111943` Yash 13:48 — Freshdesk → "Waiting on customer".

Comment 4 (13:39, the technical conclusion) precedes comment 5 (13:48, "waiting on customer") by 9
minutes — plausible Yash relayed it to the customer first, but nothing in Jira confirms what, if
anything, was actually said. Not verified either way.

**Code findings (hc-frontend), all VERIFIED at the time:**
- "Include in Portfolio" = `isPortfolioEnabled`, on-screen label "Included in Portfolio Dashboard"
  (`GeneralTabEdit.tsx:521`, form field `:107,483`) — exact match for Yash's wording.
- "Calculation logic" is a real on-screen label: "Progress calculation logic"
  (`GeneralTabEdit.tsx:471`), bound to `progressWeightingMethod`
  (`ProgressWeightingType.PLANNED_LABOUR_HOURS` / `LINKED_ELEMENT_COUNT`).
- A portfolio-wide weighting-consistency guard already exists, built for **PLT-2911**:
  `portfolio-weighting-guard.ts:getPortfolioWeightingConflict()` blocks/badges a project whose
  `progressWeightingMethod` disagrees with its portfolio peers — Mostafa/Darminder's "can't have
  both types of calculation logic in the same portfolio," verbatim, is this guard's own design
  comment.
- **Load-bearing finding: the guard/badge does NOT remove a project from any list; it only warns**,
  per PLT-2911's own 09-04 entry (`sprint-tickets/PLT-2911/context.md`) — the conflict badge renders
  next to an already-ticked, already-portfolio-enabled checkbox and blocks **Save** on that settings
  tab, not the project's presence in any dashboard list. **So a weighting mismatch, by itself, is
  not sufficient in this repo's own code to explain a project being absent from a list** — something
  else has to be doing the excluding, and on this reading it isn't this guard.
- On the native `PortfolioDashboardPage`, "Milestone Performance" and "Projects" read the **identical**
  already-filtered project array (`usePortfolioData()` → `GET /portfolios/:id/dashboard`, both
  widgets consume the same `allowedProjects`; `portfolioMilestonesData.ts:53`'s `if (!project)
  continue` drops any milestone whose project isn't in that same map). **So the present-in-one/
  absent-from-the-other split Yash describes cannot happen on this native page at all** — strong
  evidence the customer is looking at the PowerBI-linked surface, not this one.

**Hypothesis (INFERRED, not verified):** whatever renders the customer's "Project List" (most likely
a PowerBI report/dataset, structurally outside `hc-frontend`/`XYZPlatformApi`) computes a per-project
figure assuming one weighting method across the whole APLD portfolio and silently drops a project
whose own weighting doesn't match — same shape as **PLT-3109** (a labour-hours-only `WHERE` clause
dropping element-weighted activities) and PLT-2911's guard (built to stop this at enable-time, but
non-blocking once already enabled, so a pre-existing/manually-forced mismatch reaches whatever
consumes it downstream). Not confirmed against any real query, table, or PowerBI artefact.

**Confidence at the time:** "Include in Portfolio" label match 9/10; Darminder/Mostafa's conclusion
maps to `progressWeightingMethod` 8/10; **this repo's own guard, by itself, explains the omission:
3/10** (actively contradicted by the guard being a non-blocking badge, not a filter); native page is
NOT the surface the customer means: 7/10. **Overall: 3/10** — the internal team's own explanation was
a verbal conclusion, not a traced mechanism, and the two facts that would settle it (AEX01's weighting
vs. peers; which system renders "Project List") were both unread by anyone on the thread.

**Attachments (unopened, 403 confirmed dead end, not retried):**

| id | author | time | size | likely content |
|---|---|---|---|---|
| `64299` (+ inline) | Yash | 12:26 | 446KB | customer's own Project List screenshot(s) |
| `64301` | Darminder | 13:20 | 494KB | native `PortfolioDashboardPage`, project visible |
| `64304` | Darminder | 13:39 | 14KB (tight crop) | probably the "Progress calculation logic" field/badge |

## 2026-09-14 — independent re-check (second pass; did not know the above existed)

Re-fetched the ticket live: **nothing has moved since 09-10** — same 5 comments, same 4 attachments
(this pass additionally resolved the second Yash image's id as `64300`), status/assignee unchanged.
4 days of customer silence.

**Converges with the 09-11 pass, independently, on all of:** the guard is real and is
`portfolio-weighting-guard.ts` (this pass pins it to `:46-76`); the native `PortfolioDashboardPage`
is not the surface the customer means (Darminder's own 111940 comment: AEX01 shows fine on **our**
dashboard); the explanation given to Darminder→Mostafa is a verbal group conclusion, not a measured
one; overall confidence is low (this pass also lands around 3–4/10 on "the guard explains AEX01
specifically").

**What this pass adds, not previously established:**
- **The guard's ship date, pinned to a commit:** `478932d`, **2026-08-14**, squashed into an
  unrelated-looking commit (`#2138`) — 27 days before this ticket. The guard's own doc comment
  (`portfolio-weighting-guard.ts:54-56`) explicitly names *"Legacy state from before this guard:
  members already disagree with each other, so no candidate can be consistent with all of them"* —
  i.e. it only stops **new** conflicts, exactly consistent with (and sharper than) the 09-11 pass's
  "non-blocking badge" finding: not only does it not filter lists, it was never even capable of
  catching a conflict that predates 14 August.
- **A single discriminating question this gives us:** was AEX01 added to the APLD portfolio
  **before or after 2026-08-14**? Before → clean legacy-conflict explanation, nothing to chase.
  After → the guard should have blocked it and didn't, which is itself a separate defect (guard
  bypass or a feature-flag/tenant edge case) worth its own investigation.
- **Relation to PLT-2917, checked directly rather than assumed:** *not the same mechanism.* PLT-2917's
  root cause is the platform having no write path to Actual Finish Date (a milestone-completion
  problem); PLT-3119 is a portfolio-membership/aggregation problem. What the two tickets share is
  structural, not a shared defect: in both, **Milestone Performance** keeps working while a different,
  aggregation-dependent view breaks, because milestones are zero-weight on every progress-weighting
  path and so sit outside whatever aggregation is failing elsewhere. Worth flagging as a sibling
  symptom of the same "Milestone Performance is aggregation-agnostic" property — not a duplicate, and
  not (yet) worth promoting into `recurring-defect-patterns.md` Pattern 3 until AEX01's actual
  weighting-vs-peers conflict is confirmed against real data (§ below).
- **hc-frontend's own Project List widget applies no weighting-consistency filter of any kind**
  (`porfolioProjectsData.ts:39-63`'s `deriveProjectCardsFromProjects()` only filters on
  `projectStatus`/`region`) — consistent with, and slightly sharper than, the 09-11 pass's reading:
  the exclusion, if it is one, is entirely a property of the external PowerBI query, not of any
  shared hc-frontend code path.

**Still unverified after two independent passes (explicit list):**
1. AEX01's actual `progressWeightingMethod` against its APLD portfolio siblings' — nobody has read
   this; comment 111942 asserts a conclusion, not a measurement.
2. Whether AEX01 was added to the portfolio before or after 2026-08-14 — the one check that would
   settle "legacy conflict" vs. "guard bypass, new defect."
3. What the PowerBI Portfolio Dashboard's Project List query actually filters on — outside
   hc-frontend and this session's access, on both passes.
4. All four attachments — unread on both passes; `64304` (14KB crop, likely the weighting field
   itself) is the single most decisive one and should be opened first.
5. Whether anything beyond "waiting on customer" was actually said to the customer — lives in
   Freshdesk 7907, not read by either pass.

## 2026-09-15 (scheduled) — confirmed unchanged

Live `getJiraIssue` re-fetch (full fields incl. comments/attachments): status still **With
Customer**, assignee still Darminder Atker, still **5 comments**, newest still `111943` (09-10,
Freshdesk → "Waiting on customer"), same 4 attachments (`64299`-`64301`, `64304`). Nothing moved.
The 09-14 draft to Darminder (§ above) is still unposted, and attachment `64304` is still unopened
by this routine. No re-investigation performed — nothing new warranted one.

## 2026-09-16 (scheduled) — confirmed unchanged

Live `getJiraIssue` re-fetch (full fields incl. comments/attachments): status still **With
Customer**, assignee still Darminder Atker, still **5 comments**, newest still `111943` (09-10),
same 4 attachments. The draft to Darminder is still unposted, attachment `64304` still unopened.
No re-investigation performed.

## 2026-09-17 (scheduled) — confirmed unchanged

Live `getJiraIssue` re-fetch (full fields incl. comments/attachments): status still **With
Customer**, assignee still Darminder Atker, still **5 comments**, newest still `111943` (09-10),
same 4 attachments. The draft to Darminder is still unposted, attachment `64304` still unopened.
No re-investigation performed.
