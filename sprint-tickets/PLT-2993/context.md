# PLT-2993 — Project Settings · Task library create new folder

**First seen 2026-08-08.** Status was `Open`. **Moved to `Analysis In Progress` + clarification
comment posted** (comment id 109174).

> Read `../_shared-commissioning-domain.md` first.

## The core collision
Folders today are **derived, not authored**: `groupChecklistsByType()` buckets each checklist under
the **asset type(s) it is linked to** (`readinessTaskService`), with a synthetic `__unassigned__`
bucket for the rest. Folder names *are* asset-type names. There is no folder entity.

The ticket wants folders a user creates, names inline, and drags tasks into. **Two models cannot
own the same tree** without a product decision. This is the root blocker for PLT-2993, PLT-2994
and (via the "+ Create new" menu) PLT-2992.

## Questions posted to Jira
1. Do user folders **replace** the asset-type grouping or **coexist**? (If coexist: a checklist can
   be in a user folder *and* under two asset-type folders — render three times, or precedence?)
2. If replace: the asset-type↔task view that the Asset Types tab counts against
   (`useReadinessTaskCountsByType`) is lost. Intended?
3. One folder per task, or many? (DnD implies one; current model allows many.)
4. Nesting — one level or many?
5. Rename/delete a folder: tasks orphaned to unassigned, or blocked while non-empty?
6. "Saved as it is" on click-away — empty string, discarded, or defaulted?

Plus the localStorage caveat: folders would be **per-browser**, invisible to teammates.

## Confidence
**3/10.** Small and mechanical once 1–3 are decided. **This is the ticket to unblock first** —
PLT-2992 and PLT-2994 both wait on it.

---

## 2026-08-11 — PR #2116 exists; and the localStorage objection in my 08-08 comment was false

**[#2116](https://github.com/XYZReality/hc-frontend/pull/2116) — draft, green, base `master`.**
22 files. Real user-managed folders in a **`task_folder` table** (project-scoped, shared),
replacing the derived asset-type grouping. Adds `taskFolderService` + `useTaskFolders` hooks,
`folderId` on `IChecklistDefinition`, `ChecklistLibrary.moveToFolder()`, the "+ Create new"
menu (New task / New folder) and inline naming with an "Untitled folder" placeholder.

### ⚠️ Correction to the 08-08 entry
That entry said commissioning is "localStorage-only, keyed per project (no REST backend)" and
concluded folders "won't be visible to anyone else on the project… it's a BE dependency".
**False when written** — `checklist-library-service.ts` at `4ad83a7` already read
`task_template` / `task_item` via `commissioningDataClient`. There was never a per-browser problem.
Correction posted as comment **109345**. The folder-*model* questions (replace vs coexist, one
folder or many, what happens to the asset-type link) were the substantive part and still stand.

**Checkpoints:** 3 Copilot threads, **all resolved + replied** — two name-trim comments defended
(trim is deliberate: stops `"Chillers "` and `"Chillers"` becoming twin folders; "saved as is"
was about allowing *empty*, not preserving whitespace), one accepted and fixed (optimistic cache
append so the new row renders before the invalidate refetch). 3/3 green · master is an ancestor.
