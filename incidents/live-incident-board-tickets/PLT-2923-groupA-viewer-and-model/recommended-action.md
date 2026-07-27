# PLT-2923 — recommended action (DRAFT ONLY — execute nothing)

## Chosen: **(c) keep the status — With Customer is correct — plus one parallel-track internal diagnostic that does not wait on the customer**

**The status needs no change.** Ilia asked three genuinely customer-side questions on 07-23 (upload the source file / where was it exported from / does it look fine in Revit), Yash relayed them the same hour, and Freshdesk #7494 went to "Waiting on customer". The ball is legitimately with the client, the ask is four days old, and nothing on the thread is silently sitting on us. Contrast PLT-2906, where "With — Customer-ish" was hiding an unanalysed artefact on our side; **that is not the situation here.** Do not transition, do not chase yet.

**But waiting is not the whole move.** The single most decisive artefact in this incident is **already in our hands and needs nothing from the customer**: Yash reproduced the failure himself under session `platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3`. One console line from that session separates the three candidate mechanisms outright (`context.md` §"Which branch"):

| Console line | Branch | Meaning |
|---|---|---|
| `Error in _loadModel: Unsupported or unknown model file type: ifc` (or `… : undefined`) | **A** | FE rejects the format outright — no Forge problem at all |
| `Error loading document: <errCode> - <errMessage>` | **C** | Forge translation/derivative problem |
| *no error line, model just absent* | **B** | Derivative has no 3D geometry viewable |

And there is an even cheaper variant that needs **no console and no tooling at all**: the failure is silent on *initial page load*, but the "turn the model on via the **layers-panel checkbox**" path (`addExtraDocument`, `viewer-service.ts:840-845`) has no local catch, so the same throw reaches `use-node-actions.tsx:66-72` and **pops a visible toast** — *"Model not loaded due to an error… get in touch"*. If Yash re-runs his repro and toggles the model on that way, a toast confirms a thrown error (Branch A or C) and no toast points at Branch B.

Paired with one backend lookup — **the Forge/APS derivative manifest for V19** (`inputFileType`, viewable names, job status) — this closes the mechanism question **without the customer's file**. All of it is cheap, internal, and stays valid whatever the customer eventually sends back.

So: **one comment, posted for the record, routed to two internal owners, explicitly framed as running in parallel to the customer ask — not replacing it.**

## Why this and not the others

- **Not (a) a clarifying question back to the customer.** We already asked; they haven't answered; asking again four days in is a nag, not a step. More to the point, **the customer cannot answer the question that matters.** Whether the FE rejected the format or Forge failed to translate is invisible from their side — it's in our console and our manifest. The customer round-trip is only needed for the *provenance* question (which export tool produced this IFC), and that is already in flight.
- **Not (b) Ready For Development.** There *is* a code-verified defect class here — but which one to fix is not yet decided, and shipping either now would be speculative. If Branch A holds, the "fix" is a **product decision, not a bug fix**: IFC is not a format this platform ever supported (`ACCEPTED_FILE_TYPES = ['.rvt','.nwd','.nwc']`, `model-upload.constants.ts:1`; the FE contains no IFC handling anywhere), so the options are *support IFC in the web viewer*, *reject it visibly*, or *stop IFC entering projects at all* — that needs Mostafa/Pietro before it needs a developer. If Branch C holds, it's backend/ingest, not FE. Sending to Dev now would bounce.
- **Not "Blocked".** Nothing external is blocking us. Everything in §"What to check" is gatherable today with internal access. Marking Blocked would entrench a stall the playbook explicitly warns against — and would be flatly wrong while the customer ask is live and only four days old.
- **Not "With Technical Support".** That's the escalation for a ticket ageing silently with a known fix (cf. PLT-2884 at 14 days). At four days, with an outstanding customer ask that hasn't hit any reasonable deadline, this would be premature.
- **Not close / "as intended".** Even if Branch A is confirmed and IFC turns out to be genuinely unsupported, this closes on **cause + trigger + cohort** (playbook Phase 6), and we currently have none of the three. In particular, "the web viewer silently shows nothing instead of saying 'unsupported format'" is a real defect on its own terms even if IFC support is declined.

## Draft comment to post on PLT-2923 (playbook style — closed, one owner each, scoped)

> Parallel track while we wait on the customer's file — **status stays With Customer**, this doesn't replace Ilia's asks.
>
> The strongest clue is already in the ticket: **the same model, same version, loads on the Atom helmet and fails in the web viewer.** Those are two different clients on the same data, so this is very likely web-viewer-side rather than a bad model — and we don't need the source file to tell which.
>
> Two questions, both answerable internally:
>
> 1. **@Yash Patel** — from your own repro (session `platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3`), can you get the **browser console output**? One line decides this:
>    • `Unsupported or unknown model file type: ifc` (or `…: undefined`) → the frontend is rejecting the format before it ever renders. Nothing wrong with the model or the translation.
>    • `Error loading document: <code> - <message>` → Forge-side translation problem; then it's an ingest question.
>    • Neither, model just silently absent → the derivative has no 3D viewable.
>
>    **If the console is awkward to get, there's a 30-second version:** open the Editor, let it fail, then turn the model on via the **checkbox in the layers panel**. That path shows an error toast where the initial page load shows nothing — so "toast appears" vs "no toast" already splits the options above. Either way, please also say **what's on your screen**: a permanent *"Loading model…"* spinner is what I'd expect; if instead you see *"Model not loaded - no geometry found…"*, that's a different branch entirely and changes the answer. (The screenshot isn't legible to me.)
> 2. **@Sachin / @Ali** — for this model's **V19** in WI1, can you pull the **Forge/APS derivative manifest**: what does `inputFileType` say, what viewables did it produce (names), and did the translation job complete cleanly? A `derivatives[].status` and the viewable list is all I need.
>
> Context for why I'm asking Q1 that way: the web viewer's ID-mapping step accepts **only** `rvt`, `nwd` and `nwc` — anything else throws (`model-mapping-service.ts:296`, allow-list at `:312-324`). That step runs on the ViewerPage only; the dashboard skips it (`viewer-service.ts:967`), and the helmet never runs it at all, which would explain the web-vs-field split cleanly. **Stated as a hypothesis, not a finding** — Q1 confirms or kills it in one line.
>
> Two things I'd flag separately from the root cause:
>
> - **How did an `.ifc` get into WI1?** Our own upload dialog only accepts `.rvt/.nwd/.nwc` (`model-upload.constants.ts:1`), so this came in via ACC/BIM360 sync or a direct ACC upload. @Yash — worth checking the ingest record; it also partly answers Ilia's "where did they export it from" without waiting on the client.
> - **Did earlier versions of this model load in the web viewer?** It's at V19, so there are 18 predecessors. If, say, V18 loaded and V19 doesn't, something changed in their export — that's our "why now", and we can check it ourselves.
>
> **Separate from this incident (FE resilience, not the cause):** whatever the answer, the web viewer currently **cannot tell the user a model failed to load on page open.** The only load-failure toast is gated on the error text containing the substring `'Fragment list'` (`viewer-service.ts:1011-1017`); every other failure — unsupported format, translation error, missing viewable — is re-thrown and swallowed (`:1019` → `:835-837`). Because there's no `finally` on `loadDocuments`, `_isModelLoading` is never reset, so the user gets a **permanent "Loading model…" spinner** and the session can't even retry without a refresh (`:805-807`). We also already have the right copy written — *"Unsupported model format — This model format isn't supported yet. Please export it as a compatible Revit or Navisworks file."* (`model-upload-error-codes.config.tsx:69-78`) — it's just wired to the upload panel and never to the viewer. That's why this became a support ticket at all. Worth its own ticket.

**Owners:** Yash (Q1 — console + screen state), Sachin/Ali (Q2 — manifest). **Status: leave as With Customer.**

## What each answer unlocks

- **Q1 = `Unsupported … file type: ifc`** → Branch A confirmed. Root cause is an FE format allow-list, **not** a model or translation defect. Escalates to a **product decision** (support IFC / reject it visibly / block it at ingest) — route to Mostafa/Pietro, not straight to Dev. The customer's source file becomes largely irrelevant to the diagnosis; tell them so and stop the round-trip.
- **Q1 = `Error loading document: …`** or **Q2 shows the job failed/incomplete** → Branch C. Backend/ingest incident; reassign accordingly. The customer's file *is* then useful (re-translate, or identify the malformed geometry / IFC schema version).
- **Q1 = silent, Q2 shows viewables but no 3D geometry role** → Branch B. Translation "succeeded" but produced nothing renderable — an ingest-configuration question.
- **Screenshot shows the "no geometry found" toast** → none of the above; it's the fragment-list branch. Re-diagnose from scratch.

## Runner-up

**(a) a second customer nudge** — correct *only* if Q1 and Q2 both come back inconclusive, or if the customer is still silent in ~a week. Then it escalates the way PLT-2884 did: a coordinator chase with a deadline, and a With Customer → With Technical Support move. Not now — four days is normal, and we have unexploited internal evidence, which per the playbook ("prefer evidence we can gather ourselves over asking the client") we should spend first.

## Follow-through for a human (not executed here)

- **Assign the "why now" question an owner.** It is currently unasked on the thread — the playbook's most-repeated anti-pattern. The cheap version is the V1–V18 version-history check in the draft above.
- **Cohort sweep, once the mechanism lands.** If Branch A: enumerate every model across all projects whose source format is not `rvt`/`nwd`/`nwc`. The mechanism predicts they *all* fail in the web viewer, silently and identically — don't wait for the next ticket to find them.
- **Open a separate FE resilience ticket** for the swallowed-error path. Four concrete items, all in `viewer-service.ts`: (1) replace the `'Fragment list'` substring sniff (`:1011`) with a typed error → terminal error state; (2) add a `finally` to `loadDocuments` (`:812-837`) so `_isModelLoading` resets and the session can retry; (3) surface `model.isFailed` (`:1008`), which is currently set and read by nothing; (4) reuse the existing `UNSUPPORTED_MODEL` copy (`model-upload-error-codes.config.tsx:69-78`) in the viewer, not just the upload panel. Same family as the PLT-2892 finding (no terminal state / no watchdog on model load) — consider scoping one ticket across both surfaces rather than two.
- **On close, update the docs:** add a `dashboard/pitfalls.md` entry ("web viewer accepts only rvt/nwd/nwc source formats; anything else throws in the ID-mapping step and renders a blank viewer with no error"), and make the format constraint explicit in `dashboard/viewer-and-model.md` §"The three-ID mapping chain" (`:99-118`), which currently implies the Revit/Navisworks assumption without stating that other formats are rejected.

---

**Confidence in the diagnosis: 6/10** (FE mechanism 9/10; that this model takes that branch 6/10 — see `context.md` §Confidence).
**Confidence that this is the right next step: 8/10** — the status genuinely is correct, and the parallel diagnostic is cheap, internal, and decisive regardless of which branch turns out to be true.
