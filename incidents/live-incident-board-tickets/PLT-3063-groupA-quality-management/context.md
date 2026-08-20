# PLT-3063 — "Dashboard issue numbers are not listed correctly web viewer" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-3063
- **Status:** Open · **Priority:** Medium
- **Reporter/relay:** Yash Patel · **Assignee:** Darminder Atker
- **Created:** 2026-08-18 10:37 · **Domain slug:** `quality-management` (QA issue numbering on the
  Dashboard's Quality panel)
- **Project:** DC5
- **Attachments:** 4 screenshots — 2 hosted on Freshdesk (`support.xyzreality.com/helpdesk/...`),
  2 more inline on the one Jira comment (native Jira attachment ids 62794-62797,
  `chrome_5rrxWuohY1.png`, `chrome_16TCcFkTPM.png`, `chrome_Wrt2xMX8Y0.png`, `chrome_YSsn9u5w0j.png`).
  **None opened this run** — Freshdesk links need a helpdesk session; the Jira attachment content
  endpoints need an authenticated binary fetch not available to this pass. See §"Needs human" below.

New folder this run — first investigation of this ticket.

## 1. The report (verbatim description)

> "When viewing and editing issues in the editor, the number shown on the right sort from highest to
> lowest and that is the number we use to number the issue. However, on the dashboard the numbers are
> sorted opposite and therefore do not correspond with the correct issue number. We are also missing
> several specific issues on the dashboard, # 155,156,157 and 158 are missing completely even though
> they are shown in the editor"

Two complaints in one ticket: (A) dashboard issue numbers don't match the editor's, look "reversed";
(B) issues #155-158 are visible in the editor but absent from the dashboard.

## 2. Comment so far — one comment, and half the ticket is already resolved

**Yash Patel, 2026-08-18 10:39** (one minute after creation — reads as a Freshdesk-to-Jira relay, not
live back-and-forth yet), addressed to Darminder: *"Jira as requested. The missing issues problem is
resolved. the numbering issue is pending to be looked into."* Re-attaches the same 4 screenshots.

So **complaint (B) is already reported resolved** (mechanism/timing not stated on the ticket — likely
a client-side status/type change on those 4 issues before this Jira ticket was even filed). Only
complaint (A), the numbering, is open. Nobody has replied since; Darminder has not yet commented.

## 3. Mechanism for (A) — VERIFIED in code, not a sort-direction bug

**The dashboard's "issue number" badge is not the real issue number — it's array position.**

- `app/pages/organisation/ViewerPage/components/dashboard-panels/quality-panel/components/issue-item/issue-item.tsx:425`
  renders `#{index + 1}`, where `index` is the item's position in the currently rendered list (passed
  in from `issue-table.tsx:251` for the virtualized path, `:284` for non-virtualized).
- The dashboard's `IssueItem` type (`quality-panel/utils/format-input-data.ts:21-67`) has **no
  `number`/`issueNumber` field at all**.
- `convertIssueToIssueItem` (`quality-panel/hooks/use-quality-data.ts:24-105`) maps every other API
  field but never reads `issue.issueNumber` onto the output — the real number is dropped before it
  reaches the card.
- The **editor's** issue card does it correctly, for contrast: `viewer-x/.../issues-panel/blocks/issue-item.tsx:123`
  renders `#{issueNumber}` from `item?.number`, which traces to the real backend field via
  `format-issues.ts:70` (`number: v2.issueNumber`).

**Consequence:** the dashboard badge is guaranteed to disagree with the editor's for any issue,
because it isn't reading the same data at all — a positional counter that resets to `#1` at the top
of whatever list is rendered, vs. the editor's real persisted `issueNumber`. This fully explains "the
numbers ... do not correspond" and the "sorted opposite" impression: the newest issue sits at the top
of both lists, but is labelled `#1` on the dashboard and its true (highest) number in the editor — so
the same physical row shows two very different numbers, reading as an inversion.

**Sort direction itself: verified NOT inverted.** Dashboard query
(`dashboard-quality-service.ts:312-316`) is `ORDER BY issueRaisedOn DESC`; editor default
(`issues-panel.tsx:76-77`, comparator `:158-165`) is also newest-first descending by `createdDate`.
No code inverts sort order between the two surfaces — the numbering-fabrication mechanism above fully
accounts for the symptom without needing a second, sort-direction bug.

**Confidence: high (code-verified end-to-end) that this is the numbering mechanism.** Not yet
verified against this project's own screenshots (unopened, see below) — those would only confirm the
exact numbers shown, not change the mechanism.

## 4. Complaint (B), for reference only — a plausible independent silent-exclusion path (not confirmed as what happened)

Already reported resolved by Yash, so not investigated further this run, but a real code path exists
that would produce exactly this symptom, worth recording in case it recurs: `buildBaseWhereClause`
(`quality-sql-queries.ts:22-26`) hardcodes `typeName = 'Quality'` and `issueStatusCode != 'DRAFT'` on
every dashboard query — any issue of a different type or in Draft status is silently excluded from
the dashboard while still fully visible in the editor's unfiltered list (`issue-service.ts:355-362`,
no type/status filtering there). Same shape as `recurring-defect-patterns.md` Pattern 5
("surface-scoped visibility rule mistaken for missing data") — a deliberate dashboard-only narrowing
with zero on-screen indication. **Inferred, not verified against DC5's actual issue data** whether
#155-158 were ever non-Quality-typed or Draft — I did not query this project.

## 5. What remains UNVERIFIED

1. The exact numbers shown in the 4 screenshots (unopened) — would confirm the mechanism against this
   project's specific figures, not required to act on it.
2. What actually resolved complaint (B) — Yash's comment states it's resolved but not how or why.
3. Whether the customer's "sorted opposite" wording hides a second, independent bug beyond the
   numbering-fabrication mechanism above — no evidence of one found in the sort-direction code.

## Needs human

- ⚠️ 2 Freshdesk-hosted screenshots (`support.xyzreality.com/helpdesk/attachments/103340021940-42,44`)
  — need a helpdesk session, not available here.
- ⚠️ 2 native Jira inline attachments on comment 109849 (`chrome_*.png`, ids 62794-62797) — need an
  authenticated binary fetch not available to this pass. Would settle the exact displayed numbers on
  both surfaces and give the type/status of issues 155-158 before their fix, but the mechanism above
  does not depend on them.

## Recommended action

See `recommended-action.md`.

## 2026-08-20 — re-verified, unchanged; code claim spot-checked and still true

**Live fetch:** status `Open`, priority Medium, assignee Darminder Atker, `resolution = null`,
`updated = 2026-08-18T10:39:18+01:00`, **1 comment** — still Yash's 109849 relay of 08-18 10:39. No new
comment, no status change, no assignee change since the folder was created on the 08-19 run. **2 days old,
2 runs, and nobody has replied to Yash yet** — Darminder has not commented on this ticket at all.

**Spot-check, not a re-investigation.** Because the standing recommendation is to hand this to a developer
citing exact lines, one line was re-read on the current checkout rather than trusted: the dashboard Quality
card still renders `#{index + 1}` at
`app/pages/organisation/ViewerPage/components/dashboard-panels/quality-panel/components/issue-item/issue-item.tsx:425`.
The §3 mechanism therefore stands unchanged and unqualified. Nothing else re-derived.

**Attachment gap unchanged:** the 2 Freshdesk-hosted screenshots and the 2 native Jira inline attachments
(ids 62794-62797) remain unopened — no tool here can fetch authenticated helpdesk or Jira binary media.
They would confirm the exact numbers displayed on each surface; they cannot change the mechanism, which is
read end-to-end in code. Do not guess their contents.
