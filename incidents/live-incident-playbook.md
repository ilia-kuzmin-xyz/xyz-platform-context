# Live-incident playbook — communication & resolution patterns

Derived from the **July 2026 "clients can't access dashboards" incident**
(PAPI-3621 / PAPI-3622 / PLT-2879 / Freshdesk #7316). The specifics of that
incident matter less than the *shape* of how it got solved — and where it
stalled. Every live incident has a different agenda; the top-level pattern
below is what transfers.

---

## The universal shape of a live incident

Agendas differ — "user can't access", "colors render wrong and it worked
before", "editor and dashboard disagree", "uploaded schedule doesn't match
PowerBI" — but every live incident is the **same six questions**, answered in
roughly this order. The whole July case, and every stall in it, maps onto them.

**1. What exactly is observed — and can *we* observe it right now?**
Convert a report ("something's off with colors") into a reproducible
observation in our own hands: exact surface, exact entity, exact wrong value,
timestamp, screenshot/recording. Until we can see it ourselves, we have a
rumor, not an incident. *July case: the unlock was `msojo@switch.com` — a user
broken **at that moment**. Three hours were lost on Luke, whose broken state
had already been mutated away. The rule generalizes: investigate an instance
that is wrong right now; a "fixed" instance carries no evidence.*

**2. What did we expect — and on whose authority?**
Every incident is a disagreement between observed and expected. Name the
reference explicitly: a spec, a design token, the editor's value, PowerBI's
number, "how it was last month". Half of visual/data incidents die here —
the reference itself was wrong or was never what people remembered.
*July case: "he could access before" was the assumed reference — Grafana then
showed **no logins in 30 days**. The expectation was folklore. "It worked
previously" is a claim to date with evidence, never a starting fact.*

**3. What is the smallest broken-vs-working pair?**
Find two instances that differ in as little as possible — one wrong, one right
— and diff them. This is the single most powerful move in any incident,
because **the diff *is* the diagnosis**. *July case: badams was Viewer on
ATL06/07 (works) and "Dashboard Only" on ATL05 (broken) — same user, same
tenant, same day; the only difference was the role. Equivalents: the same
element colored right in the editor and wrong in the dashboard → diff the two
data paths; the same activity correct in PowerBI and wrong after upload →
walk the pipeline stage by stage until the numbers diverge; worked-yesterday
vs broken-today → diff what shipped between.*

**4. What decides that behavior?** (mechanism)
Ask the owning engineer "which code path produces this — what does it read,
what does it compare?" and confirm on **every layer independently** (in July,
FE gate *and* api2 middleware each denied on their own). For a color: what
maps value → color, and on which surface does the mapping run? For a data
mismatch: which stage computes the aggregate? Mechanism turns mystery into
lookup.

**5. Why now?** (trigger)
"It worked previously" demands a dated cause: a deploy, a data change, a
manual action, an expired assumption. Ask explicitly, twice — at the start
and before closing: *"what changed in the window — deploys AND manual prod
actions (flushes, restarts, toggles, data fixes)?"* *July case: this question
was asked once, never owned, and the trigger is still unknown — which means
the incident can recur. An unanswered "why now" is an open incident wearing a
closed label.*

**6. Who else?** (cohort)
The reported user/project/chart is a sample, not the population. Once the
mechanism is known, query for everyone matching the broken shape (everyone on
the legacy role; every chart using that palette path; every schedule uploaded
since the deploy) and remediate in bulk — don't wait for the next ticket.

**Two disciplines hold it together, whatever the agenda:**
- **Single-variable changes, announced.** One change at a time against the
  repro, every prod-touching action declared in-thread at action time. *July:
  an unannounced Redis flush "fixed" two users mid-experiment and destroyed
  attribution permanently.*
- **Close on cause + trigger + cohort — never on "looks fine now".** Symptom
  disappearance without those three is remission, not resolution.

The rest of this document is the July case worked through this frame: the
timeline, who played which role, the message styles that made it fast, and
the phase-by-phase checklist.

---

## TL;DR of the case (what it turned out to be)

- **Root cause:** users holding the **legacy "Dashboard Only" role** (single
  authority: `DashboardView`) were denied by access checks that require
  `ProjectView` — on **both** layers independently (FE route gate and api2
  endpoint middleware). The role was structurally locked out of the exact page
  it was named after.
- **Confounder:** a **Redis permission-cache flush** (done quietly, mid-incident)
  "fixed" two affected users while a role-remap experiment was still being
  arranged — so the team never cleanly attributed which fix fixed whom.
- **Red herring (split off successfully):** api2 "bearer token not sent"
  warnings — a separate FE token-refresh race (fixed as PLT-2879 / PR #2030).
- **Never answered:** *why it started when it did* ("why wasn't this an issue
  before?"). Suspected recent deployment; nobody correlated error-rate with the
  deploy timeline. The trigger remains unknown — which means it can recur.

---

## Timeline compressed to decision points

| Time (9 Jul) | Event | Pattern it illustrates |
|---|---|---|
| 10:51 | Yash opens a dedicated named chat, lists all 4 known tickets with status | ✅ single thread, inventory first |
| 10:52 | Mostafa states the precise symptom: *can log in, cannot open dashboards* | ✅ symptom ≠ vague "no access" |
| 11:02 | Sergey: "API logs are clean"; asks for HAR/Network-tab per ticket | ⚠️ evidence request with no owner — sat idle |
| 11:13 | Pietro: "we can't ask high-profile customers to gather logs — we need our own logging" | ✅ observability gap named |
| 11:26–12:02 | Darminder proposes role-cycling experiment; Pietro sets guardrail: *test on internal people, never clients* | ✅ experiment + guardrail |
| 12:28 | Sergey surfaces "bearer token not sent" errors | ⚠️ second signal enters the same thread |
| 13:14 | Mostafa pulls **MS Clarity session recordings** of affected users | ✅ observability without bothering clients |
| 13:17 | Sachin posts the api2 denial log for Luke (first hard server evidence) | ✅ verbatim log > paraphrase |
| 13:35 | Sergey dumps Luke's actual authorities (viewer_role, 15 authorities) | ✅ ground truth from DB |
| 13:55–14:06 | "How does access get *created* in api2? Does role matter?" → "invitation, role doesn't matter" | ✅ mechanism question kills a theory class |
| 14:12 | FE token race found, hotfixed, **explicitly scoped as separate** | ✅ signal split with owner |
| 14:40–15:07 | Invite/email/login forensics on Luke (invited Oct 2025, removed+reinvited 8 Jul) | ✅ timeline forensics; ⚠️ consumed hours on the *wrong user* — Luke had already been "fixed" by re-invite, so his data couldn't show the live defect |
| 15:24–15:35 | Sergey tries to close: "resolved, nothing left" — Mostafa/Yash: "we don't know the reason why; the Jira exists for the root cause" | ✅ closure resisted; ⚠️ recurring pattern |
| 16:33 | Escalation: more users affected, "big problem past 2 days", deployment suspected | — |
| 16:36–16:41 | Sergey: "give me **any email**, I'll check logs" → gets `msojo@switch.com` | ✅ THE unlock: a *currently-affected* concrete user |
| 16:49–16:51 | Pietro posts DB row (badams: Viewer on ATL06/07, **Dashboard Only** on ATL05). Sergey posts the smoking gun: *user has only `DashboardView`; log shows a `ProjectView` check → false* | ✅ required-vs-held authority diff = root cause |
| 17:02 | FE confirms the same gate exists client-side (both layers) | ✅ cross-layer confirmation |
| 17:50–18:09 | Pietro finds an **internal** Dashboard-Only account (equinix@), reproduces the 403, flips role to Viewer, dashboard works → "That is the fix" | ✅ repro → single-variable fix test, 19 minutes |
| 19:12–19:15 | Client reports Moises "sorted"; team: "we didn't do anything"… Sergey: "the only thing I did — flushed the Redis cache ~2h ago" | ❌ unannounced prod change destroyed attribution |

**Elapsed: ~6 hours** from thread open to verified mechanism. Of that, roughly
**3 hours went to forensics on Luke — a user whose defect had already been
erased** by remove+re-invite. The turning point was getting the email of a user
who was **still broken**.

---

## Who moved the needle, and how (contribution patterns)

The point is not scoring people — it's that each effective contribution is a
**repeatable role** someone should consciously take in the next incident.

### Sergey (BE v1) — *the evidence engine*
- Fast, verbatim, on-demand ground truth: log greps per email, authority dumps,
  invite/login timestamps. His 16:51 message — *required authority vs held
  authorities, side by side* — cracked the case.
- **Weakness pattern:** twice attempted early closure ("permissions look correct
  now, nothing to investigate") — treating *state now* as if it explained
  *behavior then*; and made a prod-affecting change (Redis flush) without
  announcing it in-thread.
- **Lesson:** the evidence engine is priceless but must be *pointed* — he answers
  exactly what's asked, so the quality of the questions determines everything.

### Pietro (product lead) — *the repro driver* ⭐ most efficient pattern
- Converted every hypothesis into a **test he could run himself**: found an
  internal account matching the affected shape, reproduced the 403 with network
  evidence, flipped one variable (role → Viewer), verified the fix. 19 minutes
  from repro to fix confirmation — after ~5 hours of remote speculation.
- Also set the guardrail (don't experiment on clients) and named the
  observability gap (can't keep asking customers for HAR files).
- **Lesson:** *"find an internal account shaped like the victim"* beats any
  amount of log archaeology. Repro-in-our-hands is the single highest-leverage
  move in a user-specific incident.

### Darminder (FE lead) — *the hypothesis generator*
- Produced most of the candidate theories cheaply: role-cycling test, "old UI
  invite" theory, clone-a-user repro idea, "update all Dashboard Only → Viewer",
  and the synthesis call ("That is the fix"). Also asked the sharp scoping
  question on the token noise ("which requests are these?").
- **Lesson:** theories are cheap and useful *when someone else converts them to
  tests* — generator + driver is a productive pairing.

### Mostafa (FE) — *the rigor guardian*
- Kept attribution honest: "we didn't do anything" (when a client reported
  self-healing), "that's after he accepted — we don't know what it was before",
  "**why wasn't it an issue before?**" (the question that was never answered),
  and killed the promote-to-editor workaround on data-exposure grounds.
- Brought MS Clarity session recordings — evidence without touching clients.
- **Lesson:** every incident needs someone whose job is to ask *"does the
  evidence actually support that?"* and to log what changed when.

### Yash (support) — *the coordinator*
- Opened the thread, named it, inventoried all tickets with per-ticket status,
  owned client communication through one channel (Melissa), and re-anchored the
  goal at the closure attempt ("the Jira was raised to know the root cause").
- **Lesson:** the coordinator's inventory + goal-anchoring is what stops an
  incident thread from dissolving into "works now, closing".

### Ilia (FE) — *the mechanism interrogator*
- Asked the questions that eliminated theory-classes: "how does a user *get*
  access in api2 — what writes the record, does role matter?" (killed the
  provisioning-gap theory), "401 or 403?", "was there an earlier accepted
  invite before the incident date?" (timeline fork).
- Split the "bearer token not sent" signal into its own track, fixed it (FE
  refresh race), and **explicitly scoped it** as *not* the incident — protecting
  the main investigation from contamination.
- Confirmed the FE layer of the root cause the moment BE found their half.
- **Lesson:** asking *"which code path decides this?"* converts a permissions
  mystery into a lookup; and every side-finding must be labelled "separate"
  loudly, or it pollutes the diagnosis.

### Sachin (BE v2) — *the system explainer*
- Provided the api2 denial log and the access-model semantics (IAM-governed,
  30-min positive cache, negatives re-checked). That cache detail later turned
  out to be operationally decisive (the flush).
- **Lesson:** get the *system-model explanation* from the owning engineer early —
  it defines which theories are even possible.

---

## Anti-patterns observed (each cost real time)

1. **Forensics on an already-fixed victim.** ~3h spent on Luke, whose broken
   state had been destroyed by remove+re-invite the night before. *Rule: prefer
   a user who is broken **right now**; state-now ≠ state-then.*
2. **Unannounced prod changes during diagnosis.** The Redis flush silently
   resolved two users mid-experiment. Nobody could say which fix fixed whom.
   *Rule: during an active incident, announce **every** prod-touching action in
   the thread, however trivial it seems — cache flush, restart, config toggle.*
3. **Premature closure on "state looks correct now".** Twice. *Rule: an incident
   closes on **root cause + trigger + cohort sweep**, not on symptom
   disappearance.*
4. **The trigger question left unanswered.** "Why wasn't this an issue before?"
   was asked once and dropped. No deploy-timeline correlation was ever done.
   *Rule: assign the "what changed?" question an owner like any other workstream.*
5. **Two signals in one thread without early split.** The token-noise and the
   access-denial ran interleaved for ~2h before being explicitly separated.
6. **Fuzzy timestamps.** "Approx 6 July" was wrong (logins showed 8 July); the
   error was only pinned by Grafana/email logs much later. *Rule: replace every
   "approx" with a logged timestamp as step one.*
7. **Evidence requests without owners.** The HAR-file ask (11:02) had no
   assignee and produced nothing all day; Clarity recordings (13:14) replaced it.

---

## The transferable playbook

Incidents differ in agenda; the **communication pattern** is constant.

### Phase 0 — Declare (first 10 minutes)
- One named thread. One coordinator (owns inventory + client channel).
- Inventory: every known ticket/report, per-item status, affected user + project.
- One-sentence symptom in the form: *who* can/can't do *what*, *where*
  ("clients can log in but cannot open dashboards" — not "access issues").

### Phase 1 — Facts before theories (first hour)
Collect, verbatim, before anyone theorizes:
- [ ] **One currently-affected user** (email) + project id. Not a fixed one.
- [ ] **Exact error**: endpoint, HTTP status, response body, timestamp.
- [ ] **Server log line** for that request (correlation id).
- [ ] **What the user actually holds** (role + authorities from DB) vs
      **what the failing check requires**. *This diff is usually the answer.*
- [ ] **Session recording** (Clarity) instead of asking the client for HARs.
- [ ] **"What changed?"** — deploy list + any manual prod actions in the window.
      Ask explicitly: *"has anyone changed anything in prod in the last 48h —
      flushes, restarts, toggles, data fixes?"* (Ask it again before closing.)

### Phase 2 — Split signals, assign owners
- Different error messages = different tracks, each with an owner, even if they
  later merge. Label side-findings loudly: "separate from this incident".
- Route each question to the person who owns that system (v1 IAM ≠ api2 ≠ FE) —
  and get the **system-model explanation** ("how does access work here?") from
  the owner before theorizing about it.

### Phase 3 — Mechanism, cross-layer
- Ask "**which code path decides this, and what does it check?**" — then verify
  the answer on *every* layer (FE gate AND BE middleware can each deny alone).
- A theory is only "confirmed" when required-vs-actual is shown side by side.

### Phase 4 — Reproduce internally
- Find or create an **internal account with the same shape** as the victim
  (same role/tenant/vintage). Never experiment on client accounts.
- Repro criteria: same error, same endpoint, same status — with our own eyes
  (network tab), not a client's description.

### Phase 5 — Single-variable fix test
- Change **one** thing on the repro account; verify; announce.
- **Freeze other prod actions** during the test window — or at minimum announce
  them in-thread so attribution survives.
- Then generalize: query the full affected cohort (e.g. *all* users holding the
  legacy role) and remediate in bulk — don't wait for the next ticket.

### Phase 6 — Close properly
An incident is closed when the thread states, explicitly:
1. **Root cause** (mechanism, with the evidence line).
2. **Trigger** — why it started when it did. If unknown, say "unknown" and open
   a follow-up; don't silently drop it.
3. **Cohort** — who else is affected, and that they were swept/remediated.
4. **Follow-ups** — code fixes on each layer, observability gaps, role migration.
5. **Fix attribution** — which action fixed which user (this is why Phase 5
   discipline matters).

### Role cards (assign these consciously)
| Role | Job | In this incident |
|---|---|---|
| Coordinator | inventory, client channel, goal-anchoring | Yash |
| Evidence engine (per system) | verbatim logs/DB on demand | Sergey, Sachin |
| Repro driver | internal repro + single-variable fix tests | Pietro |
| Hypothesis generator | cheap theories for others to test | Darminder |
| Rigor guardian | attribution, "does evidence support that?", change log | Mostafa |
| Mechanism interrogator | "which code path decides this?", cross-layer checks, signal splitting | Ilia |

One person can hold two roles; no role should be held by nobody. The most
dangerous vacancy is **rigor guardian** — without it, "works now" closes
incidents that aren't understood.

### Message craft — the style that worked (observed, per message type)

The thread's throughput came as much from *how* things were written as from
what was investigated. The styles worth copying:

**Questions — closed, answerable, routed.**
The questions that produced results in minutes were narrow enough to have a
one-line answer, and @-mentioned exactly one owner:
- *"do we know if he got 401 or 403?"* · *"could you give me any email? I'll
  check in logs"* · *"do you know when he accepted the one before that?"* ·
  *"Sachin — how does a user get access to a project in api2, what creates the
  record?"*
Open questions without an addressee (*"why wasn't it an issue before?"*)
floated unanswered all day. **Rule: one question per message, one owner per
question, phrased so it can be answered with a value.**

**Facts — verbatim artifacts, one-line caption, highlight the key part.**
Nobody effective paraphrased evidence. Sergey pasted raw log lines and DB dumps
as code blocks with the email/role highlighted; Pietro posted the DB row with
`roleName=Dashboard Only` underlined, the DevTools 403 response, and captioned
each with a single line ("*this is where I get the 403*", "*getting this error
with this account, but if I go with my account, I don't*"). The caption states
what the artifact *shows*, not a theory about it. **Rule: raw artifact + one
interpretive line; mark the exact token that matters.**

**Answers — direct, minimal, no hedging; "I don't know" said plainly.**
*"no"* · *"nothing for the last 7 days"* · *"We didn't do anything"* · *"I'm
not sure, may be better to ask Gennaro"* (a *good* answer: an honest gap plus
the next hop). Answers quoted the question they answered (reply-quote), which
kept three parallel tracks readable in one thread.

**Hypotheses — phrased as questions, not claims.**
*"is this caused by the Dashboard Only role instead of Viewer?"* · *"could
this be related to a recent deployment?"* · *"is this because the user was
invited using the old UI?"* — question-form invites testing and costs nothing
to discard. Nobody had to walk back an assertion all day because almost nothing
was asserted before evidence.

**Scoping statements — explicitly bound every claim.**
*"But this is from BE perspective only"* (Sergey) · *"this is separate from
Luke's issue, it doesn't resolve the incident"* (FE token fix) · *"That's
after he accepted — we don't know what it was before"* (Mostafa). These
one-clause boundaries are what kept partial findings from being mistaken for
the root cause.

**Status declarations — state + so-far + evidence quality.**
*"I'm currently investigating PAPI-3621, nothing so far, API logs are clean"* —
owner, progress, and what was checked, in one line. Compare with silence, which
forces the coordinator to chase.

**Verdicts — short synthesis only after the artifact.**
*"That might be it"* · *"That is the fix"* — five words max, immediately after
reproducible evidence, never before it. A verdict this short is only safe
because the artifact is right above it in the thread.

**Corrections and disclosures — fast, unprompted.**
*"Sorry wrong guy, it's federica…"* (Yash, self-corrected within minutes) ·
*"The only thing I did — flushed the Redis cache ~2 hours ago"* (Sergey — the
right form, though a day late; disclosures belong at action time, not
discovery time).

**Per-contributor style fingerprints (copy the fit-for-purpose one):**
| Contributor | Signature form | When to use it |
|---|---|---|
| Sergey | verbatim log/DB block, key token highlighted, zero commentary | delivering evidence |
| Pietro | screenshot + one-line caption + "next I'll try X" | repro & fix testing |
| Darminder | hypothesis as a question + ≤5-word verdict after evidence | steering options |
| Mostafa | one-line counter-fact ("we didn't do anything") | guarding attribution |
| Yash | numbered inventory, one status per item | coordination checkpoints |
| Ilia | routed mechanism question with 1 sentence of context + explicit "separate from X" scoping | eliminating theory-classes, splitting signals |

### Question bank (the ones that actually moved this incident)
- "Give me the email of **one user who is broken right now**."
- "Which endpoint, which HTTP status, which timestamp?"
- "What authority did the check require, and what does the user actually hold?"
- "How does a user *get* this access — what writes the record, does role matter?"
- "Was there an earlier <grant/invite/login> before the incident date, or is the
  current state post-fix?"
- "What changed in the window — deploys AND manual actions (flushes, restarts)?"
- "Is this the same error as X, or a different signal that needs its own track?"
- "Why wasn't this an issue before?" ← assign an owner; do not let it drop.

---

## Case-specific follow-ups still open (as of 10 Jul 2026)

- [ ] **Trigger unknown** — correlate the access-denial error rate with the
      deploy timeline; explain "why now". (Redis cache state is a suspect: a
      flush resolved users whose role was never changed — that combination is
      not yet explained by the legacy-role theory alone.)
- [ ] **Cohort sweep** — enumerate all users still holding "Dashboard Only";
      bulk-migrate to Viewer (Darminder's proposal, validated by Pietro's test).
- [ ] **Code fixes** — decide whether `DashboardView` should be honored by the
      FE dashboard route gate and api2 read endpoints, or whether the legacy
      role is retired entirely (then delete it so this class of incident dies).
- [ ] **Observability** — session-recording/logging so TS never has to ask a
      client for a HAR file again (Pietro's ask; Clarity partially covers it).
- [ ] **FE token-refresh race** — PR #2030 (separate finding, PLT-2879).
