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
