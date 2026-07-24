# PLT-2649 — recommended action

## Current (2026-07-24): reply to Yash naming the model — SUPERSEDES all below

Yash asked (07-17) which model project delivery must fix. Answer established from
`models.json` + parquets (see context.md "Update 2026-07-16..24"). Draft reply
(plain formatting per Ilia's preference):

> @Yash Patel, the model is **PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24_detached**
> (Architectural, version V1, uploaded 2025-12-04).
>
> In that model the level "DC - 0G - FFL" sits at elevation +50.4 m, while the rest
> of the DC building is at project datum (DC-01-FFL = 5.3, DC-02 = 10.6,
> DC-03 = 15.9). So the ground floor ends up above the roof, and all 360 pins hosted
> on it (101 rooms, about 1870 captures) float 50 m too high.
>
> Note for project delivery: this level comes from a linked file inside the
> federation whose levels all sit at 48-73 m (real-world site datum instead of
> project zero). The right fix is to align that linked file's shared coordinates
> with the rest of the federation, or set "DC - 0G - FFL" to its project datum
> elevation of about 0, then re-upload the model. Rooms, capture points and 360 pins
> will all inherit the corrected elevation on re-import. No captures need to be
> re-taken or re-uploaded.

After the fix lands: re-run `analysis/detect_stale_360.py` on fresh exports; the
1,868 flagged captures should drop to ~0. Then close per playbook (cause = level
datum in the linked file; trigger = 2025-12-04 V1 upload of the detached model;
cohort = analysis/*.csv) and add the pitfalls entry promised in context.md §Doc refs.

---

## Superseded — 2026-07-13 recommendation (kept for the record)

Chosen action then: re-route the stalled ownership question to Pietro Desiato with
the confirmed root cause and one closed decision question (customer re-upload vs
XYZ-side remap). Rationale: no FE fix exists (transform provably correct; PowerBI
reproduces), client had already answered, and "Blocked" would entrench the stall.
Overtaken by events: Pietro answered 07-13, the cohort was enumerated 07-15, root
cause narrowed to a single mis-elevated level, and the ask moved to project
delivery via Yash (07-16..17).
