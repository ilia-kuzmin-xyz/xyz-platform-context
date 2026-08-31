# PLT-2651 — Recommended action

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
