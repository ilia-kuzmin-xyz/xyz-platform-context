# PLT-2909 — recommended action (DRAFT ONLY — execute nothing)

> **Status of the previous recommendation (2026-07-17): ✅ DONE.**
> The chosen action was *"reuse PLT-2882's `__linkDiagnose` against `CY-5200` on ATL08."*
> Ilia ran it on **2026-07-23** and it returned the predicted result: `DistributionBoardsPanels_Bld1-V1`
> is a **ghost** (metadata claims the 6 elements, geometry + cloud list have none); `Bld2` and the
> federated model are **real**. He also routed the BE question in-thread to **Ali Seyedof**.
> The old diagnostic instructions are preserved at the bottom of this file for provenance.
> **Everything above that line is the current recommendation.**

---

## Chosen action: **no nudge — the ball is legitimately with Ali Seyedof (BE). Track for a reply**, plus one cheap parallel ask folded into the *same* thread

The action-shape has changed in kind. On 07-17 we owned the next step and it was an FE-side
diagnostic. Now: the diagnostic is done, the FE fix is explicitly tracked under **PLT-2882**, and the
only open question — *why does the Bld1 model's `client-element-metas` contain elements it doesn't
own?* — is answerable **only** by the backend. Ilia already tagged the right person, in the right
place, with the right model id. **There is nothing to escalate, and a status nudge one day later
would be noise.**

So the honest recommendation is **(e) monitor**: no new comment for its own sake, watch for Ali's
reply, and act on what it says.

### The one thing worth adding (optional, low cost, high leverage)

Ilia's question asks *why this one model*. The **cohort question** — *how many other models are
contaminated?* — is the same query with the `WHERE` clause loosened, and it is the difference
between fixing one activity and sizing the incident (playbook #6). Best folded into the **existing**
thread as a one-liner, **not** a second ticket or a second ping:

> Follow-up to the above, same query shape: can you also check whether source file **`dd20b121`**
> (and more generally, **any source-file id**) appears in **more than one model's**
> `client-element-metas` across **ATL05–08**? If PC-EXCEL imports duplicated rows across buildings,
> the reporter's "present for all ATL05-08 projects" is probably that same duplication at scale, and
> the count tells us whether this is one bad import or a systematic import defect.

**Why BE and not us:** PLT-2882 already proved the FE-side sweep is expensive and unreliable on this
data (`__linkAudit` retired; the artefact-based sweep produced 705k false positives because Revit
models have no `svf2-object-id-map`). A duplicated-source-file-id query needs no geometry at all —
it is pure metadata, and it is a handful of SQL for someone with warehouse access.

### Second, smaller item: correct Yash's expectation about the client ask

The 07-17 draft reply told Yash we'd ask the client whether the ATL08 model was **re-uploaded /
re-versioned**. That question is now **superseded** — the trigger is import-time cross-contamination,
so a re-upload ask would send the client hunting for an event that isn't the cause. One line prevents
a wasted client round-trip:

> @Yash Patel — quick correction on PLT-2909 so we don't ask Kyriakos the wrong thing. The diagnostic
> confirmed the extra model is a "ghost" (its metadata claims the elements; its geometry doesn't have
> them), so it *is* the same family as PLT-2882 — you were right to be careful though, because the
> **cause differs**: PLT-2882 was models being re-uploaded, this one looks like the **Excel import
> writing the same rows into several buildings**. So **ignore my earlier "was it re-uploaded?"
> question** — nothing for the client to answer here, it's ours. Also worth noting Kyriakos was
> **right**: `…EquipmentOthers_Bld2-V1` genuinely does hold the elements; the bogus entry is a
> different model (`DistributionBoardsPanels_Bld1-V1`). BE (Ali) has the root cause; the UI fix that
> hides ghost models is tracked on PLT-2882.
>
> Still outstanding from your side whenever you get a moment: the exact error text from the
> **"session id gave an error"** — that's the Help-menu *Sync session logs* upload, a separate item.

## Why this and not the others

- **Not (a) another comment / status nudge.** Ali was tagged **less than a day ago** by the assignee,
  in-thread, with the model id and the specific question. A nudge now buys nothing and spends
  goodwill we may need if it goes quiet. Set a **re-check on the next run**; escalate only if there's
  no reply by ~07-30 (the PLT-2858 pattern in this folder — a nudge sent too early got a one-line
  non-answer and the ticket still sat for 9 days — is the cautionary precedent).
- **Not (b) Ready For Development.** There is no FE work to schedule **on this ticket**: the guard
  ("don't list models whose geometry can't back their claimed elements") is confirmed tracked under
  **PLT-2882**. Moving PLT-2909 to dev would create a duplicate FE task and split the fix across two
  tickets. The remaining root-cause work is BE, which this board doesn't route through Ready For Dev.
- **Not (c) With Technical Support / back to client.** The client's contribution is complete and was
  **correct** — Kyriakos named the right real model, Yash produced a working repro. Nothing further is
  needed from them, and the one question we *were* going to ask (re-upload) is now known to be the
  wrong question. Bouncing this out would misrepresent an internal BE investigation as customer-blocked.
- **Not (d) Blocked.** "Blocked" implies no owner or an external dependency. This has a named internal
  owner with a well-formed question — that's *in progress*, not blocked. Mislabelling it hides a live
  BE workstream from the board.
- **Not "close as duplicate of PLT-2882."** Tempting now that the family is confirmed, and **wrong**:
  same broken invariant, **two different upstream triggers** (re-version staleness vs import
  cross-contamination). PLT-2882's BE fix will not fix ATL08. Link them, don't merge them.

## Follow-through the human should own (not executed here)

- **Jira link, not merge:** add a *"relates to"* link PLT-2909 ↔ PLT-2882 with a one-line note —
  *same defect family (metadata claims what geometry can't back), shared FE fix on PLT-2882, separate
  BE triggers.* Cheap, and it stops a future reader closing one on the other's evidence.
- **Closure criteria for PLT-2909** (playbook: close on cause + trigger + cohort, not on works-now):
  (1) Ali explains how the import wrote foreign rows; (2) the contaminated rows are cleaned **or** the
  import is fixed; (3) the cohort sweep is run so we know the blast radius; (4) PLT-2882's FE guard
  ships, so the ghost stops rendering even if data goes bad again. **Do not close on (4) alone** — the
  UI would be clean while the data stays wrong.
- **Data remediation caution:** if cleanup means deleting metadata rows, follow PLT-2882's precedent —
  **peer alignment (David Webb) before any bulk delete.** That ticket's 418-row deletion is still on
  hold precisely because a peer's contrary check deserved an answer first.
- **Check the FE guard covers this surface:** PLT-2882's fix targets the *selection* path; PLT-2909's
  symptom is the *model-list* path (`useGroupedLinks.ts:30`, `useLinkedElementsTreeData.ts:97-116`).
  Worth one comment to Darminder so the guard is written once, at the membership layer, not twice.
- **Session-log-sync error:** still unanswered since 07-16; separate item, owner = BE/logging.
- **Attachments (NEEDS HUMAN):** the 2 screenshots are now lower-value (the ghost is named) but remain
  the only record of which surface the client was looking at.

---

## Archive — the 07-17 recommendation, now executed (kept for provenance)

<details>
<summary>Original chosen action: (a) reuse PLT-2882's diagnostic against <code>CY-5200</code> on ATL08</summary>

**Do NOT re-invent tooling.** PLT-2882 already produced `window.__linkDiagnose(activityId?)` on branch
**`PLT-linked-selection-diagnostics`** (console-only, not for merge), which prints, per model, both
**`modelMembership`** (parquet-claimed models + loaded state) and **`parquetVsGeometryByMongoModelId`**
(`inParquet` vs `inGeometry`).

Steps run (owner: Ilia; ATL08, schedule `29475-16-RL3`, activity `CY-5200`):

1. Checkout `PLT-linked-selection-diagnostics`; open the editor on ATL08; load the models involved.
2. Select `CY-5200` → `window.__linkDiagnose('CY-5200')` → capture the JSON.
3. Read it as a **model-list** question: how many models does `modelMembership` list, and per model
   `inParquet` vs `inGeometry`. *A model with `inParquet > 0` but `inGeometry = 0` is a ghost.*
4. Cross-check against Kyriakos's claim that only `…EquipmentOthers_Bld2-V1` should have real hits.

**Expected if same-mechanism:** several models listed, only one with `inGeometry > 0`, the rest
`inParquet > 0 / inGeometry = 0`.
**✅ Outcome (07-23): exactly that** — ghost = `DistributionBoardsPanels_Bld1-V1`
(`00156181-fca5-4a7c-acdf-a12ce924c252`); `Bld2` + federated model real. The prediction held, which is
why the mechanism confidence moved 5/10 → 9/10 in `context.md`.

The draft internal reply from that run is superseded by the corrected note to Yash above — in
particular its closing "was the model re-uploaded/re-versioned?" question, which the data has since
ruled out as the trigger.

</details>
