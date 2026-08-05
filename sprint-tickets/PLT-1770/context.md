# PLT-1770 — [Project Level] Create Custom Permissions

**Type:** Task · **Priority:** Major · **Epic:** PLT-2015 Custom Permissions (Backlog)
**Jira status (as of 2026-07-29 run):** Dev In Progress — but **no `PLT-1770` branch exists** on origin. Clean start.
**Local decision (2026-07-29):** design capture **COMPLETE** (create / edit / remove / assign, 5 high-res mockup
batches from Ilia). Not yet implementable — blocked on decisions, not design. See the consolidated question tables
immediately below. Shared primitives (slider / accordions) are unblocked and could start once BE-1 is answered.

## ⭐ OPEN QUESTIONS — consolidated (read this first)

Sent to Ilia as tables on 2026-07-29. Detail for each lives in the sections below; this is the index.
**Top 3 that block real work: BE-1, D-1, D-2.**

### Design / product

| # | Question | Why it matters | P | Detail |
|---|---|---|---|---|
| D-1 | Can a non-Admin grant a custom permission containing Admin-level features? Existing invite code enforces a linear hierarchy; custom permissions aren't linear. | **Privilege escalation** | P1 | blocker 10 |
| D-2 | Header set to `Admin` pushes down to children that top out at `Editor` — clamp or block? | Core slider behaviour | P1 | blocker 7 |
| D-3 | Generic framework only, or framework + the 4 commissioning modules? | Scope | P1 | blocker 2 |
| D-4 | Should commissioning modules sit behind the `Commissioning` flag? | Leaks unreleased feature | P1 | blocker 3 |
| D-5 | Remove modal: is reassignment mandatory? Fallback for untouched members? | Real users' access | P1 | Remove flow |
| D-6 | `Custom` handle position — mean of children? (evidenced, never stated) | Numbers users see | P2 | blocker 6 |
| D-7 | Role-equivalence notice — which roles, exact only, headers or leaves? | Needs a rule | P2 | blocker 12 |
| D-8 | Duplicate names — allowed? Clash with built-in role names? | No validation specified | P2 | blocker 13 |
| D-9 | List ordering — newest-first or alphabetical? Observed non-alphabetical on both surfaces. | Where new rows land | P2 | Remove/Assign flow |
| D-10 | `Move to ▸` submenu never shown in any mockup — what is it? | Can't build it | P2 | Assign flow |
| D-11 | Reassign submenu lists the permission being deleted — bug? | Incoherent state | P3 | Remove flow b2 |
| D-12 | Which exits trigger `DISCARD CHANGES?` — Cancel / × / back-chevron? | Guard coverage | P3 | Create flow |
| D-13 | Copy: "Viewer" vs "View only"; `General Contractor` ×3 spellings; search placeholder casing; quote/dash style; two "Edit project details" bullets | One copy pass | P3 | throughout |
| D-14 | Greyed member row (Bill Briggs) — pending invite? | Confirm existing state | P3 | Create flow |

### Backend / API

> **⚠️ BE WORK IS NOT DONE — it is in the backlog. Sergey (2026-08-03): the IAM side is still planned, tracked as
> [PAPI-3717](https://xyzreality.atlassian.net/browse/PAPI-3717) "[IAM] Custom permissions for Portfolio invitations"**
> (assignee Sergey.Kuderskiy · status **Backlog** · epic PAPI-3602 *Portfolio Permissions*, which is Dev In Progress ·
> no due date, no fixVersion, no issue links).
>
> **Read the scope carefully — PAPI-3717 does NOT cover most of the questions below.** Its entire AC is:
> 1. *"IAM allows creation of custom roles (already implemented, verify this)"*
> 2. *"portfolio invitation endpoint allows assigning custom roles to users"*
>
> So it (a) **assumes** custom-role creation already works — consistent with what I found in `RolePage.tsx` — and
> (b) only adds **portfolio-invitation** assignment. It says nothing about ordinal levels, the Quality extras, or
> server-side grant-hierarchy enforcement. Therefore **BE-1, BE-2, BE-3, BE-4, BE-6 and BE-8 are still unowned** —
> they need either adding to PAPI-3717's scope or their own tickets.
>
> **One thing it DOES settle: the portfolio scope is intentional, not a copy slip.** PAPI-3717 is portfolio-scoped,
> which matches two design details I'd flagged as suspicious — the `UPDATE PERMISSION?` copy saying *"15 users in
> your portfolio"*, and the Team Management bullet *"create custom permissions (available when invited at the
> Portfolio level only)"*. **BE-5 is effectively answered: custom permissions are a Portfolio-level concept**, even
> though PLT-1770 is titled "[Project Level]". That tension should be raised — the FE ticket and the BE ticket
> disagree about scope.

| # | Question | Why it matters | P | Detail |
|---|---|---|---|---|
| BE-1 | iam models an **unordered authority tree** — no ordinal level. Does BE add levels, or does FE own a `feature→level→authority-codes` table? | **Shapes the whole feature**; FE mapping can't represent arbitrary sets that `RolePage` already produces | P1 | § API/BE |
| BE-2 | `Assigned Issues only` — zero FE references, no field on `IRole` | Quality module unbuildable | P1 | § API/BE |
| BE-3 | `Limit to Issue Type` — no field; issue types not linked to roles | Same | P1 | § API/BE |
| BE-4 | **(new)** Is the who-can-grant-what hierarchy enforced server-side, or FE-only? | Pairs with D-1; FE-only = bypassable | P1 | — |
| BE-5 | `UPDATE PERMISSION?` needs a **portfolio-wide** count; `project-role-users` is project-scoped | Copy may be unachievable | P2 | § API/BE |
| BE-6 | No bulk reassign endpoint — atomic modal would need N sequential updates | Partial-failure handling | P2 | § API/BE |
| BE-7 | Do commissioning authorities exist as records yet? | Blocks D-3 | P2 | § API/BE |
| BE-8 | **(new)** Is role-name uniqueness enforced server-side? | Pairs with D-8 | P3 | — |

**Confirmed working — do not re-ask:** project-scoped role CRUD, authority-tree fetch, and
`ms/iam/api/project-role-users` (= the remove modal's affected-members list). `RolePage.tsx` proves create/update end-to-end.

## Ticket chain (matters for branching)
- Predecessor: **PLT-1526** [Project Page] Project Settings - Team — *Closed* (built the Team tab).
- Spike: **PLT-1384** Investigate [WEB] User Permissions — *Closed*.
- **PLT-1770 has to be done BEFORE:**
  - **PLT-2926** [Project Level] Create **Edit** Custom permissions — *Open*
  - **PLT-2927** [Project Level] **Remove** Custom Permissions — *Open*
  → both must branch **off `PLT-1770`**, and their PRs must say "review PLT-1770 first".

## Domain (verified in hc-frontend, 2026-07-29)
Top-level domain = **PortfolioPage → Project Settings modal → Team tab**. *Not* dashboard, *not* viewer.
Root: `src/main/webapp/app/pages/PortfolioPage/components/ProjectSettings/TeamTab/`

**⚠️ Naming trap:** in this codebase **"Slider" means a slide-out drawer panel**, not a range control.
- `components/Slider.tsx` — generic drawer shell: overlay + header with back-chevron + X close, `open`/`onClose`/`onBack`/`title`/`zIndex`. **Reuse this for the "Create new permission" flow.**
- `TeamSliders.tsx` — the orchestrator that mounts every `<Slider>` (User details / edit, Company details / edit / create, Invite). New permission drawers get registered here.
- `components/TeamAccordionSection.tsx` — existing accordion pattern (permission modules are accordions).
- `TeamContent.tsx` — the tab body; already holds `selectedPermission` state using `Role` from `roleConstants`.
- `context/TeamContext.tsx`, `hooks/useProjectRoles.ts`, `hooks/useTeamState.ts`.

**Existing role model (3 flat levels only):**
- `TeamTab/roleConstants.ts` → `ROLES = { ADMIN: 'admin_role', EDITOR: 'editor_role', VIEWER: 'viewer_role' }`,
  display names Admin / Editor / **View only**, plus `ROLE_OPTIONS`, `getRoleDisplayName`, `getRoleBadgeVariant`.
- `useProjectRoles.ts:56` hard-filters to `['Admin','Editor','View only']`.
- Parallel precedent worth mirroring: `PortfolioSettings/portfolioRoleConstants.ts` (from PLT-2936, just landed).

**iam V1 API (ticket says "should work with V1 'iam' API — check with Sergey"):**
- `services/roleService.ts` → `ms/iam/api/roles` (full CRUD via `ApiBaseService`) + `getProjectRoles()` → `ms/iam/api/project-roles`
- `services/authorityCategoryService.ts` → `ms/iam/api/authority-categories`
- `services/authoritySubcategoryService.ts` → `ms/iam/api/authority-subcategories`
- All registered in `services/serviceProvider.ts`.
- `IRole` (`shared/model/iam/role.model.ts`): `{ id, name, companyType, authorityMainCategory, type, tenant, authorityCategories[], authoritySubcategories[], authorities[], project }`
- `AuthorityMainCategory` enum: `ADMINISTRATION_BASED | PROJECT_BASED | TENANT_BASED | COMPANY_BASED` → project-level custom permission ⇒ `PROJECT_BASED`.
- **Existing tree→payload helpers already solve the hard mapping — reuse, don't rewrite:**
  - `helpers/mapRoleTreeDataToApiPayload/` (+ tests) — maps checked tree keys into `{ authorityCategories, authoritySubcategories, authorities }`.
  - `helpers/findCheckedKeys/` (+ tests) — inverse: model → checked keys.
- Read-side authority checks: `hooks/useProjectAuthorities.ts` (per-project, preferred over `useAuthority`/`usePermission`), `useHasProjectAuthorities`.

**Working hypothesis for the data shape:** a "custom permission" = an `IRole` scoped to the project
(`authorityMainCategory: PROJECT_BASED`), where a **permission module = authorityCategory** and a
**level = authoritySubcategory**. NOT yet confirmed against the API — verify with Sergey.

## Confluence spec: "Commissioning - Custom permissions"
`https://xyzreality.atlassian.net/wiki/spaces/XSTD/pages/2393276418` (Jason Fingland, mod. 27 Jul 2026, space XSTD)
Defines **4 permission modules, all Commissioning-scoped**:

| Module | Levels |
|---|---|
| Readiness Templates | No access · View only · **Admin** (⚠️ no Editor) |
| Task Library | No access · View only · Editor · Admin |
| Asset & System management | No access · View only · Editor · Admin |
| Task execution | No access · View only · Editor · Admin |

Extra per-module checkbox options (module = slider **+** optional checkboxes):
- Asset & System management: ☐ *Can manually override readiness steps* (Editor and above, default off; reason required, logged).
- Task execution: ☐ *Assigned tasks only* (mirrors existing "Assigned Issues only" behaviour).
- Note: task executions are immutable at every level — no level permits editing/deleting a completed execution.
- Several Admin bullets require "equivalent Portfolio-level permission" (pull/push/update templates from Portfolio) ⇒ cross-scope dependency.
- Page also gives 3 example composed roles: **CxM / CxA / Field technician**.

## Design spec — decoded from Figma screenshots (received 2026-07-29)

### Three-tier structure
**Module** (accordion, e.g. `PROGRESS`) → **Feature slider** (e.g. `Schedule`) → **Details accordion** (✓/✗ authority bullets).
Design covers exactly **3 modules**: `PROJECT MANAGEMENT`, `PROGRESS`, `QUALITY`
("The Quality module differs slightly from **the other two** modules").
- `PROJECT MANAGEMENT` children: Project Details, Integrations, Devices, Models, Coordinates, QR codes, Team Management
- `PROGRESS` children: On-site progress, 360 Captures, Schedule, Cost
- `QUALITY` — **leaf module, no children**: "the header slider sets the actual permissions for Quality, rather than
  controlling a set of child permission sliders."

### Permission slider (the atom)
"Based around the concept of *power* — dragging right increases access."
Anatomy: feature name · permission level bar · slider nodes · slider handle · access-level badge · `Show details` / `Hide details` accordion.
- **Drag** → increases/decreases level.
- **Snap on release** → nearest node.
- **Tie-break** → released *exactly* between two nodes snaps to the **lower (left)** node
  ("prevents users from unintentionally assigning a higher level of access than intended").
- **Click a bar node** → jumps straight to that level, no drag needed (nodes have their own hit areas).

### Badge levels & colours (maps onto existing `getRoleBadgeVariant`)
| Level | Badge colour | Existing variant |
|---|---|---|
| No access | grey / none | *(new)* |
| View only | light/white | `light` |
| Editor | cyan | `glow` |
| Admin | yellow | `primary` |
| **Custom** | **purple** | *(new — roll-up state only)* |

### ⚠️ Level sets are NOT uniform — per-feature config required
Counted off the "PERMISSION SLIDERS DETAILS" sheet:
- 4 levels (No access · View only · Editor · Admin): Project Details, QR codes, Cost, QUALITY
- 3 levels (No access · View only · Editor): Models, Coordinates, On-site progress, 360 Captures, Schedule
- 3 levels (No access · View only · Admin): Integrations, Devices
- 3 levels (**No access · Editor · Admin** — no View only!): Team Management
So the node set must be data-driven per feature, never a fixed 4-stop control.

### Module header ↔ children coupling
- **Push down:** setting the module header level sets **all** child sliders to that level
  ("when the module header is set to a permission level it also affects all the child permission sliders").
- **Roll up:** if children are all equal → header shows that level. If they differ → header badge becomes
  **`Custom`** (purple) and "the module slider will position itself accordingly" to "reflect the overall access
  level defined by its child sliders".

### QUALITY module extras (leaf module + granular options)
Order inside the module: header slider → `Assigned Issues only` checkbox → `Limit to Issue Type` (expandable) → `Show details`.
- Tooltip (`?`) on **Assigned Issues only**: "Team member only has access to Issues that are assigned to them."
- Tooltip on **Limit to Issue Type**: "Team member only has access to Issues with these specific types.
  If no values are set then all types are available."
- `Limit to Issue Type` expanded: `Search Issue Types` search box + checkbox list + `Show all (15)` link.
  When ≥1 selected: a **yellow count badge** appears next to the label + an `× Clear` button.
- **Interaction rule:** "If checkboxes are selected before the slider is adjusted, the slider will automatically
  move to the **View Only** permission level" — the options require a minimum access level to be enabled.
- Checkboxes layer *on top of* the base slider level (View Only + Assigned Issues only ⇒ sees only own issues).

### Details-accordion bullet text (static per feature, ✓/✗ per level)
- Project Details: view details / edit details (name, address…) / remove project
- Integrations: view connected platform integrations / link+unlink projects to third-party platforms
- Devices: view devices assigned to project / assign+unassign devices
- Models: view all models / upload / modify model details (names, disciplines, descriptions) / create folders / remove models & folders
- Coordinates: view / upload+create / modify name and position details / remove
- QR codes: view+use QR codes for locating user on site / assign+remove transforms / order QR codes for delivery
- Team Management: invite team members / create companies to group team members *(Portfolio-level invite only)* /
  **create custom permissions** *(Portfolio-level invite only)* ← self-referential gate for this very feature
- On-site progress: view progress info on models / link elements to activities + set status (e.g. Installed)
- 360 Captures: view 360 Captures on web and mobile / upload, manage, remove
- Schedule: view project schedules / upload new schedule / edit+remove schedule data / map additional data
- Cost: view all project cost data / edit costs and financial info / update cost mapping
- QUALITY: view Issues & project media (images, videos…) / create, edit, update Issue information / remove Issues

### Commissioning modules slot into the same pattern
The 4 Confluence modules follow the **QUALITY** shape (slider + checkbox extras), not the PROGRESS shape:
`Asset & System management` → ☐ *Can manually override readiness steps*; `Task execution` → ☐ *Assigned tasks only*
(the Confluence page itself says it matches "the Assigned Issues only behaviour").

### Refined iam mapping hypothesis (still needs Sergey)
4 UI tiers vs 3 iam tiers. Best fit:
`Module` = UI-only grouping (or via `IAuthorityCategory.order` / naming) · `Feature` = **authorityCategory** ·
`Level` = **authoritySubcategory** · detail bullets = **authorities** on that subcategory.
This is exactly the tree that `mapRoleTreeDataToApiPayload` / `findCheckedKeys` already serialise.

## Container flow — from mockups received 2026-07-29 (2nd batch)

**Legibility caveat:** the Create / Edit / Delete sheets arrived as zoomed-out flow strips. Structure and
sequence are reliable; **exact copy, field labels, validation text and button wording are NOT legible** and must
be re-read at full size before implementing. The Team-tab sheet and Invite-panel sheet were high-res and are trusted.

### Entry point (trusted — high-res)
`PROJECT SETTINGS` modal → tabs `GENERAL · TEAM · INTEGRATIONS · DEVICES · REFERENCE POINTS` → **TEAM**.
- Body: `Search users` field, then team members grouped by company (collapsible groups), each row carrying a
  permission dropdown on the right showing the level badge.
- **Footer left: `Custom permissions`** ← the entry point for this ticket.
- Footer right: `Invite to project` (yellow primary).
- Frame captions confirm: user opens a member's permission dropdown → picks a permission; with many custom
  permissions the list scrolls and gains **search**; selecting one shows that custom permission's name in the
  member's badge.

### Custom permissions appear in TWO dropdowns
Both the **per-member** permission dropdown and the **Invite to project** panel list:
`Admin · Editor · View only` → **divider** → custom permissions by name (e.g. "A Custom permission", "BIM dude").
Single-select with a checkmark on the current value; searchable via a `Search` field inside the dropdown.

### Invite panel (trusted — high-res, and it already exists in code)
`INVITE TO PROJECT` drawer: back-chevron `<` + title + `×`; `Invite team member` field holding removable chips
(`Billy Bishop ×`); `Permissions` searchable dropdown (as above); footer `Cancel` + `Invite` (yellow).
Caption: *"the invite experience is otherwise exactly the same as outlined here"* ⇒ **no redesign of invite**,
only the permissions dropdown gains custom entries.

### Create flow — TRUSTED (high-res batch, 2026-07-29)

Navigation: `PROJECT SETTINGS` → **TEAM** → footer-left **`Custom permissions`** (dark/secondary button)
→ `CUSTOM PERMISSIONS` drawer → footer-right **`Create new permission`** (dark/secondary button)
→ `CREATE NEW PERMISSION` drawer. All three drawers use the `<` back-chevron + title + `×` shell.

**Team tab detail (confirmed):** tabs `GENERAL · TEAM · INTEGRATIONS · DEVICES · REFERENCE POINTS`; `Search users`
field; **ungrouped members listed first** (Autumn Phillips `Admin`, Lorri Warf `Editor`), then collapsible company
groups (`Bugle Boy`, `XYZ Reality`) each with their own `⋮` kebab, members with per-row `⋮`. Badge = coloured
left bar + label (Admin yellow / Editor cyan / View only light). One row (Bill Briggs) renders greyed —
avatar and name dimmed — most likely a pending invite; worth confirming against existing member states.

**Empty state:** centred line-art illustration + copy exactly `No custom permissions yet...`

**Create form:**
- `Permission name` with a **red `*`** → required field.
- Below a divider: the three module accordions, **all collapsed by default** and **all defaulting to `No access`**.
- Content area **scrolls** (scrollbar visible against the panel) with the **footer fixed**: `Cancel` + `Save`.

**⚠️ Save enablement rule (inferred, but well-evidenced):** `Save` is bright yellow (enabled) only when the name
is filled **AND at least one level is above `No access`**. Evidence — three frames differing only in those inputs:
| Frame | Name | Levels | Save |
|---|---|---|---|
| empty form | *(blank)* | all `No access` | **dimmed olive** |
| named, nothing granted | "My new permission" | all `No access` | **dimmed olive** |
| named + granted | "My new permission" | PROJECT MANAGEMENT `View only` | **bright yellow** |
The 2nd vs 3rd row differ *only* in level, so the "≥1 grant" half of the rule is real, not just required-name
validation. Confirm the intended copy/tooltip for the disabled state.

**⚠️ Node counts differ between header and children — visually confirmed.** On the same screen:
`PROJECT MANAGEMENT` header renders **4 nodes**; `Project Details` renders **4**; `Integrations` renders **3**.
Nodes are distributed **evenly across the full bar width**, so a 3-level slider puts `View only` at the *midpoint*
while a 4-level slider puts it at *one-third*. Two sliders showing the same badge therefore have handles at
different x-positions — expected, not a bug. This makes blocker 7 (push-down onto shorter level sets) concrete:
module headers expose the full 4 levels while several children top out lower.

**Handle/track rendering:** filled track is green up to the handle, grey after; handle is a circular knob with a
`<>` glyph; at `No access` the handle sits hard left with an entirely unfilled track.

**Populated list view (`CUSTOM PERMISSIONS`):**
- `Search permissions` search field at the top — **present with 5 items, absent at 0 and at 1 item**, so it appears
  to be count-gated. Threshold unknown → confirm (or just always show it).
- Each row is a **card: permission name + three mini meters** labelled `Project management` · `Progress` · `Quality`
  — a compact per-module summary. Observed examples: *My new permission* (≈⅓,⅓,⅓ = all View only),
  *BIM dude* (thin sliver, ≈⅓, empty), *FAE* (empty, ≈⅔, full), *General Contractor - Client* (≈⅔, ≈¼, ≈⅓),
  *Quality Manager* (empty, empty, full).
- **These meters are continuous, not quantised to the 3–4 level stops** (the *BIM dude* Project-management sliver is
  visibly narrower than a one-third step, and *General Contractor* shows ≈¼ on Progress). That is meaningful
  supporting evidence for the mean-of-children roll-up in blocker 6.
- List scrolls; footer holds `Create new permission` (dark/secondary).

**Details accordion in situ:** label toggles `Show details` ⇄ `∨ Hide details`; bullets render **green ✓ / red ✗**
against the currently selected level. At `Project Details` = `View only`:
✓ `View project details` · ✗ `Edit project details (Name, address etc.)` · ✗ `Remove project`.

**Unsaved-changes guard (NEW):** leaving the create form with pending edits raises a centred modal —
title `DISCARD CHANGES?`, body `You have unsaved changes. Are you sure you want to discard them?`,
buttons `Back` (dark) + `Discard` (yellow, **trash icon**). Need to confirm which exits trigger it
(`Cancel`, `×`, and the `<` back-chevron are all candidates).

**⚠️ Role-equivalence advisory (NEW, and it implies real logic):** when every module is set to `View only`, an
inline notice appears directly above the footer — a left accent bar plus
`Custom permission provides the same level of access as "Viewer".`
**`Save` remains enabled**, so this is advisory, not blocking. This implies the form must **compare the composed
permission against the built-in roles** (Admin / Editor / View only) and surface a match. Open questions: does the
same notice fire for all-Editor and all-Admin, does it fire on partial matches, and is the comparison over module
headers or over every leaf feature?

**Success feedback:** green toast, top-centre, check icon — `New custom permission created` — with the drawer
returning to the list showing the new card.

**⚠️ Copy inconsistencies to resolve before hardcoding strings:**
- The advisory says **"Viewer"** but every badge/dropdown in the product says **"View only"** (and
  `roleConstants.ts` maps `VIEWER → 'View only'`). Pick one.
- Detail bullet reads `Edit project details (Name, address etc.)` in the mockup but
  `Edit project details such as name, address, and more` on the permission-sliders-details sheet.

### Edit flow — TRUSTED (high-res, 2026-07-29) — mostly PLT-2926, but shares this ticket's components

**Reaching it:** in the `CUSTOM PERMISSIONS` list, hovering a row gives it a **teal/green outline** and reveals a
**`⋮` kebab** at the right. The kebab opens a 2-item menu: **`Edit`** (yellow highlight on hover) and **`Remove`**.

**`EDIT PERMISSION` drawer:** same `<` + title + `×` shell. `Permission name` prefilled. Modules render their saved
state. Footer has **three** controls: **`🗑 Remove`** (left, dark, trash icon) · `Cancel` · `Save`.

**⚠️ Save is dirty-gated here.** On open with nothing touched, `Save` is **dimmed olive** even though the record is
valid. After editing (name changed `BIM dude` → `BIM manager`, PROJECT MANAGEMENT dropped to `No access`) it goes
**bright yellow**. So Edit = *(valid)* **AND** *(dirty)*, whereas Create = *(valid)* only. Note the edited frame
still had PROGRESS holding grants off-screen, so this does **not** contradict the create-flow "≥1 grant" rule —
but it also doesn't independently confirm it.

**✅ RESOLVES the delete "two entry points" (OR) from the low-res strip:** deletion is reachable from
(a) the list row's `⋮` → `Remove`, and (b) the `EDIT PERMISSION` footer's `🗑 Remove`.

**✅ CONFIRMS continuous `Custom` handle positioning — measured.** `BIM dude` shows `PROJECT MANAGEMENT` = `Custom`
and `PROGRESS` = `Custom`, with handles sitting **visibly off-node, roughly midway between two nodes** (PM handle
≈x810 against nodes at ≈727/890/1050/1215; PROGRESS handle ≈x971 between 890 and 1050). Both read as ≈0.5 between
stops — exactly what a mean-of-children roll-up produces. Also note the badge shows `Custom` **while the module is
collapsed**, so the roll-up must be computed from stored children without expanding.

**`UPDATE PERMISSION?` confirmation (on Save):**
- Body copy: `This change will affect the access of 15 users in your portfolio. Are you sure you want to continue?`
- Buttons: `Back` (dark) + **`Confirm update` (ORANGE)** — a third button semantic alongside yellow-primary and
  red-destructive. Check whether the design system already has an orange/warning variant or if it needs adding.
- **⚠️ New data requirement:** the modal needs a **count of users currently holding this permission**. Nothing in
  `RoleService` obviously provides that — needs an endpoint (or a client-side count over project contacts).
- **⚠️ Scope wording:** it says *"users in your **portfolio**"*, but this is a **project-level** permission
  (PLT-1770 is "[Project Level]"). Either the copy is loose or the impact genuinely spans the portfolio. Worth
  clarifying, since it changes which count you query.

**Post-save:** green toast, top-centre, check icon — **`Permission updated`** (distinct from create's
`New custom permission created`). Drawer returns to the list and the **edited row stays highlighted** (teal outline
+ `⋮` still showing). The rename persisted: the card now reads `BIM manager`.

**✅ CLOSES the create-rule uncertainty.** After the edit, `BIM manager`'s meters read
**Project management = empty · Progress ≈⅓ · Quality = empty**. So PROGRESS *did* retain grants throughout that
edit — which is precisely why `Save` was enabled while PROJECT MANAGEMENT sat at `No access`. The create-flow
**"≥1 grant above No access"** rule therefore stands unchallenged by the edit frames.

**⚠️ List ordering is unspecified.** Observed two different orders across frames:
`My new permission, BIM dude, FAE, General Contractor - Client, Quality Manager` (create flow) and
`A custom permission, BIM dude/manager, FAE, General Contractor - Client, Quality Manager` (edit flow).
The first is **not** alphabetical (`My new permission` leads), which hints at **newest-first**; the second is
consistent with either. Needs a decision — created-desc vs alphabetical changes where a new row appears.

**Copy inconsistency:** the list search placeholder appears as both `Search permissions` and `Search Permissions`
across frames. Pick one casing.

### Remove flow — TRUSTED (high-res, 2026-07-29, batch 1 of 2) — mostly PLT-2927

**Both entry points visually confirmed:** list row `⋮` → `Remove` (yellow hover highlight), and the
`EDIT PERMISSION` footer's `🗑 Remove`.

**⚠️ The modal has TWO VARIANTS depending on assignee count — this is the big finding.**

**Variant A — unassigned (0 members):** short confirm.
- Title `REMOVE "BIM DUDE"?`
- Body `This permission will be permanently removed and unavailable for any project in your portfolio.`
- Buttons `Back` + **`🗑 Remove permission` (RED)`**. No member list.

**Variant B — assigned (n > 0):** expanded modal that forces you to deal with the assignees.
- Title `REMOVE "QUALITY MANAGER"?`
- Body names the count: *"…is currently assigned to **6 team members** — please use the menus below to reassign or
  remove them."*
- Section header `6 affected team members` + a **bulk `⋮`** offering:
  - **`Set all as` ▸** submenu → `Admin` · `Editor` · `View only` · **divider** · custom permissions
    (`A Custom permission`, `BIM dude`, `FAE`, `General Contractor`) — same two-tier shape as the other dropdowns
  - **`Remove all`**
- Then the member rows (Liam Carter, Sophie Turner, Ethan Brooks, Mia Johnson, Daniel Hamilton…), each with its
  own per-row `⋮` — presumably the same reassign/remove choice per person. **List scrolls** (6 members, 5 visible).
- Footer `Back` + `🗑 Remove permission` (RED).

**⚠️ Open: is reassignment mandatory?** `Remove permission` renders as a solid enabled red button even before any
reassignment is made, yet the copy says *"please use the menus below to reassign or remove them"*. Either the
button is gated on all members being handled (and the mockup shows a post-handling state) or removal simply strips
the permission and members fall back to something unspecified. **Needs answering — it decides what happens to 6
real users' access.**

**⚠️ New data requirement (beyond the edit-modal count):** this needs the **list of affected members**, not just a
count, plus a bulk reassign/remove mutation. Check what `RoleService` / project-contacts expose.

**Detail:** the permission name is **uppercased by CSS in the title** — actual name `BIM dude` renders as
`REMOVE "BIM DUDE"?`, `Quality Manager` → `REMOVE "QUALITY MANAGER"?`. Don't uppercase the stored value.

**More copy inconsistencies (same modal, two frames):** single vs double quotes around the permission name
(`'Quality Manager'` vs `"Quality Manager"`), and em-dash-no-spaces (`members—please`) vs hyphen-with-spaces
(`members - please`). Also `General Contractor` in the reassign submenu vs `General Contractor - Client` in the
list, and `General Contractor -Client` (missing space) in another submenu frame — three spellings of one record.

#### Remove flow — batch 2 (2026-07-29): it's a STAGED BATCH EDITOR

**Per-member `⋮` menu has three items:** `Set permissions` ▸ · `Move to` ▸ · `Remove`.
- **`Set permissions` ▸** submenu = `Admin` · `Editor` · `View only` (✓ marks the current value) · **divider** ·
  every custom permission (`A Custom permission`, `BIM dude`, `FAE`, `General Contractor -Client`, `Quality Manager`).
- **`Move to` ▸ submenu was never shown — genuinely unknown.** Since `Set permissions` already covers both roles and
  custom permissions, `Move to` must mean something else; the most plausible reading is *move to another company*
  (the Team tab groups members by company), but **this is not confirmed and must not be guessed at.**
- **`Remove`** marks that member for removal.

**Each row carries a pending disposition badge**, and rows differ within one screen:
`Liam Carter → Remove` (red accent, row greyed out) · `Sophie Turner → View only` · `Ethan Brooks → Editor` (cyan) ·
`Mia Johnson → View only` · `Daniel Hamilton → View only`.
⇒ **The modal holds local pending state for all N members and commits atomically when `Remove permission` is
clicked.** Not a series of immediate mutations. That shapes the implementation: a staged map of
`memberId → disposition` plus one batch mutation, with `Back` discarding the lot.

**Bulk `Set all as` writes every row's disposition at once** (one frame shows all 6 set to `View only`).

**⚠️ The reassign submenu lists the permission being deleted** (`Quality Manager` appears while removing
`Quality Manager`). Almost certainly a mockup slip — reassigning to the doomed permission is incoherent. Exclude the
target from its own submenu unless told otherwise, but worth raising.

**On "is reassignment mandatory?" — evidence now leans OPTIONAL.** In the batch-1 frames the member rows carry **no
disposition badge at all** while `Remove permission` still renders as solid enabled red. So the likely behaviour is
that untouched members simply lose the permission with an unspecified fallback. Static mockups can't distinguish
"enabled" from "styled enabled but disabled", so **still needs confirming** — and if it is optional, the fallback
state for those users must be defined.

**Success toast includes the name:** `Quality Manager permission removed` (create was
`New custom permission created`, edit was `Permission updated` — so all three differ, and only remove interpolates).

**Search-threshold:** present at 5 items, absent at 0, 1 and 3. **Superseded — see the Assign flow section: the
rule is container overflow, not an item count.**

### Assign flow — TRUSTED (high-res, 2026-07-29) — needed for PLT-1770 to be useful at all

**Path:** `PROJECT SETTINGS` → `TEAM` → member row `⋮` → **`Set permissions` ▸** → pick a value.

**The member `⋮` menu is the SAME 3-item component as in the remove modal:**
`Set permissions` ▸ · `Move to` ▸ · `Remove`. Build it once, use it in both places.

**`Set permissions` submenu structure:** `Admin` · `Editor` · `View only` (✓ marks current) — then the custom
permissions beneath. Observed with 10 customs: *A Custom permission, Another one, BIM Coordinator, Equipment
Manager, FAE, General Contractor -Client, Project Manager, Safety Officer, Site Supervisor, Quality Manager*.

**✅ Search filters ONLY the custom permissions.** With `Saf` typed (and an `⊗` clear affordance), the list narrows to
`Safety Officer` while `Admin` / `Editor` / `View only` **stay pinned above, unfiltered**. So built-ins are a fixed
header block, not part of the searchable collection.

**✅ RESOLVES the search-threshold confusion — it's overflow, not a count.** Two different components disagreed on
"5 items": the `CUSTOM PERMISSIONS` drawer showed search at 5 (and not at 3), while this dropdown submenu shows
**no** search at 5 and **does** at 10. A single rule reconciles every observation: **search appears when the list
overflows its container.** Drawer rows are tall cards (5 overflow), dropdown rows are short (5 fit, 10 overflow, and
that frame shows a scrollbar). Treat it as overflow-driven rather than hardcoding two magic numbers.

**✅ Custom-permission badge styling:** after assigning, `Autumn Phillips` reads **`Safety Officer` with a
purple/violet accent bar** — i.e. the badge shows the **permission's own name**, not the word "Custom", and purple is
the custom tier. This is the same purple used for the `Custom` roll-up badge on module headers, so the colour
language is consistent: yellow = Admin, cyan = Editor, light = View only, **purple = custom**.

**Assignment looks immediate** — no confirmation modal and no toast in the resulting frame. Sensible, since it
touches one member (unlike editing a permission definition, which fans out to everyone assigned).

**⚠️ Ordering, again non-alphabetical:** `Quality Manager` sorts *after* `Site Supervisor` in the submenu. Combined
with the earlier list-view inconsistency, ordering is genuinely unspecified across both surfaces — needs a decision.

**⚠️ `Move to` still unexplained,** but it now appears in the Team tab too, where members are grouped under companies
(`Bugle Boy`, `XYZ Reality`). That strengthens the "move to another company" reading — **still not confirmed**, and
its submenu has never been shown in any batch.

### Create / Edit / Delete map 1:1 onto the three linked tickets
| Sheet | Ticket | Flow (structure only — copy not legible) |
|---|---|---|
| Create | **PLT-1770** (this) | `Custom permissions` list (incl. an empty state) → create form with a **name field** + the module/slider stack → save → **green success toast** → back to list |
| Edit | **PLT-2926** | list → row hover/select → `EDIT PERMISSION` form (name + sliders, footer Cancel/Save) → **`UPDATE PERMISSION?` confirm modal** → green toast |
| Delete | **PLT-2927** | **two entry points ("OR")** → destructive confirm modal with a **red** action button, apparently including a step to reassign affected members → green toast |

Edit requiring a confirm modal implies the backend applies changes to already-assigned members immediately —
worth confirming, and it shapes whether create needs one too (it appears not to).

### Reuse targets confirmed in code (do NOT rebuild these)
- **Drawer shell:** `TeamTab/components/Slider.tsx` — already back-chevron + title + `×`, exactly the mockup anatomy.
- **Invite panel:** `TeamTab/InviteToProjectSlider.tsx` already has `MultiEmailAutocomplete` for the chips,
  a `Select` under a `Permissions` label rendering `ROLE_OPTIONS` as `MenuItem`s, and the `Cancel`/`Invite` footer.
  → the change here is feeding custom permissions into that existing `Select`, not a new panel.
- **Searchable dropdown:** `pages/organisation/ViewerPage/components/common/select/search-select.tsx` already
  exists alongside `select.tsx` — use it for the searchable permissions dropdown instead of writing one.
- **Confirm modals:** `TeamTab/CompanyDetailsSlider.tsx:738,760` shows the established `<Modal open={…}>`
  single- and bulk-remove confirmation pattern → reuse for `UPDATE PERMISSION?` and the delete confirm.
- **Toasts:** `useToastService()` (already used in `TeamContent.tsx`) for the green success toasts.

## Blockers / open questions
1. **Commissioning gate is OFF.** Branch `claude/nice-darwin-bgfon2` has no `commission`; no `.claude/commissioning-active`;
   `constants.ts:889` → `{ name: 'Commissioning', value: false }`. The Confluence modules are entirely commissioning
   (`readiness`, `Asset*`, task templates). **Also a naming collision:** branch convention demands the branch be
   named exactly `PLT-1770`, which does *not* contain "commission" — so the gate must be enabled via the
   **marker file**, not the branch name. Needs an explicit scope decision before writing code.
2. **Is PLT-1770 the generic framework, or framework + commissioning modules?** Ticket description + Figma
   describe the *generic* Custom-permissions UI (empty state, list, Create new permission, module accordions,
   sliders, permission details). The Confluence page adds *commissioning-specific* module content.
   Darminder (24 Jul): "@Jason Fingland to add further details for commissioning custom permissions."
3. **Should commissioning modules be hidden behind the `Commissioning` flag?** Since the flag defaults off,
   showing Readiness Templates / Task Library / Asset & System / Task execution to every project would leak an
   unreleased feature. Strongly suspect they must be flag-gated inside the permissions UI. Needs confirming.
4. **"No access" + "Custom" are new levels** — current system has only Admin / Editor / View only
   (`roleConstants.ts`; `useProjectRoles.ts:56` hard-filters to those three names). Both need adding, and level
   sets differ per feature (see design spec above), so the control must be data-driven.
5. ~~No existing stepped level control~~ **RESOLVED by design:** it is a custom **stepped range slider** with
   snap-to-nearest-node, left-bias tie-break, and clickable node hit-areas. Nothing in `shared/` provides this
   (grep clean) → **new component required**. MUI `Slider` supports `marks` + `step={null}` for snapping, which
   gets most of the way; the left-bias tie-break and the Custom/continuous header position need custom handling.
6. **Roll-up position algorithm is under-specified.** "The module slider will position itself accordingly" —
   the screenshots are consistent with the header handle sitting at the **mean of its children's level indices**,
   rendered *continuously* (not snapped) while the badge reads `Custom`. That is my inference, not stated.
   **Strengthened 2026-07-29:** the list-view mini meters are continuous (sub-step fills like a thin sliver and
   ≈¼), which only makes sense if a module's aggregate is a continuous value rather than one of 3–4 stops.
   Still worth an explicit confirmation, since mean-vs-min-vs-max changes the numbers users see.
7. **Mixed level sets break push-down.** `PROGRESS` header set to `Admin` pushes `Admin` to children — but
   On-site progress / 360 Captures / Schedule top out at `Editor`. Presumably clamp to each child's max, but
   the design doesn't say. Same problem inverts the roll-up mean (different scales per child). **Unspecified.**
8. ~~Container flow unseen~~ **RESOLVED for CREATE** (high-res batch: entry point, empty state, form, validation,
   button states, node rendering — all captured above). **Residual gap: the EDIT and DELETE sheets are still
   only low-res strips** — copy, field labels and the delete-reassignment step need a full-size pass. Those
   belong to PLT-2926 / PLT-2927 rather than this ticket, so they do not block PLT-1770.
10. **⚠️ NEW — custom permissions break the existing invite role hierarchy.** `InviteToProjectSlider.tsx:118-135`
   enforces *"Users can only invite others with roles equal to or lower than their own"* via a `roleHierarchy`
   map over `ROLE_OPTIONS`. A custom permission has **mixed per-feature levels**, so it isn't comparable on a
   linear hierarchy. Unanswered: can an Editor grant a custom permission that contains Admin-level features?
   Options: compare on max level within the permission, forbid granting custom permissions below Admin, or
   exempt them. **The design does not address this and it is a genuine privilege-escalation risk.**
11. **Edit-vs-live-assignment semantics — largely ANSWERED.** The `UPDATE PERMISSION?` copy
   (*"will affect the access of 15 users"*) confirms edits **propagate immediately** to everyone assigned.
   Create does **not** get that modal — it gets the `DISCARD CHANGES?` guard, a different thing.
   Residual: the modal needs an **affected-user count** the API may not expose yet, and the copy says
   *"in your portfolio"* on a project-level permission — clarify which scope to count.
12. **Role-equivalence advisory scope.** The `Custom permission provides the same level of access as "Viewer".`
   notice needs its rule pinned down: which built-in roles it compares against, whether it fires on partial
   overlap or only exact equality, and whether equality is judged on module headers or on every leaf feature.
   Non-blocking for save, so it can ship in a second pass if needed — but the string and trigger must be right.
13. **Duplicate-name handling unspecified.** `Permission name` is required, but nothing in the mockups covers a
   name colliding with an existing custom permission or with a built-in role name ("Admin"/"Editor"/"View only").
   Needs a validation decision.
9. **Self-referential gate:** the Team Management detail bullets say *"create custom permissions (available when
   invited at the Portfolio level only)"* — so this feature is itself permission-gated to Portfolio-level invitees.
   Check against `useProjectAuthorities` / `useHasProjectAuthorities` when wiring the entry point.

## Design assets — accessibility status
- **Figma (5 links, all node refs on file `TNEj04ZJ9IkZzmxdldiLjh` Web-Portal-2024):** slider behaviour `17199-188298`,
  module behaviour `17199-187974`, permission details `17319-53444`, proto `17290-145330`, full design+flow `19465-132943`.
  Direct fetch → **HTTP 403**. Figma connector is org-`connected: true` but **`enabledInChat: false`**, so its tools
  are not loaded → cannot read nodes.
  **✅ RECEIVED as screenshots 2026-07-29** (decoded into "Design spec" section above): *Permission module*,
  *Quality Permission module*, *Permission sliders details*, *Custom Permission slider* — i.e. nodes
  `17199-187974`, `17319-53444`, `17199-188298` equivalents.
  **❌ STILL MISSING:** the full design + flow (`19465-132943`) and prototype (`17290-145330`) — these hold the
  container flow described in blocker 8.
- **Jira inline images (4):** `blob:https://media.staging.atl-paas.net/...` — the real attachments are
  `image-20250610-162347.png` (Team tab entry), `-162444`, `-162517`, `-162837` (empty state / list / create form).
  Attachment auth has previously failed for this agent (see PLT-2531).
- **Video:** `Custom permissions.mov`, 185 MB, Jason Fingland — prototype flow walkthrough. Not consumable.

## API / BE readiness (assessed 2026-07-29)

**Caveat: this is inferred from the frontend client only.** The BE repo is outside this session's repo scope
(`hc-frontend` + `xyz-platform-context`), so nothing below is confirmed against server code. The ticket already
says *"should work with V1 'iam' API, if there are issues please check with Sergey"* — these are the questions for him.

### ✅ Exists, and proven by a working precedent
`src/main/webapp/app/pages/organisation/RolePage/RolePage.tsx` **already creates and updates project-scoped roles**:
it sets `type: AuthorityMainCategory.PROJECT_BASED`, attaches `entity.project = { id }`, builds the payload via
`mapRoleTreeDataToApiPayload` and calls `serviceProvider.Roles[isNew ? 'create' : 'update']`. So the whole
"custom project role composed of authorities" concept is live, not speculative.

| Need | Endpoint | Status |
|---|---|---|
| Create / read / update / **delete** a role | `ms/iam/api/roles` (full CRUD via `ApiBaseService`) | ✅ |
| List project roles | `ms/iam/api/project-roles` | ✅ |
| Fetch the permission tree | `authority-categories` + `authority-subcategories` + `authorities`, combined by `authorityService.getAllAuthoritiesData()` | ✅ |
| **Affected members for the remove modal** | **`ms/iam/api/project-role-users?projectId=&roleId=`** → `IProjectRoleContactInfo[]` (`projectService.ts:84`) | ✅ — this is exactly the list the remove modal needs |
| Existing tree editor UI | `app/components/RoleTree` (+ `mapApiPayloadToRoleTreeData`, `findCheckedKeys`) | ✅ reusable logic |

### ⛔ THE blocker: the API has no ordinal "level" concept
The iam model is an **unordered checkbox tree**:
`IAuthorityCategory { name, order, authoritySubcategories[], authorities[] }` →
`IAuthoritySubCategory { name, description, authorities[] }` → `IAuthority { name, code, order }`.
`findCheckedKeys` and `RoleTree` treat it as exactly that — a set of checked ids.

The design needs something different: **per feature, an ordered ladder** `No access < View only < Editor < Admin`,
where each stop implies a specific authority set, and **the ladder differs per feature** (4 stops for Project
Details/QR codes/Cost/Quality; 3 for Models/Coordinates/On-site/360/Schedule; `No access · View only · Admin` for
Integrations/Devices; `No access · Editor · Admin` for Team Management — no View only).

Nothing in the model expresses that. The subcategory names in the existing test fixture are *feature* names
(`"Notification Template"`), **not** level names — so subcategories are not secretly the levels.

Two ways out, and it's a real fork:
- **(a) BE adds levels** — an ordinal rank plus per-feature level definitions. Clean, and the slider maps directly.
- **(b) FE owns a mapping table** `feature → level → authority-code set`, deriving the slider position by matching
  the stored authority set back to a level. **Fragile:** any stored set that doesn't exactly equal a level is
  unrepresentable on a slider (and `RolePage` can produce exactly such sets, since it checks arbitrary authorities).
  Also silently couples the FE to authority codes.

**This decides the shape of the whole feature and must be answered before writing the slider.**

### ⛔ Quality module extras have no backing at all
`Assigned Issues only` and `Limit to Issue Type` are **not** representable today:
- grep for `assignedIssuesOnly` / `assigned_issues` / `onlyAssigned` across the app → **zero hits**. The concept
  doesn't exist in the FE, despite the Confluence page implying it already does ("matching the Assigned Issues only
  behaviour").
- `IRole` has **no field** for an issue-type restriction, and issue types (`IIssueType`) are not linked to roles.
⇒ Both need new BE fields on the role plus a way to persist a selected issue-type list. Same applies to
commissioning's `Can manually override readiness steps` / `Assigned tasks only`.

### ⚠️ Smaller gaps
- **Portfolio-wide affected count** for `UPDATE PERMISSION?` ("15 users in your portfolio"): `project-role-users` is
  **projectId-scoped**, so the portfolio-wide number may not be obtainable. Ties into the scope-wording question.
- **Bulk reassign mutation** for the remove modal's staged dispositions: nothing bulk exists, so it would be N
  sequential per-member updates unless BE adds a batch endpoint. Given the modal commits atomically, N sequential
  calls means partial-failure handling.
- **Commissioning authorities** (Readiness Templates / Task Library / Asset & System / Task execution) presumably
  don't exist as authority records yet — needs confirming alongside the commissioning scope question.

## Readiness assessment (2026-07-29, after 5 mockup batches)

**Design is essentially complete for CREATE.** Buildable now without further design input:
drawer shells, the stepped permission slider (snap / left-bias tie-break / clickable nodes), per-feature level
sets, details accordions with ✓/✗ bullets, the module accordions, the list view with per-module mini meters,
the empty state, the create form + validation, `DISCARD CHANGES?`, and the success toast.

**Still blocked on decisions, not design:** 1–3 (commissioning scope + flag gating), 7 (push-down clamping onto
shorter level sets), 10 (invite role-hierarchy conflict — the one with a security dimension), 12 (role-equivalence
notice rule), 13 (duplicate-name validation), plus list ordering and the three copy inconsistencies.
6 (roll-up positioning) is now evidenced well enough to build as mean-of-children.

**Recommended split** — PLT-1770 is large enough that landing it as one PR is a review burden:
1. Shared primitives: permission slider + module accordion + details accordion (no API).
2. `CUSTOM PERMISSIONS` list + empty state + search, wired to `RoleService`.
3. Create form + validation + discard guard + toast.
4. Wire custom permissions into the two dropdowns (member row + `InviteToProjectSlider`) — **gated on blocker 10**.
Steps 1–3 are independent of the commissioning question; step 4 is where the risk sits.

## Next steps
1. Get the design behaviour (screenshots from user, or enable Figma connector in-chat).
2. Resolve blockers 1–3 with the team (commissioning scope + flag gating).
3. Confirm the role/authority-category mapping with Sergey (blocker: hypothesis above).
4. Then: `git checkout -B PLT-1770 origin/master`, `touch .claude/commissioning-active` if commissioning is in scope,
   build on `Slider.tsx` + `TeamAccordionSection.tsx` + `mapRoleTreeDataToApiPayload`/`findCheckedKeys` + `RoleService`.
   Keep PR draft. Flag to PLT-2926/2927 that they branch off this one.

---

## Implementation status (updated 2026-08-04)

### Slice 1 has LANDED as a draft PR — do not rebuild it

**#2087 — "PLT-1770: Custom permission slider primitives and IAM adapter seam"**, branch `PLT-1770`,
draft, **CI green on both PR Check and Multibranch**. 10 files, ~1069 added lines, 28 unit tests.
Head is `60e5611` (was `da65cad` — amended on 2026-08-04 purely to correct the commit author from
`Claude` to Ilia; tree unchanged).

What it contains — this is step 1 of the "Recommended split" above:

| File | Role |
|---|---|
| `permission-levels.ts` | level ladder, badge mapping, node snapping, clamping |
| `permission-modules.config.ts` | 3 modules, features, per-feature ladders, detail bullets |
| `permission-state.ts` | roll-up → `Custom`, push-down w/ clamping, minimum-grant, role equivalence |
| `permission-adapter.ts` | **the single IAM seam — intentionally throws** |
| `components/PermissionSlider.tsx` | stepped slider + badge |
| `components/PermissionDetails.tsx` | ✓/✗ details accordion |
| `components/PermissionModuleSection.tsx` | module accordion, header ↔ children wiring |

**Why `permission-adapter.ts` throws instead of mapping.** The UI models access as an *ordered
ladder per feature* (No access < View only < Editor < Admin); IAM models permissions as an
*unordered tree* (authority category → subcategory → authority) with **no rank on any node**, and
the seeded subcategory names are *features*, not levels. So a slider position cannot be turned into
authorities until the level representation is decided (backlogged as **PAPI-3717**, whose scope is
portfolio-invitation assignment and which *assumes* role creation already works).

⚠️ **The sharp bit, worth re-reading before anyone "finishes" the adapter:** `ms/iam/api/roles` CRUD
**already works today** (`RolePage.tsx` uses it). A speculative payload would **not fail safely** —
it would *succeed*, writing malformed roles into real IAM. Hence the throw. That file is the only
one that needs to change once the level model is settled.

Also deliberately omitted, and why: Quality's `Assigned Issues only` / `Limit to Issue Type` (IAM has
no field to persist either — rendering them would silently drop the user's choice), and the
commissioning modules (flag-gated, out of scope).

Two items in `permission-modules.config.ts` are **provisional and marked in-file**: the per-feature
ladders (the module sheet shows Schedule at Admin, the details sheet doesn't offer it — one is wrong)
and each bullet's `minLevel`. Bullet *text* is verbatim.

### Slices 2–4 NOT started — held deliberately

Slices 2 (list + empty state + search, wired to `RoleService`) and 3 (create form + validation +
discard guard + toast) are, per the split above, independent of the commissioning question and
technically buildable. They have **not** been started, for two reasons:

1. The 22 open questions at the top of this file are **still unanswered** (since 2026-07-29), and
   still **not posted to Jira** — PLT-1770 has exactly one comment (Darminder, 2026-07-24). Building
   more UI on an undecided level model risks throwaway work.
2. PLT-1770 sits in **`Dev In Progress`**, which is outside the kick-off set the scheduled routine
   is authorised to take on.

Slice 4 (wiring into the two dropdowns) remains gated on blocker 10 — the invite role-hierarchy
conflict, the one with the privilege-escalation dimension.

### Next run: what actually needs to happen

1. **Get a decision on posting the 22 questions to Jira.** Escalated by push notification
   2026-08-04. Until then they remain visible only in this file.
2. Nothing else on PLT-1770 is unblocked. #2087 needs a reviewer, not more code — and it is draft
   on purpose.

---

## 2026-08-04 (later) — the design is now decoded from the Figma Make export, not screenshots

Supersedes nothing above; this **adds** the precise geometry that the screenshot-based spec earlier
in this file could only approximate. Where a number here disagrees with an earlier paragraph, this
section wins — it came from the exported React/Tailwind source, not from reading pixels.

### Where the export came from

Ilia pushed `Implement Template Styles/` (a Figma Make React + Vite + Tailwind v4 app) onto the
`PLT-1770` branch as commit `a082feb`, purely as a reference. Three screens:

| Export file | Screen |
|---|---|
| `src/App.tsx` | the **list** (hand-written; also the only source for the kebab context menu) |
| `src/imports/CustomPermissionModal-1/index.tsx` | **create** (3,320 lines, 326 functions) |
| `src/imports/CustomPermissionModal/index.tsx` | **edit** (1,156 lines) |

The folder was **removed again** on the branch once transcribed (commit "Drop the temporary Figma
Make export"). It stays recoverable from that branch's history. Its values now live in
`CustomPermissions/design-tokens.ts`.

### The single most important finding: the bar is a three-pass paint

The design's "Permission Bar V3" is **not** expressible with MUI's `Slider`. It stacks three layers:

1. `BarBG outline` — an 8px track (`left:7 right:8 top:4`, bg `#1f1f1f`) with a 1px border, plus
   16px circles at each node, also 1px-bordered.
2. `BarBG top` — **the same two shapes again, with no borders at all**, painted over layer 1. This
   is what erases the border segments where a node overlaps the track, so the whole assembly reads
   as one continuous silhouette rather than circles crossing a pill.
3. `Bar drag` — the 4px gradient fill (`#003b1b → #00ea6c`), 10px gradient dots at every node **up
   to and including the current one**, and a 24px `#e9e9e1` handle with an 18px `chevron-expand`
   glyph in `#007536`. Node hit targets are 32px.

MUI's `rail`/`track`/`mark` model cannot produce layer 2, which is why the first attempt looked
wrong no matter how the marks were styled. **If a future ticket touches this bar, do not try to put
it back on MUI's Slider.** It is now `components/PermissionBar.tsx`.

Two size variants: **module** bars are 22px tall with `#4f4f4f` outlines; **feature** bars are 16px
with `#303030`. Everything else is identical.

At `No access` (index 0) the first node **still shows its gradient dot** and the fill bar is fully
transparent — confirmed against the Quality module, which is the export's only `No access` state.

### Colours and metrics (all now in `design-tokens.ts`)

| Token | Value | Used for |
|---|---|---|
| panel | `#1a1a1a` | drawer background; also the Save button's *label* colour |
| module body | `#141414` | behind the feature rows |
| module header / list card | `#1f1f1f` | header strip, list card, node fill |
| border | `#303030` | every divider, feature-bar outline, empty meter track |
| strong node outline | `#4f4f4f` | module-bar nodes and track only |
| text / muted | `#e9e9e1` / `#8c8c8c` | primary / labels, placeholders, details accordion |
| input | `#000000` | search field and the name field |
| gradient | `#003b1b → #00ea6c` | bar fill, node dots, card meters |
| handle chevron | `#007536` | the glyph inside the 24px handle |
| accent | `#ffde14` | Save, and the highlighted `Edit` menu item |
| granted / denied | `#00ea6c` / `#fd3d39` | detail ✓ and ✗, and the required-field asterisk |
| tracking | `0.45px` | **every** string in the modal |

Structural numbers worth keeping: module card radius 8 with a 1px border; header `p:16` and `gap:8`
between the chevron holder (`py:4`, to line a 16px chevron up with a 24px title) and the content
column (`gap:16`); expanded body `pt:16 pb:8 gap:8` with an inset shadow
`inset 0 4px 16px rgba(0,0,0,0.4)`; each feature row `px:24 pb:8` with a bottom hairline except the
last, its own `TopSection` at `p:16 gap:16`, and its details block at `pt:8 px:16 pb:16`.

### Typography, which the screenshots got wrong

- **Module** title: Roboto **Medium (500)**, 16/24, uppercase. Earlier implementation used 700.
- **Feature** title: Roboto **Bold (700)**, 16/**22**.
- Details accordion ("Show details"): Roboto Bold, 16/22, `#8c8c8c`, 16px chevron, `gap:8`.
- Detail bullet text: Roboto Regular 16/24, `#8c8c8c`, with a 24px icon and only `gap:4`.
- Level chip: Roboto **SemiBold** 14/**12**, `padding:6`.

### The level chip cannot reuse the shared `Badge`

The design's badge is **radius 2** with a **0.2px** hairline border and a **4px** highlight bar; the
app's shared `Badge` is radius 4 with a 0.5px border and a thicker bar. Matching it in the shared
component would have moved every other badge in the app, so PLT-1770 ships a local
`PermissionLevelBadge`. **Do not "fix" this by pointing it back at the shared Badge.**

Colour mapping: `No access` → `#303030`, `View only` → `#dbdbdb`. **The export contains no other
state** — every module and feature in it is at one of those two — so Editor and Admin colours are
*ours*, reusing the app's accent ramp (`#2ef0ff`, `#ffde14`). Worth confirming with design; it is
not a decoded fact.

### The whole title row is the expand control

`function Accordion()` in the export is a `<button>` wrapping the entire title-plus-badge row, not
just the chevron. Fixed. (Leaf modules — Quality — get a `div` instead, and an invisible chevron so
their header still aligns with the modules above and below.)

### Kebab and context menu (from `App.tsx`, the only place they appear)

Kebab is **always visible**: 16px vertical-dots icon `#e9e9e1` on a black `padding:4` box, radius 4,
1px `#303030` border. The menu opens **to the left** of it (`right:28 top:-6`), not below —
`w:161`, bg `#1f1f1f`, radius 4, 1px border, shadow `0 4px 10px rgba(0,0,0,0.4)`, `padding:4`, with
a 12×20 arrow pointing back at the button. `Edit` is a **highlighted** row (bg `#ffde14`, text
`#1a1a1a`); a hairline divider; then `Remove` (text `#e9e9e1`, hover `#2a2a2a`). Both rows are
12/14 Regular with `padding:5px 16px`.

Now built, with both items rendered **disabled** — the actions themselves are PLT-2926 (edit) and
PLT-2927 (remove). Wiring two props is all those tickets need on the list side.

### Create-form shell

Body `px:32 py:24` with `gap:32` between blocks — name field (max 560, bg black, radius 6, 1px
border, `px:16 py:9`, label Roboto Bold 16/24 `#8c8c8c` with a `#fd3d39` asterisk), hairline
divider, then the three module cards. Footer: border-top `#303030`, `p:32`, `justify-end`,
`gap:16`, two **fixed 272×40** buttons — Cancel (bg `#1a1a1a`, 1px border, text `#e9e9e1`) and Save
(bg `#ffde14`, text `#1a1a1a`), both SemiBold 16/24.

**MUI `Button` is not used for these.** `color='secondary'` resolves to `palette.secondary.main`
(a dark asphalt grey) which is invisible on these panels — that was the cause of the "there's no
custom permissions button at all" report earlier the same day. `components/FormButtons.tsx` is
plain styled `<button>`s.

### List shell

Search field is **centred at a fixed 560px** above the divider (not stretched, and not inside the
scroll area), 42px tall, bg black, radius 6. Scroll area `p:32` with `gap:24` between cards and a
trailing 16px spacer. Footer `px:32 py:16`, `justify-end`, one auto-width button (min 56, max 200,
40px tall, SemiBold 16/24).

The card itself: bg `#1f1f1f`, radius 8, **`box-shadow`** `0 4px 5px rgba(0,0,0,0.24)` and
asymmetric padding `8px 8px 11px 16px`. The export uses a `drop-shadow` *filter* here — **don't
copy that**: a filter creates a stacking context, which lets the next card in the list paint over
this card's open actions menu.

### Pitfalls hit while building this, for the next run

1. **`min-release-age=7` did not block `brace-expansion@5.0.9`.** #2088 went fully green on 04 Aug
   despite the version being 5 days old. The earlier prediction in that PR's body ("CI may fail to
   install until ~06 Aug") was wrong. It is mergeable now and unblocks Trivy for every open PR.
2. **`npm ci` cannot complete in the agent environment** — 401 from `npm.pkg.github.com` for the
   private `@xyzreality/dhtmlx-gantt`. Workaround that *does* work, and is worth reusing: install
   `react @types/react @mui/material @mui/icons-material @emotion/react @emotion/styled typescript`
   into a scratch dir, symlink it in as `hc-frontend/node_modules`, and run `tsc` against a
   throwaway tsconfig that includes only the folder under test. That gives a **real** typecheck of
   MUI props, not just syntax. Same trick with `jest ts-jest @types/jest` runs the pure-logic tests.
   Remember `types: ['jest']` in the inline ts-jest tsconfig or every `describe`/`expect` errors.
3. **Commits on `PLT-1770` were authored as `Claude <noreply@anthropic.com>`** for the first nine
   commits, against Ilia's standing instruction that commits go out under his name. Fixed with
   `git filter-branch --env-filter` over `origin/master..HEAD` plus a force-with-lease. **Set
   `git config user.name/user.email` at the start of a session in this repo**, not at the end.

## 2026-08-04 (evening) — PLT-2926 and PLT-2927 folded into PLT-1770; the click-through bug

### The bug that made three separate complaints into one

Ilia tested and reported, in escalating order: the list is not interactive, nothing is editable,
the create button "only works from a random cursor position", and the layout looks arbitrary.
The first three were **one defect**:

`TeamSliders.tsx` computes its **own local** `isSliderOpen`, separate from the one in
`useTeamState.ts`, and it gates `pointerEvents` on the absolutely-positioned overlay container
that every drawer renders inside. The two custom-permissions drawers were added to
`useTeamState`'s copy and **not** to `TeamSliders`' copy, so the container stayed
`pointer-events: none` and the entire feature was unclickable while looking perfectly normal.

**If you add a drawer to `TeamSliders.tsx`, add it to that boolean.** It is the single highest-cost
mistake available in this file. Fixed with a comment saying so.

### Do not trust the export's fixed pixel widths

The Figma export is a **624px dialog with a 560px content column**. So `560` (search field, name
field) and `272 + 16 + 272 = 560` (footer buttons) all line up *in that dialog*. Ported literally
into the Team tab's drawer — which is far wider — they produced five different right edges (754,
617, 603, 755, 874). The rule that reproduces the design's *intent* is: everything spans the
drawer's width inside its 32px gutter. Buttons share the row via a flex slot.

Related: `Save` came out **136px** against Cancel's 272 because the MUI `Tooltip`'s required
`<span>` wrapper collapsed to the label width. Both buttons now sit in an identical `ButtonSlot`.

### What is now live, and the reason the split held

| Action | State | Why |
|---|---|---|
| list / search / empty state | live | `ms/iam/api/project-roles` |
| **remove** (was PLT-2927) | **live** | `DELETE roles/{id}` needs no ordinal level |
| **rename** (was PLT-2926) | **live** | `PUT roles/{id}` echoing the role back, only `name` replaced |
| set levels (create or edit) | blocked | BE-1 / PAPI-3717 |

The insight that unblocked two thirds of the feature: **only the level mapping is blocked, not
"writes"**. Renaming sends the role back exactly as it arrived with `name` swapped, so the
authority tree is echoed rather than rebuilt — the code cannot invent or drop an authority. That
is a categorically different risk from `toRolePayload`, which would have to *construct* authorities
from a guessed level model and would succeed at writing a malformed role.

Edit mode therefore shows the level bars **read-only with a notice**, because `fromRole` still
can't resolve a stored role's authorities back to levels. Movable bars there would invite edits
that get silently discarded — worse than admitting the gap.

`CreatePermissionForm` is now `PermissionForm` with `mode: 'create' | 'edit'`; the two differ in
exactly three conditions (validity rule, IAM block, bars disabled) and nothing else.

### Verification: the harness is the actual lesson from today

Three rounds of "looks broken" happened because the components were never rendered. `npm ci` can't
complete in the agent environment (401 on the private `@xyzreality/dhtmlx-gantt`), so there is no
dev server — but there **is** a headless Chromium at `/opt/pw-browsers/chromium`, and that is
enough:

1. scratch-install `react react-dom @mui/material @mui/icons-material @emotion/react @emotion/styled
   esbuild playwright jest ts-jest @types/jest` into a temp dir with a real `package.json`
   (install them in **one** `npm install`, or a later install prunes the earlier packages);
2. `ln -sfn <scratch>/node_modules /home/user/hc-frontend/node_modules` so files under the repo
   resolve their imports;
3. `esbuild harness.tsx --bundle --alias:cp=<component dir> --alias:app=<webapp/app>`;
4. drive it with Playwright — screenshots for layout, `elementFromPoint` for hit-testing,
   `getBoundingClientRect` for alignment assertions.

**The harness must reproduce the real composition, not just the component.** The click-through bug
was invisible until the harness included the `pointer-events`-gated overlay wrapper. A component
rendered in isolation passed every check.

Bugs this found that review and typechecking had both missed:
- the permission bar rendering **completely invisible** (1px `border` with `box-sizing: border-box`
  sits *inside* the box that the design's second, borderless pass paints over, erasing every
  outline; the export puts the ring at `inset: -1px`, so use `outline`, which is drawn outward and
  takes no space);
- a **fast click never committing** on the bar — `pointerup` was added in a `useEffect`, and React
  scheduled that effect after `pointerdown`, so a quick release fired before the listener existed.
  Pointer capture attached synchronously in the handler fixes it and also retargets events when
  the pointer leaves the element;
- Quality (leaf module) rendering its details unconditionally with a hidden chevron;
- 40% opacity on the accent yellow reading as muddy olive for disabled Save / disabled Edit;
- `Custom` sharing Admin's yellow, making the two chips indistinguishable;
- the menu arrow being a solid triangle the same colour as the card behind it;
- a `filter: drop-shadow` on the card creating a stacking context that would let the next card
  paint over an open menu.

Also: **widen the throwaway tsconfig to the whole feature folder, not just the leaf directory.**
Restricting it to `CustomPermissions/**` missed a broken JSX fragment in `TeamSliders.tsx` that
would have failed the build; including all of `TeamTab/**` caught it immediately.

### Still open, and now escalated in the PR

1. **Team Management has no `View only` rung**, so nudging the PROJECT MANAGEMENT header one step
   immediately shows `Custom` with one feature left at No access. Correct per config, looks like a
   bug. Either the ladder gains a rung or roll-up stops counting a *clamped* feature as
   disagreement. **Design decision.**
2. D-1 grant hierarchy (privilege escalation) — still blocks assigning permissions to people.
3. Schedule ladder contradiction between the module sheet and the details sheet.
4. Editor/Admin chip colours are ours, not decoded.

---

## 2026-08-05 — local level store lands: the feature is complete end to end; branch at `c8fa7bf`

Three commits since the 08-04 (evening) entry, one of them an architecture change. This section is
the current truth; where it contradicts "Save cannot persist" statements above, those are
superseded — the constraint moved, it didn't disappear (see the store section).

### 1. Viewport hijack (`746500c`) — opening the Team tab landed on the create form

Two combined mistakes: the three custom-permission sliders passed children **unguarded** (a `key`
remounts but never unmounts, so both forms stayed live inside closed drawers translated 100% off to
the right), and the edit form's name field had `autoFocus` — so the browser focused an input inside
an off-screen drawer at mount and scrolled it into view, dragging the drawer over the tab. Measured:
scrollY 4589, tab content at y=-4545.

Fixes: children gated on `open` **exactly like every other slider in TeamSliders.tsx** (this is the
second TeamSliders convention violated with the same "looks fine, behaves broken" signature — the
first was `isSliderOpen`), and autoFocus removed permanently (the drawer animates on a transform;
focusing mid-transition scrolls regardless).

**Process lesson, recorded because it cost a full round-trip with Ilia:** the symptom had already
appeared in my own harness — the page loaded scrolled to the edit form and a 9/9 click test went
0/9. I diagnosed the autoFocus correctly and then *patched the test to scroll first* instead of
asking why a closed form scrolled anything. When a test needs a workaround, the workaround is
usually the bug. Regression guard now asserts: drawers closed ⇒ scrollY 0, focus on body, no form
in the DOM — and it was verified to fail 4/5 with the bug reinstated.

### 2. Local level store (`66f37b2`) — Ilia's explicit direction, and the new architecture

Verbatim instruction: *"create a local temporary storage where we keep permission changes in case
if some stuff is missing on BE side… everything must work as completed thing."* The read-only
banner is gone. The split:

| Data | Lives where | Why |
|---|---|---|
| existence, id, name, deletion | **IAM** (`ms/iam/api/roles`) | works today; create POSTs, rename PUTs, remove DELETEs |
| per-feature levels | **`localStorage`**, key `hc:custom-permission-levels:v1`, shape `{project → roleId → PermissionSelection}` | authority tree has no rank; PAPI-3717 undecided |

- `permission-adapter.ts` is now implemented: `toRolePayload` sends name + PROJECT_BASED + project
  id and **deliberately no authority arrays** (an empty role, not a corrupt one — still nothing in
  the diff can invent or drop an authority); `fromRole` reads name from BE, levels from the store.
  `canResolveLevels = true`; new flag `levelsAreLocalOnly = true` — flip when PAPI-3717 lands.
- Migration path when BE catches up: `readProjectLevels(projectId)` → PUT each role with real
  authorities → `clearProject`. One place to change.
- **Stated consequences** (tell anyone testing): levels are per-browser — another user or machine
  sees defaults; a role created here grants nothing in IAM until levels can be translated. It IS
  real and assignable as a role.
- Store reads are all-defensive (corrupt JSON / array / primitive / revoked storage / throwing
  getItem / quota ⇒ defaults, never throw) — 18 tests pin those paths, plus: deleted role id reused
  ⇒ must NOT inherit old levels (`removeLevels` after the DELETE confirms).
- Everything downstream got real: `useCustomPermissions` returns `{role, selection, summaries}`
  (levels attached in a useMemo, not the query fn, so mutations re-read them); card meters fill
  from real rollups; edit shows the permission's own levels; `useSavePermission` writes name to BE
  (PUT skipped when unchanged) + levels to store atomically-enough (failed rename fails the save).

### 3. Hover + edit-expansion (`c8fa7bf`)

- Cards had **no hover state**; Ilia flagged they should match "cards across the platform with the
  blue shaded border". Convention found in `PortfolioDashboardPage/.../ProjectCard.styled.ts`:
  `secondaryGlow` **#2EF0FF** 1px border + lighter fill + deeper shadow, with
  `border: 1px solid transparent` by default so hover never shifts layout. Applied only when the
  card is openable, mirrored on `:focus-within`.
- "Modules not expandable in edit" report: expansion **was already working** at `c8fa7bf` —
  measured 3 expandable rows, bars 3→10 on expand, aria-disabled=false. What Ilia hit was the
  pre-`66f37b2` build where edit passed `disabled` to every bar (rows opened, nothing movable).
  Checked the exported edit mockup (recovered from branch history): modules ARE drawn collapsed
  there, so collapsed-by-default matches design.
- Harness self-bugs found (third occurrence of the pattern): fixtures cast `as never` hid the
  list's shape change; a fixture passing no `onEdit` made cards non-interactive so the hover rule
  never emitted. **Fixtures must mirror TeamSliders' real wiring, not the minimum that renders.**

### 4. PR / CI state as of this entry

- **#2087** now titled "PLT-1770 + PLT-2926 + PLT-2927" — edit and remove are folded in; those two
  tickets have no list-side work left (assign-side, if any, remains).
- CI on `c8fa7bf`: **Build & Run Tests passed (5m18s)** — the real toolchain compiled and tested
  everything including the store. Only red step: Trivy (`brace-expansion` CVE-2026-69152,
  repo-wide, not this diff). One JDK-setup flake traced to the runner *pool*
  (`XYZ-Prod-MongoDB-Backups` label — setup-java died in 1s, everything skipped); rerun fixed it.
  If it recurs on that label it's an infra ticket, not a branch problem.
- **#2088** (brace-expansion 5.0.9): **approved by rishib-xyz 2026-08-05**, mergeable_state clean,
  all checks green — but still **draft**. Needs undraft + merge; Ilia hasn't said go. Once merged,
  Trivy goes green on every open PR. (min-release-age concern is moot — CI installs it fine, and
  the version clears the 7-day buffer 08-06 anyway.)

### 5. Figma MCP — connector state and the master frame URL (record for the next session)

- The design's source frame: **`Web-Portal-2024`, file `TNEj04ZJ9IkZzmxdldiLjh`, node
  `17213-217579`** (the "Implement this design from Figma" prompt's target; the Figma Make export
  we built from was generated off it).
- Connector status in the 08-04/05 session: `installState: connected` (account-level OAuth fine)
  but `enabledInChat: false` — the per-chat toggle never reached the running session, so the tools
  (`get_design_context`, `get_screenshot`, `get_variable_defs`, …) were never callable. Plain
  fetch of the file URL is 403 (auth required).
- **Next session with Figma enabled**: pull that node and extract the **Editor and Admin chip
  colours** — the only two values in the implementation that are ours rather than decoded (export
  never draws those states; currently glow `#2ef0ff` / accent `#ffde14`). Then diff renders
  against `get_screenshot` of the source frame.

### 6. Open items (unchanged, still with Ilia)

1. Team Management has no `View only` rung ⇒ first nudge of PROJECT MANAGEMENT shows `Custom` with
   one row left behind. Ladder gains a rung, or roll-up stops counting a clamped feature as
   disagreement. Design decision.
2. D-1: can a non-Admin create/hold a permission containing Admin-level features (privilege
   escalation)? Blocks assign wiring.
3. Schedule ladder contradiction (module sheet: Admin; details sheet: no Admin).
4. BE-side effect of deleting a role people hold — needs a real-environment test; the remove modal
   lists affected people but can't verify what IAM does to them.
