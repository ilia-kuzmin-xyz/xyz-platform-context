# PLT-2651 — Recommended action

## 2026-09-11 (scheduled) — unchanged since 09-08; the 09-09 correction is now 3 days unposted. Restating the draft, unchanged in substance.

Fresh `getJiraIssue` fetch this run: no new comment since 111646 (09-08), status still `With
Customer`, assignee still Yash Patel, no new attachment. `hc-frontend` re-checked directly (see
`context.md` this date): `viewer-service.ts:974-983` still has the `applyBasePointTransform` call
site commented out, and `section-tool-orientation.ts` still has both named defects (`models[0]`-only,
unbounded memo) unwritten. Nothing has moved since the 09-09 interactive session — this pass changes
no recommendation, only re-verifies it and restates the draft so it is not lost between runs.

**Still true north diagnosis, and still not sent to the customer.** The customer is currently sitting
on an instruction (comment 111642) to change ATL08's true-north setting, which — per the code read on
09-09 and re-confirmed today — cannot change anything in the Web Editor. Every day this goes unposted
is a day the customer may spend acting on it for nothing. This is the class-1 half of the class-4
action class below.

**Not changed from 09-09:** the decision to ask Ali (DPL) first before posting a public correction.
No answer from Ali has arrived (nothing was posted — draft-only, per the hard rule), so the same
posture holds: correct the customer once, with Ali's answer in hand, rather than issue a second
guess. This run's draft below is written anyway, per this run's explicit instruction, because 3 days
of silence on a Critical, 128-day-old ticket is long enough that the human reviewing this should see
the message ready to go rather than wait further on Ali.

**Action class: 4, with a class-1 chase attached (unchanged).** See `context.md` this date for the
full restatement of why (product decision spanning Web Editor + ATOM + ≥6 projects; not code this
session can write).

### Draft — to Yash Patel, on PLT-2651 — DRAFT ONLY, not posted (93 words)

> Yash, quick correction before they act on my last message: changing the project's true north
> setting won't change anything in the Web Editor's section box, that code path isn't active. What
> actually fixes it is the model being re-exported from Revit with the right rotation in its
> coordinates, not a settings change or a re-upload. We're double-checking the exact export ask with
> our backend team so we give them one correct instruction instead of a second wrong one. **Can you
> ask them to hold off on the true-north change until we confirm that?**

**Assumption above the draft, not in it:** rests on `ignoreTrueNorthAngle` being honoured by DPL as
its name implies — unverified (Ali's question, still unposted, is the 09-09 draft further down this
file).

**No Jira action taken by this run.**

---

## 2026-08-31 — first pass. Chosen: reply to Yash with the premise corrected and one test that is also a workaround. Keep the ticket Open.

**Why this and not the alternatives**

- **Not Ready For Development yet.** We have two live hypotheses in the same 40 lines of one file
  (H1 stale session angle / H2 unrepresentative first-model footprint — `context.md` §6). One refresh
  by the customer tells us which to fix first, and it costs them a minute. Writing the fix blind means
  guessing which half to do, on a feature that has already shipped four incidents' worth of guesses.
- **Not With Technical Support.** The technical answer belongs to us; we are only borrowing the
  customer for a one-minute observation, which Yash routes.
- **Not Blocked.** Nothing blocks the reply or the fix.
- **Do not answer Yash's question as asked.** He asks us to *"confirm whether the correction is only
  being applied to existing models rather than newly processed ones."* Answering that on its own terms
  endorses a model-data story that is false (`context.md` §V5) and the next step becomes a re-export
  request to the client's BIM team — the same shape that cost five weeks on PLT-2649. Correct the
  premise in sentence one.

**Assumption this rests on, stated once and not put in the message:** that ATL08's misalignment is the
session-frozen angle (H1) rather than a genuinely unrepresentative angle for the whole federation (H2).
Both fit every fact on the ticket; the refresh below discriminates them, and either answer points at
the same file.

---

### Draft comment — to Yash Patel, on PLT-2651 — DRAFT ONLY, not posted

> Yash, one correction on the premise first: none of the previous section box fixes touched the models
> themselves. The alignment is worked out fresh in the browser every time, from the geometry, so there
> is no such thing as a model that got the fix and a model that didn't. New imports go through exactly
> the same path as old ones.
>
> What is real is that the viewer works the angle out once per session, from whichever model loads
> first, and then reuses it for everything opened after that. So if someone turns the section box on
> and then loads more models, the box keeps the old angle. That matches what they are describing.
>
> There is a one minute test that tells us which of two fixes we need, and it doubles as a workaround
> for them in the meantime.
>
> **Could you ask them to load every model they need first, then refresh the page, and only then turn
> the section box on, and tell us whether the box lines up after that?**

---

### What each answer means (for us, not for the message)

- **"Yes, it lines up after a refresh"** → H1 confirmed. Fix: recompute the orientation when models are
  loaded or unloaded, instead of memoizing it for the life of the page
  (`section-tool-orientation.ts:57-63`). Tell the customer the refresh is a valid workaround until it
  ships.
- **"No, still wrong after a refresh"** → H2. Fix: derive the footprint from all visible models rather
  than `getVisibleModels()[0]` (`section-tool-orientation.ts:90-93`, `:104`).
- **Either way**, check V4 while in the file — we mutate `getVisibleModels()[0]` and Forge reads
  `get3DModels()[0]` (`context.md` §V4).

### Second thing to do today, independent of the answer above

⚠️ **Open `Screenshot 2026-08-28 154905.png`** (attachment 63521 — 403 here). Yash says it shows two
example models. If the two boxes are tilted by *different* angles it is H2; by the *same* wrong angle,
H1. **That is the whole fork, readable from one image, without waiting on the customer at all.** If
someone opens it before Yash relays the question, the draft above can be shortened to just the premise
correction plus the workaround.

### Flag when this is picked up

This ticket is **Critical**, **117 days old**, and the customer's last substantive report
(*"still not fully aligned"*, 2026-06-03) was closed out the next day without a reply. Its twin on the
same project, **PLT-2771**, was also closed with no fix and no diagnosis. Whoever answers should expect
the customer to already be out of patience, and should not repeat the two moves that got us here —
verifying on projects other than the reporting one, and treating a developer's non-reproduction as
resolution (`context.md` §3, §6).

**No Jira action was taken by this run.** Confidence, per `xyz-platform-context/CLAUDE.md` scale:
**9/10** that the operative cause is one or both of H1/H2 in `section-tool-orientation.ts` (the code is
read directly, ATL08's inputs are recorded in the feature's own doc, and the customer's wording maps
onto V1 almost word for word); **6/10** on H1 specifically over H2 — that is what the refresh settles.
Not testable here: this environment cannot build or run the app.

---

## 2026-09-01 — RECOMMENDATION CHANGED. Do not run the H1-vs-H2 customer test to decide the fix.

Ilia asked whether knowledge from the already-fixed section-box tickets would have helped here. It
does more than help: **it means this ticket's answer was written down in July, before it reopened.**

PR #2069 (PLT-2906, FAR01/FAR02 — the one we shipped) explicitly deferred two hazards, quoted
verbatim from `../PLT-2906-groupA-viewer-and-model/context.md`:

> - The gate/footprint is computed from **`getVisibleModels()[0]` only** — load-order-dependent on
>   multi-model sessions (`section-tool-orientation.ts:93,104`).
> - The compound-footprint min-area-rect estimate is **unreliable on multi-building/site
>   footprints**.

**Those two are H1 and H2 in `context.md` §6.** PLT-2651's reopening is the deferred debt of the
previous fix coming due, on a customer who was told once already that this was resolved.

### What changes

The earlier draft asked the customer to load-all-then-refresh so we could **choose** between H1 and
H2. That framing is wrong: both are known-broken by our own admission and both sit in the same ~40
lines. The refresh only reveals which one bites first on ATL08; it does not tell us which to fix,
because the answer is **both**.

- **Fix H1:** recompute `theta` when models load or unload, instead of memoising it for the life of
  the page (`section-tool-orientation.ts:57-63`, `:114`).
- **Fix H2:** derive the gate and the footprint from **all** visible models, not
  `getVisibleModels()[0]` (`:90-93`, `:104`).
- **Check V4 while in the file:** we mutate `getVisibleModels()[0]` while Forge reads
  `get3DModels()[0]`.

The refresh test is still worth running — as **our own** visual check (Ilia has a working local
build; see below), and as an interim **workaround** to offer the customer. It is no longer a
decision gate.

### Test it ourselves, not via the customer

Ilia's point, and it is right. Two reasons this is now possible when it was not before:

1. **We know which models.** Rishi could not reproduce it twice (03 Jun on this ticket, 15 Jun on
   PLT-2771) and both non-reproductions were treated as resolution — which is how this reached 118
   days. Those attempts failed because nobody knew which models to open. We now do:
   `PC-EXCEL_SWITCH_ATL8_ELEC_BracketsAndSupports_Bld1-V1` (inserted 2026-07-08) and
   `PC-NAP08_MEC ELEC_Bld 8.1-R23_ConduitsInternal-V1_` (inserted **2026-08-28**, the day the ticket
   reopened).
2. **A local build works.** Demonstrated the same day on the `PLT-3096` diagnostics branch.

Procedure:

1. ATL08, open **only** the July model. Section box on. Note the angle.
2. Without refreshing, enable the 28 Aug model. Box holds the July angle while the new model sits
   skewed inside it -> H1 reproduced.
3. Refresh with both loaded, section box on. Still wrong -> H2 also present.

Instrumenting `theta`, which model was `getVisibleModels()[0]`, and whether `patchIfNeeded` was
skipped by the memo would make step 2 unambiguous — same approach as the PLT-3096 branch.

### The family pattern, worth naming

**Five incidents, and every fix was scoped to the reporting project's numbers.** #1871 built the
feature for ATL08, #1933 rewrote it, #2069 tuned the dead-band for FAR01, PLT-2771 got no fix at all.
None addressed load-order or federation. A sixth project will reopen it again unless the two deferred
items are done.

### One open risk from PLT-2906 is now CLOSED

Those notes flagged that `master` did not contain PR #2069 while the customer had been told the fix
was shipping in 26.3.4. Verified today in the `hc-frontend` checkout on `master`:
`ORIENTATION_MISMATCH_THRESHOLD_RAD = 0.5 * (Math.PI / 180)` and
`refPointTransform.compose(pos, quat, scale)` at `:123`. **The fix is in master.** That risk can be
struck from the PLT-2906 folder.

---

## 2026-09-09 — ACTION CLASS 4 (with a class-1 chase attached). Ticket is With Customer; the instruction they were given cannot work in the Web Editor.

**State:** `With Customer` since 2026-09-08 14:29, assignee now **Yash Patel** (was Ilia). Ilia's
comment 111642 asked the customer, via Yash, to set ATL08's project true north to ~17° and then see
whether the box changes and whether models need re-uploading. Darminder (111643) tied the ticket to
HS-407 111637, where Pietro, Ali, Mostafa and Thomas have agreed the fix is the customer correcting
model orientation at source, and that *"the change on Web editor was done as it was thought to be a
bug at the time it was raised."*

**Why class 4, not 2.** The remaining question is not code we can write. It is whether
`SectionToolOrientation` stays at all — a decision that spans two products (Web Editor, ATOM), five
people and at least six projects (ATL05-08, FAR01/02, ATOM HH), with an uncounted blast radius
(every project today relying on the guess: true north 0 plus a tilted building). Writing the named
two-part fix now would contradict the direction the same group agreed yesterday and risks reopening
PLT-2756 for the third time. **Explicitly not class 2**, and not class 3 — no visual debugging is
outstanding; the mechanism is measured (09-04, 09-08).

**The class-1 half, and it is time-critical.** The customer is being asked to do something that,
per the code, cannot change the Web Editor box: the project's true-north angle is never applied to a
loaded model — `applyBasePointTransform`'s only call site is commented out
(`viewer-service.ts:974-983`, same on `origin/master`). And every Web-Editor upload hard-codes
`ignoreTrueNorthAngle: true` (`projectModelsActions.ts:63, 185`), so the re-upload half may be inert
too. If we say nothing, the likely outcome is a week spent on a settings change that produces no
visible difference, on a Critical ticket 126 days old whose twin HS-407 was escalated as **urgent**
on 09-04. See `context.md` § 2026-09-09 for the full verification.

**Assumption this rests on (one line, not for the message):** that DPL honours
`ignoreTrueNorthAngle` as its name implies — unverifiable from the FE and api-v2 repos, which is
precisely what the draft below asks.

---

### Draft — to **Ali Seyedof** (DPL / ingest), for Ilia to post if he agrees — DRAFT ONLY, not posted (98 words)

> Ali, a question about model processing on ATL08. Every model uploaded through the Web Editor is
> sent with the project's true north angle marked as ignored, and we cannot see what happens to it
> after that. The customer is about to set ATL08's true north to roughly 17 degrees and re-upload,
> and we would like to know whether that can change anything before they spend a week on it.
>
> **If a project has a true north angle set and a model is then uploaded through the Web Editor,
> does the processed model come back rotated by that angle?**

**What each answer means (for us, not for the message):**

- **"No, we ignore it"** → the settings change and a re-upload both do nothing in the Web Editor.
  The ask to the customer becomes a **Revit re-export with the building's rotation in shared
  coordinates**, which is the only thing that reaches `refPointTransform`. Once it does, our patch
  switches itself off on its own (`section-tool-orientation-math.ts:145-155`, gate at ≥0.5°) and
  Forge orients the box correctly — no code change needed from us.
- **"Yes, we apply it"** → the plan works as posted, and the FE hard-coding
  `ignoreTrueNorthAngle: true` on every upload (`projectModelsActions.ts:63, 185`) becomes a bug in
  its own right, because no user can ever get that behaviour from the Web Editor.

### Not drafted, deliberately

- **No correction posted on PLT-2651 yet.** Ilia's comment 111642 is one day old and the customer is
  already actioning it; a public correction before Ali answers would be a second guess in front of a
  customer who has been told wrong things twice already (26.2.3 "fixed", 06-04 closed on
  non-reproduction). Ask Ali first, then correct once, with a value in hand.
- **No column move.** `With Customer` is the correct column while the ball is genuinely theirs.

### The decision that needs a human, and it is bigger than this ticket

HS-407 111637 reclassifies the whole Web-Editor workaround as something that should not have shipped.
If that stands, PLT-2651's real resolution is *"remove the guess, require correct model orientation"*,
not *"improve the guess"*. That needs an owner and a number before it can be actioned:
**how many live projects currently depend on the guess** (true north 0 and a tilted footprint) — each
one gets an axis-aligned box the day it is removed. Nobody has counted them; this automated session
cannot (no authenticated project read). Proposed: Ilia + Darminder + Pietro settle keep-or-retire,
with that count on the table, before any code is written on these 40 lines for the fifth time.

**No Jira action was taken by this run** — no comment, no transition, no assignment, no field edit.
