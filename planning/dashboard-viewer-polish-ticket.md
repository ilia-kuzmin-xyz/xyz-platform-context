# Dashboard Viewer Polish — Jira Ticket Draft

**Summary:** Dashboard: filter cascade, zero-element guard, colour-pipeline error state

---

Three related polish fixes for the dashboard filter panel and 3D viewer colour pipeline.

**1. Cascading filter deselection (Floor → Room)**
When a floor is deselected, any rooms nested under it should be automatically removed from the active room filter. The same parent→child pruning already exists for Discipline → Package — this extends it to Floor → Room and verifies no other pairs are missing the same treatment.

**2. Zero-element guard in the 3D viewer**
If the dbId mapping step resolves 0 elements (e.g. parquet JOIN returns no rows), the viewer currently falls back to showing the full raw model with no colour theming. It should instead show an empty model (all fragments hidden) so the state is visually unambiguous.

**3. Colour-pipeline error state**
If element status data fails to load for any reason, the viewer currently gives no feedback. A dismissible banner should appear over the viewer explaining that colour visualisation is unavailable, with a retry button.

---

**Acceptance criteria**
- Unticking a floor clears its rooms from the active filter
- Zero-resolved-elements → blank viewer, not raw grey model
- Any colour-pipeline failure → visible banner with explanation + retry; success path unaffected
