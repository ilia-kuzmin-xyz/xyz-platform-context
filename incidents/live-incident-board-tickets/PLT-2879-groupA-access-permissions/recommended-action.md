# PLT-2879 — Recommended action

> **07-17 refresh.** One new comment since the last pass: **Darminder (assignee),
> 13 Jul 18:27** — a root-cause diagnosis ("legacy *dashboard only* role should be
> `viewer_role`/Viewer; authorities preset in BE; V1 no longer supported"). It does
> **not** state a customer ask or change status, and **nothing has moved in the 4
> days since** → the ticket is **stalled with nobody driving it**. The chosen action
> is unchanged in shape but **now routes to Darminder as well as Yash** (Darminder is
> assignee and posted the diagnosis), and gains a sharper edge: his framing implies
> the fix is a **role-data / cohort remap**, which means "With Customer" may be
> **mis-parked** (ball with XYZ, not SWITCH). Confidence 7 → **7**.

**Chosen action: (a) Post a status-check / closed question to Darminder + Yash — do not silently leave it parked. Draft only; do not execute.**

## Why (a), not (b)/(c)/(d)

The one hard gap in the record is that the ticket sits in **"With Customer" with no comment saying what we are waiting for** — Darminder flipped it Open→With Customer on 10 Jul with no note, and the last substantive comment is 8 Jul. Before nudging the client we must establish what SWITCH actually owes us, and whether mbowser has already confirmed access since the 9-10 Jul fixes (role→Viewer flip / Redis flush). Yash is the coordinator and owns the SWITCH channel, so one closed, routed question to him is the highest-leverage unblock — and it lets us also confirm/close the follow-ups this ticket has been silently carrying.

- **Not (c)** (draft only the customer-facing question): risks re-asking SWITCH something already answered in the off-Jira chat thread; we can't see that thread, so route through Yash first. The customer question is still drafted below as the payload for Yash to relay *if* nothing else is outstanding.
- **Not (b) "Ready For Development"**: the FE code fix is identifiable (honor `DASHBOARD_VIEW` in the dashboard gate, `project-private-route.tsx:41`) but **not ripe**: the playbook frames it as a product/architecture decision — *honor `DashboardView` on FE gate + api2 read endpoints* **vs** *retire the legacy "Dashboard Only" role entirely* — that spans api2/IAM (unverifiable here) and needs a Mostafa/Pietro + Sachin/Ali decision first. Shipping a unilateral FE change could be exactly wrong if the decision is to retire the role. That work also belongs in a dedicated code ticket / the PAPI-3602 "Portfolio Permissions" epic, not on this customer-incident ticket.
- **Not (d) "Blocked"**: awaiting a customer reply is a normal "With Customer" state, not an internal blocker; the expected unblock is the client's confirmation, which (a) drives.

## Draft 1 — internal, to Darminder + Yash (post as a PLT-2879 comment or in the incident chat)

> @Darminder @Yash — PLT-2879 (SWITCH / mbowser@switch.com, Blocker) has been parked *With Customer* since 10 Jul and hasn't moved since Darminder's 13 Jul root-cause note. Three closed questions to unstick it:
> 1. @Yash — what are we actually waiting on SWITCH for: **confirmation mbowser can now open the dashboards**, or **outstanding evidence** (e.g. a Network-tab capture)? Or is "With Customer" stale and the ball is really with us?
> 2. @Yash — has mbowser confirmed access at any point since the 10 Jul role/cache fix — yes / no / no reply?
> 3. @Darminder — your 13 Jul note frames the fix as "these users should be Viewer, not Dashboard Only." Is the plan to **remap the affected cohort's role data** (and enumerate everyone still on the legacy role), rather than change the FE gate? If so, that's a code/cohort workstream that outlives mbowser's symptom.
>
> For the record (tracked in context.md): the FE dashboard gate still requires `ProjectView` and does **not** honor `DashboardView` (`project-private-route.tsx:49`), and "why now / trigger" (candidate: the V1/old-nav deprecation) has no owner. So we should not resolve PLT-2879 on "mbowser works now" without a separate code/cohort ticket + a trigger owner.

## Draft 2 — for Yash to relay to SWITCH (the (c) payload, only if #1 = awaiting confirmation)

> Hi — following the fix applied on our side, could you confirm whether **[Director of Construction, mbowser@switch.com]** can now open the SWITCH dashboards (ATL05-08)? If he still sees an error, please send a screenshot of **F12 → Network tab** showing the failing request (status + URL) at the moment it fails, so we can pinpoint it without further back-and-forth.

## After they reply — routing (for the human, not to execute now)
- **If mbowser confirms access:** don't auto-close. Split the still-open incident work into a code/cohort ticket under **PAPI-3602 (Portfolio Permissions)** before resolving PLT-2879 — per playbook "close on cause + trigger + cohort, never on 'looks fine now'."
- **If still broken / evidence returns:** re-open investigation; the FE gate root cause (`project-private-route.tsx:49` requires `ProjectView`) is confirmed present (re-verified 07-17), so a `DashboardView`-only user would still be denied — that becomes the concrete fix.
- **Cohort sweep is now the likely direction** — Darminder's 13 Jul comment leans toward "these users should be Viewer" (remap role data), i.e. the retire-legacy-role branch over honoring `DashboardView` in the gate. Whoever owns the fix should enumerate everyone still holding the legacy "Dashboard Only" role and remap in bulk, not just mbowser.
- **Trigger ("why now") owner still unassigned** — assign it; candidate is now the **V1 / old-navigation deprecation** (from Darminder's comment), still uncorrelated to a dated deploy/error-rate. FE gate unchanged since PLT-2753 (#1959), so look at api2/IAM/role-data or the Redis cache behaviour.

**Confidence in this recommendation: 7.** High that a status-check to Yash is the correct next move (the waiting-state is genuinely undocumented and the ball is plausibly with the customer); lower certainty on the precise customer ask, which is exactly what the draft resolves. Execute nothing without human review.
