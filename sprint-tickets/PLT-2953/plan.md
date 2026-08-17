# PLT-2953 — Asset Details: Linking mode (2026-08-17 kickoff)

**Branch `PLT-2953`** = same base as PLT-3001. Pushed. INDEPENDENT of 3001/3003.

Ticket: after entering linking mode (PLT-2952, shipped), the user manually selects
ELEMENTS IN THE VIEWER to link/unlink to an asset. "Link asset ↔ elements" stages
the change LOCALLY; "Done" (left Asset List panel) pushes staged changes to cloud.
"Suggested matches" explicitly OUT (PLT-2964). Design artefact:
Asset_and_System_Setup.dc.html (uploaded 23b8a83c…; extracted text in scratchpad
run of 08-17; key strings: "Linking session — Done" footer, "UNLINK ELEMENT?"
confirm, keyboard shortcuts panel is PLT-2964 territory).

Existing on master already: `AssetListContent.element-linking*.test.tsx`, asset
detail shows "Linked element … Unlink", `assetElementLinkService`, viewer assets
panel is the asset-detail surface. PLT-2952 gave the enter-linking-mode flow.
TO STUDY (not yet read): `useElementLinking` hook / linking session state; how the
viewer exposes element click selection (viewer-provider? forge/xeokit wrapper?);
where 'Done' lives in the assets panel.

Plan sketch:
1. Session store: staged links/unlinks (Map assetId→elementGid ops) in viewer
   provider context; survives panel navigation; "Linking in progress" resume
   notice per artefact.
2. Element pick: subscribe to viewer selection events while linking mode active;
   selected element + selected asset → enable "Link asset ↔ elements" CTA.
3. Unlink: from asset detail's linked-element row (confirm dialog per artefact).
4. Done: batch-push staged ops via assetElementLinkService; optimistic list badges
   (Linked/Unlinked tabs counts).
5. Tests: session staging logic pure-unit; panel wiring with mocked viewer events.
Confidence 5–6 until the viewer selection API is read; raise after study.
