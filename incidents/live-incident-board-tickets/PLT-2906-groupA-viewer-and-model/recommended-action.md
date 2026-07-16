# PLT-2906 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) — internal status/triage note that (1) reframes the symptom, (2) states the code-verified mechanism, (3) names the ONE decisive "what changed?" check with an owner, and (4) elevates urgency to cross-project

This is **Major, cross-project (FAR01 + FAR02 + "some others"), with a precise dated trigger** — the playbook's "why now" answered unusually well by the customer. The single highest-leverage next move is **not** waiting on a model file; it is (i) reproducing the box in our **own** build (fully in our hands — the viewer is version-pinned) and (ii) pulling the **deploy/Forge-version timeline** for ~2026-07-14 13:00 UTC. Both settle the leading hypothesis fast.

## Why this and not the others

- **Not (b) Ready For Development — yet.** We have not confirmed *what* changed. The box style is 100 % Forge-owned (`context.md` § Mechanism), so the fix is most likely "revert/adjust the Forge viewer version pin," not new FE feature code — but routing to Dev before the version/deploy diff is run risks fixing the wrong layer. One repro + one deploy check flips this to (b) with a precise scope (pin a known-good Forge version, and re-verify the alignment patch still holds on it).
- **Not (c) With Customer / needs client input.** We do **not** need the client to progress: the tool is version-pinned, so we can reproduce and diff versions ourselves. Going back to the client now would re-loop the ticket. (The `section_box.png` and a session ID are *nice-to-have* confirmations, not blockers.)
- **Not (d) Blocked.** Nothing external blocks us — the repro and the deploy/version diff are in our own hands.
- **Model file is a red herring for the primary path.** Yash offered a model and Ilia asked for one — but the customer says the issue spans **all** models across **projects** with **no model change**. A per-model geometry file cannot explain a simultaneous cross-project style change; the cause is build/version. Collect the model as cheap insurance, but do not gate on it.

## Draft — internal note (author: Ilia Kuzmin; @ Darminder Atker, cc Rishi Bhugobaun, Yash Patel)

Playbook style: reframe → mechanism → one owned closed check → scoping. One question, one owner.

> **@Darminder Atker** — PLT-2906 (Section Box, FAR01/FAR02 + others). Reframing before we chase a model file:
>
> **Symptom is rendering, not angle.** Despite the title ("misaligned"), the body says the box "doesn't display the rectangular box" — a **new style**, not a wrong *rotation*. That's a different class from the alignment tickets (2651/2756/2771).
>
> **Mechanism (confirmed in code):** our Section Box has **no custom gizmo** — the rectangular cage, handles and style are 100 % Forge's stock `Autodesk.Section` extension (`section-tool-service.ts:37,179,253`). The only thing that can change the box's *appearance* is a **change in the effective Forge viewer version/behaviour.** The section-box viewer is **pinned** to Forge `7.117.0` (`ViewerPage/hooks/init-autodesk.tsx:9-15`), so this cannot drift from the CDN on its own — only a code/deploy change to that pin can move it.
>
> **Why-now fits a version change, not data:** customer pins it to **14 Jul ~08:00 Central = ~13:00 UTC**, across **all models, multiple projects, no model update**. No hc-frontend source commit correlates — the only two 14-Jul commits landed *after* 13:00 UTC, and the "update libs versions" commit is backend Gradle only. That absence points at Forge/deploy, not our source.
>
> **One check to confirm (owner: you / release):** what did the **prod release around 14 Jul ~13:00 UTC** change, and **what was the `init-autodesk.tsx` Forge version string before that date** (was `7.117.0` a bump)? I'll reproduce in parallel: activate the Section Box on any project in the current build and check whether the rectangular box + handles render.
>
> **Scope/urgency:** this is **cross-project** (FAR01+FAR02+others) — please treat as fleet-wide, not one-site. And once we know the version: **re-verify the alignment patch (`SectionToolOrientation`) still holds on it** — a Forge bump can break our unsupported extension overrides too, which would resurface 2651/2756.
>
> (Model file from the client is fine to keep, but it can't explain an all-projects/no-model-change trigger, so it isn't the blocker.)

## The evidence steps to run (owners noted; both fast, both in our hands)

1. **Self-repro (owner: Ilia; ~10 min, any prod/dev session).** Open any project → activate Section Box (box mode). Observe: does the classic rectangular cage + six face handles appear, or a "new style" (e.g. plane-only / no handles)? If **broken for us** ⇒ it's the deployed build/version (proceed to step 2 to find the bad version). If **fine for us** ⇒ chase client-side (which Forge version their browser fetched; cache).
2. **Deploy/version diff (owner: Darminder / release; decisive).** Diff the deployed `init-autodesk.tsx` Forge version string across the ~14 Jul release; correlate the deploy timestamp to ~13:00 UTC. Check Autodesk release notes for `7.117.0` (and the prior pinned version) for `Autodesk.Section` UI changes. **Expected if hypothesis holds:** the pin changed (or Forge changed the Section UI at the pinned version) at/just before 13:00 UTC 14 Jul.

## Follow-through the human should own (not executed here)

- **If a Forge version change is confirmed as the cause:** decide **pin to the last-good Forge version** (fastest customer-facing fix, "back to how it was") vs. **adapt our code to the new Section extension** (durable but more work, since we ride unsupported internals). Then move to **Ready For Development** with that scope. Prefer re-pinning for the incident, and open a tech-debt follow-up for the internals dependency.
- **Re-verify the alignment patch** (`SectionToolOrientation`, `section-tool-service.ts:274-288` overrides + `section-tool-orientation.ts:114-128` reload) against whatever version we land on — or the 2651/2756 angle bugs will regress silently.
- **Cohort sweep (playbook #6):** because the cause is version/build-wide, confirm the fix across the reported cohort (FAR01, FAR02) *and* a sample of the "other projects," not just the reporting site. Do not wait for the next ticket.
- **Answer "why now" with an owner (playbook #5):** the deploy/version correlation is the "what changed" workstream — assign it (Darminder/release), don't let it drop the way the July-case trigger did.
- **Confirm the trigger timezone** (CDT vs CST) before pinning the deploy window (see NEEDS HUMAN).
- **Read `section_box.png`** (NEEDS HUMAN, attachment 60808): confirms the exact "new style" and the surface (main viewer vs Canvas `7.*`).
- **Rule out the Canvas surface:** confirm the report is the Dashboard/ViewerPage viewer (pinned `7.117.0`), not the Canvas AI-sandbox viewer (floating `7.*`, `ForgeViewerStatic.ts:30,34`) — different loader, different fix.
- **Post-close:** add a `dashboard/pitfalls.md` (or viewer pitfalls) entry: "The Section Box has no custom gizmo — its style/handles are 100 % Forge's `Autodesk.Section`, and we ride unsupported internals; a Forge viewer-version change (pin bump in `init-autodesk.tsx`, or the floating `7.*` in Canvas) can change the box's *appearance* fleet-wide with no model change. Always diff the Forge version on any 'section box looks different' report."
