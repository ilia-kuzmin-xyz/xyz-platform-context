# Agent Pipeline — Known Pitfalls

## 1. PermissionError on log file rotation (Windows)

**Symptom**: Pipeline appears stuck (no SSE events), log file error in terminal. Multiple Python processes holding the log file open.

**Cause**: `RotatingFileHandler` on Windows can't rotate when another process holds the log file. Stale `uvicorn --reload` worker processes accumulate. `sse_starlette` and `httpx` emit DEBUG logs for every SSE chunk — megabytes of log output.

**Fix**: 
```python
logging.raiseExceptions = False   # suppress PermissionError from logging itself
handler = RotatingFileHandler(..., delay=True)  # don't open until first write
for _noisy in ("httpcore","httpx","sse_starlette","mcp.client.streamable_http","watchfiles"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)
```
Kill all stale Python processes before restarting (`Get-Process python | Stop-Process`).

## 2. PowerShell mangles JSON in `-d` flag

**Symptom**: Pipeline returns 500 / validation error on POST. Request body is malformed.

**Cause**: PowerShell interprets single/double quotes in `-d '{...}'` differently from bash. JSON keys and values get corrupted.

**Fix**: Write the body to a file, then use `--data "@file.json"`:
```powershell
'{"message":"test","project_id":"..."}' | Out-File body.json -Encoding utf8
curl.exe http://localhost:8000/api/chat --data "@body.json" -H "Content-Type: application/json"
```

## 3. Thread store evicted — EDIT turns lose context

**Symptom**: Follow-up questions after pipeline restart generate an artifact with no prior art — fully recreated from scratch instead of edited.

**Cause**: `thread_store` is in-memory only, wiped on restart. `last_artifact` absent → composer gets no prior TSX.

**Fix**: Frontend sends `prior_artifact: { tsx, title, summary, domainsRead }` in the request body on EDIT turns. Pipeline uses it when `thread.last_artifact` is absent. Already implemented in `useCanvas.ts`.

## 4. Profile stubs mixed with hydrated data in T2

**Symptom**: Hydrated domain returns counts but no row arrays.

**Cause**: Phase 0b profile output has the same domain keys as Phase 2 hydrated output, but profile values are stubs (no rows). If profile data is accidentally cached in T2 under the same key as hydrated data, subsequent requests serve stubs instead of full payloads.

**Rule**: T1 (profile cache) and T2 (project data cache) are completely separate objects. Never store profile output in T2. Profile is keyed by `project_id` only; T2 is keyed by `(project_id, ProjectDataKey)`.

## 5. `artifact_error: truncated at N chars`

**Symptom**: Dashboard renders with incomplete or invalid TSX.

**Cause**: Composer hit `max_tokens`. The streaming response was cut mid-JSON.

**Behaviour**: Composer auto-retries up to 3× with assistant prefill (re-feeds the truncated head back). If all retries fail, `artifact_error` is emitted.

**Fix**: Reduce component complexity (fewer widgets, shorter prompt). Edit `agents/artifact_composer.py` to tighten the layout constraint.

## 6. MCP domains randomly stuck "pending" (auth context rejected)

**Symptom**: A *random* subset of domains never delivers — tiles stuck on "pending"
while others show data. The stuck set changes per run (one run: schedule ready /
issues pending; next run: the reverse). Logs show `invalid_auth_context_id`.

**Root cause (as of Jul 2026)**: NOT expiry, and NOT "one context per account".
The MCP server supports concurrent contexts. The failure is almost certainly
**multiple MCP replicas (k8s) with in-memory, pod-local contexts and no
shared/sticky store**: our single `auth_context_id` lives on one pod, but the
profiler fires ~10 concurrent calls that round-robin across pods, so only the
fraction hitting the context-holding pod succeed (~1/N).

**Behaviour**: `mcp_client.py` catches `invalid_auth_context_id`, re-logs in
(lock + compare-and-swap so only one login fires, not N) and retries, bounded by
`_MAX_AUTH_ATTEMPTS`. Each retry is another ~1/N roll, so it helps only
probabilistically until the server fix lands.

**The real fix is server-side** (BE owns): sticky sessions / shared context store
across replicas, or a single instance. See
[incidents/mcp-auth-context-investigation.md](../incidents/mcp-auth-context-investigation.md)
for the full investigation, measurements, and the open question to BE.

**Detection**: `invalid_auth_context_id` in pipeline logs; `failed`/missing
domains in `artifact_data_complete`.

---

## A prescriptive template silently suppresses interactivity

Giving the composer an exact block-and-grid spec makes it draw exactly those
blocks and stop. The first Room Readiness template specified five panels, a
grid and colours, and produced **18k chars with 3 onClicks** — status filter,
type filter, clear. Clicking a room did nothing. Free-form reports from the
same model were 26–34k with far richer UI, because nothing told it to stop
inventing.

Adding an explicit `### Interaction` section (selection state, what a click
does to each block, hover, empty states) took the same prompt and data to
**24k chars and 11 onClicks**. Structural constraint costs improvisation, so
any template must pay for behaviour separately.

**Do not measure a template by structural checks alone.** A ten-point layout
adherence score passed 10/10 on the version with no interactivity in it.

## Never name a component prop the composer can't actually use

The template first told the composer to pass `selectedDbIds` to `<ForgeViewer>`
so a room would isolate. That prop did not exist — the real signature is
`{urn, projectId, height, filterStatus, selectedRoomId}`. React drops unknown
props silently, so the generated report would have looked correct, scored
correct, and done nothing.

Check `ForgeViewerStatic.ts` for the current signature before writing viewer
instructions into any prompt, and state the allowed props explicitly so the
model doesn't invent more.

## Isolating a room must ghost, not hide

Rooms hold a **median of 18** tracked elements (min 1, max ~6,900). The status
filter hides non-matching fragments outright, which is right for a status with
hundreds of thousands of elements and catastrophic for a room: the user sees a
near-empty canvas with no spatial reference.

Room selection therefore uses `viewer.isolate(ids)` (ghosts the remainder) plus
`fitToView`, while the status filter keeps its fragment-level hide. Resetting
one path must clear the other — `viewer.isolate([])` before re-applying
fragment visibility, and re-show all fragments before isolating.

---

## The composer invents identifiers, not just numbers

A generated Room Readiness report labelled its viewer panel
**`DH-B2-01 · capture 14/07/2026`**. No room in that project contains "DH" or
"B2" — real names look like `L1-NORTH SUPPORT BATTERY 1245`. The model had
written a plausible name in the style of the design mockup, as a literal.

The existing "NEVER fabricate data" rule only spoke about synthetic curves and
arrays — **numbers**. Names, ids, codes and dates fell straight through it. The
rule now covers identifiers explicitly, and the template states what the viewer
header must show.

Two things make this the worst class of bug here:

- **Nothing looks wrong.** A fabricated percentage might be implausible; a
  fabricated room name is indistinguishable from a real one to anyone who
  doesn't know the project's naming.
- **Structural checks pass.** A ten-point layout adherence score gave that same
  report 10/10.

**Whenever a block cannot be honestly populated, say so in the prompt and tell
the model to omit it.** Room Readiness does this for the Packages GC column and
for Milestones — the mockup fakes both (its package percentages come from a hash
of the room name, its milestone dates are string literals, GC is `actual` minus a
pseudo-random offset), and porting them would have reproduced exactly this bug.

**Verify identifiers against the source data, not against plausibility.** One
query over the room list settled it in seconds.

---

## 2026-08-05 — mcp-dev ignores pagination (server-side bug, measured)

`https://mcp-dev.holosite.dev/mcp` ignores `size` and `page` and omits
`totalElements`. Measured directly:

```
xyz_get_projects_project_id_issues  size=1   → 7,534 rows, 12.4MB, 30.8s
xyz_get_projects_project_id_issues  size=100 → 7,534 rows, 12.4MB, 36.0s
```

Consequences before mitigation:
- every "cheap" size=1 availability probe downloaded its entire dataset —
  the profiler's probes measured **132–151s each** (locally: 2–3s);
- client-side page parallelism can never engage (no `totalElements`);
- `_call_tool_paginated` only worked by accident (page 0 returns everything).

Client-side mitigation (shipped): `count_only` detects the oversized response
and stashes the full payload into T2 (`ProjectDataKey` put), so the probe
pre-hydrates the domain instead of the same megabytes being fetched twice.

**The real fix is server-side** — mcp-dev must honour `size`/`page` and return
`totalElements`. Until then a truly cold profile costs one full download per
probed domain, whatever the client does. The local MCP binary honours
pagination correctly, which is why none of this was visible before the switch.

### 2026-08-06 correction — the probe-stash mitigation was WRONG and is reverted

The entry above says the oversized probe responses are stashed into T2. **Do
not do this.** The oversized responses are big but not complete: measured
7,534 rows returned for a project holding **32,272 issues** — mcp-dev ignores
`size` but still caps the response. The stash shipped a quarter of the
dataset with healthy-looking counts. Caught only because the hydrated payload
size changed between runs (11.4MB → 2.7MB) and a full re-fetch was compared.

What remains shipped: the FULL paginated fetch is disk-spilled (correct
32,272 rows), which gives the same repeat-speed benefit honestly.

Lesson worth keeping: **"the server returned more than I asked for" is not
evidence it returned everything.** Completeness needs `totalElements` or a
second source — and mcp-dev provides neither.

Also affected: **profile counts**. Without `totalElements`, `count_only`
falls back to `len(rows returned)`, so on mcp-dev the profile reports 7,534
issues for a 32,272-issue project. The composer sizes layouts from that
number. Hydration corrects `total` at delivery, but anything decided at
profile time (scale stamps, "trivial/rich" buckets) is working from the
capped figure until the server returns real totals.

---

## 2026-08-06 — `skip_clarifier` also skips the template fast path

Template matching (`clarifier_io["template"]` → serve fixed artefact) lives
INSIDE the clarifier branch in `server.py`. A request carrying
`skip_clarifier: true` (or `clarifier_answers`) never enters that branch, so
even a question that names a template ("which rooms are ready for handover")
goes to a full bespoke compose (~4 min) instead of the instant template.

In the product flow this is near-unreachable — the survey (and thus its Skip
button) is only shown when no template matched. But it bites anyone
**benching or scripting** the API: pass an unmodified prompt to measure the
template path; `skip_clarifier` measures the bespoke path.

---

## 2026-08-07 correction — mcp-dev's pagination is NOT broken; we called it wrong

The 2026-08-05 entry above says mcp-dev "ignores `size` and `page`" and
concludes its pagination is a server bug. **The `page` half is wrong**, and
the conclusion drawn from it was wrong. The tool schema was never read; the
claim was inferred from payload sizes alone.

`xyz_get_projects_project_id_issues` accepts exactly six parameters:

| parameter | what it does |
|---|---|
| `projectId`, `auth_context_id` | required identity |
| `size` | **genuinely ignored** — asked 500, got 7,534 |
| `simple` | drops `fileReferences` + `activityCategories` |
| `lastFetchedIndexId` | **cursor pagination — works** |
| `lastSyncDateTime` | **delta sync** — only issues modified since; rows carry `isDeleted` |

There is no `page` parameter at all. The endpoint paginates by cursor, the
response envelope carries `{lastFetchedIndexId, recordCount}`, and
`_call_tool_paginated` already detects and walks it — which is why the full
32,272-issue fetch has been correct all along. It was never "working by
accident".

What IS true, narrowly: each batch caps at ~7,500 rows / ~12MB whatever `size`
says, and no grand total is returned, so the cursor hops must run
**sequentially** — each hop's starting point is only revealed by the previous
response. A full issues fetch is 9 sequential calls.

Measured live on project 1a03eaf1 (32,272 issues):

```
full cursor walk, current call     128.1s   32,272 rows   60.3MB   9 calls
full cursor walk, simple=true       91.5s   32,272 rows   43.2MB   9 calls
lastSyncDateTime = 1 day ago         6.3s        0 rows    0.0MB
lastSyncDateTime = 7 days ago        1.7s        0 rows    0.0MB
lastSyncDateTime = 90 days ago      21.1s    7,510 rows   10.2MB
```

Two capabilities we have never used, both free:

- **`simple: true`** — 28% fewer bytes, 29% less wall time, and the dropped
  `fileReferences` (attachment metadata: filename, MD5, byte size, blob URL)
  is read by no artifact we generate.
- **`lastSyncDateTime`** — the real answer to cold-cache cost. A 2026-08-07
  request refetched all 60MB because the disk spill's 300s TTL had expired
  overnight, yet **zero issues had changed since the previous day**. The delta
  call proves that in under 7 seconds.

**Lesson: read the tool schema before characterising a server as broken.**
`client.get_tools()` exposes every parameter and its description; one call
would have surfaced `simple`, the cursor, and delta sync on day one.
