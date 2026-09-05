# PLT-3038 — Show GMT offset in the timezone selector

**Status:** Dev In Progress · **PR:** [#2202](https://github.com/XYZReality/hc-frontend/pull/2202) (draft, base `master`)
**CI:** build GREEN on `c8f0607` (2026-09-05 08:08) — verified per check run, not from a badge.

## 2026-09-05 — implemented

### The surface (was not obvious)

There is exactly **one editable timezone selector in the app**: project creation, step 1 —
`components/ProjectCreateModal/Step1Content.tsx:141-148`, a `FormSelect`. Two other places show a
timezone and both are **read-only**:

- `ProjectSettings/GeneralTab/GeneralTabEdit.tsx:396-405` — `StaticTextField`, "Cannot be changed
  after project creation", but it resolves its label through the **same hook**, so it inherits any
  label change. That is the one non-obvious blast-radius fact on this ticket.
- `GeneralTabDetail.tsx:77` — prints `project.timezone` raw, no lookup, unaffected.

### Where the options come from

**Not** `Intl.supportedValuesOf`, not a library, not a constant — the **backend**:
`PortfolioPage/hooks/useTimezoneQuery.ts` → `getProjectParameter('PROJECT_TIMEZONE')` →
`GET ms/project/api/parameters/PROJECT_TIMEZONE`, mapped to `{ label: item.key, value: item.value }`
(both IANA ids), `orderBy(label)`, `staleTime` 1h. No MSW handler exists for it — tests mock the hook.

**One change point covers everything**, which is why the fix is three lines: that hook feeds the
creation dropdown, its search, its selected-value display and the Settings read-only field.

### The change

- `shared/util/date-utils.ts` — new `getGmtOffsetLabel(timeZone, at?)` and `withGmtOffset(...)`.
- `useTimezoneQuery.ts` — decorates `label` **after** the existing sort.

### Facts worth not re-deriving

- **`Intl.DateTimeFormat(..., { timeZoneName: 'shortOffset' })` is the whole implementation.** DST
  falls out for free because the offset is *read* at an instant rather than computed. Verified in
  node: Halifax `GMT-4` in Jan / `GMT-3` in Jul; Guatemala `GMT-6` both; Kolkata `GMT+5:30`;
  UTC `GMT+0`; an unknown zone throws `RangeError`.
- **No offset formatter existed anywhere in the repo** — greps for `getTimezoneOffset`, `utcOffset`,
  `GMT`, `formatOffset` found only an unrelated Gantt dummy date. This is the first one.
- **dayjs 1.11.5 is present but `dayjs/plugin/timezone` is NOT registered** (`config/dayjs.ts` loads
  only customParseFormat, duration, relativeTime, weekOfYear) and nothing in the repo imports it.
  No moment / date-fns / luxon at all. Native `Intl` avoids touching that.
- **Search came free.** `form-select.tsx` is an MUI `Autocomplete` with **no custom `filterOptions`**,
  so the default filter stringifies via `getOptionLabel` — the decorated label. Same for the closed
  input (`inputValue={value?.label}`). Neither needed a change; don't "add" search support.
- **The search box only appears above 10 options** (`form-select.tsx:45`). The timezone list clears it.
- `value` is untouched, so the create payload (`transformFormDataForAPI` → `timezone: values.timezone`)
  and the stored value are unchanged. This is display-only by construction.
- **Sort before decorating.** `orderBy(items, ['label'])` runs first; the offset is appended after, or
  the list would re-order on the offset text.
- **`ProjectCreateModal` had no tests at all** before this — the whole directory. Greenfield.

## Open

Nothing blocking. Awaiting review; PR is draft by routine convention.
