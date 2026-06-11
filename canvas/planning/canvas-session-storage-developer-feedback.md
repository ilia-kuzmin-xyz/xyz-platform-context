can we confirm the following schema implemenation

Ch. I. 2 perfect scenarios

we load a canvas today firs time
1. we load a project's canvas with 4 sessions (4 was taken as an example)
2. for all of them we check hydration-data domains in files sotrage as well
3. we haven't found anything and that's why we start fetch them from mcp live
4. once we fetch per each domain, we save that domain files to ensure next we load them from files
5. We don't chekc which domains we need we just load all of them
6. meanwhile once we get such data we hydrate all sessions concurrently, since we got a unified hydration basket for them

> Copilot:
> - (1) Done, but we auto-open only the last-updated session, not all 4 at once.
> - (2) Done — on open, runHydrate checks the storage tier (listDomainFiles) per domain.
> - (3) Done — domains with no fresh file fall through to the live pipeline.
> - (4) Done — each delivered domain is saved to its own file (equality-skip avoids duplicates).
> - (5) Done (just changed) — we now request all domains (issues, schedule, progress, media), unavailable ones skipped server-side.
> - (6) Correction: only the active session is open at a time; we don't mount all 4. What's shared is the basket (project cache + storage files), so switching reuses warm domains — but each session hydrates when opened, not all up front. Pre-hydrating all sessions on load is a separate change.

we load a canvas after this, but within the same day
1. we load a project's canvas with 4 sessions
2. for all of them we check hydration-data domains in files sotrage
3. we find them in files storage and fetch them imemdiatelt
4. meanwhile once we get such data we hydrate all sessions concurrently, since we got a unified hydration basket for them

> Copilot:
> - (1-3) Done, but "same day" is actually a 30-min freshness window today (HYDRATION_STORAGE_TTL_MS). Once point #2 below raises it to 1 day, this holds all day.
> - (4) Same caveat as Ch I (6): basket is shared, sessions hydrate on open.

Ch II
1. we load a project's canvas with 4 sessions (4 was taken as an example)
2. for all of them we check hydration-data domains in files sotrage as well
3. some hydration-files for some domains, for instance for media are missing
4. we don't hydrate exisitng sessions until we fetch those missing domaisn from mcp
5. those domains which were missing we save into files
6. meanwhile once we get such data we hydrate all sessions concurrently, since we got a unified hydration basket for them

> Copilot:
> - (1-3) Done — storage returns fresh domains, the rest go to the pipeline.
> - (4) Differs (better): we don't block all sessions on the missing domain. Hydration is progressive per domain — each dashboard mounts as soon as its own domains are ready. A dashboard not using media won't wait for media.
> - (5) Done.
> - (6) Same basket caveat as above.

Some additional things must be considered
1. currentl every time we switch session tabs, dashboards are loaded over and over again, so we have to wait.
I imagine in this case it's fine to wait initisliation of library [for copilot - populate name of library here] in order to visualiase dashboard first time. it's also fine to initislise every time a canvas for dashboard if there's an another dashboard of another version
But if we already loaded that dashboard and just witch back to it, would be good to ensure no need to wait initialisation
However, it's not must have. Probablt there're some techincal constraints or potential eprfomance issues or anything else which will make UX worse. In this case describe those limits and I'll approve them

> Copilot: The library is Sandpack (@codesandbox/sandpack-react) — an in-browser bundler running in an iframe; that init is the wait. Today every switch re-runs openSession and remounts Sandpack from scratch, so even switch-back pays full init. Options to make switch-back instant:
> - (A) Keep mounted instances alive, hidden — instant, but memory grows per dashboard (each holds a full bundler + React runtime); heavy with many sessions.
> - (B) Cache the compiled bundle — lighter, but Sandpack has no clean rehydrate path, more custom wiring.
> - (C) Leave init as-is but make data instant (the basket work), so only bundler init remains.
> Recommendation: C now, plus a cap of 2-3 retained live instances if we add A. Unbounded A is the one I'd push back on for memory. Please approve which trade-off.

2. Currently If I'm not mistaken every 30 min, we dismiss previosuly saved hydration files and start fetching a new batch. Can we ensure to replace 30 min with 1 day, so we dismiss previous files every new day only

> Copilot: Correct — HYDRATION_STORAGE_TTL_MS = 30 min in useCanvas.ts; raising it is a one-line change. Notes: (a) a separate in-memory cache (PROJECT_DATA_TTL_MS, 5 min) only matters within one page session — the 30-min one is the storage gate you mean. (b) "Younger than 24 h" and "reset each calendar day" differ — I'd suggest a simple 24 h age unless you specifically want a midnight reset; tell me which. (c) Storage is append-only, so old files accumulate regardless; the TTL only picks which is served.

3. When we generate a new dashboard or ask question, we I assime ask to generate new domains. How does it work currently, if for instance "ask qiestion" or "dashboard" odesn't need issues domain, will we aim to get it and hydrate anyway ? 

> Copilot: Yes — both a fresh dashboard and an ask-question hydrate all available domains regardless of need. Both call stream_artifact_data with no domain filter (server.py:942 dashboard, :798 ask), so issues is fetched and saved even if unused. domainsRead only controls what the frontend mounts, not what's fetched. This actually helps the basket goal (every generation refills all files); the cost is the full fetch each time (the Option 1 trade-off you accepted).

4. When we generate a new dashboard and get newly hydrated domains from there, do we update storage files now and does it mean that we reuse them for centralised across sessions basket and transcend this updated data to all other sessions ?

> Copilot: Yes to both. During generation each domain runs persistHydrationDomain — writes a new per-domain file (append-only, newest-wins) and updates the in-memory project cache. The basket is project-scoped, not session-scoped, so every other session reading that domain later gets the freshest version automatically; there's no per-session copy to update. Equality-skip avoids duplicate files for unchanged payloads.


----
More questions
1. Explain to me schematically how basket with data received from files or mcp looks, is it a typescript class and how exactly data is kept there. Give me a very shortened example just so I could understand the logic

> Copilot: It's not a class — just a plain ref object living in useCanvas.ts:
>
>   const projectDataCacheRef = useRef({
>     profile: null,           // the lightweight data_profile event payload
>     domains: new Map()       // domain name → { payload, fetchedAt }
>   })
>
> Example after opening a session that loaded issues from storage and schedule from MCP:
>
>   projectDataCacheRef.current = {
>     profile: { issues: { total: 7534, ... }, schedule: { available: true, ... } },
>     domains: Map {
>       "issues"   → { payload: { issues: [...], by_category: {...}, _hydrated: true }, fetchedAt: 1234 },
>       "schedule" → { payload: { activities: {...}, _hydrated: true },               fetchedAt: 1235 },
>     }
>   }
>
> When runHydrate is called for any session, it reads domains.get("issues") — if present and younger than TTL, it calls onPartial immediately with that payload instead of going to storage/pipeline. This is the entire "basket" — a Map in a ref, cleared only when the project changes.
2. following up previous copilot answer
is this projectDataCacheRef.current on top level of react components above sessions tabs and will simply propagate it. Is it better to keep a dedicated class with rxjs subscription for maiantinain such data or is it fine to stay within ref object ?

> Copilot: It lives inside the useCanvas() hook, which is called once in CanvasPage — so yes, it's above the tab strip in scope. But it does NOT propagate reactively: a ref never triggers re-renders. The basket is a passive side-store that runHydrate reads imperatively; the UI updates only because runHydrate's onPartial callbacks call setState with the payload. So the flow is: ref (storage) → setState (reactivity), two separate things.
>
> Is a class + RxJS better? Not for the current shape. Only one consumer (useCanvas) reads the basket, and it reads on demand, not via subscription — RxJS would add machinery with no subscriber to justify it. A ref is the right tool when you want mutable shared data that explicitly does not cause renders.
>
> When to switch: if multiple independent components ever need to react to basket changes on their own (e.g. a separate "data freshness" widget, or pre-warming sessions that aren't the active one and updating their tabs live), then a class exposing an observable (RxJS BehaviorSubject, or a small store like Zustand) becomes worth it — components subscribe instead of threading callbacks through useCanvas. Until that need is real, stay with the ref.

3. ok, currently we just pull data from basket, cos there's no sense to propagate

> Copilot: Correct — pull-on-open is the right model while only the active session renders; propagation would only matter if we render multiple sessions at once or background-refresh the visible one.


----
Next steps

Decided (ready to implement):
1. Raise the storage freshness gate from 30 min to 24 h (single constant HYDRATION_STORAGE_TTL_MS in useCanvas.ts) using a simple 24 h age check.
2. Keep the basket as a ref with the pull-on-open model — no refactor to a class/RxJS store until a second independent subscriber actually exists.
3. Verify the just-shipped "hydrate all domains on open" change end-to-end by switching between sessions and confirming the "served from project cache" log appears on the second open.

Needs your approval first:
4. Confirm the Sandpack switch-back trade-off — recommended option C (make data instant via the basket) plus a cap of 2-3 retained live mounted instances, rejecting unbounded option A for memory reasons.
5. Decide whether to add a one-time basket pre-warm on canvas load (fetch all domain files once before any session opens) so the first auto-opened session and every switch are instant — optional, separate from the per-session hydrate.

Out of scope (explicitly parked):
6. Payload trimming of large domains (issues ~10 MB, schedule ~12 MB) is not pursued — we keep full domains and accept the heavier fetch/parse per the Option 1 decision.


