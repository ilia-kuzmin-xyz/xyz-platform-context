# PLT-3112 — HITT AUS01: web viewer says more elements linked than possible within the model

First folder 2026-10-28. **Status Customer Release Check** (since 10-27 09:15 UTC, Freshdesk 7870 Waiting on customer), fixVersion **26.4.1**. Fetched live, 11 comments.

Model PC-Rowan-Moriah_ARCH_R2-DoorsWindows-V1 showed Linked 2,319 of Total 4,545 unloaded, then 2,310 of 2,299 once loaded. Darminder's fix (`86d9be042` #2211): `getLoadedModelElementIdsForModel` in the viewer service, the model details panel filters DB links against elements actually loaded, falling back to the unfiltered count until loading finishes. **He states the limits himself (`115592`): it is a frontend workaround that needs the model loaded every time; the long-term fixes are DPL-1720 (Backlog) and DPL-1708 (Blocked, Critical: Revit converter includes hidden-workset elements).** Gennaro verified on Staging 26.4.1 (calculation fixed, tooltip added).

Release check (verified): `86d9be042` is inside `v26.4.1`.
**Residual to expect:** the unloaded-model count can still look inflated; the customer may come back on that. Not a regression, a known limit.
Ball with the customer. Unopenable: inline screenshots (403). Not verified: the customer's view after loading the model on prod; the status of DPL-1708/1720 beyond the link summary.
