# PLT-3140 — Delete Assets

**Priority:** Major · **Epic:** PLT-435 [WEB] Commissioning Web work Q3
**Reporter:** Darminder Atker · **Domain:** commissioning

---

## 2026-09-22 — first pick-up. Moved Open → Analysis In Progress

Whole description, verbatim: *"Need to add delete assets option"*. No attachments, no comments, no
linked design, no acceptance criteria. Posted a clarification (comment 112747) and transitioned to
**Analysis In Progress**. Did not implement.

### Why this is not a small ticket

An asset in the commissioning model is the hub of the readiness graph. Deleting one has to decide
what happens to, at minimum:

- **task instances** generated onto it from the type's readiness levels (`task_instance`),
- **recorded executions** against those instances — the actual signed work,
- **file associations** (`commissioning_file_association`),
- its **readiness state** and its place in the ladder,
- the **system tag / affects-system** links (see PLT-2972, same area).

This is the same question PLT-2999 answered for task templates, and it was not answered cheaply
there. The landing there was: **refuse the delete once work has been recorded, offer Archive
instead**; `task_instance.task_template_id` is `ON DELETE SET NULL` so already-generated tasks keep
their snapshotted name and version, while the type-link tables cascade.

**There is still an open thread from PLT-2999 with Darminder and Jason on the delete-cascade
semantics, plus an undocumented `asset_type_task` FK.** Whatever is decided for assets should be
consistent with that, so this ticket is genuinely downstream of an answer that is already pending —
starting it before that answer lands risks building the opposite policy.

### Other unknowns

- Where the action lives: asset list row ⋮ menu, asset detail page, or both.
- Single delete or multi-select / bulk.
- Permissions — is delete role-gated, and if so by which authority.
- Whether "delete" should actually be **archive** (as it became for tasks), which would change the
  ticket title.

**Confidence to implement: 3/10.** Direction uncertain until the cascade policy is decided.

### Open — needs a human

- **Darminder**: blocked-when-runs-exist (archive instead, like tasks) vs hard delete that takes the
  runs with it? Asked in comment 112747.
- Depends on the same PLT-2999 cascade answer already with Darminder / Jason.
