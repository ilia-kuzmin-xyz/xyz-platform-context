# PLT-2884 — Recommended action

**Chosen action: (a) Nudge for the customer's re-upload outcome — routed through Yash (owns the channel) — while pinning down from Mostafa exactly what was wrong with the XER so the customer's correction is targeted. Keep status "With Customer". Draft only; do not execute.**

## Why (a), not something else

The ticket is **Critical** and has sat **With Customer for ~7 days** (customer asked to fix + re-upload the XER on 10 Jul; Ilia nudged 13 Jul; Yash confirmed "still waiting" 13 Jul; no outcome since). The root cause is already human-diagnosed (Mostafa: *"it was with the XER file"*) and the mechanism is source-data, not FE — so there is **no code work to start** and no reason to move to Ready-For-Dev. The single missing thing is the **customer's response**, so the correct next move is a nudge. But a bare "any update?" risks a low-value loop: "rectify it on their end" was **vague**, and if we never told the customer *precisely* what was wrong (stale revision vs missing activities vs unlinked codes), their re-upload may reproduce the same 3.52% gap. So the nudge is paired with one closed clarifying question to Mostafa, so the customer instruction is specific enough to actually close this.

- **Not "Ready For Development":** no FE defect — the platform correctly reflects a deficient XER. (The only *candidate* code work — surfacing "activities in the model but absent from the ingested schedule" — is a separate product/FE follow-up, not this incident's fix.)
- **Not close / resolve:** playbook rule — close on **cause + trigger + cohort + verified fix**, never on assumption. We have a plausible cause but **no confirmation the re-upload fixed it**, and the specific XER defect is unconfirmed.
- **Not "Blocked":** waiting on a customer reply is a normal With-Customer state, not an internal blocker.

## Draft 1 — internal, to Mostafa (closed clarifying question, so the customer ask is precise)

> @Mostafa — reviving PLT-2884 (EQX-AT10x, Critical, With Customer since ~10 Jul). You identified the cause as the XER file — to make the customer's re-upload land first time, can you confirm **what specifically was wrong**: (1) a **stale revision** (the XER we ingested is `…Rev_02_updated20260427.xer`, 27 Apr — is their PowerBI on a newer one?), (2) **activities missing** from the XER entirely (e.g. EL1031000 "Install Temp Power"), or (3) activities present but **unlinked / no percent-complete** so they roll up to 0? One line is enough — it tells us exactly what to ask them to fix.

## Draft 2 — internal, to Yash (nudge + relay), post after Mostafa replies

> @Yash — PLT-2884 (EQX-AT10x) has been With Customer ~7 days and is Critical. Two things:
> 1. Any outcome yet from the customer on the **corrected-XER re-upload**? yes / no / no reply.
> 2. If no reply, could you nudge them with a **specific** ask (below) rather than a generic "rectify the XER" — Mostafa has confirmed what to fix, so we can close this in one round.

## Draft 3 — for Yash to relay to the customer (payload; fill in the specific defect from Mostafa)

> Hi — following our review, the progress gap on the new dashboard (23.85% vs 27.37% in PowerBI) comes from the **schedule (XER) currently loaded for AT10x**: **[specific defect from Mostafa — e.g. it is an older revision (27 Apr) than your PowerBI source / activities such as EL1031000 are missing / activities are present but carry no percent-complete]**. Could you re-export the **latest** schedule addressing that, re-upload it via the platform, and let us know once done? The dashboard progress is generated from that schedule, so once the corrected XER is ingested the numbers should line up. If any activities still differ afterwards, send us the specific activity codes and we'll trace them.

## After the customer replies — routing (for the human, not to execute now)
- **If the re-upload closes the gap:** verify the new Actual % matches PowerBI (or that the residual is explained), then close with cause = deficient/stale XER + trigger + which activities. Don't close on "looks fine" without the numbers.
- **If the gap persists after a correct XER:** the diagnosis was incomplete — re-open and trace via the `dashboard-progress-comparison` skill (Platform parquet vs PowerBI, stage by stage), starting from EL1031000: is it in `api_activities`? does it have an `activity-links` row? does it carry progress in `project_progress`/`category_groups`? That isolates ingestion vs linking vs weighting.
- **Product/FE follow-up (independent of this customer):** consider surfacing "activities present in the model/editor but absent from the ingested schedule" instead of silently omitting them — this class of PowerBI→platform discrepancy will recur on any project running a stale XER. Raise separately (Mostafa/Pietro to own the product call).
- **Cohort:** once the specific defect is known, ask whether other PowerBI→platform-migrated projects are on stale/incomplete XERs.

**Confidence in this recommendation: 8.** High that a nudge-plus-precision to the customer (via Yash, with Mostafa confirming the exact defect) is the right next move — the ball is genuinely with the client, the cause is human-diagnosed, and there is no FE work to start. The only judgement is bundling the Mostafa clarification with the nudge; that's deliberate, to avoid a vague re-upload that reproduces the gap. Execute nothing without human review.
