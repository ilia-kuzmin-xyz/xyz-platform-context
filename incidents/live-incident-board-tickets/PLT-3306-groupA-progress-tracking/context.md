# PLT-3306 — TXE10 disciplines appearing with no linked elements on dashboard

First folder 2026-10-28. Live Incident, TXE10, reporter Yash. **Status Customer Release Check** (since 10-27 09:12 UTC, Freshdesk 8334 Waiting on customer), fixVersion **26.4.1**, released 10-27. Fetched live, 9 comments.

## Story
Customer uses "Model element count" weighting, yet disciplines and packages with no linked elements still listed (e.g. DCB-1 FE BOM Validate to PO at 100%). Ilia found the cause on 10-19 (`115887`): with a filter such as Gc applied, activities with no linked elements were counted as if they had one; unfiltered it was already right. Fix promised in 26.4.1. Gennaro verified on Staging 26.4.1 (10-22). Ilia also told Yash the schedule table will still show the activity's own 100%; it just no longer counts toward totals.

## Release check (verified)
Fix commit `82ba54eff` ("PLT-3306: don't count element-less activities under element weighting (#2348)") is on the **release branch and inside tag `v26.4.1`** (`git log v26.4.1`). Its master twin `d3f17f7a5` is not an ancestor of the tag, which is why `git tag --contains d3f17f7a5` is empty: the release was cut with cherry-picks. **Check the tag by subject or by `git log v26.4.1`, not by the master sha.**

## State
Ball with the customer (Yash relays). Nothing owed by us. Unopenable: Freshdesk screenshot (`103357190160`) and the inline images (403). Not verified: that the customer sees the fix on TXE10 prod.
