# PLT-2909 — investigation log

## 2026-07-23 — ghost model identified

Diagnostic on ATL08 for activity `CY-5200`. Model `DistributionBoardsPanels_Bld1-V1`
(`00156181-fca5-4a7c-acdf-a12ce924c252`) claims 6 elements that its geometry and cloud element
list do not have. Bld2 and the federated model are real and selection works, so the defect is a
**wrong model list**, not broken selection. All 6 elements trace to one PC-EXCEL source file,
`dd20b121`. Question posted to Ali Seyedof.

## 2026-07-28 — cross-write proven from the client, scope is project-wide

Full detail in `context.md` §"CROSS-WRITE PROVEN". Summary: one element
(`358ee0bc-147c-463f-afab-c0fc246c9cb5-0076e41f`) is claimed by **10 models, nine of them
non-federated siblings** of mutually exclusive systems (Lighting, Security, Brackets, Conduits,
Containments, DataDevices) spanning **both buildings**, all carrying the **identical**
`sourceFileElementId`. Expected claimant count is 2 (own model + federation).

Distribution across all 686,088 elements: 180,142 at 1 claimant, 139,106 at 2 (normal),
**366,840 at 3 or more (53%)**, 96,184 at 5+, 27,671 at 10+, tail to 19. The ghost model from the
ticket claims 686 elements of which **650 (95%) are also claimed by others**.

## 2026-07-28 — Ali engaged; model file supplied and verified

- **Ali, 14:05:** needs the exact Revit file to convert locally and compare artefacts against the
  parquet, asked Yash to supply it.
- **Yash, 14:18:** supplied `PC-EXCEL_SWITCH_ATL8_ELEC_XYZ_DistributionBoardsPanels_Bld1-V1.rvt`
  via SharePoint (FieldApplications site), and asked Ilia to confirm it is the right model.
- **Verified** against the models API rather than assumed: `modelId`
  `00156181-fca5-4a7c-acdf-a12ce924c252` → `modelName`
  `PC-EXCEL_SWITCH_ATL8_ELEC_XYZ_DistributionBoardsPanels_Bld1-V1`, `isFederated: false`. It is
  the correct file.

### ⚠️ Error caught before it reached Ali — use the right elements

A first draft told Ali to check element `358ee0bc-…-0076e41f`. **That element is not claimed by
the Bld1 model.** It came from the ten-claimant sample, and `00156181` is not one of those ten
(they were ConduitsInternal Bld1/Bld2, Lighting_Bld2, Security_Bld2, Brackets_Bld2,
Containments_Bld2, DataDevices_Bld2, ConduitsUG_Bld2, `Conduits Internal-V1_X`, plus the
federation). Ali would have searched the file, found nothing, and drawn the wrong conclusion.

**Give him elements that model actually claims** — the `dd20b121` source-file family from the
07-23 diagnostic. Produce the list with:

```sql
WITH claims AS (
  SELECT modelElementId, COUNT(DISTINCT modelId) AS claimed_by_models
  FROM project_element_list
  GROUP BY modelElementId
)
SELECT pel.sourceFileElementId, pel.modelElementId, c.claimed_by_models
FROM project_element_list pel
JOIN claims c ON c.modelElementId = pel.modelElementId
WHERE pel.modelId = '00156181-fca5-4a7c-acdf-a12ce924c252'
  AND c.claimed_by_models > 1
ORDER BY c.claimed_by_models DESC
```

Expect ~650 rows. Attach as CSV to the ticket.

**General lesson:** when handing evidence to another team, check the sample actually belongs to
the artefact they are examining. Two different elements were in play here (CY-5200's six from
`dd20b121`, and the ten-claimant example from `358ee0bc`) and they are not interchangeable.

### The alternative hypothesis Ali's test must distinguish

The conversion test is the right experiment, but its outcome needs framing or it will be
misread:

- **Elements absent from the .rvt but present in the parquet** → mismatch in our pipeline, Ali's
  side.
- **Elements genuinely present in the .rvt** → the source files themselves share element
  identity, and the fix is upstream of the import.

The second is live, not a formality. These are `.rvt` files for models named `PC-EXCEL_`, so a
generator sits upstream. If those files were produced by Save-As from a common template, or by a
generator that does not regenerate element identity, they would legitimately share internal GUIDs
and produce exactly the signature we found **with no importer bug at all**. Without this framing
Ali could correctly report "conversion is faithful, no mismatch" and the ticket would stall.

### Supporting observations from the ATL08 model list

- Models are organised in per-building folders: Bld1 `f9e920c1-48e2-4a39-a5a7-03c148b55c9c`,
  Bld2 `60a33fe7-1f5a-4d05-9894-d6f2c4c56843`, Bld3 `25bb01cf-086c-49ae-91e8-0c4623ba8851`.
  **Bld3 variants exist too**, so the affected family is wider than the Bld1/Bld2 pair the ticket
  discusses.
- Every PC-EXCEL model was created by the same author (`ariele.busso@xyzreality.com`), all at
  version V1, inserted 2026-07-07 and 07-08 — a single batch. One outlier,
  `PC-EXCEL_SWITCH_ATL8_ELEC_Conduits Internal-V1_X` (note the malformed name), was created
  2026-04-03 by `soham.dutta@rootsbim.com`, so the defect predates that batch.
- **Each model has a distinct `accItemId` / `accUrn`**, so these are separate files in ACC rather
  than one file uploaded repeatedly. That weakens the "same upload many times" theory but does
  **not** rule out Save-As copies sharing internal element identity.

## Status and next step

Waiting on Ali's local conversion. Nothing blocks him once the CSV is attached. Note this ticket
is **not remediable by link deletion** the way PLT-2882 and PLT-2931 were: the links are correct
and the elements exist, it is the generated metadata that is wrong, so any fix is backend side.

The FE mitigation (stop listing models whose geometry cannot back the elements) is tracked under
PLT-2882 and would resolve the customer's reported symptom independently of the backend outcome.
