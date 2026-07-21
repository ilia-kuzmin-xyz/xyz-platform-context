# PLT-2906 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) — redirect the investigation internally; stop waiting on customer data

The customer's 07-20 reply (True North screenshots) is **not actually the blocking evidence** —
per the code, True North cannot be the fix (`context.md`). The highest-leverage move is an
internal comment that (1) redirects Ilia's own hypothesis before the team spends more cycles on
Revit True North values, and (2) names the one internal check that actually closes "why now."

## Why this and not the others

- **Not (b) Ready For Development — not yet.** Whether to keep the oriented box, add a toggle, or
  revert is a **product decision** (the feature was a deliberate improvement per the design doc's
  own lineage) — sending to dev now would risk reverting a real improvement without buy-in, or
  building a toggle nobody asked for. One product conversation, then dev if a change is wanted.
- **Not (c) stay With Technical Support waiting on the customer.** We are not short on customer
  data — the decisive question (deploy date of our own feature) is internal. Continuing to relay
  questions to the customer (as the True-North ask did) burns a support cycle for no benefit;
  worth explicitly correcting course in-thread.
- **Not (d) Blocked.** Nothing external blocks the next step — it's a look at our own release log.

## Draft — internal reply (author: Ilia; @ Yash, cc Darminder)

Playbook style: state what's confirmed, correct my own hypothesis explicitly, name one closed
next step.

> Update on PLT-2906 (section box misalignment, FAR01/FAR02 + others).
>
> **Correcting my own earlier ask:** I asked for the Revit True North angle, but I've now traced
> the actual mechanism in code — the section box's alignment isn't driven by True North at all.
> We have our own orientation patch (`SectionToolOrientation`) that rotates the section box to fit
> a building's footprint whenever that footprint is diagonal in world coordinates, with no toggle.
> True North only explains *which* projects hit this (ones whose rotation is baked into geometry
> rather than shared coordinates) — it won't fix anything, and there's nothing to change in our DB
> True North field either. **No need to chase the customer's True North values further** — thanks
> for getting them, but they won't move this forward.
>
> **Why now:** the customer confirmed no model re-upload before this started (~07-14). That points
> at a **deploy** of this orientation feature reaching their environment, not a data change. I
> don't have the exact deploy date from git here — @[whoever owns the release log], can we confirm
> when `SectionToolOrientation` (or its containing release) went out, and whether it lines up with
> 07-14 for FAR01/FAR02?
>
> **Once that's confirmed**, this becomes a product call: keep the new oriented box (it's a
> deliberate improvement for diagonal buildings), add a user toggle, or revert the default —
> @Pietro/@Mostafa, worth a quick decision either way so we can close the loop with the customer.
>
> Separately: the customer's phrase "doesn't display the rectangular box" could mean either
> "box is rotated" (as-designed) or "box fails to render" (a real bug). I'd like someone to load
> FAR01 and actually trigger the section box before we close this as as-designed.

## The one evidence step to run (internal; ~10 min once release-log access exists)

Confirm the production deploy date of the `SectionToolOrientation` feature (or the release that
shipped it) for FAR01/FAR02's environment, and check it lines up with 2026-07-14. This is the
"why now" the playbook asks for — currently unconfirmed because this checkout's git history is a
squashed snapshot with no real deploy timestamps.

## Follow-through the human should own (not executed here)

- **Disambiguate the symptom**: load FAR01, activate the box section tool, confirm rotated-but-
  present vs. missing/degenerate box.
- **Product decision** once deploy date confirmed: keep / toggle / revert the oriented box.
- **Cohort**: once the footprint-diagonal condition is understood, it's cheap to enumerate which
  other live projects have diagonal footprints and will show the same behaviour — pre-empt more
  tickets rather than handling them one at a time.
- **Correct the in-thread record**: Ilia's own True-North ask (07-17) should be explicitly walked
  back in-thread so Yash/the customer don't keep chasing it, and so this doesn't read as an open
  question when the team revisits the ticket.
