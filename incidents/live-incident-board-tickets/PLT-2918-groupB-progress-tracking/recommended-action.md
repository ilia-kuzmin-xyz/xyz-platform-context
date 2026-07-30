# PLT-2918 — dev-readiness note (Group B — no drafted customer/team action)

Ticket is **Dev In Progress**; per briefing this is context-capture only, Group B workflow is still TBD.

## Dev readiness
Root cause is **dev-confirmed**, not just code-read speculation: assignee's own live-data query on AUS01 (2026-07-22/23 comments) shows the destructive per-type diff in `CategoryMappingService.saveDataMapping()` (`category-mapping-service.ts:265-271`, cascade via `computeCategoryMapUpdates:643-650` + `_updateRecursively:967-971`) actually fired — WBS Location deleted (not hidden) across Precast/Roof/Earthworks/Painting/Partitions/L1-commissioning, discipline/package/phase untouched. Trigger: Jul-12 re-upload left ~2,119 activities unmapped, then a manual mapping-panel Save deleted category values across the branches touched in that session. Confidence **8/10** — see `context.md` for full delta.

## Fix ownership (as visible on the ticket, 2026-07-28)
- **This ticket (PLT-2918)** appears to track **data remediation**, not the code fix: Ilia Kuzmin is pursuing (1) backend restore of deleted rows with **Sachin**, (2) script re-apply from Paddy's export as fallback, (3) manual correction as last resort. No comment confirms which path was taken or completed yet.
- **Separate FE fix** (the Save-bug itself) was stated as "I'll raise an FE ticket" by Ilia on 07-23 — **not found**: no linked Jira issue (`issuelinks: []`, no remote links), no branch or commit in `hc-frontend` referencing PLT-2918 or touching `category-mapping-service.ts` for this. Likely either not yet filed, or filed under an unlinked key. **No PR to check yet — cannot verify the eventual code fix against the hypothesis until that ticket/branch surfaces.**
- Likely FE owner once filed: **Darminder Atker** (fullstack lead, owns the mapping panel).

## Needs human
- Find/link the separate FE Save-bug ticket (unknown key) so this and its fix can be cross-checked against the hypothesis.
- Confirm outcome of the Sachin backend-restore conversation and which remediation path (restore / script / manual) was actually used for AUS01.
