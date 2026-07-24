# PLT-2909 — recommended action (DRAFT ONLY — execute nothing)

## ⚠️ 2026-07-24 update — the diagnostic below WAS run (07-23); action now is to wait on Ali Seyedof

Ilia ran exactly the diagnostic this file recommends, on 2026-07-23, and it confirmed the
ghost-model hypothesis on ATL08/`CY-5200` (model `DistributionBoardsPanels_Bld1-V1`, PC-EXCEL
import, source file `dd20b121`) — see `context.md` §Update. He already posted the routed question
to **Ali Seyedof** (client-element-metas ownership for that model) and stated the FE fix will be
tracked under **PLT-2882**, not here.

**Nothing further to draft right now** — the one open item is Ali Seyedof's answer, which is his
to give, not ours to chase yet (posted 07-23, one day old as of this re-check; not yet
stale enough to warrant a nudge — revisit if it sits past ~1 week, per the pattern on PLT-2649/
PLT-2858 in this same run). The merge-or-fork decision below is now **resolved as "merge into
PLT-2882"** for the FE fix; the only remaining fork is the BE root-cause ticket for the Excel
importer, which is Ali's to scope once he answers.

---

## Action as originally drafted (executed 2026-07-23 — kept for the record)

### Chosen action: (a) — reuse PLT-2882's existing diagnostic against `CY-5200` on ATL08, then post one internal status update

**Do NOT re-invent tooling.** PLT-2882 already produced `window.__linkDiagnose(activityId?)` on branch **`PLT-linked-selection-diagnostics`** (console-only, not for merge), which prints, per model, both **`modelMembership`** (parquet-claimed models + loaded state) and **`parquetVsGeometryByMongoModelId`** (`inParquet` vs `inGeometry`). That is *exactly* the evidence PLT-2909 needs — the tool already answers "which models does the metadata claim, and does their geometry actually contain these elements?" The fastest, single next step is to **run the same tool on the new repro**, not to build anything.

### The one step to run (owner: Ilia; ~15 min; needs dev/editor session on ATL08)

1. Checkout `PLT-linked-selection-diagnostics`; open the **editor** on **ATL08**, schedule **`29475-16-RL3`**; load the models involved.
2. Select activity **`CY-5200`** → `window.__linkDiagnose('CY-5200')` → capture the JSON.
3. Read it as a **model-list** question (not a 0-selection question):
   - **How many models does `modelMembership` list?** (this is what the panel renders via `getModels()` — `useGroupedLinks.ts:30`.)
   - For each listed model, `inParquet` vs `inGeometry`. **A model with `inParquet > 0` but `inGeometry = 0` is a ghost — parquet claims membership its geometry can't back → confirms the same stale-metadata mechanism as PLT-2882, now manifesting as "extra models."**
   - Cross-check against Kyriakos's claim: only **`PC-EXCEL_SWITCH_ATL8_ELEC_XYZ_EquipmentOthers_Bld2-V1`** should have real geometry hits; the others should be `inGeometry = 0`.
4. Run the same call for **one working activity** in the same schedule (broken-vs-working diff, playbook #3).

**Expected if same-mechanism:** several models in `modelMembership`, only one with `inGeometry > 0`, the rest `inParquet > 0 / inGeometry = 0`. That both confirms PLT-2909 and extends PLT-2882's RCA with the "ghost model membership" surface.
**If instead** every listed model has real geometry hits, the mechanism is different (genuine multi-model membership / a bad activity→model join) and PLT-2909 forks from PLT-2882 — route accordingly.

### Draft internal reply (author: Ilia; @ Yash Patel, cc Darminder Atker) — playbook style, DRAFT ONLY

> @Yash Patel — on PLT-2909 (ATL08, `CY-5200` shows models that don't contain its linked elements).
>
> I looked at the code path that lists "which models an activity is linked to." It builds that model list purely from the element **metadata** parquet (`client-element-metas`), not from the loaded 3D geometry — so if the metadata still lists an element as belonging to a model whose current geometry no longer contains it (e.g. after a model re-upload/re-version), that model shows up in the list anyway. That is the same stale-metadata defect confirmed in PLT-2882, just showing up as *wrong models listed* instead of *nothing selected*.
>
> You were right to be cautious that they might not be identical — the symptom shape is different and I haven't confirmed it on ATL08 yet. So one concrete step: I'll run the PLT-2882 diagnostic (`__linkDiagnose`) against `CY-5200` on ATL08 and check, per listed model, whether its geometry actually contains the activity's elements. If the extra models come back "in metadata, not in geometry," it's the same root cause and we fold them together; if not, PLT-2909 gets its own track.
>
> Separately — the **"session id gave an error"** you hit is the Help-menu *Sync session logs* upload, not this bug; can you paste the exact error text? I'll route that to whoever owns log sync as its own item.
>
> One for the client/PM side: was the ATL08 model `PC-EXCEL_SWITCH_ATL8_ELEC_XYZ_EquipmentOthers_Bld2` re-uploaded/re-versioned recently? That would explain when the model list went wrong.
>
> Scope: this is the web-viewer activity-linking panel, not the dashboard filter panel.

## Why this and not the others

- **Why reuse the diagnostic, not build new tooling:** PLT-2882 already invested in `__linkDiagnose` and it emits the per-model parquet-vs-geometry breakdown that *is* the PLT-2909 question. Building a bespoke "model list" probe would duplicate it and delay confirmation. Reuse is the highest-leverage move (playbook: repro-in-our-hands > archaeology).
- **Not (b) Ready For Development yet.** The FE robustness fix is real and probably *shared* with PLT-2882 (never list a model whose geometry can't back the linked elements; reconcile the count/model-list with geometry). But routing to dev before the ATL08 diagnostic risks mis-scoping: we don't yet know if the extra models are ghosts (metadata bug → data fix + FE guard) or genuine membership (a different join bug). One diagnostic flips this to (b) with precise scope — and lets PLT-2909 + PLT-2882 be fixed as one FE change.
- **Not (c) With Technical Support / back to client.** We have everything to progress internally: activity id, schedule, project, the named model, and a working diagnostic. The only client-side asks (was the model re-uploaded; the session-id error text) ride along in the reply; they don't gate the diagnostic. Bouncing to the client now would re-loop the ticket.
- **Not (d) Blocked.** Nothing external blocks the diagnostic; it's in our hands on ATL08.

## Follow-through the human should own (not executed here)

- **Merge-or-fork decision:** after the diagnostic, either link PLT-2909 to PLT-2882 as the same root cause (add PLT-2909's "ghost model membership" surface to PLT-2882's RCA) or fork it with its own mechanism.
- **Model-type check:** confirm whether `PC-EXCEL_SWITCH_ATL8_…` is Revit or Navisworks — decides whether PLT-2882's Revit-specific findings (no `svf2-object-id-map` artefact; property-DB mapping) transfer. See PLT-2882 investigation-log cohort-sweep notes.
- **Session-log-sync error:** open a separate item once Yash supplies the error text; owner = BE/logging. Do not attach it to the linking fix.
- **Trigger + cohort (playbook #5/#6):** if confirmed, get the ATL08 re-upload timeline (why now) and sweep all activities across ATL05-08 whose links resolve to ghost models — bulk remediation, not per-ticket.
- **Watch the 2 attachments (NEEDS HUMAN):** they confirm which surface (grouped-links count panel vs isolation tree) and how many extra models — useful for FE-message wording.
</content>
