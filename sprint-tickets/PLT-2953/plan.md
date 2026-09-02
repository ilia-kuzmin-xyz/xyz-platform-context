# PLT-2953 — Asset Details: Linking mode (2026-08-17 kickoff)

**Branch `PLT-2953`** = same base as PLT-3001. Pushed. INDEPENDENT of 3001/3003.

Ticket: after entering linking mode (PLT-2952, shipped), the user manually selects
ELEMENTS IN THE VIEWER to link/unlink to an asset. "Link asset ↔ elements" stages
the change LOCALLY; "Done" (left Asset List panel) pushes staged changes to cloud.
"Suggested matches" explicitly OUT (PLT-2964). Design artefact:
Asset_and_System_Setup.dc.html (uploaded 23b8a83c…; extracted text in scratchpad
run of 08-17; key strings: "Linking session — Done" footer, "UNLINK ELEMENT?"
confirm, keyboard shortcuts panel is PLT-2964 territory).

Existing on master already: `AssetListContent.element-linking*.test.tsx`, asset
detail shows "Linked element … Unlink", `assetElementLinkService`, viewer assets
panel is the asset-detail surface. PLT-2952 gave the enter-linking-mode flow.
TO STUDY (not yet read): `useElementLinking` hook / linking session state; how the
viewer exposes element click selection (viewer-provider? forge/xeokit wrapper?);
where 'Done' lives in the assets panel.

Plan sketch:
1. Session store: staged links/unlinks (Map assetId→elementGid ops) in viewer
   provider context; survives panel navigation; "Linking in progress" resume
   notice per artefact.
2. Element pick: subscribe to viewer selection events while linking mode active;
   selected element + selected asset → enable "Link asset ↔ elements" CTA.
3. Unlink: from asset detail's linked-element row (confirm dialog per artefact).
4. Done: batch-push staged ops via assetElementLinkService; optimistic list badges
   (Linked/Unlinked tabs counts).
5. Tests: session staging logic pure-unit; panel wiring with mocked viewer events.
Confidence 5–6 until the viewer selection API is read; raise after study.

## 2026-08-17 — SHIPPED: PR #2148 (draft, based on #2140)

Implemented, diverging from the sketch above where the code said otherwise:

- **Session lives in `use-asset-element-linking.ts` (panel lifetime), NOT the
  viewer provider.** Conservative reading of "saved to the Cloud once the user
  clicks Done": closing the Assets tool abandons an uncommitted session. Noted
  in the PR as a deliberate call — lifting to the provider is small if product
  wants resume. The sketch's "Linking in progress" resume notice therefore did
  not ship.
- Pure module `linking-session.ts`: `stageLink` (reconciles against server —
  re-link-to-same / stage-then-reverse cancel out, so Done never sends empty
  writes), `mergeLinks` (cards render server ⊕ staged), `sessionOps` (sorted,
  deterministic), `sessionSize`. 9 unit tests.
- Two-act write: armed pick → `pendingElementId` (held, nothing written) →
  banner CTA "Link asset ↔ elements" stages it → footer strip "N staged
  changes — saved to the cloud on Done" → Done flushes via the existing
  `useAssetElementLinkSet` mutation, one call per op.
- Unlink is staged too (null op). No confirm dialog — the artefact's dialog is
  on the asset-detail row, which keeps its existing behaviour; the panel-card
  unlink is session-undoable by construction.
- Old immediate-write tests rewritten to the session contract (2 core + 4 edge);
  assets-panel suite 300/300 green.
- Suggested matches = PLT-2964, excluded (stated in PR).

Pitfall for the next run: the edge-test rewrite left a stray `})` and a stale
`toHaveBeenCalledTimes(1)` assertion — under the session contract a pick writes
NOTHING (assert `pendingElementId` stability + `mockMutate` not called). If a
test asserts mutate-on-pick anywhere else, it's asserting the pre-2953 contract.

## 2026-08-26 — moved to review; everything OUR side is now done

Housekeeping completed (the work had sat green and unannounced since 17 Aug):
- **PR #2148 out of draft**, reviewers requested (TomMasdin, Darminder, Rishi, Sergiusz).
- **Master merged in** (`7c14612` — CVE image bump + PLT-3069 lazy imports, no overlap);
  assets-panel suite 354/354 after merge.
- **Jira: Dev In Progress → In Code Review**, with a comment carrying the PR link and the two
  things that genuinely need a human:
  1. product call — session is panel-lifetime (close = abandon staged changes); the design
     sheet's resume notice implies the opposite. Small lift if reversed.
  2. one manual pass in a real editor — element pick is only verified against MOCKED viewer
     selection events; the PR's "How to test" is written for that run-through.
- Verified there is no hidden top-level review (get_reviews = [], the #2147 lesson applied).

Nothing else is ours: completion now = human review + answer to 1 + manual pass 2.

## 2026-08-28 — scheduled-run checkpoint

Still `In Code Review` on #2148; not eligible for kick-off. All **18** review threads resolved,
build + Sonar green on `8efe583`, branch already contains master head `70451f7`. No action needed.
Full run log: `sprint-tickets/README.md` § 2026-08-28 (morning).

Note: this folder has no `context.md` — the domain notes live in `plan.md` here.

## 2026-09-02 — master merged in; no engineering work outstanding

Run found the ticket still **In Code Review** (not eligible for kick-off) and PR #2148 with **zero
open review threads** and a **green `build`**. Only action taken: `master` had moved to
`ac0c63b` (PLT-3022 — built-in roles remapped to the Custom Permissions authority mapping), leaving
this branch 1 commit behind, so master was merged in (`812bedd` → `0e478ea`).

The merge is clean and carries none of our own code: the file-set intersection between `ac0c63b`
and this branch is **empty**, and a trial `merge --no-commit` reported no conflicts. PLT-3022 does
not touch this branch's files.

Still gated on **human approval only** — see the 09-02 entry in `sprint-tickets/README.md` for the
full triage, the `copilot-pull-request-reviewer`-vs-`build` red-check trap, and the open product
question PLT-3022 raises about authority-gating the commissioning surfaces.

## 2026-09-02 (19:40 UTC) — Darminder requested changes; the deferred "question 4" is now ANSWERED

`changes_requested` review on #2148, two written items (plus another video, again unreadable by this
routine — but this time the prose is specific enough to act on). Both reproduce, and both have a
verified single-line cause:

**1. "asset selected that is linked, select another element not related to it → no option to
relink."** Cause: `linked-element-section.tsx:366` —
`if (isLinked || selectedElements.size !== 1) return null` suppresses the "Current selected element"
card whenever the asset already has an element. **This was deliberate and is the PR's own
"question 4"**: linking there replaces the asset's existing link, so the affordance was left out
rather than silently dropping a link. Darminder's answer settles it — **offer the option.** This
also directly answers the clarification this run raised on the Jira ticket at 08:50; the Jira
question can be considered resolved.

**2. "selecting an element with a tag loses the asset selection; it should stay."** Cause:
`use-asset-detail-from-selection.ts` — the guard `if (assetDetailId && !links[assetDetailId])
return` holds the pane only when the open asset is **unlinked**. With a *linked* asset open the
guard doesn't fire, so a pick belonging to another asset falls through to
`setAssetDetailId(linkedAssetId)` and the panel jumps away. Fix: let an open asset detail hold the
pane whether or not it is linked. That is also the **precondition for item 1** — the card needs a
panel to live in.

So both items are one guard plus one gate. Small in code; the *design* part is not settled:

**Open question put to Darminder (do not guess it):** on confirming a replace, should it warn that
the asset's current element will be unlinked, and does the element's previous owner matter? There is
already a `Reassign element?` dialog for the mirror case (picking an element another asset owns), so
either reuse that wording or add a distinct "replace this asset's link" confirm.

**Not implemented this run, deliberately.** Two reasons, both worth respecting: it is a human
reviewer's behaviour change (the routine's own rule is not to rush those), and
`use-asset-detail-from-selection.ts` took two pushes today from the parallel run (`39f2573`, and
`0e9542b` which is adjacent to item 2) — pushing over a file another actor is mid-flight in is the
failure this repo already knows about. Said exactly this on the PR, with the diagnosis, so whoever
picks it up starts from the cause rather than the symptom.

### 20:50 UTC — nobody is working the feedback; both items still open and unclaimed

Checked rather than assumed. The parallel run pushed again at 20:44 (`648d801`, "Custom
permissions: give the Create button the theme's secondary skin") — **unrelated to Darminder's
review**, and oddly unrelated to PLT-2953 altogether. Verified on the branch head that **both items
are untouched**: `linked-element-section.tsx:366` still reads
`if (isLinked || selectedElements.size !== 1) return null`, and
`use-asset-detail-from-selection.ts:62` still reads `if (assetDetailId && !links[assetDetailId])
return`.

So the two changes are open, unclaimed, and diagnosed — the next run can start from the cause.

**Why item 2 was not shipped on its own, even though it is a one-line guard change.** It is
tempting: Darminder's wording is unambiguous, and the fix is `if (assetDetailId) return`. But
landing it *alone* produces a worse UX than either endpoint. With the guard widened and the
`isLinked` gate still in place, an open **linked** asset would neither navigate away when you click
a linked element (the guard now holds the pane) nor offer a relink (the gate still suppresses the
card) — a dead end reachable only by clicking the asset list or deselecting. The two items are one
change with two halves, which is why the PR comment asked for the confirm wording before building
either.

Second reason, unchanged: the parallel run is still pushing to this branch (20:44), so it is not a
file to take over unannounced.

**Ready to implement, once someone answers the replace-confirm question:**
1. `use-asset-detail-from-selection.ts` — widen the guard so an open asset detail holds the pane
   whether or not it is linked. Note this contradicts the file's own docstring ("with … a linked
   one, a linked element still opens its asset — that is plain navigation"); the docstring needs
   updating in the same commit, since Darminder is deliberately overriding that choice.
2. `linked-element-section.tsx:366` — drop the `isLinked` half of the gate so the "Current selected
   element" card appears for a linked asset too, plus a confirmation on replace (reuse
   `Reassign element?`'s wording, or a distinct "replace this asset's link" — **the open question**).
3. Tests for both, and the PR description's "question 4" paragraph rewritten, since it currently
   documents the deferral as intentional.

### 21:06 UTC — RESOLVED: the parallel run implemented both items, exactly as diagnosed

`fac1e7b` "PLT-2953: the open asset holds the pane, and a linked asset can relink" lands both of
Darminder's items, and lands them on the same two lines this run had identified an hour earlier:

- **Item 2** — `use-asset-detail-from-selection.ts:61` is now `if (assetDetailId) return`, i.e. an
  open asset detail holds the pane whether or not it is linked. Precisely the diagnosed fix.
- **Item 1** — the `isLinked ||` half of the gate in `linked-element-section.tsx` is gone, so the
  "Current selected element" card now appears for a linked asset too.

**So the diagnosis was right and the hold was right.** Two things worth carrying forward from that:

1. **Holding was not passivity, it paid off.** Had this run implemented the same two changes, the
   branch would now carry two competing versions of one behaviour change, on a file the other actor
   was demonstrably still working (it pushed at 14:17, 20:44 and 21:06). The reasoning recorded at
   20:50 — that item 2 must not ship without item 1, and that a file another actor is mid-flight in
   is not one to take over unannounced — held up on both counts.
2. **Posting the diagnosis was the useful contribution**, not the code. The PR comment naming the
   guard and the gate went up at ~19:50; the implementation matching it landed ~75 minutes later.
   Whether or not it was read, publishing "here is the exact line" is the thing a second actor can
   act on without duplicating work — the right move when two runs are live on one branch.

Still unconfirmed and worth a look next run: whether `fac1e7b` added a **confirmation** on replace
(the open question put to Darminder — the asset's existing link is dropped by relinking), and
whether the file's docstring, which documented the opposite choice as deliberate, was updated with
it. Both were listed in the 20:50 implementation plan above.
