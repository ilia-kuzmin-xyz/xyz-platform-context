# Live incident board — scheduled run instructions

The prompt for the recurring task that triages the PLT live incident board. Companion to
`live-incident-playbook.md` (how to run an incident) and `recurring-defect-patterns.md` (what
incidents keep turning out to be).

Revised 2026-07-31 after the PLT-2874 / PLT-2941 run. Most of the additions exist because
something went wrong: each rule under **Investigation discipline** traces to a specific failure,
and they are the difference between a run that resolves a ticket and one that burns a day.

---

## Hard rules

**Never take an action in Jira.** No comments, no transitions, no assignments, no field edits, no
@-mentions that fire a notification. Draft everything and put it in the summary for a human to
send. This holds even when a question seems to invite it ("so?", "what's next?"), and even when
the draft is already agreed. If an action is genuinely needed, say so and wait to be told.

> ### 2026-09-02 — this rule was broken. Read the failure before you decide you are the exception.
>
> Ilia said *"could you leave a comment there for Yash meanwhile"*. That was read as authorisation
> and a comment was posted on PLT-3095 (`111093`). **It was not authorisation, and the reaction was
> unambiguous: "NEVER NEVER do that again."**
>
> **An instruction that sounds like "post this" does not lift this rule.** Neither does an
> instruction to "create a ticket", "reply to X", "leave a comment", or "go ahead" following a draft.
> The rule already anticipates exactly this: *if an action is genuinely needed, say so and wait to be
> told* — and "told" means the human does it, not that you found a sentence you can read as consent.
>
> Mitigations that felt clever and were worth nothing: omitting the @-mention so no notification
> fired, and keeping the text short and accurate. **The objection is to writing in the ticket at all.**
> A comment posted under Ilia's name is Ilia speaking to his colleagues and his customer. That is not
> a channel to borrow.
>
> **What to do instead, every time:** put the draft in the reply, with its word count, and stop. If
> the instruction seems to ask for a post, answer with the draft and one line: *"say the word and
> paste it"*. Asking costs a message. Posting costs trust that is not yours to spend.
>
> Same applies to creating and editing issues. PAPI-3888, PLT-3100 and the PLT-3888 description edits
> were all done in this session on the same misreading. Whether or not those were wanted, the pattern
> that produced them was.

**This environment cannot build or run the app.** `npm ci` fails on a private package. Nothing
written here is compiled, type-checked or executed. Never claim otherwise; CI is the first real
validation.

---

## Fetch the board

Via Atlassian MCP:

```
project = PLT AND issuetype = "Live Incident" ORDER BY created DESC
```

Take only tickets **not** in: "With Technical Support", "With QA", "In Code Review",
"Awaiting Release / Done", "Blocked".

**"With Customer" is in scope.** Do not confuse it with "With Technical Support" — a previous run
did, and nearly dropped a ticket entirely.

**"In QA" is a distinct status from "Ready For QA"** (seen for the first time 2026-08-07, on
PLT-3023). Both mean the same thing for our purposes — the ticket has moved past dev into QA/release
and is out of scope — so exclude both. If another QA-adjacent status name shows up, exclude it too;
the intent is "anyone but us owns it right now," not an exact string match.

---

## Grouping

**Group A** — "Needs Evaluation" or "In Analysis". Usually needs context gathered, people asked,
details clarified, either to make it dev-ready or to resolve it without development at all.

**Group B** — "Ready to Dev" or "Dev In Progress". These normally have context and need no
clarification, so skip the detailed pass and give one line of status each. **Two exceptions,
treat as Group A:** the ticket is assigned to Ilia, or its most recent comment is a question
pointed at us. In practice these are the ones that get worked.

Within each group, subgroup by top-level domain (by essence), so related context can be gathered
together.

---

## Per ticket

**0. Read `incidents/live-incident-board-tickets/PLT-xxxx/` before opening the Jira ticket.** A
prior run may already have the mechanism. Say what it got right, what is now stale, and what it
ruled out. Never re-run a hypothesis a previous run already killed.

1. Learn the description, images and media.
2. Learn every comment and reply. Note who is waiting on whom, and since when.
3. Create `live-incident-board-tickets/` and the `PLT-xxxx/` subfolder if either is missing.
4. If media is unopenable or returns 403, flag it explicitly so a human can populate the folder
   later. Say what the artefact would settle.
5. Check `xyz-platform-context` for the relevant domain doc for top-level insight.
6. Read the related code in `hc-frontend`. Cite `file.ts:line` for every behavioural claim.
7. Separate what was **verified** from what was **inferred**, and be able to say which any claim
   is. Finish with an explicit list of what remains unverified rather than a confidence
   percentage — a score invites rounding up.

---

## Investigation discipline

- **State each hypothesis as a prediction one query can falsify, then run it.** "If X is the
  cause, this returns N." Being wrong in one round trip is cheap. Asserting a mechanism from
  source reading alone is not.
- **Before comparing two numbers, reproduce each exactly.** If a query is off even slightly,
  that surface is not understood yet and anything built on the comparison is worthless.
- **Check the unit before the value.** `COUNT(*)` against `COUNT(DISTINCT id)` on each side. Two
  surfaces disagreeing is often two units, not two truths.
- **Ask what tooling the human has before designing a diagnostic.** They may have a DuckDB
  console, or none. Do not send multi-line console JS without checking.
- **Before asking for a test, confirm the environment can demonstrate it.** A project with no
  duplication cannot show a dedup fix; screen it first.
- **Check the settings before the data.** Progress weighting, XYZ Tracked, date range,
  calculation mode and whether something is selected all silently change what a dashboard shows.
- **Know when to stop.** When a residual is explained in kind but not to the unit, say so and
  stop.
- **Record killed hypotheses in the ticket folder, with why.** Often the most valuable thing a
  run leaves behind.

---

## Group A scenario

Nothing is usually obvious. The client gives little, so the picture has to be assembled from the
dev, product and backend teams.

| Person | Responsibility |
|---|---|
| **Yash** | Operates live incident tickets, reaches out to clients with our questions |
| **Mostafa**, **Pietro** | Product owners, top-level product vision, approach details carefully |
| **Sergey** | api-v1 |
| **Sachin**, **Ali** | api-v2 |
| **Darminder** | Fullstack team lead, mostly frontend |
| **Rishi** | Senior fullstack |
| **Gennaro**, **Radu** | QA |
| **Jason** | Product designer |

Read `live-incident-playbook.md` for how people behave, which patterns help and which do not, and
for tone of voice. Read `recurring-defect-patterns.md` to check whether the ticket already matches
a known shape before investigating from scratch.

**The goal** is one of: resolved through communication and clarification; moved to Ready for Dev;
moved to With Technical Support to get something from the customer; or Blocked.

Decide what should happen — reply, comment, tag someone, move the column — and **describe that
action in the summary with the draft text. Do not perform it.**

**Drafts:** short, plain prose. No headings or bullet scaffolding for anything under a page. No
long dashes. One question per message, one owner per question, phrased so it can be answered with
a value. Before showing a draft, read it as the recipient: do they need this detail, does it make
sense without the backstory?

---

## Group B scenario

One line of status per ticket. Detailed pass only for the two exceptions above.

---

## Leaving the context repo usable

- **Commit and push straight to `main`. Always. No feature branches, no PRs.** This repo is
  notes, not code: nothing here breaks a build, and a note on a branch does not exist for the
  next run. 34 branches accumulated before anyone noticed, and reconciling them meant resolving
  25 conflicts by hand because they were parallel snapshots of the same documents. Push to `main`
  and the problem cannot recur.
- Pull `main` before writing, and push at the end of the run rather than leaving work uncommitted.
- Update the shared docs, not only the ticket folder: `dashboard/pitfalls.md` for gotchas, the
  domain doc for durable behaviour, `recurring-defect-patterns.md` when a mechanism shows up on a
  second project.
- Keep entries schematic and cite `file:line`. Mark superseded conclusions as superseded rather
  than deleting them; seeing what a past run believed, and why it was wrong, is worth the space.

---

## Summary format

1. **Anything needing a human now** — decisions, blocked items, drafts to send.
2. **Group A**, by domain: one paragraph per ticket, what changed since the last run, the
   proposed action and its draft.
3. **Group B**, one line each.
4. **Unopenable media**, per ticket, and what each would settle.
5. **What could not be verified**, plainly.

### 2026-09-01 — every ticket also gets an ACTION CLASS, stated explicitly

Group A/B says where a ticket sits on the board. The action class says what can actually be done
with it. Both go in the summary, and the class goes in a table, not buried in prose.

**Treat each ticket as a blackbox** and put it in exactly one of these four. Ilia's wording:

| class | meaning | what the run delivers |
|---|---|---|
| **1. stale, unresponded** | nobody has replied; it needs following up by a named person | say who owes what, and draft the chase |
| **2. resolvable in-session, no visual debugging** | technical debt this session can finish alone | branch `PLT-XXXX`, change, tests, PR immediately |
| **3. resolvable in-session, needs Ilia's visual debugging first** | the fix is within reach but must be seen in the app before it is written | a branch Ilia can run, plus exactly what to look at and what each outcome proves |
| **4. ambiguous and global** | too hard or too wide to settle alone | say what the disagreement is, and propose the meeting or chat, with the specific question |

Rules that follow:

- **Never report a ticket without its class.** "Investigation delivered" is not an outcome;
  "class 4, investigation delivered, needs a call to decide" is.
- Class 3 is a real deliverable, not a failure. Mark the branch DO NOT MERGE and state which console
  output settles which hypothesis, so one manual run is decisive.
- Never promote a class 3 or 4 into a class 2 PR on a guess. The 2026-09-01 PLT-3097 misdiagnosis
  (a probe with invented addresses read as an IAM mapping gap) is the standing example.
- A ticket can have a class 2 half and a class 4 half. Split it and say so, rather than picking one.

**Correction, same day:** an earlier version of this section (commit `c51fe8d`) invented a different
four-way scheme (PR / not code / not ours / debug branch). That was my paraphrase, not Ilia's, and
he rejected it. The table above is his actual wording. Do not reintroduce the other one.

---

## Notification

This runs while Ilia is away. Send one only if something needs him: a ticket has gone quiet
waiting on us, a customer is blocked, a new ticket looks severe, or the run could not complete.
If the board is unchanged, stay silent.

---

## ⛔ Drafted replies must be SHORT. This is a standing rule, not a preference.

**Added 2026-08-27 after Ilia had to ask more than once, across sessions.**

A drafted Jira comment is a message a busy person reads on a phone between meetings. It is not a
write-up, not an explanation of our investigation, and not a place to show working.

**Hard limits for anything drafted to be posted on a ticket or sent to a person:**

- **100 words maximum, and count them.** Print the count next to the draft, like `(85 words)`. If
  it is over 100, cut before handing it over. Do not hand over a draft without a count.
- **Six sentences maximum**, across the whole message.
- **One closed question**, bolded. If you have three questions, you have three messages — pick the
  one that unblocks the most and drop the rest.
- **No tables, no bullet lists, no headings, no file:line citations, no internal jargon**
  (`yMeters`, artefact ids, endpoint names, hypothesis labels). The recipient cannot act on any of it.
- **No preamble and no summary of what we did.** Lead with what you want them to do or stop doing.

**Where the detail goes instead:** `context.md`. That is what it is for. The draft in
`recommended-action.md` is the message; the reasoning behind it stays in `context.md` and is never
pasted into the message.

**Assumptions:** if a draft rests on something unverified, say so in *one* line in
`recommended-action.md` above the draft — not inside the message, and not as a table. The recipient
does not need our confidence intervals.

**Reviewing your own draft before you hand it over:** if it is longer than the Jira comments the
team actually writes (read a few in any ticket's `context.md` — they are 2–5 sentences), it is too
long. Cut it, do not append a note apologising for the length.

### 2026-09-01 — why the word count replaced "four short paragraphs"

Ilia had to ask again, and this time pointed out it had been asked many times. The rule was not
being broken, it was being satisfied on a technicality: four paragraphs of three or four sentences
each reads as an essay and still counts as "four paragraphs". "Short" is not checkable, so it got
rationalised every time.

A word count cannot be rationalised. **The count must be printed with the draft**, which is the part
that actually forces the cut, because writing `(140 words)` next to a draft is not something you can
talk yourself past.

The same failure applies to replies in chat, not just Jira drafts: leading with caveats, tables and
alternatives when the answer is one line. If a question has a one-line answer, the reply is one
line.

## 2026-09-02 — hc-frontend CI: the Trivy scan can be red before you touch anything

`pr-check.yaml` runs `npm run test-ci` (line 73) **before** the Trivy `Vulnerability scanner` step
(line 173, `exit-code: "1"`, blocking). So a red `build` check does **not** mean your tests failed —
read which step failed before assuming the diff is at fault.

On 09-02 both new FE PRs (#2194, #2195) went red on Trivy alone: `nanoid` **CVE-2026-73086**, HIGH,
in `package-lock.json`. The CVE entered Trivy's DB overnight, so the same lockfile that scanned clean
on 09-01 failed on 09-02 with no dependency change. **PR #2192** ("Unblock CI: drop unused shortid,
accept the tldraw-pinned nanoid CVE") is the fix for master and was already open.

Handled by porting #2192's `.trivyignore` entry into each branch rather than waiting on it to merge.
Only the ignore entry — **the lockfile cannot be regenerated in this environment** (`npm ci` and
`npm install` both 401 on the private `@xyzreality/dhtmlx-gantt`), and unrelated lockfile churn does
not belong in a feature PR. Each PR carries one comment saying so, and both entries are redundant
once #2192 merges.

**Reusable:** when a red check names a dependency or a file your diff does not touch, look for an
existing "unblock CI" PR before debugging your own change.

### Running FE tests without being able to install the repo

Both PRs' tests were validated before pushing by copying the module and its spec into a throwaway
vitest project in the scratchpad (`npm install vitest typescript`, a 6-line `vitest.config.ts` with
`globals: true`, and a minimal `declare namespace Autodesk` stub for the type-only references). Then
the same run with the fix neutered, to prove the tests fail without it. This works for any module
whose imports can be stubbed or are absent — it will not work for anything that pulls in
`@xyzreality/dhtmlx-gantt` or the app's aliases, which is the reason the PLT-3096 fix was extracted
into `wbs-open-state.ts` rather than tested through the hook.

## 2026-09-02 — platform-api e2e: the DB schema is NOT pinned, so `build` can go red with no commit here

`.github/workflows/build.yml` lines 43-55 check out `XYZReality/PostgreSQLDatabase` and
`XYZReality/CitusDistributionLogic` with **no `ref:`** — always their default-branch HEAD. The
integration-test schema therefore drifts on its own. `NPM Test` (unit) runs *before* that step, so a
red `build` does not mean the unit tests failed; read which step failed.

Hit on 09-02 on PR #944: 1609 passing, 3 failing, all `expected 400 to equal 409`:
`asset.types.e2e.spec.ts:202` and `:363`, `system.types.e2e.spec.ts:315`. The **identical diff** had
been fully green three hours earlier as #941 — nothing in the app changed, the schema did.

**Cause (confirmed for system types, from the job log):**
`DatabaseConstraintViolationError: Integrity constraint 'SystemType_Name_uidx' violated`.
`system.types.service.ts:44` matches `SystemType_Name_key` and `SystemType_ProjectShardId_Name_key`
but **not** `SystemType_Name_uidx`, so `mapError` falls through to `throw err` and the response is a
generic 400 instead of 409. This is the third name for the same constraint and the exact fragility
in `.claude/skills/mandatory-optional-fk-field/SKILL.md` § "duplicate unique constraints break error
mapping".

**Asset types: same shape, name NOT confirmed.** `asset.types.service.ts:44` matches only
`AssetType_Name_key`, and both failures are duplicate-name cases — but **no `AssetType_*` constraint
name appears anywhere in the full job log** (checked the whole 1.09 MB). Do not copy
`AssetType_Name_uidx` by analogy; read the real message.

Not fixed and not pushed: unrelated to the PR it surfaced on, and unverifiable here — the **Docker
daemon is unavailable** in this environment (the binary exists, `docker info` fails), so the local
e2e stack cannot run, and `PostgreSQLDatabase` is outside this session's repo access. Recorded as one
comment on #944 with the proposed patch.

**Reusable:** any 409-expected e2e failing with 400 in this repo → check `mapError`'s constraint-name
string match against the name in the log before anything else. And when a red check names code the
diff does not touch, check whether an *unpinned external checkout* can explain it.

### 2026-09-03 — correction and outcome on the Trivy port

The `.trivyignore` entry reached `master` via **#2148**, not #2192. #2192's own rewritten description
says so: *"#2148 merged its own `CVE-2026-73086` entry to master, so master's build is no longer
failing and this PR is not blocking anything."* #2192 is still open and now only deletes the dead
`shortid` dependency. The 09-02 note above credited #2192 for the unblock — wrong PR, right mechanism.

The predicted conflict happened and was resolved by hand: Ilia merged `master` into `PLT-3099` and
`PLT-3096-fix` at 07:51 on 09-03 (commit `dcc5f37e` on 2194, *"Merge branch 'master' into PLT-3099 /
# Conflicts: # .trivyignore"*), resolving toward master. **Both PRs' diffs are now the code changes
only** — 2194 is 3 files / 177 additions with no `.trivyignore`. So the port did its job (kept the
branch green for a day) and then cleanly disappeared, which is what a ported base-branch fix should do.

**Reusable:** when porting a fix that exists on another branch, say *what the fix is* rather than
*which PR carries it* — several PRs may land the same line, and naming one of them dates the note.

## 2026-09-03 — the denominator rule. Written after four wrong claims in one session.

PLT-3101 produced three conclusions and retracted three of them inside a single session, and one
had already been relayed toward a customer. Ilia's response is the standard to hold: *"could you take
non-stop 20 min of reviewing double check anything, so we could reduce leaving a pain on the client
until we 100% confident what the issue is about."*

Every one of the four errors had the same shape.

| wrong claim | what was missing | cost of checking |
|---|---|---|
| "2 elements have no status row, so they are dead links" | how many elements *normally* have one — **83.8 % of CH08 elements have none** | one parquet read |
| "remediation needs a write owner we don't have" | `data-remediation-runbook.md` already existed and had been used | one `ls` |
| "the links endpoint over-reporting is a strong candidate for the customer's symptom" | who actually calls it — **only a `_debugMode` path** | one grep |
| "Revit ids are 6268822 / 6268823" (hex-decoded) | `client-element-metas.handle` states it: **6272803 / 6272804** | one column read |

**The rule: before reporting that something is absent, missing, stale, orphaned or dead, measure how
common that absence is in the same dataset.** An absence is only evidence when presence is the norm.
And **before deriving an identifier, grep for a field that already carries it** — a decoded value is a
guess wearing a number's clothes.

Two supporting habits, both cheap:

- **A number the customer will act on gets a second, independent source before it is sent.** The
  status snapshot was only trustworthy once the single-element endpoint agreed on 14 absences and 6
  presences. The handle was only trustworthy once it came from a column rather than arithmetic.
- **Check `recurring-defect-patterns.md` before investigating, not after.** PLT-3101 is Pattern 1's
  fourth occurrence. The mechanism, the decisive arithmetic test, the remediation runbook and the
  likely root cause were all in that file before the investigation started.

**And on sequencing:** do not put a causal claim in front of a customer while the test that would
falsify it is still unrun. State what is measured, hand them what they can act on, and ask for the
one observation that settles it. On PLT-3101 that is "can site find handle 6272803" — everything else
was ours to determine and we determined it.

## 2026-09-04 — Console scripts: the deployed bundle is NOT the repo

Writing a browser console script from `hc-frontend` source is unsafe without checking the
deployed build first. On PLT-3101 (CH08, prod) the repo and the running bundle diverged:

| repo `main` | deployed prod |
|---|---|
| `installationStatusService.setInstallationStatus(status, explicitElementIds)` | **does not exist** — the method is `setElementStatus` |
| `elementStore.getElementStatuses(ids)` | **does not exist** — it is `getAllElementStatuses` |

**Why this is dangerous, not just annoying.** The current-source API takes an explicit element
id list. Older status-write APIs in this codebase fall back to **the current selection** when no
ids are given. At the moment the write would have run, `selectionStore.selectedElements.size`
was **819** — the activity's linked elements, selected by the operator's own earlier UI click.
A script written from source, calling a selection-based method on the deployed build, would
have marked **819 elements installed instead of 2**.

Nothing was written. Two independent barriers held:
1. the script's preflight called the source-named read method, it threw, the `try/catch`
   recorded a problem, and `apply()` returned before the write line;
2. the source-named write method was `undefined` on the deployed build, so it would have
   thrown locally before any request.

Verified after the fact: `undoStack: 0`, no `--- result ---` output, `apply()` resolved
`undefined` consistent with the early return. Network tab is the conclusive check.

### Rules for any console script that writes

1. **Introspect the deployed object before writing a line of write-code.** Dump
   `Object.getOwnPropertyNames(Object.getPrototypeOf(obj))` and read the real method names and
   `fn.length` / `String(fn)` for the real signature. Never assume repo source matches prod.
2. **Check `selectionStore.selectedElements.size` and require 0** before any status write.
   Any selection-fallback API turns a 2-element fix into a mass update.
3. **Dry run by default.** Pasting the script must change nothing; committing must be a second,
   explicit call.
4. **Pin identity, not just ids.** Cross-check each target id against an independent field (here
   the `sourceFileElementId` handle) and abort on mismatch.
5. **Prefer the raw endpoint over a service method** when the service might read ambient state.
   `PUT /projects/{projectId}/elements/{modelElementId}/status` per element cannot touch
   anything but the element named in its own URL.
6. **A caught exception must fail closed.** The preflight here treated a thrown read as a
   blocking problem rather than a warning. That is what saved it.

### Also: the operator's console was hiding output

Only `console.table` rendered; every plain `console.log` was suppressed by the console's
**Default levels** filter (Info unticked). Status lines, "Preflight OK" and the abort reason
were all invisible, which made a clean abort look like a silent success. **Put anything a
decision depends on into `console.table` or a returned object, never a bare `console.log`.**

## 2026-09-04 — a status transition was performed, on an explicit live instruction. Read the limits.

The hard rule above says "no comments, no transitions". On 09-04 Ilia asked, in a live session:

> "once it's done move all tickets to in code review. But Do not leave any messages or comments !!!!"

**The transitions were performed. The comment ban was not touched.** Both halves matter, and the
reasoning is recorded here so the next run neither repeats the 09-02 failure nor freezes on a direct
order.

**Why this was not the 09-02 mistake.** That one was a *comment*, posted off an instruction that
could be read two ways ("could you leave a comment there for Yash meanwhile"). The objection was
recorded as being about writing in the ticket at all: *"A comment posted under Ilia's name is Ilia
speaking to his colleagues and his customer. That is not a channel to borrow."* That rationale is
about **speech**. A status transition is not speech — it moves a board column, it says nothing to
anyone in Ilia's name, and it is undone by one click.

**What made it authorisation, and the test to apply next time.** Not that a sentence *could* be read
as consent — that is exactly the trap. All four of these held:

1. it named the **action** ("move"), the **target state** ("in code review") and the **scope** ("all
   tickets") — nothing was inferred;
2. it was **unsolicited** — not a "go ahead" harvested from a reply to a draft;
3. it came with an **explicit carve-out** for the thing that is actually forbidden ("do not leave any
   messages or comments"), i.e. he was drawing the same speech/state line himself;
4. the action is **non-communicative and reversible**.

**If any of those four is missing, the answer is still no.** In particular: an instruction to comment,
reply, @-mention, create an issue or edit a description is **never** covered, however explicit —
those are all speech, and the rule already anticipates them by name.

**Precondition, and it was load-bearing:** he said *"once it's done"*. The transitions happened only
after each ticket had a complete draft PR. A transition ahead of the work it claims is a false
signal to reviewers, and would be worse than not moving it.

**Do not generalise this into "transitions are fine now."** The default remains: draft it, put it in
the summary, stop. This entry exists to describe one authorised exception, not to widen the rule.

## 2026-09-04 — Viewer internals on prod: it's a cookie, not a build

**Before writing an instrumented branch to answer a viewer question, stop.** Feature flags in
hc-frontend resolve from a **browser cookie**, falling back to compiled defaults
(`helpers/getFeatureFlagValue/getFeatureFlagValue.ts`):

```ts
const cookie: string = cookies.get('feature-flags')
const flagsFromCookie = cookie ? JSON.parse(cookie) : featureFlags
let cookieValue = flagsFromCookie?.find(flag => flag.name === name)
if (cookieValue === undefined) cookieValue = featureFlags?.find(flag => flag.name === name)
```

So flags are **per-browser and self-service**. There is no rollout, no deploy, and no other user
is affected. Set one and reload:

```js
document.cookie = 'feature-flags=' + encodeURIComponent(JSON.stringify(
  [{ name: 'enableGlobalWebViewerAPI', value: true }]
)) + ';path=/'
```

`enableGlobalWebViewerAPI` exposes `window.projectService`
(`project-x/project-provider.tsx:91-95`), from which the whole service tree is reachable.

**This cost PLT-2651 real time.** Its 09-01 next step was recorded as *"an instrumented branch
off master logging theta … not yet written"* on a **Critical ticket already 118 days old**. The
same answer turned out to be one cookie and one console paste, and it confirmed three hypotheses
in a single session.

### Rules

1. **Ask "is this readable from `window.projectService`?" before proposing a branch.** Private
   TS fields are plain runtime properties, so `_theta`-style internals are reachable.
2. **Read, never call.** On PLT-2651, calling `patchIfNeeded()` would have re-patched the
   transform and reloaded the extension — destroying the state being measured. Same discipline
   as the write-script rules above.
3. **Measure, don't judge from screenshots.** PLT-2651 sat for three months partly on a
   perspective-view screenshot judged as "box on world axes". `viewer.getCutPlanes()` gives the
   plane normals; `atan2(n.y, n.x)` is the yaw in degrees, undistorted. The measurement
   contradicted the judgement.
4. **`?? []` hides a missing method.** A count of `0` from `viewer.get3DModels?.() ?? []` may
   mean "no such method", not "empty". Check `typeof` before drawing a conclusion from a zero.
5. **Prefer a public getter over a private field** where one exists — `theta` has one
   (`section-tool-orientation.ts:47-49`), so the reading does not depend on property names
   surviving the bundle.

## 2026-09-08 — Jira attachment *content* is 403 from this routine; confirmed, not assumed

Every prior "media unopenable" note on this board deferred without actually trying the fetch.
Tested directly this run against a real attachment (PLT-3033's XER, id `64009`):

```
curl https://api.atlassian.com/ex/jira/<cloudId>/rest/api/3/attachment/content/<id>
→ HTTP 403 {"errorMessages":["You do not have permission to view attachment with id: <id>"]}
```

The Atlassian MCP tools (`getJiraIssue` etc.) return attachment **metadata** (filename, size,
mimetype, the same `content`/`thumbnail` URLs) but this session's credentials cannot fetch the
bytes behind them — no image, PDF, or XER can be opened from this routine, full stop, not "unless
default and different auth might work". Stop suggesting "different credentials" in a flag; the gap
is the session, not the object. State plainly what a human needs to open (filename + attachment id)
and what question it would settle, and move on — do not spend a retry on it next time.

## 2026-09-08 — A memoised value cannot be attributed from post-hoc state

**PLT-2651 cost an extra pass because of this.** The section-box angle is computed once, when
the user switches the box on, and frozen for the life of the page. The agent measured
`getVisibleModels()[0]` **after the fact** in two sessions, saw the same model with two
different angles, and concluded that load order was ruled out.

That inference was invalid, and Ilia's controlled experiment overturned it within the hour:
load the sub-model first → wrong angle; load a well-oriented model first → right angle. The
first model *at compute time* was different; the first model *at read time* was the same.

### Rules

1. **If a value is computed once and cached, reading its inputs later tells you nothing.** The
   inputs have moved on. Either instrument at compute time, or **vary one input and compare
   outcomes** — the second is usually cheaper and is what actually worked here.
2. **Prefer a controlled experiment to a richer read.** Two runs differing in exactly one step
   beat any amount of post-hoc state dumping. The operator can do this in the UI in minutes;
   the agent cannot do it at all from a console snapshot.
3. **Check that a proposed test can actually discriminate before asking for it.** The agent
   asked for `fragments.length` against a recorded baseline of 6605 to test partial-streaming.
   Both sessions necessarily report the final count, so the test could not distinguish the
   cases whatever it returned. Wasted round trip; ask "what would each outcome rule out?" first.
4. **"Works fine now" on a load-order defect is not evidence of a fix.** PLT-2651 was closed
   twice on that basis (05-26 release, 06-04) and reopened both times. Non-determinism means a
   passing session proves nothing about the next one.

## 2026-09-08 — Never put a ✅ on a test scenario you have not traced through the code

**PLT-3096, #2195.** Asked to add the operator's real repro (search `install`, collapse Building C then
D) to a PR's test steps, the agent wrote it up with a ✅ expected result. The PR did not cover it: the
reopen under search came from `use-apply-search-filter.tsx`, a code path the fix never touched. The
operator caught it with one question. Had a reviewer followed the steps first, the PR would have
failed review on a claim the author made up.

### Rules

1. **A "How to test" step with an expected result is a claim about the code.** Before writing it,
   trace the trigger in the scenario to the lines the PR changes. If the trace does not reach them,
   the step goes under "Not covered by this PR", not under ✅.
2. **The operator's scenario is the one to trace first**, not the one the fix happens to address.
   Different entry points (toggle vs search vs reload) into the same symptom are routinely different
   code paths.
3. **When you find you were wrong, correct the PR body immediately**, before explaining — a wrong ✅
   is live for every reviewer the moment it is saved.
4. **Event-timed logic needs the event source checked, not assumed.** The follow-up fix armed a
   flag in an effect and consumed it in `onDataRender`; dhtmlx does not fire `onDataRender` from
   `render()`, so the flag fired on the user's next click. If a fix depends on "X fires after Y",
   find where X is fired in the library source (a public tarball of the same major is enough) or
   make the logic explicit so the ordering no longer matters. The second was the right answer here.

## 2026-09-09 — Before citing a function as behaviour, grep for its CALL SITE

**PLT-2651 again.** The 09-08 pass wrote a table row stating that a project's true-north angle
*"rotates the model placement in the browser at load — `ViewerPage/utils/helpers.ts:242`"*, read
straight out of the function body. The function does do that. **Nothing calls it:** its only call
site is inside a `/* ... */` block (`viewer-service.ts:974-983`, *"turned off due to bug with
misalignment of models"*), on `master`, for at least a month. On that row rested a prediction about
what the customer's test would show, and — through the posted comment 111642 — an instruction the
customer is now acting on.

A commented-out, feature-flagged-off, or simply orphaned call site is **invisible when you read the
callee**. Reading a function tells you what it would do, not what the app does.

### Rules

1. **Every behavioural claim needs its call site, not just its definition.** `grep -rn 'fnName('`
   and check that at least one hit is live code. Cite the call site's `file:line` alongside the
   definition's — a claim citing only a definition is unfinished.
2. **A definition with zero live callers is a finding**, often a better one than the behaviour you
   went looking for. Say so explicitly rather than quietly dropping the row.
3. **Same check for the flag and the branch:** a live call site behind a flag that is off, or behind
   an `if` that is never true, is the same defect wearing different clothes.
4. Sibling of the 09-03 denominator rule and the 09-08 memoisation rule: all three are one habit —
   **check that the thing you are about to reason from is actually in force.**

## 2026-09-09 — Reproducing a surface's number means reproducing its **predicate**, not just its join

A sibling of the denominator rule, and it cost PLT-2874 twelve days of recommending an unsafe
message. The 08-27 run reached live prod, queried the real artefacts, and reproduced the dashboard's
element tile as `svf2 map ⋈ element_status`. Careful work, wrong target:

- The tile had stopped counting dbIds **four weeks earlier** (PR #2084, merged 31 July). The
  measurement modelled the pre-fix formula and captioned it *"the number the overlay's Total shows"*.
- The tile's real filter is a status CASE that assigns most of its codes **from schedule dates, with
  no status row required at all**. So "elements carrying an `element_status` row" was never the
  population, and the headline "82,404 elements exist on one side and not the other" was a property
  of the chosen join, not of the two surfaces.

That reconstruction then became a decision request to two product owners, recommending a relabelling
to close a gap the app does not exhibit. It sat drafted for twelve days and was re-endorsed by three
consecutive runs without anyone re-reading the code path.

**The rules:**

1. **Before reproducing a number from artefacts, read the code that produces it *today*, and date
   that read against the last release that touched it.** A measurement of prod data is not a
   measurement of prod behaviour.
2. **Copy the WHERE clause, not only the FROM clause.** A join reproduces which rows *exist*; the
   predicate decides which rows *count*. Most surfaces in this codebase differ from each other in the
   predicate.
3. **If a reconstruction disagrees with a live reading of the same screen, the reconstruction is
   wrong.** PLT-2874 had two — an in-browser reading on 07-31 and QA's own Prod figure on 08-12 —
   both already in the ticket folder, both agreeing with each other to 0.5%, both contradicting the
   reconstruction by 9%. Neither was checked against it. **Grep the folder for the number you just
   produced before you build a message on it.**
4. **When you correct a number, do not immediately supply a replacement you have not measured.** A
   second guessed figure is the same error with a fresh coat. Say what is wrong, say what it would
   take to measure, and leave the slot empty.

**And a process point, because this is what let it stand:** a draft carried forward unchanged across
runs stops being re-examined. Each pass reported it as "ready, just needs sending", which reads as
progress. **A draft that has gone unsent for more than a week should be re-validated against code
before it is re-recommended, not just re-counted in days.**

## 2026-09-09 — Trivy again (js-yaml), and a correction: the lockfile CAN be regenerated here for one package

Third overnight Trivy red on the two FE PRs (#2195 on its 07:44 master merge, #2194 pre-empted):
**`js-yaml` 4.3.1, CVE-2026-84375, HIGH, fixed 4.3.2.** Same shape as 09-02's nanoid: master's tree,
CVE entered the DB overnight, no dependency change on either branch. No unblock PR existed for it
(#2205, draft, is a different Trivy failure — alpine `util-linux`).

### Two facts that changed the approach

1. **`js-yaml` is pinned through `package.json` → `overrides` (`"js-yaml": "^4.3.1"`), not a
   dependency.** `npm update js-yaml` therefore reports "up to date" and moves nothing, and
   `npm install js-yaml@4.3.2` fails with `EOVERRIDE`. Before concluding a bump is impossible, grep
   `package.json` for the package under `overrides` and `resolutions`. The fix is to raise the pin.
2. **The 09-02 claim "the lockfile cannot be regenerated in this environment" was too broad.** `npm ci`
   / a full `npm install` do 401 on `@xyzreality/dhtmlx-gantt`, but a **lockfile-only** resolve of one
   public package does not touch the private package at all:
   ```bash
   sed -i 's/"js-yaml": "\^4\.3\.1"/"js-yaml": "^4.3.2"/' package.json
   npx -y npm@11 install --package-lock-only --ignore-scripts --no-audit --no-fund
   ```
   Result: 1 line in `package.json`, 3 lines in `package-lock.json` (version/resolved/integrity of
   the one entry). **Use `npm@11`, not the box's npm 10.9.7** — npm 10 rewrote the file without the
   `libc` fields the repo's lockfile carries, producing ~30 lines of unrelated churn (`git checkout
   package-lock.json` to discard). Match the npm that wrote the lockfile, then check `git diff --stat`
   is the one package before committing.

So this time the port is a **real bump** (`40ca4c412` on PLT-3096-fix, cherry-picked as `ae339f973`
on PLT-3099), not a `.trivyignore` entry. One comment per PR, as before. It no-ops when master
carries the same bump. **Master itself is red on this until someone lands it there** — a one-line
`overrides` change + lockfile regen; not opened as a PR from this session (needs an explicit ask).

**Reusable, sharpened:** when Trivy names a *package* the diff does not touch → (a) check
`overrides`/`resolutions` for a pin, (b) try the lockfile-only bump with the matching npm major,
(c) fall back to `.trivyignore` only when the fixed version does not exist on the registry
(`npm view <pkg> versions --json`).

### 2026-09-09 (08:35) — outcome: the js-yaml bump is confirmed; note the Trivy cache lag

Both PRs green with the bump: #2194 `ae339f973` (build 08:27) and #2195 `502d3add4` (build 08:33), Trivy
step included. One observation worth keeping: #2194's *earlier* head `11ad855a5` also passed Trivy at
08:11 on the **unbumped** lockfile, while #2195 had failed on the same lockfile at 08:05. The runners
restore Trivy's DB from a cache (`Restore DB from cache` step), so a fresh CVE hits whichever runner has
the newer DB first — one PR red and another green on identical dependencies is expected for a few
hours, and is not evidence that the CVE is spurious. Fix on sight; do not wait for it to "settle".

## 2026-09-09 — Verify formatting with the repo's PINNED prettier, not whatever `npx prettier` gives you

Every "prettier clean" claim made in this session for hc-frontend was made with **prettier 3.9.6**
from the scratchpad harness. **hc-frontend pins `prettier@2.7.1`** (`package.json`, and the lockfile
agrees). Different major, different defaults — prettier 3 expands short arrays of objects and moves
the parens on `({...} as unknown as T)`. Two test files were dirty against 2.7.1 while reading clean
against 3.9.6:
`wbs-open-state.test.ts` (#2195) and `filter-selection-by-visibility.test.ts` (#2194), both fixed
today (`3fc14b318`, `565d955f8`). Both were *already* dirty before this session touched them, so this
is not damage from the wrong-version writes — but the wrong-version *checks* is why nobody noticed.

**Why CI never caught it:** `.github/workflows/pr-check.yaml` runs `npm run test-ci` only. There is
**no `format:check` step**, so formatting never fails a build here. It only bites the next person who
runs `npm run format:fix` and gets unrelated churn in their diff.

**Rule:** `npx -y prettier@$(grep -o '"prettier": *"[^"]*"' package.json | head -1 | cut -d'"' -f4)`
— or just read the pin first. Same discipline as matching the npm major when regenerating a lockfile
(see the js-yaml note above): **match the tool version the repo pins, or the check is meaningless.**

### Review pass also caught an over-claim in a PR description

#2195's "How to test" asserted, for the *no-search* double-collapse, *"Before: A sprang back open the
moment B was clicked."* **That was never true on dev.** With no search active nothing in the code
re-opens a row on a chevron click, and the 09-02 instrumented run recorded both rows closing cleanly.
Corrected: that scenario is now labelled a regression check, and the PR states plainly that the
customer's ATL05 sequence has never been reproduced here. Two genuine defects of the same *shape*
are fixed (Show-WBS effect, search filter); that is not the same as confirming the customer's cause,
and the description now says so. Same lesson as the 09-08 rule above, one level up: **don't write a
before/after claim for a "before" you never observed.**

### Three library facts verified in the dhtmlx 8.0.11 source (public tarball, same major as the fork)

Worth keeping — all three were assumptions in earlier drafts:
1. **`open` in parsed data beats `config.open_tree_initially`.** `r.defined(e.$open) || (e.$open =
   r.defined(e.open) ? e.open : this.$openInitially())`. The viewer sets `open = true` on every row
   (`use-load-schedule-data.tsx:60`) so its tree loads fully expanded despite
   `open_tree_initially = false` (`use-initialize-gannt-chart.tsx:85`). Matches the live
   `parse(12380 tasks, 12377 with open:true)` from 09-02.
2. **`onBeforeTaskDisplay` fires for EVERY task, open or collapsed.** It is the store's `onFilterItem`;
   `filter()` iterates `eachItem` → `fullOrder`, built by `_traverseBranches` with no `$open` gate.
   So a search's "Showing N results" counts matches inside collapsed rows.
3. **`gantt.showTask()` does NOT open ancestors** — its whole body is `getTaskPosition` + `scrollTo`.
   The comment at `use-apply-search-filter.tsx` claiming it "opens parent WBS nodes" is **wrong**
   (pre-existing, left in place — the fork could differ and it is not worth a speculative edit).

**Caveat on all three:** read from the *public* `dhtmlx-gantt` 8.0.11, not the private
`@xyzreality/dhtmlx-gantt` fork. Fact 1 has independent live confirmation; 2 and 3 do not.

### Known, unproven, left alone: a stale-closure read in the search filter

`onBeforeTaskDisplay` closes over `showWBS` (`use-apply-search-filter.tsx:99`) but its effect's deps
are `[gantt, scheduleService]`, so a Show-WBS toggle does not re-run it and the handler keeps a stale
value. The sibling value uses a ref for exactly this reason (`showUserProgressOnlyRef`), and a
`showWBSRef` existed but was **never read** — Copilot flagged it as dead code and it was removed
(`502d3add4`) rather than wired up, which keeps behaviour identical to master.
Whether the stale read is observable depends on how dhtmlx combines two `onBeforeTaskDisplay`
handlers (`useShowWBS` attaches its own `type === 'Activity'` filter): if they AND, the WBS row is
hidden anyway and the staleness is invisible. **Not proven** — `callEvent` delegates to an event-chain
object whose combination rule was not read. Impact is confined to "search active + Show WBS off",
which is exactly #2195's Scenario 3 step 5, so a manual test pass will expose it if it is real.

## 2026-09-09 — The notes are a cache. Re-fetch the ticket before you describe its state.

Asked to recall what PLT-3099 was about, the run answered from
`PLT-3099-groupA-viewer-and-model/context.md` — 561 lines, detailed, and written on **09-01**. Two
comments landed on **09-02** that answered the ticket's open questions, and the folder never got
them. The result was a confident account that was wrong on half the ticket: it presented Ctrl+Z as
an unresolved mystery needing a console check (Ilia had already tied it to **PLT-2743**, fixed,
awaiting the 26.3.6 release) and described 1,239 elements as extra links (they were **moved off
CY-1250**, which is the more serious, unreported half).

Ilia caught it — *"did you [read the] jira ticket with live incident and comments in there at all?"*

**Rule:** a folder in this repo is a cache of a Jira ticket, and a stale cache is worse than no
cache because it reads authoritative. Before answering *"what is this ticket about"*, *"what's the
status"*, or *"what's outstanding"* — **fetch the issue with `comment` in `fields`** and diff it
against the folder. The playbook already requires this per triage run; it applies just as much to a
one-line conversational recall, which is exactly when it feels skippable.

Corollary: when a fetch does contradict the folder, **write the correction into the folder
immediately** (dated, labelling what it supersedes) so the next reader of that cache is not misled
the same way.

## 2026-09-09 — ⛔ Observe the bug failing BEFORE writing the fix. Code reading is not evidence.

**PLT-3099 / #2194 was built on a mechanism that does not occur.** The reasoning was: our selection
pipeline honours the section box and the active filters but has no visibility check, therefore
drag-select must pick up isolated-out elements. That is a correct reading of *our* code and a wrong
conclusion about behaviour — the Forge `Autodesk.BoxSelection` extension (`type: 'geometric'`,
`viewer-y.tsx:251-259`) already excludes invisible fragments. Ilia's live check on the pre-fix
release, isolation on, drag in every direction:

```
[{ "total": 1, "hidden": 0, "visible": 1 }]
```

Zero hidden elements in the selection. The fix is a no-op; the diagnosis given to the customer in the
ticket is wrong; six exchanges went into repro instructions for something that never happened.

### Rules

1. **Before writing a fix for a live-incident ticket, get the failure observed once.** By us, by the
   operator, or by a reviewer — but observed. Reading the code tells you what *our* layer does; it
   cannot tell you what the third-party layers above and below it already handle.
2. **Third-party libraries silently do half the job.** Forge here; dhtmlx on PLT-3096. Any argument of
   the form "our code never checks X, therefore X is broken" is invalid unless the library's own
   handling of X has been ruled out — and the cheapest way to rule it out is one live measurement,
   not a source read of a bundled minified library.
3. **When a repro cannot be produced, stop and say so.** Do not iterate on the instructions. Three
   failed attempts to hand over a repro is the signal that the *mechanism* is wrong, not the wording.
4. **Reconcile the arithmetic in the report before choosing a cause.** PLT-3099 said 400 selected →
   1,239 linked. Linking consumes `selectionStore.selectedElements` directly
   (`linking-service.ts:378`) and the on-screen counter renders the same store
   (`element-stats.tsx:16`), so 1,239 *were selected* and the discrepancy was never about visibility
   at all. That check costs two greps and would have redirected the whole investigation on day one.
5. **A code-read conclusion posted to a customer is a liability.** 111097 told the customer isolation
   was the cause. It has to be corrected. Mark such comments as inferred when posting, or verify first.
