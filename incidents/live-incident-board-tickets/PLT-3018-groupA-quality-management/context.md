# PLT-3018 — "Unable to edit the severity of the QA report" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-3018
- **Issue type:** Live Incident · Software Area: **Web Viewer**
- **Status:** **Open** · **Priority:** Medium
- **Project:** LVN (Las Lunas)
- **Reporter (Jira):** Yash Patel (support) · **Assignee:** Rishi Bhugobaun · Original client reporter: Maritza Rodriguez · Freshdesk #7596.
- **Created:** 2026-08-05 (brand new this run).
- **Attachments:** 1 video (`Issue Severity Category_1.mp4`) + 3 screenshots — ⚠️ none opened this run, see NEEDS HUMAN.
- **Domain slug chosen:** `quality-management` — same surface family as PLT-2858 (QA issue detail/edit form field editability).

## 1. What was reported

Maritza (Editor role, confirmed by Yash — not an RBAC/permissions issue) cannot edit the **Severity**
field when creating or editing QA issues **she created**. Her own video shows she CAN edit Severity
on issues created by co-workers (Lucas Biscaro, Jeremiah Ulibarri) in the same project. Yash's own
read: "not related to project permissions, may be tied to issue ownership, issue state, or
account-specific behaviour."

The symptom is unusual in shape: most ownership bugs block editing *others'* records, not your own.

## 2. Prior-run check (per playbook step 0)

No existing folder for this ticket (brand new). Closest analogue on this board: **PLT-2858** ("QA
Issue location detail," same repo, same surface family — a customer reporting a QA-form field is
missing/uneditable). That ticket resolved as **not a code bug**: a per-project config gap (no named
zones) combined with a read-only-by-design field, not a permissions issue. Worth reading before
assuming a bug exists here either.

`recurring-defect-patterns.md` has no existing ownership/self-vs-other pattern — this would be a
first sighting, not a known shape, if it turns out to be a real bug.

## 3. Domain doc check

`dashboard/quality-tab.md` describes the **Dashboard** quality tab (view-only issue list/detail
panel) — **confirmed wrong surface**: that panel has no Severity field at all
(`issue-details-panel.tsx:114-126`, only a close button). There is **no domain doc for the QA issue
create/edit form** in this repo — documentation gap. The closest existing map of this surface is
PLT-2858's own `context.md`, which already documents `issue-form.tsx` line-by-line.

## 4. Code findings (hc-frontend, branch `claude/vigilant-franklin-6oipty`, HEAD `d65f320`)

The only editable Severity control anywhere in the repo is in the Web Viewer issue properties panel
(`.../viewer-x/components/blocks/issue-properties/blocks/issue-form.tsx`).

### VERIFIED

- **No ownership check exists anywhere in the QA issue path.** Grepped `createdBy`, `reporterId`,
  `authorId`, `reporterEmail`, `account.email`, `currentUser` across the viewer app. The only
  current-user read in the form path is `getDefaultReporter(account)`
  (`blocks/hooks/use-issue-form.ts:479-481`), used only to prefill `reporterEmail` on create. **The
  `!==`/`===` ownership-inversion hypothesis class is dead** — there is nothing to invert.
- **Severity is rendered conditionally on Type, not disabled conditionally on anything.**
  `issue-form.tsx:423`: `{selectedType?.displayName === 'Quality' && (...)}` wraps the
  `FormSelect name='severityId'` block (`:426-436`). If the issue's Type isn't the one whose
  `displayName` is exactly `Quality`, **the Severity row does not exist on the form at all** — not
  greyed, absent.
- **Field disabling is separately driven by status, and it's all-or-nothing.** `issue-form.tsx:69`:
  `isFieldDisabled = ['VOID', 'CLOSED'].includes(defaultValues?.statusId) || isSaving`, applied
  identically to Severity, Title, Status and Type. If her issues are Closed/Void, the *whole form*
  should be greyed, not just Severity — a checkable, falsifying tell.
- **Role/authority gating in this form covers Delete only** (`issue-form.tsx:63`,
  `AUTHORITIES.PROJECT_ISSUES_DELETE`). Consistent with Yash's role check finding no RBAC angle.
- **Create mode starts with no Type selected**, so the Severity row is absent from the create form
  until Type = Quality is chosen (`issue-add.tsx:198-216`, `use-issue-form.ts:140`). The Type list on
  create is filtered by `type.validForIssueCreate`, a per-project flag (`issue-form.tsx:72-79`) — if
  `Quality` isn't valid-for-create on LVN, she could never reach the field on create at all.
- **Severity options come from per-project config, not per-user**: `issueParameters.issueSeverityCategories`
  (`hooks/useIssueParameters.ts:11-21`, react-query, 2 min staleTime). Empty list ⇒ dropdown opens but
  shows "No results" (`form-select.tsx:29,49,77`) — would affect all users on the project equally, so
  this alone can't explain a self-vs-coworker split, but would explain a visually "stuck" field.
- **`severityId: required: true` is unconditional** (`use-issue-form.ts:414-416`) even though the
  field only renders for Quality type — an unrelated pre-existing inconsistency (`cost` and
  `activityCategories` are correctly gated the same way `cost`/`activityCategories` are at
  `:440`/`:461`), not yet confirmed to cause a symptom.
- Zero test coverage for severity editability (`issue-properties.test.tsx` has no match for
  `severity`/`disabled`/`Quality`).

### INFERRED / NOT VERIFIED

- Whether an unrendered-but-required `severityId` blocks submit (RHF version-dependent behaviour,
  `node_modules` absent from this checkout — could not confirm).
- Whether the issues **list** endpoint always returns `issueSeverityCategoryId` on incremental sync
  (`issue-service.ts:344-385` overwrites map entries wholesale) — a backend question.
- Whether LVN's "Severity" is the V2 field above or a legacy V1 custom attribute with its own
  create/edit option-filtering (`issue-custom-fields.tsx:48-52`) — cannot tell from the repo which
  applies to LVN.

## 5. Hypotheses, ranked, each stated as a falsifiable prediction

**H1 (leading) — Severity is absent, not disabled, because the two issues have different Types.**
No ownership rule exists; "her issues" and "coworkers' issues" are two different Type populations by
habit, which would produce exactly this inverted-looking symptom with zero bug. *Prediction:* on one
of Maritza's broken issues, Type ≠ `Quality`; on Lucas's/Jeremiah's working one, Type = `Quality`.
One lookup on one issue each side kills or confirms this.

**H2 — Her issues are Closed/Void, so the whole form is greyed.**
*Prediction:* Status on her broken issue is Closed or Void, **and** other fields (Name, Assignee,
Due Date) are also greyed on the same screen. Falsified instantly if any other field is editable.

**H3 — LVN's severity category list is empty or missing a default.**
*Prediction:* the dropdown opens and shows "No results." This is per-project, so it predicts the
same failure on coworkers' issues too — already largely contradicted by her own video, kept only as
a residual explanation for a visually blank field.

**Ruled out by code, not worth further time:** ownership-check inversion, reviewer/other-person proxy
check, stale client-side editable flag from creation time, role/RBAC gating.

## 6. What remains unverified

- Which of "greyed out," "empty dropdown," "row absent," or "Save does nothing" she actually means —
  the single highest-value unknown; every hypothesis forks on it.
- The actual Type and Status values on a real LVN issue (no DB/env access from here).
- LVN's `issueSeverityCategories` list contents and whether `Quality` is `validForIssueCreate`.
- Whether LVN's Severity is the V2 field or a legacy V1 custom attribute.

## 7. NEEDS HUMAN — unopened attachments

**All 4 attachments unopened this run** (1 video, 3 screenshots — none accessible to the
investigating agent). The video in particular would very likely settle the whole ticket at a glance:
whether the Severity row is present-but-greyed vs present-but-empty vs absent entirely; the Type and
Status shown on her issue vs the coworker's; whether other fields are also greyed; and whether she's
even in the Web Viewer issue panel vs the Dashboard quality tab (the latter has no editable Severity
by design, which would reclassify the ticket immediately). Recommend viewing the video before asking
Maritza anything further — it's cheaper than a customer round trip and may make the drafted question
in `recommended-action.md` unnecessary.

## 8. Confidence

- **On the narrow negative claim — no ownership/role-based gate exists in the frontend: 9/10**
  (exhaustive grep, not inference).
- **On H1 being the actual mechanism: 5/10, deliberately not rounded up.** The surface is identified
  with certainty and H1's code path is real, but nothing has been confirmed against an actual LVN
  issue yet, and H1's elegance (explains the symptom with zero bug) is itself a reason to distrust it
  until the Type value comes back.
- If the answer comes back "Type: Quality, Status: Open" on her broken issue, all three hypotheses
  above are dead and this resets to a backend/account-specific question — see
  `recommended-action.md` for the next step in that case.
