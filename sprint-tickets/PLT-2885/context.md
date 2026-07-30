# PLT-2885 — Remove "Reports" from user options

**Type:** Task · **Status at pickup:** Ready For Development · **Domain:** Header / AccountMenu

## Ask
Remove the "Reports" item from the avatar (user-icon) dropdown, top-right header.
Rationale: V2 + new dashboard is now default; old `/progress-dashboard` "Reports" link retired.

## Exact change
File: `src/main/webapp/app/shared/layout/menus/AccountMenu/AccountMenu.tsx`
- Delete the `<DropdownItem>` block at **lines 69–78** (links to `/progress-dashboard`,
  label i18n `hc.global.menu.reports`, icon `BarChart`).
- Remove now-unused `BarChart` import (line 12 / import block 5–14).
- Items are inline JSX (no config array) → clean deletion.

## Do NOT touch
- `AdminMenu.tsx:106-107` "Reports" (admin sidebar, `/admin/reports`) — different feature.
- i18n keys `hc.global.menu.reports` (en:2548, tr:2103) — harmless to leave; used only here.
  Optional cleanup, not required.

## Confidence: 10/10 — trivial, low-risk, well-scoped.

## Status: PR #2035 ready for review · Jira In Code Review · Sonar passed

## FINAL: PR #2035 MERGED ✅
