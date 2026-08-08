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
