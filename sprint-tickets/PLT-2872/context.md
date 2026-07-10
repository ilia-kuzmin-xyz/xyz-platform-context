# PLT-2872 — Increase Issue description character limit to 1000

**Type:** Task · **Status at pickup:** Open · **Domain:** WebViewer / Issues

## Ask
Issue description field currently capped at **500** chars; field needs **1000**.
Create + edit both must allow up to 1000. Also verify the API call accepts 1000.

## Architecture
Create (`issue-add.tsx:335`) and edit (`issue-edit.tsx:231`) both render the SAME
`IssuesForm` + `useIssueForm` hook → one code path covers both. No yup/zod; validation is a
plain react-hook-form rules object.

## Exact changes (value 500 is duplicated in 2 spots)
1. `.../issue-properties/blocks/hooks/use-issue-form.ts:360`
   `const MAX_DESCRIPTION_LENGTH = 500` → `1000`
   (feeds `validationRules.description.maxLength`, lines 384–388 — the submit validator)
2. `.../issue-properties/blocks/issue-form.tsx:549`
   `inputProps={{ maxLength: 500 }}` → `1000` (native textarea hard cap on `name='description'`)
   → BEST: import & reference `MAX_DESCRIPTION_LENGTH` to kill the duplication.

Do NOT touch `MAX_CLOSURE_REASON_LENGTH = 500` (use-issue-form.ts:361) — that's the separate
Closure Reason field.

## Risk / needs-human
- Frontend change is trivial + safe. The one unknown is whether the **backend/API** rejects
  >500 chars. Cannot test live API here → call it out in PR test steps.

## Confidence: 9/10 (frontend); BE acceptance of 1000 chars needs manual verify.
