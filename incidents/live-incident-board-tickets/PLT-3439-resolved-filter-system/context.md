# PLT-3439 — (ATL09, ATL10) cannot add attributes in web viewer

**Raised** 2026-11-06 09:26 by Yash (Freshdesk 8593, customer Kyriakos). Major. Never in scope: it went
straight to With Technical Support, then **Done 2026-11-11 11:19 by Freshdesk closure**. Folder created
2026-11-12 as a residual record only, because it rests on an unreleased fix.

## What happened
- Customer could not add two missing packages: "Preconstruction" (discipline Preconstruction) and
  "Licenses & Permits" (discipline Legalization). Save Changes does nothing, both projects.
- **Rishi, 11-06 10:28:** the save is rejected because the new package has the same name as its
  discipline; the other package in the same batch is rejected with it; the page shows no error.
  Fix "done in PLT-3135, next release". Workaround: add "Licenses & Permits" alone, rename the
  Preconstruction package (e.g. "Preconstruction Works").
- Yash thanked him; Freshdesk closed 11-11. No customer confirmation that the workaround worked.

## Residual (2026-11-12)
- PLT-3135's fix is hc-frontend #2424 (`af29e59`, merged 11-04), **in no release tag** (newest `v26.4.2`,
  10-29). See `../PLT-3135-groupA-filter-system/context.md` § 2026-11-12.
- **Not verified:** that #2424 fixes this case (it changes parent naming to ids; a server rule
  rejecting same-name parent/child would not be affected); the silent no-error save is not addressed
  by #2424.

## Media (403 from this session, not tried per the 09-08 rule)
- Jira `67075` `image-20261106-092818.png` (Yash's screenshot of the confirmation window) and the
  Freshdesk screenshot `support.xyzreality.com/helpdesk/attachments/103362187210`. Would show which
  entries were in the failing batch and whether any error toast appeared.
