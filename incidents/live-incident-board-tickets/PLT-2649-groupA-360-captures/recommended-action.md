# PLT-2649 — recommended action (DRAFT ONLY — execute nothing)

> **Superseded — 2026-07-29 re-check.** The previous draft (route the re-upload-vs-remap
> decision to Pietro) is **obsolete**. Pietro answered on 2026-07-13; the root cause was
> pinned on 07-16/07-24 to a single wrong level elevation; the answer to "re-upload vs
> remap" turned out to be **neither** — it is a one-value source-model fix. The ticket is
> now `With Customer` and, unusually for this board, **it is parked correctly**. The action
> below is therefore a *tracking + closure-hygiene* move, not a diagnostic one.

## Chosen action: (a) — one internal comment that pre-empts a bounce and names the closure conditions

Post a short internal comment on PLT-2649 that (1) removes the one ambiguity likely to bounce the request back from project delivery (the **V1-vs-V14** model naming), (2) states the **"why now"** answer explicitly so it isn't left dangling, and (3) names the **post-re-upload verification owner and check**. Keep **Yash Patel** as assignee/owner (correct for `With Customer`); the verification check belongs to Ilia or QA.

## Why this and not the others

- **Not (b) Ready For Development.** There is **still no frontend fix to make**, and the evidence for that is now stronger than at the last run: the FE has no code path that reads `project-levels.elevation` for pin placement at all — elevation is metadata for the Level filter only (`context.md` § Mechanism, with refs). Pin Z is the capture's own `zMeters`, delivered pre-broken by ingestion. A Dev ticket would bounce. *(The one code-adjacent nuance — non-deterministic `FIRST(zMeters)` — is now shown to be **irrelevant** to this incident, since the whole level is offset uniformly. It stays a tech-debt note, not a fix.)*
- **Not (c) a new client/customer ask.** The specific, actionable ask was already relayed on 2026-07-24 and Freshdesk #6622 is "Waiting on customer". Asking again 5 days later is noise. The comment drafted below is **internal** — it makes the *existing* ask harder to misread, it does not re-open it.
- **Not (d) Blocked.** `With Customer` already expresses the dependency, and per the board README that status is in-scope-but-parked. Nothing internal is blocked.
- **Not "no action / unchanged".** Tempting, since the ticket is in the right state — but three playbook Phase-6 items are open and *will* be lost at close if nobody writes them down now: the unstated trigger, the unowned verification, and the unticketed product thread. Those are exactly the gaps that turn a fix into a recurrence.
- **Not a status change.** Do **not** move it off `With Customer`. Revisit only if it is still silent at ~**10 days** (i.e. from ~2026-08-03), at which point the right move is a Yash chase on Freshdesk #6622, and only after that a `With Technical Support` escalation.

## Draft — internal comment (author: Ilia Kuzmin; @ Yash Patel, cc Gennaro/Radu for verification)

Playbook style: one owner per question, closed and answerable, explicit scoping.

> @Yash Patel — three notes so the PA12 360-pin fix doesn't bounce or half-close. No action needed from the customer beyond what you already sent on 24 Jul.
>
> **1. Model identity — flag this to project delivery.** I wrote *"version V1"*, but the file is named `..._V14_R24_detached`. Those are two different numbering schemes (platform upload version vs the client's own file revision) — same file. If there is any doubt on their side, the one to change is the **Architectural** model `PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24_detached`, uploaded 2025-12-04, level **`DC - 0G - FFL`** (id `f0f4d409`), elevation **50.4 → ≈0** (siblings: DC-01-FFL 5.3, DC-02 10.6, DC-03 15.9). Better still, fix the shared coordinates of the linked file those 48–73 m levels come from.
>
> **2. "Why now" — there is no regression.** The bad elevation has been in the model since the 2025-12-04 upload; nothing changed in our code or in the captures. The symptom surfaced when captures on that level started being viewed. Recording it here so we don't go looking for a deploy that doesn't exist.
>
> **3. What "done" looks like, and who checks it.** After project delivery re-uploads: re-check the Z of the 360 pins on `DC - 0G - FFL` — expect the 101 rooms / ~1870 captures on that level to land at the floor, not ~50 m above it, with pins on the other DC levels unchanged. I'll run that check on re-import (@Gennaro / @Radu if you'd rather own it as QA). We should **not** close on "looks fine now" without that pass.
>
> Scoping: `[NEW DASHBOARD]` in the title is still a red herring — the defect is upstream of both dashboards, and no dashboard code change is involved in the fix.

## Second, separate draft — split the product thread out (owner: Pietro; @ Jason, Mostafa)

Small but genuinely load-bearing: this is a **feature discussion currently living inside a live incident** with no ticket and no owner (`issuelinks` is empty; Mostafa never replied to Pietro's 07-13 @-mention).

> @Pietro Desiato @Jason Fingland @Mostafa Kamel Hussien — the 360-editor pin-adjustment idea from 13 Jul is worth its own ticket, separate from this incident. PLT-2649 itself needs no product work: it's one wrong level elevation in the source model, fixed on re-upload, so the pins here will correct themselves.
>
> The idea worth keeping is Jason's second one — an **automated pass that flags captures whose position no longer matches their host level** ("taken on Level 3, now sits above Level 4"). That would have caught this in December instead of May, and it doesn't carry the "users moving things away from site reality" risk of free-hand editing. Shall I raise it as a product/UX ticket so PLT-2649 can close on the data fix alone?

## The one evidence step worth running (owner: Ilia; small, needs DuckDB/dev on PA12)

Not required to progress the ticket — the fix is already specified — but it converts the strongest remaining assumption into a fact and is the input to the cohort sweep below:

1. **Confirm the offset is uniform per level** (kills any residual "per-capture PBP" reading): for PA12, `SELECT levelName, COUNT(*), MIN(zMeters), MAX(zMeters), AVG(zMeters) FROM captures_360 c JOIN rooms r ON c.modelRoomId = r.id GROUP BY levelName`. Expect `DC - 0G - FFL` ≈ 50 m above its siblings with **tight spread**, others normal. A tight spread proves per-level; a wide spread would mean there is a second, per-capture problem hiding underneath — worth knowing *before* the re-upload rather than after.
2. **Record the pre-fix baseline** for those 101 rooms so the post-re-import verification in the comment above has something to diff against.

## Follow-through the human should own (not executed here)

- **Timer, not a nudge:** silent since 2026-07-24. Re-check ~**2026-08-03** (10 days). If still silent → Yash chases Freshdesk #6622; escalate to `With Technical Support` only after that. Do not chase before then.
- **Verification gate:** do not let this close without the post-re-import Z check (draft item 3). Assign it to a name — Ilia or QA (Gennaro/Radu) — not to "we".
- **Cohort sweep (new, nobody has proposed it):** the generalizable defect is *"a federated linked file at a foreign datum silently mis-places every level-hosted entity"*. Cheap sweep: per project, flag levels whose `elevation` is a large outlier against its siblings (or whose `sourceFileLevelId` provenance group sits in a different band). Finds the next PA12 before a customer does. Route to whoever owns model ingestion (data-pipeline / David Webb-adjacent), not FE.
- **Reassignment:** none needed — Yash is the right assignee while `With Customer`. If it flips back to us, the investigation owner is Ilia.
- **Post-close doc work:**
  - `dashboard/pitfalls.md` — add: *"360 pin Z is the capture's own `captures_360.zMeters`, not a room/level lookup. `project-levels.elevation` is FE metadata only (Level filter), so a wrong level elevation in the source model is invisible to the frontend and unfixable from it — it arrives pre-baked in the capture coordinates. A federated link at the wrong datum mis-places every pin on its levels by a uniform offset (PLT-2649: 50.4 m). Also latent: `FIRST(zMeters)` per room has no `ORDER BY`, so a room mixing good and bad captures renders non-deterministically."*
  - `dashboard/360-tab.md:49` — fix the inaccurate "coordinates … from its `modelRoomId`" wording per `context.md` § Doc refs.
- **Routine hygiene:** PLT-2649 was **skipped in the 07-22 run** despite four unread comments (see `context.md` § Routine gap). Future run entries should list every carried-over folder explicitly, even as "unchanged", so a silent miss is distinguishable from a deliberate no-op.
