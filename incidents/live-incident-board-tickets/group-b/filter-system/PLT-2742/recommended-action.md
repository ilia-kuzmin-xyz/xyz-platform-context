# PLT-2742 — recommended action (DRAFT ONLY)

**Group B / Dev In Progress — do not re-triage.** No Jira transition or comment
is drafted or executed here. Watch note for the human owner only.

- **Status:** actively worked; parked in Dev In Progress by Darminder pending
  backend fix validation. Assignee: Darminder Atker.
- **Fix owner:** **backend / PAPI-3344** (Sergey Kuderskiy, IAM api-v1; QA
  Gennaro Boccia). PRs hc-iam #389 + hc-project #681; PAPI-3344 = Released,
  verified Staging 59.14.1.
- **FE-needed?** **No.** FE only renders `project.contractor` from the portfolio
  API (`ProjectCard.tsx:112-113`); company visibility is tenant-scoped
  server-side (`companyService.ts` PAPI-3298 note). No FE change required.

**Watch-out on landing (why "PAPI-3344 Released" may not mean 2742 is done):**
- PAPI-3344 fixes only the **creation path**. The **129 pre-existing companies
  with `ownTenant: null`** still need a **data backfill/re-link** before Far02's
  contractor reappears for a personal login (2759 shows Sergey was "drawing up a
  list … to decide how best to action"). Confirm that backfill ran and covered
  Far02's contractor company before closing.
- **Verify with a currently-broken instance** (per live-incident playbook):
  re-check Far02 with the **personal** login post-backfill. Do **not** close on
  the admin/tenant login — admin sees all companies regardless, so it proves
  nothing.
- **Resolve PLT-2759 together** — same defect, same fix.
- **Keep separate from PLT-2890 / PLT-2891** (contractor *filter* cluster) —
  different fix; do not fold in.
</content>
