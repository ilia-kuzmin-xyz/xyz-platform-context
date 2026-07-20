# PLT-2884 — recommended action (DRAFT — not executed)

**Status:** With Customer (Group A) · **Ball:** nominally with the client (asked to
re-upload), but parked ~1 week with no reply **and** with an unverified diagnosis that
may point the wrong way. **No Jira write has been made** — a human reviews and posts.

## Recommended next step — internal nudge + a 5-minute check *before* leaning on the re-upload

This is **not** a clean "wait on customer" like PLT-2815. Two things make a plain status-nudge
insufficient on its own:
1. it has been a week with silence, and
2. the current framing ("your XER is bad, please rectify and re-upload") is **unverified**, and a
   code-documented Platform bug (comparison-skill **Pattern A** — intangible activities computing
   `ActualProgress = 0`) reproduces this *exact* symptom + direction + magnitude with a **valid**
   XER. If it's Pattern A, the re-upload cannot fix it and we're sending the client on a wrong errand.

So the recommended action pairs a **status nudge** with a **cheap internal verification** that can be
done without the customer, and re-routes ownership if it comes back as ours.

### (a) One routed question to Mostafa/Yash — verify before we wait any longer

> Mostafa / Yash — before we keep waiting on the AT10x re-upload, can we confirm the diagnosis on
> one activity? For **`EL1031000` ("Install Temp Power")** on AT10x:
> 1. Does it **exist** in the schedule the Platform ingested (grep the attached `…Rev_02…xer` for
>    `EL1031000`)?
> 2. On the Platform, does it have **`LinkedElements = 0`, `PlannedLaborUnits > 0`, `ActualProgress = 0`**?
>
> If yes to both, this is the **intangible-actual = 0 Platform bug** (same pattern as ELN03), *not*
> the XER — a re-upload won't fix it and we'd own the fix. If the activity is **absent from the XER**,
> then the schedule really is short those activities and the re-upload is the right call.

*(One question, one owner, answerable with a value — playbook message-craft. Scoped explicitly to the
single activity so it can't be read as reopening the whole comparison.)*

### (b) Status nudge to Yash (client channel) — only the wait, no new promises

> Yash — any word from the AT10x customer on the re-upload? It's been about a week. Meanwhile we're
> double-checking one flagged activity (`EL1031000`) our side so we're not waiting on a fix that has to
> come from us rather than from their schedule.

### (c) If (a) comes back as Pattern A / Platform-side
- Re-point the ticket **off "With Customer"** — the fix is ours (parquet generator's intangible
  fallback), not the client's XER. Do **not** keep the client waiting on a re-upload that can't help.
- Link/observe against the ELN03 Pattern-A finding; hop to the **backend parquet-generator team** with
  `EL1031000` as the named affected activity (skill § "Upstream parquet generator caveat"): *"for this
  activity, what `ReportedLaborUnits` does the generator read, and why is the `LinkedElements = 0`
  fallback emitting 0?"*
- Cohort sweep: run the skill's Pattern-A diagnostic across AT10x to count all intangible activities
  reporting 0 — that quantifies the 3.52 pp gap and finds every affected activity, not just the three
  the client screenshotted.

## Why not just "wait" (the PLT-2815 path)?
Because the reference direction here is *new < old* — the mirror image of the stale-link inflation
family (PLT-2385/2874/2882) — and the leading, code-documented mechanism puts the fault on **our**
side, not the client's. Deferring entirely to a customer re-upload risks (i) a week+ of dead wait,
(ii) the customer re-uploading and the gap persisting, and (iii) closing on "works now" if the
re-upload happens to shift numbers for unrelated reasons. The single-activity check costs minutes and
decides ownership cleanly.

## Do NOT
- Do **not** assert to the customer that it "was the XER" as settled fact — it is unverified and there
  is a strong competing Platform-bug explanation.
- Do **not** conflate with PLT-2385 / PLT-2874 / PLT-2882 — those are the opposite direction
  (over-count from stale/duplicate links); this is under-count / missing progress.
- Do **not** post the raw internal Pattern-A / parquet-generator detail into the client-facing Freshdesk
  thread — that's an internal engineering track.

## NEEDS HUMAN
- The **xlsx (`…Dashboard-error.xlsx`, id 60494)** and the **XER (id 60531)** are unreadable in triage
  (attachment-content API returns 403 for the MCP token). The xlsx is very likely the per-activity
  old-vs-new export that answers Pattern-A-vs-absence outright; the XER answers "is `EL1031000` in the
  schedule". A human with Jira access should open both (see `context.md` §7).
- The §5 single-activity DuckDB query needs dev/env access to AT10x.

**Confidence this is the right next step: 7/10** — the verification is cheap, decisive, and
doable without the customer; it protects against both a wrong-errand re-upload and a premature close.
