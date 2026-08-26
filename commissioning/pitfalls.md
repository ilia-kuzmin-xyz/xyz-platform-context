# Commissioning — Known Pitfalls

## 1. There is no build-time environment signal

**Symptom**: A reasonable-looking `process.env` / build-flag approach picks the wrong Supabase
project, or "works on dev" and silently points staging at the sandbox.

**Cause**: The platform builds **one container image per commit and promotes it** through dev →
preprod → staging → prod. The bundle is byte-identical everywhere. Nothing at build time knows
where it will run.

**Rule**: The active **profile** is the only per-environment signal. Read it at runtime
(`applicationProfileSlice.activeProfiles`) and classify — see `data-layer.md`. Never reach for a
build-time env var for anything environment-dependent here.

## 2. Profiles come from a static file written at container boot, not from Spring

**Symptom**: You go looking for the actuator endpoint that serves `/management/info` and find
dead or irrelevant Java.

**Cause**: Since "Serve the frontend from nginx instead of Spring Boot" (#2114, 10 Aug 2026) the
frontend is served by **nginx**. `/management/info` is a **static JSON file written by
`docker/entrypoint.sh` at boot**, from `ACTIVE_PROFILES` (falling back to
`SPRING_PROFILES_ACTIVE`) plus `INCLUDED_PROFILES`. `ActuatorConfig.java` no longer serves it.

**Rule**: `docker/entrypoint.sh` is the source of truth for what profiles can appear —
`priority_order="prod preprod staging dev local"`. Anything keying off profiles should be
tested against that list, not against a guess.

## 3. Renaming a Supabase table is a breaking API change

**Symptom**: Every commissioning surface 404s at once, in one environment only.

**Cause**: **PostgREST exposes tables as URL paths.** `tag` is literally `GET /rest/v1/tag`. A
migration that renames a table changes the client's URLs; the old path stops existing the moment
the migration is applied.

**Rule**: A rename migration and the frontend PR that follows it must **merge and deploy in
lockstep**, per environment. Applying the migration first breaks the deployed frontend; merging
the frontend first breaks it against the un-migrated database. See
`planning/glossary-rename-and-systems.md`.

## 4. `stable` has the schema but none of the data

**Symptom**: Flag enabled above `dev`, feature loads, everything is empty. Looks like a broken
connection.

**Cause**: `dev` and `main` are schema-identical, but `main` holds **0 rows in every table**
(verified 12 Aug 2026). Schema parity was the goal of PLT-3035; data was never part of it.

**Rule**: Check the row census in `data-layer.md` before diagnosing an "empty feature" as a bug.
Above `dev`, data has to be seeded or created through the UI first.

## 5. The data client must resolve its connection lazily

**Symptom**: The app talks to `dev` in a production environment, even though resolution logic is
correct.

**Cause**: The environment is only known **after** the platform profile loads, which is after
module evaluation. A client constructed from plain URL/key *values* freezes to the default.

**Rule**: `SupabasePostgrestClient` accepts `T | (() => T)` and resolves per request. Pass the
getters (`getCommissioningSupabaseUrl`, `getCommissioningPublishableKey`), never the resolved
strings.

## 6. Resolve the environment *after* dispatching the profile

**Symptom**: A throw inside environment resolution leaves the whole app without its profile —
breaking SSO, recaptcha and analytics gating, far outside commissioning.

**Cause**: Calling the setter before the store dispatch puts unrelated, load-bearing state behind
commissioning code.

**Rule**: In `applicationProfileActions`, dispatch first, then
`setCommissioningEnvFromProfiles()`. The resolver also takes `unknown` and validates, rather than
trusting the shape.

## 7. The flag is a client-side cookie, not a kill switch

**Symptom**: "The flag is off, so the data is safe."

**Cause**: The flag is read from a per-browser cookie. It gates *this browser's* code paths.

**Rule**: With the flag off there really are zero Supabase requests — but the database stays
reachable and the anon key is public with permissive RLS. Flag state is not an access control.
For anything security-relevant, see the RLS section of `data-layer.md`.

## 8. The shipped checklist import template cannot be imported

**Symptom**: A user downloads the template, fills in line items, and the import is rejected with
a missing-name error.

**Cause**: `buildChecklistTemplateWorkbook()` ships with the `CHECKLIST NAME:` cell **blank**, and
`parseFacilityGridWorkbook()` rejects a blank name by design.

**Rule**: Filling that one cell makes the template import cleanly. Open decision: ship a
placeholder name, or make the error name the cell to fix. For a working sample, generate a
workbook whose row 1 is `CHECKLIST NAME: | <name> | CHECKLIST TYPE (Choose one): | <type>`,
row 2 blank, row 3 `Entry Type | Text | Answer Type | Responsibility | Line #`.

**Parse contract**: answer types map `Section|Subsection|Header|Subheader` → header,
`Yes-No-NA` → passFailNa, anything containing `custom` → inputField.

## 9. Element colour comes from DuckDB, not from the status service

**Symptom**: You add a status→colour mapping to a commissioning service and nothing repaints.

**Cause**: PLT-2743 made **DuckDB the single source of truth for element state** and removed
`getColor` from `InstallationStatusService`. Colour resolution moved to
`element-state-theming.ts` (`applyElementStateColours`), called from
`project-service.repaintElementStates`.

**Rule**: Commissioning colour work goes through the theming module's override hook
(`getOverrideColour`), not through a status service. This is shared surface on PLT-2743's
architecture — changes there affect non-commissioning viewer colouring too.

## 10. react-jhipster `<Translate>` never re-renders on a contentKey change (2026-08-20)

**Symptom**: A button that swaps between two branches of a ternary (`editing ? <Cancel> : <Edit>`)
keeps the OLD branch's label — the footer's Cancel button read "Edit" — while `translate()` for the
same key returns the right string.

**Cause**: `Translate.shouldComponentUpdate` (react-jhipster `lib/language/translate.js`) returns
true only when the locale's `lastChange` or the `interpolate` prop changes. **It ignores
`contentKey`.** When React reconciles the two ternary branches, MUI `Button` + `Translate` match by
type and position, so the component is *updated*, not remounted — and never re-translates.

**Rule**: Any `<Translate>` whose contentKey can change across a re-render in the same tree
position needs a `key` on it (or on its ancestor) so the branch remounts. The type-detail footers
key their buttons (`key='edit-cancel'` etc.) for exactly this.

**Diagnosis pattern that found it**: served i18n JSON, the runtime TranslatorContext store (via a
webpack module-cache probe) and `translate()` all said "Cancel" while the DOM said `<span>Edit</span>`
— when data, store and resolver all agree and the DOM disagrees, suspect stale reconciliation.

## 11. `defaultOpen` on WorkflowStep is initial-only — mode flips need a key

**Symptom** (2026-08-20): entering the detail's edit session, ladder steps that should open up stay
collapsed; a freshly staged task (New badge) is invisible.

**Cause**: `WorkflowStep` seeds `useState(defaultOpen)` at MOUNT. A step mounted in view mode
(collapsed) keeps its state when the same element re-renders with `defaultOpen=true`.

**Rule**: Key the step on the mode (`key={edit ? id + '-edit' : id}`) so the session flip remounts
it. Same class of bug as pitfall 10 — reconciliation keeping state you meant to reset.

**2026-08-20, second instance (user-reported)**: the Types tab footer CTA — "+ New Asset Type" /
"+ New System Type" are two `<Button><Translate/></Button>` branches of a ternary in the same tree
position, so toggling the sub-tab kept the previous half's LABEL while the testid and onClick
updated underneath (the click opened the correct page, which is why the testid-based browser check
missed it — **assert visible text, not testids, when hunting this bug**). Note the unit-test mocks
can never catch this class: tests stub `Translate` with a plain function component that re-renders
on every prop change. Fixed the same way (`key='asset-cta'` / `key='system-cta'`).

## 2026-08-21 — A system type with `workflow_id = null` silently breaks anything that hangs off its ladder

**Symptom:** saving a System prerequisite fails with *"Saving failed — nothing was lost.
Try again."* and retrying never works. The network tab shows a perfectly healthy
`GET /rest/v1/system_type?project_id=eq.<p>&id=eq.<st>&select=*` returning **200 with one row** —
which is what makes this misread as "no response" / a broken request. It is not. Read the row:
`workflow_id` is `null`.

**Cause:** `workflow_step_task` keys on the *workflow's* step rows, so a system type with no
workflow has nowhere for task config to land. `stepMapFor` returns empty maps, and
`AssetTypeSystemRequirementService.create` refuses (deliberately — a silent drop used to look
like a successful save). System types created before `createSystemTypeWorkflow` existed all carry
`workflow_id = null`: **1 of 6 on dev** at the time of writing (`Supply Air`,
`fb449dff-a4d4-4467-bbbb-844aae5f044c`, project `6a304a8ab42d0e53463ce722`, created 13 Aug).

**Diagnosing it, without a browser:** the publishable key is public, so query PostgREST directly.
```bash
K=<sb_publishable_… from supabase-config.ts>
curl -sS -H "apikey: $K" -H "Authorization: Bearer $K" \
  "https://ohmzwpcilvxpozljllle.supabase.co/rest/v1/system_type?select=id,name,workflow_id"
```
A `null` `workflow_id` on any row is the tell. Same check applies to `asset_type`.

**Fixed** by `ensureSystemTypeWorkflow` (`services/defaultWorkflowSetup`), the system-side
counterpart of `ensureDefaultWorkflow`: it mints the Blue → White workflow on demand and assigns
it, so legacy rows repair themselves the first time someone saves a prerequisite against them.
Composed in `useCreateAssetTypeSystemRequirement`, **not** in the requirement service — that
service is imported by `serviceProvider`, which the provisioning helper imports, so calling it
from the service would close an import cycle.

**Two general lessons worth keeping:**
1. *A 200 with a row is not a working feature.* The failing request was the honest one; the bad
   data was in its body. Read response bodies before blaming the request.
2. *A deliberate refusal still needs a message that matches its permanence.* The generic
   "Try again" strip made an unfixable state look transient. Permanent failures now carry their
   own copy (`review.errorSystemLadder`).

hc-frontend `PLT-3003` / PR #2147, commit `b1584834`.

## 2026-08-26 — the prod build typechecks TEST files; vitest does not

Adding a **required** field to a widely-fixtured interface (`IAssetCurrentTag.overridden`,
PLT-2968/#2186) passed every vitest suite locally and still failed CI **twice**:

1. Vitest does not typecheck — fixture literals missing the new field run fine.
2. `npm run webapp:build:prod:ci` (webpack fork-ts-checker) DOES typecheck `*.test.tsx?`, and
   failed on 5 test files across `assets-panel/`, `model-colouring/` — files the PR never touched.
3. The first fix round grepped `tsc --noEmit` output for the error CODE (`TS2741`) and missed the
   remaining three, which surfaced as **TS2322** (fixture helpers spreading
   `Partial<IAssetCurrentTag>` produce "optional but required" instead of "missing").

**Rules:** when changing a shared interface, run the FULL `tsc --noEmit` and grep for the *field
name*, never an error code; expect fixture fallout in files you didn't touch; or make the new
field optional if the domain allows (here it deliberately wasn't — an absent `overridden` should
not read as "not overridden" silently).

hc-frontend PLT-2968 / #2186, commits `0b0ba38` + `2f0dffb`.
