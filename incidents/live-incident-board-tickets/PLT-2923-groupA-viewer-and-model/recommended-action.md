# PLT-2923 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) — post an internal Jira comment that pulls the ball back to us

Post one internal comment that (1) states the code-verified mechanism, (2) declares that the deciding
evidence is **in our own uploaded session log, not with the customer**, (3) names one owner and one
closed check, and (4) recommends taking the ticket **off `With Customer`** because we are the blocker,
not the client. **Draft only — a human posts it.**

**Why a comment and not the column move as the action:** the move is a *consequence* of the comment
(the comment is what justifies and records it). The move to recommend, stated inside the comment, is
**`With Customer` → `In Analysis`**, because the next step is ours.

## Why this and not the others

- **Not (b) Ready For Development — yet.** There *is* a real, standalone FE ticket here (the platform
  fails an unsupported-format model with a generic *"Model not loaded due to an error"*, or with
  literally nothing on the initial-load path, while already knowing `fileType: ifc` and already owning
  the right copy — see `context.md` § Mechanism, § Bug vs feature-gap). But which fix to build depends
  on variant A vs B, and that is **one log grep away**. Routing now risks building the wrong fix, and
  if variant A holds the customer's actual request ("load our IFC on web") is **PLT-353**, a Backlog
  *Epic* — a product decision, not a dev-queue item.
- **Not (c) With Technical Support / another customer question.** We already asked the client three
  questions on 07-23 (source file, export origin, Revit check) and got **nothing in 6 days**. Asking a
  fourth thing while the decisive artifact sits in **our own** blob log store would repeat the
  playbook's worst anti-pattern (*evidence requests without owners*, and forensics parked on a party
  who cannot answer the question that matters). Their answers are nice-to-have, not blocking.
- **Not (d) Blocked.** Nothing external blocks us. Yash already reproduced the failure and captured a
  session id; the log is ours; the manifest is ours.
- **Not "close as works-as-designed".** Even at 9/10 on "IFC is unsupported on web", closing before
  the log line is confirmed would be closure on a theory — and it would leave the silent-failure bug
  and the cohort question (are WI11's other fabrication models IFC too?) unowned.

## Draft — internal comment (author: Ilia Kuzmin; @ Yash Patel, cc Darminder Atker)

Playbook style: mechanism first, verbatim strings, one owner, one closed check, explicit scoping, one
question to the client.

> @Yash Patel — PLT-2923 (WI1, `QA-WI11-…_STRUCTURAL FAB MODEL.ifc-V19` won't load in the web viewer).
>
> **Mechanism (confirmed in code).** The web viewer supports exactly three source formats — **`rvt`,
> `nwd`, `nwc`**. Anything else throws at the element-mapping step with
> `Unsupported or unknown model file type: <type>`, the model is marked failed, and the user gets
> either a generic "Model not loaded due to an error" toast or (on the initial page-load path) no
> message at all. There is **no IFC support anywhere in the frontend** — IFC on web is still the
> unstarted epic **PLT-353**. That also explains the helmet: the field app doesn't use the Forge
> external-ID mapping, so an IFC can load there and not on web. Note **nobody has claimed this model
> ever loaded on web** — so this looks like "never supported", not a regression.
>
> **The evidence is on our side, not the customer's.** Your repro session
> `platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3` uploaded its log, and one line decides it:
> - `Error in _loadModel: … Unsupported or unknown model file type: ifc` → confirmed: unsupported
>   format, and the answer to the client is a product/roadmap answer.
> - `applyMappings completed {mappedDbIdCount: 0}` / `Failed to load element metadata for …` → the
>   file is actually rvt/nwc and the **mapping data** is missing, i.e. the same shape as **PLT-2574**
>   (which we fixed in 26.2.1.1 and where re-export/re-upload was the workaround).
> - `Error loading document: …` → the APS derivative for this version failed; that one goes to the
>   ingest side.
>
> **I'll pull that log line today** and post it here verbatim. No customer input needed for it.
>
> **@Yash — one question for the client (single, closed):** **do the *other* WI1 models load in the
> web viewer?** If some do, please tell me the name of one that works — that pair (works vs this one)
> is worth more than the source file.
>
> **Board:** I'd move this **off `With Customer` → `In Analysis`** — the open action is ours, not
> theirs. Their earlier answers (source file / export origin / Revit) are still useful but no longer
> blocking.
>
> Scoping: this is ViewerPage model loading and the Forge ID-mapping layer. **Separate from PLT-2892**
> (dashboard spinner that never clears) — different mechanism, don't merge.

## The one evidence step to run (owner: Ilia; ~15 min, needs support/blob log access)

1. Pull `Logs/<service>/platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3_t*_*.log` (support lists a
   whole session by the `{sessionId}_` prefix — `services/logService/log-file-service.ts:5-10`;
   info-level lines are present in prod because `createLogger` defaults to `minLevel: 'debug'`,
   `logger.ts:15-19,76`).
2. Grep, in this order: `Unsupported or unknown model file type` → `applyMappings` →
   `Failed to load element metadata` → `Error loading document`. The four are mutually exclusive and
   map 1:1 to the verdicts in `context.md` § "Which variant is it?".
3. Equivalent/parallel check if the log is unavailable: read the **Forge manifest `inputFileType`** for
   this model's URN (this is exactly what the FE reads at `viewer-service.ts:1046-1047`). `ifc` ⇒
   variant A, full stop.
4. Post the line **verbatim** in the ticket (playbook: raw artifact + one interpretive line).

## Follow-through the human should own (not executed here)

- **After the log line — route by variant:**
  - **A (unsupported format):** answer the client through Yash with the product line ("web viewer
    needs Revit or Navisworks; IFC is roadmap — PLT-353"), get **Mostafa/Pietro** to say whether WI11
    can publish RVT/NWC for this package or whether PLT-353 needs pulling forward, and raise the FE
    honesty ticket → **Ready For Development**: use the existing copy *"This model format isn't
    supported yet. Please export it as a compatible Revit or Navisworks file."*
    (`model-upload-error-codes.config.tsx:69-79`) instead of the generic toast, mark unsupported
    models in the model browser, and stop the initial-load path from swallowing the error
    (`viewer-service.ts:835-837`). Owner: **Darminder**.
  - **B (mapping data missing on a supported file):** hand to **Sachin/Ali** for the
    `svf2-object-id-map` / `client-element-metas` artefacts on this model version (Ali owns the
    extension referenced in PLT-2574), and link PLT-2923 ↔ **PLT-2574** as the same family. FE
    follow-up: `hideDisabledNodes` hiding *every* leaf when zero elements match
    (`model-mapping-service.ts:372-384, 68-172`) should surface a diagnostic instead of an empty scene.
  - **Failed derivative:** ingest/DPL side; check the version's translation status before anything else.
- **Cohort sweep (playbook #6):** whatever the variant, enumerate models in active projects whose
  source is not rvt/nwd/nwc (or whose mapped dbId count is 0) — don't wait for the next WI11 ticket.
  A 10-minute QA check (**Gennaro/Radu**) — "does any IFC-sourced model load in the web viewer on
  staging?" — validates the general rule independently of WI1.
- **⚠️ Look at the screenshot** (`Screenshot 2026-07-23 072317…png`, unreadable in triage): it tells
  whether the user saw the error toast (throw) or just an empty viewport (hidden nodes) — corroborates
  A vs B and decides the wording of the fix.
- **Answer "why now" properly:** if variant A, the real trigger question is **how an `.ifc` got into a
  project 19 versions deep** when the web uploader whitelist is `.rvt/.nwd/.nwc`
  (`model-upload.constants.ts:1`) — i.e. which route ingests it (ACC/CDE link? field pipeline?), and
  whether that route should reject or flag unsupported formats at entry. Assign it an owner; don't let
  it drop.
- **Docs:** no file in `xyz-platform-context` states which source formats the web viewer supports.
  Add it to `dashboard/viewer-and-model.md` (next to the three-ID mapping chain) and add a
  `dashboard/pitfalls.md` entry: *"ViewerPage supports rvt/nwd/nwc only; any other `inputFileType`
  throws in `applyMappings` and fails silently on the initial-load path. Separately, a model with zero
  matching element metadata has every leaf hidden — it renders as an empty scene with no error."*
