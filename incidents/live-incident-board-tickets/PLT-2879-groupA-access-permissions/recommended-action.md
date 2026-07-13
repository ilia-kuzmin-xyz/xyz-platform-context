# PLT-2879 — Recommended action

**Chosen action: (a) Post a status-check / closed question to Yash — keep status "With Customer". Draft only; do not execute.**

## Why (a), not (b)/(c)/(d)

The one hard gap in the record is that the ticket sits in **"With Customer" with no comment saying what we are waiting for** — Darminder flipped it Open→With Customer on 10 Jul with no note, and the last substantive comment is 8 Jul. Before nudging the client we must establish what SWITCH actually owes us, and whether mbowser has already confirmed access since the 9-10 Jul fixes (role→Viewer flip / Redis flush). Yash is the coordinator and owns the SWITCH channel, so one closed, routed question to him is the highest-leverage unblock — and it lets us also confirm/close the follow-ups this ticket has been silently carrying.

- **Not (c)** (draft only the customer-facing question): risks re-asking SWITCH something already answered in the off-Jira chat thread; we can't see that thread, so route through Yash first. The customer question is still drafted below as the payload for Yash to relay *if* nothing else is outstanding.
- **Not (b) "Ready For Development"**: the FE code fix is identifiable (honor `DASHBOARD_VIEW` in the dashboard gate, `project-private-route.tsx:41`) but **not ripe**: the playbook frames it as a product/architecture decision — *honor `DashboardView` on FE gate + api2 read endpoints* **vs** *retire the legacy "Dashboard Only" role entirely* — that spans api2/IAM (unverifiable here) and needs a Mostafa/Pietro + Sachin/Ali decision first. Shipping a unilateral FE change could be exactly wrong if the decision is to retire the role. That work also belongs in a dedicated code ticket / the PAPI-3602 "Portfolio Permissions" epic, not on this customer-incident ticket.
- **Not (d) "Blocked"**: awaiting a customer reply is a normal "With Customer" state, not an internal blocker; the expected unblock is the client's confirmation, which (a) drives.

## Draft 1 — internal, to Yash (post as a PLT-2879 comment or in the incident chat)

> @Yash — reviving PLT-2879 (SWITCH / mbowser@switch.com, Blocker, parked *With Customer* since 10 Jul with no note). Two closed questions so we can either close it or re-open the fix:
> 1. What exactly are we waiting on SWITCH for — **confirmation that mbowser can now open the dashboards**, or **outstanding evidence** (e.g. a Network-tab capture)?
> 2. Has mbowser confirmed access at any point since the 10 Jul role/cache fix — yes / no / no reply?
>
> If it's (1)-confirmation and there's been no reply, here's a ready-to-send line for the client (below). Heads-up for the record: this only closes *mbowser's* symptom — the underlying legacy-role gate is still unfixed in code and the cohort/trigger follow-ups are still open (tracked in context.md), so we should not resolve PLT-2879 as "works now" without a separate code/cohort ticket.

## Draft 2 — for Yash to relay to SWITCH (the (c) payload, only if #1 = awaiting confirmation)

> Hi — following the fix applied on our side, could you confirm whether **[Director of Construction, mbowser@switch.com]** can now open the SWITCH dashboards (ATL05-08)? If he still sees an error, please send a screenshot of **F12 → Network tab** showing the failing request (status + URL) at the moment it fails, so we can pinpoint it without further back-and-forth.

## After Yash replies — routing (for the human, not to execute now)
- **If mbowser confirms access:** don't auto-close. Split the still-open incident work into a code/cohort ticket under **PAPI-3602 (Portfolio Permissions)** before resolving PLT-2879 — per playbook "close on cause + trigger + cohort, never on 'looks fine now'."
- **If still broken / evidence returns:** re-open investigation; the FE gate root cause (`project-private-route.tsx:41` requires `ProjectView`) is confirmed present, so a `DashboardView`-only user would still be denied — that becomes the concrete fix.
- **Trigger ("why now") owner still unassigned** — assign it; FE gate is unchanged since PLT-2753 (#1959), so look at api2/IAM/role-data or the Redis cache behaviour.

**Confidence in this recommendation: 7.** High that a status-check to Yash is the correct next move (the waiting-state is genuinely undocumented and the ball is plausibly with the customer); lower certainty on the precise customer ask, which is exactly what the draft resolves. Execute nothing without human review.
