# PLT-2945 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) confirm Rishi's mechanism in-thread, with one correction, then (b) a customer-facing reply once he confirms the data premise

Nothing below has been posted, sent, or transitioned. All of it is draft text for a human to review,
edit and send.

### 1. Reply to Rishi in the PLT-2945 thread — to Rishi, cc Mostafa Hussien

> Confirmed — claim #1 is correct and this is intended behaviour. Thanks for finding the right
> Confluence section.
>
> The mechanism, for the record: `dashboard-progress-service.ts:1909-1924` computes a per-element
> `displayDate` (`startDate`, or `LEAST(checkDate, startDate)` if installed) and includes the element
> only when `displayDate <= dateRangeEnd`. `dateRangeEnd` is the raw slider end — deliberately not the
> capped `refDate` — precisely so dragging the slider into the future reveals future-planned elements
> (comment at `:1920-1923`). Default slider end is `min(schedule end, today)`, so a 14/08/26 planned
> start is out of range today. The Editor has no equivalent gate — `setVisibility()` appears nowhere
> on the ViewerPage path, and `installation-status-utils.ts:94-96` colours anything schedule-linked as
> Planned regardless of how far out it is. So: same element, Editor yellow and visible, Dashboard
> hidden. Working as designed.
>
> One refinement before it goes to the customer: it isn't that the element is *uncoloured* — the
> geometry is actually **hidden** (`dashboard-color-service.ts:488` sets fragment visibility false for
> everything outside the filtered set). Their word "missing" is accurate; let's not imply they
> misread a colour, their screenshot would contradict us.
>
> Useful detail for the reply: there's a **"Next 2 weeks"** preset on the date control
> (`date-range.tsx:364-379`) which sets the end date to today + 14 days = exactly 14/08/26 today. One
> click reproduces it. If they also want to keep historical elements in view, tell them to drag the
> end handle rather than use the preset — the preset moves the start date too, and there's a second
> condition `endDate >= dateRangeStart` (`:1918`).
>
> **Separate from the above, and not confirmed:** claim #2 (Basic Roof vs Floor). I can't verify it
> from the code, and as phrased it doesn't quite hold together — if the Dashboard is displaying a
> Basic Roof then it *is* in the Dashboard's loaded model. Two readings both fit the code: either it's
> a downstream effect of claim #1 (the Floor's fragments are hidden, so the click falls through to
> whatever's visible behind it), or you meant it isn't in the **Editor's** loaded model — which the
> code does support, since the Dashboard loads exactly one federated model with geometry restricted to
> `element_base_data` dbIds while the Editor loads whatever the user has activated. Which did you
> mean? I'd suggest leaving claim #2 out of the customer reply entirely — claim #1 explains their
> report on its own, and claim #2 only invites a follow-up we can't currently answer.
>
> Last thing before we close: can you confirm where the 14/08/26 planned start came from? It's the
> one fact I couldn't check myself. A `project_element_list` lookup on `sourceFileElementId` for
> `…-002fa48f` and `…-0016a043` → `modelElementId` → `element_base_data.startDate` settles it in a
> minute. Note those two IDs are Revit external IDs, not `modelElementId` UUIDs — querying
> `element_base_data` with them directly returns nothing, which would look like a false confirmation
> of "missing".

### 2. Once Rishi confirms the planned dates — to Yash, for relay to the customer

> Thanks for the detail and the screenshots — this is expected behaviour rather than a fault, and the
> elements aren't lost.
>
> The Dashboard and the Web Viewer answer different questions. The Web Viewer shows everything in the
> model, including work planned for the future. The Dashboard's 3D view is tied to the date range at
> the top of the page: it shows the project as at the end date you've selected, so an element only
> appears once its planned start date has been reached. That's what lets you drag the date back and
> forth and watch the build progress.
>
> Both elements you flagged (Floor [3122319] and Floor [1482819]) have a planned start of
> **14/08/2026**, which is why they're not shown with the default date range ending today. Set the end
> date to 14/08/2026 — or click the **"Next 2 weeks"** button next to the date fields — and both will
> appear, coloured yellow for "Planned".
>
> If you'd rather keep everything currently in progress visible at the same time, drag the right-hand
> (end) handle of the date slider forward instead of using the preset, which leaves the start date
> where it is.
>
> Happy to walk through it on a call if that's easier.

### 3. Ticket status

- **PLT-2945 → Done/Closed as "working as intended"** once Rishi confirms the planned dates and Yash
  relays the explanation. No dev work required, no code change proposed.
- **Freshdesk #7556** — resolve after the customer acknowledges. Don't treat the current "Waiting on
  customer" status as evidence the explanation was already sent — confirm with Yash which it was.
- Close per playbook Phase 6: **cause** = intended `displayDate` visibility gate; **trigger** = n/a,
  not a regression (mechanism pre-dates the visible git history, exact vintage unknown — shallow
  checkout); **cohort** = every project with future-dated activities, i.e. universal by design, which
  is why the fix is documentation/UI affordance rather than code.

### 4. Follow-ups — separate tickets, neither blocking

- **UX (recommended):** the Dashboard hides elements silently — surface a count/hint when the slider
  excludes elements ("N elements hidden — planned after 31/07/2026"). This ticket class is generated
  by the silence, not by a defect.
- **Docs — needs a human to resolve, not fixed this run:** confirm which selection-mode path the live
  `/projects/:id/dashboard` route actually uses (`use-model-loader.tsx:28-52`, no selection-mode call,
  vs. `viewer-service.ts:167`, still gates `SelectionType.DISABLED` behind `_isDashboard` via the
  shared `viewer-y.tsx`) — then correct `viewer-and-model.md:10` if it's stale. Left open rather than
  edited on unconfirmed evidence.
- **Patterns (recommended, done this run):** added *"Surface-scoped visibility rule mistaken for
  missing data"* to `recurring-defect-patterns.md` candidate patterns, citing PLT-2945 and the
  project-level sibling in `dashboard-progress-tab-explained.md` §8.4.
- **Optional, cheap:** rule out the tooltip mislabel candidate (§ claim #2, mechanism 3) by checking
  whether any `objectId` in `element_base_data` maps to >1 `modelElementId` on DUB7x.
