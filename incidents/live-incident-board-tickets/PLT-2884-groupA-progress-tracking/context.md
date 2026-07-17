# PLT-2884 — "EQX-AT10 New dashboard error" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2884
- **Issue type:** Live Incident ("To track live incidents on site.")
- **Status:** **With Customer** (category: In Progress / yellow) — parked, ball with the client.
- **Priority:** **Critical**
- **Project (site):** EQX-AT10 (Equinix "AT10x" data-centre project), project ID `6808f6afae311c4f8409624f`
- **Software Area (report form):** Dashboard · **Device still usable?:** "Not Usable"
- **Reporter:** Yash Patel (support/coordinator per roster — logged on the customer's behalf)
- **Assignee:** Yash Patel
- **Created / Updated:** 2026-07-09 18:55 / 2026-07-14 13:18 (+0100). Last *comment* was 13 Jul 10:56; the 14 Jul touch is a field/status change with **no comment** (likely the flip to "With Customer").
- **Components / Labels:** none
- **Freshdesk:** #7384
- **Domain slug:** `progress-tracking` (overlaps `data-pipeline` — see note at end)

---

## One-line symptom

On the **new (native) dashboard** for **EQX-AT10x**, the project **Actual %** is **lower** than the **old (PowerBI) dashboard** — **23.85% vs 27.37%, variance 3.52%** — because some activities that carry progress in the old dashboard **do not show progress in the new one** (their progress appears to be **missing from the new dashboard's source data**).

---

## Description (verbatim, trimmed of empty form fields)

> Software Area: Dashboard … Is The Device Still Usable?: Not Usable, Project: EQX-AT10 ID: 6808f6afae311c4f8409624f
> Description: Hi Tech Team, I'm having some issues with the new dashboard for the AT10x project (ID: 6808f6afae311c4f8409624f). The progress shown on the new dashboard doesn't match that shown on the old one:
> Old DB Actual: 27.37% / New DB Actual: 23.85% / Variance: 3.52%
> I exported the data and found that some activities on the old dashboard have progress, but the new dashboard doesn't show it (e.g. **Install Temp Power.png – Act: EL1031000**).
> **Some of these activities also have the same numbers as in the old dashboard when I check the web viewer Editor-Progress.**
> We checked with **Hussein in Power BI** and found that **some activities were missing from the source data.**
> Could you please help me resolve this issue?

Key diagnostic buried in the customer's own report: the disputed activities show the **correct** progress in the **web viewer Editor-Progress**, but **not** in the new dashboard. Editor-Progress and the dashboard PRG read from **different data paths** (see Mechanism) — that split *is* the diagnosis.

---

## Comments (chronological)

1. **2026-07-09 18:58 — Yash → Ilia:** "user reported differences between data in new and old dashboard. old one shows latest data whereas new one doesn't. Full details in description above." + 3 inline screenshots (blob URLs, unreadable here). "**Have asked for XER file also.**"
2. **2026-07-09 19:01 — Yash:** Freshdesk #7384 → *Waiting on 3rd line*.
3. **2026-07-10 09:25 — Yash:** "XER file -" — attaches `EQIX_AT10x-A11x_Rev_02_updated20260427.xer` (4.3 MB).
4. **2026-07-10 10:46 — Yash:** Freshdesk #7384 → *Waiting on customer* (posted twice).
5. **2026-07-10 10:47 — Yash → Ilia:** "**Please wait for now as Mostafa has identified the issue. It was with the XER file. We have recommended user to rectify that and come back to us if the issue still persists.** Will let you know the update."
6. **2026-07-13 10:50 — Ilia → Mostafa, Yash:** "Do you know if the customer had a chance to re-upload the schedule?"
7. **2026-07-13 10:56 — Yash → Ilia:** "have asked customer to reupload after rectify it on their end. **still waiting for them to get back with outcome.**"

**Thread state:** root cause was diagnosed by **Mostafa Kamel Hussien** as *"the XER file"* (the P6 schedule the platform ingests). The customer was told to **fix their XER and re-upload**. Since ~10 Jul the ticket has been waiting on the customer; Ilia's 13 Jul nudge confirmed no reply yet. As of triage (2026-07-17) there is still no re-upload outcome on-thread → **7 days parked**.

---

## Attachments

### Jira-native (behind Atlassian auth — ⚠️ NOT readable by the agent)
- ⚠️ **`2026.07.09_EQX-AT10x_Dashboard-error.xlsx`** (3.1 MB) — the customer's **exported old-vs-new comparison**. This is the decisive evidence: it should list every activity where old shows progress and new shows 0 (the 3.52% gap, itemised). A human should open it to confirm the pattern and quantify the cohort.
- ⚠️ **`2026.07.09_Install Temp Power.png`** — the cited example, Act **EL1031000**.
- ⚠️ **`2026.07.09_Line Side Feeders.png`**, ⚠️ **`2026.07.09_MUW Tank Northside Installation.png`** — two more affected-activity screenshots.
- ⚠️ **`EQIX_AT10x-A11x_Rev_02_updated20260427.xer`** (4.3 MB) — **the schedule XER Yash pulled**. Filename encodes **"Rev_02", "updated 2026-04-27"**. If this April-27 revision is what the platform ingested while the customer's PowerBI was fed by a **later** revision, that alone explains "activities missing from source data." A human should diff this XER's activity set against the PowerBI source.
- ⚠️ Three inline comment screenshots (blob: staging URLs) — not resolvable here; presumed dup of the above PNGs.

### Freshdesk (auth-gated — ⚠️ confirmed inaccessible)
- The four `support.xyzreality.com/helpdesk/attachments/…` links (the 3 PNGs + the xlsx) redirect to **Freshworks OAuth login** (302 → `xyzreality.myfreshworks.com/oauth/authorize`). WebFetch cannot pass auth. **Human follow-up required** to view.

---

## Mechanism — why an activity can show in Editor-Progress but not the dashboard PRG

The customer's key clue (correct in Editor-Progress, missing/zero in the new dashboard) points straight at the two independent data paths:

- **Editor-Progress (web viewer)** reads **installation status per element directly** (the element-status / `InstallationStatusServiceV2` path) — it reflects what a surveyor/editor marked on the model, independent of the schedule.
- **Dashboard PRG Actual %** is **schedule-derived**. It is computed from **parquets generated from the uploaded XER schedule** — `project_progress` / `category_groups` — where progress is rolled up per **activity** and weighted (labour hours or element count). See `dashboard/progress-tab.md:16-55` (data flow + calculation modes + weighting) and `dashboard/data-pipeline.md:9-27` (Pipeline A V2 Progress Outputs parquets).

Consequence: if an activity (e.g. **EL1031000 "Install Temp Power"**) is **absent from, or not correctly progressed/linked in, the ingested XER**, its work **never enters** `project_progress`/`category_groups`, so the dashboard **omits its progress** — **even though the underlying element's install status still shows in the Editor**. That is exactly the reported split, and it makes the dashboard **lower** than PowerBI (23.85% < 27.37%). This is consistent with Mostafa's "it was with the XER file" and the customer's "activities missing from the source data."

**Nature of the defect:** this is a **source-data / schedule-content problem** (the XER the platform holds is missing or under-progressing activities), **not** an FE calculation bug. The platform is faithfully reflecting a deficient input ("garbage in"). The fix is on the **customer/schedule** side: correct the XER and re-upload, which regenerates the progress parquets.

**Not yet nailed down (the specific XER defect):** "it was with the XER file" is a *category* of cause, not the precise defect. Candidates, all fitting the evidence:
- (a) **Stale revision** — platform ingested Rev_02 (updated 27 Apr); PowerBI fed by a newer revision → activities added/progressed after April missing on the platform.
- (b) **Missing activities** — the affected activity codes (EL1031000 etc.) are simply **not present** in the ingested XER at all.
- (c) **Unlinked / mis-mapped** — the activities exist in the XER but aren't linked to model elements / carry no progress in the exported percent-complete column, so they contribute 0 to the weighted roll-up.
Distinguishing these needs the `.xlsx` diff and/or the `.xer` inspected (both listed above), and Mostafa's own note on what he saw.

---

## Playbook six-question status

1. **Observed / can we see it?** Yes, numerically: EQX-AT10x new-dashboard Actual **23.85%** vs old **27.37%**, gap **3.52%**, with named example **EL1031000**. Itemised cohort lives in the (unreadable) `.xlsx`.
2. **Expected / on whose authority?** The **old PowerBI dashboard** (27.37%), cross-checked by the customer with **Hussein in PowerBI**. Note: PowerBI is the *reference the customer trusts*, not necessarily ground truth — if PowerBI is fed a newer schedule than the platform, "expected" is really "a different input."
3. **Smallest broken-vs-working pair?** Present and powerful: **same activity** correct in **Editor-Progress**, missing in **dashboard PRG** → diff the two data paths (element-status vs schedule-parquet). Second pair: **PowerBI vs new dashboard** for EL1031000.
4. **Mechanism?** Established (above): schedule-derived PRG parquet omits activities absent/under-progressed in the ingested XER; Editor reads element status directly, so it still shows them. Solid at the path level; the **exact XER defect** is unconfirmed.
5. **Why now (trigger)?** New dashboard replacing PowerBI for this project surfaced a **pre-existing schedule-data gap** the customer hadn't noticed while on PowerBI. XER on file is a 27-Apr revision — a **stale-revision trigger** is the leading candidate. Unconfirmed.
6. **Cohort?** The `.xlsx` enumerates the affected activities for EQX-AT10x (3.52% worth). Cross-project cohort unknown — any other project migrated from PowerBI whose platform XER is stale could show the same. Worth a sweep once the specific defect is confirmed.

---

## Doc references (xyz-platform-context)

- `dashboard/progress-tab.md:16-55` — PRG data flow, three calculation modes (project/package/activity), and weighting formula; confirms Actual % is **schedule/parquet-derived**, per-activity, weighted.
- `dashboard/data-pipeline.md:9-27` — Pipeline A (V2 Progress Outputs parquets: `project_progress`, `category_groups`) — the tables that would omit an activity missing from the XER.
- `dashboard/data-pipeline.md:81-107` — delta-sync of editor status changes into DuckDB `element_status`; illustrates that the **editor/element-status path is separate** from the schedule-progress path (why Editor-Progress can disagree with PRG).
- `dashboard/README.md:26-30` — dashboard explicitly "replaces PowerBI reports"; frames the old-vs-new comparison this ticket is about.
- **Skill `dashboard-progress-comparison`** — exists specifically to compare Platform Dashboard (DuckDB/parquet) vs PowerBI when investigating discrepancies. Directly applicable if a human wants to reproduce the 3.52% gap stage-by-stage.
- `incidents/live-incident-playbook.md` — tone/pattern for the drafted reply.

No hc-frontend code path is implicated — the diagnosis is a **source-data (XER) defect**, not an FE stack error, so no specific file:line in `hc-frontend` is load-bearing here (the relevant FE behaviour is the schedule→parquet→PRG roll-up already documented above).

---

## Working root-cause hypothesis

**Root cause (human-diagnosed, corroborated by code/doc mechanism):** the **XER schedule ingested for EQX-AT10x is deficient** — activities that carry progress in the customer's PowerBI source (e.g. EL1031000) are **missing / under-progressed / unlinked** in the platform's copy — so the schedule-derived dashboard PRG parquets omit that work and report a **lower Actual % (23.85% vs 27.37%)**. The Editor-Progress path reads element status directly and is unaffected, which is why the same activities look correct there. Mostafa reached this ("it was with the XER file") and the customer was asked to correct and re-upload the schedule. This is a **data/schedule-content issue, not an FE bug**; the platform is faithfully reflecting a deficient input.

**Confidence (per CLAUDE.md scale): 7/10.** High that the cause is XER/source-data (a human owner diagnosed it, and the Editor-vs-PRG split independently confirms a schedule-path problem). Lower on the **specific** defect (stale Rev_02 vs missing activities vs unlinked) — that needs the `.xlsx` diff / `.xer` inspection and Mostafa's note. Sub-scores: mechanism (path split) 9/10; that it's XER-side rather than FE 8/10; which exact XER defect 4/10.

**Still needed to close properly (playbook Phase 6):**
- (a) the **customer's re-upload outcome** — did correcting the XER close the 3.52% gap? (the parked question);
- (b) **what exactly Mostafa found wrong** with the XER, so the customer's correction is *targeted* (else the re-upload may reproduce the gap);
- (c) whether the platform should **surface** "activities present in the model/editor but absent from the ingested schedule" rather than silently omitting them — a candidate **product/FE follow-up** regardless of this customer's fix;
- (d) cohort: any other PowerBI→platform-migrated project running on a **stale XER**.

---

## Scope note (for the human)

This ticket is **"With Customer"**. Per the board README's established convention, "With Customer" is treated as **in-scope Group A** (in-scope-but-parked, ball with the client) — **not** excluded. It was pulled into this run under that broader convention, **not** under the current run's literal "needs evaluation / in analysis" definition of Group A. Flagging so the human knows this was a judgment call, consistent with how PLT-2879 / PLT-2815 / PLT-2619 were handled in the 2026-07-13 run.
