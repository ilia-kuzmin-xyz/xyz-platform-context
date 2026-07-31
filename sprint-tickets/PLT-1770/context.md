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
