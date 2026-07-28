# PLT-1770 — [Project Level] Create Custom Permissions

**Type:** Task · **Status (as of 2026-07-28):** Analysis In Progress — BLOCKED awaiting human input
**Domain:** Project Settings Modal → "Team" tab → Custom permissions (greenfield)

## Where we stopped
This ticket was already reviewed in a prior run. A clarification comment (signed "Claude here 👋")
was posted **2026-07-25** raising 4 open questions. No answers have come back since.

### Open questions raised (unanswered)
1. **Designs/behaviour** — the real behaviour lives in Figma + a prototype video that can't be
   opened from this environment. Need the interaction rules inline: what the "modules" are, what
   the "sliders" do (per-authority toggles vs the slide-out side panels we already call "Slider"),
   and what sits in the "permission details" section.
2. **Scope** — is one ticket meant to cover list + empty state + create/edit-with-modules, or should
   it be sliced? (This is a big multi-component build, not a small task.)
3. **Backend** — desc says use the V1 `iam` API and check with Sergey. Need confirmation the iam API
   already supports project-level custom roles/permissions (create/update with grouped authorities).
4. **Commissioning** — Darminder's comment says Jason will "add further details for commissioning
   custom permissions". Is this ticket waiting on those, and does it overlap the flag-gated
   Commissioning feature?

## Findings from code
- Project Settings → Team tab exists, but "Custom permissions" is **greenfield**: no list view,
  no empty state, no "Create new permission" flow anywhere in hc-frontend yet.
- In our codebase "Slider" usually means a slide-out side panel — hence the ambiguity above.

## Decision
Do **not** re-comment (would duplicate the 2026-07-25 clarification / spam the ticket). Leave in
Analysis In Progress. Re-evaluate next run once a human has answered.
