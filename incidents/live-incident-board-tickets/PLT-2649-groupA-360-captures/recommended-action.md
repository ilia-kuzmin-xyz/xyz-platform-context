# PLT-2649 — recommended action (DRAFT ONLY — execute nothing)

**Re-check date:** 2026-07-28. Supersedes the 2026-07-13 draft below, which recommended escalating a stalled internal question to Pietro — **that question has since been answered and overtaken by events**: Ilia independently drove the analysis to a precise, named root cause (07-16/07-24) and Yash already relayed a specific fix request to the client on 2026-07-24 (comment 108107 → 108112). The ticket's own status already reflects this correctly (**With Customer**, Freshdesk "Waiting on customer").

## Chosen action: (c) — confirm "With Technical Support"-equivalent state is already correct; no status change; one light internal-only nudge

Jira's "With Customer" status **already is the correct state** — do not move it. The one open thing is a light internal comment to close out a dangling side-thread so it doesn't quietly stall a ticket that is otherwise on track to resolve itself once the client acts.

## Why this and not the others

- **Not (a) another clarifying question to Pietro/customer.** Nothing to clarify — Ilia's 07-24 comment already gives the client's project delivery team everything they need (exact model, exact level, exact elevation delta, exact fix, explicit "no capture re-upload needed"). Asking anything further now would just be noise while we wait.
- **Not (b) Ready For Development.** Still true, more so than before: the fix is **entirely on the client's Revit model** (linked-file level elevation), not in `hc-frontend` code. There is nothing for a dev to pick up unless the client-side fix, once applied, turns out not to fully resolve it on re-import.
- **Not (d) Blocked.** No "Blocked" status exists in this project's workflow (checked via `getTransitionsForJiraIssue` — only Done/Archived/Ready For Release/Ready For QA/Open/Customer Release Check/Dev In Progress/With Customer/With Technical Support/In Analysis/Won't Do/Complete Work Item are available), and "With Customer" already captures the "waiting on an external party" state accurately. Moving it anywhere would be a step sideways, not forward.
- **(c) as "stay put, tidy the loose end" rather than a customer-facing ask:** the substantive customer ask already went out 4 days ago (2026-07-24) — too soon to chase. The only actionable item left for us is internal: Pietro/Jason/Mostafa's 07-13 in-editor-pin-adjustment side-thread (comments 107234, 107238) never got closed out and risks being forgotten once this ticket resolves via the model fix (which needs no such editor feature). It should either be explicitly shelved or spun into its own ticket — not left buried in a live-incident thread that's about to close.

## Draft — internal comment (owner: Ilia Kuzmin to post; audience: Pietro, Jason, Mostafa)

Playbook style: short, concrete, no padding.

> @Pietro Desiato @Jason Fingland @Mostafa Kamel Hussien — quick close-out on the side-thread: the actual PLT-2649 fix (level `f0f4d409` elevation correction + model re-upload) doesn't need any per-pin manual editing — captures inherit the corrected elevation automatically on re-import. So the in-editor pin-adjustment idea from 07-13 isn't required to close this ticket.
>
> Still sounds like a reasonable standalone feature for future cases where captures genuinely need individual repositioning (Jason's "wrong-level" detection idea in particular). Want me to raise it as its own ticket, or shelve for now?

## Follow-through the human should own (not executed here)

- **No status change** — leave as "With Customer."
- **Set a follow-up checkpoint**: if no client reply by roughly **2026-08-07** (2 weeks from the 07-24 ask), have Yash chase Freshdesk #6622.
- Once the client confirms the level fix + re-upload, verify PA12 360 pins render correctly on both dashboards, then close.
- Reassign off **Masum Ahmed** (support, off-roster) once there's an active owner for the closing verification step — flagged in both the 07-13 and this check, still not done.
- Post-close: add a `dashboard/pitfalls.md` entry — "360/Quality pin Z comes straight from source coordinates; a single mis-set Revit level (esp. inside a linked file within a federated model) can float an entire floor's rooms/pins by its elevation delta with no code-side fix." Also correct `360-tab.md:47-53` (pins use the capture's own coords, not a room-elevation lookup) — still outstanding from the prior check.
- Independently confirm the non-deterministic `FIRST(zMeters)` per room in `dashboard-360-service.ts:541-543` (no `ORDER BY` in the `GROUP BY`) is still worth a defensive fix even after this data issue closes — it remains a latent flakiness risk for any future room with mixed-quality captures.
