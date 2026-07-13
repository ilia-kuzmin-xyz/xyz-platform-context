# PLT-2759 — Recommended action (Group B, Dev In Progress)

**Status of this ticket:** Group B, already **Dev In Progress**, owned by Darminder Atker.
This is a **capture, not a re-triage** — no Jira transition or comment is proposed or drafted,
and no Jira writes were made. Notes below are for the human watching the ticket land.

## Who owns the fix

- **Root cause fix: PAPI-3344** (Sergey.Kuderskiy, api-v1/IAM) — companies created without a
  tenant link. **Code is RELEASED** (fixVersion 59.14.1, 2026-06-16; QA-verified on Staging by
  Gennaro Boccia). Twin ticket **PLT-2742** shares this exact owner/fix.
- **Data remediation (the still-open half):** the **129 pre-existing orphaned companies**
  (`ownTenant: null`) that the code fix does not retroactively repair. Darminder's comment says
  Sergey is "drawing up a list … to resolve and decide how best to action." Confirm this data
  sweep has an owner and has actually run.

## FE work needed?

**No.** This is backend/IAM. The portfolio card (`ProjectCard.tsx:112-113`) renders the
server-resolved `contractor` string correctly and has no role in the defect. FE company-resolution
mitigations already exist for the settings surfaces (`useProjectCompanies` project-tenant scoping;
`useCompaniesByIds` bulk-get / PAPI-3298) but they don't drive the portfolio card and can't help a
company that has no tenant link at all.

## Watch-outs for when it lands

1. **Don't close on "PAPI-3344 released" alone.** The code stops *new* orphans; 2759's
   "some projects show, some don't" points at *existing* orphaned companies. Verify the **data
   backfill** of the 129 companies happened before verifying the symptom.
2. **Verify with a personal (non-admin) login.** Admin always sees all companies, so an admin test
   will falsely pass. Re-test the originally-affected projects via a personal login (the login-type
   dependence is the whole signal). Prefer a project that is **still broken right now** over one
   already remediated (live-incident-playbook §1).
3. **Sweep the cohort, then close 2759 + PLT-2742 together** — they are the same defect; both are
   Dev In Progress and should clear on the same fix + data sweep.
4. **Keep separate from PLT-2890/2891.** Those are the contractor *filter control* (FE / PowerBI
   parity), a different cluster — the PAPI-3344 fix does not touch them; don't let an accidental
   "duplicate → close" sweep them in.
5. ⚠️ **Screenshots unviewed by the agent** (see context.md §1) — a human should confirm from them
   which projects/logins were affected; may sharpen verification but does not change the diagnosis.

**Confidence:** cluster attribution & backend-ownership 9/10; that PAPI-3344 code alone fully
resolves the symptom 6/10 (pending the orphaned-company data backfill + personal-login verification).
