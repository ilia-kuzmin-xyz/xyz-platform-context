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
