# PLT-3095 — recommended action (DRAFT ONLY)

Not an FE fix; the importer is backend-owned. Two moves, parallel:

1. Route the importer defect to Sachin/Ali with the two colliding code pairs.
2. Give the customer the P6 rename workaround so AUS02 is usable today.

## Draft comment (author: Ilia; @ Yash, @ Sachin)

> Found it from the XER. Two pairs of WBS nodes in the schedule produce the same concatenated
> code, and the two missing branches are exactly the losers of those collisions. Milestones and
> "CFCI Procurement" both work out to code .1.1.1, and Core & Shell Construction and "OFCI / OFE
> Procurement" both work out to .1.1.2. That happens because some short names contain dots
> ("Milestones" is 1.1 under 1, while Procurement is 1 with a child 1). P6 allows this — its real
> identity is the internal wbs id — but our import appears to key on the concatenated code, so one
> branch of each pair is dropped. 415 activities are in the lost branches.
>
> @Yash — quickest unblock for the customer, no release needed: in P6, rename Procurement's two
> children so the paths stop colliding (e.g. short name 1 → CFCI, 2 → OFCI), re-export and
> re-upload. If the diagnosis is right, all eight branches appear.
>
> @Sachin — the durable fix is in the schedule import: key WBS nodes on wbs_id/parent_wbs_id from
> PROJWBS rather than the concatenated code, which P6 does not guarantee unique. Happy to share
> the parsed tree and both collision pairs.

**Status suggestion:** stays with us until Sachin confirms ownership; customer gets the workaround
now via Yash.
