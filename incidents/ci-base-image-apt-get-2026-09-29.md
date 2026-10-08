# CI outage 2026-09-29 — `xyz-base-node:latest` lost `apt-get`, every hc-frontend build red

**Status:** stopgap raised as hc-frontend **#2249** (draft). Root cause is upstream and unfixed.
**Scope:** every branch and master in `hc-frontend`. Not one PR, not one branch.

---

## What happened

The `builder` stage of `hc-frontend/Dockerfile` installs the node-gyp toolchain with `apt-get`:

```
#17 [builder 3/11] RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ git ca-certificates ...
#17 0.116 /bin/sh: line 0: apt-get: not found
#17 ERROR: ... exit code: 127
```

`BASE_REGISTRY/xyz-base-node` is pinned to a **mutable `:latest`** tag, rebuilt weekly by the
"Build Base Docker Images" workflow in **hc-infrastructure/docker**. That rebuild landed this
morning and the new image has no `apt-get`.

## How it was established as not-our-code (worth copying — this is the pattern)

Four independent checks, none of which required guessing:

1. **Two unrelated PRs, identical failure.** #2236 (09:18 BST) and #2217 (09:33 BST) — different
   branches, different diffs, same step, same message.
2. **Same base digest on both:** `sha256:2b64df14fb6bd13344881db544e2807a933b5b66c752a5b1846c8f1c2b713744`.
3. **The JS half passed on both.** Tests, lint and the SonarCloud gate were all green; only the
   docker build died. Sonar completing at all proves the test step ran.
4. **A green build on the identical Dockerfile at ~08:25 BST**, before the image changed. Nothing
   in the repo moved in between.

The failing step is `builder 3/11` — it runs **before any source is copied in**, so no application
diff can reach it. That alone rules out every feature branch as a cause.

## Timeline (BST, 2026-09-29)

| time | event |
|---|---|
| ~08:25 | #2236 build green on `be325b9` — same Dockerfile, `apt-get` works |
| ~09:10 | #2241 docker build still succeeds |
| 09:18 | #2236 on `dc6c2ce` — first observed failure |
| 09:33 | #2217 on `141ba71` — same failure, confirms repo-wide |

So the image was replaced between roughly **09:10 and 09:18**.

## The stopgap (#2249)

Chooses the package manager present rather than assuming one:

```dockerfile
RUN if command -v apk >/dev/null 2>&1; then \
        apk add --no-cache python3 make g++ git ca-certificates; \
    elif command -v apt-get >/dev/null 2>&1; then \
        apt-get update && apt-get install -y --no-install-recommends \
          python3 make g++ git ca-certificates && apt-get clean && rm -rf /var/lib/apt/lists/*; \
    else echo "...neither apk nor apt-get..." >&2; exit 1; fi
```

**Why adaptive rather than just swapping to `apk`:** the tag is mutable and has now demonstrably
flipped once. Hard-coding the other distro's manager is the same bet that just lost, in the other
direction — and nobody has said yet whether the distro change is intentional or an upstream
accident about to be reverted. The adaptive form is correct under both answers. Supporting
evidence that the base is now Alpine: the runtime stage's `apk --no-cache upgrade libssl3 ...`
succeeds in the very same build, and the nginx base scans as `alpine 3.24.2`.

**It is unverified at the time of writing.** The image lives in a private ACR that an agent
session cannot pull, so #2249's own CI run is the first real test. Do not assume it is correct
until that build is green.

## What still needs a human

- **hc-infrastructure/docker is out of the agent's repo scope**, so the root cause cannot be fixed
  from here. Someone with access has to decide whether the rebuild dropped the toolchain by
  accident or moved distro on purpose, and fix or communicate accordingly.
- **Pin the base images by digest.** The whole outage is one mutable tag away from never having
  happened. Raised as a suggestion on #2249; wants its own ticket.
- Once #2249 lands, the failed builds on #2236 and #2217 need re-running to confirm they clear.

## Lesson for the next run

A red `build` check on this repo is **not** automatically a test failure. Read *which step* failed
before touching any code: the job bundles lint, vitest, SonarCloud, the docker build and a Trivy
scan, and only the middle two have anything to do with a feature diff. Twice today the useful
signal was "Sonar passed, so the tests ran" — a cheap way to separate the JS half from the image
half without reading the whole log.

---

## RESOLVED (same run) — it was a **Wolfi** migration, and `build-base` fixes it

The first stopgap got the *manager* right and the *package names* wrong, and that failure is what
actually identified the cause:

```
#12 0.124 fetch https://packages.wolfi.dev/os/x86_64/APKINDEX.tar.gz
#12 1.228 ERROR: unable to select packages:
#12 1.228   g++ (no such package):
#12 1.228     required by: world[g++]
```

**`packages.wolfi.dev`.** `xyz-base-node` has not merely lost `apt-get` — it has moved from Debian
to **Wolfi** (Chainguard's distro, the usual choice when chasing zero-CVE base images, which fits a
repo that gates on Trivy). So this reads as a **deliberate upstream migration** that the app repos
were never told about, not a broken rebuild. That changes who owns it.

### The fix that is green

```dockerfile
RUN if command -v apk >/dev/null 2>&1; then \
        apk add --no-cache build-base python3 git \
        && { apk add --no-cache ca-certificates-bundle || apk add --no-cache ca-certificates; }; \
    elif command -v apt-get >/dev/null 2>&1; then \
        apt-get update && apt-get install -y --no-install-recommends \
          python3 make g++ git ca-certificates \
        && apt-get clean && rm -rf /var/lib/apt/lists/*; \
    else echo "...neither apk nor apt-get..." >&2; exit 1; fi
```

Two naming facts worth keeping, because they are the whole fix:

- **There is no `g++` package on Wolfi or Alpine.** `build-base` is the meta package carrying gcc,
  g++ and make — precisely the node-gyp toolchain.
- **The CA bundle is named differently**: `ca-certificates-bundle` on Wolfi, `ca-certificates` on
  Alpine and Debian. Hence the fallback rather than picking one.

Verified **green** on #2249, then ported onto #2236 and #2217 (both red on it). #2203, #2235 and
#2241 were deliberately left alone — still green from builds that predate the image change, so a
Dockerfile commit would only have turned them red and back again. They inherit it from master.

### Method note — let the error do the diagnosing

Three failures, each one naming the next step, no guessing required:

1. `apt-get: not found` → not Debian any more
2. `packages.wolfi.dev` + `g++ (no such package)` → Wolfi, and it has no standalone `g++`
3. `build-base` → green

Each iteration cost ~13 minutes of CI. That is the right trade when the alternative is reasoning
about a private image you cannot pull — but only because each failure was read properly rather than
retried hopefully.

### Still open for a human

- **Was the Wolfi move intentional?** If yes, #2249 is roughly the app-side update it needed and
  should be reviewed as such; if no, reverting the base upstream is the better fix and #2249 can be
  closed. hc-infrastructure is outside the agent's repo scope either way.
- **#2249 is a draft**, per the standing "keep PRs in draft" instruction — which means nobody can
  merge it, while every fresh build in the repo stays red until someone does. Flagged plainly on
  the PR and in the run's notification rather than overridden unilaterally.
- **Pin the base images by digest.** A distro migration reached every branch and master with no PR,
  no notice and no way to control the timing. That is the real defect; the Dockerfile change is
  only the symptom being managed.

### Verified: both ported PRs green

`4fe3472` (#2236) and `9aa125b` (#2217) both **completed success** after the port. So the fix
holds on three independent branches, not just on its own.

### One deliberate deviation from the checkpoint routine, recorded so the next run does not "correct" it

Master moved again late in the run (`b235e2f`, PLT-2990 #2248), leaving all six branches **1 commit
behind**. The routine says merge master in. **This run deliberately did not**, and the reason is
specific to the outage rather than to any branch:

- #2236 and #2217 carry the Wolfi fix, but both had builds **in flight** at that moment. Pushing
  again cancels a run (`cancel-in-progress`) — it would have destroyed the very verification that
  the port worked.
- #2203, #2235 and #2241 do **not** carry the fix and are still green from builds that predate the
  image change. Merging master into them would knowingly turn three green PRs red for a one-commit
  drift, during an outage whose fix is already written.

Once #2249 lands on master, a single master merge per branch resolves both the drift and the
outage together. That is one push per PR instead of two, with no red in between. Deferring was the
cheaper correct move, not an oversight.

---

## 2026-10-08 — closed out. The fix reached master via a ported PR, not via #2249

Recording the ending, because everything above reads as "unresolved, pending a merge" and that is
no longer true.

**#2249 was closed WITHOUT being merged** (8 Oct 09:19). That is the correct outcome, not a
dropped ball: the fix had already reached `master` through **#2217**, squash-merged as `3dc9f031`
on **29 Sep 15:41** — the earliest of the five sprint PRs to land, and one of the two the hunk was
ported into. So the port did more than keep its own PR green; it is what actually delivered the
fix. `master`'s Dockerfile today carries the `command -v apk` branch with
`build-base python3 git` and the `ca-certificates-bundle → ca-certificates` fallback, apt-get
branch intact.

Confirmed against the live registry image before it landed, not just in principle: a parallel
session hit the same breakage on #2203, ported the same hunk, and reported it green on `34c2228`
(comment on #2249, 29 Sep 16:17).

**Lesson that generalises:** the "port the fix rather than wait for your own fix PR to merge" rule
earned its keep here. Waiting on #2249 would have left the repo red for days and the PR would have
been closed as stale anyway. The port was the delivery mechanism; the hotfix PR was only the place
the fix was proven.

**Still unanswered, and now unlikely to be:** whether the Wolfi migration was intentional
upstream, and whether the base images get pinned by digest. Nobody replied to either question on
#2249 before it was closed. The Dockerfile change absorbs the next distro flip either way, so the
pressure is off — but the mutable `:latest` is still there, and so is the next outage.
