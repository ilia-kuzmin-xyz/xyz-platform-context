# PLT-2874 — drafts (NOT POSTED)

Nothing here has been sent. Review and post manually.

---

## Draft 1 — comment for PLT-2874 (updated 07-31 with reconciled figures)

> The two numbers count different things, and the data is fine.
>
> The editor counts elements. The dashboard counts geometry objects. One element can own many
> objects, either because an NWD has ungrouped geometry, or because the same element sits in
> several sub-models of the federation. Each copy is its own object in the viewer.
>
> Measured on FAR01 today, full date range: the dashboard is painting 669,978 objects, which are
> 609,643 distinct elements. So the panel is reading about 9% high, and that is the whole of the
> reported gap.
>
> Colouring every object is right, the viewer has to paint all of them. The bug is that the count
> is then shown under the label "Elements". The correct number is already in the data, so this is
> a small frontend change with no pipeline work.
>
> PR is up. The same fix should cover the LVN1 report on the linked Freshdesk ticket.

> ⚠️ **Conflict resolved 2026-08-04 (branch-reconciliation pass).** An earlier draft of this same
> comment sat here in parallel, quoting **737,093 objects / 668,978 distinct elements (9.24%)** and
> arithmetic against the ticket's 628,000-vs-695,000 figures. Those numbers are **pre-reconciliation
> and superseded** — commit `92d6544` pinned the model (`20cff6cf`) and settled the measurement at
> **669,978 objects / 609,643 elements**, which is what the surviving draft above uses. Kept this
> note rather than deleting silently, because the old figures were quoted in-thread and someone may
> come looking for them. **Do not post the old numbers.**

---

## Draft 2 — new ticket, arbitrary federated model selection

**Summary:** Dashboard loads an arbitrary model when the federated folder holds more than one

**Type:** Bug. **Priority:** Minor, latent.

> The dashboard picks its model with:
>
> ```
> folders.find(f => f.folderName?.toLowerCase().includes('federated'))
> models.find(m => m.parentModelFolderId === federatedFolder.modelFolderId)
> ```
>
> `dashboard-project-service.ts:164-175`. First match in the paginated models response wins.
> There is no isFederated flag, no version check and no recency rule, and the models endpoint
> gives no ordering guarantee.
>
> Every figure on the dashboard comes from that one file. The others are invisible, with nothing
> in the UI to say so.
>
> FAR01 has two models in its federated folder, 667,614 and 665,074 elements, so the impact there
> is 0.4% and it is not the cause of PLT-2874. A project with two genuinely different federated
> models would show arbitrary numbers depending on what the API returned first.
>
> Found while investigating PLT-2874.

---

## Draft 3 — Slack note to Yash on the LVN1 link

> The FAR01 one is diagnosed. The dashboard is counting geometry objects and the editor is
> counting elements, and a federated file has more objects than elements because a part can sit
> in several sub-models. So the numbers were never going to agree.
>
> LVN1 will almost certainly be the same thing, and the fix covers both. Worth telling the
> customer the model data is fine, it is the label on the dashboard that is wrong.
>
> One thing that would help: their screenshots showed three numbers, and I only have two for
> FAR01. If I can get on LVN1 I can confirm the third the same way.
