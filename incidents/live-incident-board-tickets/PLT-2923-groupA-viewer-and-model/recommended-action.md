# Recommended action — PLT-2923

**Pick: (a) draft a clarifying comment** — addressed to Yash Patel, not the
customer. Status stays **With Customer** (it's correctly parked there for the
model file / export / Revit answers already asked); this is an *additional*,
faster, non-customer-blocking evidence request that can run in parallel.

## Why this action, not a status change

The ticket is already correctly parked: Ilia's 15:13 comment asked exactly the
right questions (source model, export origin, Revit check) and Yash duly set
Freshdesk to "Waiting on customer." Nothing about that is stalled or wrong —
so there's no case for "Blocked" or "With Technical Support," and it's not
ready to move to development (root cause unconfirmed). The one gap: **Yash
already has a live repro of his own** (session
`platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3`) that nobody has pulled
console output from yet — that's evidence sitting in our own hands, free of
the customer wait, per the playbook's "prefer a currently-affected repro over
waiting."

## Draft comment (to post in Jira, addressed to Yash Patel)

> @Yash Patel — while we wait on the customer, one more thing for your own
> failed attempt (session `platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3`):
> could you reload that model in the web viewer with DevTools console open and
> paste what shows up? Specifically I'm looking for a toast/message reading
> **"Model not loaded - no geometry found. Please check the model and try
> again."** — if that fires, it tells us the model's Forge translation
> completed but produced empty geometry (a known limitation for some IFC
> fabrication exports), which would let us move forward without waiting on the
> customer's upload. If it's a different error (or nothing at all, just a
> blank viewport), paste that instead.

## If confirmed (next step, not for this pass)

If the "no geometry found" toast is confirmed, the ticket can likely move to
**Ready For Development** without the customer's file at all — the fix
target would be `viewer-service.ts:1006-1020` and the underlying IFC→SVF2
translation on this model version, and dev has a repeatable path (own
session, no customer dependency). If it's a different error code, keep
waiting on the customer's model/Revit answer as already arranged.
