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
