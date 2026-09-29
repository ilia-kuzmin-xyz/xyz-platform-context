
## 2026-09-26 — scheduled run: master catch-up

PR **#2241** (draft) — *Remove a system from System details*.

- **Checkpoint 1:** no review threads at all yet. Copilot has not reviewed it, which is expected
  while the PR is a draft — it only reviews on ready-for-review.
- **Checkpoint 2:** build green (`107726029211`, 24 Sep).
- **Checkpoint 3:** was **4 commits behind** master; merged `origin/master` in, **no conflicts**,
  pushed.

Left as a **draft** deliberately — the standing instruction for this workstream is that PRs stay in
draft, so it is not promoted to ready just to attract a Copilot pass.

## 2026-09-28 — scheduled run: checkpoint sweep, nothing to do

PR **#2241**, head `2cacbcc`.

- **Checkpoint 1 (feedback):** every review thread resolved. Nothing outstanding.
- **Checkpoint 2 (build):** `Build & Test - frontend service [PR Check]` **success** on the
  current head.
- **Checkpoint 3 (master drift):** none. `origin/master` is still `ff81032` (PLT-3138), the
  same commit this branch was brought up to on 09-26 — master has not moved in two days, so no
  merge was needed.

Kept as a **draft** deliberately, per the standing instruction for this workstream. No review
threads at all, which is expected: Copilot only reviews on ready-for-review, so a draft attracts
no pass. Waiting on a human decision to promote it.

## 2026-09-29 — the master merge broke the branch; caught locally, before pushing

PR **#2241** (still draft). Was 6 commits behind master. The merge was **textually clean** and
**broke the module**: `ReferenceError: useViewer is not defined` at
`system-detail-right-panel.tsx:80`, so all **7** tests in that file could not run.

**Why a clean merge broke it.** Master moved the system detail panel's selection out of the
viewer provider — its version of the file no longer imports `useViewer` at all, and `properties`
now renders the panel off `lastSelectedEntity.type === 'system'`. The merge took master's import
block and kept this branch's one remaining use, `setSystemDetailId(null)`. Nothing textually
conflicted, because the two sides touched different lines.

**Fix:** close through the selection store, exactly as the sibling PR #2235 (PLT-3140) already
closes the asset detail — `useSelection()` → `onDeleted: () => setLastSelectedEntity(null)`.
Reusing the established pattern rather than inventing a second one. `e378baa`.

**The test that was missing is the reason it broke quietly.** Nothing asserted the close-behind
wiring at all — the pre-merge test mocked `setSystemDetailId` but never asserted on it — so the
only symptom available was a ReferenceError. Added a test that captures the `onDeleted` the real
hook is handed and checks it clears the selection, rather than driving the whole confirm dialog.

### The point worth carrying forward

This is the **third** merge-induced break across these PRs (#2235 on 09-28, #2236 on 09-28, this
one), and all three share a shape: **master renames or relocates something, the branch keeps a
lone reference to the old name, and no textual conflict is raised.** Two of the three were caught
by CI or a reviewer *after* being pushed. This one was caught locally, before the push, because
the suite runs in-session now (see PLT-3139's 09-29 entry for the gantt-stub workaround).

So the rule after any master merge on these branches: **run the suite, not just the folder.** A
`git merge-tree` preview reported all five branches as clean merges this run, and one of them
was broken.

Checkpoints: **1** — no review threads at all (expected on a draft; Copilot only reviews on
ready-for-review). **2** — was green before the merge, green again after the fix. **3** — master
drift resolved. Kept as a **draft** deliberately, per the standing instruction.
