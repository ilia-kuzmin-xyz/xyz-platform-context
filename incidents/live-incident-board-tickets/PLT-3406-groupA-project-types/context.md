# PLT-3406 — (CLT-FRA03) Project with the "v1" flag doesn't show Open Editor

First folder 2026-10-30. Live Incident, Medium, reporter Yash, **assignee Ilia**. Created 10-29 13:40 UTC (Freshdesk **8497**), status **In Analysis**, Freshdesk "Waiting on 3rd line" (13:57). Fetched live, 2 comments, no reply from us yet (~17 h at run time).

## What the ticket says
- Customer (Evangelos, project **FRA03X / CLT-FRA03**) cannot load any of the **images of an issue** and needs them for the marketing team.
- Yash (`116953`): to get that sorted, **Pietro turned the "V1 flag" on** because it is an old project that was never migrated. Now the project has no Open Editor option. Asks Ilia to look.
- Attachment `66932` (`image-20261029-135044.png`, 504 KB) plus one inline screenshot in `116953`: both unopenable (403).

## Two separate problems in one ticket
1. **Original problem (customer):** issue images do not load. Cause **unknown**; nothing in the ticket says where (new dashboard, viewer, report), which image, or what error.
2. **Side effect (internal):** after the V1 switch, Open Editor is gone.

## Problem 2 is explained by code (verified by reading, call sites checked)
In hc-frontend "V1" is **a project name containing `v1`**, case-insensitive: `helpers/V1Rules/v1ProductionRules.tsx:2-3` (`projectName?.toLowerCase().includes('v1')`). There is no other V1 switch in the FE. Effects for such a project:
- Portfolio card menu hides **Open Editor** and also Edit, Copy, Leave, Archive: `PortfolioPage/components/ProjectCardMenu.tsx:86,119,135,143,151,159,166`. Live call site: menu built at `:114-119`, rendered from `PortfolioPage.tsx:236`.
- Open Dashboard goes to the **legacy PowerBI** dashboard `/progress-dashboard/{id}`: `PortfolioPage.tsx:90-96`.
- The new dashboard route redirects there however it was reached: `dashboard-provider/dashboard-project-provider.tsx:247-249`.
- User is treated as **dashboard-only**: `helpers/userAuthorityUtils.ts:42-45`.
So a missing Open Editor is **by design** for any project whose name contains "v1". Removing "v1" from the name should restore it.

## What is inferred, not verified
- That Pietro's "V1 flag" **is** a rename to include "v1". The ticket never says how it was turned on. If it was done another way (backend flag), this FE code does not explain it. This is the one thing to ask.
- Whether images load on the legacy dashboard now. The ticket does not say. If they do, the customer is unblocked and problem 1 becomes a non-urgent defect for api-v2 (Ali / Sachin) about an unmigrated project.
- Cause of problem 1. Candidate worth checking later, **not a conclusion**: issue image URLs are tokenised blob links with a short remaining-validity margin (`PLT-3104` folder, `issues.service.ts:104,384`, 1 h `minRemainingMs`); an old project's stale links could 403. Untested.
- Git history here is shallow, so I cannot date when the V1 rule was introduced.

## Domain docs
`dashboard/project-types.md` covers `progressProject` (full vs quality-only), **not** the name-based V1 rule. Added a dated note there this run.

## Unopenable media
`66932` and the inline screenshot in `116953` (403 from this routine). Would settle: which screen shows the failed images and what the project card menu looks like now.

## Next
Class 1: nobody has replied; Ilia owns it. See `recommended-action.md`.
