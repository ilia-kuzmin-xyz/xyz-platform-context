# PLT-2874 — drafts (NOT POSTED)

Nothing here has been sent. Review and post manually.

---

## Draft 1 — comment for PLT-2874

> Found it. The two numbers count different things.
>
> The editor counts elements. The dashboard counts geometry objects. On the FAR01 federated model
> there are 9.24% more objects than elements, because the same element appears in more than one
> sub-model of the federation and each copy is a separate object in the viewer.
>
> Measured on prod today: 737,093 objects against 668,978 distinct elements, so 68,115 extra.
> Apply that to the 628,000 the editor reported and you get 686,000, against the 695,000 on the
> dashboard. The rest is three weeks of edits.
>
> Colouring every object is correct, the viewer has to paint all of them. The bug is that the
> dashboard prints that count under the label "Elements". The data needed for the right number is
> already there, so this is a small frontend fix and no pipeline change.
>
> Same fix should cover the LVN1 report.

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
