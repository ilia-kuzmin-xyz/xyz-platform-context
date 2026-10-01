# PLT-3182 — recommended action (2026-09-30, first pass) — drafted only, nothing posted

**Action class: 1** (new, no reply yet, owner Rishi) and likely **4 → 2** once the error is known. Status stays
**Open** until Rishi picks it up. Do not ask the customer anything yet: the failure is ours to read.

**What to do first:** Ilia opens screenshot `65456` and pastes the error text into `context.md`. That
single read decides whether this is a backend rule (Sergey), a permission gap (Sachin/Ali or Darminder) or a
data fix.

**Assumption (one line):** the removal is refused by the v1 user service, since the UI only calls it.

### Draft to Sergey (41 words)

> Sergey, the customer can't remove some ex-employees from dashboard projects, for example Eoin Manning on EQX-PA12 PHASE 1&2-XV2. The screenshot is in PLT-3182. **Is something in the user service blocking that removal, like him being the last admin on the project?**

If it is a blocking rule, the practical fix for the customer is Sergey or Rishi removing the 10 pairs directly
(see `incidents/data-remediation-runbook.md`), and the rule itself becomes a separate ticket. Because these are
ex-employees, say so when asking for speed.

No Jira action of any kind was taken.

---

# 2026-10-01 update — supersedes the 09-30 draft to Sergey (do not send it)

**Action class: 1.** Pietro owes an answer, asked about 20 h ago. Ex-employees still hold dashboard access
on nine projects, so it is worth a nudge today rather than waiting on the weekend. Status stays **Open**.

**Assumption (one line):** Pietro has not answered anywhere outside Jira; if he has, skip.

### Draft to Pietro (38 words)

> Pietro, ex-employees of a customer still have access to several projects. They are organisation admins, so the customer's project admins cannot remove them. Yash has the list in PLT-3182. **Can you or another organisation admin remove them today?**

### Follow-up for Rishi, no message needed yet
His "improve the error message" ticket needs a front end half as well: the toast discards the server text
(`TeamContent.tsx:857-861`). Mention it when he raises the ticket, or add it to the ticket he opens.

No Jira action of any kind was taken.
