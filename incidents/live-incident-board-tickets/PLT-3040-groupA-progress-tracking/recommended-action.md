# PLT-3040 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) internal comment with the mechanism and the one discriminating check, keeping the ticket with us (Open → In Analysis)

**Why an internal comment rather than a customer ask.** The check that separates the five hypotheses
is entirely ours: count how many Package categories on CH08 are called "UG electrical" and whether the
one under Electrical has any activities mapped to it (§4 of `context.md`). No screenshot, no customer
cooperation, one lookup in the Data Mapping panel. Parking this with the customer while a two-minute
check sits undone is the mistake PLT-2815 and PLT-2858 are still making nine runs later, and this is a
Major with an explicit "ASAP" on it.

**Why not (b) With Technical Support to chase the broken image first.** The image is genuinely
unrecoverable and does need a re-send (`context.md` §7), but it is a *confirmation* artefact, not the
unblocking one: it would tell us which of two surfaces the customer is on and whether the two rows
show identical numbers. Both are worth having, neither gates the category check. So the image ask
rides along as a secondary message rather than becoming the action and the status change. This is a
deliberate departure from PLT-3033's shape, where the customer held the only decisive artefact (the
XER file) and we held nothing.

**Why not Ready For Development.** The leading hypothesis is at 6/10 and the alternative that there is
no code defect at all (H2, both packages legitimate) has not been excluded. The fix also has a design
question in it that should not be handed over as a guess: the name fallback at
`use-progress-panel-data.tsx:253-259` cannot simply be deleted, because activity-selected mode really
does key the parquet by name (`progress-queries-v2-api.ts:1011`). It needs to become pair-scoped, which
is a decision, not a one-liner.

**Why not resolve by comment.** Nothing is settled yet, and telling the customer "that is two different
packages that happen to share a name" would be premature and, if H1 holds, wrong.

### Draft internal comment (author: whoever picks this up; addressed to Darminder as assignee) — DRAFT ONLY

> Darminder, before this goes to dev it is worth one check on CH08. Could you look at the project's
> category list and tell me how many Package categories are called "UG electrical", and what the
> activity count is on each? Two categories with the same name under different disciplines is a
> supported shape, we key packages by id precisely because names repeat (PLT-2821), so the duplicate
> row on its own is not the bug. What looks like the bug is the empty one still being displayed. The
> progress panel matches each category to its parquet row by id but falls back to matching on the
> category name, and that fallback is not scoped to a discipline
> (`use-progress-panel-data.tsx:253-259`). A package with nothing mapped has no parquet row at all,
> because the query drops zero weight rows (`progress-queries-v2-api.ts:577`), so it falls through to
> the name and picks up the numbers belonging to the CSA package of the same name. If that is what is
> happening, the two rows in the customer's snip will show identical planned, actual and variance
> figures, which is the quickest way to confirm it.

### Secondary message in the same action (author: Yash, to the customer) — DRAFT ONLY

> Hi, the screenshot in the ticket did not come through on our side, it looks like the upload did not
> finish. Could you attach it again directly to the ticket rather than pasting it inline? It would help
> to know whether the two "UG electrical" rows show the same progress percentages as each other, since
> that tells us straight away whether the second one is a display fault or a genuine second package.

### Internal note (not customer-facing) — for whoever picks this up next

> Full findings in `context.md`. Short version: the twice-listing is expected (the package id resolver
> test literally uses CSA / Electrical / "UG Electrical" as its fixture,
> `dashboard-filter-service.resolver.test.ts:9-18`), so the report hinges on the empty branch being
> shown at all. Two independent, verified leaks can do that, on two different surfaces, and the
> screenshot decides which one the customer is looking at: the progress breakdown's name fallback
> (`use-progress-panel-data.tsx:253-259`) and the filter panel's discipline-agnostic
> `mappedPackages` name set (`dashboard-filter-utils.ts:57`, `:86`). Both are the unfinished half of
> PLT-2821, which keyed selection by id but left the data joins matching on names. If a fix is written,
> fix both, and scope the name fallback to activity-selected mode rather than removing it
> (`progress-queries-v2-api.ts:1011` is why it is there).

## Follow-through the human should own (not executed here)

- **Run the category check** (`Activity.listCategories` / `listMappings` on
  `699db456380af76aed84b728`, or just the Data Mapping panel). Two ids kills H5; zero mappings on the
  Electrical one points at H1 or H4; a non-zero count points at H2 and means there is no frontend
  defect here at all.
- **Before deleting anything, decide whether the category lost its mappings rather than never having
  had them** (H4). PLT-2918 on HITT AUS01 was a destructive category-mapping save that wiped mappings
  the user never touched and cascaded to descendants. If CH08's Electrical package was populated and
  got wiped, the remedy is to re-map it, and deleting it would destroy the evidence. Ask the customer
  whether that branch ever had activities in it.
- **The fast path to close the customer's complaint, with a caveat.** If the category is confirmed
  unused and always was, deleting it from CH08's category tree removes the duplicate immediately with
  no release. The caveat is that this is a write to a live customer project through the same Data
  Mapping panel that caused PLT-2918, so it should be one announced change with the category confirmed
  unused first, not a cleanup pass.
- **Answer "why now" explicitly rather than dropping it.** Nobody has said whether this is new. Either
  the fallback always behaved this way and the duplicate category is recent, or the category is old and
  something changed in the panel. The local checkout is too shallow to date the code
  (`context.md` §5), so this one has to be asked, not inferred.
- **Cohort question, once the mechanism is confirmed:** any project with two same-named packages under
  different disciplines where one is unused will show this. Worth a sweep rather than waiting for the
  next ticket, and worth checking whether CH08 is the project that motivated PLT-2821's fixture in the
  first place.
