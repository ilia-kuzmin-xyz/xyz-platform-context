# PLT-2906 — "Section box misaligned form model" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2906
- **Issue type:** Live Incident ("To track live incidents on site.") · Software Area: **Dashboard**
- **Status:** **Open** (category To Do / blue-gray). Confirmed via MCP — the brief's "Open" is correct (contrast PLT-2882, which was already In Analysis). Freshdesk #7424, last flip "Open" (2026-07-15 20:59 BST) after bouncing Waiting-on-customer ↔ Open several times — i.e. ball is back on us.
- **Priority:** Major
- **Project (site):** FAR01 (customer also reports FAR02 **and "some other projects"** — see Cohort)
- **Reporter:** Yash Patel (coordinator/support) · **Assignee:** Darminder Atker (fullstack lead)
- **Created:** 2026-07-15 · **Last updated:** 2026-07-15
- **Components / Labels:** none
- **Attachments:** 1 × `section_box.png` (149 KB, Jira attachment id **60808**; Freshdesk mirror `support.xyzreality.com/helpdesk/attachments/103332441902`) — **unreadable here, see NEEDS HUMAN**
- **Domain slug chosen:** `viewer-and-model` (justified below)

---

## One-line symptom

In the **web viewer**, turning the **Section Box** on no longer renders the familiar draggable **rectangular box**; the customer describes it as a "new style" that "doesn't display the rectangular box, which makes it difficult to adjust and section the model," and asks to "change the Section Box back to how it was before." The operative complaint is a **change in the section box's appearance / interaction model** — not (as the ticket title's "misaligned" suggests) the box being at the wrong *angle*.

⚠️ **The title is misleading.** "Section box misaligned form [sic] model" reads like the three historical *alignment/rotation* tickets (2651/2756/2771). The **body text is a different symptom**: the rectangular box + its drag handles are gone / restyled. Alignment (angle) vs rendering (does the box appear at all, and in what style) are two different mechanisms. This distinction drives the whole diagnosis and the historical-recurrence verdict.

---

## Playbook questions applied

**1. What exactly is observed — can we observe it ourselves?** Reported: section box "doesn't display the rectangular box," "new style," hard to adjust/section. We have **not** yet reproduced it in our own hands — and this is the single most important gap, because the fix hinges on *which* surface and *which* build. The good news (see Mechanism/Trigger): the section-box-owning viewer is **version-pinned**, so we can open **any** project in the current production build ourselves and immediately see whether the box renders as a rectangle. This is a fully in-our-hands repro (the Pietro move) and should be step one. The `section_box.png` screenshot would confirm the exact "new style," but is unreadable here (NEEDS HUMAN).

**2. Expected behaviour, on whose authority?** Expected = "how it was before" — the classic Forge `Autodesk.Section` **box** gizmo (a rectangular cage with six face-drag handles). The reference here is the customer's own memory of the prior UI, corroborated by the fact that our code still explicitly requests box mode (`activate('box')`, `section-tool-service.ts:253`). This is a **dated-regression claim** ("it worked before ~14 Jul") — and unusually, the customer supplied the date (see Trigger). Per the playbook this is a claim to verify with evidence, but it is far more precise than the July-case folklore.

**3. Smallest broken-vs-working pair.** Not yet built, but the shape is clear: **same project/model, before vs after ~2026-07-14 13:00 UTC.** Because the customer says it affects **all** models across **multiple** projects with **no model change**, the differing variable is almost certainly **not** the data/model — it is **what shipped to (or changed under) production in that window.** The diff to run is therefore a *build/deploy/version* diff, not a data diff (the opposite of PLT-2882).

**4. Mechanism — what decides the section box's style?** **100% Forge.** See next section: there is **no custom section-box gizmo** in hc-frontend. The rectangular box, its handles, and its styling are entirely owned by the stock `Autodesk.Section` extension loaded from Autodesk's CDN. The only app-side code that touches the box is (a) orientation math that sets the box's *angle/size* (not its look), and (b) a monkey-patch of the extension's internal `setSectionFromState` (button/mode state only). So the only thing that can change the box's *appearance* is a **change in the effective Forge viewer version/behaviour**.

**5. Why now? (trigger) — the highest-value clue.** Customer pins it to **July 14 2026, ~08:00 Central Time**. July is CDT (UTC−5), so **≈13:00 UTC = 14:00 BST (London/dev team local)**. Combined with: (a) all models, (b) multiple projects, (c) **no model update**, this is the textbook signature of a **shared dependency / deploy / environment change**, not a data or per-model cause. **Code-history correlation performed (git, hc-frontend):**
  - The **only two** hc-frontend commits dated 2026-07-14 landed at **15:39 UTC** (`31ef345` PLT-2892) and **16:05 UTC** (`3150c85` PLT-2847) — **after** the customer's 13:00 UTC observation, and neither touches the section tool.
  - `1966715` "PAPI-3226: update libs versions" (the tempting "dependency bump") touches **only `build.gradle` / `gradle.properties`** (backend Gradle/Java libs) and landed **2026-07-15 13:16 BST** — wrong layer, wrong day. **Not it.**
  - The section-tool source last changed **2026-06-16** (and even that is the shallow clone's boundary commit; see caveat).
  - **Net: no hc-frontend source commit correlates with the 13:00 UTC July 14 trigger.** That *absence* is itself the finding — it points away from a tracked code change and toward a **Forge viewer-version / deploy / CDN** change (see Trigger correlation below).

**6. Who else? (cohort) — alarming and playbook-relevant.** The customer already reports **FAR01 + FAR02 + "some other projects."** If the cause is a Forge-version change (per mechanism), the cohort is **every project on the affected build/CDN** — i.e. potentially **all** customers using the section box, simultaneously. This is not a single-site incident; it should be triaged as **cross-project / fleet-wide** until proven otherwise. That elevates urgency beyond the Major label.

---

## Mechanism (code-verified) — the section box's look is entirely Forge-owned

All paths in `hc-frontend/src/main/webapp/app/pages/organisation/ViewerPage/components/`.

1. **Stock extension, no custom gizmo.** The tool is Forge's `'Autodesk.Section'` extension (`section-tool-service.ts:37`), loaded via `viewer.loadExtension('Autodesk.Section')` (`:179`). Box vs plane use the extension's own `activate('box')` / `activate('x')` and `setSectionBox()` (`:253-254`, `:269`, `:362-365`). Cut planes go through the Forge viewer API: `viewer.getCutPlanes()` (`:103`), `viewer.impl.setCutPlaneSet('__set_view', …)` (`:358`), `viewer.getState().cutplanes` (`:130-131`). **The rectangular cage, its face handles, and its visual style are drawn by Forge, not by us.** The only bespoke box-drawing in the repo is `drawCustomBoundingBox` (a green `0x00ff00` `LineSegments` debug overlay, `section-box-helper-functions.ts:180-230`) used solely by `getElementsInsideSectionBox(..., visualize=true)` — **not** the user-facing tool.

2. **We ride unsupported Forge internals.** `_applySectionExtensionOverrides()` (`section-tool-service.ts:274-288`) rewrites the extension instance's `setSectionFromState` and reaches into `this.buttons`, `this.mode`, `this.activeStatus`, `this.enableSectionTool`, `this.viewer` — all **internal** SectionTool members. The orientation service additionally **mutates Forge-internal `refPointTransform` and unloads/reloads the extension** (`section-tool-orientation/section-tool-orientation.ts:114-128`; design doc `section-tool-orientation.md:36-42, 65-71`). The doc explicitly labels this **"unsupported but cheap."** **Implication:** if the loaded Forge version restructured the `Autodesk.Section` internals or changed the box-mode default UI, both the appearance *and* these overrides can break — which is exactly consistent with "new style, no rectangular box."

3. **Orientation math sets the box's *angle/size*, not its look.** `SectionToolOrientation` computes the building footprint's minimum-area rectangle (rotating calipers, `section-tool-orientation-math.ts`) and patches the box to be oriented (OBB) vs axis-aligned (AABB) — `section-tool-orientation.ts:73-128`. This is the machinery behind the **historical** alignment tickets; it changes *where/how tilted* the box is, never *whether a rectangular box is drawn*. So it is **not** the mechanism for PLT-2906's "no rectangular box" complaint. (It is unchanged since the June-16 boundary commit.)

---

## Trigger correlation — the decisive, still-unconfirmed question

**How the section-box viewer loads Forge (code-verified):**
- Main **ViewerPage + Dashboard** viewer (the one that owns the section box) is **PINNED**: CSS + JS loaded from `https://developer.api.autodesk.com/modelderivative/v2/viewers/**7.117.0**/…` — `ViewerPage/hooks/init-autodesk.tsx:9-15`, injected app-wide from `app.tsx:133`. A floating CDN alias **cannot** swap this under us — **only a code edit to that version string can.**
- The **CanvasPage** AI-sandbox viewer is **FLOATING** `7.*` — `CanvasPage/components/ForgeViewerStatic.ts:30,34` — but that is a **different surface** (the Sandpack AI canvas), not the Dashboard/ViewerPage section box the ticket describes.
- `package.json:225` has only `@types/forge-viewer: ^7.89.0` — **types only**, no runtime effect. There is **no runtime Forge npm package**; the viewer always comes from the CDN.

**What this means for "why now":** the box style is Forge-owned, and the owning viewer is pinned to `7.117.0`. A style regression that hit every project at ~13:00 UTC July 14 with no model change is therefore most plausibly explained by **the effective Forge viewer version changing in production in that window.** Two candidate paths, in likelihood order:

1. **⭐ Leading (unconfirmed): a deploy ~2026-07-14 13:00 UTC bumped the `7.117.0` pin** (i.e. `7.117.0` may itself be the *new* version whose `Autodesk.Section` ships the "new style," or it was bumped to/from another 7.x). The working tree reads `7.117.0` now, but **this shallow clone (50 commits, boundary `bbdc75f` 2026-06-16) cannot tell us when that string last changed** — blame attributes it to the boundary commit, which is a clone artefact, not evidence. So we **cannot** confirm or refute a recent bump from the repo alone. **A human must diff the deployed `init-autodesk.tsx` version string across the July-14 release and correlate the deploy time.** This single check confirms or kills the hypothesis.
2. **Secondary: CDN/cache effect at the pinned version** — a Forge CDN edge change or client cache expiry causing clients to newly fetch a bundle that behaves differently. Lower likelihood (versioned Forge URLs are normally immutable), but it would explain simultaneity with *no* deploy. Worth a one-line check against Autodesk's release notes for 7.117.0 / any 7.x advisory around July 14.
3. **Unlikely for this ticket: the floating `7.*` Canvas viewer** — only relevant if the affected surface is actually the AI Canvas, which the "Dashboard" software-area and "all models" framing argue against. Rule out by confirming the surface (NEEDS HUMAN / screenshot).

**Bottom line:** the mechanism *area* is nailed (Forge-owned gizmo ⇒ only a viewer-version/behaviour change alters the box style), and the trigger *shape* fits a deploy/version change at 13:00 UTC July 14; the **specific** change is unconfirmed because deploy history and the pre-July-14 pin value are not visible in this clone.

---

## Connection to the three historical "section box" tickets

All three are **Done** and all are the **alignment/angle** class — a *different mechanism* from PLT-2906:

| Ticket | Date | Symptom | Resolution |
|---|---|---|---|
| **PLT-2651** "Section box misaligned with BIM models" (ATL08) | May 2026 | Box **rotated wrong** (true-north 0; box not aligned to diagonal building) | Ali confirmed DPL "doesn't touch section-box"; FE built the **`SectionToolOrientation` workaround** (refPointTransform mutation + extension reload); verified CNR on **Staging 26.2.3**. Note: user re-reported "still not fully aligned" on 3 Jun → led into 2756. |
| **PLT-2756** "Scope Box Alignment Issue Switch ATL5–7" | Jun 2026 | After **release 26.2.3**, boxes "slightly rotated/diagonal" | The orientation patch **mis-fired** on world-aligned ATL07 (tilted it ~3°). Fixed by replacing the angle+anisotropy heuristic with the single **`tightness < 0.9`** ratio (documented `section-tool-orientation.md:64,88`). |
| **PLT-2771** "Section box misaligned again" (ATL08-xv2) | Jun 2026 | "aligned with **true north instead of project north**"; worked a week or two then regressed | Assignee could not reproduce ("not seeing this issue my side"); closed via Freshdesk without a stated code cause. |

**Recurrence verdict: this is NOT the same bug recurring; it is a *different symptom class* in the *same fragile feature area.***
- The historical trio are about the box's **angle** (orientation math / `refPointTransform`). PLT-2906 is about the box's **rendering/style** ("no rectangular box"). Different mechanism.
- BUT they share a **common root fragility**: the entire section tool is built on **unsupported `Autodesk.Section` internals** riding an **externally-controlled Forge viewer version.** That is precisely the substrate that a Forge-version change would disturb. So PLT-2906 is best read as **(b) a genuinely new regression in the same feature area**, and evidence that this team has a **recurring bug *class*** ("the section tool keeps breaking because it depends on Forge internals we don't control"), even though it is not a re-break of the specific 2651/2756 fix.
- ⚠️ **Watch item:** a Forge-version change could *also* break the `SectionToolOrientation` monkey-patch/extension-reload path — so once the version question is settled, re-verify the alignment fix (2651/2756) still holds on the new version, or the angle bugs will resurface too.

---

## Bug vs feature-gap

**BUG (regression), not a feature request.** The customer explicitly wants the tool restored to prior behaviour ("change it back to how it was before"), the feature demonstrably existed, and the trigger is dated and cross-project. This is not a "please add" ask.

---

## Domain slug — why `viewer-and-model`

The failing surface is the **3D viewer's Section Tool** (`ViewerPage/components/section-tool/**`), and the knowledge home is `dashboard/viewer-and-model.md` (VWR — 3D Viewer and Model), which documents the Forge/AggregatedView viewer, `applyRefPoint`/`refPointTransform`, and notes *"The section tool reads this transform to orient cutting planes in world coordinates."* No filter/quality/360/progress/pipeline/permissions domain is involved. `viewer-and-model` is the unambiguous fit (unlike PLT-2882, where the linking feature blurred viewer vs progress).

---

## Confidence (per xyz-platform-context CLAUDE.md scale)

- **The section box's appearance is 100% Forge `Autodesk.Section` (no custom gizmo), so only a Forge viewer-version/behaviour change can alter its style:** **8/10** — read directly from source with file:line.
- **This is a different symptom class from the historical alignment tickets (not a re-break of the 2651/2756 fix):** **8/10** — symptom text + mechanism separation are clear.
- **The trigger is a Forge viewer-version / deploy / CDN change reaching prod ~2026-07-14 13:00 UTC (leading hypothesis):** **5/10** — the *shape* fits perfectly (Forge-owned style, all-models/multi-project, no model change, precise simultaneous timestamp, and no correlating code commit), but the *specific* change is **unconfirmed**: the shallow clone can't reveal deploy history or the pre-July-14 pin value, and we have not yet reproduced it ourselves.
- **That the affected surface is the main ViewerPage/Dashboard viewer (pinned 7.117.0), not the Canvas floating `7.*`:** **6/10** — inferred from "Dashboard" software-area + "all models"; not confirmed against the screenshot.

**Overall triage confidence: ~6/10.** Direction is strong and the mechanism area is certain; the exact trigger needs one deploy-timeline/version-diff check plus a self-repro — both fully in our hands.

---

## NEEDS HUMAN (unreadable media / data / deploy access)

- ⚠️ **`section_box.png`** (Jira attachment id **60808**, 149 KB; Freshdesk `.../attachments/103332441902`) — the screenshot of the "new style" box. Not viewable here (binary behind Atlassian/Freshdesk auth). **Do not guess its contents.** It is the fastest way to confirm exactly what the "new style" looks like (e.g. plane-only, no handles, different colour) and which surface it is.
- ⚠️ **Deploy timeline + Forge pin diff** (needs release/deploy access): *What did the production release around 2026-07-14 13:00 UTC change, and what was the `init-autodesk.tsx` Forge viewer version string (`7.117.0`?) **before** July 14?* This is the decisive check — the shallow clone cannot answer it.
- ⚠️ **Self-repro on the current build** (needs a dev/prod session on any project): activate the Section Box and confirm whether the rectangular box + handles render. If broken for us too, it is the deployed build, and we diff Forge versions; if fine for us, chase client-side (browser/cache/version served).
- ⚠️ **Autodesk release notes** for viewer `7.117.0` / any 7.x change around 2026-07-14 (Section extension UI changes).
- ⚠️ **Surface confirmation:** is this the main Dashboard/ViewerPage viewer (pinned `7.117.0`) or the Canvas AI viewer (floating `7.*`)? The screenshot / a session ID would settle it.
- ⚠️ **Trigger timezone:** customer said "8:00 AM Central Time" July 14. Assumed **CDT (UTC−5) ⇒ 13:00 UTC / 14:00 BST**. Confirm the customer's actual timezone (CST vs CDT vs a different "Central") before pinning the deploy window.

---

## Roster / ownership notes

- **Darminder Atker** (assignee, fullstack lead) — correct owner for the FE section-tool + the deploy/version question.
- **Ilia Kuzmin** (operator, ilia.kuzmin@xyzreality.com) — "mechanism interrogator"; Yash has pinged him and he asked for a model file. NB: a **model file is unlikely to be decisive** here — the customer says all models across projects are affected with no model change, so the cause is almost certainly build/version, not per-model geometry. Getting the model is cheap insurance but should not gate the deploy/version check.
- **Rishi Bhugobaun** — authored/owned the `SectionToolOrientation` workaround across 2651/2756; the right reviewer for "did the new Forge version break the alignment patch too."
- **Yash Patel** (reporter/coordinator) — client channel (Freshdesk #7424).

## Doc / knowledge-base refs
- `xyz-platform-context/dashboard/viewer-and-model.md` — VWR; `applyRefPoint`/`refPointTransform`, "section tool reads this transform to orient cutting planes."
- `hc-frontend/.../section-tool/section-tool-orientation/section-tool-orientation.md` — the definitive mechanism doc for the (historical) alignment class; "unsupported but cheap" Forge-internals dependency.
- `xyz-platform-context/incidents/live-incident-playbook.md` — six-question frame + tone; esp. #5 "why now" (assign an owner) and #6 cohort sweep.
